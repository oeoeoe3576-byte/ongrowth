// CTA: 마지막 페이지. headline, 마무리 문구, CTA 버튼, 저장/팔로우 등 행동 표시
import { frame, text, esc, rich } from "../parts.js";
import type { LayoutComponent } from "../types.js";

const ACTION_HINT: Record<string, string> = {
  SAVE: "저장해두고 필요할 때 다시 보세요",
  FOLLOW: "팔로우하고 다음 글도 받아보세요",
  SALES: "자세한 내용은 프로필 링크에서",
  PARTNERSHIP: "제휴 문의는 DM으로 남겨주세요",
  INFORM: "도움이 됐다면 공유해 주세요",
  ENGAGEMENT: "댓글로 의견을 남겨주세요",
};

export const CtaTemplate: LayoutComponent = {
  name: "CTA",
  label: "행동 유도",
  limits: { headline: 20, subheadline: 30, body: 60, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: () => "dark",
  css: `
.cn-l-CTA .cn-main { justify-content: center; gap: 36px; padding-bottom: calc(var(--sp-section) * 2); }
.cn-l-CTA .cn-display { font-size: calc(var(--fs-display) * .96); }
.cn-l-CTA .cn-body { color: var(--c-muted); max-width: 820px; }
.cn-l-CTA .cn-cta-btn { align-self: flex-start; margin-top: 28px; background: var(--c-accent); color: var(--c-on-accent); font-size: 40px; font-weight: var(--w-heavy); letter-spacing: -0.02em; padding: 34px 56px; border-radius: var(--r-pill); max-width: 100%; }
.cn-l-CTA.cn-tone-dark .cn-cta-btn { color: var(--c-primary); }
.cn-l-CTA .cn-cta-hint { font-size: var(--fs-caption); color: var(--c-muted); font-weight: var(--w-bold); }
.cn-l-CTA .cn-handle { font-size: 30px; font-weight: var(--w-heavy); letter-spacing: .02em; margin-top: 24px; }`,
  render(p, ctx) {
    const hint = ACTION_HINT[ctx.master.objective] ?? "";
    return frame(p, ctx, "dark", `
      ${text("cn-display", "headline", p.headline, 3, p.visualFocus)}
      ${text("cn-body", "body", p.body, 3, p.visualFocus)}
      ${p.cta ? `<div class="cn-cta-btn cn-on-accent cn-fit" style="--lines:2" data-fit data-field="cta">${rich(p.cta)} →</div>` : ""}
      ${hint ? `<div class="cn-cta-hint">${esc(hint)}</div>` : ""}
      <div class="cn-handle">@${esc(ctx.master.brand)}</div>`);
  },
};
