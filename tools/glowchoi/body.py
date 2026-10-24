"""글로우 초이 본문 이미지 카드 (썸네일과 같은 톤).

style="A": 썸네일 1번(시상대형)과 짝. 가운데 정렬, 위 영문 라벨 + 굵은 제목, 흰 둥근 카드.
style="B": 썸네일 2번(사진+라벨형)과 짝. 왼쪽 정렬, 모카/흰 라벨 박스 제목, 사각 카드.
색: 로지 베이지 배경 + 모카 포인트 + 다크 모카 글자 (상위 10% 썸네일 분석, design-template.md 6절).
"""
from __future__ import annotations

from PIL import Image, ImageDraw

from thumbs import (INK, MOCHA, ROSY, S, grain, light, pedestal, pill, pre, serif_en, stand,
                    tracked, vgrad)

TOP = "#F3E5DD"
SUB = "#8C6E5E"
CARD = "#FFFFFF"
CHIP = "#F3E5DD"


def _bg(style):
    im = vgrad("#F6ECE6", "#EBD5C9") if style == "A" else vgrad("#F1E4DC", "#E6CFC2")
    return light(im, 500, 300, 520, 0.35).convert("RGBA")


def _header(d, style, en, title, y=70):
    """카드 위쪽 제목. 다음 내용이 시작할 y를 돌려준다."""
    if style == "A":
        tracked(d, (500, y), en.upper(), pre(20, "SemiBold"), SUB, 5, "c")
        tracked(d, (500, y + 40), title, pre(64, "Black"), INK, -2, "c")
        return y + 150
    f1, f2 = pre(26, "Bold"), pre(58, "Black")
    w1 = d.textlength(en.upper(), font=f1) + 2 * (len(en) - 1) + 36
    d.rectangle((70, y, 70 + w1, y + 46), fill=MOCHA)
    tracked(d, (88, y + 8), en.upper(), f1, "#FFFFFF", 2)
    w2 = d.textlength(title, font=f2) + 44
    d.rectangle((70, y + 54, 70 + w2, y + 136), fill=CARD)
    d.text((92, y + 60), title, font=f2, fill=INK)
    return y + 175


def _num(d, x, y, n, style, r=26):
    if style == "A":
        d.ellipse((x, y, x + r * 2, y + r * 2), fill=MOCHA)
    else:
        d.rectangle((x, y, x + r * 2, y + r * 2), fill=MOCHA)
    f = pre(26, "Bold")
    bb = d.textbbox((0, 0), str(n), font=f)
    d.text((x + r - (bb[2] - bb[0]) / 2 - bb[0], y + r - (bb[3] - bb[1]) / 2 - bb[1]), str(n), font=f, fill="#FFFFFF")


def _card(d, box, style):
    if style == "A":
        d.rounded_rectangle(box, radius=28, fill=CARD)
    else:
        d.rectangle(box, fill=CARD)


def checklist(style, en, title, items, foot=""):
    """번호 목록 카드 (체크 포인트, 루틴)."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y = _header(d, style, en, title)
    n = len(items)
    gap = 22
    h = min(185, (S - y - 80 - gap * (n - 1)) / n)
    y += (S - y - 80 - (h * n + gap * (n - 1))) / 2  # 남는 여백은 위아래로 나눔
    for i, it in enumerate(items, 1):
        _card(d, (70, y, S - 70, y + h), style)
        _num(d, 105, y + h / 2 - 28, i, style, 28)
        lines = it.split("\n")
        if len(lines) == 1:
            f = pre(38, "Bold")
            bb = d.textbbox((0, 0), it, font=f)
            d.text((190, y + h / 2 - (bb[3] - bb[1]) / 2 - bb[1]), it, font=f, fill=INK)
        else:
            d.text((190, y + h / 2 - 52), lines[0], font=pre(38, "Bold"), fill=INK)
            d.text((190, y + h / 2 + 8), lines[1], font=pre(29, "Medium"), fill=SUB)
        y += h + gap
    if foot:
        tracked(d, (500, S - 70), foot, pre(26, "Medium"), SUB, 0, "c")
    return grain(im.convert("RGB"), 2.5)


def ingredients(style, en, title, rows):
    """한눈에 보기 카드. rows=[(성분, 설명, [태그])]."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y = _header(d, style, en, title)
    h = (S - y - 70 - 2 * 20) / len(rows)
    for name, desc, tags in rows:
        _card(d, (70, y, S - 70, y + h), style)
        d.text((110, y + 30), name, font=pre(40, "Black"), fill=MOCHA)
        d.text((110, y + 90), desc, font=pre(30, "Medium"), fill=INK)
        x = 110
        for t in tags:
            f = pre(23, "SemiBold")
            w = d.textlength("# " + t, font=f) + 36
            if style == "A":
                d.rounded_rectangle((x, y + h - 66, x + w, y + h - 24), radius=21, fill=CHIP)
            else:
                d.rectangle((x, y + h - 66, x + w, y + h - 24), fill=CHIP)
            d.text((x + 18, y + h - 60), "# " + t, font=f, fill=SUB)
            x += w + 12
        y += h + 20
    return grain(im.convert("RGB"), 2.5)


