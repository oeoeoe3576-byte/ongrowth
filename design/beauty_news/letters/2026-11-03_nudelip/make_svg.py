# 누드립 레터용 그래픽(직접 제작 SVG)
SKIN = "#F1D3C2"
def lips(cx, cy, s, fill, liner=None, tint=None, blur_edge=False, over=False):
    k = 1.08 if over else 1.0
    up = (f"M{cx-150*s*k} {cy} Q{cx-80*s*k} {cy-62*s*k} {cx-30*s} {cy-58*s*k} Q{cx} {cy-40*s} {cx+30*s} {cy-58*s*k} "
          f"Q{cx+80*s*k} {cy-62*s*k} {cx+150*s*k} {cy} Q{cx} {cy+14*s} {cx-150*s*k} {cy} Z")
    lo = f"M{cx-150*s*k} {cy} Q{cx} {cy+18*s} {cx+150*s*k} {cy} Q{cx+90*s} {cy+92*s*k} {cx} {cy+96*s*k} Q{cx-90*s} {cy+92*s*k} {cx-150*s*k} {cy} Z"
    g = []
    f = ' filter="url(#soft)"' if blur_edge else ''
    g.append(f'<g{f}><path d="{up}" fill="{fill}"/><path d="{lo}" fill="{fill}"/></g>')
    if tint:
        g.append(f'<ellipse cx="{cx}" cy="{cy+6*s}" rx="{70*s}" ry="{30*s}" fill="{tint}" opacity=".75" filter="url(#tint)"/>')
    if liner:
        g.append(f'<g filter="url(#line)"><path d="{up}" fill="none" stroke="{liner}" stroke-width="{7*s}"/><path d="{lo}" fill="none" stroke="{liner}" stroke-width="{7*s}"/></g>')
    g.append(f'<path d="M{cx-150*s*k} {cy} Q{cx} {cy+16*s} {cx+150*s*k} {cy}" stroke="#8A5A52" stroke-width="{3*s}" fill="none" opacity=".6"/>')
    return "".join(g)

DEFS = ('<defs><filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>'
        '<filter id="tint" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>'
        '<filter id="line"><feGaussianBlur stdDeviation="2.2"/></filter></defs>')

# 퀴즈: A(피부색 베이지, 윤곽 없음) vs B(로즈 베이지 + 라이너 + 안쪽 틴트)
q = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 560">', DEFS]
for i, (k, body) in enumerate([("A", lips(230, 250, 1.2, "#E9C7B4", blur_edge=True)),
                               ("B", lips(230, 250, 1.2, "#D79A8C", liner="#B06F64", tint="#C2505C"))]):
    x = i * 480
    q.append(f'<g transform="translate({x},0)"><rect x="0" y="0" width="460" height="540" rx="28" fill="{SKIN}" stroke="#3A2A2E" stroke-width="4"/>{body}')
    q.append(f'<circle cx="54" cy="54" r="32" fill="#3A2A2E"/><text x="54" y="67" font-size="36" font-weight="800" fill="#fff" text-anchor="middle">{k}</text></g>')
q.append('</svg>')
open("img/quiz.svg", "w").write("".join(q))

# 단계 아이콘 (가로 260x130)
def icon(name, body):
    open(f"img/{name}.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 130">{DEFS}{body}</svg>')
icon("step1", '<circle cx="60" cy="65" r="50" fill="#E9C7B4" stroke="#3A2A2E" stroke-width="4"/>'
              '<line x1="25" y1="30" x2="95" y2="100" stroke="#D6336C" stroke-width="8"/>'
              '<circle cx="165" cy="65" r="38" fill="#D49A8E" stroke="#3A2A2E" stroke-width="4"/>'
              '<circle cx="225" cy="65" r="30" fill="#B57B60" stroke="#3A2A2E" stroke-width="4"/>')
icon("step2", lips(130, 55, .62, "#E2B2A4", liner="#A9665B", over=True))
icon("step3", lips(130, 55, .62, "#D9A595", tint="#C2505C"))
print("ok")
