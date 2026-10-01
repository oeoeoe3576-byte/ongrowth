// 텍스트 검수. 두 단계:
// 1) 정적 검사(Node): 레이아웃별 권장 글자 수 / items 개수 → warning
// 2) 실제 렌더링 검사(브라우저): 줄 수 제한으로 잘린 텍스트, 카드 밖으로 나간 내용 → error
// 폰트를 계속 줄여 억지로 넣지 않는다. 넘치면 알려서 원고를 고치거나 카드를 나누게 한다.

import type { LayoutComponent, RenderPage } from "./types.js";

export type CheckLevel = "error" | "warning" | "info";

export interface CardCheck {
  level: CheckLevel;
  field: string;
  message: string;
}

/** 보이는 글자 수 (강조 표시 ** 제외) */
const len = (s: string) => [...s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\n/g, "")].length;

export const SPLIT_MESSAGE = "이 카드의 내용이 너무 많아 분리하는 것이 좋습니다.";

export function staticChecks(p: RenderPage, c: LayoutComponent, fallback: boolean): CardCheck[] {
  const out: CardCheck[] = [];
  const L = c.limits;
  if (fallback) out.push({ level: "warning", field: "layout_type", message: `알 수 없는 layout_type '${p.layout}' - TEXT 레이아웃으로 표시` });

  const lengthChecks: [string, string, number][] = [
    ["headline", p.headline, L.headline],
    ["subheadline", p.subheadline, L.subheadline],
    ["body", p.body, L.body],
  ];
  let heavy = 0;
  for (const [field, value, limit] of lengthChecks) {
    if (!value) continue;
    if (limit === 0) {
      out.push({ level: "warning", field, message: `${c.name} 레이아웃은 ${field}를 쓰지 않는 것을 권장` });
      heavy++;
    } else if (len(value) > limit) {
      out.push({ level: "warning", field, message: `${field} 권장 길이 초과 (${len(value)}/${limit}자)` });
      heavy++;
    }
  }
  if (!p.headline) out.push({ level: "warning", field: "headline", message: "headline이 비어 있음" });

  if (L.itemsMax === 0 && p.items.length) {
    out.push({ level: "warning", field: "items", message: `${c.name} 레이아웃은 items를 표시하지 않음 (${p.items.length}개 무시됨)` });
  }
  if (L.itemsMax > 0) {
    if (p.items.length < L.itemsMin) out.push({ level: "warning", field: "items", message: `items ${p.items.length}개 - ${c.name}은 ${L.itemsMin}개 이상 권장` });
    if (p.items.length > L.itemsMax) {
      out.push({ level: "warning", field: "items", message: `items가 너무 많음 (${p.items.length}/${L.itemsMax}개)` });
      heavy++;
    }
    p.items.forEach((it, i) => {
      if (len(it) > L.itemChars) {
        out.push({ level: "warning", field: "items", message: `items[${i + 1}] 권장 길이 초과 (${len(it)}/${L.itemChars}자)` });
        heavy++;
      }
    });
  }

  if ((c.name === "BIG_NUMBER" || c.name === "RESULT") && !p.visualFocus) {
    out.push({ level: "warning", field: "visual_focus", message: `${c.name}인데 visual_focus가 없어 크게 보여줄 값이 없음` });
  }
  if (p.visualFocus && len(p.visualFocus) > 6 && (c.name === "BIG_NUMBER" || c.name === "RESULT")) {
    out.push({ level: "warning", field: "visual_focus", message: `visual_focus가 길어 큰 숫자로 보이기 어려움 (${len(p.visualFocus)}자, 6자 이하 권장)` });
  }
  if (c.name === "GRAPH" && p.items.length && !p.items.every((it) => /\d/.test(it))) {
    out.push({ level: "warning", field: "items", message: "그래프 items에 숫자가 없어 수치 없이 상승 막대만 표시" });
  }
  if (c.name === "CTA" && !p.cta) out.push({ level: "warning", field: "cta", message: "CTA 레이아웃인데 cta 문구가 없음" });
  if (c.name === "GRAPH" && (p.imageType === "GRAPH" || p.imageType === "CHART")) {
    out.push({ level: "info", field: "image", message: "그래프는 items 수치로 직접 그림 (별도 이미지 불필요)" });
  } else if (p.imageRequired && !p.imageSource) {
    out.push({ level: "info", field: "image", message: `이미지 준비 필요 (${p.imageType || "IMAGE"}) - 지금은 placeholder로 표시` });
  }
  if (heavy >= 2) out.push({ level: "warning", field: "card", message: SPLIT_MESSAGE });
  return out;
}

/**
 * 브라우저에서 실행되는 overflow 측정. PNG 렌더러(Playwright)와 미리보기 화면이 같은 코드를 쓴다.
 * data-fit 요소의 내용이 상자보다 크면(= 줄 수 제한으로 잘렸거나 카드 밖으로 나감) error.
 */
export const MEASURE_SCRIPT = `
function cnMeasure(root) {
  var labels = { headline: "headline", subheadline: "subheadline", body: "body", items: "items", visual_focus: "visual_focus", cta: "cta", card: "card" };
  return Array.prototype.map.call(root.querySelectorAll('.cn-card'), function (card) {
    var seen = {}; var issues = [];
    card.querySelectorAll('[data-fit]').forEach(function (el) {
      var f = el.getAttribute('data-field') || 'card';
      var over = el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
      if (over && !seen[f]) {
        seen[f] = true;
        issues.push({ level: 'error', field: f, message: (f === 'card' ? '카드 본문이 영역을 넘침' : (labels[f] || f) + ' 텍스트가 잘림 (영역 초과)') + ' - 원고를 줄이거나 카드를 나누세요' });
      }
    });
    return { page: Number(card.getAttribute('data-page')), issues: issues };
  });
}`;
