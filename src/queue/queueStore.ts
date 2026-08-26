// 6. Publish Queue (지시사항 14, 28)
// JSON 파일 기반 저장소. 함수 시그니처를 유지한 채 이후 실제 DB로 교체 가능하도록 감싼다 (choi 프로젝트의 store.js와 동일한 설계 원칙).

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import type { PostStatus, QueuePost } from "../types.js";
import { logEvent } from "../logging/logger.js";

const QUEUE_FILE = path.resolve(process.cwd(), "data", "queue.json");

async function readAll(): Promise<QueuePost[]> {
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf8");
    return JSON.parse(raw) as QueuePost[];
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(posts: QueuePost[]): Promise<void> {
  await fs.mkdir(path.dirname(QUEUE_FILE), { recursive: true });
  await fs.writeFile(QUEUE_FILE, JSON.stringify(posts, null, 2) + "\n", "utf8");
}

export function computeContentHash(folder: string): string {
  return crypto.createHash("sha256").update(path.resolve(folder)).digest("hex").slice(0, 16);
}

export interface EnqueueParams {
  title: string;
  folder: string;
  platform: "instagram";
  account: string;
  publishAt: string; // ISO
  autoPublish: boolean;
}

/**
 * 큐에 등록한다. 이미 발행됐거나(published) 동일 폴더로 등록된 미종결 게시물이 있으면
 * 중복 등록을 막는다 (지시사항 28: post_id / content hash / publish status 검사).
 */
export async function enqueue(params: EnqueueParams): Promise<QueuePost> {
  const posts = await readAll();
  const contentHash = computeContentHash(params.folder);

  const dup = posts.find(
    (p) => p.content_hash === contentHash && p.status !== "cancelled" && p.status !== "failed"
  );
  if (dup) {
    if (dup.status === "published") {
      throw new Error(`이미 발행된 콘텐츠입니다 (post_id=${dup.id}). 다시 발행하지 않습니다.`);
    }
    return dup; // 이미 큐에 있으면 기존 항목을 그대로 반환 (중복 생성 방지)
  }

  const post: QueuePost = {
    id: `post_${uuid().slice(0, 8)}`,
    title: params.title,
    folder: params.folder,
    platform: params.platform,
    account: params.account,
    publish_at: params.publishAt,
    status: "scheduled",
    retry_count: 0,
    content_hash: contentHash,
    created_at: new Date().toISOString(),
    auto_publish: params.autoPublish,
    approved: params.autoPublish ? true : false,
  };
  posts.push(post);
  await writeAll(posts);
  await logEvent({ post_id: post.id, platform: post.platform, event: "queued", message: `publish_at=${post.publish_at}` });
  return post;
}

export async function listPosts(filter?: { status?: PostStatus }): Promise<QueuePost[]> {
  const posts = await readAll();
  if (filter?.status) return posts.filter((p) => p.status === filter.status);
  return posts;
}

export async function getPost(id: string): Promise<QueuePost | undefined> {
  const posts = await readAll();
  return posts.find((p) => p.id === id);
}

export async function updatePost(id: string, patch: Partial<QueuePost>): Promise<QueuePost> {
  const posts = await readAll();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`post not found: ${id}`);
  posts[idx] = { ...posts[idx], ...patch };
  await writeAll(posts);
  return posts[idx];
}

export async function cancelPost(id: string): Promise<QueuePost> {
  const post = await updatePost(id, { status: "cancelled" });
  await logEvent({ post_id: id, platform: post.platform, event: "cancelled" });
  return post;
}

export async function approvePost(id: string): Promise<QueuePost> {
  return updatePost(id, { approved: true });
}

export async function reschedulePost(id: string, publishAt: string): Promise<QueuePost> {
  const existing = await getPost(id);
  if (existing?.status === "published") {
    throw new Error(`이미 발행된 게시물은 재예약할 수 없습니다 (post_id=${id}). 중복 발행 방지.`);
  }
  return updatePost(id, { publish_at: publishAt, status: "scheduled" });
}
