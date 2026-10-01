// 레이아웃 컴포넌트가 함께 쓰는 조각: 카드 틀(상단/하단), 강조, 숫자 분리, 이미지 자리, 항목 분리.

import type { RenderContext, RenderPage, Tone } from "./types.js";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** text 안의 visual_focus를 강조색으로. 없으면 그대로 */
export function highlight(text: string, focus: string): string {
  if (!focus || !text.includes(focus)) return esc(text);
  const i = text.indexOf(focus);
  return `${esc(text.slice(0, i))}<em class="cn-hl">${esc(focus)}</em>${esc(text.slice(i + focus.length))}`;
}

/**
 * 원고 문자열 → HTML. **구절**은 테마의 강조 방식(색/형광펜/굵기)으로, visual_focus는 강조색으로.
 * 모든 레이아웃은 글자를 넣을 때 이 함수를 쓴다.
 */
export function rich(text: string, focus = ""): string {
  let focusUsed = false;
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((part) => {
      const m = part.match(/^\*\*([^*]+)\*\*$/);
      if (m) return `<strong class="cn-em">${esc(m[1])}</strong>`;
      if (!focusUsed && focus && part.includes(focus)) {
        focusUsed = true;
        return highlight(part, focus);
      }
      return esc(part);
    })
    .join("")
    .replace(/\r?\n/g, "<br>"); // 원고의 줄바꿈은 그대로 줄바꿈
}

/** 강조 표시(**)를 뺀 글자 */
export function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

/** "30개" → { pre:"", num:"30", unit:"개" }. 숫자가 없으면 num에 전체 */
export function splitNumber(s: string): { pre: string; num: string; unit: string } {
  const m = s.match(/^(\D*?)([\d][\d,.]*)(.*)$/);
  if (!m) return { pre: "", num: s, unit: "" };
  return { pre: m[1], num: m[2], unit: m[3] };
}

/** 큰 숫자/문구 표시. 숫자 뒤 단위는 작게 */
export function focusMarkup(focus: string, cls = ""): string {
  const { pre, num, unit } = splitNumber(focus);
  return `<div class="cn-focus ${cls}" data-fit data-field="visual_focus">${pre ? `<span class="cn-focus-unit">${esc(pre)}</span>` : ""}<span class="cn-focus-num">${esc(num)}</span>${unit ? `<span class="cn-focus-unit">${esc(unit)}</span>` : ""}</div>`;
}

/** "제목: 설명" → [제목, 설명] */
export function splitItem(item: string): { title: string; desc: string } {
  const i = item.search(/[:：]/);
  if (i < 0) return { title: item, desc: "" };
  return { title: item.slice(0, i).trim(), desc: item.slice(i + 1).trim() };
}

/** 줄 수를 제한한 텍스트. 넘치면 잘리고, 검수기가 overflow로 잡는다 */
export function text(cls: string, field: string, value: string, lines: number, focus = ""): string {
  if (!value) return "";
  return `<div class="${cls} cn-fit" style="--lines:${lines}" data-fit data-field="${field}">${rich(value, focus)}</div>`;
}

const IMAGE_LABEL: Record<string, string> = {
  PHOTO: "사진",
  SCREENSHOT: "스크린샷",
  ICON: "아이콘",
  AI_IMAGE: "AI 이미지",
  GRAPH: "그래프",
  CHART: "차트",
  LOGO: "로고",
};

/** 이미지 자리. 실제 이미지(image_source가 URL/경로)가 있으면 이미지를, 없으면 placeholder */
export function imageSlot(page: RenderPage, cls = ""): string {
  const src = page.imageSource.trim();
  if (src && /^(https?:|data:|file:|\/|\.)/.test(src)) {
    return `<div class="cn-image ${cls}"><img src="${esc(src)}" alt="" /></div>`;
  }
  const label = IMAGE_LABEL[page.imageType] ?? "이미지";
  return `<div class="cn-image cn-ph ${cls}" data-placeholder="${esc(page.imageType || "IMAGE")}">
    <div class="cn-ph-inner">
      <div class="cn-ph-tag">${esc(label)} 자리</div>
      ${page.imagePrompt ? `<div class="cn-ph-desc">${esc(page.imagePrompt)}</div>` : ""}
    </div>
  </div>`;
}

/** 모든 카드에 공통인 틀: 상단(브랜드 · 페이지), 본문, 하단(진행 표시) */
export function frame(page: RenderPage, ctx: RenderContext, tone: Tone, inner: string, background = ""): string {
  const brand = ctx.brand.categoryLabel ?? ctx.theme.brandLabel ?? ctx.master.brand;
  const pn = String(page.number).padStart(2, "0");
  const total = String(ctx.total).padStart(2, "0");
  const segments = Array.from({ length: ctx.total }, (_, i) => `<i class="${i < page.number ? "on" : ""}"></i>`).join("");
  const swipe = page.number === 1 && ctx.total > 1 ? `<span class="cn-swipe">넘겨보기 →</span>` : "";
  return `<article class="cn-card cn-theme-${esc(ctx.theme.name)} cn-tone-${tone} cn-l-${esc(page.layout)} cn-r-${esc(page.role)}" data-page="${page.number}" data-layout="${esc(page.layout)}">${background ? `\n  <div class="cn-bg">${background}</div>` : ""}
  <header class="cn-top"><span class="cn-brand">${esc(brand)}</span><span class="cn-pn">${pn}<span class="cn-pn-total"> / ${total}</span></span></header>
  <main class="cn-main" data-fit data-field="card">${inner}</main>
  <footer class="cn-foot"><div class="cn-progress">${segments}</div>${swipe}</footer>
</article>`;
}
