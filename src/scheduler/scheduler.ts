// 7. Scheduler (지시사항 16, 26)
// now(Asia/Seoul) >= publish_at && status == 'scheduled' 인 게시물을 찾아 Publisher를 호출한다.
// 동일 post_id에 락을 걸어 중복 업로드를 절대 방지한다.

import path from "node:path";
import { DateTime } from "luxon";
import { listPosts, updatePost } from "../queue/queueStore.js";
import { acquireLock, releaseLock } from "./lock.js";
import { getPublisher } from "../publishers/registry.js";
import { listOrderedImages } from "../publishers/instagram/carouselPublisher.js";
import { runPreflight } from "../validate/preflight.js";
import { computeNextRetryAt, nextRetryDelayMinutes } from "../logging/retry.js";
import { logEvent } from "../logging/logger.js";
import { copyToStatusFolder } from "../files/outputFolder.js";
import { loadConfig } from "../config.js";
import { promises as fs } from "node:fs";

function isDue(publishAtIso: string, timezone: string): boolean {
  const publishAt = DateTime.fromISO(publishAtIso, { zone: timezone });
  if (!publishAt.isValid) return false;
  return DateTime.now().setZone(timezone) >= publishAt;
}

export interface TickSummary {
  checked: number;
  published: number;
  retried: number;
  failed: number;
  skipped: number;
}

/** 스케줄러가 한 번 큐를 훑는 단위 동작. cron/poll 루프가 이 함수를 주기적으로 호출한다. */
export async function tick(): Promise<TickSummary> {
  const cfg = loadConfig();
  const tz = cfg.publishing.timezone;
  const summary: TickSummary = { checked: 0, published: 0, retried: 0, failed: 0, skipped: 0 };

  const due = (await listPosts({ status: "scheduled" })).filter((p) => isDue(p.publish_at, tz));
  const retryDue = (await listPosts({ status: "failed" })).filter(
    (p) => p.next_retry_at && isDue(p.next_retry_at, tz) && nextRetryDelayMinutes(p.retry_count) !== null
  );

  for (const post of [...due, ...retryDue]) {
    summary.checked++;

    const locked = await acquireLock(post.id);
    if (!locked) {
      summary.skipped++;
      continue; // 다른 스케줄러 인스턴스가 이미 처리 중 - 절대 동시 발행하지 않는다
    }

    try {
      const preflight = await runPreflight(post);
      if (!preflight.ok) {
        summary.skipped++;
        await logEvent({
          post_id: post.id,
          platform: post.platform,
          event: "publish_failed",
          message: `preflight 실패: ${preflight.problems.join("; ")}`,
        });
        continue;
      }

      await updatePost(post.id, { status: "publishing" });
      await logEvent({ post_id: post.id, platform: post.platform, event: "publish_started" });

      const publisher = getPublisher(post.platform);
      const images = await listOrderedImages(post.folder);
      const captionPath = path.join(post.folder, "caption.txt");
      const caption = await fs.readFile(captionPath, "utf8");

      const result = await publisher.publish(post, images, caption);

      if (result.ok) {
        await updatePost(post.id, {
          status: "published",
          published_at: new Date().toISOString(),
          last_error: undefined,
        });
        await logEvent({
          post_id: post.id,
          platform: post.platform,
          event: "publish_succeeded",
          message: result.externalPostId,
        });
        await copyToStatusFolder(post, "success");
        summary.published++;
      } else {
        const nextRetryCount = post.retry_count + 1;
        const nextRetryAt = computeNextRetryAt(post.retry_count);
        if (nextRetryAt) {
          await updatePost(post.id, {
            status: "failed",
            retry_count: nextRetryCount,
            next_retry_at: nextRetryAt,
            last_error: result.errorMessage,
          });
          await logEvent({
            post_id: post.id,
            platform: post.platform,
            event: "retry_scheduled",
            message: `${result.errorCode}: ${result.errorMessage}`,
            retry_count: nextRetryCount,
          });
          summary.retried++;
        } else {
          await updatePost(post.id, {
            status: "failed",
            retry_count: nextRetryCount,
            next_retry_at: undefined,
            last_error: result.errorMessage,
          });
          await logEvent({
            post_id: post.id,
            platform: post.platform,
            event: "publish_failed",
            message: `최종 실패(재시도 소진): ${result.errorCode}: ${result.errorMessage}`,
            retry_count: nextRetryCount,
          });
          await copyToStatusFolder(post, "failed");
          summary.failed++;
        }
      }
    } finally {
      await releaseLock(post.id);
    }
  }

  return summary;
}
