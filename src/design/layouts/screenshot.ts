// SCREENSHOT: 실제 화면 캡처/후기/증거 자료. 설명을 위에, 화면 틀을 아래에
import { frame, text, imageSlot } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const ScreenshotTemplate: LayoutComponent = {
  name: "SCREENSHOT",
  label: "스크린샷",
  limits: { headline: 20, subheadline: 30, body: 50, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  css: `
.cn-l-SCREENSHOT .cn-main { gap: 24px; padding-top: 40px; padding-bottom: 0; }
.cn-l-SCREENSHOT .cn-body { color: var(--c-muted); font-size: calc(var(--fs-body) * .94); }
.cn-l-SCREENSHOT .cn-shot { flex: 1 1 auto; min-height: 380px; margin: 24px 40px 0; border: var(--bw) solid var(--c-text); border-bottom: 0; border-radius: var(--r-box) var(--r-box) 0 0; background: var(--c-surface); display: flex; flex-direction: column; overflow: hidden; }
.cn-l-SCREENSHOT .cn-shot-bar { height: 44px; flex: 0 0 auto; border-bottom: var(--bw) solid var(--c-line); display: flex; align-items: center; gap: 10px; padding: 0 20px; }
.cn-l-SCREENSHOT .cn-shot-bar i { width: 12px; height: 12px; border-radius: 50%; background: var(--c-line); }
.cn-l-SCREENSHOT .cn-image { flex: 1; border-radius: 0; border: 0; }`,
  render(p, ctx) {
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      ${text("cn-body", "body", p.body, 3, p.visualFocus)}
      <div class="cn-shot"><div class="cn-shot-bar"><i></i><i></i><i></i></div>${imageSlot({ ...p, imageType: p.imageType || "SCREENSHOT" })}</div>`);
  },
};
