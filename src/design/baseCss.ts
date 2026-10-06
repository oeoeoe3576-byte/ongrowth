// 모든 레이아웃이 공유하는 CSS: 폰트, 카드 틀, 글자 위계, 강조, 이미지 자리, 줄 수 제한.
// 값은 전부 토큰 변수(var(--…))로만 쓴다.

import fs from "node:fs";
import { createRequire } from "node:module";
import { CARD_WIDTH, CARD_HEIGHT } from "./tokens.js";

let fontCache: string | null = null;

/** Pretendard(OFL)를 data URL로 넣는다. 파일 하나로 열어도 한글 폰트가 같게 보이도록 */
export function fontFaceCss(): string {
  if (fontCache !== null) return fontCache;
  try {
    const require = createRequire(import.meta.url);
    const file = require.resolve("pretendard/dist/web/variable/woff2/PretendardVariable.woff2");
    const b64 = fs.readFileSync(file).toString("base64");
    fontCache = `@font-face{font-family:'Pretendard';font-weight:45 920;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    // 손글씨 느낌의 작은 문구(친구 태그 등)용 나눔펜스크립트(OFL)
    const pen = require.resolve("@fontsource/nanum-pen-script/files/nanum-pen-script-korean-400-normal.woff2");
    fontCache += `@font-face{font-family:'Nanum Pen Script';font-weight:400;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(pen).toString("base64")}) format('woff2');}`;
  } catch {
    fontCache = ""; // 폰트 패키지가 없으면 시스템 한글 폰트로 대체
  }
  return fontCache;
}

export const BASE_CSS = `
.cn-card, .cn-card * { box-sizing: border-box; margin: 0; padding: 0; }
.cn-card {
  width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; position: relative; overflow: hidden;
  display: grid; grid-template-rows: auto 1fr auto;
  padding: calc(var(--sp-page) * 0.72) var(--sp-page) calc(var(--sp-page) * 0.66);
  font-family: var(--font); font-weight: var(--w-regular);
  background: var(--c-bg); color: var(--c-text);
  word-break: keep-all; overflow-wrap: anywhere; text-wrap: pretty;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  border-radius: var(--r-card);
}
.cn-display, .cn-headline, .cn-sub, .cn-col-title, .cn-cell-title { text-wrap: balance; }
.cn-card.cn-tone-dark { background: var(--c-primary); color: var(--c-text-on-primary); --c-accent: var(--c-accent-dark); --c-muted: var(--c-muted-on-primary); --c-line: rgba(255,255,255,.16); --c-surface: rgba(255,255,255,.06); }

/* 상단 / 하단 공통 */
.cn-top { display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-caption); font-weight: var(--w-bold); letter-spacing: .02em; }
.cn-brand { text-transform: uppercase; letter-spacing: .12em; }
.cn-pn { font-variant-numeric: tabular-nums; }
.cn-pn-total { color: var(--c-muted); font-weight: var(--w-regular); }
.cn-foot { display: flex; align-items: center; gap: 32px; }
.cn-progress { flex: 1; display: flex; gap: 8px; }
.cn-progress i { flex: 1; height: 4px; border-radius: 2px; background: var(--c-line); }
.cn-progress i.on { background: currentColor; }
.cn-swipe { font-size: var(--fs-caption); font-weight: var(--w-bold); color: var(--c-muted); white-space: nowrap; }

/* 본문 영역: 이 밖으로 나가면 잘리고 검수기가 overflow로 잡는다 */
.cn-main { min-height: 0; overflow: hidden; display: flex; flex-direction: column; padding: var(--sp-section) 0; }

