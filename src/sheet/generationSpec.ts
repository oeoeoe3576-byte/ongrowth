// 카드뉴스 원고 생성 구조 (AI 연결 전 단계).
// - 이번 단계에서는 LLM을 호출하지 않는다. 프롬프트와 출력 형식, 출력 → 시트 행 변환만 정의한다.
// - 다음 단계에서 llm.ts 등으로 buildGenerationPrompt() 결과를 보내고,
//   응답 JSON을 draftToRow()에 넣으면 바로 시트 1행이 된다.

import { COLUMNS, PAGE_ROLES, CONTENT_TYPE_VALUES, type CardnewsRow } from "./schema.js";

/** 사람이 입력하는 값 (주제 입력 단계) */
export interface GenerationInput {
  topic: string;
  brand: string;
  template_key: string;
  category: string;
  content_type: (typeof CONTENT_TYPE_VALUES)[number];
  target: string;
  /** 사실 근거로 사용할 자료. 없으면 일반적인 방법/원칙 수준으로만 작성하게 한다 */
  reference_material?: string;
}

/** AI가 채우는 값 = 카드 컬럼 + caption/hashtags + source_notes */
export const AI_OUTPUT_FIELDS: readonly string[] = COLUMNS.filter(
  (c) => c.group === "card" || c.group === "publish" || c.name === "source_notes",
).map((c) => c.name);

export type CardnewsDraft = Record<string, string>;

export const WRITING_RULES = [
  "긴 글을 단순히 7등분하지 않는다. 페이지마다 역할이 다르다.",
  "첫 페이지는 읽는 사람이 얻는 핵심 이점을 명확하게 전달해 스크롤을 멈추게 한다.",
  "지나친 낚시성 표현(충격, 무조건, 100% 등 과장)은 사용하지 않는다.",
  "한 페이지에는 한 가지 메시지만 담는다.",
  "모바일에서 빠르게 읽히도록 제목과 본문을 짧게 쓴다. 각 필드의 최대 글자 수를 지킨다.",
  "같은 내용을 여러 페이지에서 반복하지 않는다.",
  "2~6페이지는 앞뒤 내용이 자연스럽게 이어지도록 쓴다.",
  "마지막 페이지에는 내용에 맞는 CTA를 쓴다.",
  "사실 확인이 필요한 수치, 통계, 날짜, 가격, 고유 정보는 제공된 자료에 있을 때만 쓴다. 임의로 만들지 않는다.",
  "정보가 부족하면 추측하지 말고 source_notes에 '정보 부족: <무엇이 필요한지>'를 적고 해당 내용은 쓰지 않는다.",
  "모든 필드는 한 줄로 쓴다 (줄바꿈 금지). =, +, -, @ 로 시작하지 않는다.",
] as const;

function fieldSpecLines(): string[] {
  return COLUMNS.filter((c) => AI_OUTPUT_FIELDS.includes(c.name)).map((c) => {
    const limit = c.maxLength ? ` (최대 ${c.maxLength}자)` : "";
    const page = c.page ? `[${c.page}p] ` : "";
    return `- ${c.name}: ${page}${c.description}${limit}`;
  });
}

export function buildGenerationPrompt(input: GenerationInput): { system: string; user: string } {
  const roles = Object.entries(PAGE_ROLES).map(([p, role]) => `- ${p}페이지: ${role}`);
  const system = [
    "너는 SNS 카드뉴스(7장) 원고 작성자다. 분야는 입력으로 주어진다.",
    "",
    "[페이지 역할]",
    ...roles,
    "",
    "[작성 규칙]",
    ...WRITING_RULES.map((r, i) => `${i + 1}. ${r}`),
    "",
    "[출력 형식]",
    "아래 키만 가진 JSON 객체 하나만 출력한다. 모든 값은 문자열이다.",
    ...fieldSpecLines(),
  ].join("\n");

  const user = [
    `주제: ${input.topic}`,
    `분야: ${input.category}`,
    `구성 방식: ${input.content_type}`,
    `대상 독자: ${input.target}`,
    "",
    "[참고 자료]",
    input.reference_material?.trim() || "없음 - 사실 정보(수치/날짜/가격/고유 정보)는 쓰지 말 것",
  ].join("\n");

  return { system, user };
}

/** AI 출력(JSON) + 입력값 → 시트 1행. 누락/초과 키는 예외로 알린다. */
export function draftToRow(draft: CardnewsDraft, input: GenerationInput, meta: { content_id: string; created_at: string }): CardnewsRow {
  const missing = AI_OUTPUT_FIELDS.filter((f) => typeof draft[f] !== "string");
  const extra = Object.keys(draft).filter((k) => !AI_OUTPUT_FIELDS.includes(k));
  if (missing.length || extra.length) {
    throw new Error(`AI 출력 형식 오류. 누락: [${missing.join(", ")}] 초과: [${extra.join(", ")}]`);
  }
  const row: CardnewsRow = {
    content_id: meta.content_id,
    brand: input.brand,
    template_key: input.template_key,
    topic: input.topic,
    category: input.category,
    content_type: input.content_type,
    target: input.target,
    status: "draft",
    created_at: meta.created_at,
  };
  for (const f of AI_OUTPUT_FIELDS) row[f] = draft[f].trim();
  // 컬럼 순서를 스키마 순서로 고정
  return Object.fromEntries(COLUMNS.map((c) => [c.name, row[c.name] ?? ""]));
}
