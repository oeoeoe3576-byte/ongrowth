// COMPARE: 좌/우 비교. items는 "라벨: 내용" 형식. 첫 라벨 = 왼쪽, 둘째 라벨 = 오른쪽
import { frame, text, esc, rich, splitItem } from "../parts.js";
import type { LayoutComponent, RenderPage } from "../types.js";

export function compareSides(p: RenderPage): { left: { label: string; lines: string[] }; right: { label: string; lines: string[] } } {
  const groups: { label: string; lines: string[] }[] = [];
  for (const it of p.items) {
    const { title, desc } = splitItem(it);
    const label = desc ? title : "";
    const line = desc || title;
    const g = groups.find((x) => x.label === label) ?? (groups.push({ label, lines: [] }), groups[groups.length - 1]);
    g.lines.push(line);
  }
  if (groups.length === 1 && groups[0].lines.length >= 2) {
    // 라벨이 없으면 앞 절반 / 뒤 절반
    const half = Math.ceil(groups[0].lines.length / 2);
    return { left: { label: "", lines: groups[0].lines.slice(0, half) }, right: { label: "", lines: groups[0].lines.slice(half) } };
  }
  return { left: groups[0] ?? { label: "", lines: [] }, right: groups[1] ?? { label: "", lines: [] } };
}

export const CompareTemplate: LayoutComponent = {
  name: "COMPARE",
  label: "비교",
  limits: { headline: 20, subheadline: 30, body: 40, itemChars: 26, itemsMin: 2, itemsMax: 6 },
  css: `
.cn-l-COMPARE .cn-main { gap: 28px; padding-top: calc(var(--sp-section) * 1.2); }
.cn-l-COMPARE .cn-vs { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: auto 0; flex: 0 1 auto; min-height: 520px; max-height: 820px; }
.cn-l-COMPARE .cn-side { border-radius: var(--r-box); padding: 52px 40px; display: flex; flex-direction: column; gap: 36px; overflow: hidden; }
.cn-l-COMPARE .cn-side.left { background: var(--c-secondary); }
.cn-l-COMPARE .cn-side.right { background: var(--c-accent); color: var(--c-on-accent); }
.cn-l-COMPARE .cn-side-label { font-size: 48px; font-weight: var(--w-heavy); letter-spacing: .02em; padding-bottom: 20px; border-bottom: var(--bw) solid currentColor; opacity: .9; }
.cn-l-COMPARE .cn-side ul { list-style: none; display: flex; flex-direction: column; gap: 32px; }
.cn-l-COMPARE .cn-side li { text-wrap: balance; font-size: 48px; font-weight: var(--w-bold); line-height: 1.4; letter-spacing: -0.015em; }
.cn-l-COMPARE .cn-side.left li { color: var(--c-muted); }
.cn-l-COMPARE .cn-vs-badge { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 84px; height: 84px; border-radius: 50%; background: var(--c-bg); color: var(--c-text); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: var(--w-heavy); border: var(--bw) solid var(--c-text); }
.cn-l-COMPARE .cn-body { color: var(--c-muted); }`,
  render(p, ctx) {
    const { left, right } = compareSides(p);
    const side = (cls: string, s: { label: string; lines: string[] }, fallback: string) =>
      `<div class="cn-side ${cls}" data-fit data-field="items"><div class="cn-side-label">${esc(s.label || fallback)}</div><ul>${s.lines.map((l) => `<li class="cn-fit" style="--lines:3">${rich(l)}</li>`).join("")}</ul></div>`;
    return frame(p, ctx, "light", `
      ${text("cn-headline", "headline", p.headline, 2, p.visualFocus)}
      ${text("cn-sub", "subheadline", p.subheadline, 2, p.visualFocus)}
      <div class="cn-vs">${side("left", left, "A")}${side("right cn-on-accent", right, "B")}<div class="cn-vs-badge">VS</div></div>
      ${text("cn-body", "body", p.body, 2, p.visualFocus)}`);
  },
};
