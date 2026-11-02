// 앱을 Live로 바꿀 때 Meta가 요구하는 개인정보처리방침·데이터 삭제 안내 페이지(무료, 같은 Vercel 배포).
// /api/privacy  → Meta 앱 설정의 "개인정보처리방침 URL"과 "데이터 삭제 안내 URL"에 넣는다.
export async function GET(): Promise<Response> {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>개인정보 처리 안내</title><style>body{font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;line-height:1.7;color:#111;background:#fff}</style></head><body>
<h1>개인정보 처리 안내</h1>
<p>이 앱은 운영자 본인의 인스타그램 계정 게시물에 달린 댓글에 답글을 달고, 댓글 작성자에게 요청한 링크를 인스타그램 메시지(비공개 답장)로 한 번 보내는 용도로만 사용됩니다.</p>
<h2>처리하는 정보</h2><ul><li>댓글 ID와 처리 여부(중복 발송 방지용, 30일 후 자동 삭제)</li><li>보낸 문구의 조합 번호(같은 문구 반복 방지용, 최근 50건만 보관)</li></ul>
<p>댓글 내용, 사용자 이름, 프로필 정보는 저장하지 않으며 제3자에게 제공하지 않습니다.</p>
<h2>데이터 삭제</h2><p>저장된 정보는 30일이 지나면 자동으로 삭제됩니다. 즉시 삭제를 원하시면 해당 인스타그램 계정으로 메시지를 보내 주세요. 확인 후 지체 없이 삭제합니다.</p>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
