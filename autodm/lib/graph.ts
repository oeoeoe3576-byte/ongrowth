// 인스타그램 API(인스타그램 로그인 방식, graph.instagram.com) 호출 모음.
// 토큰 값은 로그·오류 메시지에 절대 넣지 않는다.

const VERSION = () => process.env.IG_GRAPH_VERSION || "v23.0";
const BASE = () => `https://graph.instagram.com/${VERSION()}`;

export class GraphError extends Error {
  constructor(message: string, public code?: number, public subcode?: number) {
    super(message);
  }
}

async function call(path: string, token: string, init?: { method?: string; json?: unknown; query?: Record<string, string> }) {
  const q = new URLSearchParams(init?.query ?? {});
  const url = `${BASE()}/${path}${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.json ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.json ? JSON.stringify(init.json) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new GraphError(String(e.message ?? `HTTP ${res.status}`).replace(/IG[A-Za-z0-9]{20,}/g, "[토큰]"), e.code, e.error_subcode);
  }
  return json;
}

export interface IgComment {
  id: string;
  text?: string;
  timestamp?: string;
  from?: { id: string; username?: string };
  username?: string;
  parent_id?: string;
  mediaId: string;
}

export async function me(token: string): Promise<{ user_id: string; username: string }> {
  return call("me", token, { query: { fields: "user_id,username" } });
}

export async function recentMedia(token: string, limit = 10): Promise<{ id: string; timestamp: string; comments_count?: number }[]> {
  const j = await call("me/media", token, { query: { fields: "id,timestamp,comments_count", limit: String(limit) } });
  return j.data ?? [];
}

export async function mediaComments(token: string, mediaId: string): Promise<IgComment[]> {
  const j = await call(`${mediaId}/comments`, token, {
    query: { fields: "id,text,timestamp,from,username,replies{username}", limit: "50" },
  });
  return (j.data ?? []).map((c: any) => ({ ...c, mediaId, _replies: c.replies?.data ?? [] }));
}

/** 공개 답글 */
export async function replyToComment(token: string, commentId: string, message: string): Promise<string> {
  const j = await call(`${commentId}/replies`, token, { method: "POST", json: { message } });
  return j.id;
}

/** 비공개 답장(DM): 댓글 후 7일 이내, 1통만 */
export async function privateReply(token: string, igUserId: string, commentId: string, text: string): Promise<string> {
  const j = await call(`${igUserId}/messages`, token, {
    method: "POST",
    json: { recipient: { comment_id: commentId }, message: { text } },
  });
  return j.message_id ?? j.id;
}

/** 게시물에 댓글 달기(고정 댓글용 — 고정 자체는 앱에서 사용자가 누름) */
export async function commentOnMedia(token: string, mediaId: string, message: string): Promise<string> {
  const j = await call(`${mediaId}/comments`, token, { method: "POST", json: { message } });
  return j.id;
}

export async function subscribedApps(token: string, igUserId: string) {
  return call(`${igUserId}/subscribed_apps`, token);
}
