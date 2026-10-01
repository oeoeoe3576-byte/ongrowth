// 8. Instagram Graph API 클라이언트 (지시사항 17, 18)
//
// 공식 Meta Graph API의 Content Publishing / Carousel 플로우를 그대로 따른다:
//   1) 이미지마다 POST /{ig-user-id}/media (is_carousel_item=true) → creation_id
//   2) POST /{ig-user-id}/media (media_type=CAROUSEL, children=[creation_id...], caption) → container_id
//   3) POST /{ig-user-id}/media_publish (creation_id=container_id) → 최종 게시물 id
//
// 주의(지시사항 17): 이 플로우는 구현 시점 기준 잘 알려진 표준 흐름이지만,
// 계정 유형/권한/API 버전/Carousel 지원 여부는 배포 직전에 Meta 공식 문서로 반드시 재확인해야 한다.
// 엔드포인트 URL 조각은 여기(adapter)에만 있고 다른 코드에는 하드코딩하지 않는다.

import type { InstagramAuthConfig } from "./auth.js";

// 토큰 종류에 따라 호스트가 다르다.
// - Instagram 로그인 방식 토큰(IGAA…): graph.instagram.com
// - Facebook 로그인 방식 토큰(EAA…):   graph.facebook.com
// 엔드포인트 경로(/{ig-user-id}/media, /media_publish)는 두 방식이 같다.
const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com";

export function graphBaseFor(accessToken: string): string {
  return accessToken.startsWith("IG") ? INSTAGRAM_GRAPH_BASE : FACEBOOK_GRAPH_BASE;
}

export interface GraphApiError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const url = `${path}`;
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const json = (await res.json()) as { id?: string; error?: GraphApiError };
  if (!res.ok || json.error) {
    const err: GraphApiError = json.error ?? { message: `HTTP ${res.status}` };
    const e = new Error(err.message) as Error & { graphError: GraphApiError };
    e.graphError = err;
    throw e;
  }
  return json;
}

export class InstagramClient {
  constructor(private auth: InstagramAuthConfig) {}

  private endpoint(path: string): string {
    return `${graphBaseFor(this.auth.accessToken)}/${this.auth.graphApiVersion}/${path}`;
  }

  /** 캐러셀 항목 하나(이미지)를 컨테이너로 등록한다. imageUrl은 공개적으로 접근 가능한 HTTPS URL이어야 한다. */
  async createCarouselItem(imageUrl: string): Promise<string> {
    const json = await graphPost(this.endpoint(`${this.auth.accountId}/media`), {
      image_url: imageUrl,
      is_carousel_item: "true",
      access_token: this.auth.accessToken,
    });
    return json.id as string;
  }

  /** 캐러셀 컨테이너를 만든다 (순서는 children 배열 순서를 그대로 따른다). */
  async createCarouselContainer(childrenCreationIds: string[], caption: string): Promise<string> {
    const json = await graphPost(this.endpoint(`${this.auth.accountId}/media`), {
      media_type: "CAROUSEL",
      children: childrenCreationIds.join(","),
      caption,
      access_token: this.auth.accessToken,
    });
    return json.id as string;
  }

  /** 컨테이너를 실제로 게시한다. */
  async publishContainer(creationId: string): Promise<string> {
    const json = await graphPost(this.endpoint(`${this.auth.accountId}/media_publish`), {
      creation_id: creationId,
      access_token: this.auth.accessToken,
    });
    return json.id as string;
  }
}
