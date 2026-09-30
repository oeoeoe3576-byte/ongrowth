// PAGES/MASTER → 카드 HTML. PNG 렌더러와 미리보기 화면이 이 함수를 같이 쓴다 (보이는 것 = 저장되는 것).

import { BASE_CSS, fontFaceCss } from "./baseCss.js";
import { resolveLayout, allLayoutCss } from "./layouts/index.js";
import { resolveTheme } from "./themes/index.js";
import { themeToCssVars, type DesignTheme } from "./tokens.js";
import { staticChecks, type CardCheck } from "./checks.js";
import { toRenderPage, type RenderContext, type RenderPage } from "./types.js";
import type { MasterRow, PageRow } from "../planner/types.js";

export interface RenderedCard {
  page: RenderPage;
  component: string;
  html: string;
  checks: CardCheck[];
}

export interface RenderedContent {
  master: MasterRow;
  theme: DesignTheme;
  themeFallback: boolean;
  cards: RenderedCard[];
}

export function renderContent(master: MasterRow, pageRows: PageRow[], themeName?: string): RenderedContent {
  const { theme, fallback } = resolveTheme(themeName ?? master.category);
  const pages = pageRows
    .filter((r) => r.content_id === master.content_id)
    .map(toRenderPage)
    .sort((a, b) => a.number - b.number);
  if (!pages.length) throw new Error(`${master.content_id}의 PAGES 데이터가 없음`);
  const ctx: RenderContext = { master, total: pages.length, theme };
  const cards = pages.map((page) => {
    const { component, fallback: layoutFallback } = resolveLayout(page.layout);
    return { page, component: component.name, html: component.render(page, ctx), checks: staticChecks(page, component, layoutFallback) };
  });
  return { master, theme, themeFallback: fallback, cards };
}

/** 카드 CSS 전체 (폰트 + 테마 변수 + 공통 + 레이아웃별) */
export function cardCss(themes: DesignTheme[]): string {
  const vars = [...new Map(themes.map((t) => [t.name, t])).values()].map((t) => `.cn-theme-${t.name}{${themeToCssVars(t)}}`).join("\n");
  return [fontFaceCss(), vars, BASE_CSS, allLayoutCss()].join("\n");
}

/** PNG 캡처용: 카드 한 장짜리 HTML 문서 */
export function cardDocument(card: RenderedCard, theme: DesignTheme): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}${cardCss([theme])}</style></head><body>${card.html}</body></html>`;
}
