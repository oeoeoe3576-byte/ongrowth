// 인스타그램 API(인스타그램 로그인 방식, graph.instagram.com) 호출 모음.
// 토큰 값은 로그·오류 메시지에 절대 넣지 않는다.

const VERSION = () => process.env.IG_GRAPH_VERSION || "v23.0";
// 토큰 종류로 경로 선택: 인스타 로그인 토큰(IG…) = graph.instagram.com, 페이스북 페이지 토큰(EAA…) = graph.facebook.com
// (인스타 로그인 방식은 개발 모드에서 댓글 목록이 빈 배열로 와서, 11/5부터 페이지 연결 계정은 페이스북 방식 사용)
export const isFb = (token: string) => token.startsWith("EAA");
const BASE = (token: string) => (isFb(token) ? `https://graph.facebook.com/${VERSION()}` : `https://graph.instagram.com/${VERSION()}`);

export class GraphError extends Error {
  constructor(message: string, public code?: number, public subcode?: number) {
    super(message);
  }
}

async function call(path: string, token: string, init?: { method?: string; json?: unknown; query?: Record<string, string> }) {
  const q = new URLSearchParams(init?.query ?? {});
  const url = `${BASE(token)}/${path}${q.toString() ? `?${q}` : ""}`;
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
    throw new GraphError(String(e.message ?? `HTTP ${res.status}`).replace(/(IG|EAA)[A-Za-z0-9]{20,}/g, "[토큰]"), e.code, e.error_subcode);
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
  caption?: string; // 게시물 캡션(폴링 때 붙임): "프로필 링크 N번" 읽기용
}

export async function me(token: string): Promise<{ user_id: string; username: string }> {
  if (isFb(token)) {
    // 페이지 토큰: 페이지에 연결된 인스타 비즈니스 계정
    const p = await call("me", token, { query: { fields: "instagram_business_account{id,username}" } });
    const ig = p.instagram_business_account ?? {};
    return { user_id: ig.id, username: ig.username };
  }
  return call("me", token, { query: { fields: "user_id,username" } });
}

export async function recentMedia(token: string, limit = 10): Promise<{ id: string; timestamp: string; comments_count?: number; caption?: string }[]> {
  const owner = isFb(token) ? (await me(token)).user_id : "me";
  const j = await call(`${owner}/media`, token, { query: { fields: "id,timestamp,comments_count,caption", limit: String(limit) } });
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
  // 페이스북 방식은 페이지 토큰으로 me(=페이지)/messages
  const j = await call(isFb(token) ? "me/messages" : `${igUserId}/messages`, token, {
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
