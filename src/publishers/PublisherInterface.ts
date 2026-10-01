// 8. Publisher 인터페이스 (지시사항 17, 39)
// Instagram 외에 Threads/Facebook/Pinterest/TikTok Photo 로 확장할 수 있도록
// 플랫폼별 구현을 어댑터로 분리한다. 지금은 Instagram만 실제로 구현한다.

import type { QueuePost } from "../types.js";

export interface PublishResult {
  ok: boolean;
  externalPostId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface Publisher {
  platform: string;
  /** 실제 발행 전 인증/설정 상태를 점검한다 (지시사항 36: API 인증 체크). account를 주면 그 계정 기준으로 점검한다. */
  checkAuth(account?: string): Promise<{ ok: boolean; reason?: string }>;
  publish(post: QueuePost, images: string[], caption: string): Promise<PublishResult>;
}
