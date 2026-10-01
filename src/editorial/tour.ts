// 한국관광공사 공공데이터 (공공데이터포털, 환경 변수 TOUR_API_KEY)
//   - 관광사진(포토코리아, 공공누리 1유형: 출처 표시하면 상업적 이용 가능): 검색 → 내려받기 → 카드용으로 줄이기
//   - 국문 관광정보의 행사·축제 검색: 날짜·장소를 공식 데이터로 확인
// 네트워크 허용 필요: apis.data.go.kr (API), tong.visitkorea.or.kr (사진 파일)

import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "../design/renderPng.js";

const BASE = "https://apis.data.go.kr/B551011";
export const PHOTO_CREDIT = "사진: 한국관광공사 포토코리아";

function key(): string {
  const k = process.env.TOUR_API_KEY;
  if (!k) throw new Error("환경 변수 TOUR_API_KEY가 없음 (공공데이터포털 일반 인증키 Decoding)");
  return k;
}

async function call(pathname: string, params: Record<string, string>): Promise<any[]> {
  const q = new URLSearchParams({ serviceKey: key(), MobileOS: "ETC", MobileApp: "cardnews", _type: "json", pageNo: "1", ...params });
  const res = await fetch(`${BASE}/${pathname}?${q}`);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`관광공사 API 응답 오류 (${res.status}): ${text.slice(0, 200)}`);
  }
  const header = json?.response?.header;
  if (header && header.resultCode !== "0000") throw new Error(`관광공사 API 오류 ${header.resultCode}: ${header.resultMsg}`);
  const item = json?.response?.body?.items?.item;
  return !item ? [] : Array.isArray(item) ? item : [item];
}

export interface TourPhoto {
  title: string;
  location: string;
  photographer: string;
  month: string; // 촬영 연월 YYYYMM
  url: string;
}

export async function searchPhotos(keyword: string, rows = 20): Promise<TourPhoto[]> {
  const items = await call("PhotoGalleryService1/gallerySearchList1", { keyword, numOfRows: String(rows), arrange: "A" });
  return items
    .filter((i) => i.galWebImageUrl)
    .map((i) => ({
      title: String(i.galTitle ?? ""),
      location: String(i.galPhotographyLocation ?? ""),
      photographer: String(i.galPhotographer ?? ""),
      month: String(i.galPhotographyMonth ?? ""),
      url: String(i.galWebImageUrl).replace(/^http:/, "https:"),
    }));
}

/** 사진을 내려받아 긴 변 maxSide px JPEG로 줄여 저장 (원본 1~2MB → 수백 KB, 저장소에 커밋 가능한 크기) */
export async function downloadPhotos(photos: TourPhoto[], dir: string, maxSide = 1350): Promise<string[]> {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await launchBrowser();
  const files: string[] = [];
  try {
    const page = await browser.newPage();
    for (const [i, p] of photos.entries()) {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error(`사진 다운로드 실패 (${res.status}): ${p.url}`);
      const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      const out = (await page.evaluate(
        `(async () => {
          const img = new Image();
          img.src = "data:image/jpeg;base64,${b64}";
          await img.decode();
          const s = Math.min(1, ${maxSide} / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * s);
          c.height = Math.round(img.naturalHeight * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL("image/jpeg", 0.86).split(",")[1];
        })()`,
      )) as string;
      const file = path.join(dir, `${String(i + 1).padStart(2, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(out, "base64"));
      files.push(file);
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(dir, "credits.json"), JSON.stringify(photos.map((p, i) => ({ file: path.basename(files[i]), ...p, credit: PHOTO_CREDIT })), null, 2) + "\n", "utf8");
  return files;
}

export interface TourFestival {
  title: string;
  start: string; // YYYYMMDD
  end: string;
  addr: string;
  tel: string;
  contentId: string;
  image: string;
}

/** from~to(YYYYMMDD) 사이에 진행 중인 행사·축제 */
export async function searchFestivals(from: string, to?: string, rows = 100): Promise<TourFestival[]> {
  const items = await call("KorService2/searchFestival2", { eventStartDate: from, ...(to ? { eventEndDate: to } : {}), numOfRows: String(rows), arrange: "A" });
  return items.map((i) => ({
    title: String(i.title ?? ""),
    start: String(i.eventstartdate ?? ""),
    end: String(i.eventenddate ?? ""),
    addr: `${i.addr1 ?? ""} ${i.addr2 ?? ""}`.trim(),
    tel: String(i.tel ?? ""),
    contentId: String(i.contentid ?? ""),
    image: String(i.firstimage ?? "").replace(/^http:/, "https:"),
  }));
}
