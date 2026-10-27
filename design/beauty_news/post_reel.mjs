// 뷰티레터 릴스 자동 업로드 (사용자 결정 2026-10-27: 무료 음원을 넣어 하루 2편 자동 업로드)
// auto_queue.json에서 아직 안 올린 첫 편을 골라 인스타그램 API(재개 가능 업로드)로 올린다.
// 영상은 letters/<폴더>/output/auto/reel_music.mp4 (music.py로 무료 음원을 넣은 것, 커밋 안 됨 → 이 컨테이너에만 있음)
// 캡션 = caption.txt + 음원 출처 한 줄(CC BY 필수).
// 실행: node post_reel.mjs          → 다음 편 게시
//       node post_reel.mjs --dry    → 업로드·처리까지만 확인하고 게시하지 않음
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "auto_queue.json");
const DRY = process.argv.includes("--dry");
const tok = process.env.META_ACCESS_TOKEN_BEAUTY;
const igId = process.env.INSTAGRAM_ACCOUNT_ID_BEAUTY;
if (!tok || !igId) throw new Error("META_ACCESS_TOKEN_BEAUTY / INSTAGRAM_ACCOUNT_ID_BEAUTY 없음");
const V = "v23.0";
const host = tok.startsWith("IGAA") ? "https://graph.instagram.com" : "https://graph.facebook.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: tok });
  const url = `${host}/${V}/${p}` + (method === "GET" ? `?${body}` : "");
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, method === "GET" ? {} : { method, body });
      const j = await r.json();
      if (j.error) throw new Error(`${j.error.message} (code ${j.error.code})`);
      return j;
    } catch (e) {
      if (i === 3 || /code (100|190|10|200)\)/.test(e.message)) throw e;
      await sleep(2000 * 2 ** i);
    }
  }
}

const queue = JSON.parse(await readFile(qPath, "utf8"));
const item = queue.items.find((x) => !x.posted);
if (!item) { console.log("큐가 비었어요: 올릴 편이 없음"); process.exit(0); }

const dir = path.join(here, "letters", item.dir);
const video = path.join(dir, "output/auto/reel_music.mp4");
const size = (await stat(video)).size;
let caption = (await readFile(path.join(dir, "caption.txt"), "utf8")).trim();
caption += `\n\nMusic: "${item.song}" Kevin MacLeod (incompetech.com) · CC BY 4.0`;
if (caption.length > 2200) throw new Error("캡션이 2200자를 넘음");

// 1) 컨테이너 생성(재개 가능 업로드)
const c = await api("POST", `${igId}/media`, {
  media_type: "REELS", upload_type: "resumable", caption, share_to_feed: "true", thumb_offset: "300",
});
// 2) 영상 파일 업로드
const up = await fetch(c.uri || `https://rupload.facebook.com/ig-api-upload/${V}/${c.id}`, {
  method: "POST",
  headers: { Authorization: `OAuth ${tok}`, offset: "0", file_size: String(size) },
  body: await readFile(video),
});
const uj = await up.json().catch(() => ({}));
if (!up.ok || uj.success === false) throw new Error(`업로드 실패: ${up.status} ${JSON.stringify(uj).slice(0, 200)}`);
// 3) 처리 완료 대기
let st = "";
for (let i = 0; i < 60; i++) {
  st = (await api("GET", c.id, { fields: "status_code,status" })).status_code;
  if (st === "FINISHED" || st === "ERROR" || st === "EXPIRED") break;
  await sleep(5000);
}
if (st !== "FINISHED") throw new Error(`처리 실패: ${st} (${item.dir})`);
if (DRY) { console.log(`[확인만] ${item.dir} 업로드·처리 OK (게시 안 함)`); process.exit(0); }
// 4) 게시
const pub = await api("POST", `${igId}/media_publish`, { creation_id: c.id });
const info = await api("GET", pub.id, { fields: "permalink,timestamp" });
Object.assign(item, { posted: info.timestamp, media_id: pub.id, permalink: info.permalink });
await writeFile(qPath, JSON.stringify(queue, null, 2) + "\n");
const left = queue.items.filter((x) => !x.posted).length;
console.log(`게시 완료: ${item.title} → ${info.permalink} (남은 편 ${left})`);
