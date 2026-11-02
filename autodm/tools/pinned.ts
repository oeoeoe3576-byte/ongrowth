// 게시물 업로드 때 다는 '고정 댓글'(비공개 계정·DM 제한 안내) 문구 고르기 / 달기.
//   npm run pinned -- <계정키> <게시물ID>            → 문구만 보여줌(아무것도 안 올림)
//   npm run pinned -- <계정키> <게시물ID> --confirm  → 그 문구로 댓글을 실제로 단다(사용자 승인 후에만)
// 인스타 API에는 댓글 '고정' 기능이 없어서, 고정은 앱에서 그 댓글을 길게 눌러 사용자가 직접 한다.
// 이미 쓴 고정 문구는 data/pinned-log.json 에 남겨 같은 문구를 연달아 쓰지 않는다.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ACCOUNTS, PHRASES } from "../lib/data.generated.js";
import { commentOnMedia } from "../lib/graph.js";

const [key, mediaId] = process.argv.slice(2);
const confirm = process.argv.includes("--confirm");
const a = ACCOUNTS.find((x) => x.key === key);
const p = PHRASES[key ?? ""];
if (!a || !p || !mediaId) {
  console.log("사용법: npm run pinned -- <계정키> <게시물ID> [--confirm]");
  process.exit(1);
}
const logPath = new URL("../data/pinned-log.json", import.meta.url);
const log: { account: string; mediaId: string; index: number; at: string }[] = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : [];
const prev = log.find((l) => l.account === key && l.mediaId === mediaId);
const used = log.filter((l) => l.account === key).slice(-Math.max(1, p.pinned.length - 1)).map((l) => l.index);
const choices = p.pinned.map((_, i) => i).filter((i) => !used.includes(i));
const index = prev?.index ?? choices[Math.floor(Math.random() * choices.length)];
console.log(`[${a.name}] 게시물 ${mediaId} 고정 댓글 문구:\n${p.pinned[index]}`);
if (!confirm) {
  console.log("\n(미리보기만 했습니다. 실제로 달려면 --confirm)");
  process.exit(0);
}
if (prev) {
  console.log("이 게시물에는 이미 달았습니다. 다시 달지 않습니다.");
  process.exit(0);
}
const token = process.env[a.tokenEnv];
if (!token) {
  console.log(`토큰 환경 변수 ${a.tokenEnv} 가 없습니다.`);
  process.exit(1);
}
const id = await commentOnMedia(token, mediaId, p.pinned[index]);
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
log.push({ account: key!, mediaId, index, at: new Date().toISOString() });
writeFileSync(logPath, JSON.stringify(log, null, 1));
console.log(`댓글 달림(id ${id}). 인스타 앱에서 이 댓글을 길게 눌러 '고정'해 주세요.`);
