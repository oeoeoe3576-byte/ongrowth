"""2026-11-02 겨울 쿠션 추천 (썸네일 2번 label_photo, 본문 세트 B)."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image
import thumbs, body

SRC = "/home/user/gc_work/2026-11-02_01_겨울쿠션/src"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/ongrowth/glowchoi_posts/images/2026-11-02_01_겨울쿠션"
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

def cut(name):
    return Image.open(f"{SRC}/{name}_cut.png").convert("RGBA")

hince, fwee, tirtir = cut("hince"), cut("fwee"), cut("tirtir")

# 공식몰에 제품 없는 제형 사진이 없어 그레이지 그라데이션 + 조명 배경
bg = thumbs.light(thumbs.vgrad("#F0EBE6", "#DCD1C7"), 500, 360, 560, 0.5)
cover(bg, [(hince, 225, 640, 330, 400), (tirtir, 775, 640, 330, 400), (fwee, 500, 708, 350, 400)],
      "건성 글로우 쿠션 3종", "겨울 쿠션 추천").save(f"{OUT}/01_cover.jpg", quality=92)

body.check_grid("B", "BEFORE YOU BUY", "겨울 쿠션 고르기 전", [
    ("마무리감", "세미 글로우·글로우가\n건조함을 덜 드러내요"),
    ("보습 성분", "히알루론산·세라마이드\n세럼·에센스 베이스"),
    ("커버력", "두꺼울수록 잘 떠요\n얇게 쌓는 쪽이 편해요"),
    ("자외선 차단", "겨울에도 필요해요\nSPF·PA 표기 확인"),
]).save(f"{OUT}/02_check.jpg", quality=92)

body.compare_columns("B", "FINISH", "마무리감 비교", [
    ("GLOW", "글로우", "촉촉한 광", "T존은 파우더로\n살짝 눌러주기"),
    ("SEMI", "세미 글로우", "은은한 광", "건조함을\n덜 드러내요"),
    ("MATTE", "매트", "보송한 마무리", "겨울엔 글로우를\n더 많이 찾아요"),
], row_labels=("마무리감", "겨울 포인트")).save(f"{OUT}/03_finish.jpg", quality=92)

body.product("B", hince, 1, "hince", "세컨 스킨 글로우 쿠션", "#진주알광", "세미 글로우").save(f"{OUT}/04_hince.jpg", quality=92)
body.product("B", fwee, 2, "fwee", "쿠션 글래스 내추럴", "#수분커버밸런스", "세미 글로우 속광").save(f"{OUT}/05_fwee.jpg", quality=92)
body.product("B", tirtir, 3, "TIRTIR", "틴티드 스킨 글로우 쿠션", "#세럼베이스", "3중 기능성").save(f"{OUT}/06_tirtir.jpg", quality=92)

body.steps_flow("B", "HOW TO APPLY", "들뜸 없이 바르는 법", [
    ("drop", "보습 먼저", "보습제를 충분히\n흡수시킨 뒤"),
    ("tap", "얇게 두드리기", "퍼프에 소량만\n묻혀서"),
    ("water", "볼만 한 번 더", "건조한 볼은\n얇게 레이어링"),
], note="들뜬 곳은 문지르지 말고\n미스트를 뿌린 뒤 손바닥으로 가볍게 눌러주세요").save(f"{OUT}/07_howto.jpg", quality=92)

body.pick("B", "MY PICK", "고민별 선택 가이드", [
    ("은은한 진주알 광, 가벼운 밀착감", "힌스 세컨 스킨 글로우 쿠션", hince),
    ("촉촉함과 커버를 함께", "퓌 쿠션 글래스 내추럴", fwee),
    ("세럼 베이스와 넉넉한 용량", "티르티르 틴티드 스킨 글로우 쿠션", tirtir),
]).save(f"{OUT}/08_guide.jpg", quality=92)
print("ok", OUT)
