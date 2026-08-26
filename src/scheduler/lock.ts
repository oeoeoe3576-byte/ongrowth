// 7. Scheduler - 동일 게시물 중복 실행 방지용 파일 락 (지시사항 16)
// 같은 post_id가 두 번 업로드되는 일이 절대 발생하지 않도록 mkdir(원자적)로 락을 건다.

import { promises as fs } from "node:fs";
import path from "node:path";

const LOCK_DIR = path.resolve(process.cwd(), "data", "locks");
const STALE_MS = 10 * 60 * 1000; // 10분 이상 남아있는 락은 죽은 프로세스의 잔재로 간주하고 회수 가능

export async function acquireLock(postId: string): Promise<boolean> {
  await fs.mkdir(LOCK_DIR, { recursive: true });
  const lockPath = path.join(LOCK_DIR, `${postId}.lock`);
  try {
    await fs.mkdir(lockPath); // 디렉터리 생성은 원자적 - 이미 있으면 EEXIST
    await fs.writeFile(path.join(lockPath, "created_at"), new Date().toISOString(), "utf8");
    return true;
  } catch (err: any) {
    if (err.code !== "EEXIST") throw err;
    // 오래된 락이면 회수
    try {
      const stat = await fs.stat(lockPath);
      if (Date.now() - stat.mtimeMs > STALE_MS) {
        await fs.rm(lockPath, { recursive: true, force: true });
        return acquireLock(postId);
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}

export async function releaseLock(postId: string): Promise<void> {
  const lockPath = path.join(LOCK_DIR, `${postId}.lock`);
  await fs.rm(lockPath, { recursive: true, force: true });
}
