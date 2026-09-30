// RESULT: 성과/결과. visual_focus를 가장 크게, 그 아래 headline/body. 이미지가 필요하면 아래에 자리
import { frame, text, focusMarkup, imageSlot } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const ResultTemplate: LayoutComponent = {
  name: "RESULT",
  label: "결과/성과",
  limits: { headline: 22, subheadline: 30, body: 60, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  css: `
.cn-l-RESULT .cn-main { gap: 28px; justify-content: center; }
.cn-l-RESULT .cn-result-box { background: var(--c-accent-soft); border-radius: var(--r-box); padding: 56px 56px 48px; display: flex; flex-direction: column; gap: 20px; }
.cn-l-RESULT .cn-kicker { margin-bottom: 4px; }
.cn-l-RESULT .cn-focus { font-size: calc(var(--fs-focus) * .92); }
.cn-l-RESULT .cn-headline { font-size: calc(var(--fs-headline) * .92); }
.cn-l-RESULT .cn-body { color: var(--c-muted); }
.cn-l-RESULT .cn-image { flex: 1 1 auto; min-height: 260px; }
.cn-l-RESULT.has-image .cn-main { justify-content: flex-start; padding-top: 40px; }`,
  render(p, ctx) {
    const html = frame(p, ctx, "light", `
      <div class="cn-result-box">
        <div class="cn-kicker">RESULT</div>
        ${p.visualFocus ? focusMarkup(p.visualFocus) : ""}
        ${text("cn-headline", "headline", p.headline, 2)}
      </div>
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      ${text("cn-body", "body", p.body, 3, p.visualFocus)}
      ${p.imageRequired ? imageSlot(p) : ""}`);
    return p.imageRequired ? html.replace('class="cn-card ', 'class="cn-card has-image ') : html;
  },
};
