"""글로우 초이 뷰티 글 썸네일 (프리미엄 시안).

받침대·접지 그림자·바닥 반사·그레인까지 넣어 실제 촬영 컷처럼 보이게 한다.
폰트: Pretendard(본문·제목), Cormorant Garamond Italic(영문 포인트), 나눔명조(세리프 제목).
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
S = 1000


def pre(size, w="Bold"):
    return ImageFont.truetype(os.path.join(HERE, f"Pretendard-{w}.otf"), size)


def serif_en(size, wght=500, italic=True):
    f = ImageFont.truetype(os.path.join(HERE, "CormorantGaramond-Italic.ttf" if italic else "CormorantGaramond.ttf"), size)
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f


def myeongjo(size):
    return ImageFont.truetype(os.path.join(HERE, "NanumMyeongjo-Bold.ttf"), size)


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------- 바탕 ----------

def vgrad(top, bottom, size=(S, S)):
    w, h = size
    a, b = np.array(hexrgb(top), float), np.array(hexrgb(bottom), float)
    t = np.linspace(0, 1, h)[:, None]
    row = a * (1 - t) + b * t
    return Image.fromarray(np.repeat(row[:, None, :], w, axis=1).astype("uint8"))


def light(im, cx, cy, r, strength=0.35, col="#FFFFFF"):
    """부드러운 원형 조명."""
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=int(255 * strength))
    m = m.filter(ImageFilter.GaussianBlur(r * 0.45))
    return Image.composite(Image.new("RGB", im.size, col), im, m)


def grain(im, amt=5):
    a = np.asarray(im).astype(int)
    n = np.random.default_rng(7).normal(0, amt, a.shape[:2])[:, :, None]
    return Image.fromarray(np.clip(a + n, 0, 255).astype("uint8"))


# ---------- 글자 ----------

def tracked(d, xy, text, font, fill, track=0, anchor="l"):
    """자간 조절 글자. anchor='c'면 xy[0]이 가운데."""
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + track * (len(text) - 1)
    x, y = xy
    if anchor == "c":
        x -= total / 2
    elif anchor == "r":
        x -= total
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=fill)
        x += w + track
    return total


# ---------- 제품 ----------

def fit(cut, max_w, max_h):
    cut = cut.convert("RGBA")
    r = min(max_w / cut.width, max_h / cut.height)
    return cut.resize((max(1, round(cut.width * r)), max(1, round(cut.height * r))), Image.LANCZOS)


def stand(canvas: Image.Image, cut, cx, base_y, max_w, max_h, shadow=0.55, reflect=0.0, cast=True):
    """제품을 base_y(바닥선)에 세운다. 접지 그림자 + 선택적 바닥 반사."""
    p = fit(cut, max_w, max_h)
    x, y = round(cx - p.width / 2), round(base_y - p.height)
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    if cast:
        # 넓고 옅은 그림자
        ld.ellipse((x - p.width * 0.15, base_y - 10, x + p.width * 1.25, base_y + 22), fill=(40, 25, 15, int(70 * shadow)))
        layer = layer.filter(ImageFilter.GaussianBlur(14))
        # 바로 밑 진한 접지선
        c = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(c).ellipse((x + p.width * 0.04, base_y - 5, x + p.width * 0.96, base_y + 6), fill=(30, 18, 10, int(200 * shadow)))
        layer.alpha_composite(c.filter(ImageFilter.GaussianBlur(4)))
    if reflect:
        r = p.transpose(Image.FLIP_TOP_BOTTOM)
        fade = np.linspace(reflect * 255, 0, r.height)[:, None]
        fade = np.clip(fade * 1.0, 0, 255)
        a = np.asarray(r.getchannel("A")).astype(float) * (fade / 255)
        r.putalpha(Image.fromarray(a.astype("uint8")))
        layer.alpha_composite(r.filter(ImageFilter.GaussianBlur(1.5)), (x, base_y + 2))
    layer.alpha_composite(p, (x, y))
    canvas.alpha_composite(layer)


def pedestal(canvas: Image.Image, cx, top_y, w, h, base="#E9DCCF", shade=0.16):
    """원기둥 받침대. top_y = 윗면 타원 중심."""
    eh = w * 0.18
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    # 바닥 그림자
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((cx - w * 0.62, top_y + h - eh * 0.5, cx + w * 0.7, top_y + h + eh * 0.9), fill=(60, 40, 25, 70))
    layer.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    # 몸통: 가로 그라데이션 (왼쪽 밝게, 오른쪽 어둡게)
    bw, bh = int(w), int(h + eh)
    base_rgb = np.array(hexrgb(base), float)
    xs = np.linspace(-1, 1, bw)
    k = 1 + 0.10 * (1 - (xs + 0.35) ** 2) - shade * np.clip(xs, 0, 1) ** 1.5
    row = np.clip(base_rgb[None, :] * k[:, None], 0, 255)
    body = Image.fromarray(np.repeat(row[None, :, :], bh, axis=0).astype("uint8")).convert("RGBA")
    mask = Image.new("L", (bw, bh), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, eh / 2, bw, bh - eh / 2), fill=255)
    md.ellipse((0, bh - eh, bw, bh), fill=255)
    body.putalpha(mask)
    layer.alpha_composite(body, (int(cx - w / 2), int(top_y - eh / 2)))
    # 윗면
    top = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    lighter = tuple(min(255, int(c * 1.06)) for c in hexrgb(base))
    ImageDraw.Draw(top).ellipse((cx - w / 2, top_y - eh / 2, cx + w / 2, top_y + eh / 2), fill=lighter + (255,))
    layer.alpha_composite(top)
    canvas.alpha_composite(layer)
    return top_y  # 제품 바닥선


def pill(d, cx, y, text, font, fg, bg, padx=34, h=62, outline=None):
    w = d.textlength(text, font=font) + padx * 2
    d.rounded_rectangle((cx - w / 2, y, cx + w / 2, y + h), radius=h / 2, fill=bg, outline=outline, width=2 if outline else 0)
    bb = d.textbbox((0, 0), text, font=font)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], y + (h - (bb[3] - bb[1])) / 2 - bb[1]), text, font=font, fill=fg)


# ---------- 최종 기본 썸네일 ----------
# 상위 10% 블로그 썸네일 1,110장 분석 (2026-10-24):
#   대부분 실사 + 아래쪽 라벨 박스. 더 많이 쓰는 색 = 로지 베이지·누드 로즈·웜 그레이지·모카,
#   덜 쓰는 색 = 순백·블랙·진한 브라운·블루·오렌지.
ROSY = "#E1C4B4"
MOCHA = "#AE8977"
INK = "#483B33"


def label_photo(photo: Image.Image, cuts: list, small: str, big: str, tint=ROSY, label=MOCHA):
    """실사(제형·촬영 사진) 배경 + 제품 라인업 + 왼쪽 아래 2단 라벨 박스."""
    w, h = photo.size
    m = min(w, h)
    bg = photo.convert("RGB").crop(((w - m) // 2, (h - m) // 2, (w + m) // 2, (h + m) // 2)).resize((S, S), Image.LANCZOS)
    im = Image.blend(bg, Image.new("RGB", (S, S), tint), 0.18).convert("RGBA")
    n = len(cuts)
    span = 400 if n == 3 else 300 * (n - 1) / 2 if n > 1 else 0
    xs = [500 - span / 2 + span * i / max(1, n - 1) for i in range(n)] if n > 1 else [500]
    for i, (c, x) in enumerate(zip(cuts, xs)):
        mid = n % 2 == 1 and i == n // 2
        stand(im, c, x, 760, 165 if mid else 190, 520 if mid else 465, 0.75)
    d = ImageDraw.Draw(im)
    f1, f2 = pre(34, "Bold"), pre(64, "Black")
    w1 = d.textlength(small, font=f1) + 44
    d.rectangle((60, 800, 60 + w1, 856), fill=label)
    d.text((82, 806), small, font=f1, fill="#FFFFFF")
    w2 = d.textlength(big, font=f2) + 52
    d.rectangle((60, 864, 60 + w2, 952), fill="#FFFFFF")
    d.text((86, 868), big, font=f2, fill=INK)
    return grain(im.convert("RGB"), 3.0)


def podium(cuts: list, title: str, sub: str, en: str = "Brightening Ampoule Edit",
           top="#F3E5DD", bottom=ROSY, ped_side="#EAD3C6", ped_mid="#F5E8E0", label_col="#A27A68"):
    """시상대(등수) 썸네일. 로지 베이지 배경 + 가운데가 높은 받침대 3개 + 위 제목.
    cuts 순서: [왼쪽, 가운데(1등 자리), 오른쪽]."""
    im = vgrad(top, bottom)
    im = light(im, 500, 380, 520, 0.45).convert("RGBA")
    d = ImageDraw.Draw(im)
    tracked(d, (500, 70), "GLOW CHOI  BEAUTY NOTE", pre(20, "SemiBold"), label_col, 5, "c")
    tracked(d, (500, 112), title, pre(108, "Black"), INK, -4, "c")
    tracked(d, (500, 250), en, serif_en(44, 500), label_col, 0, "c")
    pill(d, 500, 320, sub, pre(30, "SemiBold"), "#FFFFFF", MOCHA)
    b1 = pedestal(im, 265, 830, 250, 170, ped_side)
    b3 = pedestal(im, 735, 840, 250, 160, ped_side)
    b2 = pedestal(im, 500, 770, 270, 240, ped_mid)
    stand(im, cuts[0], 265, b1 + 6, 175, 400)
    stand(im, cuts[2], 735, b3 + 6, 175, 385)
    stand(im, cuts[1], 500, b2 + 6, 150, 370)
    return grain(im.convert("RGB"), 3.0)
