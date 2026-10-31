"""2026-11-04 장벽 크림 추천 (썸네일 2번 label_photo, 본문 세트 B)."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image
import thumbs, body

SRC = "/home/user/gc_work/2026-11-04_01_장벽크림/src"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/ongrowth/glowchoi_posts/images/2026-11-04_01_장벽크림"
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

pg, lrp, rb = cut("physiogel"), cut("lrp"), cut("realbarrier")

# 공식몰·컬리에 제품 없는 크림 제형 사진이 없어 그레이지 그라데이션 + 조명 배경
bg = thumbs.light(thumbs.vgrad("#F0EBE6", "#DCD1C7"), 500, 360, 560, 0.5)
cover(bg, [(pg, 270, 700, 220, 520), (rb, 730, 700, 220, 500), (lrp, 500, 712, 230, 600)],
      "성분별로 고르는", "장벽 크림 추천").save(f"{OUT}/01_cover.jpg", quality=92)

body.check_grid("B", "SKIN BARRIER SIGNS", "장벽 약해진 신호", [
    ("토너에도\n따끔거림", "늘 쓰던 제품인데도"),
    ("세안 후\n금방 땅김", "세안 직후 바로"),
    ("볼·입가\n붉은기·각질", "볼과 입가 위주로"),
    ("발라도\n금방 건조", "크림을 발라도 다시"),
]).save(f"{OUT}/02_check.jpg", quality=92)

body.compare_columns("B", "INGREDIENTS", "장벽 크림 성분 3갈래", [
    ("CER", "세라마이드", "각질층 지질을\n채워줘요", "수분이 날아가지\n않게 잡아줘요"),
    ("B5", "판테놀", "비타민 B5 계열\n보습 성분", "진정 제품에\n자주 쓰여요"),
    ("CICA", "시카(병풀)", "병풀추출물\n마데카소사이드", "진정 케어에\n많이 쓰여요"),
], row_labels=("어떤 성분", "포인트")).save(f"{OUT}/03_compare.jpg", quality=92)

body.product("B", pg, 1, "PHYSIOGEL", "DMT 페이셜 크림", "#세라마이드", "세라마이드엔피·쉐어버터").save(f"{OUT}/04_physiogel.jpg", quality=92)
body.product("B", lrp, 2, "LA ROCHE-POSAY", "시카플라스트 밤 B5+", "#판테놀5%", "마데카소사이드").save(f"{OUT}/05_lrp.jpg", quality=92)
body.product("B", rb, 3, "Real Barrier", "익스트림 크림", "#MLE기술", "판테놀·히알루론산").save(f"{OUT}/06_realbarrier.jpg", quality=92)

body.steps_flow("B", "ROUTINE", "장벽 크림 바르는 순서", [
    ("water", "순하게 세안", "미온수로\n순하게"),
    ("drop", "토너 가볍게", "가볍게\n한 번만"),
    ("tap", "크림 바르기", "물기 남았을 때\n땅기는 곳은 한 번 더"),
], note="아침에는 얇게 바르기\n충분히 흡수된 뒤 베이스를 올려야 들뜸이 덜해요").save(f"{OUT}/07_routine.jpg", quality=92)

body.pick("B", "MY PICK", "고민별 선택 가이드", [
    ("건조함이 심하고 세라마이드를 찾는다면", "피지오겔 DMT 페이셜 크림", pg),
    ("붉고 따가운 부위 진정이 먼저라면", "라로슈포제 시카플라스트 밤 B5+", lrp),
    ("당김과 가려움이 자주 올라온다면", "리얼베리어 익스트림 크림", rb),
]).save(f"{OUT}/08_guide.jpg", quality=92)
print("ok", OUT)
