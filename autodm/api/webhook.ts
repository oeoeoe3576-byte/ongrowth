// Meta 웹훅 수신 (앱이 Live + 댓글 고급 액세스가 된 뒤에 동작).
// GET: 구독 확인(hub.challenge) / POST: 댓글 알림 → 서명 검사 → 처리
// 환경 변수: WEBHOOK_VERIFY_TOKEN, IG_APP_SECRET (+ core.ts 의 AUTODM_*)
import { createHmac, timingSafeEqual } from "node:crypto";
import { accountByIgId, handleComment } from "../lib/core.js";

export async function GET(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const ok =
    u.searchParams.get("hub.mode") === "subscribe" &&
    !!process.env.WEBHOOK_VERIFY_TOKEN &&
    u.searchParams.get("hub.verify_token") === process.env.WEBHOOK_VERIFY_TOKEN;
  return ok ? new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.IG_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header.slice(7), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    console.log(JSON.stringify({ t: new Date().toISOString(), webhook: "서명 불일치 또는 IG_APP_SECRET 없음" }));
    return new Response("bad signature", { status: 401 });
  }
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const results = [];
  for (const entry of body.entry ?? []) {
    const account = await accountByIgId(String(entry.id));
    if (!account) continue;
    // 문서 예시가 두 형태(changes 배열 / entry 바로 아래 field·value)라 둘 다 받는다
    const changes = entry.changes ?? (entry.field ? [{ field: entry.field, value: entry.value }] : []);
    for (const ch of changes) {
      if (ch.field !== "comments" || !ch.value?.id) continue;
      const v = ch.value;
      results.push(
        await handleComment(account, {
          id: String(v.id),
          text: v.text,
          from: v.from,
          parent_id: v.parent_id,
          mediaId: String(v.media?.id ?? ""),
          timestamp: entry.time ? new Date(Number(entry.time) * (entry.time > 1e12 ? 1 : 1000)).toISOString() : undefined,
        }),
      );
    }
  }
  return Response.json({ ok: true, handled: results.length });
}
