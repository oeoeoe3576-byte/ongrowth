"""원고(.md) → 네이버 블로그에 붙여넣는 서식 HTML (기존 '블로그 서식 복사함' 스타일).

본문 가운데 15px #333, 소제목 왼쪽 19px 굵게, 강조는 나눔손글씨 펜 19px 포인트색.
사용: python3 format_html.py 원고.md 이미지폴더 포인트색 출력.html

원고 표시:
  ==문구==          문장 안 손글씨 강조 (나눔손글씨 펜 19px 포인트색)
  **문구**          문장 안 굵게
  [부제] 문구       제목 아래 손글씨 부제
  01. 제품명 #태그  굵은 제품명 + 굵은 포인트색 #태그
  [마무리] 문구     손글씨 마무리 줄
  [태그] #a #b      태그 줄
"""
import html
import os
import re
import sys

PEN = "font-size:19px;font-family:'나눔손글씨 펜', 'Nanum Pen Script', cursive;"


def p(inner, align="center"):
    return f'<p style="text-align:{align};">{inner}</p>'


def inline(t, point):
    """==손글씨==, **굵게** 를 원래 서식 span 으로 바꾼다."""
    out = []
    for part in re.split(r"(==.+?==|\*\*.+?\*\*)", t):
        if not part:
            continue
        if part.startswith("=="):
            out.append(f'<span style="{PEN}color:{point};">{html.escape(part[2:-2])}</span>')
        elif part.startswith("**"):
            out.append(f'<b><span style="font-size:15px;color:#333333;">{html.escape(part[2:-2])}</span></b>')
        else:
            out.append(f'<span style="font-size:15px;color:#333333;">{html.escape(part)}</span>')
    return "".join(out)


def body(t, point="#333333"):
    return p(inline(t, point))


def pen(t, point):
    return p(f'<span style="{PEN}color:{point};">{html.escape(t)}</span>')


BR = p("<br>")


