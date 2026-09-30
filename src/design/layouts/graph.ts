// GRAPH: 성장/변화. "라벨: 값" items에서 숫자를 읽어 막대로. 숫자가 없으면 단계적 상승 막대만 그린다
import { frame, text, esc, splitItem } from "../parts.js";
import type { LayoutComponent, RenderPage } from "../types.js";

export function graphBars(p: RenderPage): { label: string; value: string; ratio: number; hasNumber: boolean }[] {
  const parsed = p.items.map((it) => {
    const { title, desc } = splitItem(it);
    const valueText = desc || title;
    const m = valueText.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return { label: desc ? title : "", value: valueText, num: m ? Number(m[0]) : NaN };
  });
  const hasNumbers = parsed.length > 0 && parsed.every((x) => !Number.isNaN(x.num));
  const max = hasNumbers ? Math.max(...parsed.map((x) => x.num), 0) : 0;
  return parsed.map((x, i) => ({
    label: x.label,
    value: x.value,
    hasNumber: hasNumbers,
    ratio: hasNumbers && max > 0 ? Math.max(0.06, x.num / max) : (i + 1) / parsed.length,
  }));
}

export const GraphTemplate: LayoutComponent = {
  name: "GRAPH",
  label: "그래프",
  limits: { headline: 20, subheadline: 30, body: 50, itemChars: 18, itemsMin: 2, itemsMax: 6 },
  css: `
.cn-l-GRAPH .cn-main { gap: 24px; padding-top: calc(var(--sp-section) * 1.1); }
.cn-l-GRAPH .cn-chart { position: relative; flex: 1 1 auto; min-height: 360px; max-height: 600px; margin-top: 24px; display: flex; align-items: flex-end; gap: 28px; padding: 0 12px; border-bottom: 3px solid var(--c-text); }
.cn-l-GRAPH .cn-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 14px; }
.cn-l-GRAPH .cn-bar-val { font-size: 34px; font-weight: var(--w-heavy); letter-spacing: -0.02em; white-space: nowrap; }
.cn-l-GRAPH .cn-bar-fill { width: 100%; background: var(--c-secondary); border-radius: 16px 16px 0 0; }
.cn-l-GRAPH .cn-bar:last-child .cn-bar-fill { background: var(--c-accent); }
.cn-l-GRAPH .cn-bar:last-child .cn-bar-val { color: var(--c-accent); }
.cn-l-GRAPH .cn-labels { display: flex; gap: 28px; padding: 16px 12px 0; }
.cn-l-GRAPH .cn-labels span { flex: 1; text-align: center; font-size: 26px; font-weight: var(--w-bold); color: var(--c-muted); }
.cn-l-GRAPH .cn-arrow { position: absolute; right: 8px; top: 0; font-size: 56px; font-weight: var(--w-heavy); color: var(--c-accent); line-height: 1; }
.cn-l-GRAPH .cn-body { color: var(--c-muted); margin-top: 16px; }`,
  render(p, ctx) {
    const bars = graphBars(p);
    const rising = bars.length > 1 && bars[bars.length - 1].ratio > bars[0].ratio;
    const cols = bars.map((b) => `<div class="cn-bar">${b.hasNumber ? `<div class="cn-bar-val">${esc(b.value)}</div>` : ""}<div class="cn-bar-fill" style="height:${Math.round(b.ratio * 78)}%"></div></div>`).join("");
    const labels = bars.some((b) => b.label) ? `<div class="cn-labels">${bars.map((b) => `<span>${esc(b.label)}</span>`).join("")}</div>` : "";
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <div class="cn-chart" data-fit data-field="items">${rising ? `<div class="cn-arrow">↗</div>` : ""}${cols}</div>
      ${labels}
      ${text("cn-body", "body", p.body, 2, p.visualFocus)}`);
  },
};
