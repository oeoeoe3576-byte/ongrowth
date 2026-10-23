// 부업 쇼츠 수집: 유튜브 데이터 API로 조회수 높은 한국어 쇼츠의 공개 정보(제목·조회수·길이·썸네일 등)를 모은다.
//   npm run shorts -- collect [--max-searches 30] [--min-views 100000] [--max-sec 180]
// 검색 1회 = 100유닛 (하루 기본 한도 10,000유닛). 키는 환경 변수 YOUTUBE_API_KEY로만 읽는다.
// 결과: data/shorts-db/videos.csv (이미 있는 영상은 건너뛰고 이어서 모은다)

import fs from "node:fs";
import path from "node:path";

const API = "https://www.googleapis.com/youtube/v3";
const OUT = path.resolve("data/shorts-db/videos.csv");
const QUERIES = ["부업", "부업 추천", "직장인 부업", "블로그 부업", "스마트스토어 부업", "퇴근 후 부업", "n잡", "애드포스트 수익", "체험단 부업", "집에서 하는 부업"];
// 시범(58개) 분류에서 나온 잡음: 수공예 재택부업 모집 반복 영상(스팸), 기업 광고 시리즈
const EXCLUDE = /모집|인원\s*급구|인원\s*모집|손부업|수공예|가정부업|삼성화재/;
const HEADER = ["id", "title", "channel", "views", "likes", "comments", "seconds", "published", "query", "url", "thumbnail", "description"];

function key(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error("환경 변수 YOUTUBE_API_KEY가 없음");
  return k;
}

async function get(endpoint: string, params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ ...params, key: key() });
  const res = await fetch(`${API}/${endpoint}?${q}`);
  const json: any = await res.json();
  if (!res.ok || json.error) throw new Error(`YouTube API ${res.status}: ${json.error?.message ?? "오류"}`);
  return json;
}

export function isoToSeconds(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const esc = (s: string) => `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

function readIds(): Set<string> {
  if (!fs.existsSync(OUT)) return new Set();
  return new Set(fs.readFileSync(OUT, "utf8").split("\n").slice(1).map((l) => l.split(",")[0].replace(/"/g, "")).filter(Boolean));
}

/** 검색 기간을 나눠 같은 검색어에서도 서로 다른 영상이 나오게 한다 */
function windows(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let y = 2026; y >= 2022; y--) for (const [a, b] of [["01-01", "06-30"], ["07-01", "12-31"]] as const) out.push([`${y}-${a}T00:00:00Z`, `${y}-${b}T23:59:59Z`]);
  return out;
}

export async function collect(opts: { maxSearches: number; minViews: number; maxSec: number }): Promise<{ added: number; searches: number; units: number }> {
  const seen = readIds();
  const rows: string[] = [];
  let searches = 0;
  outer: for (const [after, before] of windows()) {
    for (const q of QUERIES) {
      if (searches >= opts.maxSearches) break outer;
      searches++;
      const s = await get("search", {
        part: "snippet", type: "video", q, order: "viewCount", maxResults: "50", videoDuration: "short",
        regionCode: "KR", relevanceLanguage: "ko", publishedAfter: after, publishedBefore: before,
      });
      const ids: string[] = (s.items ?? []).map((i: any) => i.id?.videoId).filter((id: string) => id && !seen.has(id));
      if (!ids.length) continue;
      const v = await get("videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") });
      for (const it of v.items ?? []) {
        const views = Number(it.statistics?.viewCount ?? 0);
        const sec = isoToSeconds(it.contentDetails?.duration ?? "");
        if (views < opts.minViews || sec === 0 || sec > opts.maxSec || seen.has(it.id)) continue;
        if (EXCLUDE.test(`${it.snippet.title} ${it.snippet.description ?? ""}`)) continue;
        seen.add(it.id);
        const sn = it.snippet;
        rows.push([it.id, esc(sn.title), esc(sn.channelTitle), views, it.statistics?.likeCount ?? "", it.statistics?.commentCount ?? "", sec, sn.publishedAt.slice(0, 10), esc(q), `https://www.youtube.com/shorts/${it.id}`, sn.thumbnails?.high?.url ?? sn.thumbnails?.default?.url ?? "", esc((sn.description ?? "").slice(0, 300))].join(","));
      }
    }
  }
  if (rows.length) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, HEADER.join(",") + "\n");
    fs.appendFileSync(OUT, rows.join("\n") + "\n");
  }
  return { added: rows.length, searches, units: searches * 100 + searches };
}

if (process.argv[2] === "collect") {
  const arg = (n: string, d: number) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
  collect({ maxSearches: arg("max-searches", 30), minViews: arg("min-views", 100000), maxSec: arg("max-sec", 180) })
    .then((r) => console.log(`검색 ${r.searches}회(약 ${r.units}유닛) · 새로 저장 ${r.added}개 → ${OUT}`))
    .catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
