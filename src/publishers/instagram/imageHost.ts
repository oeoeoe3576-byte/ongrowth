// 8. Instagram은 로컬 파일이 아니라 "공개적으로 접근 가능한 HTTPS 이미지 URL"만 받는다.
// 어떤 호스팅(예: Vercel Blob, S3, Cloudinary 등)을 쓸지는 배포 환경마다 다르므로
// 이 파일은 교체 가능한 어댑터 자리(pluggable resolver)만 제공한다.
// 지시사항 11(이미지 저작권)과도 맞물려, 여기서 무단으로 외부 이미지를 끌어오지 않는다 - 우리가 만든 카드뉴스 PNG만 업로드한다.

export type ImageUrlResolver = (localFilePath: string) => Promise<string>;

let resolver: ImageUrlResolver | null = null;

export function setImageUrlResolver(fn: ImageUrlResolver): void {
  resolver = fn;
}

export async function resolvePublicImageUrl(localFilePath: string): Promise<string> {
  if (!resolver) {
    throw new Error(
      "이미지 호스팅 어댑터가 설정되지 않았습니다. setImageUrlResolver()로 로컬 PNG를 공개 URL로 " +
        "업로드하는 함수를 등록해야 실제 Instagram 발행이 가능합니다 (예: S3/Cloudinary/Vercel Blob)."
    );
  }
  return resolver(localFilePath);
}

export function hasImageUrlResolver(): boolean {
  return resolver !== null;
}
