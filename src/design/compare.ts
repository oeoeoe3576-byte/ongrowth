// 테마 비교 화면: 같은 원고를 여러 테마로 그려 한 줄씩 나란히 보여준다 (디자인 방향 결정용).

import { cardCss, type RenderedContent } from "./renderHtml.js";
import { esc } from "./parts.js";

const THEME_LABEL: Record<string, string> = {
  default: "기본 · 코발트 블루",
  insight: "인사이트 · 검정 + 초록",
  life: "라이프 · 크림 + 갈색 (굵기로 강조)",
  campaign: "캠페인 · 진초록 + 주황 (형광펜 강조)",
};

/** rows: 테마별로 그린 같은 원고 목록 */
export function buildCompareHtml(rows: RenderedContent[][]): string {
  const themes = rows.flat().map((c) => c.theme);
  const sections = rows
    .map((group) => {
      const first = group[0];
      const title = `${first.master.content_id} · ${first.master.topic}`;
      const lines = group
        .map((c) => `<div class="row"><h3>${esc(THEME_LABEL[c.theme.name] ?? c.theme.name)}</h3><div class="strip">${c.cards.map((k) => `<figure><div class="scaler">${k.html}</div><figcaption>${k.page.number} · ${esc(k.component)}</figcaption></figure>`).join("")}</div></div>`)
        .join("");
      return `<section><h2>${esc(title)}</h2>${lines}</section>`;
    })
    .join("");
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>테마 비교</title>
<style>
${cardCss(themes)}
* { box-sizing: border-box; }
body { margin: 0; background: #E9E7E2; color: #18181B; font-family: 'Pretendard', system-ui, sans-serif; }
header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #DDD9D0; padding: 14px 24px; display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap; }
header h1 { margin: 0; font-size: 17px; font-weight: 800; }
header p { margin: 0; color: #71717A; font-size: 13px; }
section { padding: 8px 24px 28px; }
h2 { font-size: 15px; margin: 22px 0 6px; }
.row { margin-top: 14px; }
h3 { font-size: 14px; margin: 0 0 8px; font-weight: 700; }
.strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x proximity; }
figure { margin: 0; flex: 0 0 216px; scroll-snap-align: start; }
figcaption { font-size: 12px; color: #71717A; margin-top: 6px; }
.scaler { position: relative; width: 216px; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.scaler > .cn-card { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: scale(0.2); }
@media (max-width: 700px) { section { padding: 4px 14px 20px; } header { padding: 12px 14px; } figure { flex-basis: 168px; } .scaler { width: 168px; } .scaler > .cn-card { transform: scale(0.155556); } }
</style></head>
<body>
<header><h1>테마 비교</h1><p>같은 원고를 테마만 바꿔 그렸습니다. 가로로 넘겨 보세요.</p></header>
${sections}
</body></html>`;
}
