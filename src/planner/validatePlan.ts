// AI가 만든 기획(JSON)을 규칙에 맞는지 검사한다.
// error가 하나라도 있으면 엔진이 오류 목록을 AI에게 돌려주고 다시 쓰게 한다.

import {
  CONTENT_TYPES,
  PAGE_ROLES,
  LAYOUTS,
  IMAGE_TYPES,
  FACT_CHECK,
  MIN_PAGES,
  MAX_PAGES,
  ITEM_SEPARATOR,
  stripEmphasis,
  type CardnewsPlan,
  type PlanInput,
  type PlanPage,
} from "./types.js";

export interface PlanIssue {
  level: "error" | "warning";
  page?: number;
  field?: string;
  message: string;
}

export const LIMITS = {
  headline: 24,
  subheadline: 40,
  body: 90,
  visual_focus: 12,
  item: 30,
  items: 6,
  cta: 30,
  image_prompt: 300,
  caption: 2200,
} as const;

// 과장/낚시성 표현 (필요 시 추가)
const HYPE_WORDS = ["충격", "무조건", "100%", "대박", "역대급", "미친", "절대 실패", "모르면 손해", "이것만 하면"];
const FORMULA_START_RE = /^[=+\-@]/;
const HOOK_LAYOUTS = ["BIG_TITLE", "BIG_NUMBER", "IMAGE_TEXT", "SCREENSHOT", "PHOTO_COVER"];
const CTA_LAYOUTS = ["CTA", "FOLLOW"];

/** 보이는 글자 수 (강조 표시 ** 제외) */
const len = (s: string) => [...stripEmphasis(s)].length;
const norm = (s: string) => stripEmphasis(s).replace(/\s+/g, "");

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

export function validatePlan(plan: CardnewsPlan, input: PlanInput): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const err = (message: string, page?: number, field?: string) => issues.push({ level: "error", page, field, message });
  const warn = (message: string, page?: number, field?: string) => issues.push({ level: "warning", page, field, message });

  // ---- 기획 전체 ----
  for (const f of ["category", "target", "planning_note", "caption", "hashtags"] as const) {
    if (!isStr(plan[f]) || plan[f].trim() === "") err("값이 비어 있거나 문자열이 아님", undefined, f);
  }
  if (!(plan.content_type in CONTENT_TYPES)) err(`허용되지 않은 content_type '${plan.content_type}'`, undefined, "content_type");
  if (!Array.isArray(plan.pages)) {
    err("pages가 배열이 아님", undefined, "pages");
    return issues;
  }
  const n = plan.pages.length;
  if (n < MIN_PAGES || n > MAX_PAGES) err(`카드 장수 ${n}장 - ${MIN_PAGES}~${MAX_PAGES}장이어야 함`, undefined, "pages");
  if (plan.page_count !== n) err(`page_count(${plan.page_count})와 실제 pages 수(${n})가 다름`, undefined, "page_count");
  if (isStr(plan.caption) && len(plan.caption) > LIMITS.caption) err(`caption 글자 수 초과 (${len(plan.caption)}/${LIMITS.caption})`, undefined, "caption");
  if (isStr(plan.hashtags) && plan.hashtags.trim()) {
    const bad = plan.hashtags.trim().split(/\s+/).filter((t) => !/^#[^\s#,]+$/.test(t));
    if (bad.length) err(`해시태그 형식 오류: ${bad.join(" ")} (공백 구분, 각 태그는 #으로 시작)`, undefined, "hashtags");
  }

  // ---- 페이지별 ----
  const hasReference = !!input.reference?.trim();
  plan.pages.forEach((p, idx) => validatePage(p, idx, n, hasReference, err, warn));

  // ---- 페이지 사이 규칙 ----
  if (n > 0) {
    if (plan.pages[0]?.page_role !== "HOOK") err("첫 페이지 page_role은 HOOK이어야 함", 1, "page_role");
    if (plan.pages[n - 1]?.page_role !== "CTA") err("마지막 페이지 page_role은 CTA여야 함", n, "page_role");
  }
  for (const f of ["headline", "body"] as const) {
    const seen = new Map<string, number>();
    plan.pages.forEach((p) => {
      if (!isStr(p[f]) || !p[f].trim()) return;
      const key = norm(p[f]);
      const prev = seen.get(key);
      if (prev) err(`${prev}페이지와 ${f}가 같음 (페이지 간 반복 금지)`, p.page_number, f);
      else seen.set(key, p.page_number);
    });
  }
  // 레이아웃 반복
  for (let i = 1; i < n; i++) {
    const a = plan.pages[i - 1];
    const b = plan.pages[i];
    if (a.layout_type === b.layout_type) warn(`${a.page_number}페이지와 연속으로 같은 레이아웃 ${b.layout_type}`, b.page_number, "layout_type");
  }
  const counts = new Map<string, number>();
  plan.pages.forEach((p) => counts.set(p.layout_type, (counts.get(p.layout_type) ?? 0) + 1));
  for (const [layout, c] of counts) {
    if (c > Math.ceil(n / 2)) err(`레이아웃 ${layout}가 ${c}/${n}장에 쓰임 - 절반 이하로`, undefined, "layout_type");
  }
  // 이미지를 모든 카드에 억지로 넣지 않는다
  const withImage = plan.pages.filter((p) => p.image_required === true).length;
  if (n > 0 && withImage === n) err("모든 페이지에 이미지가 지정됨 - 꼭 필요한 페이지에만", undefined, "image_required");
  // 참고자료가 없으면 GRAPH/CHART 불가 (수치를 만들어낼 위험)
  if (!hasReference) {
    plan.pages.forEach((p) => {
      if (p.layout_type === "GRAPH" || p.image_type === "GRAPH" || p.image_type === "CHART") {
        err("참고자료 없이 그래프/차트 사용 불가 (수치를 만들어낼 수 없음)", p.page_number, "layout_type");
      }
    });
  }
  return issues;
}

