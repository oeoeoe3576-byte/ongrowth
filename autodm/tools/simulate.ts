// 오프라인 시뮬레이션(실제 API 호출 없음): 가짜 댓글로 문구 조합·중복 금지·분기를 확인.
//   npm run simulate -- [계정키] [건수]
import { useMemoryStore } from "../lib/store.js";
import { pick, commitPick, RECENT_KEEP } from "../lib/phrases.js";
import { PHRASES } from "../lib/data.generated.js";

const store = useMemoryStore();
const keys = process.argv[2] ? [process.argv[2]] : Object.keys(PHRASES);
const n = Number(process.argv[3] || 300);
let problems = 0;
for (const k of keys) {
  const p = PHRASES[k];
  for (const kind of ["dm", "reply", "replyNoLink", "pinned"] as const) {
    const history: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = await pick(store, p, kind, { link: "https://example.com/test" });
      const window = history.slice(-RECENT_KEEP);
      if (kind !== "pinned" && window.includes(r.combo)) problems++;
      history.push(r.combo);
      await commitPick(store, k, r);
    }
    const uniq = new Set(history).size;
    console.log(`${k.padEnd(13)} ${kind.padEnd(11)} ${n}건 중 서로 다른 조합 ${uniq}개`);
  }
  const dm = await pick(store, p, "dm", { link: "https://example.com/test" });
  const rp = await pick(store, p, "reply");
  const nl = await pick(store, p, "replyNoLink");
  console.log(`  예시 DM:\n    ${dm.text.replace(/\n/g, "\n    ")}\n  예시 답글: ${rp.text}\n  링크 없음 답글: ${nl.text}\n`);
}
console.log(problems ? `최근 ${RECENT_KEEP}건 안 중복 ${problems}건 ❌` : `최근 ${RECENT_KEEP}건 안 같은 조합 0건 ✅`);
