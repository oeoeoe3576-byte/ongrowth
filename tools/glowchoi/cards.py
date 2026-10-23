"""글로우 초이 블로그 이미지 카드 템플릿.

상위노출 뷰티 블로그 중 '실사 + 정보 카드'를 반반 섞는 계정
(momdreamz, jisun0410_, diayoon_, posynail, lovedarl2, hewtbylvv)의
카드 형식을 분석해 글로우 초이 규칙(한 글 = 포인트 컬러 한 계열,
그라데이션 금지, AI 얼굴 금지)에 맞춰 다시 만든 템플릿이다.

카드 종류
  cover      시리즈 표지 카드   사진 + 하단 단색 띠 + 시리즈 배지 + 질문형 제목
  caption    포토 캡션 카드     사진 + 하단 반투명 띠 + 태그 + 한 줄 제목
  steps      단계/비교 카드     제목 + 2~4칸 사진 + 칸별 라벨 + 하단 강조 문장
  product    제품 카드          누끼 제품 + 해시태그 줄 + 제품명 + 한 줄 특징
  sheet      정보 시트 카드     번호 태그 + 제목 + 영문 부제 + 항목 박스 2~3개
  guide      선택 가이드 카드   고민 → 추천 매핑 3줄

공통 프레임: 포인트 컬러 점선 테두리 + 오른쪽 아래 'GLOW CHOI' 표기.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SANS = os.path.join(HERE, "NotoSansKR.ttf")
SERIF = os.path.join(HERE, "NanumMyeongjo-Bold.ttf")
W = H = 1080


@dataclass
class Palette:
    """한 글에서 쓰는 포인트 컬러 한 계열."""

    bg: tuple  # 거의 흰색에 가까운 배경
    soft: tuple  # 강조 박스 배경
    point: tuple  # 진한 포인트 (제목, 테두리)
    ink: tuple = (40, 36, 34)
    sub: tuple = (118, 108, 100)


PALETTES = {
    "apricot": Palette(bg=(251, 247, 242), soft=(247, 233, 218), point=(170, 104, 54)),
    "burgundy": Palette(bg=(250, 245, 245), soft=(242, 224, 226), point=(122, 31, 43)),
    "rose": Palette(bg=(252, 246, 246), soft=(246, 226, 228), point=(176, 82, 96)),
    "taupe": Palette(bg=(249, 246, 242), soft=(236, 228, 219), point=(122, 98, 82)),
    "lilac": Palette(bg=(248, 246, 251), soft=(232, 226, 243), point=(104, 78, 140)),
    "mint": Palette(bg=(245, 249, 247), soft=(222, 238, 231), point=(47, 93, 80)),
}


def font(size: int, weight: int = 700, serif: bool = False) -> ImageFont.FreeTypeFont:
    if serif:
        return ImageFont.truetype(SERIF, size)
    f = ImageFont.truetype(SANS, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def _fit(img: Image.Image, w: int, h: int) -> Image.Image:
    img = img.convert("RGB")
    r = max(w / img.width, h / img.height)
    img = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


def _center(d: ImageDraw.ImageDraw, y: int, text: str, f, fill, width: int = W, x0: int = 0):
    tw = d.textlength(text, font=f)
    d.text((x0 + (width - tw) / 2, y), text, font=f, fill=fill)


def _wrap(d, text: str, f, maxw: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split(" "):
        test = (cur + " " + word).strip()
        if d.textlength(test, font=f) <= maxw:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def _frame(im: Image.Image, p: Palette, mark: bool = True) -> Image.Image:
    d = ImageDraw.Draw(im)
    m, dash, gap = 22, 10, 7
    for x in range(m, W - m, dash + gap):
        d.line((x, m, min(x + dash, W - m), m), fill=p.point, width=2)
        d.line((x, H - m, min(x + dash, W - m), H - m), fill=p.point, width=2)
    for y in range(m, H - m, dash + gap):
        d.line((m, y, m, min(y + dash, H - m)), fill=p.point, width=2)
        d.line((W - m, y, W - m, min(y + dash, H - m)), fill=p.point, width=2)
    if mark:
        f = font(20, 600)
        t = "GLOW CHOI"
        d.text((W - m - 16 - d.textlength(t, font=f), H - m - 38), t, font=f, fill=p.point)
    return im


def _pill(d, cx: int, y: int, text: str, f, bg, fg, padx: int = 22, pady: int = 8):
    tw = d.textlength(text, font=f)
    h = f.size + pady * 2
    d.rounded_rectangle((cx - tw / 2 - padx, y, cx + tw / 2 + padx, y + h), radius=h // 2, fill=bg)
    d.text((cx - tw / 2, y + pady - f.size * 0.12), text, font=f, fill=fg)
    return y + h


def cover(photo: Image.Image, series: str, title: str, subtitle: str, p: Palette, contain: bool = False) -> Image.Image:
    """시리즈 표지 카드. 사진 위 하단 단색 띠에 질문형 제목.

    contain=True면 사진을 자르지 않고 띠 위 영역 안에 통째로 넣는다(제품 라인업용).
    """
    band_h = 330
    if contain:
        im = Image.new("RGB", (W, H), p.bg)
        ph = photo.convert("RGB")
        r = min((W - 120) / ph.width, (H - band_h - 80) / ph.height)
        ph = ph.resize((int(ph.width * r), int(ph.height * r)), Image.LANCZOS)
        im.paste(ph, ((W - ph.width) // 2, 50 + (H - band_h - 80 - ph.height) // 2))
    else:
        im = _fit(photo, W, H)
    band = Image.new("RGB", (W, band_h), p.bg)
    im.paste(band, (0, H - band_h))
    d = ImageDraw.Draw(im)
    y = H - band_h + 40
    y = _pill(d, W // 2, y, series, font(24, 700), p.point, (255, 255, 255)) + 26
    for line in title.split("\n"):
        _center(d, y, line, font(52, 800), p.ink)
        y += 70
    _center(d, y + 6, subtitle, font(26, 400), p.sub)
    return _frame(im, p)


def caption(photo: Image.Image, tag: str, title: str, p: Palette, sub: str = "") -> Image.Image:
    """포토 캡션 카드. 사진 하단에 반투명 띠 + 태그 + 한 줄 제목."""
    im = _fit(photo, W, H).convert("RGBA")
    band_h = 210 if sub else 170
    overlay = Image.new("RGBA", (W, band_h), p.bg + (232,))
    im.alpha_composite(overlay, (0, H - band_h))
    im = im.convert("RGB")
    d = ImageDraw.Draw(im)
    y = H - band_h + 26
    y = _pill(d, W // 2, y, tag, font(22, 700), p.point, (255, 255, 255)) + 16
    _center(d, y, title, font(40, 700), p.ink)
    if sub:
        _center(d, y + 56, sub, font(24, 400), p.sub)
    return _frame(im, p)


def steps(title: str, items: list[tuple[str, str]], p: Palette, photos: list[Image.Image] | None = None,
          note: str = "") -> Image.Image:
    """단계/비교 카드. items = [(라벨, 설명)], photos가 있으면 칸마다 사진."""
    im = Image.new("RGB", (W, H), p.bg)
    d = ImageDraw.Draw(im)
    _center(d, 110, title, font(50, 800), p.ink)
    n = len(items)
    gap, mx = 26, 80
    cw = (W - 2 * mx - gap * (n - 1)) // n
    top = 260 if photos else 330
    desc_lines = [d2 for _, d2 in items]
    nlines = max(len(x.split("\n")) for x in desc_lines)
    ch = (cw - 36 + 24 if photos else 0) + 110 + 50 * nlines + 30
    for k, (label, desc) in enumerate(items):
        x = mx + k * (cw + gap)
        last = k == n - 1
        d.rounded_rectangle((x, top, x + cw, top + ch), radius=22,
                            fill=p.soft if last else (255, 255, 255), outline=p.point, width=3 if last else 2)
        yy = top + 34
        _center(d, yy, label, font(26, 700), p.point, width=cw, x0=x)
        yy += 56
        if photos and k < len(photos):
            ph = _fit(photos[k], cw - 36, cw - 36)
            im.paste(ph, (x + 18, yy))
            yy += cw - 36 + 24
        for part in desc.split("\n"):
            for line in _wrap(d, part, font(32, 600), cw - 30):
                _center(d, yy, line, font(32, 600), p.ink, width=cw, x0=x)
                yy += 50
        if k < n - 1:
            ax = x + cw + gap // 2
            d.polygon([(ax - 7, top + ch / 2 - 10), (ax + 7, top + ch / 2), (ax - 7, top + ch / 2 + 10)], fill=p.point)
    if note:
        for i, line in enumerate(_wrap(d, note, font(28, 500), W - 2 * mx)):
            _center(d, top + ch + 70 + i * 42, line, font(28, 500), p.sub)
    return _frame(im, p)


def product(cutout: Image.Image, hashtags: str, name: str, point: str, p: Palette, badge: str = "") -> Image.Image:
    """제품 카드. 누끼 이미지 + 해시태그 + 제품명 + 한 줄 특징."""
    im = Image.new("RGB", (W, H), p.bg)
    d = ImageDraw.Draw(im)
    cut = cutout.convert("RGBA")
    box_w, box_h = 620, 600
    r = min(box_w / cut.width, box_h / cut.height)
    cut = cut.resize((int(cut.width * r), int(cut.height * r)), Image.LANCZOS)
    cx, cy = (W - cut.width) // 2, 110 + (box_h - cut.height) // 2
    a = cut.getchannel("A").point(lambda v: int(v * 0.16))
    sh = Image.new("RGBA", cut.size, (60, 40, 30, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    im.paste(sh, (cx + 10, cy + 18), sh)
    im.paste(cut, (cx, cy), cut)
    if badge:
        _pill(d, 150, 70, badge, font(22, 700), p.point, (255, 255, 255))
    y = 760
    _center(d, y, hashtags, font(26, 600), p.point)
    y += 52
    for line in _wrap(d, name, font(40, 800), W - 200):
        _center(d, y, line, font(40, 800), p.ink)
        y += 56
    _center(d, y + 4, point, font(28, 400), p.sub)
    return _frame(im, p)


def sheet(no: str, title: str, en: str, blocks: list[tuple[str, list[str]]], p: Palette) -> Image.Image:
    """정보 시트 카드. blocks = [(박스 제목, [항목...])]."""
    im = Image.new("RGB", (W, H), p.bg)
    d = ImageDraw.Draw(im)
    _pill(d, W // 2, 80, no, font(22, 700), p.point, (255, 255, 255))
    _center(d, 140, title, font(54, 800), p.ink)
    _center(d, 216, en, font(26, serif=True), p.point)
    y = 300
    mx = 90
    for head, lines in blocks:
        h = 70 + 46 * len(lines)
        d.rounded_rectangle((mx, y, W - mx, y + h), radius=20, fill=(255, 255, 255), outline=p.soft, width=3)
        _pill(d, mx + 120, y - 18, head, font(22, 700), p.soft, p.point)
        yy = y + 40
        for line in lines:
            d.ellipse((mx + 40, yy + 15, mx + 50, yy + 25), fill=p.point)
            d.text((mx + 68, yy), line, font=font(28, 500), fill=p.ink)
            yy += 46
        y += h + 46
    return _frame(im, p)


def guide(title: str, rows: list[tuple[str, str]], p: Palette, foot: str = "") -> Image.Image:
    """선택 가이드 카드. rows = [(고민, 추천)]."""
    im = Image.new("RGB", (W, H), p.bg)
    d = ImageDraw.Draw(im)
    _center(d, 120, title, font(52, 800), p.ink)
    y, mx = 260, 80
    for need, pick in rows:
        d.rounded_rectangle((mx, y, W - mx, y + 170), radius=22, fill=(255, 255, 255), outline=p.soft, width=3)
        d.text((mx + 40, y + 34), need, font=font(28, 500), fill=p.sub)
        d.text((mx + 40, y + 86), "→ " + pick, font=font(36, 800), fill=p.point)
        y += 200
    if foot:
        _center(d, y + 30, foot, font(26, 400), p.sub)
    return _frame(im, p)