function validatePage(
  p: PlanPage,
  idx: number,
  n: number,
  hasReference: boolean,
  err: (m: string, page?: number, field?: string) => void,
  warn: (m: string, page?: number, field?: string) => void,
) {
  const pg = idx + 1;
  if (p.page_number !== pg) err(`page_number가 ${p.page_number} - 1부터 순서대로 ${pg}이어야 함`, pg, "page_number");

  const strFields = ["headline", "subheadline", "body", "visual_focus", "image_type", "image_source", "image_prompt", "cta", "source"] as const;
  for (const f of strFields) {
    if (!isStr(p[f])) {
      err("문자열이어야 함 (없으면 빈 문자열)", pg, f);
      continue;
    }
    if (/[\r\n]/.test(p[f])) err("줄바꿈 금지 - 한 줄로", pg, f);
    if (FORMULA_START_RE.test(p[f])) err("=, +, -, @ 로 시작하면 시트가 수식으로 해석함", pg, f);
    if (p[f] !== p[f].trim()) warn("앞뒤 공백", pg, f);
    if ((p[f].match(/\*\*/g) ?? []).length % 2 !== 0) err("강조 표시 **가 짝이 맞지 않음", pg, f);
    if ((p[f].match(/\*\*[^*]+\*\*/g) ?? []).length > 2) err("한 칸에 강조(**)는 2곳까지", pg, f);
  }
  if (!Array.isArray(p.items) || !p.items.every(isStr)) {
    err("items는 문자열 배열이어야 함 (없으면 [])", pg, "items");
    p = { ...p, items: [] };
  }
  if (typeof p.image_required !== "boolean") err("image_required는 true/false", pg, "image_required");

  if (!(p.page_role in PAGE_ROLES)) err(`허용되지 않은 page_role '${p.page_role}'`, pg, "page_role");
  if (!(p.layout_type in LAYOUTS)) err(`허용되지 않은 layout_type '${p.layout_type}'`, pg, "layout_type");
  if (!(p.fact_check in FACT_CHECK)) err(`허용되지 않은 fact_check '${p.fact_check}'`, pg, "fact_check");

  if (!isStr(p.headline) || !p.headline.trim()) err("headline 필수", pg, "headline");
  for (const [f, max] of [["headline", LIMITS.headline], ["subheadline", LIMITS.subheadline], ["body", LIMITS.body], ["visual_focus", LIMITS.visual_focus], ["cta", LIMITS.cta], ["image_prompt", LIMITS.image_prompt]] as const) {
    if (isStr(p[f]) && len(p[f]) > max) err(`글자 수 초과 (${len(p[f])}/${max})`, pg, f);
  }
  if (p.items.length > LIMITS.items) err(`items ${p.items.length}개 - 최대 ${LIMITS.items}개`, pg, "items");
  p.items.forEach((it, i) => {
    if (len(it) > LIMITS.item) err(`items[${i}] 글자 수 초과 (${len(it)}/${LIMITS.item})`, pg, "items");
    if (it.includes(ITEM_SEPARATOR.trim())) err(`items[${i}]에 구분자 '${ITEM_SEPARATOR.trim()}' 사용 불가`, pg, "items");
    if (!it.trim()) err(`items[${i}] 비어 있음`, pg, "items");
    if ((it.match(/\*\*/g) ?? []).length % 2 !== 0) err(`items[${i}] 강조 표시 **가 짝이 맞지 않음`, pg, "items");
  });

  const text = [p.headline, p.subheadline, p.body, ...p.items].filter(isStr).join(" ");
  for (const w of HYPE_WORDS) {
    if (text.includes(w)) err(`과장/낚시성 표현 '${w}'`, pg, "headline");
  }

  // visual_focus는 페이지 안의 문구에서 뽑아야 한다 (새 숫자/문구를 만들지 않음)
  if (isStr(p.visual_focus) && p.visual_focus.trim()) {
    if (!norm(text).includes(norm(p.visual_focus))) err(`visual_focus '${p.visual_focus}'가 이 페이지 문구 안에 없음`, pg, "visual_focus");
  } else if (p.layout_type === "BIG_NUMBER" || p.layout_type === "RESULT") {
    err(`${p.layout_type} 레이아웃은 visual_focus 필수`, pg, "visual_focus");
  }

  // 역할 ↔ 레이아웃
  if (p.page_role === "HOOK" && !HOOK_LAYOUTS.includes(p.layout_type)) err(`HOOK 페이지 레이아웃은 ${HOOK_LAYOUTS.join("/")} 중 하나`, pg, "layout_type");
  if (CTA_LAYOUTS.includes(p.layout_type) !== (p.page_role === "CTA")) err("CTA/FOLLOW 레이아웃은 CTA 페이지에만, CTA 페이지는 CTA 또는 FOLLOW 레이아웃", pg, "layout_type");
  if (p.page_role === "CTA" && (!isStr(p.cta) || !p.cta.trim())) err("CTA 페이지는 cta 필수", pg, "cta");
  if (p.page_role !== "CTA" && isStr(p.cta) && p.cta.trim()) err("cta는 CTA 페이지에만", pg, "cta");
  if (pg !== 1 && p.page_role === "HOOK") err("HOOK은 첫 페이지에만", pg, "page_role");
  if (pg !== n && p.page_role === "CTA") err("CTA는 마지막 페이지에만", pg, "page_role");

  // 레이아웃 ↔ 내용
  const need = (min: number, max = Infinity) => p.items.length >= min && p.items.length <= max;
  if (p.layout_type === "BIG_NUMBER" && !/\d/.test(p.visual_focus ?? "")) err("BIG_NUMBER는 숫자가 들어간 visual_focus 필요", pg, "visual_focus");
  if (p.layout_type === "NUMBER_LIST" && !need(2)) err("NUMBER_LIST는 items 2개 이상", pg, "items");
  if (p.layout_type === "THREE_COLUMN" && !need(3, 3)) err("THREE_COLUMN은 items 정확히 3개", pg, "items");
  if (p.layout_type === "GRID" && !need(4)) err("GRID는 items 4개 이상", pg, "items");
  if (p.layout_type === "COMPARE" && !need(2)) err("COMPARE는 items 2개 이상", pg, "items");
  if (p.layout_type === "TIMELINE" && !need(3)) err("TIMELINE은 items 3개 이상", pg, "items");
  if (p.layout_type === "IMAGE_TEXT" && p.image_required !== true) err("IMAGE_TEXT는 image_required=true", pg, "image_required");
  if (p.layout_type === "SCREENSHOT" && (p.image_required !== true || p.image_type !== "SCREENSHOT")) err("SCREENSHOT 레이아웃은 image_type=SCREENSHOT", pg, "image_type");
  if (p.layout_type === "GRAPH" && !(p.image_type === "GRAPH" || p.image_type === "CHART")) err("GRAPH 레이아웃은 image_type=GRAPH 또는 CHART", pg, "image_type");
  if (p.layout_type === "PHOTO_COVER" && (p.image_required !== true || !(p.image_type === "PHOTO" || p.image_type === "AI_IMAGE"))) err("PHOTO_COVER는 image_required=true, image_type PHOTO 또는 AI_IMAGE", pg, "image_type");

  // 이미지
  if (p.image_required === true) {
    if (!(IMAGE_TYPES as readonly string[]).includes(p.image_type)) err(`image_required=true면 image_type 필수 (${IMAGE_TYPES.join("/")})`, pg, "image_type");
    if (p.image_type === "AI_IMAGE" && !p.image_prompt?.trim()) err("AI_IMAGE는 image_prompt 필수", pg, "image_prompt");
  } else if (p.image_required === false) {
    if (p.image_type || p.image_prompt || p.image_source) err("image_required=false면 image_type/image_prompt/image_source는 빈 값", pg, "image_type");
  }

  // 사실 확인
  if (p.fact_check === "REFERENCE") {
    if (!hasReference) err("참고자료가 없는데 fact_check=REFERENCE", pg, "fact_check");
    if (!p.source?.trim()) err("fact_check=REFERENCE면 source 필수", pg, "source");
  }
  if (p.fact_check === "NEEDS_CHECK") warn("사람의 사실 확인 필요", pg, "fact_check");
}

/** 기획 JSON에서 오류만 사람이 읽기 좋은 문자열로 */
export function formatIssues(issues: PlanIssue[]): string {
  return issues
    .map((i) => `${i.level === "error" ? "ERROR" : "WARN"} ${i.page ? `p${i.page} ` : ""}${i.field ? `${i.field}: ` : ""}${i.message}`)
    .join("\n");
}
