# 다크서클 레터용 그래픽(직접 제작 SVG)
SKIN = "#F3D5C3"
def eye(cx, cy, s, dc, dc_op=0.75, lash=True):
    """눈 하나 + 눈 밑 다크서클. s=배율"""
    g = []
    g.append(f'<ellipse cx="{cx}" cy="{cy+62*s}" rx="{120*s}" ry="{44*s}" fill="{dc}" opacity="{dc_op}" filter="url(#blur)"/>')
    g.append(f'<path d="M{cx-120*s} {cy} Q{cx} {cy-78*s} {cx+120*s} {cy} Q{cx} {cy+52*s} {cx-120*s} {cy} Z" fill="#fff" stroke="#3A2A2E" stroke-width="{6*s}"/>')
    g.append(f'<circle cx="{cx}" cy="{cy-6*s}" r="{40*s}" fill="#5B3B2E"/><circle cx="{cx}" cy="{cy-6*s}" r="{20*s}" fill="#1E1416"/>')
    g.append(f'<circle cx="{cx+14*s}" cy="{cy-20*s}" r="{9*s}" fill="#fff"/>')
    if lash:
        for i in range(7):
            x = cx - 90*s + i*30*s
            g.append(f'<line x1="{x}" y1="{cy-48*s+abs(i-3)*8*s}" x2="{x+6*s}" y2="{cy-74*s+abs(i-3)*8*s}" stroke="#3A2A2E" stroke-width="{5*s}" stroke-linecap="round"/>')
    return "".join(g)

DEFS = '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter></defs>'

# 1) 썸네일 배경: 큰 눈, 왼쪽은 다크서클 / 오른쪽은 커버된 상태
hero = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">', DEFS,
        f'<rect width="1080" height="1920" fill="{SKIN}"/>',
        '<clipPath id="L"><rect x="0" y="0" width="540" height="1920"/></clipPath><clipPath id="R"><rect x="540" y="0" width="540" height="1920"/></clipPath>',
        f'<g clip-path="url(#L)">{eye(540, 520, 3.0, "#7E8CB0", .85)}</g>',
        f'<g clip-path="url(#R)">{eye(540, 520, 3.0, "#F2B48F", .55)}</g>',
        '<line x1="540" y1="230" x2="540" y2="880" stroke="#fff" stroke-width="8" stroke-dasharray="20 16"/>',
        '<text x="270" y="900" font-family="Pretendard, sans-serif" font-size="54" font-weight="800" fill="#3A2A2E" text-anchor="middle">BEFORE</text>',
        '<text x="810" y="900" font-family="Pretendard, sans-serif" font-size="54" font-weight="800" fill="#D6336C" text-anchor="middle">AFTER</text>',
        '</svg>']
open("img/hero.svg", "w").write("".join(hero))

# 2) 퀴즈: 다크서클 4가지 (A~D)
TYPES = [("A", "푸르스름", "#8E9CC0", .8), ("B", "진한 푸른빛", "#5D6E9E", .9), ("C", "보랏빛", "#9A7BAE", .85), ("D", "그림자", "#8A7468", .7)]
q = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 900">', DEFS]
for i, (k, name, c, op) in enumerate(TYPES):
    x, y = (i % 2) * 480, (i // 2) * 450
    q.append(f'<rect x="{x}" y="{y}" width="460" height="430" rx="28" fill="{SKIN}" stroke="#3A2A2E" stroke-width="4"/>')
    q.append(eye(x + 230, y + 170, 1.25, c, op))
    q.append(f'<circle cx="{x+50}" cy="{y+50}" r="30" fill="#3A2A2E"/><text x="{x+50}" y="{y+62}" font-size="34" font-weight="800" fill="#fff" text-anchor="middle">{k}</text>')
    q.append(f'<text x="{x+230}" y="{y+395}" font-size="44" font-weight="800" fill="#3A2A2E" text-anchor="middle">{name}</text>')
q.append('</svg>')
open("img/quiz.svg", "w").write("".join(q))

# 3) 정답 줄마다: 다크서클 색 → 컨실러 색 칩
PAIRS = [("A", "#8E9CC0", "#F2B48F"), ("B", "#5D6E9E", "#EE8B4E"), ("C", "#9A7BAE", "#F3D77A"), ("D", "#8A7468", "#F6C6CF")]
for k, a, b in PAIRS:
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 130">'
         f'<circle cx="60" cy="65" r="52" fill="{a}" stroke="#3A2A2E" stroke-width="4"/>'
         f'<path d="M122 65 H150 M140 52 L154 65 L140 78" stroke="#3A2A2E" stroke-width="6" fill="none" stroke-linecap="round"/>'
         f'<circle cx="200" cy="65" r="52" fill="{b}" stroke="#3A2A2E" stroke-width="4"/></svg>')
    open(f"img/pair_{k}.svg", "w").write(s)
print("ok")
