// 뷰티레터 카드뉴스 → @from.beautyletter 인스타그램 캐러셀 발행
//
// 사용법:
//   npm run beauty:publish -- <샘플 폴더> [--dry-run]
//   예) npm run beauty:publish -- design/beauty_news/samples/2026-10_peripera_mood_glowy --dry-run
//
// 샘플 폴더에는 slides.html, caption.txt가 있어야 한다. 먼저 render.mjs로 output/jpg/*.jpg를 만든다.
// 이미지는 국내여행(@eodigam_yojeom) 발행과 같은 방식으로 저장소 data/publish/<id>/에 올리고
// raw.githubusercontent.com 커밋 고정 주소를 인스타에 넘긴다.
// --dry-run: 이미지 업로드와 주소 확인까지만 하고 인스타에는 올리지 않는다.
// 계정: 환경 변수 META_ACCESS_TOKEN_BEAUTY / INSTAGRAM_ACCOUNT_ID_BEAUTY

import fs from "node:fs";
import path from "node:path";
import { buildCaption, checkInstagram, hostImages, publishCarousel, waitForUrls } from "./instagram.js";

const BRAND = "beauty";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder) throw new Error("샘플 폴더를 지정하세요. 예: design/beauty_news/samples/<폴더>");

  const jpgDir = path.join(folder, "output", "jpg");
  const jpegs = fs.existsSync(jpgDir)
    ? fs.readdirSync(jpgDir).filter((f) => /^\d{2}\.jpg$/.test(f)).sort().map((f) => path.join(jpgDir, f))
    : [];
  if (!jpegs.length) throw new Error(`${jpgDir}에 JPEG가 없음. 먼저 node design/beauty_news/render.mjs ${folder}/slides.html`);

  const captionFile = path.join(folder, "caption.txt");
  if (!fs.existsSync(captionFile)) throw new Error(`${captionFile} 없음`);
  // caption.txt는 본문과 해시태그가 함께 들어 있다: 마지막 해시태그 줄을 분리해 개수(30개) 제한을 적용한다.
  const lines = fs.readFileSync(captionFile, "utf8").trimEnd().split("\n");
  const tagLine = lines.length && lines[lines.length - 1].trim().startsWith("#") ? lines.pop()! : "";
  const caption = buildCaption(lines.join("\n"), tagLine);

  console.log(`계정 확인: ${await checkInstagram(BRAND)}`);
  console.log(`이미지 ${jpegs.length}장, 캡션 ${caption.length}자${dryRun ? " (DRY RUN: 인스타에는 올리지 않음)" : ""}`);

  const contentId = `BL-${path.basename(folder)}`;
  const urls = hostImages(contentId, jpegs);
  await waitForUrls(urls);
  console.log(`이미지 주소 확인 완료 (${urls.length}개)\n  ${urls[0]}`);

  if (dryRun) {
    console.log("DRY RUN 종료: 실제 발행하려면 --dry-run 없이 다시 실행");
    return;
  }

  const mediaId = await publishCarousel(urls, caption, BRAND);
  const record = { content_id: contentId, account: "@from.beautyletter", media_id: mediaId, published_at: new Date().toISOString(), images: urls };
  fs.writeFileSync(path.join(folder, "published.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(`발행 완료: media ${mediaId}`);
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
