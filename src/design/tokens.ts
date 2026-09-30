// 디자인 토큰. 레이아웃 컴포넌트는 색/크기/여백 값을 직접 쓰지 않고 여기서 만든 CSS 변수만 쓴다.
// 브랜드별 테마는 이 타입을 채운 객체 하나로 끝난다 (themes/*.ts).

export interface DesignTheme {
  name: string;
  /** 카드 상단 작은 라벨에 쓸 브랜드 표시 이름 */
  brandLabel?: string;
  color: {
    background: string; // 밝은 카드 배경
    surface: string; // 카드 안 박스/칸 배경
    primary: string; // 어두운 카드 배경 (HOOK/CTA)
    secondary: string; // 보조 면 (비교의 왼쪽, 그래프 기본 막대 등)
    text: string;
    textOnPrimary: string;
    muted: string;
    mutedOnPrimary: string;
    accent: string; // visual_focus, 번호, 강조
    accentSoft: string; // 강조 배경
    line: string;
  };
  font: {
    family: string;
    weightBold: number;
    weightHeavy: number;
    weightRegular: number;
  };
  typography: {
    visualFocusSize: number;
    visualFocusUnitRatio: number; // "30개"에서 "개" 크기 비율
    displaySize: number; // 표지 제목
    headlineSize: number;
    subheadlineSize: number;
    bodySize: number;
    itemSize: number;
    captionSize: number;
    headlineLineHeight: number;
    bodyLineHeight: number;
    headlineTracking: string;
  };
  spacing: {
    pagePadding: number;
    sectionGap: number;
    itemGap: number;
    innerPadding: number;
  };
  radius: { card: number; box: number; pill: number };
  border: { width: number };
  shadow: { box: string };
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** 테마 → CSS 변수 */
export function themeToCssVars(t: DesignTheme): string {
  const v: Record<string, string | number> = {
    "--c-bg": t.color.background,
    "--c-surface": t.color.surface,
    "--c-primary": t.color.primary,
    "--c-secondary": t.color.secondary,
    "--c-text": t.color.text,
    "--c-text-on-primary": t.color.textOnPrimary,
    "--c-muted": t.color.muted,
    "--c-muted-on-primary": t.color.mutedOnPrimary,
    "--c-accent": t.color.accent,
    "--c-accent-soft": t.color.accentSoft,
    "--c-line": t.color.line,
    "--font": t.font.family,
    "--w-regular": t.font.weightRegular,
    "--w-bold": t.font.weightBold,
    "--w-heavy": t.font.weightHeavy,
    "--fs-focus": `${t.typography.visualFocusSize}px`,
    "--fs-focus-unit-ratio": t.typography.visualFocusUnitRatio,
    "--fs-display": `${t.typography.displaySize}px`,
    "--fs-headline": `${t.typography.headlineSize}px`,
    "--fs-sub": `${t.typography.subheadlineSize}px`,
    "--fs-body": `${t.typography.bodySize}px`,
    "--fs-item": `${t.typography.itemSize}px`,
    "--fs-caption": `${t.typography.captionSize}px`,
    "--lh-headline": t.typography.headlineLineHeight,
    "--lh-body": t.typography.bodyLineHeight,
    "--tracking-headline": t.typography.headlineTracking,
    "--sp-page": `${t.spacing.pagePadding}px`,
    "--sp-section": `${t.spacing.sectionGap}px`,
    "--sp-item": `${t.spacing.itemGap}px`,
    "--sp-inner": `${t.spacing.innerPadding}px`,
    "--r-card": `${t.radius.card}px`,
    "--r-box": `${t.radius.box}px`,
    "--r-pill": `${t.radius.pill}px`,
    "--bw": `${t.border.width}px`,
    "--shadow-box": t.shadow.box,
  };
  return Object.entries(v).map(([k, val]) => `${k}:${val};`).join("");
}
