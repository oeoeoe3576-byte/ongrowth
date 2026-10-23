# 고스트 래시 레터용 그래픽(직접 제작 SVG)
SKIN = "#F3D8C8"
DEFS = ('<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>'
        '<filter id="sh2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>')

def eye(cx, cy, s, heavy=False, shade=False, tight=False, brow=None):
    g = []
    if shade:  # 눈두덩 모카 음영 + 언더 바깥 그림자
        g.append(f'<ellipse cx="{cx+10*s}" cy="{cy-58*s}" rx="{120*s}" ry="{40*s}" fill="#A07A66" opacity=".55" filter="url(#sh)"/>')
        g.append(f'<ellipse cx="{cx+78*s}" cy="{cy+26*s}" rx="{48*s}" ry="{14*s}" fill="#9C7462" opacity=".55" filter="url(#sh2)"/>')
    if brow:
        g.append(f'<path d="M{cx-120*s} {cy-120*s} Q{cx-20*s} {cy-160*s} {cx+120*s} {cy-128*s}" stroke="{brow}" stroke-width="{14*s}" fill="none" stroke-linecap="round"/>')
    g.append(f'<path d="M{cx-120*s} {cy} Q{cx} {cy-78*s} {cx+120*s} {cy} Q{cx} {cy+52*s} {cx-120*s} {cy} Z" fill="#fff" stroke="#3A2A2E" stroke-width="{5*s}"/>')
    g.append(f'<circle cx="{cx}" cy="{cy-6*s}" r="{40*s}" fill="#5B3B2E"/><circle cx="{cx}" cy="{cy-6*s}" r="{20*s}" fill="#1E1416"/>')
    g.append(f'<circle cx="{cx+14*s}" cy="{cy-20*s}" r="{9*s}" fill="#fff"/>')
    if heavy:  # 마스카라 듬뿍: 굵고 뭉친 속눈썹 + 검은 라인
        g.append(f'<path d="M{cx-120*s} {cy} Q{cx} {cy-78*s} {cx+120*s} {cy}" stroke="#111" stroke-width="{12*s}" fill="none"/>')
        for i in range(9):
            x = cx - 104*s + i*26*s; top = cy - 50*s + abs(i-4)*7*s
            g.append(f'<path d="M{x} {top} q{4*s} {-34*s} {14*s} {-44*s}" stroke="#111" stroke-width="{9*s}" fill="none" stroke-linecap="round"/>')
    else:      # 고스트 래시: 얇게 컬만, 브라운 점막 라인
        if tight:
            g.append(f'<path d="M{cx-112*s} {cy-6*s} Q{cx} {cy-72*s} {cx+116*s} {cy-2*s}" stroke="#6B4A3A" stroke-width="{6*s}" fill="none"/>')
        for i in range(9):
            x = cx - 104*s + i*26*s; top = cy - 50*s + abs(i-4)*7*s
            g.append(f'<path d="M{x} {top} q{2*s} {-22*s} {14*s} {-30*s}" stroke="#5A4038" stroke-width="{3*s}" fill="none" stroke-linecap="round"/>')
    return "".join(g)

# 퀴즈 A vs B
q = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 560">', DEFS]
for i, (k, body) in enumerate([("A", eye(230, 300, 1.3, heavy=True, brow="#4A3328")),
                               ("B", eye(230, 300, 1.3, shade=True, tight=True, brow="#7A5A48"))]):
    q.append(f'<g transform="translate({i*480},0)"><rect width="460" height="540" rx="28" fill="{SKIN}" stroke="#3A2A2E" stroke-width="4"/>{body}')
    q.append(f'<circle cx="54" cy="54" r="32" fill="#3A2A2E"/><text x="54" y="67" font-size="36" font-weight="800" fill="#fff" text-anchor="middle">{k}</text></g>')
q.append('</svg>')
open("img/quiz.svg", "w").write("".join(q))

def icon(name, body):
    open(f"img/{name}.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 130">{DEFS}{body}</svg>')
icon("step1", eye(130, 95, .55) + '<path d="M60 40 q70 -40 140 0" stroke="#D6336C" stroke-width="5" fill="none" stroke-dasharray="8 6"/>')
icon("step2", eye(130, 80, .62, tight=True))
icon("step3", eye(130, 85, .6, shade=True))
icon("step4", eye(130, 110, .5, brow="#8A6A56"))
print("ok")
