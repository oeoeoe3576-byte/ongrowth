# 디자인 견본 (저장된 디자인)

같은 원고(`CN-20261001-001`, 표지 문구 체크리스트 6장)를 디자인별로 그린 견본입니다.
표지 사진은 코드로 만든 임시 이미지입니다.

| 파일 | 디자인 | 느낌 |
|---|---|---|
| `default.png` | default | 오프화이트 + 코발트 블루 |
| `insight.png` | insight | 검정 + 초록 |
| `life.png` | life | 크림 + 갈색, 굵기로 강조 |
| `campaign.png` | campaign | 진초록 표지 + 주황, 형광펜 강조 |
| `brand-ongrowth.png` | **온그로스 계정 설정** | insight (검정 + 초록) 전 페이지 |

## 계정별 디자인 지정

`data/brands/<계정>.json`

```json
{ "handle": "ongrowth", "theme": "insight" }
```

- `theme`: 본문 카드 디자인
- `coverTheme`: (선택) 첫 장·마지막 장만 다른 디자인으로. 예: `"theme": "default", "coverTheme": "insight"`

## 견본 다시 만들기

```bash
npm run design -- sheet CN-20261001-001 --themes default,insight,life,campaign,brand
```
