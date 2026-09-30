// 카드 HTML → 1080x1350 PNG (Playwright). 기존 src/render/renderCard.ts와 같은 방식으로 Chromium을 띄운다.
// 캡처 전에 폰트 로딩을 기다리고, 같은 페이지에서 overflow를 측정해 검수 결과에 넣는다.

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { cardDocument, type RenderedContent } from "./renderHtml.js";
import { MEASURE_SCRIPT, type CardCheck } from "./checks.js";
import { CARD_WIDTH, CARD_HEIGHT } from "./tokens.js";

export const RENDER_DIR = path.resolve("cardnews_output/rendered");

export interface PngResult {
  page: number;
  layout: string;
  file: string;
  width: number;
  height: number;
  checks: CardCheck[];
}

/** PNG 헤더에서 크기를 읽는다 (캡처 결과가 정말 1080x1350인지 확인용) */
export function pngSize(buf: Buffer): { width: number; height: number } {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("PNG 파일이 아님");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export async function launchBrowser(): Promise<Browser> {
  return chromium
    .launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" })
    .catch(() => chromium.launch());
}

export async function renderPngs(content: RenderedContent, outDir = path.join(RENDER_DIR, content.master.content_id)): Promise<PngResult[]> {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
  const browser = await launchBrowser();
  const results: PngResult[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT }, deviceScaleFactor: 1 });
    for (const card of content.cards) {
      await page.setContent(cardDocument(card, content.theme), { waitUntil: "load" });
      await page.evaluate("document.fonts.ready.then(() => true)");
      const fontOk = (await page.evaluate(`document.fonts.check("800 72px Pretendard", "가")`)) as boolean;
      const measured = (await page.evaluate(`(${MEASURE_SCRIPT.replace("function cnMeasure", "function")})(document)`)) as { page: number; issues: CardCheck[] }[];
      const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT } });
      const size = pngSize(buf);
      const name = `page-${String(card.page.number).padStart(2, "0")}-${card.component}.png`;
      fs.writeFileSync(path.join(outDir, name), buf);
      const checks = [...card.checks, ...(measured[0]?.issues ?? [])];
      if (!fontOk) checks.push({ level: "warning", field: "font", message: "Pretendard 폰트가 로드되지 않아 시스템 폰트로 렌더링됨" });
      results.push({ page: card.page.number, layout: card.component, file: name, ...size, checks });
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify({ content_id: content.master.content_id, theme: content.theme.name, rendered_at: new Date().toISOString(), cards: results }, null, 2) + "\n",
    "utf8",
  );
  return results;
}