/* 글자 위계: visual_focus > display/headline > sub > body > caption */
.cn-display { font-size: var(--fs-display); font-weight: var(--w-display); line-height: 1.16; letter-spacing: var(--tracking-headline); }
.cn-headline { font-size: var(--fs-headline); font-weight: var(--w-display); line-height: var(--lh-headline); letter-spacing: var(--tracking-headline); }
.cn-sub { font-size: var(--fs-sub); font-weight: var(--w-bold); line-height: 1.45; color: var(--c-muted); letter-spacing: -0.015em; }
.cn-body { font-size: var(--fs-body); line-height: var(--lh-body); letter-spacing: -0.01em; }
.cn-caption { font-size: var(--fs-caption); font-weight: var(--w-bold); color: var(--c-muted); letter-spacing: .04em; }
.cn-kicker { font-size: var(--fs-caption); font-weight: var(--w-heavy); color: var(--c-accent); letter-spacing: .08em; text-transform: uppercase; }
.cn-hl { font-style: normal; color: var(--c-accent); }
.cn-em { font-weight: var(--em-weight); color: var(--em-color); background: var(--em-bg); padding: 0 .04em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.cn-tone-dark .cn-em, .cn-tone-photo .cn-em { background: none; color: var(--em-color-dark); }
/* 강조색 면(버튼, 비교 오른쪽) 위의 강조는 글자색을 그대로 */
.cn-on-accent .cn-em { color: inherit; background: none; }

/* 사진 배경 (카드 전체) */
.cn-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.cn-bg img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cn-bg-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 38%, rgba(0,0,0,.62) 72%, rgba(0,0,0,.84) 100%); }
.cn-bg-ph { position: absolute; inset: 0; background: radial-gradient(120% 80% at 30% 20%, #4a4f57 0%, #22252a 55%, #121315 100%); }
.cn-bg-ph-tag { position: absolute; left: 50%; top: 36%; transform: translate(-50%,-50%); font-size: var(--fs-caption); font-weight: var(--w-heavy); color: rgba(255,255,255,.7); letter-spacing: .06em; padding: 12px 26px; border: 2px dashed rgba(255,255,255,.35); border-radius: var(--r-pill); white-space: nowrap; }
.cn-card > .cn-top, .cn-card > .cn-main, .cn-card > .cn-foot { position: relative; z-index: 1; }
.cn-card.cn-tone-photo { background: #000; color: #FFFFFF; --c-accent: var(--c-accent-dark); --c-muted: rgba(255,255,255,.78); --c-line: rgba(255,255,255,.28); --c-surface: rgba(255,255,255,.12); }
.cn-tone-photo .cn-top, .cn-tone-photo .cn-swipe { text-shadow: 0 1px 8px rgba(0,0,0,.35); }
.cn-rule { width: 72px; height: 6px; background: var(--c-accent); border-radius: 3px; }

/* 줄 수 제한 (폰트를 줄이지 않고 자른 뒤 경고) */
.cn-fit { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--lines); overflow: hidden; }

/* 큰 숫자 */
.cn-focus { font-size: var(--fs-focus); font-weight: var(--w-heavy); line-height: 1.22; letter-spacing: -0.05em; color: var(--c-accent); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; display: flex; align-items: baseline; }
.cn-focus-unit { font-size: calc(var(--fs-focus) * var(--fs-focus-unit-ratio)); letter-spacing: -0.02em; margin-left: .06em; }

/* 이미지 / placeholder */
.cn-image { position: relative; border-radius: var(--r-box); overflow: hidden; background: var(--c-secondary); min-height: 0; }
.cn-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cn-ph { border: var(--bw) dashed var(--c-line); background:
  repeating-linear-gradient(135deg, transparent 0 22px, rgba(0,0,0,.035) 22px 23px), var(--c-surface); }
.cn-tone-dark .cn-ph { background: repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,.05) 22px 23px), rgba(255,255,255,.04); }
.cn-ph-inner { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; padding: 48px; text-align: center; }
.cn-ph-tag { font-size: var(--fs-caption); font-weight: var(--w-heavy); color: var(--c-muted); letter-spacing: .06em; padding: 10px 22px; border: var(--bw) solid var(--c-line); border-radius: var(--r-pill); }
.cn-ph-desc { font-size: 24px; line-height: 1.5; color: var(--c-muted); max-width: 640px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }

/* 번호 뱃지 */
.cn-num { font-weight: var(--w-heavy); color: var(--c-accent); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
`;
