// 8. Publisher Registry - platform 문자열 → Publisher 구현체
import type { Publisher } from "./PublisherInterface.js";
import { instagramPublisher } from "./instagram/carouselPublisher.js";

const registry: Record<string, Publisher> = {
  instagram: instagramPublisher,
  // threads: 추후 publishers/threads/... 로 추가 (지시사항 39)
  // facebook: 추후 추가
  // pinterest: 추후 추가
  // tiktok: 추후 추가
};

export function getPublisher(platform: string): Publisher {
  const p = registry[platform];
  if (!p) throw new Error(`지원하지 않는 플랫폼입니다: ${platform}`);
  return p;
}
