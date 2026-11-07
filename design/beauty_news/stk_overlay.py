import re,math,sys
def arrow(x1,y1,x2,y2,bend=0.25):
    mx,my=(x1+x2)/2,(y1+y2)/2; dx,dy=x2-x1,y2-y1
    cx,cy=mx-dy*bend,my+dx*bend
    ang=math.atan2(y2-cy,x2-cx); L=36
    h=[(x2-L*math.cos(ang+a),y2-L*math.sin(ang+a)) for a in (0.5,-0.5)]
    return (f'<path class="draw" d="M{x1} {y1} Q{cx:.0f} {cy:.0f} {x2} {y2}"/>'
            f'<path class="draw" d="M{h[0][0]:.0f} {h[0][1]:.0f} L{x2} {y2} L{h[1][0]:.0f} {h[1][1]:.0f}"/>')
def block(tag,arr,stk):
    t,(tl,tt)=tag; a=arrow(*arr[:4],bend=arr[4] if len(arr)>4 else .25)
    e,(el,et)=stk
    return (f'<svg class="ov arw" viewBox="0 0 1080 1920">{a}</svg>'
            f'<div class="tag pop" style="left:{tl}px; top:{tt}px;">{t}</div>'
            f'<div class="stk pop" style="left:{el}px; top:{et}px;">{e}</div>')
CSS='''.pp .stk { position:absolute; font-family:"Noto Color Emoji"; font-size:110px; line-height:1; filter:drop-shadow(0 4px 8px rgba(0,0,0,.35)); transform:rotate(-8deg); }
.pp .tag { position:absolute; white-space:nowrap; background:#fff; color:#CF3F64; font-weight:900; font-size:42px; line-height:1.3; text-align:center; padding:8px 24px; border-radius:34px; box-shadow:0 4px 12px rgba(0,0,0,.3); }
'''
def apply(letter,spec):
    p=f'{letter}/reel.html'; s=open(p,encoding='utf-8').read()
    if '.pp .stk' not in s: s=s.replace('</style>',CSS+'</style>',1)
    for name,b in spec.items():
        m=re.search(r'(<section[^>]*data-name="%s"[^>]*>.*?)((?:<div class="side cx"[^>]*>.*?</div>)?)(</section>)'%name,s,re.S)
        sec=m.group(1)+m.group(3)
        # remove any previous generated overlay
        sec=re.sub(r'<svg class="ov arw" viewBox="0 0 1080 1920">.*?</svg><div class="tag pop".*?</div><div class="stk pop".*?</div>','',sec,flags=re.S)
        ph=re.search(r'<div class="full static[^>]*></div>',sec)
        sec=sec[:ph.end()]+'\n  '+block(*b)+sec[ph.end():]
        s=s[:m.start()]+sec+s[m.end():]
    open(p,'w',encoding='utf-8').write(s)
if __name__=='__main__':
    bang={
     '02_minni':[('틈 덕분에 가볍게',(560,440)),(610,505,530,615,.3),('✨',(800,610))],
     '03_soyeon':[('눈썹 덮는 길이로',(400,405)),(420,470,290,520,.3),('✂️',(790,420))],
     '04_chaewon':[('긴 사이드뱅',(640,545)),(650,605,590,720,.3),('🎀',(790,430))],
     '05_momo':[('얇게 나눠<br/>이마 살짝',(90,450)),(300,520,400,545,.2),('✨',(110,630))],
    }
    wave={
     '02_miyeon':[('여기서부터<br/>S컬',(90,430)),(300,520,420,640,.3),('✨',(100,620))],
     '03_gayoung':[('끝까지 쭉',(560,740)),(700,810,725,1320,.1),('🌊',(770,540))],
     '04_minni':[('불규칙해서<br/>가볍게',(640,560)),(650,650,570,790,.3),('💫',(800,430))],
    }
    apply('2026-11-13_seethroughbang',bang); apply('2026-11-14_wave',wave)
