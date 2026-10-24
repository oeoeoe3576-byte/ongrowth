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


# ---------- 서로 다른 구성의 정보 카드 3종 ----------
# 체크 포인트 = 2x2 타일, 성분 = 3열 비교표, 루틴 = 아이콘 단계 흐름.
# 같은 글 안에서 정보 카드가 같은 목록 모양으로 반복되지 않게 한다.

def _box(d, box, style, fill=CARD, r=26):
    if style == "A":
        d.rounded_rectangle(box, radius=r, fill=fill)
    else:
        d.rectangle(box, fill=fill)


def _check_mark(d, cx, cy, s, col, width=7):
    d.line((cx - s * 0.5, cy, cx - s * 0.12, cy + s * 0.38, cx + s * 0.55, cy - s * 0.4), fill=col, width=width, joint="curve")


def check_grid(style, en, title, tiles):
    """2x2 체크 타일. tiles=[(굵은 한 줄, 작은 설명)] 4개."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y0 = _header(d, style, en, title) + 10
    gap = 24
    w = (S - 140 - gap) / 2
    h = (S - y0 - 70 - gap) / 2
    for i, (head, sub) in enumerate(tiles):
        x = 70 + (i % 2) * (w + gap)
        y = y0 + (i // 2) * (h + gap)
        _box(d, (x, y, x + w, y + h), style)
        # 체크 아이콘
        cx, cy, r = x + 70, y + 78, 38
        if style == "A":
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CHIP)
        else:
            d.rectangle((cx - r, cy - r, cx + r, cy + r), fill=CHIP)
        _check_mark(d, cx, cy, 34, MOCHA)
        tracked(d, (x + w - 40, y + 50), f"0{i + 1}", serif_en(44, 600, False), "#D9BFB1", 0, "r")
        yy = y + 150
        for ln in head.split("\n"):
            d.text((x + 34, yy), ln, font=pre(36, "Black"), fill=INK)
            yy += 48
        yy += 8
        for ln in sub.split("\n"):
            d.text((x + 34, yy), ln, font=pre(25, "Medium"), fill=SUB)
            yy += 36
    return grain(im.convert("RGB"), 2.5)


def compare_columns(style, en, title, cols, row_labels=("이런 분께", "알아둘 점")):
    """3열 비교표. cols=[(기호, 성분명, 이런 분께, 알아둘 점)]."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y0 = _header(d, style, en, title) + 10
    gap = 18
    w = (S - 140 - gap * 2) / 3
    bottom = S - 70
    for i, (sym, name, good, note) in enumerate(cols):
        x = 70 + i * (w + gap)
        _box(d, (x, y0, x + w, bottom), style)
        # 위 색 띠 + 기호 원
        if style == "A":
            d.rounded_rectangle((x, y0, x + w, y0 + 190), radius=26, fill=CHIP)
            d.rectangle((x, y0 + 160, x + w, y0 + 190), fill=CHIP)
        else:
            d.rectangle((x, y0, x + w, y0 + 190), fill=CHIP)
        cx, cy, r = x + w / 2, y0 + 95, 64
        if style == "A":
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=MOCHA)
        else:
            d.rectangle((cx - r, cy - r, cx + r, cy + r), fill=MOCHA)
        f = serif_en(44 if len(sym) <= 3 else 32, 600, False)
        bb = d.textbbox((0, 0), sym, font=f)
        d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1]), sym, font=f, fill="#FFFFFF")
        yy = y0 + 222
        nf = pre(36 if len(name) <= 6 else 28, "Black")
        tracked(d, (cx, yy), name, nf, INK, 0, "c")
        yy += 76
        for lab, txt in zip(row_labels, (good, note)):
            d.line((x + 26, yy, x + w - 26, yy), fill=CHIP, width=2)
            yy += 26
            tracked(d, (cx, yy), lab, pre(24, "Bold"), MOCHA, 1, "c")
            yy += 48
            for ln in txt.split("\n"):
                tracked(d, (cx, yy), ln, pre(30, "SemiBold"), INK, 0, "c")
                yy += 44
            yy += 34
    return grain(im.convert("RGB"), 2.5)


def _icon(d, kind, cx, cy, s, col):
    if kind == "drop":
        d.polygon([(cx, cy - s * 0.62), (cx - s * 0.36, cy + s * 0.05), (cx + s * 0.36, cy + s * 0.05)], fill=col)
        d.ellipse((cx - s * 0.37, cy - s * 0.18, cx + s * 0.37, cy + s * 0.52), fill=col)
    elif kind == "tap":
        for k, a in ((0.55, 3), (0.36, 4)):
            d.ellipse((cx - s * k, cy - s * k, cx + s * k, cy + s * k), outline=col, width=a)
        d.ellipse((cx - s * 0.16, cy - s * 0.16, cx + s * 0.16, cy + s * 0.16), fill=col)
    elif kind == "sun":
        import math
        d.ellipse((cx - s * 0.26, cy - s * 0.26, cx + s * 0.26, cy + s * 0.26), fill=col)
        for k in range(8):
            a = math.pi / 4 * k
            d.line((cx + math.cos(a) * s * 0.38, cy + math.sin(a) * s * 0.38,
                    cx + math.cos(a) * s * 0.56, cy + math.sin(a) * s * 0.56), fill=col, width=6)


def steps_flow(style, en, title, steps, note=""):
    """아이콘 단계 흐름. steps=[(아이콘, 제목, 설명)], 아이콘 = drop / tap / sun."""
    im = _bg(style)
    d = ImageDraw.Draw(im)
    y0 = _header(d, style, en, title) + 30
    n = len(steps)
    xs = [70 + (S - 140) * (i + 0.5) / n for i in range(n)]
    cy, r = y0 + 120, 112
    # 연결선 (점선)
    x = xs[0]
    while x < xs[-1]:
        d.line((x, cy, min(x + 14, xs[-1]), cy), fill=MOCHA, width=4)
        x += 26
    for i, ((kind, head, sub), cx) in enumerate(zip(steps, xs)):
        if style == "A":
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CARD)
        else:
            d.rectangle((cx - r, cy - r, cx + r, cy + r), fill=CARD)
        _icon(d, kind, cx, cy, 118, MOCHA)
        pill(d, cx, cy + r + 28, f"STEP {i + 1}", pre(24, "Bold"), "#FFFFFF", MOCHA, padx=22, h=46)
        yy = cy + r + 104
        for ln in head.split("\n"):
            tracked(d, (cx, yy), ln, pre(36, "Black"), INK, 0, "c")
            yy += 48
        yy += 8
        for ln in sub.split("\n"):
            tracked(d, (cx, yy), ln, pre(27, "Medium"), SUB, 0, "c")
            yy += 38
    if note:
        by = S - 180
        _box(d, (70, by, S - 70, S - 70), style, fill=CARD, r=24)
        if style == "A":
            d.rounded_rectangle((70, by, 82, S - 70), radius=6, fill=MOCHA)
        else:
            d.rectangle((70, by, 82, S - 70), fill=MOCHA)
        head, sub = note.split("\n")
        d.text((110, by + 20), head, font=pre(32, "Black"), fill=INK)
        d.text((110, by + 64), sub, font=pre(25, "Medium"), fill=SUB)
    return grain(im.convert("RGB"), 2.5)
