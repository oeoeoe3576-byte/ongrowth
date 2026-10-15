// 뷰티레터 릴스(9:16) 렌더러
// 레터의 slides.html을 1080×1920 세로 화면에 맞춰 다시 배치하고,
// 글자가 한 자씩 나타나는 애니메이션을 프레임 단위로 찍어 mp4로 만든다.
// 장마다 길이는 글자 수에 맞춰 정해진다(다 나온 뒤 HOLD초 멈춤).
// 실행: node design/beauty_news/reel.mjs <slides.html 경로>  →  같은 폴더 output/reel.mp4

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FPS = 30;
const HOLD = 1.6; // 마지막 글자가 나온 뒤 멈춰 있는 시간(초)
const TITLE_MS = 55; // 제목 글자 간격
const BODY_MS = 16; // 본문 글자 간격
const CHAR_FADE = 260; // 글자 하나가 나타나는 데 걸리는 시간
const BLOCK_FADE = 450; // 그림·칩 같은 덩어리가 나타나는 시간

const htmlPath = path.resolve(process.argv[2]);
const outDir = path.join(path.dirname(htmlPath), "output");
await mkdir(outDir, { recursive: true });
// slides.html → output/reel_full.mp4, reel.html(릴스 전용 짧은 버전) → output/reel.mp4
const base = path.basename(htmlPath, ".html");
const outFile = path.join(outDir, base === "slides" ? "reel_full.mp4" : `${base}.mp4`);

// 세로 화면 전용 배치. 4:5 장을 늘리는 대신 글자·그림 크기와 위치를 9:16에 맞춘다.
// 위 220px·아래 340px는 릴스 화면의 계정명·캡션·버튼에 가려지는 자리라 비워 둔다.
const REEL_CSS = `
html, body { margin: 0 !important; padding: 0 !important; background: #000; }
body { display: block !important; width: 1080px; height: 1920px; overflow: hidden; }
.card { height: 1920px !important; margin: 0 !important; }
html body .card:not(.cur) { display: none !important; }
html body .card.cur { position: fixed !important; top: 0 !important; left: 0 !important; }

/* 표지: 제목을 3분할 선의 아래쪽 교차점(높이 2/3) 언저리에 둔다 */
.cover-photo .body, .cover-cut .body { top: 1280px !important; bottom: auto !important; transform: translateY(-50%); }
.cover-photo h1, .cover-cut h1 { font-size: 96px !important; }
.cover-photo [data-slot="photo"] img { transform-origin: 50% 30%; }

/* 본문 장: 가운데 정렬 + 큰 글자 */
.card.lt, .card.points, .card.swatchset {
  display: flex !important; flex-direction: column; justify-content: center;
  padding-top: 200px !important; padding-bottom: 340px !important;
}
.card.lt > *, .card.points > *, .card.swatchset > * { flex: none; }
.lt .kicker { font-size: 30px !important; }
.lt h2 { font-size: 84px !important; margin: 26px 0 44px !important; }
.lt .ds, .lt p.ds { font-size: 38px !important; line-height: 1.6 !important; margin-top: 34px !important; }
.lt .tip { font-size: 33px !important; padding: 30px 36px !important; margin-top: 34px !important; }
.lt ol li, .lt .steps li, .lt li { font-size: 36px !important; line-height: 1.55 !important; }
.card .vis.illu .lb span { font-size: 30px !important; }
.lt .tone > div { padding: 34px 38px !important; }
.lt .foot { bottom: 300px !important; }

/* P.S. */
.ps .inner { top: 50% !important; transform: translateY(-55%); }
.ps .note p { font-size: 36px !important; }
.ps .credit { bottom: 300px !important; }

/* 애니메이션 단위 */
.wipe { clip-path: inset(0 100% 0 0); }
r-w { display: inline-block; white-space: nowrap; }
r-c { display: inline-block; opacity: 0; will-change: opacity, transform; }
.rb { opacity: 0; will-change: opacity, transform; }
`;

