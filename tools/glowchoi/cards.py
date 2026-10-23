"""글로우 초이 블로그 이미지 카드 (기존 '블로그 서식 복사함' 디자인 계승).

사용자가 이전에 쓰던 퍼스널컬러 시리즈 카드 디자인을 그대로 따른다.
  - 표지: 위아래 컬러칩 띠 + 필기체 영문 + 아주 굵은 한글 제목 + 얇은 부제
  - 한눈에 보기: 연한 배경 위 흰 둥근 패널 + 항목 줄
  - 제품: 연한 배경 + 왼쪽 위 '브랜드 / 제품명 / 카테고리' 세로선 + 가운데 빛나는 원 위 제품 + 아래 굵은 #키워드
  - 포인트: 위아래 컬러칩 띠 + 필기체 영문 + 굵은 제목 + 번호 동그라미 목록
  - 팔레트: 둥근 컬러칩 + 이름 + 색상코드
크기 1000 x 1000 (기존 카드와 동일).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
F_SANS = os.path.join(HERE, "NotoSansKR.ttf")
F_DISPLAY = os.path.join(HERE, "BlackHanSans-Regular.ttf")
F_SCRIPT = os.path.join(HERE, "Parisienne-Regular.ttf")
S = 1000


@dataclass
class Theme:
    point: str  # 필기체·번호·카테고리 색 (기존 예: 여름뮤트 #9C7F95, 가을뮤트 #A07B5E)
    tint: str  # 제품·한눈에 보기 카드 배경
    chips: list = field(default_factory=list)  # 표지 위아래 띠 색 7개
    ink: str = "#4F403A"  # 큰 제목 (진한 브라운)
    text: str = "#3A3330"
    sub: str = "#8A7F78"


THEMES = {
    # 미백·비타민·가을 웜
    "warm_beige": Theme(point="#A07B5E", tint="#F4EEE8",
                        chips=["#E9DCCB", "#DDC4A6", "#EBCDBB", "#D2B3A1", "#E3BFA3", "#BDB596", "#B9A898"]),
    # 쿨·모브·라벤더
    "mauve": Theme(point="#9C7F95", tint="#F0ECF2",
                   chips=["#E6C9CF", "#D8B9C3", "#CDC5D6", "#E3CFC8", "#C6D0DD", "#CBD3C5", "#BDB1B4"]),
    # 버건디·와인·겨울
    "wine": Theme(point="#8C3B4A", tint="#F5ECEE",
                  chips=["#E8C9CE", "#D79FAA", "#B86A79", "#8C3B4A", "#C9A9AE", "#E2D3D0", "#A99096"]),
    # 쿠션·베이스·토프
    "taupe": Theme(point="#8C7464", tint="#F3EFEB",
                   chips=["#EADFD4", "#DCCBBB", "#CFB8A6", "#E6D6CB", "#C4B2A5", "#D8CEC4", "#B3A296"]),
    # 진정·트러블·그린
    "sage": Theme(point="#6E8574", tint="#EEF2EE",
                  chips=["#DCE6DC", "#C7D6C8", "#B3C6B6", "#E3E6DA", "#A9BBAE", "#D3DDD2", "#98AB9D"]),
}


def _f(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def sans(size, weight=500):
    return _f(F_SANS, size, weight)


def _c(d, y, text, font, fill, x0=0, w=S):
    tw = d.textlength(text, font=font)
    d.text((x0 + (w - tw) / 2, y), text, font=font, fill=fill)


def _stripes(d, t: Theme, y, h=34):
    n = len(t.chips)
    cw = S / n
    for i, col in enumerate(t.chips):
        d.rectangle((int(i * cw), y, int((i + 1) * cw) + 1, y + h), fill=col)


def _place_product(canvas, cut: Image.Image, cx, cy, max_w, max_h, shadow=True):
    cut = cut.convert("RGBA")
    r = min(max_w / cut.width, max_h / cut.height)
    cut = cut.resize((max(1, int(cut.width * r)), max(1, int(cut.height * r))), Image.LANCZOS)
    x, y = int(cx - cut.width / 2), int(cy - cut.height / 2)
    if shadow:
        a = cut.getchannel("A").point(lambda v: int(v * 0.14))
        sh = Image.new("RGBA", cut.size, (70, 50, 40, 0))
        sh.putalpha(a)
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        canvas.paste(sh, (x + 6, y + 12), sh)
    canvas.paste(cut, (x, y), cut)


def cover(t: Theme, script: str, title: str, sub_en: str, desc: str) -> Image.Image:
    """표지 카드. 예) script='brightening care', title='미백 앰플', sub_en='vitamin C / niacinamide'."""
    im = Image.new("RGB", (S, S), "#FFFFFF")
    d = ImageDraw.Draw(im)
    _stripes(d, t, 70)
    _stripes(d, t, S - 104)
    _c(d, 250, script, _f(F_SCRIPT, 66), t.point)
    tf = _f(F_DISPLAY, 150 if len(title) <= 5 else 120)
    _c(d, 345, title, tf, t.ink)
    _c(d, 560, sub_en, sans(44, 300), t.sub)
    _c(d, 650, desc, sans(30, 400), t.point)
    return im


def thumb(t: Theme, script: str, title: str, sub: str, cuts: list[Image.Image]) -> Image.Image:
    """뷰티 정보 글 썸네일. 연한 배경 + 위 제목 + 아래 빛나는 타원 위 제품 라인업.
    (컬러칩 띠 표지 cover는 퍼스널컬러 시리즈 전용)"""
    im = Image.new("RGB", (S, S), t.tint)
    glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(glow).ellipse((90, 470, 910, 1060), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    im = Image.composite(Image.new("RGB", (S, S), "#FFFFFF"), im, glow)
    d = ImageDraw.Draw(im)
    _c(d, 70, script, _f(F_SCRIPT, 60), t.point)
    tf = _f(F_DISPLAY, 136 if len(title) <= 6 else 112)
    _c(d, 150, title, tf, t.ink)
    sf = sans(32, 600)
    w = d.textlength(sub, font=sf) + 64
    d.rounded_rectangle(((S - w) / 2, 325, (S + w) / 2, 385), radius=30, fill=t.point)
    _c(d, 334, sub, sf, "#FFFFFF")
    n = len(cuts)
    slot = 760 / n
    for i, c in enumerate(cuts):
        _place_product(im, c, 120 + slot * (i + 0.5), 690, slot - 70, 400)
    return im


def point_list(t: Theme, script: str, title: str, items: list[str], stripes: bool = True) -> Image.Image:
    """포인트 정리 카드. 번호 동그라미 + 한 줄 항목 (기존 '메이크업 POINT' 카드)."""
    im = Image.new("RGB", (S, S), "#FFFFFF")
    d = ImageDraw.Draw(im)
    if stripes:
        _stripes(d, t, 70)
        _stripes(d, t, S - 104)
    _c(d, 200, script, _f(F_SCRIPT, 58), t.point)
    _c(d, 285, title, sans(52, 800), t.ink)
    y = 430 if len(items) <= 3 else 400
    gap = 112 if len(items) <= 3 else 92
    f = sans(34, 500)
    # 가장 긴 항목 기준으로 블록 전체를 가운데에 둔다
    bw = 46 + 30 + max(d.textlength(it, font=f) for it in items)
    x0 = (S - bw) / 2
    for i, it in enumerate(items, 1):
        d.ellipse((x0, y + 4, x0 + 46, y + 50), fill=t.point)
        _c(d, y + 9, str(i), sans(26, 700), "#FFFFFF", x0=x0, w=46)
        d.text((x0 + 76, y + 3), it, font=f, fill=t.text)
        y += gap
    return im


def overview(t: Theme, title: str, rows: list[tuple[str, str, list[str]]], foot: str = "") -> Image.Image:
    """한눈에 보기 카드. rows=[(항목명, 설명, [해시태그...])]."""
    im = Image.new("RGB", (S, S), t.tint)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, 60, S - 60, S - 60), radius=40, fill="#FFFFFF")
    _c(d, 120, title, sans(48, 800), t.text)
    y = 240
    for name, desc, tags in rows:
        d.text((120, y), name, font=sans(36, 800), fill=t.point)
        d.text((120, y + 56), desc, font=sans(30, 400), fill=t.text)
        x = 120
        for tag in tags:
            tf = sans(24, 500)
            w = d.textlength("# " + tag, font=tf) + 40
            d.rounded_rectangle((x, y + 112, x + w, y + 158), radius=23, fill=t.tint)
            d.text((x + 20, y + 120), "# " + tag, font=tf, fill=t.text)
            x += w + 14
        y += 210
    if foot:
        _c(d, S - 130, foot, sans(26, 400), t.sub)
    return im


def product(t: Theme, cut: Image.Image, brand: str, name: str, category: str, tag: str) -> Image.Image:
    """제품 카드 (기존 '#06 모비쉬' 카드)."""
    im = Image.new("RGB", (S, S), t.tint)
    # 빛나는 흰 원
    glow = Image.new("L", (S, S), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((200, 180, 800, 780), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    white = Image.new("RGB", (S, S), "#FFFFFF")
    im = Image.composite(white, im, glow)
    d = ImageDraw.Draw(im)
    d.line((70, 62, 70, 182), fill=t.point, width=4)
    d.text((92, 58), brand, font=sans(30, 500), fill=t.text)
    d.text((92, 98), name, font=sans(30, 500), fill=t.text)
    d.text((92, 138), category, font=sans(30, 500), fill=t.point)
    _place_product(im, cut, S / 2, 480, 420, 520)
    d = ImageDraw.Draw(im)
    _c(d, 840, tag, sans(52, 800), t.text)
    return im


def palette(t: Theme, title: str, en: str, swatches: list[tuple[str, str]], foot: str = "") -> Image.Image:
    """팔레트 카드. swatches=[(이름, '#HEX')], 최대 8개."""
    im = Image.new("RGB", (S, S), "#FFFFFF")
    d = ImageDraw.Draw(im)
    _c(d, 70, title, sans(52, 800), t.text)
    _c(d, 145, en, sans(28, 400), t.point)
    n = len(swatches)
    rows = [swatches[:4], swatches[4:]] if n > 4 else [swatches]
    y = 230
    for row in rows:
        w = 180
        gap = 40
        x0 = (S - (len(row) * w + (len(row) - 1) * gap)) / 2
        for i, (nm, hx) in enumerate(row):
            x = x0 + i * (w + gap)
            d.rounded_rectangle((x, y, x + w, y + w), radius=28, fill=hx)
            _c(d, y + w + 16, nm, sans(28, 600), t.text, x0=x, w=w)
            _c(d, y + w + 56, hx.upper(), sans(20, 400), t.sub, x0=x, w=w)
        y += 330
    if foot:
        _c(d, S - 110, foot, sans(28, 500), t.point)
    return im
