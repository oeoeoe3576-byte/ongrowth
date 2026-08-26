// 6. Inbox 방식 (지시사항 13)
// /publish_inbox/{폴더}/ 에 01.png ... caption.txt, publish.json 을 넣어두면 자동으로 큐에 등록한다.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { InboxPublishConfig } from "../types.js";
import { loadConfig } from "../config.js";
import { enqueue } from "./queueStore.js";
import { verifyOutputFolder } from "../files/outputFolder.js";
import { logEvent } from "../logging/logger.js";

export interface InboxScanResult {
  folder: string;
  status: "queued" | "already_queued" | "invalid" | "error";
  detail: string;
}

export async function scanInbox(): Promise<InboxScanResult[]> {
  const cfg = loadConfig();
  const inboxRoot = path.resolve(process.cwd(), cfg.folders.inbox_dir);

  let entries: string[] = [];
  try {
    entries = (await fs.readdir(inboxRoot, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const results: InboxScanResult[] = [];
  for (const name of entries) {
    const folder = path.join(inboxRoot, name);
    const publishJsonPath = path.join(folder, "publish.json");

    let publishConfig: InboxPublishConfig;
    try {
      const raw = await fs.readFile(publishJsonPath, "utf8");
      publishConfig = JSON.parse(raw) as InboxPublishConfig;
    } catch {
      results.push({ folder, status: "invalid", detail: "publish.json이 없거나 JSON 파싱에 실패했습니다." });
      continue;
    }

    const verification = await verifyOutputFolder(folder);
    if (!verification.ok) {
      results.push({ folder, status: "invalid", detail: verification.problems.join("; ") });
      continue;
    }

    try {
      const post = await enqueue({
        title: publishConfig.title ?? name,
        folder,
        platform: publishConfig.platform,
        account: publishConfig.account,
        publishAt: publishConfig.publish_at,
        autoPublish: publishConfig.auto_publish ?? false,
      });
      await logEvent({ post_id: post.id, platform: post.platform, event: "queued", message: `inbox: ${folder}` });
      results.push({ folder, status: "queued", detail: post.id });
    } catch (err) {
      results.push({ folder, status: "error", detail: (err as Error).message });
    }
  }

  return results;
}
