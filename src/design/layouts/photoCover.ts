// PHOTO_COVER: 사진이 카드 전체를 덮고, 아래쪽을 어둡게 해서 큰 흰 제목을 올린다. 사진이 없으면 어두운 자리 표시
import { frame, text, esc } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const PhotoCoverTemplate: LayoutComponent = {
  name: "PHOTO_COVER",
  label: "사진 표지",
  limits: { headline: 22, subheadline: 34, body: 40, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: () => "photo",
  css: `
.cn-l-PHOTO_COVER .cn-main { justify-content: flex-end; gap: 28px; padding-bottom: calc(var(--sp-section) * .9); }
.cn-l-PHOTO_COVER .cn-tag { align-self: flex-start; font-size: var(--fs-caption); font-weight: var(--w-heavy); letter-spacing: .04em; padding: 10px 24px; border-radius: var(--r-pill); background: var(--c-card-bg); color: var(--c-card-text); }
.cn-l-PHOTO_COVER .cn-display { font-size: calc(var(--fs-display) * 1.02); text-shadow: 0 2px 24px rgba(0,0,0,.25); }
.cn-l-PHOTO_COVER .cn-sub { color: var(--c-muted); font-weight: var(--w-regular); font-size: calc(var(--fs-sub) * 1.02); }
.cn-cover-note { display: none; } /* 본문 한 줄(질문/훅): 이를 쓰는 테마(trend)에서만 보인다 */`,
  render(p, ctx) {
    const bg = p.imageSource
      ? `<img src="${esc(p.imageSource)}" alt="">`
      : `<div class="cn-bg-ph"></div><div class="cn-bg-ph-tag">사진 자리${p.imagePrompt ? ` · ${esc(p.imagePrompt.slice(0, 28))}${p.imagePrompt.length > 28 ? "…" : ""}` : ""}</div>`;
    // 상단 라벨과 같은 말이면 태그는 생략 (같은 문구 두 번 방지)
    const header = (ctx.brand.categoryLabel ?? ctx.master.brand).toLowerCase();
    const tag = ctx.master.category && !header.includes(ctx.master.category.toLowerCase()) ? ctx.master.category : "";
    return frame(p, ctx, "photo", `
      ${tag ? `<div class="cn-tag">${esc(tag)}</div>` : ""}
      ${text("cn-display", "headline", p.headline, 3, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2)}
      ${text("cn-cover-note", "body", p.body, 2)}`, `${bg}<div class="cn-bg-shade"></div>`);
  },
};
