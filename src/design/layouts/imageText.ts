// IMAGE_TEXT: 이미지 + 설명. 이미지가 없으면 placeholder
import { frame, text, imageSlot } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const ImageTextTemplate: LayoutComponent = {
  name: "IMAGE_TEXT",
  label: "이미지 + 텍스트",
  limits: { headline: 20, subheadline: 30, body: 50, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: (p) => (p.role === "HOOK" ? "dark" : "light"),
  css: `
.cn-l-IMAGE_TEXT .cn-main { gap: 32px; padding-top: 36px; }
.cn-l-IMAGE_TEXT .cn-image { flex: 1 1 auto; min-height: 420px; }
.cn-l-IMAGE_TEXT .cn-textblock { display: flex; flex-direction: column; gap: 20px; flex: 0 0 auto; }
.cn-l-IMAGE_TEXT .cn-body { color: var(--c-muted); }`,
  render(p, ctx) {
    return frame(p, ctx, this.tone!(p, ctx), `
      ${imageSlot(p)}
      <div class="cn-textblock">
        ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
        ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
        ${text("cn-body", "body", p.body, 3)}
      </div>`);
  },
};
