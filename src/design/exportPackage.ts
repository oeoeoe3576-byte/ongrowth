// 발행 패키지: 카드 JPEG(인스타그램 API는 JPEG만 받음) + 캡션 + ZIP.
// 인스타그램 자동 발행이 연결되기 전에는 이 패키지를 받아 직접 올린다.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cardDocument, type RenderedContent } from "./renderHtml.js";
import { launchBrowser } from "./renderPng.js";
import { CARD_WIDTH, CARD_HEIGHT } from "./tokens.js";

export const PUBLISH_DIR = path.resolve("cardnews_output/publish");

export interface PublishPackage {
  dir: string;
  images: string[];
  captionFile: string;
  zip: string | null;
}

export async function exportPackage(content: RenderedContent, outRoot = PUBLISH_DIR): Promise<PublishPackage> {
  const id = content.master.content_id;
  const dir = path.join(outRoot, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await launchBrowser();
  const images: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT }, deviceScaleFactor: 1 });
    for (const card of content.cards) {
      await page.setContent(cardDocument(card), { waitUntil: "load" });
      await page.evaluate("document.fonts.ready.then(() => true)");
      const file = path.join(dir, `${String(card.page.number).padStart(2, "0")}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 92, clip: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT } });
      images.push(file);
    }
  } finally {
    await browser.close();
  }
  const captionFile = path.join(dir, "caption.txt");
  fs.writeFileSync(captionFile, `${content.master.caption.trim()}\n\n${content.master.hashtags.trim()}\n`, "utf8");
  let zip: string | null = path.join(outRoot, `${id}.zip`);
  try {
    fs.rmSync(zip, { force: true });
    execFileSync("zip", ["-qj", zip, ...images, captionFile]);
  } catch {
    zip = null; // zip 명령이 없는 환경이면 폴더만 제공
  }
  return { dir, images, captionFile, zip };
}
