// PAGES/MASTER → 카드 HTML. PNG 렌더러와 미리보기 화면이 이 함수를 같이 쓴다 (보이는 것 = 저장되는 것).

import { BASE_CSS, fontFaceCss } from "./baseCss.js";
import { resolveLayout, allLayoutCss } from "./layouts/index.js";
import { resolveTheme } from "./themes/index.js";
import { themeToCssVars, type DesignTheme } from "./tokens.js";
import { staticChecks, type CardCheck } from "./checks.js";
import { toRenderPage, type BrandProfile, type RenderContext, type RenderPage } from "./types.js";
import { loadBrand, toImageSrc } from "./brand.js";
import fs from "node:fs";
import path from "node:path";
import type { MasterRow, PageRow } from "../planner/types.js";

export interface RenderedCard {
  page: RenderPage;
  theme: DesignTheme;
  component: string;
  html: string;
  checks: CardCheck[];
}

export interface RenderedContent {
  master: MasterRow;
  /** 기본 테마 (본문) */
  theme: DesignTheme;
  /** 이 세트에 쓰인 모든 테마 (표지 테마 포함) */
  themes: DesignTheme[];
  /** 사람이 읽는 디자인 이름. 예: "default + 표지 insight" */
  designLabel: string;
  themeFallback: boolean;
  brand: BrandProfile;
  cards: RenderedCard[];
}

/** 콘텐츠별 색 테마 지정: data/planner/theme-overrides.json { "<content_id>": "<테마>" } (계정 기본보다 우선) */
function themeOverride(contentId: string): string | undefined {
  try {
    const file = path.join(process.cwd(), "data/planner/theme-overrides.json");
    const map = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    return map[contentId];
  } catch {
    return undefined;
  }
}

/**
 * themeName을 주면 모든 장을 그 테마로 (비교용).
 * 안 주면 계정 설정을 따른다: brand.theme(본문) + brand.coverTheme(첫 장·마지막 장).
 */
export function renderContent(master: MasterRow, pageRows: PageRow[], themeName?: string): RenderedContent {
  const brand = loadBrand(master.brand);
  const override = themeOverride(master.content_id);
  const { theme, fallback } = resolveTheme(themeName ?? override ?? brand.theme ?? master.category);
  const cover = !themeName && !override && brand.coverTheme ? resolveTheme(brand.coverTheme).theme : theme;
  const pages = pageRows
    .filter((r) => r.content_id === master.content_id)
    .map(toRenderPage)
    .map((p) => ({ ...p, imageSource: toImageSrc(p.imageSource) }))
    .sort((a, b) => a.number - b.number);
  if (!pages.length) throw new Error(`${master.content_id}의 PAGES 데이터가 없음`);
  const cards = pages.map((page) => {
    const cardTheme = page.number === 1 || page.number === pages.length ? cover : theme;
    const ctx: RenderContext = { master, total: pages.length, theme: cardTheme, brand };
    const { component, fallback: layoutFallback } = resolveLayout(page.layout);
    return { page, theme: cardTheme, component: component.name, html: component.render(page, ctx), checks: staticChecks(page, component, layoutFallback) };
  });
  const themes = [...new Map(cards.map((c) => [c.theme.name, c.theme])).values()];
  const designLabel = cover.name !== theme.name ? `${theme.name} + 표지·마무리 ${cover.name}` : theme.name;
  return { master, theme, themes, designLabel, themeFallback: fallback, brand, cards };
}

/** 카드 CSS 전체 (폰트 + 테마 변수 + 공통 + 레이아웃별) */
export function cardCss(themes: DesignTheme[]): string {
  const unique = [...new Map(themes.map((t) => [t.name, t])).values()];
  const vars = unique.map((t) => `.cn-theme-${t.name}{${themeToCssVars(t)}}`).join("\n");
  return [fontFaceCss(), vars, BASE_CSS, allLayoutCss(), ...unique.map((t) => t.css ?? "")].join("\n");
}

/** PNG 캡처용: 카드 한 장짜리 HTML 문서 */
export function cardDocument(card: RenderedCard): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}${cardCss([card.theme])}</style></head><body>${card.html}</body></html>`;
}
