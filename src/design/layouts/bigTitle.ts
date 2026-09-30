// BIG_TITLE: 표지 / 강한 메시지. 상단 작은 카테고리, 큰 제목, 부제, visual_focus 강조
import { frame, text, esc } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const BigTitleTemplate: LayoutComponent = {
  name: "BIG_TITLE",
  label: "큰 제목",
  limits: { headline: 22, subheadline: 34, body: 50, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: (p) => (p.role === "HOOK" ? "dark" : "light"),
  css: `
.cn-l-BIG_TITLE .cn-main { justify-content: flex-end; gap: var(--sp-section); padding-bottom: calc(var(--sp-section) * 1.6); }
.cn-l-BIG_TITLE .cn-display { font-size: calc(var(--fs-display) * 1.08); }
.cn-l-BIG_TITLE .cn-sub { font-size: calc(var(--fs-sub) * 1.1); max-width: 820px; }
.cn-l-BIG_TITLE .cn-body { color: var(--c-muted); max-width: 820px; }`,
  render(p, ctx) {
    const header = (ctx.brand.categoryLabel ?? ctx.master.brand).toLowerCase();
    const kicker = ctx.master.category && !header.includes(ctx.master.category.toLowerCase()) ? `<div class="cn-kicker">${esc(ctx.master.category)}</div>` : "";
    return frame(p, ctx, this.tone!(p, ctx), `
      ${kicker}
      ${text("cn-display", "headline", p.headline, 4, p.visualFocus)}
      <div class="cn-rule"></div>
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      ${text("cn-body", "body", p.body, 2)}`);
  },
};
