"""원고(.md) → 네이버 블로그에 붙여넣는 서식 HTML (기존 '블로그 서식 복사함' 스타일).

본문 가운데 15px #333, 소제목 왼쪽 19px 굵게, 강조는 나눔손글씨 펜 19px 포인트색.
사용: python3 format_html.py 원고.md 이미지폴더 포인트색 출력.html
"""
import html
import os
import re
import sys

PEN = "font-size:19px;font-family:'나눔손글씨 펜', 'Nanum Pen Script', cursive;"


def p(inner, align="center"):
    return f'<p style="text-align:{align};">{inner}</p>'


def body(t):
    return p(f'<span style="font-size:15px;color:#333333;">{html.escape(t)}</span>')


def pen(t, point):
    return p(f'<span style="{PEN}color:{point};">{html.escape(t)}</span>')


BR = p("<br>")


def convert(md, img_dir, point):
    lines = md.splitlines()
    out = [p(f'<b><span style="font-size:24px;color:{point};">{html.escape(lines[0])}</span></b>'), BR]
    mode = None
    rows = []
    for raw in lines[1:]:
        s = raw.strip()
        if mode == "table":
            if s and "|" in s:
                rows.append([c.strip() for c in s.split("|")])
                continue
            out.append(table(rows, point))
            mode, rows = None, []
        if not s:
            mode = None if mode == "box" else mode
            out.append(BR)
            continue
        if s.startswith("[인용구]"):
            out.append(p(f'<b><span style="font-size:19px;color:#333333;">{html.escape(s[5:].strip())}</span></b>', "left"))
        elif s.startswith("[이미지"):
            m = re.search(r"→\s*(\S+)\]", s)
            if m:
                out.append(p(f'<img src="{img_dir}/{m.group(1)}" alt="" style="max-width:100%;">'))
        elif s == "[강조 박스]":
            mode = "box"
        elif s == "[표]":
            mode = "table"
        elif s.startswith("[쇼핑커넥트"):
            out.append(p('<span style="font-size:13px;color:#999999;">(쇼핑커넥트 상품 3개를 여기에 넣어요)</span>'))
        elif mode == "box" or s.startswith("→"):
            out.append(pen(s.lstrip("→ ").strip(), point))
        elif re.match(r"^0\d\. ", s):
            out.append(p(f'<b><span style="font-size:15px;color:#333333;">{html.escape(s[4:])}</span></b>'
                         f' <b><span style="font-size:15px;color:{point};">#{s[:2]}</span></b>'))
        elif re.match(r"^\d\. ", s):
            out.append(p(f'<b><span style="font-size:15px;color:#333333;">✅ {html.escape(s[3:])}</span></b>'))
        else:
            out.append(body(s))
    if rows:
        out.append(table(rows, point))
    return "\n".join(out)


def table(rows, point):
    h = ['<table style="border-collapse:collapse;width:100%;margin:0 auto;">']
    for i, r in enumerate(rows):
        bg = f"background:{point}22;font-weight:700;" if i == 0 else ""
        cells = "".join(
            f'<td style="border:1px solid #e2e2e2;padding:8px;text-align:center;font-size:14px;color:#333333;{bg}">{html.escape(c)}</td>'
            for c in r)
        h.append(f"<tr>{cells}</tr>")
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
