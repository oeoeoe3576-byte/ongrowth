// 3. Card Renderer
// content.json(CardnewsContent) + 템플릿(HTML/CSS) → Playwright로 PNG 캡처 (지시사항 8, 9, 10)
//
// 디자인 값(폰트/색/여백/CTA/로고)은 코드가 아니라 templates/{name}/template.config.json + styles.css에서 관리한다.

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CardnewsContent, CardnewsSlide } from "../types.js";
import { loadConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");

export interface TemplateConfig {
  name: string;
  description: string;
  font_family: string;
  colors: {
    background: string;
    accent: string;
    text_primary: string;
    text_secondary: string;
    overlay: string;
  };
  logo_text: string;
  show_page_number: boolean;
  cta_default: string;
}

async function loadTemplate(name: string) {
  const dir = path.join(TEMPLATES_DIR, name);
  const [config, styles, coverHtml, placeHtml, ctaHtml] = await Promise.all([
    fs.readFile(path.join(dir, "template.config.json"), "utf8").then((s) => JSON.parse(s) as TemplateConfig),
    fs.readFile(path.join(dir, "styles.css"), "utf8"),
    fs.readFile(path.join(dir, "cover.html"), "utf8"),
    fs.readFile(path.join(dir, "place.html"), "utf8"),
    fs.readFile(path.join(dir, "cta.html"), "utf8"),
  ]);
  return { config, styles, coverHtml, placeHtml, ctaHtml };
}

function escapeHtml(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withCssVars(styles: string, config: TemplateConfig): string {
  const vars = `:root{--bg:${config.colors.background};--accent:${config.colors.accent};--text-primary:${config.colors.text_primary};--text-secondary:${config.colors.text_secondary};--overlay:${config.colors.overlay};}`;
  return `${vars}\n${styles}\nbody{font-family:${config.font_family};}`;
}

function renderSlideHtml(
  slide: CardnewsSlide,
  templates: Awaited<ReturnType<typeof loadTemplate>>,
  region: string
): string {
  const cssWithVars = withCssVars(templates.styles, templates.config);
  const pageNumber = templates.config.show_page_number ? `${String(slide.index).padStart(2, "0")}` : "";
  const logo = escapeHtml(templates.config.logo_text);

  if (slide.type === "cover") {
    return templates.coverHtml
      .replace("__STYLES__", cssWithVars)
      .replace("__REGION__", escapeHtml(region))
      .replace("__HEADLINE__", escapeHtml(slide.headline))
      .replace("__SUBHEADLINE__", escapeHtml(slide.subheadline))
      .replace("__LOGO__", logo);
  }

  if (slide.type === "cta") {
    return templates.ctaHtml
      .replace("__STYLES__", cssWithVars)
      .replace("__REGION__", escapeHtml(region))
      .replace("__HEADLINE__", escapeHtml(slide.headline))
      .replace("__SUBHEADLINE__", escapeHtml(slide.subheadline))
      .replace("__CTA__", escapeHtml(templates.config.cta_default))
      .replace("__LOGO__", logo);
  }

  // place
  const meta: string[] = [];
  if (slide.extra?.address) meta.push(`<span>📍 ${escapeHtml(slide.extra.address)}</span>`);
  if (slide.extra?.opening_hours) meta.push(`<span>🕐 ${escapeHtml(slide.extra.opening_hours)}</span>`);
  if (slide.extra?.price) meta.push(`<span>💰 ${escapeHtml(slide.extra.price)}</span>`);
  if (slide.extra?.parking) meta.push(`<span>🚗 ${escapeHtml(slide.extra.parking)}</span>`);

  const bgImage = slide.image
    ? `<img class="bg-image" src="${escapeHtml(slide.image)}" />`
    : "";

  return templates.placeHtml
    .replace("__STYLES__", cssWithVars)
    .replace("__BG_IMAGE__", bgImage)
    .replace("__PAGE_NUMBER__", pageNumber)
    .replace("__REGION__", escapeHtml(slide.region))
    .replace("__PLACE_NAME__", escapeHtml(slide.place_name))
    .replace("__DESCRIPTION__", escapeHtml(slide.description))
    .replace("__META__", meta.join(""))
    .replace("__LOGO__", logo);
}

export interface RenderResult {
  index: number;
  filename: string; // 예: 01_cover.png
  buffer: Buffer;
}

/**
 * content.json의 모든 슬라이드를 PNG 버퍼로 렌더링한다.
 * 실제 파일 저장은 File Manager(files/outputFolder.ts)가 담당한다 (관심사 분리).
 */
export async function renderCardnews(content: CardnewsContent): Promise<RenderResult[]> {
  const cfg = loadConfig();
  const templates = await loadTemplate(content.template || cfg.cardnews.template);

  let browser: Browser | null = null;
  const results: RenderResult[] = [];
  try {
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium",
    }).catch(() => chromium.launch()); // executablePath가 없는 로컬 환경 등에서는 기본 탐색 경로 사용

    const page = await browser.newPage({
      viewport: { width: cfg.cardnews.width, height: cfg.cardnews.height },
      deviceScaleFactor: 2, // 인스타그램 업로드 대비 고해상도
    });

    for (const slide of content.slides) {
      const html = renderSlideHtml(slide, templates, content.region);
      await page.setContent(html, { waitUntil: "load" });
      const buffer = await page.screenshot({ type: "png" });
      const prefix = String(slide.index).padStart(2, "0");
      const suffix = slide.type === "cover" ? "_cover" : slide.type === "cta" ? "_cta" : "";
      results.push({ index: slide.index, filename: `${prefix}${suffix}.png`, buffer });
    }
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

export async function listAvailableTemplates(): Promise<string[]> {
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
