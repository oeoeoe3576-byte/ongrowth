// 주기 확인(폴링): 웹훅 없이도 동작. (11/5: 숙소어디감·스테이킴은 페이스북 페이지 토큰 경로) 무료 외부 크론(cron-job.org 등)이 5~10분마다 호출.
// 켜진 계정마다 최근 게시물 N개의 댓글을 읽어, 아직 처리 안 한 7일 이내 댓글을 처리한다.
// 호출 인증: 헤더 x-poll-key 또는 ?key= 가 환경 변수 POLL_SECRET 과 같아야 함.
import { activeAccounts, handleComment, linkFor, mode, dryRun, tokenFor } from "../lib/core.js";
import { mediaComments, me, recentMedia } from "../lib/graph.js";
import { getStore } from "../lib/store.js";

export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const key = request.headers.get("x-poll-key") || u.searchParams.get("key");
  if (!process.env.POLL_SECRET || key !== process.env.POLL_SECRET) return new Response("forbidden", { status: 403 });

  const mediaLimit = Number(process.env.AUTODM_POLL_MEDIA || 10);
  const budget = Number(process.env.AUTODM_POLL_BUDGET || 25); // 한 번 호출에 처리할 최대 댓글 수
  const summary: Record<string, unknown> = { mode: mode(), dryRun: dryRun(), persistentStore: getStore().persistent };
  let used = 0;
  const since = Date.now() - 7 * 24 * 3600 * 1000;

  for (const a of activeAccounts()) {
    const token = tokenFor(a);
    if (!token) {
      summary[a.key] = `토큰 없음(${a.tokenEnv})`;
      continue;
    }
    const counts: Record<string, number> = {};
    const dbg: unknown[] = [];
    try {
      const own = (await me(token)).username;
      for (const m of await recentMedia(token, mediaLimit)) {
        const cs = m.comments_count ? await mediaComments(token, m.id) : [];
        if (u.searchParams.get("debug") === "1") dbg.push({ id: m.id, cc: m.comments_count ?? 0, got: cs.length, ts: m.timestamp, link: linkFor(a, m.id, m.caption) ?? null, cap: (m.caption ?? "").replace(/\s+/g, " ").slice(0, 70) });
        if (!m.comments_count) continue;
        for (const c of cs) {
          if (c.timestamp && Date.parse(c.timestamp) < since) continue;
          if (used >= budget) break;
          const o = await handleComment(a, { ...c, caption: m.caption }, own);
          counts[o.action] = (counts[o.action] ?? 0) + 1;
          if (o.action !== "skip") used++;
        }
      }
      summary[a.key] = dbg.length ? { ...counts, dbg } : counts;
    } catch (e) {
      summary[a.key] = `오류: ${String((e as Error).message).slice(0, 150)}`;
    }
  }
  return Response.json(summary);
}
