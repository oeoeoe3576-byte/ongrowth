"""2026-11-06 쿨톤 블러셔 추천 (썸네일 2번 label_photo, 본문 세트 B)."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image, ImageFilter
import thumbs, body

SRC = "/home/user/gc_work/2026-11-06_01_쿨톤블러셔/src"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/ongrowth/glowchoi_posts/images/2026-11-06_01_쿨톤블러셔"
os.makedirs(OUT, exist_ok=True)
TAUPE = "#9C8574"


def cover(photo, placements, small, big, tint=thumbs.ROSY, label=TAUPE):
    """thumbs.label_photo 와 같은 배경·라벨에 제품만 크게 배치.
    placements=[(누끼, 가운데x, 바닥y, 최대폭, 최대높이)] 뒤쪽부터."""
    from PIL import ImageDraw
    S = thumbs.S
    w, h = photo.size; m = min(w, h)
    bg = photo.convert("RGB").crop(((w - m) // 2, (h - m) // 2, (w + m) // 2, (h + m) // 2)).resize((S, S), Image.LANCZOS)
    im = Image.blend(bg, Image.new("RGB", (S, S), tint), 0.18).convert("RGBA")
    for c, x, by, mw, mh in placements:
        thumbs.stand(im, c, x, by, mw, mh, 0.75)
    d = ImageDraw.Draw(im)
    f1, f2 = thumbs.pre(42, "Bold"), thumbs.pre(96, "Black")
    for y0, y1, text, f, bgc, fg in ((728, 800, small, f1, label, "#FFFFFF"),
                                     (810, 940, big, f2, "#FFFFFF", thumbs.INK)):
        tw = d.textlength(text, font=f)
        d.rectangle((500 - tw / 2 - 30, y0, 500 + tw / 2 + 30, y1), fill=bgc)
        bb = d.textbbox((0, 0), text, font=f)
        d.text((500 - (bb[2] - bb[0]) / 2 - bb[0], (y0 + y1) / 2 - (bb[3] - bb[1]) / 2 - bb[1]), text, font=f, fill=fg)
    return thumbs.grain(im.convert("RGB"), 3.0)


def product(style, cut, no, brand, name, tag, point, mw, mh):
    """body.product(B) 와 같은 구성. 위 글자와 제품 사이 빈 공간이 크지 않게 최대 크기만 키움."""
    from PIL import ImageDraw
    P = body._p(style)
    im = body._bg(style)
    d = ImageDraw.Draw(im)
    thumbs.tracked(d, (500, 66), f"NO. {no:02d}", thumbs.serif_en(40, 600, False), P["point"], 2, "c")
    thumbs.tracked(d, (500, 118), brand.upper(), thumbs.pre(22, "SemiBold"), P["sub"], 5, "c")
    thumbs.tracked(d, (500, 156), name, thumbs.pre(46, "Black"), thumbs.INK, -1, "c")
    thumbs.pill(d, 500, 232, f"{tag}  ·  {point}", thumbs.pre(28, "Bold"), "#FFFFFF", P["point"], h=60)
    thumbs.stand(im, cut, 500, 905, mw, mh, 0.8)
    return thumbs.grain(im.convert("RGB"), 2.5)


def cut(name):
    return Image.open(f"{SRC}/{name}_cut.png").convert("RGBA")

# 누끼: 힌스 = 공식몰 대표컷(02 러브), 어뮤즈 = 공식몰 추가이미지 중 라벨 UBERA 단독컷(제품 제형 스와치 포함), 데이지크 = 글로벌 공식몰 05 단독컷
hince, amuse, dasique = cut("hince_big"), cut("amuse_s05"), cut("dasique_05")

# 표지 배경: 힌스 공식 상세 '7 Colors' 파우더 스와치(제품 없는 질감 사진) 중 02 러브·03 튤·04 허밍 부분
bg = Image.open(f"{SRC}/hince_H03_swatch.jpg").convert("RGB").crop((20, 520, 470, 970))
bg = bg.resize((1000, 1000), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
cover(bg, [(dasique, 205, 700, 235, 300), (amuse, 800, 700, 240, 330), (hince, 500, 715, 255, 400)],
      "여름쿨 vs 겨울쿨", "쿨톤 블러셔 추천").save(f"{OUT}/01_cover.jpg", quality=92)

body.compare_columns("B", "SUMMER vs WINTER", "여름쿨 vs 겨울쿨 볼 색", [
    ("S", "여름쿨", "라일락 핑크\n쿨 로즈\n뮤트 모브", "밝고 부드러운\n흰 기 섞인 색"),
    ("W", "겨울쿨", "베리 · 플럼\n푸시아 핑크", "대비가 또렷한\n푸른 기 선명한 색"),
    ("TIP", "공통 주의", "코랄 · 오렌지\n노란 기 강한 색", "손등에 먼저\n테스트"),
], row_labels=("어울리기 쉬운 색", "포인트")).save(f"{OUT}/02_compare.jpg", quality=92)

body.steps_flow("B", "HOW TO APPLY", "톤별 블러셔 위치", [
    ("tap", "손등에 털기", "브러시를\n한 번 털어내고"),
    ("drop", "톤별 위치", "여름쿨 앞볼 넓게\n겨울쿨 좁은 사선"),
    ("sun", "얇게 여러 번", "조금씩 쌓으면\n실패가 적어요"),
], note="여름쿨은 넓고 옅게, 겨울쿨은 좁게 사선으로\n여름쿨 앞볼 중심 · 겨울쿨 광대 위에서 관자놀이 쪽").save(f"{OUT}/03_steps.jpg", quality=92)

product("B", hince, 1, "hince", "허그 레이어 치크", "02 러브", "#라일락핑크", 520, 560).save(f"{OUT}/04_hince.jpg", quality=92)
product("B", amuse, 2, "AMUSE", "듀 세럼 리퀴드 블러쉬", "S05 우베라", "#크림모브", 560, 570).save(f"{OUT}/05_amuse.jpg", quality=92)
product("B", dasique, 3, "dasique", "블렌딩 무드 치크", "05 바이올렛 니트", "#라벤더플럼", 560, 560).save(f"{OUT}/06_dasique.jpg", quality=92)
print("ok", OUT)
