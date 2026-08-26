// 2. Content Generator - 장소 선정 기준 (지시사항 7)
import type { Place } from "../types.js";
import { isUsable } from "../research/placeSchema.js";
import { loadConfig } from "../config.js";

export interface PlaceRuleOptions {
  minimumRating?: number;
  excludeTemporarilyClosed?: boolean;
  excludePermanentlyClosed?: boolean;
}

/**
 * 카드뉴스에 소개할 장소를 걸러낸다.
 * - 맛집/카페: 평점이 기준(minimum_rating) 미만이면 제외 (플랫폼마다 평점 체계가 다르므로 설정값으로 관리)
 * - 관광지/그 외 카테고리: 평점 기준을 적용하지 않고 실제 존재 여부·운영 여부·계절 적합성을 우선한다
 */
export function filterEligiblePlaces(places: Place[], opts?: PlaceRuleOptions): Place[] {
  const cfg = loadConfig().place_rules;
  const minRating = opts?.minimumRating ?? cfg.minimum_rating;
  const excludeTemp = opts?.excludeTemporarilyClosed ?? cfg.exclude_temporarily_closed;
  const excludePerm = opts?.excludePermanentlyClosed ?? cfg.exclude_permanently_closed;

  const ratedCategories = new Set(["맛집", "카페"]);

  return places.filter((p) => {
    if (!isUsable(p, { excludeTemporarilyClosed: excludeTemp, excludePermanentlyClosed: excludePerm })) {
      return false;
    }
    if (ratedCategories.has(p.category)) {
      if (typeof p.rating !== "number" || p.rating < minRating) return false;
    }
    return true;
  });
}

/** 계절 키워드로 우선순위를 매긴다 (완전 배제하지 않고 정렬만 — 관광지는 계절 적합성을 "우선"할 뿐 필수는 아님). */
export function rankBySeason(places: Place[], season?: string): Place[] {
  if (!season) return places;
  return [...places].sort((a, b) => {
    const aMatch = a.recommended_season.includes(season) ? 1 : 0;
    const bMatch = b.recommended_season.includes(season) ? 1 : 0;
    return bMatch - aMatch;
  });
}
