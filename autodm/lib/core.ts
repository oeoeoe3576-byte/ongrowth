// 댓글 하나를 처리하는 핵심 로직. 웹훅(api/webhook.ts)과 주기 확인(api/poll.ts)이 같이 쓴다.
//
// 안전장치 (기본은 아무것도 보내지 않음)
//  - AUTODM_MODE: off(기본) | test | live
//      off  : 아무것도 안 보냄(로그만)
//      test : AUTODM_TEST_USERNAMES 에 적힌 댓글 작성자에게만 보냄
//      live : 모두에게 보냄
//  - AUTODM_ACCOUNTS: 켤 계정 키 목록(쉼표). 여기 없는 계정은 off 취급.
//  - AUTODM_DRY_RUN=1 이면 어떤 모드든 실제 API 쓰기 호출 없이 로그만.
//  - AUTODM_MAX_PER_HOUR (기본 30): 계정별 시간당 처리 상한(폭주 방지).
//
// 순서: ① 비공개 답장(DM) → ② 공개 답글.
//  - 링크가 있는 게시물: DM(인사말+본문{link}+마무리) 성공 → "DM 보냈어요" 답글
//  - DM 실패(비공개 계정·DM 수신 제한 등) 또는 링크 없는 게시물 → DM 없이 "프로필 링크 확인" 답글
//    (비공개 계정 안내 자체는 개별 답글이 아니라 게시물 고정 댓글로 한다)

import { ACCOUNTS, FAQ, LINKS, PHRASES, RULES, type AccountConfig } from "./data.generated.js";
import { commitPick, pick } from "./phrases.js";
import { getStore } from "./store.js";
import { GraphError, me, privateReply, replyToComment, type IgComment } from "./graph.js";

export type Mode = "off" | "test" | "live";
const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

