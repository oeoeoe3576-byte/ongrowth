import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image, ImageDraw, ImageFilter
import thumbs, body

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def shade(d, box, top, bot):
    x0, y0, x1, y1 = box
    t, b = thumbs.hexrgb(top), thumbs.hexrgb(bot)
    for y in range(int(y0), int(y1)):
        k = (y - y0) / max(1, (y1 - y0))
        d.line((x0, y, x1, y), fill=tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)) + (255,))

def toner():      # 무지 토너 병
    im = Image.new("RGBA", (300, 820), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    shade(d, (100, 20, 200, 150), "#E1C4B4", "#C9A592")
    d.rounded_rectangle((100, 20, 200, 150), radius=14, outline="#B8937F", width=3)
    shade(d, (30, 150, 270, 815), "#FBF6F2", "#EBDDD3")
    d.rounded_rectangle((30, 150, 270, 815), radius=46, outline="#E0D0C5", width=3)
    d.rounded_rectangle((70, 420, 230, 560), radius=10, fill="#F1E3DA")
    return im

def serum():      # 무지 스포이드 세럼
    im = Image.new("RGBA", (300, 720), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((105, 10, 195, 140), fill="#AE8977")
    shade(d, (85, 120, 215, 260), "#C9A592", "#AE8977")
    shade(d, (40, 255, 260, 715), "#EAD3C6", "#D8B6A4")
    d.rounded_rectangle((40, 255, 260, 715), radius=40, outline="#C7A593", width=3)
    d.rounded_rectangle((75, 420, 225, 540), radius=10, fill="#F5E8E0")
    return im

def cream():      # 무지 크림 용기
    im = Image.new("RGBA", (440, 520), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    shade(d, (50, 210, 390, 515), "#FFFFFF", "#EDE6E1")
    d.rounded_rectangle((50, 210, 390, 515), radius=40, outline="#E2D6CE", width=3)
    shade(d, (30, 70, 410, 220), "#E1C4B4", "#CFA894")
    d.rounded_rectangle((30, 70, 410, 225), radius=26, outline="#C29C88", width=3)
    return im

def drop():       # 물방울 아이콘
    im = Image.new("RGBA", (300, 380), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(150, 10), (40, 220), (260, 220)], fill="#C9A592")
    d.ellipse((38, 140, 262, 370), fill="#C9A592")
    d.ellipse((90, 220, 140, 300), fill="#E6D0C3")
    return im

def tidy(im):
    im = im.crop(im.getbbox())
    im.putalpha(im.getchannel("A").filter(ImageFilter.GaussianBlur(0.8)))
    return im

thumbs.podium([tidy(toner()), tidy(cream()), tidy(serum())],
              "속건조 잡는법", "세안부터 크림까지 순서", en="Inner Dryness Care").save(f"{OUT}/01_cover.jpg", quality=92)

body.compare_columns("A", "DRY SKIN TYPES", "같은 건조, 다른 느낌", [
    ("DRY", "건성", "수분·유분\n모두 부족", "겉까지\n푸석한 편"),
    ("IN", "속건조(수부지)", "수분 부족을\n피지로 채움", "겉은 번들\n속은 당김"),
    ("TIP", "공통 관리", "세안 후\n3분 안 보습", "마지막은\n크림으로"),
], row_labels=("이런 상태", "알아둘 점")).save(f"{OUT}/02_types.jpg", quality=92)

body.checklist("A", "WINTER HABITS", "수분 뺏는 겨울 습관", [
    "뜨거운 물로 오래 샤워하기",
    "세안 후 한참 뒤에 보습하기",
    "세정력이 강한 비누로 자주 씻기",
    "가벼운 로션 하나로 끝내기",
], foot="습관 몇 가지만 바꿔도 당김이 덜해져요").save(f"{OUT}/03_habits.jpg", quality=92)

body.check_grid("A", "SELF CHECK", "속건조 자가 체크", [
    ("세안 후\n금방 당김", "씻고 나면\n얼굴이 땅겨요"),
    ("겉 번들\n속 건조", "T존은 번들,\n볼은 당겨요"),
    ("크림 후에도\n건조", "발라도\n건조함이 남아요"),
    ("화장이\n겉돎·들뜸", "베이스가\n쉽게 떠요"),
]).save(f"{OUT}/04_check.jpg", quality=92)

body.steps_flow("A", "ROUTINE", "속건조 잡는 순서", [
    ("water", "미지근한 물", "세안은\n짧게"),
    ("drop", "3분 안 토너", "얇게 2~3번\n레이어링"),
    ("tap", "크림 마무리", "지질 성분\n크림으로 덮기"),
], note="실내 습도는 40~60%\n가습기나 젖은 수건을 활용해요").save(f"{OUT}/05_routine.jpg", quality=92)

body.ingredients("A", "CREAM CHECK", "크림 고를 때 볼 성분", [
    ("세라마이드", "피부 지질과 비슷한 성분", ["크림", "지질"]),
    ("콜레스테롤 · 지방산", "세라마이드와 함께 보면 좋은 지질 성분", ["크림", "지질"]),
    ("오일 한두 방울", "손바닥에 데워 볼 위주로 지그시", ["건조한 날"]),
]).save(f"{OUT}/06_cream.jpg", quality=92)

body.pick("A", "AVOID & SWAP", "이 습관은 바꿔요", [
    ("각질 박박 문지르기", "부드럽게 세안하기", tidy(drop())),
    ("뜨거운 물로 헹구기", "미지근한 물로 짧게", tidy(drop())),
    ("당김 싫어 세안 건너뛰기", "순하게 씻고 바로 보습", tidy(toner())),
    ("유분 싫다고 보습 생략", "마지막은 크림으로", tidy(cream())),
]).save(f"{OUT}/07_summary.jpg", quality=92)
print("ok")
