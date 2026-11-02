// config/*.json + phrases/*.json → lib/data.generated.ts (Vercel 함수에 파일 읽기 없이 묶이도록)
// --check 이면 검사만 하고 파일은 쓰지 않는다.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const accounts = JSON.parse(readFileSync(join(root, "config/accounts.json"), "utf8")).accounts;
const linksRaw = JSON.parse(readFileSync(join(root, "config/links.json"), "utf8"));
const links = Object.fromEntries(Object.entries(linksRaw).filter(([k]) => !k.startsWith("_")));

const phrases = {};
for (const f of readdirSync(join(root, "phrases")).filter((f) => f.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(join(root, "phrases", f), "utf8"));
  // 서버에 필요한 필드만 싣는다(notes·persona 등 설명용 필드 제외)
  const { account, handle, language, dm, reply, replyNoLink, pinned } = p;
  phrases[account] = { account, handle, language, dm, reply, replyNoLink, pinned };
}

// 검사
const errs = [];
const min = { greetings: 15, bodies: 15, closings: 15 };
for (const [key, p] of Object.entries(phrases)) {
  for (const sec of ["dm", "reply"]) for (const [part, n] of Object.entries(min)) {
    const len = p[sec]?.[part]?.length ?? 0;
    if (len < n) errs.push(`${key}: ${sec}.${part} ${len}개 (최소 ${n})`);
  }
  if ((p.replyNoLink?.bodies?.length ?? 0) < 15) errs.push(`${key}: replyNoLink.bodies 부족`);
  if ((p.pinned?.length ?? 0) < 10) errs.push(`${key}: pinned 부족`);
  for (const b of p.dm?.bodies ?? []) if (b.split("{link}").length !== 2) errs.push(`${key}: {link} 1번 아님 → ${b.slice(0, 25)}`);
  const all = [p.dm, p.reply].flatMap((s) => [...(s?.greetings ?? []), ...(s?.bodies ?? []), ...(s?.closings ?? [])])
    .concat(p.replyNoLink?.bodies ?? [], p.pinned ?? []);
  const seen = new Set();
  for (const s of all) { if (seen.has(s)) errs.push(`${key}: 중복 → ${s.slice(0, 25)}`); seen.add(s); }
}
for (const [acc, table] of Object.entries(links)) {
  for (const [mid, url] of Object.entries(table)) {
    if (!/^\d+$/.test(mid)) errs.push(`links.${acc}: 게시물 ID는 숫자여야 함 → ${mid}`);
    if (!/^https:\/\//.test(String(url))) errs.push(`links.${acc}.${mid}: https 링크가 아님`);
  }
}
for (const a of accounts) if (a.enabled && !phrases[a.key]) errs.push(`${a.key}: 문구 파일 없음 (켜져 있어도 서버가 건너뜀)`);

const ts = `// 자동 생성 파일: npm run build:data (직접 고치지 말 것)
export interface AccountConfig { key: string; name: string; handle: string; igUserId: string; tokenEnv: string; enabled: boolean }
export const ACCOUNTS: AccountConfig[] = ${JSON.stringify(accounts.map(({ key, name, handle, igUserId, tokenEnv, enabled }) => ({ key, name, handle, igUserId, tokenEnv, enabled })), null, 1)};
export const LINKS: Record<string, Record<string, string>> = ${JSON.stringify(links, null, 1)};
import type { PhraseSet } from "./phrases.js";
export const PHRASES: Record<string, PhraseSet> = ${JSON.stringify(phrases)};
`;
if (errs.length) console.log("검사 결과:\n- " + errs.join("\n- "));
else console.log("검사 통과");
console.log(`계정 ${accounts.length}개, 문구 ${Object.keys(phrases).length}개 계정, 링크 ${Object.values(links).reduce((n, t) => n + Object.keys(t).length, 0)}개`);
if (!process.argv.includes("--check")) {
  writeFileSync(join(root, "lib/data.generated.ts"), ts);
  console.log("lib/data.generated.ts 생성");
}
process.exitCode = errs.some((e) => !e.includes("문구 파일 없음")) ? 1 : 0;
