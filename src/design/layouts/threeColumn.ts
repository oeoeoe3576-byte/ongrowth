// THREE_COLUMN: 같은 크기 3칸. 각 칸에 번호 + 제목 + 짧은 설명 ("제목: 설명")
import { frame, text, rich, splitItem } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const ThreeColumnTemplate: LayoutComponent = {
  name: "THREE_COLUMN",
  label: "3단 구성",
  limits: { headline: 20, subheadline: 30, body: 40, itemChars: 22, itemsMin: 3, itemsMax: 3 },
  css: `
.cn-l-THREE_COLUMN .cn-main { gap: 28px; padding-top: calc(var(--sp-section) * 1.4); }
.cn-l-THREE_COLUMN .cn-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 36px; flex: 1 1 auto; max-height: 720px; min-height: 0; }
.cn-l-THREE_COLUMN .cn-col { background: var(--c-surface); border: var(--bw) solid var(--c-line); border-radius: var(--r-box); padding: 36px 28px; display: flex; flex-direction: column; gap: 18px; overflow: hidden; }
.cn-l-THREE_COLUMN .cn-col .cn-num { font-size: 48px; }
.cn-l-THREE_COLUMN .cn-col-title { font-size: 42px; font-weight: var(--w-heavy); line-height: 1.25; letter-spacing: -0.02em; margin-top: auto; }
.cn-l-THREE_COLUMN .cn-col-desc { font-size: 30px; line-height: 1.5; color: var(--c-muted); }
.cn-l-THREE_COLUMN .cn-body { color: var(--c-muted); }`,
  render(p, ctx) {
    const cols = p.items.slice(0, 3).map((it, i) => {
      const { title, desc } = splitItem(it);
      return `<div class="cn-col" data-fit data-field="items"><span class="cn-num">${String(i + 1).padStart(2, "0")}</span><div class="cn-col-title cn-fit" style="--lines:3">${rich(title)}</div>${desc ? `<div class="cn-col-desc cn-fit" style="--lines:4">${rich(desc)}</div>` : ""}</div>`;
    }).join("");
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <div class="cn-cols">${cols}</div>
      ${text("cn-body", "body", p.body, 2, p.visualFocus)}`);
  },
};
