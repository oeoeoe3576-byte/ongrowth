// 카드뉴스 스프레드시트(Google Sheets) / Canva Bulk Create 공용 컬럼 스키마.
// 이 파일이 컬럼 정의의 단일 출처(single source of truth)다.
// - 카드뉴스 1세트 = 시트 1행
// - 카드별 제목/본문은 각각 독립 컬럼
// - 특정 분야(마케팅/여행/뷰티/숙소 등)에 종속되는 컬럼은 두지 않는다.

export type ColumnGroup = "management" | "card" | "publish";

export interface ColumnDef {
  /** 시트 헤더 = CSV 헤더 = Canva 데이터 필드명. 영문 소문자 + 숫자 + _ 만 사용 */
  name: string;
  group: ColumnGroup;
  /** 카드 컬럼이면 해당 페이지 번호(1~7) */
  page?: number;
  /** 사람이 읽는 설명 (문서/프롬프트용) */
  description: string;
  required: boolean;
  /** Canva 템플릿 텍스트 박스에 연결되는 컬럼인지 */
  canva: boolean;
  /** 최대 글자 수 (공백 포함, 문자 단위). 모바일 가독성 + Canva 텍스트 박스 넘침 방지 */
  maxLength?: number;
  /** 허용 값 목록 (지정 시 이 값만 허용) */
  enum?: readonly string[];
}

export const PAGE_COUNT = 7;

export const PAGE_ROLES: Record<number, string> = {
  1: "강한 후킹/표지 - 읽는 사람이 얻는 핵심 이점을 명확하게",
  2: "문제 제기 - 독자가 겪는 상황/문제",
  3: "핵심 정보 1",
  4: "핵심 정보 2",
  5: "핵심 정보 3",
  6: "요약 또는 실전 적용",
  7: "마무리/CTA",
};

export const STATUS_VALUES = [
  "draft", // AI 초안 생성 직후
  "review", // 사람 검수 중 (사실 확인 포함)
  "approved", // 검수 완료, Canva 반영 대상
  "designed", // Canva Bulk Create 반영 완료
  "published", // 발행 완료
  "hold", // 보류 (정보 부족/사실 확인 불가 등)
] as const;

// 카드뉴스 구성 방식. 분야와 무관한 형식 분류다. (분야는 category 컬럼)
export const CONTENT_TYPE_VALUES = [
  "tips", // 팁/노하우
  "howto", // 방법/단계
  "checklist", // 체크리스트
  "list", // 추천 목록
  "comparison", // 비교
  "case", // 사례
  "guide", // 개념/가이드
] as const;

const TITLE_MAX = 20;
const BODY_MAX = 80;

function cardColumns(): ColumnDef[] {
  const cols: ColumnDef[] = [
    { name: "cover_title", group: "card", page: 1, description: "표지 메인 문구", required: true, canva: true, maxLength: 22 },
    { name: "cover_subtitle", group: "card", page: 1, description: "표지 보조 문구", required: true, canva: true, maxLength: 32 },
  ];
  for (let p = 2; p <= PAGE_COUNT; p++) {
    cols.push({ name: `page${p}_title`, group: "card", page: p, description: `${p}페이지 제목 (${PAGE_ROLES[p]})`, required: true, canva: true, maxLength: TITLE_MAX });
    cols.push({ name: `page${p}_body`, group: "card", page: p, description: `${p}페이지 본문 (${PAGE_ROLES[p]})`, required: true, canva: true, maxLength: BODY_MAX });
  }
  cols.push({ name: "cta", group: "card", page: 7, description: "행동 유도 문구", required: true, canva: true, maxLength: 25 });
  return cols;
}

export const COLUMNS: readonly ColumnDef[] = [
  // --- 관리 ---
  { name: "content_id", group: "management", description: "고유 ID. 형식 CN-YYYYMMDD-NNN", required: true, canva: true },
  { name: "brand", group: "management", description: "브랜드/계정 키. Canva 템플릿 선택 단위", required: true, canva: false },
  { name: "template_key", group: "management", description: "사용할 Canva 템플릿 식별자", required: true, canva: false },
  { name: "topic", group: "management", description: "입력 주제", required: true, canva: false },
  { name: "category", group: "management", description: "분야 (예: marketing, travel, beauty, stay). 자유 입력", required: true, canva: false },
  { name: "content_type", group: "management", description: "구성 방식", required: true, canva: false, enum: CONTENT_TYPE_VALUES },
  { name: "target", group: "management", description: "대상 독자", required: true, canva: false },
  { name: "status", group: "management", description: "진행 상태", required: true, canva: false, enum: STATUS_VALUES },
  { name: "created_at", group: "management", description: "생성 시각. 형식 YYYY-MM-DD HH:mm (KST)", required: true, canva: false },
  { name: "source_notes", group: "management", description: "사실 근거/출처 또는 확인 필요 항목. 없으면 '해당 없음'", required: true, canva: false },
  // --- 카드 (Canva 연결) ---
  ...cardColumns(),
  // --- 발행용 (Canva 미연결) ---
  { name: "caption", group: "publish", description: "게시물 캡션", required: true, canva: false, maxLength: 2200 },
  { name: "hashtags", group: "publish", description: "공백으로 구분한 해시태그 (#태그 #태그)", required: true, canva: false },
];

export const COLUMN_NAMES: readonly string[] = COLUMNS.map((c) => c.name);

/** Canva Bulk Create 업로드용 CSV에 포함되는 컬럼 (content_id + 카드 필드) */
export const CANVA_COLUMN_NAMES: readonly string[] = COLUMNS.filter((c) => c.canva).map((c) => c.name);

export type CardnewsRow = Record<string, string>;