export function mode(): Mode {
  const m = (process.env.AUTODM_MODE || "off").toLowerCase();
  return m === "live" || m === "test" ? m : "off";
}
export function dryRun(): boolean {
  return /^(1|true|yes)$/i.test(process.env.AUTODM_DRY_RUN || "");
}
function listEnv(name: string): string[] {
  return (process.env[name] || "").split(",").map((s) => s.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
}

export function activeAccounts(): AccountConfig[] {
  const on = new Set(listEnv("AUTODM_ACCOUNTS"));
  return ACCOUNTS.filter((a) => a.enabled && on.has(a.key) && PHRASES[a.key]);
}

export function tokenFor(a: AccountConfig): string | undefined {
  return process.env[a.tokenEnv];
}

const idCache = new Map<string, string>();
export async function igUserIdFor(a: AccountConfig): Promise<string> {
  if (a.igUserId) return a.igUserId;
  if (idCache.has(a.key)) return idCache.get(a.key)!;
  const t = tokenFor(a);
  if (!t) throw new Error(`${a.key}: 토큰 환경 변수 ${a.tokenEnv} 없음`);
  const m = await me(t);
  idCache.set(a.key, m.user_id);
  return m.user_id;
}

export async function accountByIgId(igId: string): Promise<AccountConfig | undefined> {
  for (const a of activeAccounts()) {
    try {
      if ((await igUserIdFor(a)) === igId) return a;
    } catch {
      /* 토큰 없는 계정은 건너뜀 */
    }
  }
  return undefined;
}

// 질문형 댓글 판별: 물음표 또는 질문 단어
const QUESTION_WORDS = ["어디", "얼마", "몇", "되나요", "있나요", "가능", "어떻게", "언제", "사이즈", "냄새", "무슨", "뭐", "어떤", "궁금", "알려", "인가요", "나요", "까요", "을까", "ㄹ까"];
export function isQuestion(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  return /[?？]/.test(t) || QUESTION_WORDS.some((w) => t.includes(w));
}

/** 게시물 → 상품 → FAQ에서 댓글 단어로 답 고르기. 못 찾으면 null */
export function faqAnswer(account: string, mediaId: string, text: string): string | null {
  const f = FAQ[account];
  if (!f) return null;
  const key = f.media?.[mediaId] ?? f.defaultProduct ?? undefined;
  const prod = key ? f.products?.[key] : undefined;
  if (!prod) return null;
  const t = text.replace(/\s+/g, "").toLowerCase();
  for (const it of prod.faq) if (it.match.some((m) => t.includes(m.replace(/\s+/g, "").toLowerCase()))) return it.answer;
  return null;
}


/** 게시물 링크 고르기: links.json(게시물 ID) → 캡션 "프로필 링크 N번" → rules.captionLinks(캡션 단어) → defaultLink */
export function linkFor(a: AccountConfig, mediaId: string, caption?: string): string | undefined {
  const rule: any = RULES[a.key] ?? {};
  const capNo = (caption ?? "").match(/프로필\s*링크\s*\[?\s*(\d{1,2})\s*번/);
  const profileLinks: Record<string, string> = rule.profileLinks ?? {};
  const capN = (caption ?? "").replace(/\s+/g, "").toLowerCase();
  const cl = (rule.captionLinks ?? []).find((x: any) => (x.match ?? []).some((w: string) => w && capN.includes(w.replace(/\s+/g, "").toLowerCase())));
  return LINKS[a.key]?.[mediaId] || (capNo ? profileLinks[capNo[1]] : undefined) || cl?.link || rule.defaultLink || undefined;
}

export interface Outcome {
  account: string;
  commentId: string;
  mediaId?: string;
  link?: string;
  action: "skip" | "dm+reply" | "reply-nolink" | "dm-failed+reply-nolink" | "error";
  reason?: string;
  question?: "answered" | "unanswered";
  dmCombo?: string;
  replyCombo?: string;
  preview?: { dm?: string; reply?: string };
}

function log(o: Outcome) {
  // 댓글 작성자 아이디·토큰은 남기지 않는다(댓글 id와 결과만)
  console.log(JSON.stringify({ t: new Date().toISOString(), mode: mode(), dry: dryRun(), ...o, preview: undefined }));
}

export async function handleComment(a: AccountConfig, c: IgComment, ownUsername?: string): Promise<Outcome> {
  const base = { account: a.key, commentId: c.id, mediaId: c.mediaId };
  const store = getStore();
  const author = (c.from?.username || c.username || "").toLowerCase();
  const authorId = c.from?.id;
  const igId = await igUserIdFor(a);
  const own = (ownUsername || a.handle || "").toLowerCase();

  const skip = (reason: string): Outcome => {
    const o: Outcome = { ...base, action: "skip", reason };
    log(o);
    return o;
  };

  if (c.parent_id) return skip("대댓글");
  if ((authorId && authorId === igId) || (own && author === own)) return skip("계정 본인 댓글");
  if (c.timestamp && Date.now() - Date.parse(c.timestamp) > SEVEN_DAYS) return skip("7일 지난 댓글");
  if ((c as any)._replies?.some((r: any) => (r.username || "").toLowerCase() === own)) return skip("이미 답글 있음");

  const m = mode();
  if (m === "off") return skip("AUTODM_MODE=off");
  if (m === "test" && !listEnv("AUTODM_TEST_USERNAMES").includes(author)) return skip("테스트 대상 아님");

  const token = tokenFor(a);
  if (!token) return skip(`토큰 없음(${a.tokenEnv})`);
  const rule = RULES[a.key] ?? {};
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const kws = (rule.keywords ?? []).map(norm).filter(Boolean);
  const keywordHit = kws.length === 0 || kws.some((k) => norm(c.text ?? "").includes(k));
  if (!keywordHit && !rule.nonKeywordReply) return skip("키워드 없음");
  const basePhrases = PHRASES[a.key];
  // 고정 고지 문구가 있으면 무작위 고지 대신 그 문장을 그대로 붙인다
  const phrases = rule.disclosure ? { ...basePhrases, dm: { ...basePhrases.dm, disclosures: [rule.disclosure] } } : basePhrases;
  const link = keywordHit ? linkFor(a, c.mediaId, c.caption) : undefined;

  // 중복 방지: 댓글 하나는 한 번만(30일 기억)
  if (!(await store.claim(`done:${c.id}`, 30 * 24 * 3600))) return skip("이미 처리함");
  const hour = new Date().toISOString().slice(0, 13);
  const max = Number(process.env.AUTODM_MAX_PER_HOUR || 30);
  if ((await store.incr(`rate:${a.key}:${hour}`, 7200)) > max) {
    await store.release(`done:${c.id}`);
    return skip(`시간당 상한 ${max} 초과`);
  }

  const dry = dryRun();
  try {
    let dmFailed = "";
    if (link) {
      // 질문형 댓글: FAQ 답(없으면 '상세 페이지 확인 + 댓글로 답 드릴게요' 문장)을 DM 맨 앞에
      let prefix: string | undefined;
      let question: Outcome["question"];
      if (isQuestion(c.text ?? "")) {
        const ans = faqAnswer(a.key, c.mediaId, c.text ?? "");
        const fb = phrases.dm.questionFallbacks ?? [];
        if (ans) {
          prefix = ans;
          question = "answered";
        } else if (fb.length) {
          prefix = fb[Math.floor(Math.random() * fb.length)];
          question = "unanswered";
        }
      }
      const dm = await pick(store, phrases, "dm", { link }, { prefix });
      try {
        if (!dry) await privateReply(token, igId, c.id, dm.text);
        await commitPick(store, a.key, dm);
        if (question === "unanswered") {
          // 관제가 나중에 댓글로 답할 수 있게 미답변 목록에 남긴다(최근 200건, 30일)
          await store.pushRecent(`unanswered:${a.key}`, JSON.stringify({ commentId: c.id, mediaId: c.mediaId, text: (c.text ?? "").slice(0, 200), at: new Date().toISOString() }), 200);
        }
        const rp = await pick(store, phrases, "reply");
        if (!dry) await replyToComment(token, c.id, rp.text);
        await commitPick(store, a.key, rp);
        const o: Outcome = { ...base, action: "dm+reply", link, question, dmCombo: dm.combo, replyCombo: rp.combo, preview: { dm: dm.text, reply: rp.text } };
        log(o);
        return o;
      } catch (e) {
        if (!(e instanceof GraphError)) throw e;
        dmFailed = `${e.code ?? ""}/${e.subcode ?? ""} ${e.message}`.slice(0, 160);
      }
    }
    const rp = await pick(store, phrases, "replyNoLink");
    if (!dry) await replyToComment(token, c.id, rp.text);
    await commitPick(store, a.key, rp);
    const o: Outcome = {
      ...base,
      action: dmFailed ? "dm-failed+reply-nolink" : "reply-nolink",
      reason: dmFailed || "링크 표에 없는 게시물",
      replyCombo: rp.combo,
      preview: { reply: rp.text },
    };
    log(o);
    return o;
  } catch (e) {
    const o: Outcome = { ...base, action: "error", reason: String((e as Error).message).slice(0, 200) };
    log(o);
    return o;
  }
}
