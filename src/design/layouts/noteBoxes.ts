// NOTE_BOXES: 질감 배경 위에 흰 글 상자를 어긋나게 쌓는 스타일. items = 상자 한 칸씩.
// 항목이 "★ "로 시작하면 검정 상자 + 초록 글씨(요점), **구절**은 형광펜 하이라이트.
import { frame, text, esc, rich } from "../parts.js";
import type { LayoutComponent } from "../types.js";

const PAPER = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.012 .02' numOctaves='5' seed='7' result='t'/><feDiffuseLighting in='t' lighting-color='#e3ddd1' surfaceScale='2.2'><feDistantLight azimuth='235' elevation='58'/></feDiffuseLighting></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

const OFFSETS = [0, 40, 12, 60, 24, 48];

export const NoteBoxesTemplate: LayoutComponent = {
  name: "NOTE_BOXES",
  label: "메모 상자",
  limits: { headline: 30, subheadline: 34, body: 0, itemChars: 38, itemsMin: 2, itemsMax: 6 },
  tone: () => "light",
  css: `
.cn-l-NOTE_BOXES .cn-bg-paper { position: absolute; inset: 0; background: #cfc8bb ${PAPER}; background-size: cover; }
.cn-l-NOTE_BOXES .cn-main { justify-content: center; gap: 26px; padding-bottom: calc(var(--sp-section) * 2); }
.cn-l-NOTE_BOXES .cn-notes { display: flex; flex-direction: column; gap: 30px; align-items: flex-start; }
.cn-l-NOTE_BOXES .cn-note { background: #fff; border: 2px solid #15161A; color: #15161A; padding: 32px 40px; font-size: 58px; font-weight: 500; line-height: 1.5; letter-spacing: -0.02em; max-width: 900px; text-wrap: balance; }
.cn-l-NOTE_BOXES .cn-note.head { font-size: 68px; font-weight: 800; }
.cn-l-NOTE_BOXES .cn-note.key { background: #101010; border-color: #101010; color: #B8F28B; font-weight: 800; font-size: 64px; }
.cn-l-NOTE_BOXES .cn-note .cn-em { background: #B8F28B; color: #15161A; padding: 0 .12em; font-weight: 700; }
.cn-l-NOTE_BOXES .cn-note.key .cn-em { background: none; color: #fff; }
.cn-l-NOTE_BOXES .cn-sub { color: #15161A; }`,
  render(p, ctx) {
    const notes = p.items.map((raw, i) => {
      const key = raw.startsWith("★");
      const body = key ? raw.replace(/^★\s*/, "") : raw;
      const off = OFFSETS[(i + (p.headline ? 1 : 0)) % OFFSETS.length];
      return `<div class="cn-note${key ? " key" : ""}" style="margin-left:${off}px" data-fit data-field="items">${rich(body, p.visualFocus)}</div>`;
    }).join("");
    const head = p.headline ? `<div class="cn-notes"><div class="cn-note head" data-field="headline">${rich(p.headline, p.visualFocus)}</div></div>` : "";
    return frame(p, ctx, "light", `
      ${head}
      <div class="cn-notes">${notes}</div>
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}`, `<div class="cn-bg-paper"></div>`);
  },
};
