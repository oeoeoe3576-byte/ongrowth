// layout_type → 레이아웃 컴포넌트. 새 레이아웃은 파일 하나 만들고 여기 등록.
import type { LayoutComponent } from "../types.js";
import type { Layout } from "../../planner/types.js";
import { BigTitleTemplate } from "./bigTitle.js";
import { BigNumberTemplate } from "./bigNumber.js";
import { TextTemplate } from "./text.js";
import { NumberListTemplate } from "./numberList.js";
import { ImageTextTemplate } from "./imageText.js";
import { ScreenshotTemplate } from "./screenshot.js";
import { ThreeColumnTemplate } from "./threeColumn.js";
import { GridTemplate } from "./grid.js";
import { CompareTemplate } from "./compare.js";
import { TimelineTemplate } from "./timeline.js";
import { GraphTemplate } from "./graph.js";
import { ResultTemplate } from "./result.js";
import { CtaTemplate } from "./cta.js";
import { PhotoCoverTemplate } from "./photoCover.js";
import { FollowTemplate } from "./follow.js";

export const LAYOUT_COMPONENTS: Record<Layout, LayoutComponent> = {
  BIG_TITLE: BigTitleTemplate,
  BIG_NUMBER: BigNumberTemplate,
  TEXT: TextTemplate,
  NUMBER_LIST: NumberListTemplate,
  IMAGE_TEXT: ImageTextTemplate,
  SCREENSHOT: ScreenshotTemplate,
  THREE_COLUMN: ThreeColumnTemplate,
  GRID: GridTemplate,
  COMPARE: CompareTemplate,
  TIMELINE: TimelineTemplate,
  GRAPH: GraphTemplate,
  RESULT: ResultTemplate,
  CTA: CtaTemplate,
  PHOTO_COVER: PhotoCoverTemplate,
  FOLLOW: FollowTemplate,
};

/** 모르는 layout_type이면 TEXT로 대신 그리고 fallback=true */
export function resolveLayout(layout: string): { component: LayoutComponent; fallback: boolean } {
  const c = (LAYOUT_COMPONENTS as Record<string, LayoutComponent>)[layout];
  return c ? { component: c, fallback: false } : { component: TextTemplate, fallback: true };
}

export function allLayoutCss(): string {
  return Object.values(LAYOUT_COMPONENTS).map((c) => c.css).join("\n");
}
