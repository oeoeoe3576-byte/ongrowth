// 문구 조합: 인사말 i × 본문 j × 마무리 k 를 무작위로 고르고,
// 같은 계정·같은 종류에서 최근 50건에 쓴 (i,j,k) 조합은 다시 쓰지 않는다.

import type { Store } from "./store.js";

export interface PhraseSet {
  account: string;
  handle?: string;
  language?: string;
  toneSource?: string;
  dm: { greetings: string[]; bodies: string[]; closings: string[]; disclosures?: string[]; questionFallbacks?: string[] };
  reply: { greetings: string[]; bodies: string[]; closings: string[] };
  replyNoLink: { bodies: string[] };
  pinned: string[];
}

export type Kind = "dm" | "reply" | "replyNoLink" | "pinned";
export const RECENT_KEEP = 50;

function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}

function partsFor(p: PhraseSet, kind: Kind): string[][] {
  switch (kind) {
    case "dm":
      return [p.dm.greetings, p.dm.bodies, p.dm.closings];
    case "reply":
      return [p.reply.greetings, p.reply.bodies, p.reply.closings];
    case "replyNoLink":
      // 인사말·마무리는 공개 답글 것을 같이 쓰고 본문만 '프로필 링크' 안내로 바꾼다.
      return [p.reply.greetings, p.replyNoLink.bodies, p.reply.closings];
    case "pinned":
      return [p.pinned];
  }
}

export interface Picked {
  kind: Kind;
  combo: string; // "3-11-7"
  text: string;
}

/** 최근 50건과 겹치지 않는 조합을 고른다. 저장은 commitPick에서 한다(실제 발송 성공 후). */
export async function pick(
  store: Store,
  p: PhraseSet,
  kind: Kind,
  vars: Record<string, string> = {},
  opts: { prefix?: string } = {},
): Promise<Picked> {
  const parts = partsFor(p, kind);
  const listKey = `recent:${p.account}:${kind}`;
  const recent = new Set(await store.recent(listKey));
  const total = parts.reduce((a, l) => a * l.length, 1);
  let idx: number[] = [];
  for (let t = 0; t < 500; t++) {
    idx = parts.map((l) => rnd(l.length));
    if (!recent.has(idx.join("-"))) break;
    // 조합 수가 50 이하(고정 댓글 등)면 '가장 오래전에 쓴 것'이 될 때까지 재시도하다 마지막 값을 쓴다
    if (total <= recent.size && t > 50) break;
  }
  // prefix(질문 답)가 있으면 인사말 대신 그 답으로 시작한다
  let text = parts
    .map((l, i) => (opts.prefix && kind === "dm" && i === 0 ? opts.prefix : l[idx[i]].trim()))
    .filter(Boolean)
    .join(kind === "dm" ? "\n\n" : " ");
  for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(v);
  if (kind === "dm" && p.dm.disclosures?.length) {
    text += "\n\n" + p.dm.disclosures[rnd(p.dm.disclosures.length)];
  }
  return { kind, combo: idx.join("-"), text };
}

export async function commitPick(store: Store, account: string, picked: Picked): Promise<void> {
  await store.pushRecent(`recent:${account}:${picked.kind}`, picked.combo, RECENT_KEEP);
}

/** 문구 파일 검사: 개수, 중복, {link} */
export function validatePhrases(p: PhraseSet): string[] {
  const errs: string[] = [];
  const need = (name: string, arr: string[] | undefined, min: number) => {
    if (!arr || arr.length < min) errs.push(`${p.account}: ${name} ${arr?.length ?? 0}개 (최소 ${min})`);
  };
  need("dm.greetings", p.dm?.greetings, 15);
  need("dm.bodies", p.dm?.bodies, 15);
  need("dm.closings", p.dm?.closings, 15);
  need("reply.greetings", p.reply?.greetings, 15);
  need("reply.bodies", p.reply?.bodies, 15);
  need("reply.closings", p.reply?.closings, 15);
  need("replyNoLink.bodies", p.replyNoLink?.bodies, 15);
  need("pinned", p.pinned, 10);
  for (const b of p.dm?.bodies ?? []) {
    if (b.split("{link}").length !== 2) errs.push(`${p.account}: dm.bodies에 {link}가 정확히 1번이 아님 → ${b.slice(0, 30)}`);
  }
  const all = [
    ...(p.dm?.greetings ?? []), ...(p.dm?.bodies ?? []), ...(p.dm?.closings ?? []),
    ...(p.reply?.greetings ?? []), ...(p.reply?.bodies ?? []), ...(p.reply?.closings ?? []),
    ...(p.replyNoLink?.bodies ?? []), ...(p.pinned ?? []),
  ];
  const seen = new Set<string>();
  for (const s of all) {
    if (seen.has(s)) errs.push(`${p.account}: 같은 문장 중복 → ${s.slice(0, 30)}`);
    seen.add(s);
    if (/\{(?!link\})[^}]*\}/.test(s)) errs.push(`${p.account}: 알 수 없는 자리표시자 → ${s.slice(0, 30)}`);
  }
  return errs;
}
