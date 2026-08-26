// 10. Skill Interface - 자연어/CLI에서 공통으로 쓰는 고수준 함수 모음
// 지시사항 33: "평창 가을 여행지 카드뉴스 만들어줘." → Research→Content→Render→Output 실행
//              "9월 5일 오후 7시에 올려." → Queue 등록까지 진행

import { loadAllPlaces } from "../research/placeLibrary.js";
import { generateContent } from "../content/generateContent.js";
import { renderCardnews } from "../render/renderCard.js";
import { saveCardnewsOutput } from "../files/outputFolder.js";
import { generateCaption } from "../caption/generateCaption.js";
import { enqueue } from "../queue/queueStore.js";
import { upsertCalendarEntry, distributeSchedule } from "../calendar/calendar.js";
import { loadConfig, isReviewMode } from "../config.js";
import { logEvent } from "../logging/logger.js";
import type { CardnewsContent, Place, QueuePost } from "../types.js";

export interface CreateCardnewsParams {
  topic: string;
  region?: string;
  season?: string;
  template?: string;
  cta?: string;
  slideCount?: number;
  candidatePlaces?: Place[]; // 이미 조사해둔 장소를 직접 넘길 수도 있다 (Claude Skill이 WebSearch로 조사한 경우)
}

export interface CreateCardnewsResult {
  content: CardnewsContent;
  folder: string;
  relativeFolder: string;
  caption: string;
}

/** 지역명을 명시하지 않았을 때, 라이브러리에 등록된 지역 중 topic에 포함된 것을 찾는다. */
async function guessRegion(topic: string): Promise<string> {
  const all = await loadAllPlaces();
  const regions = Array.from(new Set(all.map((p) => p.region)));
  const found = regions.find((r) => topic.includes(r) || r.split(" ").some((token) => topic.includes(token)));
  if (found) return found;
  // 마지막 수단: topic의 첫 단어를 지역으로 추정 (예: "평창 가을 여행지 5곳" → "평창")
  return topic.split(/\s+/)[0] ?? topic;
}

export async function createCardnews(params: CreateCardnewsParams): Promise<CreateCardnewsResult> {
  const region = params.region ?? (await guessRegion(params.topic));
  const candidatePlaces = params.candidatePlaces ?? (await loadAllPlaces()).filter((p) => p.region.includes(region) || region.includes(p.region));

  if (candidatePlaces.length === 0) {
    throw new Error(
      `"${region}" 지역에 등록된 검증 장소가 없습니다. 먼저 리서치 단계(WebSearch/공식 출처)로 ` +
        `data/places/*.json에 장소를 등록해주세요 (지시사항 5). 장소명을 지어내지 않습니다.`
    );
  }

  const content = await generateContent({
    topic: params.topic,
    region,
    season: params.season,
    candidatePlaces,
    slideCount: params.slideCount,
    template: params.template,
    cta: params.cta,
  });

  const images = await renderCardnews(content);
  const caption = await generateCaption(content);
  const saveResult = await saveCardnewsOutput(content, images, caption);

  await logEvent({ post_id: content.content_id, platform: "instagram", event: "created", message: saveResult.relativeFolder });

  return { content, folder: saveResult.folder, relativeFolder: saveResult.relativeFolder, caption };
}

export interface ScheduleCardnewsParams {
  folder: string;
  title: string;
  publishAt: string; // ISO, Asia/Seoul 오프셋 포함 권장
  account?: string;
  autoPublish?: boolean; // 생략하면 config.publishing.review_mode의 반대값 사용
}

export async function scheduleCardnews(params: ScheduleCardnewsParams): Promise<QueuePost> {
  const cfg = loadConfig();
  const autoPublish = params.autoPublish ?? !isReviewMode();
  return enqueue({
    title: params.title,
    folder: params.folder,
    platform: "instagram",
    account: params.account ?? cfg.brand.account,
    publishAt: params.publishAt,
    autoPublish,
  });
}

export interface BatchTopic {
  topic: string;
  region?: string;
  season?: string;
}

export interface BatchScheduleOptions {
  startDate: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  intervalDays?: number; // 기본 1 (매일)
  account?: string;
  autoPublish?: boolean;
}

export interface BatchResult {
  topic: string;
  ok: boolean;
  postId?: string;
  publishAt?: string;
  folder?: string;
  error?: string;
}

/** 지시사항 30: "다음 주 국내여행 카드뉴스 7개 만들어줘" 같은 배치 제작 + 날짜 분배 예약. */
export async function batchCreateAndSchedule(topics: BatchTopic[], scheduleOpts: BatchScheduleOptions): Promise<BatchResult[]> {
  const cfg = loadConfig();
  const plan = distributeSchedule(
    topics.map((t) => t.topic),
    {
      startDate: scheduleOpts.startDate,
      hour: scheduleOpts.hour,
      minute: scheduleOpts.minute,
      timezone: cfg.publishing.timezone,
      intervalDays: scheduleOpts.intervalDays,
    }
  );

  const results: BatchResult[] = [];
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const p = plan[i];
    try {
      const created = await createCardnews({ topic: t.topic, region: t.region, season: t.season });
      const post = await scheduleCardnews({
        folder: created.folder,
        title: t.topic,
        publishAt: p.publishAt,
        account: scheduleOpts.account,
        autoPublish: scheduleOpts.autoPublish,
      });
      await upsertCalendarEntry({ date: p.date, topic: t.topic, status: "queued", post_id: post.id });
      results.push({ topic: t.topic, ok: true, postId: post.id, publishAt: p.publishAt, folder: created.folder });
    } catch (err) {
      await upsertCalendarEntry({ date: p.date, topic: t.topic, status: "failed" });
      results.push({ topic: t.topic, ok: false, error: (err as Error).message });
    }
  }
  return results;
}