def shades(point):
    """포인트색에서 진한 글자색, 연한 배경, 테두리색을 만든다."""
    r, g, b = (int(point.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    mix = lambda t, c: "#%02X%02X%02X" % tuple(round(v + (c - v) * t) for v in (r, g, b))
    dark = "#%02X%02X%02X" % tuple(round(v * 0.72) for v in (r, g, b))
    return dark, mix(0.9, 255), mix(0.55, 255)


def quote_bar(text, point):
    """인용구(왼쪽 세로 바) 소제목. 붙여넣기에서 서식이 유지되도록 1칸 표로 만든다."""
    dark, light, _ = shades(point)
    return (f'<table style="width:100%;border-collapse:collapse;margin:8px 0 18px;"><tr>'
            f'<td style="border-left:5px solid {point};background:{light};padding:14px 18px;text-align:left;">'
            f'<b><span style="font-size:19px;color:{dark};">{html.escape(text)}</span></b></td></tr></table>')


def emphasis_box(lines, point):
    """강조 박스: 점선 테두리 1칸 표 (10/22 디자인본과 같은 형식)."""
    dark, light, line = shades(point)
    inner = "<br>".join(html.escape(l) for l in lines)
    return (f'<table style="width:100%;border-collapse:collapse;margin:8px 0 24px;"><tr>'
            f'<td style="background:{light};border:2px dashed {line};padding:22px 20px;text-align:center;'
            f'font-size:16px;line-height:1.9;color:{dark};"><b>{inner}</b></td></tr></table>')


def convert(md, img_dir, point):
    lines = md.splitlines()
    out = [p(f'<b><span style="font-size:24px;color:{point};">{html.escape(lines[0])}</span></b>'), BR]
    mode = None
    rows = []
    box = []
    for raw in lines[1:]:
        s = raw.strip()
        if mode == "table":
            if s and "|" in s:
                rows.append([c.strip() for c in s.split("|")])
                continue
            out.append(table(rows, point))
            mode, rows = None, []
        if mode == "box":
            if s:
                box.append(s)
                continue
            out.append(emphasis_box(box, point))  # 빈 줄에서 강조 박스가 끝난다
            mode, box = None, []
        if not s:
            out.append(BR)
            continue
        if s.startswith("[인용구]"):
            out.append(quote_bar(s[5:].strip(), point))
        elif s.startswith("[이미지"):
            m = re.search(r"→\s*(\S+)\]", s)
            if m:
                out.append(p(f'<img src="{img_dir}/{m.group(1)}" alt="" style="max-width:100%;">'))
        elif s == "[강조 박스]":
            mode = "box"
        elif s == "[표]":
            mode = "table"
        elif s.startswith("[부제]"):
            out.append(pen(s[4:].strip(), point))
        elif s.startswith("[마무리]"):
            out.append(pen(s[5:].strip(), point))
        elif s.startswith("[태그]"):
            out.append(p(f'<span style="font-size:13px;color:#999999;">{html.escape(s[4:].strip())}</span>'))
        elif s.startswith("[쇼핑커넥트"):
            out.append(p('<span style="font-size:13px;color:#999999;">(쇼핑커넥트 상품 3개를 여기에 넣어요)</span>'))
        elif s.startswith("→"):
            out.append(pen(s.lstrip("→ ").strip(), point))
        elif re.match(r"^0\d\. ", s):
            name, _, tag = s[4:].partition(" #")
            tag = "#" + tag if tag else "#" + s[:2]
            out.append(p(f'<b><span style="font-size:15px;color:#333333;">{html.escape(name)}</span></b>'
                         f'<span style="font-size:15px;color:#333333;"> </span>'
                         f'<b><span style="font-size:15px;color:{point};">{html.escape(tag)}</span></b>'))
        elif re.match(r"^\d\. ", s):
            out.append(p(f'<b><span style="font-size:15px;color:#333333;">✅{html.escape(s[3:])}</span></b>'))
        else:
            out.append(body(s, point))
    if rows:
        out.append(table(rows, point))
    if box:
        out.append(emphasis_box(box, point))
    return "\n".join(out)


def table(rows, point):
    """비교 표: 포인트색 테두리, 머리 행·첫 열 연한 배경 (10/22 디자인본과 같은 형식)."""
    dark, light, line = shades(point)
    cell = f"border:1px solid {line};padding:10px 8px;font-size:14px;text-align:center;"
    h = ['<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">']
    for i, r in enumerate(rows):
        tds = []
        for j, c in enumerate(r):
            if i == 0:
                tds.append(f'<td style="{cell}background:{light};color:{dark};font-weight:bold;">{html.escape(c)}</td>')
            elif j == 0:
                tds.append(f'<td style="{cell}background:{light};color:{dark};font-weight:bold;">{html.escape(c)}</td>')
            else:
                tds.append(f'<td style="{cell}color:#333333;">{html.escape(c)}</td>')
        h.append("<tr>" + "".join(tds) + "</tr>")
    h.append("</table>")
    return "".join(h)


PAGE = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Pen+Script&display=swap">
<style>
:root{{--bg:#f2f4f2;--fg:#1f2421;--go:#03c75a}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#151916;--fg:#e8ece9}}}}
:root[data-theme="dark"]{{--bg:#151916;--fg:#e8ece9}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:'Nanum Gothic',sans-serif}}
.wrap{{max-width:720px;margin:0 auto;padding:20px 16px 60px}}
.bar{{position:sticky;top:0;background:var(--bg);padding:10px 0;display:flex;gap:8px;align-items:center}}
button{{font:inherit;font-weight:800;background:var(--go);color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}}
.paper{{background:#fff;color:#333;border-radius:10px;padding:28px 18px;font-family:'Nanum Gothic',sans-serif;line-height:1.8}}
.paper p{{margin:0}} .paper img{{display:inline-block;max-width:100%;border-radius:4px}}
.paper [style*="Nanum Pen"]{{font-family:'Nanum Pen Script',cursive!important}}
</style></head><body><div class="wrap">
<div class="bar"><button id="cp">전체 복사</button><span id="msg"></span></div>
<div class="paper" id="paper">
{content}
</div></div>
<script>
document.getElementById('cp').onclick=async()=>{{
 const el=document.getElementById('paper');
 try{{await navigator.clipboard.write([new ClipboardItem({{'text/html':new Blob([el.innerHTML],{{type:'text/html'}}),'text/plain':new Blob([el.innerText],{{type:'text/plain'}})}})]);}}
 catch(e){{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');s.removeAllRanges();}}
 document.getElementById('msg').textContent='복사됐어요. 네이버 글쓰기에 붙여넣으세요.';
}};
</script></body></html>"""

if __name__ == "__main__":
    src, img_dir, point, dst = sys.argv[1:5]
    md = open(src, encoding="utf-8").read()
    title = md.splitlines()[0]
    open(dst, "w", encoding="utf-8").write(PAGE.format(title="글로우 초이 서식", content=convert(md, img_dir, point)))
    print(dst)
