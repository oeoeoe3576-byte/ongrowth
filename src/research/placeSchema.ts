// 1. Research 모듈 - 장소 스키마 검증
// 지시사항 5: "잘못된 장소명이나 존재하지 않는 관광지를 만들어내지 마라.
//             정보 확인이 불가능하면 해당 장소를 제외하거나 verification_required 상태로 처리한다."

import type { Place } from "../types.js";

const REQUIRED_FIELDS: (keyof Place)[] = [
  "place_name",
  "region",
  "address",
  "category",
  "description",
  "source",
  "checked_at",
];

export interface PlaceValidationResult {
  ok: boolean;
  missingFields: string[];
  place: Place;
}

/**
 * 장소 레코드가 최소한의 사실 확인 요건을 갖췄는지 검사한다.
 * 필수 필드가 비어있으면 verification_required로 강제 전환한다 (하드 실패시키지 않고,
 * 이후 place_rules 필터에서 제외되도록 상태만 남긴다).
 */
export function validatePlace(input: Place): PlaceValidationResult {
  const missingFields = REQUIRED_FIELDS.filter((f) => {
    const v = input[f];
    return v === undefined || v === null || String(v).trim() === "";
  });

  const place: Place = { ...input };
  if (missingFields.length > 0) {
    place.verification = "verification_required";
  }
  return { ok: missingFields.length === 0, missingFields, place };
}

/** verification_required 상태이거나 폐업/임시휴업인 장소는 카드뉴스에서 기본적으로 제외한다. */
export function isUsable(place: Place, opts?: { excludeTemporarilyClosed?: boolean; excludePermanentlyClosed?: boolean }): boolean {
  if (place.verification !== "verified") return false;
  const excludeTemp = opts?.excludeTemporarilyClosed ?? true;
  const excludePerm = opts?.excludePermanentlyClosed ?? true;
  if (excludeTemp && place.status === "temporarily_closed") return false;
  if (excludePerm && place.status === "permanently_closed") return false;
  return true;
}
