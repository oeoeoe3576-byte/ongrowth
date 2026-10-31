"""2026-11-05 겨울 쿨톤 립 추천 (썸네일 1번 podium, 본문 세트 A)."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image
import thumbs, body

SRC = "/home/user/gc_work/2026-11-05_01_겨울쿨톤립/src"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/ongrowth/glowchoi_posts/images/2026-11-05_01_겨울쿨톤립"
os.makedirs(OUT, exist_ok=True)


def cut(name):
    return Image.open(f"{SRC}/{name}.png").convert("RGBA")

# 누끼: 릴리바이레드 03 = @cosme 공식 SKU 컷, 퓌 JR03 = fwee.us 옵션 컷(젤리 조각 제거), 투쿨포스쿨 10 = 공식몰 대표컷
lily, fwee, tcfs = cut("lily03_cosme_cut"), cut("fwee_jr03_pot"), cut("toocool_big_cut")

def podium(cuts, title, sub, en, sizes):
    """thumbs.podium 과 같은 구성. 제품 모양(넓은 젤리팟·컬러 원 있는 틴트)에 맞춰 제품별 최대 크기만 조정."""
    from PIL import ImageDraw
    im = thumbs.vgrad("#F3E5DD", thumbs.ROSY)
    im = thumbs.light(im, 500, 380, 520, 0.45).convert("RGBA")
    d = ImageDraw.Draw(im)
    thumbs.tracked(d, (500, 70), "GLOW CHOI  BEAUTY NOTE", thumbs.pre(20, "SemiBold"), "#A27A68", 5, "c")
    thumbs.tracked(d, (500, 112), title, thumbs.pre(108, "Black"), thumbs.INK, -4, "c")
    thumbs.tracked(d, (500, 250), en, thumbs.serif_en(44, 500), "#A27A68", 0, "c")
    thumbs.pill(d, 500, 320, sub, thumbs.pre(30, "SemiBold"), "#FFFFFF", thumbs.MOCHA)
    b1 = thumbs.pedestal(im, 265, 885, 250, 115, "#EAD3C6")
    b3 = thumbs.pedestal(im, 735, 893, 250, 107, "#EAD3C6")
    b2 = thumbs.pedestal(im, 500, 838, 270, 162, "#F5E8E0")
    (w0, h0), (w1, h1), (w2, h2) = sizes
    thumbs.stand(im, cuts[0], 265, b1 + 6, w0, h0)
    thumbs.stand(im, cuts[2], 735, b3 + 6, w2, h2)
    thumbs.stand(im, cuts[1], 500, b2 + 6, w1, h1)
    return thumbs.grain(im.convert("RGB"), 3.0)


def product(style, cut, no, brand, name, tag, point, mw, mh):
    """body.product(A) 와 같은 구성. 제품이 작아 보이지 않게 최대 크기만 키움."""
    from PIL import ImageDraw
    P = body._p(style)
    im = body._bg(style)
    d = ImageDraw.Draw(im)
    thumbs.tracked(d, (500, 66), f"NO. {no:02d}", thumbs.serif_en(40, 600, False), P["point"], 2, "c")
    thumbs.tracked(d, (500, 118), brand.upper(), thumbs.pre(22, "SemiBold"), P["sub"], 5, "c")
    thumbs.tracked(d, (500, 156), name, thumbs.pre(46, "Black"), thumbs.INK, -1, "c")
    thumbs.pill(d, 500, 232, f"{tag}  ·  {point}", thumbs.pre(28, "Bold"), "#FFFFFF", P["point"], h=60)
    b = thumbs.pedestal(im, 500, 872, 400, 98, P["ped"])
    thumbs.stand(im, cut, 500, b + 6, mw, mh)
    return thumbs.grain(im.convert("RGB"), 2.5)


podium([lily, fwee, tcfs], "겨울 쿨톤 립 추천", "푸시아·체리·와인 3가지", "Winter Cool Lip",
       [(225, 320), (215, 230), (150, 345)]).save(f"{OUT}/01_cover.jpg", quality=92)

body.check_grid("A", "WINTER COOL LIP", "겨울 쿨톤 립 색 체크", [
    ("푸시아·\n마젠타", "쨍한 핑크 퍼플"),
    ("체리\n레드", "푸른 기 도는 레드"),
    ("와인·\n플럼", "깊고 어두운 베리"),
    ("피하면 좋은 색\n코랄·오렌지·브릭", "노란 기가 강한\n웜 베이스 컬러"),
]).save(f"{OUT}/02_check.jpg", quality=92)

product("A", lily, 1, "lilybyred", "쥬시 라이어 워터 틴트", "03 플럼 마티니인 척", "#레디쉬마젠타", 420, 540).save(f"{OUT}/03_lilybyred.jpg", quality=92)
product("A", fwee, 2, "fwee", "립앤치크 글로이 젤리팟", "JR03 체리뽀", "#쿨체리레드", 470, 470).save(f"{OUT}/04_fwee.jpg", quality=92)
product("A", tcfs, 3, "too cool for school", "스웨이 립 벨벳", "10호 크러쉬드 베리", "#플럼버건디", 260, 540).save(f"{OUT}/05_toocool.jpg", quality=92)

body.pick("A", "MY PICK", "그래서 뭘 고를까", [
    ("쨍한 핑크 퍼플로 생기 주기", "릴리바이레드 플럼 마티니", lily),
    ("푸른 기 도는 클래식 레드", "퓌 체리뽀", fwee),
    ("깊고 차분한 와인 무드", "투쿨포스쿨 크러쉬드 베리", tcfs),
]).save(f"{OUT}/06_guide.jpg", quality=92)
print("ok", OUT)
