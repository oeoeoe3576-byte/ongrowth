// GRID: 2x2 (4개 이하) 또는 2x3 (5~6개) 격자. items 수에 따라 자동
import { frame, text, rich, splitItem } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const GridTemplate: LayoutComponent = {
  name: "GRID",
  label: "격자",
  limits: { headline: 20, subheadline: 30, body: 40, itemChars: 22, itemsMin: 4, itemsMax: 6 },
  css: `
.cn-l-GRID .cn-main { gap: 28px; padding-top: calc(var(--sp-section) * 1.2); }
.cn-l-GRID .cn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; flex: 1 1 auto; min-height: 0; }
.cn-l-GRID .cn-grid.rows-2 { grid-template-rows: repeat(2, 1fr); max-height: 820px; }
.cn-l-GRID .cn-grid.rows-3 { grid-template-rows: repeat(3, 1fr); }
.cn-l-GRID .cn-cell { background: var(--c-surface); border-radius: var(--r-box); border: var(--bw) solid var(--c-line); padding: 40px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.cn-l-GRID .cn-cell .cn-num { font-size: 36px; }
.cn-l-GRID .cn-cell-title { font-size: 44px; font-weight: var(--w-heavy); line-height: 1.3; letter-spacing: -0.02em; margin-top: auto; }
.cn-l-GRID .cn-cell-desc { font-size: 30px; line-height: 1.45; color: var(--c-muted); }`,
  render(p, ctx) {
    const items = p.items.slice(0, 6);
    const rows = items.length > 4 ? 3 : 2;
    const cells = items.map((it, i) => {
      const { title, desc } = splitItem(it);
      return `<div class="cn-cell" data-fit data-field="items"><span class="cn-num">${String(i + 1).padStart(2, "0")}</span><div class="cn-cell-title cn-fit" style="--lines:2">${rich(title)}</div>${desc ? `<div class="cn-cell-desc cn-fit" style="--lines:2">${rich(desc)}</div>` : ""}</div>`;
    }).join("");
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <div class="cn-grid rows-${rows}">${cells}</div>`);
  },
};
