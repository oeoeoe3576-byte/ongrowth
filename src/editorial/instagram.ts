// 카드뉴스 → 인스타그램 캐러셀 자동 발행.
// 인스타그램 API는 공개 HTTPS 이미지 URL만 받으므로, JPEG를 저장소(public)의 data/publish/<id>/에 커밋·푸시하고
// raw.githubusercontent.com의 커밋 고정 주소를 넘긴다 (커밋 SHA 주소라 나중에 파일이 바뀌어도 그대로).
// 토큰·계정 ID는 환경 변수(META_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID)로만 읽는다.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { InstagramClient } from "../publishers/instagram/instagramClient.js";
import type { InstagramAuthConfig } from "../publishers/instagram/auth.js";

export const IMAGE_DIR = path.resolve("data/publish");
const CAROUSEL_MAX = 10;
const CAPTION_MAX = 2200;
const HASHTAG_MAX = 30;

export function igAuthFromEnv(): InstagramAuthConfig {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accountId || !accessToken) {
    throw new Error("환경 변수 META_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID가 없음 (환경 설정에 넣은 뒤 새 세션에서 실행)");
  }
  return { accountId, accessToken, graphApiVersion: process.env.META_GRAPH_API_VERSION || "v23.0" };
}

export function buildCaption(caption: string, hashtags: string): string {
  const tags = hashtags.split(/\s+/).filter((t) => t.startsWith("#")).slice(0, HASHTAG_MAX).join(" ");
  const text = tags ? `${caption.trim()}\n\n${tags}` : caption.trim();
  if (text.length > CAPTION_MAX) throw new Error(`캡션이 ${CAPTION_MAX}자를 넘음 (${text.length}자)`);
  return text;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

/** JPEG를 data/publish/<id>/로 복사해 커밋·푸시하고, 커밋 고정 raw URL 목록을 돌려준다 */
export function hostImages(contentId: string, jpegs: string[]): string[] {
  if (!jpegs.length) throw new Error("발행할 이미지가 없음");
  if (jpegs.length > CAROUSEL_MAX) throw new Error(`캐러셀은 ${CAROUSEL_MAX}장까지 (${jpegs.length}장)`);
  const dir = path.join(IMAGE_DIR, contentId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const names = jpegs.map((f) => {
    fs.copyFileSync(f, path.join(dir, path.basename(f)));
    return path.basename(f);
  });
  const rel = path.relative(process.cwd(), dir);
  git("add", rel);
  if (git("status", "--porcelain", "--", rel)) git("commit", "-m", `발행 이미지 ${contentId}`, "--", rel);
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  git("push", "-u", "origin", branch);
  const sha = git("rev-parse", "HEAD");
  const repo = git("remote", "get-url", "origin").replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/^git@github\.com:/, "");
  return names.map((n) => `https://raw.githubusercontent.com/${repo}/${sha}/${rel.split(path.sep).join("/")}/${n}`);
}

/** raw URL이 실제로 열리는지 (푸시 직후 잠깐 404일 수 있음) */
export async function waitForUrls(urls: string[], tries = 10): Promise<void> {
  for (const url of urls) {
    for (let i = 0; ; i++) {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) break;
      if (i >= tries) throw new Error(`이미지 주소가 열리지 않음 (${res.status}): ${url}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function publishCarousel(urls: string[], caption: string, log: (s: string) => void = console.log): Promise<string> {
  const client = new InstagramClient(igAuthFromEnv());
  const children: string[] = [];
  for (const [i, url] of urls.entries()) {
    children.push(await client.createCarouselItem(url));
    log(`  이미지 ${i + 1}/${urls.length} 등록`);
  }
  for (const id of children) await client.waitUntilReady(id);
  const container = await client.createCarouselContainer(children, caption);
  await client.waitUntilReady(container);
  return client.publishContainer(container);
}

export async function checkInstagram(): Promise<string> {
  const auth = igAuthFromEnv();
  const me = await new InstagramClient(auth).me();
  const id = me.user_id ?? me.id;
  return `@${me.username ?? "?"} (id ${id})${id !== auth.accountId && me.id !== auth.accountId ? ` ⚠ INSTAGRAM_ACCOUNT_ID(${auth.accountId})와 다름` : ""}`;
}
