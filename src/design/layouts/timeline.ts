// TIMELINE: 단계/로드맵. 왼쪽 세로선 + 점, STEP 번호, 순서가 한눈에 보이게
import { frame, text, rich, splitItem } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const TimelineTemplate: LayoutComponent = {
  name: "TIMELINE",
  label: "타임라인",
  limits: { headline: 20, subheadline: 30, body: 40, itemChars: 24, itemsMin: 3, itemsMax: 5 },
  css: `
.cn-l-TIMELINE .cn-main { gap: 28px; padding-top: calc(var(--sp-section) * 1.2); }
.cn-l-TIMELINE .cn-steps { list-style: none; position: relative; margin: auto 0; display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: hidden; }
.cn-l-TIMELINE .cn-steps::before { content: ""; position: absolute; left: 21px; top: 30px; bottom: 30px; width: 3px; background: var(--c-line); }
.cn-l-TIMELINE .cn-step { position: relative; display: grid; grid-template-columns: 46px 1fr; gap: 36px; padding: 26px 0; align-items: start; }
.cn-l-TIMELINE .cn-dot { width: 46px; height: 46px; border-radius: 50%; background: var(--c-bg); border: 4px solid var(--c-accent); margin-top: 6px; position: relative; z-index: 1; }
.cn-l-TIMELINE .cn-step:last-child .cn-dot { background: var(--c-accent); }
.cn-l-TIMELINE .cn-step-label { font-size: 26px; font-weight: var(--w-heavy); color: var(--c-accent); letter-spacing: .1em; }
.cn-l-TIMELINE .cn-step-title { font-size: 46px; font-weight: var(--w-heavy); line-height: 1.3; letter-spacing: -0.02em; margin-top: 6px; }
.cn-l-TIMELINE .cn-step-desc { font-size: 28px; line-height: 1.5; color: var(--c-muted); margin-top: 6px; }`,
  render(p, ctx) {
    const steps = p.items.map((it, i) => {
      const { title, desc } = splitItem(it);
      return `<li class="cn-step"><span class="cn-dot"></span><div><div class="cn-step-label">STEP ${String(i + 1).padStart(2, "0")}</div><div class="cn-step-title cn-fit" style="--lines:2" data-fit data-field="items">${rich(title)}</div>${desc ? `<div class="cn-step-desc cn-fit" style="--lines:2">${rich(desc)}</div>` : ""}</div></li>`;
    }).join("");
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <ol class="cn-steps" data-fit data-field="items">${steps}</ol>`);
  },
};
