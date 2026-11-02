# 문구 파일 형식 (autodm/phrases/<계정키>.json)

```json
{
  "account": "ongrowth",
  "handle": "ongrowth_marketing",
  "language": "ko",
  "toneSource": "shopping-shorts 채널/온그로스.md 3·4장",
  "dm":         { "greetings": [15+], "bodies": [15+, 각 문장에 {link} 정확히 1번], "closings": [15+] },
  "reply":      { "greetings": [15+], "bodies": [15+, "DM 보냈다" 안내], "closings": [15+] },
  "replyNoLink":{ "bodies": [15+, 링크 없는 게시물: "프로필 링크에서 확인" 안내. DM 언급 금지] },
  "pinned":     [10+, 게시물 업로드 때 다는 고정 댓글: 비공개 계정·DM 수신 제한이면 DM이 안 갈 수 있으니 프로필 링크 확인]
}
```

규칙
- 인사말·본문·마무리는 어떤 조합으로 붙여도 자연스러워야 한다(각각 독립 문장, 앞뒤 문맥 가정 금지).
- 같은 문장, 같은 시작 단어 반복 최소화. 길이도 섞는다. 상투적인 AI 말투("~해 드릴게요!" 연속, "도움이 되셨길 바랍니다" 등) 피함.
- 자리표시자는 {link} 하나만(dm.bodies에만). 이름·숫자·가격·효과를 지어내지 않는다.
- 이모지는 계정 규칙 따름. 해시태그 금지.
- 답글(reply)은 공개 댓글이므로 짧게(전체 80자 안팎).
- 조합 = 인사말 i × 본문 j × 마무리 k. 서버가 최근 50건과 같은 (i,j,k) 조합을 다시 쓰지 않는다.
