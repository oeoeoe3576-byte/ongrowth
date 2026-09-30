// BIG_NUMBER: 숫자/단계/금액/개수를 매우 크게. 보조 headline, 짧은 body
import { frame, text, focusMarkup } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const BigNumberTemplate: LayoutComponent = {
  name: "BIG_NUMBER",
  label: "큰 숫자",
  limits: { headline: 22, subheadline: 30, body: 60, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: (p) => (p.role === "HOOK" ? "dark" : "light"),
  css: `
.cn-l-BIG_NUMBER .cn-main { justify-content: center; gap: 36px; }
.cn-l-BIG_NUMBER .cn-focus { margin: -0.1em 0 -0.08em -0.04em; }
.cn-l-BIG_NUMBER .cn-headline { margin-top: 12px; }
.cn-l-BIG_NUMBER .cn-body { color: var(--c-muted); max-width: 840px; padding-top: 28px; border-top: var(--bw) solid var(--c-line); margin-top: 12px; }`,
  render(p, ctx) {
    return frame(p, ctx, this.tone!(p, ctx), `
      ${p.visualFocus ? focusMarkup(p.visualFocus) : ""}
      ${text("cn-headline", "headline", p.headline, 3)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      ${text("cn-body", "body", p.body, 3)}`);
  },
};
