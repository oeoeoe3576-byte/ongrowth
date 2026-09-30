// 2단계: 카드뉴스 기획 엔진 공용 타입 / 허용 값.
// 특정 분야(마케팅/여행/뷰티/숙소 …)에 종속되는 값은 두지 않는다. 분야는 category(자유 입력)로만 구분한다.

/** 콘텐츠 목적 (사용자 입력) */
export const OBJECTIVES = {
  INFORM: "정보전달",
  SAVE: "저장유도",
  FOLLOW: "팔로우",
  SALES: "판매",
  PARTNERSHIP: "제휴",
  ENGAGEMENT: "참여유도",
} as const;
export type Objective = keyof typeof OBJECTIVES;

/** 콘텐츠 유형 (AI 판단) */
export const CONTENT_TYPES = {
  INFO: "정보형",
  LIST: "리스트형",
  STEP: "STEP형",
  ROADMAP: "로드맵형",
  COMPARE: "비교형",
  CASE: "사례/성과형",
  OFFER: "혜택/서비스형",
} as const;
export type ContentType = keyof typeof CONTENT_TYPES;

/** 페이지 역할 (AI 판단) */
export const PAGE_ROLES = {
  HOOK: "첫 장. 읽는 사람이 얻는 것을 분명히 보여주는 후킹",
  PROBLEM: "독자가 겪는 문제/상황 제기",
  OVERVIEW: "전체 구성/핵심을 한눈에 보여줌",
  INFORMATION: "핵심 정보 하나",
  STEP: "순서가 있는 단계 하나",
  RESULT: "결과/성과/변화",
  SUMMARY: "요약 또는 실전 적용",
  CTA: "마지막 장. 목적에 맞는 행동 유도",
} as const;
export type PageRole = keyof typeof PAGE_ROLES;

/** 레이아웃 (AI 판단) */
export const LAYOUTS = {
  BIG_TITLE: "큰 제목 중심",
  BIG_NUMBER: "숫자 하나를 크게",
  TEXT: "제목 + 짧은 본문",
  NUMBER_LIST: "번호 목록 (items 2개 이상)",
  IMAGE_TEXT: "이미지 + 텍스트",
  SCREENSHOT: "화면 캡처 + 설명",
  THREE_COLUMN: "3단 구성 (items 정확히 3개)",
  GRID: "격자 (items 4개 이상)",
  COMPARE: "두 대상 비교 (items 2개 이상, 'A: … / B: …')",
  TIMELINE: "시간/순서 흐름 (items 3개 이상)",
  GRAPH: "그래프/차트 (자료에 수치가 있을 때만)",
  RESULT: "결과/성과 강조",
  CTA: "행동 유도",
} as const;
export type Layout = keyof typeof LAYOUTS;

export const IMAGE_TYPES = ["PHOTO", "SCREENSHOT", "ICON", "AI_IMAGE", "GRAPH", "CHART", "LOGO"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** 페이지 내용의 사실 확인 상태 */
export const FACT_CHECK = {
  NOT_REQUIRED: "일반적인 방법/원칙이라 사실 확인 불필요",
  REFERENCE: "제공된 참고자료에 근거함 (source 필수)",
  NEEDS_CHECK: "사람이 사실 확인해야 함",
} as const;
export type FactCheck = keyof typeof FACT_CHECK;

export const MASTER_STATUS = ["draft", "review", "approved", "designed", "published", "hold"] as const;

export const MIN_PAGES = 5;
export const MAX_PAGES = 12;

/** 사용자 입력 */
export interface PlanInput {
  brand: string;
  topic: string;
  objective: Objective;
  reference?: string;
  /** 선택: 지정하지 않으면 AI가 판단 */
  category?: string;
  target?: string;
}

/** AI가 돌려주는 페이지 (JSON) */
export interface PlanPage {
  page_number: number;
  page_role: PageRole;
  layout_type: Layout;
  headline: string;
  subheadline: string;
  body: string;
  visual_focus: string;
  items: string[];
  image_required: boolean;
  image_type: ImageType | "";
  image_source: string;
  image_prompt: string;
  cta: string;
  source: string;
  fact_check: FactCheck;
}

/** AI가 돌려주는 기획 전체 (JSON) */
export interface CardnewsPlan {
  category: string;
  target: string;
  content_type: ContentType;
  page_count: number;
  /** 유형/장수를 그렇게 정한 이유 (검수용, 시트에는 저장하지 않음) */
  planning_note: string;
  caption: string;
  hashtags: string;
  pages: PlanPage[];
}

/** 시트 MASTER 1행 = 카드뉴스 1세트 */
export const MASTER_COLUMNS = [
  "content_id",
  "brand",
  "topic",
  "category",
  "objective",
  "content_type",
  "target",
  "status",
  "page_count",
  "caption",
  "hashtags",
  "created_at",
] as const;

/** 시트 PAGES 1행 = 카드 1장. content_id로 MASTER와 연결 */
export const PAGE_COLUMNS = [
  "content_id",
  "page_number",
  "page_role",
  "layout_type",
  "headline",
  "subheadline",
  "body",
  "visual_focus",
  "items",
  "image_required",
  "image_type",
  "image_source",
  "image_prompt",
  "cta",
  "source",
  "fact_check",
] as const;

export type MasterRow = Record<(typeof MASTER_COLUMNS)[number], string>;
export type PageRow = Record<(typeof PAGE_COLUMNS)[number], string>;

/** 시트 셀 안에서 items를 구분하는 문자 */
export const ITEM_SEPARATOR = " | ";
