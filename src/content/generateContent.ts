// 2. Content Generator
// 주제 + (검증된) 장소 목록 → content.json (지시사항 6, 8)
// 텍스트 카피는 가능하면 Claude API로 다듬되, 없거나 실패하면 결정론적 규칙 기반 문구로 항상 완주한다.

import { v4 as uuid } from "uuid";
import type { CardnewsContent, CardnewsSlide, Place } from "../types.js";
import { loadConfig } from "../config.js";
import { filterEligiblePlaces, rankBySeason } from "./placeRules.js";
import { polishText } from "../llm.js";

export interface GenerateContentParams {
  topic: string; // 예: "평창 가을 여행지 5곳"
  region: string; // 예: "강원 평창"
  season?: string; // 예: "가을"
  candidatePlaces: Place[]; // research 라이브러리에서 뽑아온 후보 (미검증 필터링 전)
  slideCount?: number; // 기본 7 (config)
  template?: string;
  cta?: string;
}

function truncateForMobile(text: string, maxChars = 60): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars - 1).trimEnd() + "…";
}

function defaultHeadline(topic: string): { headline: string; subheadline: string } {
  return {
    headline: topic,
    subheadline: "저장해두고 하나씩 다녀와도 좋은 코스",
  };
}

function defaultPlaceDescription(p: Place): string {
  const sentence = p.description.split(/(?<=[.!?])\s/)[0] || p.description;
  return truncateForMobile(sentence, 70);
}

export async function generateContent(params: GenerateContentParams): Promise<CardnewsContent> {
  const cfg = loadConfig();
  const slideCount = params.slideCount ?? cfg.cardnews.slide_count;
  const placeSlideCount = Math.max(1, slideCount - 2); // 표지 1장 + CTA 1장 제외
  const template = params.template ?? cfg.cardnews.template;
  const cta = params.cta ?? cfg.brand.default_cta;

  const eligible = filterEligiblePlaces(params.candidatePlaces);
  const ranked = rankBySeason(eligible, params.season);
  const chosen = ranked.slice(0, placeSlideCount);

  if (chosen.length === 0) {
    throw new Error(
      `선정 가능한 장소가 없습니다 (region="${params.region}", season="${params.season ?? ""}"). ` +
        `data/places/ 에 검증된 장소를 먼저 등록해주세요 (verification_required 상태는 자동 제외됩니다).`
    );
  }

  // 표지 문구
  let headline = params.topic;
  let subheadline = "저장해두고 하나씩 다녀와도 좋은 코스";
  const coverPrompt =
    `아래 카드뉴스 표지 문구를 만들어줘. 국내여행 인스타그램 카드뉴스용이고, 과장/AI 말투 없이 담백하게.\n` +
    `주제: ${params.topic}\n지역: ${params.region}\n소개 장소: ${chosen.map((p) => p.place_name).join(", ")}\n` +
    `형식(정확히 이 형식으로만 응답):\nHEADLINE: <15자 내외 메인 제목>\nSUB: <20자 내외 서브카피>`;
  const polished = await polishText(coverPrompt, 200);
  if (polished) {
    const h = polished.match(/HEADLINE:\s*(.+)/)?.[1]?.trim();
    const s = polished.match(/SUB:\s*(.+)/)?.[1]?.trim();
    if (h) headline = h;
    if (s) subheadline = s;
  } else {
    const d = defaultHeadline(params.topic);
    headline = d.headline;
    subheadline = d.subheadline;
  }

  const slides: CardnewsSlide[] = [];
  slides.push({
    index: 1,
    type: "cover",
    headline: truncateForMobile(headline, 26),
    subheadline: truncateForMobile(subheadline, 34),
  });

  let i = 2;
  for (const place of chosen) {
    let description = defaultPlaceDescription(place);
    const placePrompt =
      `국내여행 카드뉴스 한 페이지에 들어갈 소개 문구를 1문장(20~35자)으로 써줘. 과장/이모지 남발 금지.\n` +
      `장소: ${place.place_name}\n설명: ${place.description}\n추천 포인트가 드러나게.`;
    const polishedDesc = await polishText(placePrompt, 120);
    if (polishedDesc) description = truncateForMobile(polishedDesc.replace(/^["']|["']$/g, ""), 70);

    slides.push({
      index: i,
      type: "place",
      place_id: place.place_id,
      place_name: place.place_name,
      region: place.region,
      description,
      extra: {
        address: place.address,
        opening_hours: place.opening_hours,
        price: place.price,
        parking: place.parking,
      },
    });
    i++;
  }

  slides.push({
    index: i,
    type: "cta",
    headline: `${params.region} 여행, 저장해두고 꺼내보세요.`,
    subheadline: `${cfg.brand.follow_cta}`,
  });

  const content: CardnewsContent = {
    content_id: uuid(),
    title: params.topic,
    topic: params.topic,
    region: params.region,
    template,
    slide_count: slides.length,
    cta,
    created_at: new Date().toISOString(),
    places: chosen,
    slides,
  };

  return content;
}
