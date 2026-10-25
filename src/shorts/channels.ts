// 채널 업로드 목록으로 부업 쇼츠 모으기 (검색 한도를 쓰지 않는다: playlistItems·videos.list는 호출당 1유닛).
//   npm run shorts-channels -- [--pages 10] [--min-views 100000] [--max-sec 180]
// 1) tags.csv에서 valid인 영상의 채널을 찾고 2) 그 채널의 최근 업로드를 훑어 3) 주제어·조회수·길이로 걸러 videos.csv에 덧붙인다.

import fs from "node:fs";
import path from "node:path";
import { isoToSeconds } from "./collect.js";

const API = "https://www.googleapis.com/youtube/v3";
const DIR = path.resolve("data/shorts-db");
const TOPIC = /부업|[nN]잡|투잡|쓰리잡|알바|수익|돈\s?(벌|버)|재택|블로그|애드센스|애드포스트|체험단|스마트스토어|쿠팡|배달|구매대행|위탁|쌀먹|앱테크|공구|월급|퇴사|창업|사업|AI로/;
const EXCLUDE = /모집|인원\s*급구|인원\s*모집|손부업|수공예|가정부업|삼성화재/;
const HEADER = ["id", "title", "channel", "views", "likes", "comments", "seconds", "published", "query", "url", "thumbnail", "description"];

async function get(endpoint: string, params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY ?? "" });
  const res = await fetch(`${API}/${endpoint}?${q}`);
  const json: any = await res.json();
  if (!res.ok || json.error) throw new Error(`YouTube API ${res.status}: ${json.error?.message ?? "오류"}`);
  return json;
}
const esc = (s: string) => `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
const parse = (l: string): string[] => {
  const o: string[] = []; let c = "", q = false;
  for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ",") { o.push(c); c = ""; } else c += ch; }
  o.push(c); return o;
};
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export async function collectChannels(opts: { pages: number; minViews: number; maxSec: number; seeds?: string }) {
  const videosCsv = path.join(DIR, "videos.csv");
  const rows = fs.readFileSync(videosCsv, "utf8").trim().split("\n").slice(1).map(parse);
  const seen = new Set(rows.map((r) => r[0]));
  const tags = new Map<string, string>(fs.readFileSync(path.join(DIR, "tags.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(",") as [string, string]));
  // --seeds <파일>: 그 파일의 영상 ID들의 채널만 훑는다 (이미 훑은 채널을 다시 훑지 않으려고)
  const seedIds = opts.seeds ? fs.readFileSync(opts.seeds, "utf8").trim().split("\n") : rows.filter((r) => tags.get(r[0]) === "valid").map((r) => r[0]);
  // 1) 시드 영상의 채널 ID (videos.list 1유닛/50개)
  const channels = new Map<string, string>();
  for (const ids of chunk(seedIds, 50)) {
    const v = await get("videos", { part: "snippet", id: ids.join(",") });
    for (const it of v.items ?? []) channels.set(it.snippet.channelId, it.snippet.channelTitle);
  }
  let units = Math.ceil(seedIds.length / 50), added = 0, scanned = 0;
  const out: string[] = [];
  // 2) 채널별 업로드 훑기
  for (const [cid, ctitle] of channels) {
    const playlist = "UU" + cid.slice(2);
    const ids: string[] = [];
    let token: string | undefined;
    for (let p = 0; p < opts.pages; p++) {
      const r = await get("playlistItems", { part: "contentDetails", playlistId: playlist, maxResults: "50", ...(token ? { pageToken: token } : {}) }).catch(() => null);
      units++;
      if (!r) break;
      ids.push(...(r.items ?? []).map((i: any) => i.contentDetails.videoId));
      token = r.nextPageToken;
      if (!token) break;
    }
    scanned += ids.length;
    for (const batch of chunk(ids.filter((i) => !seen.has(i)), 50)) {
      const v = await get("videos", { part: "snippet,statistics,contentDetails", id: batch.join(",") });
      units++;
      for (const it of v.items ?? []) {
        const views = Number(it.statistics?.viewCount ?? 0), sec = isoToSeconds(it.contentDetails?.duration ?? "");
        const sn = it.snippet, text = `${sn.title} ${sn.description ?? ""} ${(sn.tags ?? []).join(" ")}`;
        if (views < opts.minViews || sec === 0 || sec > opts.maxSec || !TOPIC.test(text) || EXCLUDE.test(text) || seen.has(it.id)) continue;
        seen.add(it.id); added++;
        out.push([it.id, esc(sn.title), esc(sn.channelTitle), views, it.statistics?.likeCount ?? "", it.statistics?.commentCount ?? "", sec, sn.publishedAt.slice(0, 10), esc(`channel:${ctitle}`), `https://www.youtube.com/shorts/${it.id}`, sn.thumbnails?.high?.url ?? "", esc((sn.description ?? "").slice(0, 300))].join(","));
      }
    }
  }
  if (out.length) fs.appendFileSync(videosCsv, out.join("\n") + "\n");
  return { channels: channels.size, scanned, added, units };
}

if (process.argv[1]?.endsWith("channels.ts")) {
  const arg = (n: string, d: number) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
  const si = process.argv.indexOf("--seeds");
  collectChannels({ pages: arg("pages", 10), minViews: arg("min-views", 100000), maxSec: arg("max-sec", 180), seeds: si > 0 ? process.argv[si + 1] : undefined })
    .then((r) => console.log(`채널 ${r.channels}개 · 훑은 영상 ${r.scanned}개 · 새로 저장 ${r.added}개 · 약 ${r.units}유닛`))
    .catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
