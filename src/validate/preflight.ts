// 발행 전 검수 (지시사항 36 안전장치 모음)
// 중복 업로드 방지 / 이미지 누락 / caption 누락 / 업로드 순서 / 예약 시간 / timezone /
// API 인증 / 파일 손상 체크를 발행 직전에 한 번 더 확인한다.

import { DateTime } from "luxon";
import type { QueuePost } from "../types.js";
import { verifyOutputFolder } from "../files/outputFolder.js";
import { getPublisher } from "../publishers/registry.js";
import { loadConfig } from "../config.js";

export interface PreflightResult {
  ok: boolean;
  problems: string[];
}

export async function runPreflight(post: QueuePost): Promise<PreflightResult> {
  const problems: string[] = [];

  if (post.status === "published") {
    problems.push("이미 발행된 게시물입니다 (중복 발행 방지).");
  }
  if (post.status === "cancelled") {
    problems.push("취소된 게시물입니다.");
  }
  if (!post.auto_publish && !post.approved) {
    problems.push("REVIEW 모드이며 아직 사용자 승인(approve)이 되지 않았습니다.");
  }

  const tz = loadConfig().publishing.timezone;
  const publishAt = DateTime.fromISO(post.publish_at, { zone: tz });
  if (!publishAt.isValid) {
    problems.push(`publish_at 형식이 올바르지 않습니다: ${post.publish_at}`);
  }

  const folderCheck = await verifyOutputFolder(post.folder);
  if (!folderCheck.ok) problems.push(...folderCheck.problems);

  try {
    const publisher = getPublisher(post.platform);
    const auth = await publisher.checkAuth();
    // DRY_RUN에서는 인증 미비를 막지 않는다 (실제 업로드를 안 하므로) - 그 외에는 반드시 인증이 되어야 한다.
    if (!auth.ok && (process.env.DRY_RUN ?? "true").toLowerCase() === "false") {
      problems.push(`API 인증 확인 실패: ${auth.reason}`);
    }
  } catch (err) {
    problems.push((err as Error).message);
  }

  return { ok: problems.length === 0, problems };
}
