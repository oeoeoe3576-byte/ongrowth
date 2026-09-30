// 렌더링 단계의 입력 타입. 2단계 PAGES/MASTER 행(문자열)을 렌더링하기 좋은 형태로 바꾼 것.

import type { DesignTheme } from "./tokens.js";
import { ITEM_SEPARATOR, type Layout, type MasterRow, type PageRow } from "../planner/types.js";

export interface RenderPage {
  contentId: string;
  number: number;
  role: string;
  layout: string;
  headline: string;
  subheadline: string;
  body: string;
  visualFocus: string;
  items: string[];
  imageRequired: boolean;
  imageType: string;
  imageSource: string;
  imagePrompt: string;
  cta: string;
  factCheck: string;
}

/** 브랜드 프로필 (data/brands/<brand>.json). 없으면 계정명만 쓴다. 숫자는 입력된 값만 표시 */
export interface BrandProfile {
  handle: string;
  displayName?: string;
  bio?: string[];
  theme?: string; // 이 계정의 기본 디자인 (default / insight / life / campaign)
  coverTheme?: string; // 첫 장·마지막 장만 다른 디자인으로 (예: 본문 default + 표지/마무리 insight)
  logo?: string; // 이미지 경로 또는 URL
  categoryLabel?: string; // 모든 카드 상단 라벨
  stats?: { posts?: string; followers?: string; following?: string };
}

export interface RenderContext {
  master: MasterRow;
  total: number;
  theme: DesignTheme;
  brand: BrandProfile;
}

export type Tone = "light" | "dark" | "photo";

export interface LayoutLimits {
  /** 권장 글자 수. 넘으면 warning (폰트를 줄여 억지로 넣지 않는다) */
  headline: number;
  subheadline: number;
  body: number;
  itemChars: number;
  itemsMin: number;
  itemsMax: number;
}

/** 레이아웃 컴포넌트. layouts/*.ts 한 파일 = 한 레이아웃 */
export interface LayoutComponent {
  name: Layout;
  label: string;
  limits: LayoutLimits;
  /** 이 레이아웃 전용 CSS (.cn-l-<NAME> 아래에만 적용) */
  css: string;
  tone?(page: RenderPage, ctx: RenderContext): Tone;
  render(page: RenderPage, ctx: RenderContext): string;
}

export function toRenderPage(row: PageRow): RenderPage {
  return {
    contentId: row.content_id,
    number: Number(row.page_number),
    role: row.page_role,
    layout: row.layout_type,
    headline: row.headline,
    subheadline: row.subheadline,
    body: row.body,
    visualFocus: row.visual_focus,
    items: row.items ? row.items.split(ITEM_SEPARATOR).map((s) => s.trim()).filter(Boolean) : [],
    imageRequired: row.image_required === "TRUE",
    imageType: row.image_type,
    imageSource: row.image_source,
    imagePrompt: row.image_prompt,
    cta: row.cta,
    factCheck: row.fact_check,
  };
}
