"""구조화 인사이트: 제목 특징별 효과를 채널 내 비교(채널 일관성)와 함께 계산. 사용: python3 tools/research/yt_insights.py [db]"""
import sqlite3,re,sys,math,collections,statistics as st,numpy as np
db=sys.argv[1] if len(sys.argv)>1 else 'data/research/youtube_travel.db'
c=sqlite3.connect(db)
rows=c.execute("select v.video_id,v.channel_id,v.title,v.duration_sec,v.views,v.chapters,v.description_head from videos v where v.views is not null").fetchall()
by=collections.defaultdict(list)
for r in rows: by[r[1]].append(r[4])
med={k:st.median(v) for k,v in by.items() if len(v)>=15}
trav=re.compile(r"여행|코스|가볼만|명소|축제|단풍|맛집|숙소|핫플|당일치기|드라이브|호캉스|국내|제주|부산|서울|강릉|경주|전주|속초|여수|일정|꿀팁|투어|트립|빵지|카페")
bad=re.compile(r"브이로그|vlog|VLOG|광고|ETF|이수지|여기어때|뉴스|속보|PLUS|소노|설명회|트래블쇼|ft\.")
B=[(r[4]/med[r[1]],r) for r in rows if r[1] in med and med[r[1]]>=500 and trav.search(r[2]) and not bad.search(r[2])]
F={
 '숫자로 시작':lambda t:bool(re.match(r"\W*\d",t)),
 'N곳·N가지·TOP':lambda t:bool(re.search(r"\d+\s*(곳|가지|개|선)|TOP|BEST|베스트",t,re.I)),
 '비용·경비':lambda t:bool(re.search(r"\d+\s*(만원|원)|경비|비용|가격|공짜|무료",t)),
 '일정(1박2일·당일)':lambda t:bool(re.search(r"\d박\s*\d일|당일|하루|\d+시간",t)),
 '손실회피(후회·손해·헛걸음·하면 안)':lambda t:bool(re.search(r"후회|손해|헛걸음|하면 안|모르면|놓치면|절대|조심|주의|망",t)),
 '기한·시즌(이번·지금·마감·~까지)':lambda t:bool(re.search(r"이번|지금|마감|까지|올해|올가을|\d+월|D-",t)),
 '놀람·반전(이런 곳·충격·반전)':lambda t:bool(re.search(r"이런 곳|이런곳|충격|반전|실화|미쳤|맞나|맞아요|처음 봄|몰랐",t)),
 '총정리·가이드':lambda t:bool(re.search(r"총정리|가이드|완벽|정리|한눈에|꿀팁",t)),
 '질문형':lambda t:bool(re.search(r"\?|왜|어디|얼마",t)),
 '해시태그 포함':lambda t:'#' in t,
 '이모지 포함':lambda t:bool(re.search(r"[\U0001F300-\U0001FAFF☀-➿]",t)),
 '괄호·|구분':lambda t:bool(re.search(r"[\[\(|｜]",t)),
}
def mw(a,b):
    a=np.array(a);b=np.array(b);n1,n2=len(a),len(b)
    allv=np.concatenate([a,b]);ranks=allv.argsort().argsort()+1.0
    u=ranks[:n1].sum()-n1*(n1+1)/2;m=n1*n2/2;s=math.sqrt(n1*n2*(n1+n2+1)/12)
    z=(u-m)/s;return z
def analyze(items,label):
    print(f"\n### {label} (n={len(items)})")
    out=[]
    for name,f in F.items():
        w=[s for s,r in items if f(r[2])];wo=[s for s,r in items if not f(r[2])]
        if len(w)<80: continue
        z=mw(w,wo)
        ch=collections.defaultdict(lambda:([],[]))
        for s,r in items: ch[r[1]][0 if f(r[2]) else 1].append(s)
        pos=tot=0
        for a,b in ch.values():
            if len(a)>=3 and len(b)>=3:
                tot+=1;pos+= st.median(a)>st.median(b)
        hit=lambda x:sum(v>=3 for v in x)/len(x)
        out.append((name,len(w),st.median(w),st.median(wo),hit(w),hit(wo),z,pos,tot))
    for o in sorted(out,key=lambda x:-x[2]/x[3]):
        n,nw,mw_,mo,hw,ho,z,pos,tot=o
        print(f"{n}: n={nw} 중앙값 {mw_:.2f} vs {mo:.2f} (×{mw_/mo:.2f}) · 3배 이상 터진 비율 {hw:.1%} vs {ho:.1%} · z={z:+.1f} · 채널내 우세 {pos}/{tot}({pos/max(tot,1):.0%})")
analyze(B,'전체')
analyze([x for x in B if (x[1][3] or 0)<=60],'쇼츠(60초 이하)')
analyze([x for x in B if (x[1][3] or 0)>480],'장편(8분+)')
