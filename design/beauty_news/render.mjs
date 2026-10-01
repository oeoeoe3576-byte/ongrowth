// 뷰티 뉴스 카드뉴스 렌더러
// HTML 안의 .card를 하나씩 PNG(1080×1350 @2x)로 저장한다.
// 실행: node design/beauty_news/render.mjs [slides.html 경로]
//   - 경로를 생략하면 양식 원본(design/beauty_news/slides.html) → design/beauty_news/preview/
//   - 경로를 주면 그 HTML 옆의 output/ 폴더에 저장

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, "slides.html");
const outDir = process.argv[2] ? path.join(path.dirname(htmlPath), "output") : path.join(dir, "preview");
await mkdir(outDir, { recursive: true });

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" })
  .catch(() => chromium.launch());
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (const card of await page.$$(".card")) {
    const name = await card.getAttribute("data-name");
    await card.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`saved ${name}.png`);
  }
} finally {
  await browser.close();
}
