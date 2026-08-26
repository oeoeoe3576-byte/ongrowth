// 시스템 전역에서 공유하는 타입 정의
// (지시사항 5, 8, 14, 30, 31의 데이터 스키마를 코드로 옮긴 것)

export type VerificationStatus = "verified" | "verification_required";

/** 지시사항 5의 여행 정보 조사 스키마 */
export interface Place {
  place_id: string;
  place_name: string;
  region: string;
  address: string;
  category: PlaceCategory;
  description: string;
  opening_hours: string;
  price: string;
  parking: string;
  recommended_season: string;
  rating?: number; // 맛집/카페인 경우에만 사용 (지시사항 7)
  status: "open" | "temporarily_closed" | "permanently_closed" | "unknown";
  source: string; // 출처 URL 또는 명칭
  checked_at: string; // ISO date, 사실 확인 시각
  verification: VerificationStatus;
}

export type PlaceCategory =
  | "관광지"
  | "축제"
  | "맛집"
  | "카페"
  | "숙소"
  | "여행코스"
  | "드라이브코스"
  | "꽃명소"
  | "단풍명소"
  | "바다"
  | "계곡"
  | "캠핑"
  | "데이트"
  | "가족여행";

/** 지시사항 8의 카드뉴스 콘텐츠 JSON 스키마 */
export interface CardnewsSlide {
  index: number; // 1부터 시작, 파일명 번호와 동일
  type: "cover" | "place" | "cta";
  headline?: string;
  subheadline?: string;
  place_id?: string;
  place_name?: string;
  region?: string;
  description?: string;
  extra?: {
    address?: string;
    opening_hours?: string;
    price?: string;
    parking?: string;
    highlight?: string;
  };
  image?: string; // 이미지 소스 경로/URL (섹션11) - 비어있으면 배경색 템플릿 사용
  image_source?: string; // 이미지 출처 (섹션11: 각 이미지에 출처 정보 저장)
}

export interface CardnewsContent {
  content_id: string;
  title: string;
  topic: string;
  region: string;
  template: string;
  slide_count: number;
  cta: string;
  created_at: string;
  places: Place[]; // 실제로 소개한 장소 (검증된 것만)
  slides: CardnewsSlide[];
}

/** 지시사항 14의 예약 발행 Queue 아이템 */
export type PostStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export interface QueuePost {
  id: string;
  title: string;
  folder: string; // cardnews_output/{date}_{slug} 절대/상대 경로
  platform: "instagram"; // 향후 threads/facebook/pinterest/tiktok 확장 (섹션39)
  account: string;
  publish_at: string; // ISO 8601, Asia/Seoul 기준으로 해석
  status: PostStatus;
  retry_count: number;
  content_hash: string; // 중복 발행 방지 (섹션28)
  created_at: string;
  published_at?: string;
  next_retry_at?: string;
  last_error?: string;
  auto_publish: boolean; // true=AUTO, false=REVIEW(승인 필요)
  approved?: boolean; // REVIEW 모드에서 사람이 승인했는지
}

/** 지시사항 13의 publish_inbox 하위 폴더 안 publish.json 스키마 */
export interface InboxPublishConfig {
  platform: "instagram";
  account: string;
  publish_at: string;
  title?: string;
  auto_publish?: boolean;
}

/** 지시사항 31의 콘텐츠 캘린더 항목 */
export interface CalendarEntry {
  date: string; // YYYY-MM-DD
  topic: string;
  status: "planned" | "generated" | "queued" | "published" | "failed";
  post_id?: string;
}

/** 지시사항 27의 로그 레코드 */
export interface LogRecord {
  timestamp: string;
  post_id: string;
  platform: string;
  event:
    | "created"
    | "queued"
    | "publish_started"
    | "publish_succeeded"
    | "publish_failed"
    | "retry_scheduled"
    | "cancelled";
  message?: string;
  error_code?: string;
  retry_count?: number;
}