def product(style, cut, no, brand, name, tag, point, photo: Image.Image | None = None):
    """제품 카드. A = 받침대 위 제품, B = 사진 배경 + 왼쪽 아래 라벨."""
    if style == "A":
        im = _bg("A")
        d = ImageDraw.Draw(im)
        tracked(d, (500, 66), f"NO. {no:02d}", serif_en(40, 600, False), MOCHA, 2, "c")
        tracked(d, (500, 118), brand.upper(), pre(22, "SemiBold"), SUB, 5, "c")
        tracked(d, (500, 156), name, pre(46, "Black"), INK, -1, "c")
        b = pedestal(im, 500, 800, 330, 150, "#F5E8E0")
        stand(im, cut, 500, b + 6, 230, 500)
        d = ImageDraw.Draw(im)
        pill(d, 500, 890, f"{tag}  ·  {point}", pre(28, "Bold"), "#FFFFFF", MOCHA, h=60)
        return grain(im.convert("RGB"), 2.5)
    # B
    if photo is not None:
        w, h = photo.size
        m = min(w, h)
        bg = photo.convert("RGB").crop(((w - m) // 2, (h - m) // 2, (w + m) // 2, (h + m) // 2)).resize((S, S))
        im = Image.blend(bg, Image.new("RGB", (S, S), ROSY), 0.22).convert("RGBA")
    else:
        im = _bg("B")
    d = ImageDraw.Draw(im)
    d.text((70, 50), f"{no:02d}", font=serif_en(100, 600, False), fill=MOCHA)
    f1 = pre(26, "Bold")
    w1 = d.textlength(brand.upper(), font=f1) + 2 * (len(brand) - 1) + 36
    d.rectangle((70, 180, 70 + w1, 226), fill=MOCHA)
    tracked(d, (88, 188), brand.upper(), f1, "#FFFFFF", 2)
    f2 = pre(46, "Black")
    w2 = d.textlength(name, font=f2) + 44
    d.rectangle((70, 232, 70 + w2, 302), fill=CARD)
    d.text((92, 238), name, font=f2, fill=INK)
    f3 = pre(28, "Bold")
    t3 = f"{tag}  ·  {point}"
    w3 = d.textlength(t3, font=f3) + 36
    d.rectangle((70, 308, 70 + w3, 356), fill=CHIP)
    d.text((88, 316), t3, font=f3, fill=SUB)
    stand(im, cut, 560, 930, 260, 520, 0.75)
    return grain(im.convert("RGB"), 2.5)


def pick(style, en, title, rows):
    """선택 가이드. rows=[(고민, 제품명, 누끼)]."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y = _header(d, style, en, title)
    h = (S - y - 70 - 2 * 20) / len(rows)
    for i, (need, prod, cut) in enumerate(rows, 1):
        _card(d, (70, y, S - 70, y + h), style)
        _num(d, 100, y + 28, i, style, 22)
        d.text((160, y + 26), need, font=pre(32, "Bold"), fill=INK)
        d.text((160, y + 80), "→  " + prod, font=pre(30, "SemiBold"), fill=MOCHA)
        stand(im, cut, S - 150, y + h - 14, 110, h - 40, 0.5, cast=False)
        d = ImageDraw.Draw(im)
        y += h + 20
    return grain(im.convert("RGB"), 2.5)
