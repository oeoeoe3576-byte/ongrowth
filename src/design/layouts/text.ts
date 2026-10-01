// TEXT: 일반 정보 전달. headline, (subheadline), body. 위쪽에 모으고 아래는 비워 둔다
import { frame, text, esc } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const TextTemplate: LayoutComponent = {
  name: "TEXT",
  label: "텍스트",
  limits: { headline: 20, subheadline: 34, body: 80, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  css: `
.cn-l-TEXT .cn-main { justify-content: center; gap: 44px; padding-bottom: calc(var(--sp-section) * 3); }
.cn-l-TEXT .cn-headline { font-size: calc(var(--fs-headline) * 1.14); }
.cn-l-TEXT .cn-body { font-size: calc(var(--fs-body) * 1.17); max-width: 860px; color: var(--c-muted); }`,
  tone: (p) => (p.imageSource ? "photo" : "light"),
  render(p, ctx) {
    // 사진이 있으면 카드 전체 배경으로 깔고 글자는 흰색 (썸네일처럼)
    const bg = p.imageSource ? `<img src="${esc(p.imageSource)}" alt=""><div class="cn-bg-shade" style="background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.62) 55%,rgba(0,0,0,.75) 100%)"></div>` : "";
    return frame(p, ctx, this.tone!(p, ctx), `
      <div class="cn-rule"></div>
      ${text("cn-headline", "headline", p.headline, 3, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      ${text("cn-body", "body", p.body, 5, p.visualFocus)}`, bg);
  },
};
