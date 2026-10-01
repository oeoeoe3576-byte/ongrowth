// 뷰티 뉴스 디자인 양식 미리보기 렌더러
// slides.html 안의 .card를 하나씩 PNG(1080×1350 @2x)로 저장한다.
// 실행: node design/beauty_news/render.mjs  → design/beauty_news/preview/*.png

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, "preview");
await mkdir(outDir, { recursive: true });

const browser = await chromium
  .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" })
  .catch(() => chromium.launch());
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.join(dir, "slides.html")).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (const card of await page.$$(".card")) {
    const name = await card.getAttribute("data-name");
    await card.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`saved ${name}.png`);
  }
} finally {
  await browser.close();
}
