import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image, ImageDraw, ImageFilter
import thumbs, body

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def shade_rect(d, box, top, bot):
    x0, y0, x1, y1 = box
    t, b = thumbs.hexrgb(top), thumbs.hexrgb(bot)
    for y in range(int(y0), int(y1)):
        k = (y - y0) / max(1, (y1 - y0))
        d.line((x0, y, x1, y), fill=tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)) + (255,))

def bag():
    im = Image.new("RGBA", (600, 860), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.arc((170, 40, 430, 330), 180, 360, fill="#7E5F50", width=22)          # 손잡이
    shade_rect(d, (60, 190, 540, 850), "#C9A592", "#AE8977")                 # 몸통
    d.polygon([(540, 190), (585, 230), (585, 820), (540, 850)], fill="#9A7867")  # 옆면
    d.rectangle((60, 190, 540, 250), fill="#B8937F")                         # 위 접힘
    for x in (205, 395):
        d.ellipse((x - 14, 210, x + 14, 238), fill="#6E5245")                # 손잡이 구멍
    d.text((300, 520), "BLACK FRIDAY", font=thumbs.pre(44, "Bold"), fill="#FFFFFF", anchor="mm")
    d.line((180, 570, 420, 570), fill="#FFFFFF", width=3)
    return im

def gift():
    im = Image.new("RGBA", (520, 760), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    shade_rect(d, (60, 300, 460, 750), "#FBF4EE", "#EBDACF")                 # 상자
    shade_rect(d, (40, 230, 480, 320), "#FFFAF6", "#EFE0D6")                 # 뚜껑
    d.rectangle((225, 230, 295, 750), fill="#AE8977")                        # 세로 리본
    d.rectangle((40, 255, 480, 295), fill="#AE8977")                         # 가로 리본(뚜껑)
    d.ellipse((90, 120, 260, 250), outline="#AE8977", width=34)             # 리본 고리
    d.ellipse((260, 120, 430, 250), outline="#AE8977", width=34)
    d.ellipse((225, 190, 295, 260), fill="#93705F")
    return im

def jar():
    im = Image.new("RGBA", (440, 620), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    shade_rect(d, (50, 210, 390, 610), "#FFFFFF", "#EDE6E1")                 # 용기
    d.rounded_rectangle((50, 210, 390, 612), radius=40, outline="#E2D6CE", width=3)
    shade_rect(d, (30, 70, 410, 220), "#E1C4B4", "#CFA894")                  # 뚜껑
    d.rounded_rectangle((30, 70, 410, 225), radius=26, outline="#C29C88", width=3)
    d.line((70, 100, 370, 100), fill="#EFD9CD", width=6)
    return im

def soften(im):
    im = im.crop(im.getbbox())
    a = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.8)); im.putalpha(a); return im

cover = thumbs.podium([soften(gift()), soften(bag()), soften(jar())],
                      "올영 블프", "11.1 ~ 11.7 · 블프라이즈 박스", en="Black Friday Note")
cover.save(f"{OUT}/01_cover.jpg", quality=92)

body.checklist("A", "SCHEDULE", "올영 블프 한눈에", [
    "행사 기간  11.1 ~ 11.7\n온·오프라인 모두",
    "스페셜 드롭  11.4 하루\n한정 수량, 당일 앱 공지 확인",
    "블프라이즈 박스\n본품 6~7종 랜덤 박스 2종, 한정 수량",
    "라스트 픽\n오프라인 주요 매장, 매장마다 품목 다름",
], foot="올리브영 뉴스룸 10.29 게시 기준").save(f"{OUT}/02_schedule.jpg", quality=92)

body.compare_columns("A", "BOX · DROP · PICK", "뭐가 다를까", [
    ("BOX", "블프라이즈 박스", "매장·온라인몰\n2종", "본품 6~7종\n랜덤 구성"),
    ("DROP", "스페셜 드롭", "11월 4일\n하루", "한정 수량\n앱 공지 확인"),
    ("PICK", "라스트 픽", "오프라인\n주요 매장", "매장마다\n품목 다름"),
], row_labels=("언제·어디서", "알아둘 점")).save(f"{OUT}/03_compare.jpg", quality=92)

body.check_grid("A", "BEFORE BLACK FRIDAY", "블프 전 준비", [
    ("앱 알림\n켜두기", "쿠폰·특가 소식\n놓치지 않게"),
    ("장바구니\n미리 담기", "가격과 혜택\n바로 비교"),
    ("쿠폰 조건\n확인하기", "결제 금액·대상\n조건 먼저"),
    ("11월 4일\n메모하기", "스페셜 드롭은\n하루뿐"),
]).save(f"{OUT}/04_prepare.jpg", quality=92)

body.checklist("A", "WINTER CART", "겨울 장바구니 체크", [
    "보습 크림 · 장벽 케어 크림",
    "바디로션 · 바디오일",
    "립 케어",
    "순한 클렌저",
    "겨울에도 쓰는 선크림",
    "시트 마스크팩",
], foot="다 써가는 것부터 담아요").save(f"{OUT}/05_checklist.jpg", quality=92)

body.steps_flow("A", "NEXT SALE", "블프 다음 일정", [
    ("tap", "올영 블프", "11.1 ~ 11.7"),
    ("drop", "올리브 데이", "매달 25~27일\n올리브 멤버스"),
    ("sun", "올영세일", "12월\n날짜는 앱 공지"),
], note="쿠폰 금액과 할인율은 아직 미공개\n올리브영 앱 공지사항에서 확인하세요").save(f"{OUT}/06_next.jpg", quality=92)
print("ok")
