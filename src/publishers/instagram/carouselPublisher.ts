// 8. Instagram Carousel Publisher (지시사항 18)
// 파일 순서(01, 02, 03...)를 그대로 유지해서 캐러셀 children에 넣고, 이미지+caption을 함께 업로드한다.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Publisher, PublishResult } from "../PublisherInterface.js";
import type { QueuePost } from "../../types.js";
import { checkInstagramAuth, getInstagramAuthConfig } from "./auth.js";
import { InstagramClient } from "./instagramClient.js";
import { resolvePublicImageUrl, hasImageUrlResolver } from "./imageHost.js";
import { isDryRun } from "../../config.js";
import { logEvent } from "../../logging/logger.js";

export const instagramPublisher: Publisher = {
  platform: "instagram",

  async checkAuth() {
    return checkInstagramAuth();
  },

  async publish(post: QueuePost, images: string[], caption: string): Promise<PublishResult> {
    const dryRun = isDryRun();

    if (dryRun) {
      await logEvent({
        post_id: post.id,
        platform: "instagram",
        event: "publish_succeeded",
        message: `[DRY_RUN] 실제 업로드하지 않음. "${post.title}"이(가) ${post.publish_at}에 업로드될 예정입니다. (이미지 ${images.length}장)`,
      });
      return { ok: true, externalPostId: `dry-run-${post.id}` };
    }

    const authCheck = await checkInstagramAuth();
    if (!authCheck.ok) {
      return { ok: false, errorCode: "AUTH_NOT_READY", errorMessage: authCheck.reason };
    }

    if (!hasImageUrlResolver()) {
      return {
        ok: false,
        errorCode: "NO_IMAGE_HOST",
        errorMessage:
          "이미지를 공개 URL로 업로드하는 어댑터가 없습니다. setImageUrlResolver()를 배포 환경에 맞게 구현해주세요.",
      };
    }

    const auth = getInstagramAuthConfig()!;
    const client = new InstagramClient(auth);

    try {
      const creationIds: string[] = [];
      for (const imgPath of images) {
        const publicUrl = await resolvePublicImageUrl(imgPath);
        const creationId = await client.createCarouselItem(publicUrl);
        creationIds.push(creationId);
      }

      const containerId = await client.createCarouselContainer(creationIds, caption);
      await client.waitUntilReady(containerId);
      const publishedId = await client.publishContainer(containerId);

      return { ok: true, externalPostId: publishedId };
    } catch (err: any) {
      const graphError = err.graphError;
      return {
        ok: false,
        errorCode: graphError?.code ? String(graphError.code) : "PUBLISH_FAILED",
        errorMessage: err.message,
      };
    }
  },
};

/** 큐 항목의 폴더에서 번호 순서대로 이미지 경로 목록을 만든다 (01, 02, 03 ... 순서 보장). */
export async function listOrderedImages(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder);
  const images = entries.filter((f) => /^\d{2}.*\.(png|jpg|jpeg)$/i.test(f)).sort();
  return images.map((f) => path.join(folder, f));
}
