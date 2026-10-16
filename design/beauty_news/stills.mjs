// 릴스 시안용 정지 이미지: html의 .card를 한 장씩 output/stills/NN.jpg로 저장
// 실행: node design/beauty_news/stills.mjs <reel.html>
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const html = path.resolve(process.argv[2]);
const out = path.join(path.dirname(html), "output", "stills");
await mkdir(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
try {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(pathToFileURL(html).href, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  for (const c of await p.$$(".card")) {
    const n = (await c.getAttribute("data-name")).slice(0, 2);
    await c.screenshot({ path: path.join(out, `${n}.jpg`), type: "jpeg", quality: 90 });
  }
} finally { await b.close(); }
console.log(out);
