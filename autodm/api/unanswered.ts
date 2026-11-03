// 미답변 질문 목록(관제가 나중에 댓글로 답하기용): /api/unanswered?account=copymarong
// 인증: 헤더 x-poll-key 또는 ?key= 가 POLL_SECRET 과 같아야 함
import { getStore } from "../lib/store.js";

export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const key = request.headers.get("x-poll-key") || u.searchParams.get("key");
  if (!process.env.POLL_SECRET || key !== process.env.POLL_SECRET) return new Response("forbidden", { status: 403 });
  const account = u.searchParams.get("account") || "copymarong";
  const items = (await getStore().recent(`unanswered:${account}`)).map((s) => JSON.parse(s));
  return Response.json({ account, count: items.length, items });
}