// 페이지 안에서 장 하나를 준비한다: 글자를 쪼개고, 각 글자·덩어리의 등장 시각을 정한다.
function prepCard(idx, opt) {
  const cards = [...document.querySelectorAll(".card")];
  cards.forEach((c, i) => c.classList.toggle("cur", i === idx));
  const card = cards[idx];
  const SKIP = ".topbar, .foot, .credit, .pageno, .wordmark, [data-slot], .shade, .bgimg, .glow, .static";
  const BLOCK = "img, .vis, .cs > div, .tone > div, .chips, .follow";
  let t = 300; // 장이 바뀌고 0.3초 뒤부터 시작
  const items = [];

  const walk = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 1) {
        if (ch.matches(SKIP)) continue;
        if (ch.matches(".whole")) {
          // 라벨·단계처럼 짧은 덩어리는 통째로 나타난다
          ch.classList.add("rb");
          items.push({ el: ch, at: t, dur: opt.BLOCK_FADE, block: true });
          t += 550;
          continue;
        }
        if (ch.matches(".wipe")) {
          // 비포→애프터: 왼쪽에서 오른쪽으로 덮어 가며 바뀐다
          t += 1800; // 비포 문구를 읽을 시간
          const before = card.querySelector(".cause");
          if (before) { items.push({ el: before, at: t - 350, dur: 350, out: true }); }
          items.push({ el: ch, at: t, dur: 1100, wipe: true });
          t += 2800; // 덮인 뒤 애프터 문구를 읽을 시간
          continue;
        }
        if (ch.matches(BLOCK) && !ch.querySelector("h1,h2,p,li")) {
          // 그림·칩: 통째로 나타나고, 안의 글자는 뒤이어 한 자씩
          ch.classList.add("rb");
          items.push({ el: ch, at: t, dur: opt.BLOCK_FADE, block: true });
          t += 220;
          walk(ch);
          continue;
        }
        walk(ch);
      } else if (ch.nodeType === 3 && ch.textContent.trim()) {
        const isTitle = !!ch.parentElement.closest("h1, h2, .ps-mark, .bye h2");
        const step = isTitle ? opt.TITLE_MS : opt.BODY_MS;
        const frag = document.createDocumentFragment();
        for (const part of ch.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); continue; }
          const w = document.createElement("r-w");
          for (const c of part) {
            const s = document.createElement("r-c");
            s.textContent = c;
            w.append(s);
            items.push({ el: s, at: t, dur: opt.CHAR_FADE });
            t += step;
          }
          frag.append(w);
        }
        ch.replaceWith(frag);
      }
    }
  };
  walk(card);
  // 제목 다음, 본문 시작 전에 살짝 쉼
  const end = t + opt.CHAR_FADE;
  window.__items = items;
  window.__cover = card.querySelector('[data-slot="photo"] img, .kb');
  return end;
}

function setTime(ms, total) {
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  for (const it of window.__items) {
    const p = Math.max(0, Math.min(1, (ms - it.at) / it.dur));
    const e = ease(p);
    it.el.style.opacity = e;
    if (it.out) {
      it.el.style.opacity = 1 - p;
      continue;
    }
    if (it.wipe) {
      it.el.style.clipPath = `inset(0 ${(1 - p * p * (3 - 2 * p)) * 100}% 0 0)`;
      continue;
    }
    it.el.style.transform = `translateY(${(1 - e) * (it.block ? 30 : 18)}px)`;
  }
  // 표지 사진은 아주 천천히 확대
  if (window.__cover) window.__cover.style.transform = `scale(${1 + 0.06 * (ms / total)})`;
}

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" })
  .catch(() => chromium.launch());
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-movflags", "+faststart", outFile,
], { stdio: ["pipe", "inherit", "inherit"] });

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: REEL_CSS });
  const n = await page.$$eval(".card", (c) => c.length);
  await page.addScriptTag({ content: `window.__prep = ${prepCard.toString()}; window.__set = ${setTime.toString()};` });
  let total = 0;
  for (let i = 0; i < n; i++) {
    const end = await page.evaluate(([idx, opt]) => window.__prep(idx, opt), [i, { TITLE_MS, BODY_MS, CHAR_FADE, BLOCK_FADE }]);
    const dur = end + HOLD * 1000;
    const frames = Math.round((dur / 1000) * FPS);
    for (let f = 0; f < frames; f++) {
      const ms = (f / FPS) * 1000;
      await page.evaluate(([m, d]) => window.__set(m, d), [ms, dur]);
      ff.stdin.write(await page.screenshot({ type: "jpeg", quality: 92 }));
    }
    total += dur;
    console.log(`장 ${i + 1}/${n}: ${(dur / 1000).toFixed(1)}초`);
  }
  console.log(`총 ${(total / 1000).toFixed(1)}초 → ${outFile}`);
} finally {
  ff.stdin.end();
  await browser.close();
}
await new Promise((r) => ff.on("close", r));
