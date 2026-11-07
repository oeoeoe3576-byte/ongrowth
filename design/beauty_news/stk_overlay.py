"""뷰티레터 릴스: 부위 옆 설명글(원래 의연체 스타일) + 펜 화살표 + ✨ 스티커를 사진 장에 넣는다.
실행: cd letters && python3 ../stk_overlay.py   (좌표는 사진마다 stills 격자로 눈으로 맞춘다)"""
import re,math
def arrow(x1,y1,x2,y2,bend=0.25):
    mx,my=(x1+x2)/2,(y1+y2)/2; dx,dy=x2-x1,y2-y1
    cx,cy=mx-dy*bend,my+dx*bend
    ang=math.atan2(y2-cy,x2-cx); L=36
    h=[(x2-L*math.cos(ang+a),y2-L*math.sin(ang+a)) for a in (0.5,-0.5)]
    return (f'<path class="draw" d="M{x1} {y1} Q{cx:.0f} {cy:.0f} {x2} {y2}"/>'
            f'<path class="draw" d="M{h[0][0]:.0f} {h[0][1]:.0f} L{x2} {y2} L{h[1][0]:.0f} {h[1][1]:.0f}"/>')
def block(text,size,pos,arr,stk=None):
    a=arrow(*arr[:4],bend=arr[4] if len(arr)>4 else .25)
    h=f'<svg class="ov arw" viewBox="0 0 1080 1920">{a}</svg>'
    h+=f'<div class="side" style="left:{pos[0]}px; top:{pos[1]}px; font-size:{size}px;">{text}</div>'
    if stk: h+=f'<div class="stk pop" style="left:{stk[1][0]}px; top:{stk[1][1]}px;">{stk[0]}</div>'
    return h
CSS='''.pp .stk { position:absolute; font-family:"Noto Color Emoji"; font-size:100px; line-height:1; filter:drop-shadow(0 4px 8px rgba(0,0,0,.35)); transform:rotate(-8deg); }
'''
def apply(letter,spec):
    p=f'{letter}/reel.html'; s=open(p,encoding='utf-8').read()
    if '.pp .stk' not in s: s=s.replace('</style>',CSS+'</style>',1)
    for name,b in spec.items():
        m=re.search(r'<section[^>]*data-name="%s"[^>]*>.*?</section>'%name,s,re.S)
        sec=m.group(0)
        sec=re.sub(r'<svg class="ov arw" viewBox="0 0 1080 1920">.*?</svg>','',sec,flags=re.S)
        sec=re.sub(r'<div class="(?:tag|stk) pop"[^>]*>.*?</div>','',sec,flags=re.S)
        sec=re.sub(r'<div class="side[^"]*"[^>]*>.*?</div>','',sec,flags=re.S)
        sec=sec.replace('<div class="note">',block(*b)+'\n  <div class="note">',1)
        s=s[:m.start()]+sec+s[m.end():]
    open(p,'w',encoding='utf-8').write(s)
if __name__=='__main__':
    bang={
     '02_minni':['틈 덕분에<br/><b>가볍게</b>',84,(190,470),(480,670,480,745,.1),('✨',(820,620))],
     '03_soyeon':['눈썹 덮는<br/><b>길이로</b>',72,(330,610),(370,650,275,545,.2)],
     '04_chaewon':['사이드뱅<br/><b>감싸기</b>',72,(645,690),(660,760,618,715,.2)],
     '05_momo':['얇게 나눠<br/><b>이마 살짝</b>',60,(100,470),(280,570,340,570,.1),('✨',(115,640))],
    }
    wave={
     '02_miyeon':['여기서부터<br/><b>S컬</b>',76,(105,460),(350,615,445,705,.25),('✨',(115,660))],
     '03_gayoung':['끝까지<br/><b>쭉</b>',84,(560,560),(700,760,730,1300,.08)],
     '04_minni':['불규칙해서<br/><b>가볍게</b>',64,(640,790),(800,780,840,690,.2)],
    }
    apply('2026-11-13_seethroughbang',bang); apply('2026-11-14_wave',wave)
