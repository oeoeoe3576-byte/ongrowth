// NUMBER_LIST: 번호 목록. 항목 사이 구분선과 넉넉한 간격
import { frame, text, rich } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const NumberListTemplate: LayoutComponent = {
  name: "NUMBER_LIST",
  label: "번호 목록",
  limits: { headline: 20, subheadline: 32, body: 40, itemChars: 24, itemsMin: 2, itemsMax: 5 },
  css: `
.cn-l-NUMBER_LIST .cn-main { gap: 28px; padding-top: calc(var(--sp-section) * 1.4); }
.cn-l-NUMBER_LIST ol { list-style: none; margin: auto 0; border-top: var(--bw) solid var(--c-text); min-height: 0; overflow: hidden; }
.cn-l-NUMBER_LIST li { display: grid; grid-template-columns: 112px 1fr; align-items: baseline; padding: calc(var(--sp-item) * 2.4) 0; border-bottom: var(--bw) solid var(--c-line); }
.cn-l-NUMBER_LIST .cn-num { font-size: 52px; }
.cn-l-NUMBER_LIST .cn-li-text { font-size: calc(var(--fs-item) * 1.45); font-weight: var(--w-bold); line-height: 1.4; }
.cn-l-NUMBER_LIST .cn-body { color: var(--c-muted); }`,
  render(p, ctx) {
    const items = p.items
      .map((it, i) => `<li><span class="cn-num">${String(i + 1).padStart(2, "0")}</span><span class="cn-li-text cn-fit" style="--lines:2" data-fit data-field="items">${rich(it, p.visualFocus)}</span></li>`)
      .join("");
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <ol data-fit data-field="items">${items}</ol>
      ${text("cn-body", "body", p.body, 2)}`);
  },
};
