// 쇼츠 후처리: 영상 위에 제목 자막(2줄, 2줄째 노랑 강조)과 하단 말 자막을 얹는다 (크레딧 없음).
//   npm run shorts-compose -- <spec.json>
// spec 예:
//   { "video": "data/avatar/ep1-full.mp4", "out": "data/reels/ep1/video.mp4",
//     "headline": { "line1": "글 잘 쓰면", "line2": "손해라고요?" },
//     "captionsAuto": ["문장1", "문장2"],                       // 글자 수 비율로 시간을 나눔 (근사치)
//     "captions": [{ "from": 0, "to": 3.2, "text": "문장" }] } // 시간을 직접 지정 (captionsAuto보다 우선)
// 제목·자막은 Pretendard로 PNG를 만들어 ffmpeg overlay로 얹는다 (ffmpeg-static에는 drawtext가 없음).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { launchBrowser } from "../design/renderPng.js";

const require = createRequire(import.meta.url);

export interface Caption { from: number; to: number; text: string }
export interface Spec {
  video: string;
  out: string;
  headline?: { line1: string; line2: string; from?: number; to?: number };
  captions?: Caption[];
  captionsAuto?: string[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || (require("ffmpeg-static") as string);
}

/** `ffmpeg -i` 출력에서 크기와 길이를 읽는다 (ffprobe가 없음) */
export function probe(video: string): { width: number; height: number; seconds: number } {
  const r = spawnSync(ffmpegPath(), ["-hide_banner", "-i", video], { encoding: "utf8" });
  const err = r.stderr;
  const size = /Stream #0:\d.*Video:.* (\d{2,5})x(\d{2,5})/.exec(err);
  const dur = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(err);
  if (!size || !dur) throw new Error(`영상 정보를 읽지 못함: ${video}`);
  return { width: Number(size[1]), height: Number(size[2]), seconds: Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) };
}

/** 글자 수 비율로 시간을 나눈다 (말 속도가 일정하다고 가정한 근사치) */
export function autoCaptions(lines: string[], seconds: number, lead = 0.3, tail = 0.4): Caption[] {
  const total = lines.reduce((n, l) => n + l.replace(/\s/g, "").length, 0);
  const span = Math.max(seconds - lead - tail, 1);
  let t = lead;
  return lines.map((text) => {
    const d = (text.replace(/\s/g, "").length / total) * span;
    const c = { from: Number(t.toFixed(2)), to: Number((t + d).toFixed(2)), text };
    t += d;
    return c;
  });
}

function css(width: number): string {
  const font = fs.readFileSync(require.resolve("pretendard/dist/web/variable/woff2/PretendardVariable.woff2")).toString("base64");
  const u = width / 896; // 896px 폭 기준으로 글자 크기를 맞춘다
  return `@font-face{font-family:P;font-weight:45 920;src:url(data:font/woff2;base64,${font}) format('woff2');}
html,body{margin:0;background:transparent}
.head{position:absolute;left:0;right:0;top:${Math.round(130 * u)}px;text-align:center;font-family:P;font-weight:900;line-height:1.25;
 text-shadow:0 4px 18px rgba(0,0,0,.65),0 0 3px rgba(0,0,0,.9);-webkit-text-stroke:${2 * u}px rgba(0,0,0,.55);paint-order:stroke fill}
.l1{font-size:${Math.round(78 * u)}px;color:#fff}.l2{font-size:${Math.round(86 * u)}px;color:#FFE600}
.cap{position:absolute;left:0;right:0;bottom:${Math.round(210 * u)}px;text-align:center;font-family:P}
.cap span{display:inline-block;max-width:${Math.round(780 * u)}px;background:rgba(0,0,0,.72);color:#fff;font-weight:700;font-size:${Math.round(46 * u)}px;line-height:1.4;padding:${Math.round(10 * u)}px ${Math.round(24 * u)}px;border-radius:${Math.round(10 * u)}px}`;
}

export async function compose(spec: Spec): Promise<{ out: string; captions: number; seconds: number }> {
  const info = probe(spec.video);
  const caps = spec.captions ?? (spec.captionsAuto ? autoCaptions(spec.captionsAuto, info.seconds) : []);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "compose-"));
  const layers: Array<{ png: string; from: number; to: number }> = [];
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: info.width, height: info.height } });
    const shot = async (body: string, name: string) => {
      await page.setContent(`<html><head><style>${css(info.width)}</style></head><body>${body}</body></html>`);
      const f = path.join(tmp, name);
      await page.screenshot({ path: f, omitBackground: true });
      return f;
    };
    if (spec.headline) {
      const h = spec.headline;
      layers.push({ png: await shot(`<div class="head"><div class="l1">${esc(h.line1)}</div><div class="l2">${esc(h.line2)}</div></div>`, "head.png"), from: h.from ?? 0, to: h.to ?? info.seconds });
    }
    for (const [i, c] of caps.entries()) layers.push({ png: await shot(`<div class="cap"><span>${esc(c.text)}</span></div>`, `cap${i}.png`), from: c.from, to: c.to });
  } finally {
    await browser.close();
  }
  fs.mkdirSync(path.dirname(path.resolve(spec.out)), { recursive: true });
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", spec.video];
  for (const l of layers) args.push("-i", l.png);
  if (layers.length) {
    let chain = "";
    let prev = "0:v";
    layers.forEach((l, i) => {
      const next = i === layers.length - 1 ? "vout" : `v${i}`;
      chain += `[${prev}][${i + 1}:v]overlay=0:0:enable='between(t,${l.from},${l.to})'[${next}];`;
      prev = next;
    });
    args.push("-filter_complex", chain.slice(0, -1), "-map", "[vout]", "-map", "0:a?");
  }
  args.push("-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", spec.out);
  execFileSync(ffmpegPath(), args, { stdio: ["ignore", "inherit", "inherit"] });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { out: spec.out, captions: caps.length, seconds: info.seconds };
}

if (process.argv[1]?.endsWith("compose.ts") && process.argv[2]) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as Spec;
  compose(spec)
    .then((r) => console.log(`✓ ${r.out} (${r.seconds.toFixed(1)}초 · 말 자막 ${r.captions}개)`))
    .catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
