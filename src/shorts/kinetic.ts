// 모션 타이포 영상: 인물 없이 큰 글자가 말에 맞춰 나타나는 쇼츠 (크레딧 없음, Chromium으로 프레임을 그려 ffmpeg로 잇는다).
//   npm run shorts-kinetic -- <spec.json>
// spec 예:
//   { "audio": "data/avatar/ep2/voice.mp3", "out": "data/avatar/ep2-kinetic.mp4", "seconds": 4.9,
//     "beats": [ { "at": 0.16, "until": 0.9, "lines": [ { "text": "글 쓰는데", "size": 140 } ] },
//                { "at": 0.9, "until": 1.76, "lines": [ { "text": "생활비가" }, { "text": "아껴지고", "mark": true } ] } ] }
// 줄 옵션: size(px, 기본 120) · color(기본 흰색) · mark(노랑 형광펜이 그어짐) · pill(남색 글자를 노랑 상자에)
// 글자는 안전 영역(화면 28~62%) 가운데에 놓고, 장면이 바뀌면 이전 글자는 빠진다. 배경 빛이 천천히 움직인다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../design/renderPng.js";

const require = createRequire(import.meta.url);

export interface KLine { text: string; size?: number; color?: string; mark?: boolean; pill?: boolean }
export interface KBeat { at: number; until: number; lines: KLine[] }
/** tag: 위쪽(안전 영역 안)에 계속 떠 있는 작은 꼬리표. progress: 글자 아래 진행 막대 */
export interface KSpec { audio?: string; out: string; seconds: number; fps?: number; beats: KBeat[]; bg?: string; tag?: string; progress?: boolean }

const NAVY = "#0B2443";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// 브라우저 안에서 시각 t의 모습을 정한다 (애니메이션 라이브러리 없이 계산식으로)
const BROWSER_SCRIPT = `
const clamp = (x) => Math.max(0, Math.min(1, x));
const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
window.setT = (t) => {
  document.querySelectorAll('.beat').forEach((b) => {
    const at = +b.dataset.at, until = +b.dataset.until;
    const visible = t >= at && t < until + 0.16;
    b.style.display = visible ? 'flex' : 'none';
    if (!visible) return;
    const out = clamp((t - until) / 0.16);
    b.querySelectorAll('.line').forEach((l, i) => {
      const p = clamp((t - at - i * 0.13) / 0.34);
      const s = 0.72 + 0.28 * easeOutBack(p);
      const dy = (1 - easeOut(p)) * 70;
      l.style.opacity = String(easeOut(p) * (1 - out));
      l.style.transform = 'translateY(' + (dy - out * 24) + 'px) scale(' + s + ')';
      const mk = l.querySelector('.mk');
      if (mk) mk.style.backgroundSize = (easeOut(clamp((t - at - i * 0.13 - 0.18) / 0.3)) * 100) + '% 100%';
    });
  });
  const g = document.getElementById('glow');
  g.style.transform = 'translate(' + Math.sin(t * 0.9) * 90 + 'px,' + Math.cos(t * 0.7) * 70 + 'px)';
  const bar = document.getElementById('bar');
  if (bar) bar.style.width = (clamp(t / window.TOTAL) * 100) + '%';
};`;

function html(spec: KSpec): string {
  const font = fs.readFileSync(require.resolve("pretendard/dist/web/variable/woff2/PretendardVariable.woff2")).toString("base64");
  const beats = spec.beats
    .map((b) => `<div class="beat" data-at="${b.at}" data-until="${b.until}">${b.lines
      .map((l) => {
        const size = l.size ?? 120;
        const cls = l.pill ? "pill" : l.mark ? "mk" : "";
        const color = l.pill ? NAVY : l.color ?? "#fff";
        return `<div class="line" style="font-size:${size}px;color:${color}"><span class="${cls}">${esc(l.text)}</span></div>`;
      })
      .join("")}</div>`)
    .join("");
  return `<html><head><style>
@font-face{font-family:P;font-weight:45 920;src:url(data:font/woff2;base64,${font}) format('woff2');}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:${spec.bg ?? NAVY};font-family:P}
#glow{position:absolute;left:140px;top:560px;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,#2D63B5 0%,rgba(31,76,143,.55) 38%,rgba(11,36,67,0) 70%);opacity:.75}
.beat{position:absolute;left:0;right:0;top:${0.28 * 1920}px;height:${0.34 * 1920}px;flex-direction:column;align-items:center;justify-content:center;gap:18px;display:none}
.line{font-weight:900;line-height:1.15;text-align:center;letter-spacing:-0.02em;text-shadow:0 6px 24px rgba(0,0,0,.35)}
.mk{background-image:linear-gradient(transparent 58%,#FFE600 58%,#FFE600 92%,transparent 92%);background-repeat:no-repeat;background-size:0% 100%;padding:0 10px}
#tag{position:absolute;top:${0.15 * 1920}px;left:0;right:0;text-align:center;font-size:44px;font-weight:700;color:#BFD3F2;letter-spacing:0.04em}
#track{position:absolute;top:${0.665 * 1920}px;left:310px;width:460px;height:10px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden}
#bar{height:100%;width:0;background:#FFE600;border-radius:5px}
.pill{background:#FFE600;border-radius:28px;padding:6px 38px;text-shadow:none}
</style></head><body><div id="glow"></div>${spec.tag ? `<div id="tag">${esc(spec.tag)}</div>` : ""}${beats}${spec.progress ? `<div id="track"><div id="bar"></div></div>` : ""}<script>window.TOTAL=${spec.seconds};${BROWSER_SCRIPT}</script></body></html>`;
}

export async function renderKinetic(spec: KSpec): Promise<string> {
  const fps = spec.fps ?? 30;
  const frames = Math.round(spec.seconds * fps);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kinetic-"));
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.setContent(html(spec));
    await page.evaluate("document.fonts.ready");
    for (let i = 0; i < frames; i++) {
      await page.evaluate(`window.setT(${(i / fps).toFixed(4)})`);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    }
  } finally {
    await browser.close();
  }
  fs.mkdirSync(path.dirname(path.resolve(spec.out)), { recursive: true });
  const ffmpeg = process.env.FFMPEG_PATH || (require("ffmpeg-static") as string);
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "f%05d.jpg")];
  if (spec.audio) args.push("-i", spec.audio);
  args.push("-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p");
  if (spec.audio) args.push("-c:a", "aac", "-b:a", "128k", "-shortest");
  args.push(spec.out);
  execFileSync(ffmpeg, args, { stdio: ["ignore", "inherit", "inherit"] });
  fs.rmSync(dir, { recursive: true, force: true });
  return spec.out;
}

if (process.argv[1]?.endsWith("kinetic.ts") && process.argv[2]) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as KSpec;
  renderKinetic(spec).then((o) => console.log(`✓ ${o}`)).catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
