// 읽기 전용 점검: 계정별 토큰 유효성, 아이디, 웹훅 구독 상태, 최근 게시물 ID(링크 표 작성용).
//   npm run status            (토큰 값은 출력하지 않음)
import { ACCOUNTS, LINKS } from "../lib/data.generated.js";
import { me, recentMedia, subscribedApps } from "../lib/graph.js";

for (const a of ACCOUNTS) {
  const t = process.env[a.tokenEnv];
  if (!t) {
    console.log(`- ${a.name}(${a.key}): ${a.tokenEnv} 없음`);
    continue;
  }
  try {
    const m = await me(t);
    const subs = await subscribedApps(t, m.user_id).catch((e) => ({ error: String(e.message).slice(0, 80) }));
    const media = await recentMedia(t, 5);
    console.log(`- ${a.name}(${a.key}): @${m.username} id ${m.user_id} · 웹훅 구독 ${JSON.stringify((subs as any).data ?? subs)}`);
    for (const x of media) console.log(`    게시물 ${x.id} ${x.timestamp.slice(0, 10)} 댓글 ${x.comments_count ?? 0} 링크 ${LINKS[a.key]?.[x.id] ? "있음" : "없음"}`);
  } catch (e) {
    console.log(`- ${a.name}(${a.key}): 오류 ${String((e as Error).message).slice(0, 120)}`);
  }
}
