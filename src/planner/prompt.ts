// 기획 엔진 프롬프트. 허용 값/글자 수는 types.ts, validatePlan.ts에서 가져와 한 곳에서만 관리한다.

import { CONTENT_TYPES, PAGE_ROLES, LAYOUTS, IMAGE_TYPES, FACT_CHECK, OBJECTIVES, MIN_PAGES, MAX_PAGES, type PlanInput } from "./types.js";
import { LIMITS } from "./validatePlan.js";

const list = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `- ${k}: ${v}`).join("\n");

export const PLANNER_RULES = [
  "긴 글을 단순히 여러 장으로 나누지 않는다. 먼저 전달 구조를 정하고 페이지마다 역할을 준다.",
  "한 카드에는 핵심 메시지 하나를 우선한다.",
  "첫 페이지(HOOK)는 읽는 사람이 얻는 것을 분명하게 보여준다. 과장/낚시성 표현(충격, 무조건, 100%, 대박, 역대급 등)은 쓰지 않는다.",
  "페이지 간 내용이 자연스럽게 이어지게 하고, 같은 내용을 반복하지 않는다.",
  "모바일에서 빠르게 읽히도록 문장을 짧게 쓴다. 글자 수 한도를 지킨다.",
  "모든 카드에 이미지를 넣지 않는다. 이미지가 내용 이해를 실제로 돕는 페이지에만 image_required=true.",
  "핵심 숫자/결과/키워드가 있으면 visual_focus로 뽑는다. visual_focus는 반드시 그 페이지의 headline/subheadline/body/items 안에 있는 문구 그대로여야 한다. 없으면 빈 문자열.",
  "사실 확인이 필요한 수치, 통계, 가격, 날짜, 고유 정보는 참고자료에 있을 때만 쓴다. 임의로 만들지 않는다.",
  "참고자료가 있으면 참고자료를 우선 사용하고, 그 내용을 쓴 페이지는 fact_check=REFERENCE, source에 근거 위치를 적는다.",
  "정보가 부족하면 추측해서 사실처럼 쓰지 않는다. 일반적인 방법/원칙으로만 쓰거나 fact_check=NEEDS_CHECK로 표시한다.",
  "같은 레이아웃을 연속으로 쓰지 않고, 한 레이아웃이 절반 넘게 쓰이지 않게 한다. 페이지 역할에 가장 맞는 레이아웃을 고른다.",
  "카드 장수는 내용 분량과 전달 방식에 맞게 정한다. 7장으로 고정하지 않는다.",
  "모든 문자열은 한 줄로 쓴다(줄바꿈 금지). =, +, -, @ 로 시작하지 않는다. items 안에 '|' 문자를 쓰지 않는다.",
  "문장 속 가장 중요한 구절은 **구절** 처럼 강조 표시한다. 한 칸에 1~2곳만, 필요 없으면 쓰지 않는다. 글자 수에는 ** 가 포함되지 않는다.",
];

export function buildPlannerSystemPrompt(): string {
  return `너는 SNS 카드뉴스 기획자다. 주제와 참고자료를 받아 카드뉴스 전체 구성과 페이지별 원고를 기획한다.
분야는 정해져 있지 않다(마케팅, 여행, 뷰티, 숙소 등). 입력된 주제에 맞게 판단한다.

[콘텐츠 유형 content_type]
${list(CONTENT_TYPES)}

[페이지 역할 page_role] 첫 페이지는 HOOK, 마지막 페이지는 CTA. 나머지는 내용에 맞게 고른다.
${list(PAGE_ROLES)}

[레이아웃 layout_type]
${list(LAYOUTS)}
- HOOK 페이지는 BIG_TITLE, BIG_NUMBER, IMAGE_TEXT, SCREENSHOT, PHOTO_COVER 중 하나. CTA 페이지는 CTA 또는 FOLLOW 레이아웃.
- PHOTO_COVER는 사진이 주인공인 표지. image_required=true, image_type PHOTO 또는 AI_IMAGE.
- FOLLOW는 계정 프로필 카드로 팔로우를 유도하는 마지막 장 (목적이 팔로우일 때 적합).
- BIG_NUMBER는 숫자가 든 visual_focus 필요. RESULT도 visual_focus 필요.
- GRAPH, image_type GRAPH/CHART는 참고자료에 실제 수치가 있을 때만.

[이미지 image_type] ${IMAGE_TYPES.join(", ")}
- image_required=false면 image_type, image_prompt, image_source는 빈 문자열.
- AI_IMAGE면 image_prompt에 생성용 설명을 쓴다. image_source는 참고자료에 이미지 출처가 있을 때만 쓰고 아니면 빈 문자열.

[사실 확인 fact_check]
${list(FACT_CHECK)}

[카드 장수] ${MIN_PAGES}~${MAX_PAGES}장

[글자 수 한도]
headline ${LIMITS.headline}, subheadline ${LIMITS.subheadline}, body ${LIMITS.body}, visual_focus ${LIMITS.visual_focus}, items 각 ${LIMITS.item}자 / 최대 ${LIMITS.items}개, cta ${LIMITS.cta}, image_prompt ${LIMITS.image_prompt}, caption ${LIMITS.caption}

[작성 규칙]
${PLANNER_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}

[출력 형식]
JSON 객체 하나만 출력한다. 설명 문장이나 코드블록 표시는 쓰지 않는다.
{
  "category": "분야 (예: marketing, travel, beauty, stay …)",
  "target": "대상 독자",
  "content_type": "${Object.keys(CONTENT_TYPES).join(" | ")}",
  "page_count": 숫자 (pages 길이와 같아야 함),
  "planning_note": "유형과 장수를 이렇게 정한 이유 한두 문장",
  "caption": "게시물 캡션 (줄바꿈 \\n 허용)",
  "hashtags": "#태그 #태그 (공백 구분)",
  "pages": [
    {
      "page_number": 1,
      "page_role": "...",
      "layout_type": "...",
      "headline": "...",
      "subheadline": "... 또는 빈 문자열",
      "body": "... 또는 빈 문자열",
      "visual_focus": "... 또는 빈 문자열",
      "items": ["..."] 또는 [],
      "image_required": true 또는 false,
      "image_type": "... 또는 빈 문자열",
      "image_source": "",
      "image_prompt": "... 또는 빈 문자열",
      "cta": "CTA 페이지에서만, 나머지는 빈 문자열",
      "source": "근거 출처 또는 빈 문자열",
      "fact_check": "${Object.keys(FACT_CHECK).join(" | ")}"
    }
  ]
}`;
}

export function buildPlannerUserPrompt(input: PlanInput): string {
  return [
    `브랜드: ${input.brand}`,
    `주제: ${input.topic}`,
    `콘텐츠 목적: ${input.objective} (${OBJECTIVES[input.objective]})`,
    input.category ? `분야(지정): ${input.category}` : "분야: 주제를 보고 판단",
    input.target ? `대상 독자(지정): ${input.target}` : "대상 독자: 주제와 목적을 보고 판단",
    ...(input.maxPages ? [`카드 장수: 최대 ${input.maxPages}장`] : []),
    "",
    "[참고자료]",
    input.reference?.trim() || "없음 - 수치/통계/가격/날짜/고유 정보는 쓰지 말 것",
  ].join("\n");
}

/** 검증 실패 시 AI에게 돌려줄 수정 요청 */
export function buildRepairPrompt(errors: string): string {
  return `방금 기획에 아래 오류가 있다. 오류만 고친 전체 JSON을 다시 출력해라. 오류가 없는 부분은 바꾸지 마라.\n\n${errors}`;
}
