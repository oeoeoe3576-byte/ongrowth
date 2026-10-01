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

// Facebook 로그인 토큰(EAA…)은 graph.facebook.com, Instagram 로그인 토큰(IGAA…)은 graph.instagram.com
export function graphBaseFor(accessToken: string): string {
  return process.env.META_GRAPH_HOST
    ? `https://${process.env.META_GRAPH_HOST}`
    : accessToken.startsWith("IG")
      ? "https://graph.instagram.com"
      : "https://graph.facebook.com";
}

export interface GraphApiError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  return graphCall(path, { method: "POST", body: new URLSearchParams(params) });
}

async function graphCall(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
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

  /** 토큰 확인용: 토큰 주인 계정 */
  async me(): Promise<{ id: string; username?: string; user_id?: string }> {
    const q = new URLSearchParams({ fields: "id,username,user_id", access_token: this.auth.accessToken });
    return graphCall(`${this.endpoint("me")}?${q}`);
  }

  /** 컨테이너 처리 상태: IN_PROGRESS / FINISHED / ERROR / EXPIRED / PUBLISHED */
  async containerStatus(containerId: string): Promise<string> {
    const q = new URLSearchParams({ fields: "status_code", access_token: this.auth.accessToken });
    const json = await graphCall(`${this.endpoint(containerId)}?${q}`);
    return json.status_code as string;
  }

  /** 컨테이너가 FINISHED가 될 때까지 기다린다 (이미지는 보통 몇 초) */
  async waitUntilReady(containerId: string, tries = 20, intervalMs = 3000): Promise<void> {
    for (let i = 0; i < tries; i++) {
      const status = await this.containerStatus(containerId);
      if (status === "FINISHED") return;
      if (status === "ERROR" || status === "EXPIRED") throw new Error(`컨테이너 ${containerId} 처리 실패: ${status}`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`컨테이너 ${containerId}가 ${(tries * intervalMs) / 1000}초 안에 준비되지 않음`);
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

  /**
   * 컨테이너를 실제로 게시한다.
   * 처리 완료(FINISHED) 직후에도 'Media ID is not available'(code 9007)이 나올 수 있다 (아직 게시 준비 전).
   * 이 오류는 게시가 일어나지 않은 상태라 같은 컨테이너로 잠시 뒤 다시 시도해도 중복 게시되지 않는다.
   */
  async publishContainer(creationId: string, tries = 8, intervalMs = 15000): Promise<string> {
    for (let i = 0; ; i++) {
      try {
        const json = await graphPost(this.endpoint(`${this.auth.accountId}/media_publish`), {
          creation_id: creationId,
          access_token: this.auth.accessToken,
        });
        return json.id as string;
      } catch (e) {
        const g = (e as { graphError?: GraphApiError }).graphError;
        const notReady = g?.code === 9007 || /Media ID is not available/i.test(g?.message ?? (e as Error).message);
        if (!notReady || i >= tries - 1) {
          if (g) (e as Error).message = `${(e as Error).message} (code ${g.code ?? "?"}${g.error_subcode ? `/${g.error_subcode}` : ""})`;
          throw e;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
  }
}
