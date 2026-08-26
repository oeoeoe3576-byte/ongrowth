// 4. File Manager
// 생성된 카드뉴스를 지정 폴더에 저장한다 (지시사항 12).
// /cardnews_output/{YYYY-MM-DD}_{slug}/01_cover.png ... 07_cta.png, content.json, caption.txt, metadata.json

import { promises as fs } from "node:fs";
import path from "node:path";
import type { CardnewsContent, QueuePost } from "../types.js";
import type { RenderResult } from "../render/renderCard.js";
import { loadConfig } from "../config.js";

function slugify(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 40);
}

export interface SaveResult {
  folder: string; // 절대 경로
  relativeFolder: string; // repo 기준 상대 경로 (큐/DB에 저장할 때 사용)
  files: string[];
}

export interface SaveOptions {
  publishDate?: Date; // 폴더명에 쓸 날짜 (기본: 오늘)
}

/**
 * 카드뉴스 파일 세트를 저장한다.
 * 파일명 앞에 번호를 붙여 업로드 순서가 꼬이지 않게 한다 (지시사항 12).
 */
export async function saveCardnewsOutput(
  content: CardnewsContent,
  images: RenderResult[],
  caption: string,
  opts?: SaveOptions
): Promise<SaveResult> {
  const cfg = loadConfig();
  const date = opts?.publishDate ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const slug = slugify(content.topic || content.title);
  const folderName = `${dateStr}_${slug}`;

  const outputRoot = path.resolve(process.cwd(), cfg.folders.output_dir);
  const folder = path.join(outputRoot, folderName);
  await fs.mkdir(folder, { recursive: true });

  const files: string[] = [];
  for (const img of images.sort((a, b) => a.index - b.index)) {
    const filePath = path.join(folder, img.filename);
    await fs.writeFile(filePath, img.buffer);
    files.push(img.filename);
  }

  await fs.writeFile(path.join(folder, "content.json"), JSON.stringify(content, null, 2) + "\n", "utf8");
  files.push("content.json");

  await fs.writeFile(path.join(folder, "caption.txt"), caption, "utf8");
  files.push("caption.txt");

  const metadata = {
    content_id: content.content_id,
    title: content.title,
    region: content.region,
    template: content.template,
    slide_count: content.slide_count,
    created_at: content.created_at,
    saved_at: new Date().toISOString(),
    image_files: images.map((i) => i.filename).sort(),
    place_ids: content.places.map((p) => p.place_id),
  };
  await fs.writeFile(path.join(folder, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n", "utf8");
  files.push("metadata.json");

  return {
    folder,
    relativeFolder: path.relative(process.cwd(), folder),
    files,
  };
}

/** 발행 전 폴더 무결성 검사 (지시사항 36: 이미지 누락/순서/파일 손상 체크의 파일시스템 부분) */
export async function verifyOutputFolder(folder: string): Promise<{ ok: boolean; problems: string[] }> {
  const problems: string[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(folder);
  } catch {
    return { ok: false, problems: [`폴더를 찾을 수 없습니다: ${folder}`] };
  }

  const images = entries.filter((f) => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  if (images.length === 0) problems.push("이미지 파일이 없습니다.");

  // 번호 순서 체크: 01, 02, 03 ... 연속이어야 함
  const numbers = images.map((f) => parseInt(f.slice(0, 2), 10)).filter((n) => !Number.isNaN(n));
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] !== i + 1) {
      problems.push(`이미지 순서가 연속되지 않습니다 (${i + 1}번 누락 가능성).`);
      break;
    }
  }

  if (!entries.includes("caption.txt")) problems.push("caption.txt가 없습니다.");
  else {
    const caption = await fs.readFile(path.join(folder, "caption.txt"), "utf8");
    if (!caption.trim()) problems.push("caption.txt가 비어 있습니다.");
  }

  if (!entries.includes("content.json")) problems.push("content.json이 없습니다.");

  for (const img of images) {
    const stat = await fs.stat(path.join(folder, img));
    if (stat.size === 0) problems.push(`파일이 손상되었습니다(0바이트): ${img}`);
  }

  return { ok: problems.length === 0, problems };
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

/**
 * 발행 성공/실패 결과에 따라 폴더를 상태별 디렉터리로 "복사"한다 (지시사항 29).
 * 원본(cardnews_output 또는 publish_inbox)은 절대 삭제/이동하지 않고 그대로 보존한다.
 */
export async function copyToStatusFolder(post: QueuePost, kind: "success" | "failed"): Promise<string> {
  const cfg = loadConfig();
  const destRoot = path.resolve(process.cwd(), kind === "success" ? cfg.folders.success_dir : cfg.folders.failed_dir);
  const destFolder = path.join(destRoot, `${post.id}_${path.basename(post.folder)}`);
  await copyDir(post.folder, destFolder);
  return destFolder;
}
