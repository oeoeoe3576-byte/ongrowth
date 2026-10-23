// 쇼츠 후처리: 영상 위에 제목 자막(2줄, 2줄째 노랑 강조)과 하단 말 자막을 얹는다 (크레딧 없음).
//   npm run shorts-compose -- <spec.json>
// spec 예:
//   { "video": "data/avatar/ep1-full.mp4", "out": "data/reels/ep1/video.mp4",
//     "headline": { "line1": "글 잘 쓰면", "line2": "손해라고요?" },
//     "captionsAuto": ["문장1", "문장2"],                       // 글자 수 비율로 시간을 나눔 (근사치)
//     "captions": [{ "from": 0, "to": 3.2, "text": "문장" }], // 시간을 직접 지정 (captionsAuto보다 우선)
//     "theme": "light",                                      // light: 밝은 배경용 (남색 글자 + 남색 강조 상자). 기본은 dark(흰 글자 + 노랑)
//     "scenes": [{ "image": "a.png", "seconds": 1.5 }], "audio": "voice.mp3",
//     "sceneScale": 0.82, "sceneBg": "#FDECCE", "zoom": false } // 영상 대신 장면 그림들을 이어 붙여 기본 영상을 만든다 (video 대신 사용)
// 제목·자막은 Pretendard로 PNG를 만들어 ffmpeg overlay로 얹는다 (ffmpeg-static에는 drawtext가 없음).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { launchBrowser } from "../design/renderPng.js";

const require = createRequire(import.meta.url);

export interface Caption { from: number; to: number; text: string }
export interface Scene { image: string; seconds: number }
export interface Spec {
  video?: string;
  scenes?: Scene[];
  audio?: string;
  /** 장면 그림을 화면 대비 이 비율로 줄여 아래쪽에 붙이고 남는 곳을 sceneBg로 채운다 (기본 1 = 꽉 채움) */
  sceneScale?: number;
  sceneBg?: string;
  /** 장면마다 천천히 확대/축소 (기본 꺼짐) */
  zoom?: boolean;
  theme?: "dark" | "light";
  out: string;
  headline?: { line1: string; line2: string; from?: number; to?: number };
  captions?: Caption[];
  captionsAuto?: string[];
}

/** 온그로스 로고 남색 (data/brands/ongrowth-logo-sheet.png에서 추출) */
export const NAVY = "#0B2443";

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

function css(width: number, theme: "dark" | "light"): string {
  const font = fs.readFileSync(require.resolve("pretendard/dist/web/variable/woff2/PretendardVariable.woff2")).toString("base64");
  const u = width / 896; // 896px 폭 기준으로 글자 크기를 맞춘다
  return `@font-face{font-family:P;font-weight:45 920;src:url(data:font/woff2;base64,${font}) format('woff2');}
html,body{margin:0;background:transparent}
.head{position:absolute;left:0;right:0;top:${Math.round(130 * u)}px;text-align:center;font-family:P;font-weight:900;line-height:1.25;
 text-shadow:0 4px 18px rgba(0,0,0,.65),0 0 3px rgba(0,0,0,.9);-webkit-text-stroke:${2 * u}px rgba(0,0,0,.55);paint-order:stroke fill}
.l1{font-size:${Math.round(78 * u)}px;color:#fff}.l2{font-size:${Math.round(86 * u)}px;color:#FFE600}
.cap{position:absolute;left:0;right:0;bottom:${Math.round(210 * u)}px;text-align:center;font-family:P}
.cap span{display:inline-block;max-width:${Math.round(780 * u)}px;background:rgba(0,0,0,.72);color:#fff;font-weight:700;font-size:${Math.round(46 * u)}px;line-height:1.4;padding:${Math.round(10 * u)}px ${Math.round(24 * u)}px;border-radius:${Math.round(10 * u)}px}
${theme === "light" ? `.head{text-shadow:none;-webkit-text-stroke:0}.l1{color:${NAVY}}.l2{display:inline-block;margin-top:${Math.round(10 * u)}px;color:#fff;background:${NAVY};padding:${Math.round(6 * u)}px ${Math.round(28 * u)}px;border-radius:${Math.round(18 * u)}px}.cap span{background:${NAVY}}` : ""}`;
}

/** 장면 그림들을 1080x1920 세로 영상으로 잇는다 (장면마다 천천히 확대/축소, 목소리가 있으면 입힌다) */
export function buildScenes(spec: Spec, outFile: string): void {
  const scenes = spec.scenes ?? [];
  if (!scenes.length) throw new Error("scenes가 비어 있음");
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  for (const sc of scenes) args.push("-loop", "1", "-framerate", "25", "-t", String(sc.seconds), "-i", sc.image);
  if (spec.audio) args.push("-i", spec.audio);
  const total = scenes.reduce((n, sc) => n + sc.seconds, 0);
  let chain = "";
  const k = spec.sceneScale ?? 1;
  const w = Math.round((1080 * k) / 2) * 2, h = Math.round((1920 * k) / 2) * 2;
  const bg = (spec.sceneBg ?? "#FDECCE").replace("#", "0x");
  scenes.forEach((sc, i) => {
    const z = i % 2 === 0 ? "1+0.0009*on" : "1.1-0.0009*on";
    const motion = spec.zoom ? `scale=2160:3840,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=25,` : "";
    // 그림을 줄여서 아래쪽 가운데에 붙인다 (그림 아래가 잘린 구도라 아래에 붙여야 어색하지 않다)
    const fit = k < 1 ? `scale=${w}:${h},pad=1080:1920:(1080-${w})/2:(1920-${h}):color=${bg},` : "";
    chain += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${fit}${motion}fps=25,setsar=1[s${i}];`;
  });
  chain += scenes.map((_, i) => `[s${i}]`).join("") + `concat=n=${scenes.length}:v=1:a=0,format=yuv420p[v]`;
  args.push("-filter_complex", chain, "-map", "[v]");
  if (spec.audio) args.push("-map", `${scenes.length}:a`, "-c:a", "aac", "-b:a", "128k");
  args.push("-t", String(total), "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", outFile);
  execFileSync(ffmpegPath(), args, { stdio: ["ignore", "inherit", "inherit"] });
}

export async function compose(spec: Spec): Promise<{ out: string; captions: number; seconds: number }> {
  let source = spec.video;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "compose-base-"));
  if (!source) {
    source = path.join(work, "base.mp4");
    buildScenes(spec, source);
  }
  const info = probe(source);
  const caps = spec.captions ?? (spec.captionsAuto ? autoCaptions(spec.captionsAuto, info.seconds) : []);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "compose-"));
  const layers: Array<{ png: string; from: number; to: number }> = [];
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: info.width, height: info.height } });
    const shot = async (body: string, name: string) => {
      await page.setContent(`<html><head><style>${css(info.width, spec.theme ?? "dark")}</style></head><body>${body}</body></html>`);
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
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", source];
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
  fs.rmSync(work, { recursive: true, force: true });
  return { out: spec.out, captions: caps.length, seconds: info.seconds };
}

if (process.argv[1]?.endsWith("compose.ts") && process.argv[2]) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as Spec;
  compose(spec)
    .then((r) => console.log(`✓ ${r.out} (${r.seconds.toFixed(1)}초 · 말 자막 ${r.captions}개)`))
    .catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
