// 1. Research 모듈 - 조사 결과 검증 헬퍼
// Claude Skill(자연어 오케스트레이션 레이어)이 WebSearch/WebFetch로 조사한 원시 정보를
// Place 스키마로 정규화할 때 쓰는 헬퍼. 실제 웹 조사 자체는 이 라이브러리가 하지 않는다
// (Node 런타임에는 웹 검색 도구가 없으므로) - .claude/skills/.../SKILL.md 참고.

import type { Place } from "../types.js";
import { validatePlace, isUsable } from "./placeSchema.js";

export interface RawResearchInput {
  place_name: string;
  region: string;
  address?: string;
  category: Place["category"];
  description: string;
  opening_hours?: string;
  price?: string;
  parking?: string;
  recommended_season?: string;
  rating?: number;
  status?: Place["status"];
  source: string; // 지시사항 5의 신뢰 출처 (한국관광공사/대한민국 구석구석/지자체/공식 홈페이지 등)
}

/** place_id를 결정론적으로 만든다 (이름+지역 기반, 중복 저장 시 upsert가 되도록). */
export function makePlaceId(name: string, region: string): string {
  const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  return `${norm(region)}-${norm(name)}`;
}

/**
 * 조사 원본 → Place 레코드로 변환. source/address 등 핵심 사실 확인 필드가 비어 있으면
 * 자동으로 verification_required로 표시되고(placeSchema.validatePlace), 카드뉴스 후보에서 제외된다.
 */
export function toVerifiedPlace(raw: RawResearchInput, checkedAt = new Date().toISOString()): Place {
  const candidate: Place = {
    place_id: makePlaceId(raw.place_name, raw.region),
    place_name: raw.place_name,
    region: raw.region,
    address: raw.address ?? "",
    category: raw.category,
    description: raw.description,
    opening_hours: raw.opening_hours ?? "",
    price: raw.price ?? "",
    parking: raw.parking ?? "",
    recommended_season: raw.recommended_season ?? "",
    rating: raw.rating,
    status: raw.status ?? "open",
    source: raw.source,
    checked_at: checkedAt,
    verification: "verified", // validatePlace가 필드 누락 시 다시 내림
  };
  return validatePlace(candidate).place;
}

export { isUsable };
