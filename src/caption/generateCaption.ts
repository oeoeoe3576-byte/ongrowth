// 5. Caption Generator (지시사항 20, 21)
// 구조: 첫 줄 후킹 → 짧은 소개 → 장소 목록 → 저장 CTA → 팔로우 CTA → 해시태그
// AI 느낌 나는 장문은 피하고, 설정(config.yaml)으로 말투/CTA/해시태그 개수/이모지 여부를 조정한다.

import type { CardnewsContent } from "../types.js";
import { loadConfig } from "../config.js";
import { polishText } from "../llm.js";

function linebreak(style: "single" | "double"): string {
  return style === "double" ? "\n\n" : "\n";
}

function defaultHook(content: CardnewsContent, useEmoji: boolean): string {
  const emoji = useEmoji ? " 🧳" : "";
  return `${content.region} 간다면 여기부터 저장하세요${emoji}`;
}

function buildHashtags(content: CardnewsContent, count: number): string[] {
    const base = new Set<string>();
  const regionTokens = content.region.replace(/\s+/g, "");
  base.add(`#${regionTokens}`);
  base.add(`#${regionTokens}여행`);
  base.add("#국내여행");
  base.add("#국내여행지추천");
  base.add("#주말여행");
  base.add("#당일치기여행");
  for (const p of content.places) {
    base.add(`#${p.place_name.replace(/\s+/g, "")}`);
  }
  if (content.region.includes("바다") || content.places.some((p) => p.category === "바다")) base.add("#바다여행");
  return Array.from(base).slice(0, count);
}

export interface GenerateCaptionOptions {
  brandAccount?: string;
  followCta?: string;
}

export async function generateCaption(content: CardnewsContent, opts?: GenerateCaptionOptions): Promise<string> {
  const cfg = loadConfig();
  const useEmoji = cfg.caption.use_emoji;
  const br = linebreak(cfg.caption.linebreak_style);

  let hook = defaultHook(content, useEmoji);
  const hookPrompt =
    `인스타그램 카드뉴스 캡션의 첫 줄(후킹 문장)을 1개만 만들어줘. 25자 이내, 과장/AI 말투 금지, ` +
    `${useEmoji ? "이모지 1개까지 허용" : "이모지 사용 금지"}.\n주제: ${content.topic}\n지역: ${content.region}\n` +
    `응답은 문장 하나만.`;
  const polished = await polishText(hookPrompt, 60);
  if (polished) hook = polished.replace(/^["']|["']$/g, "").split("\n")[0];

  const intro = `${content.region}에서 꼭 들러야 할 곳만 골랐어요.`;

  const placeLines = content.places.map((p, i) => `${i + 1}. ${p.place_name} — ${p.region}`).join("\n");

  const saveCta = cfg.brand.default_cta;
  const followCta = opts?.followCta ?? cfg.brand.follow_cta;

  const hashtags = buildHashtags(content, cfg.caption.hashtag_count).join(" ");

  const parts = [hook, intro, placeLines, saveCta, followCta, hashtags];
  return parts.filter(Boolean).join(br).trim() + "\n";
}
