import sqlite3,re,statistics as st,collections,json,datetime
c=sqlite3.connect('data/research/youtube_travel.db')
rows=c.execute("select v.video_id,v.channel_id,v.title,v.duration_sec,v.views,v.likes,v.comments,v.chapters,v.description_head,v.published_at,v.thumb_url,v.tags,ch.title,ch.subs from videos v join channels ch using(channel_id) where v.views is not null").fetchall()
by=collections.defaultdict(list)
for r in rows: by[r[1]].append(r[4])
med={k:st.median(v) for k,v in by.items() if len(v)>=15}
trav=re.compile(r"여행|코스|가볼만|명소|축제|단풍|맛집|숙소|핫플|당일치기|드라이브|호캉스|국내|제주|부산|서울|강릉|경주|전주|속초|여수|일정|꿀팁|투어|트립")
bad=re.compile(r"브이로그|vlog|VLOG|광고|ETF|이수지|여기어때|뉴스|속보|PLUS|ft\.|일상")
B=[]
for r in rows:
    ch=r[1]
    if ch not in med or med[ch]<500 or not trav.search(r[2]) or bad.search(r[2]) or (r[13] or 0)>3_000_000: continue
    B.append((r[4]/med[ch],r))
def grp(name,keyf,minn=150,items=None):
    g=collections.defaultdict(list)
    for s,r in B:
        k=keyf(r)
        if k is not None: g[k].append(s)
    print("\n##",name)
    for k in (items or sorted(g)):
        if k in g and len(g[k])>=minn:
            v=sorted(g[k]);print(f"{k}: n={len(v)} med={st.median(v):.2f} p90={v[int(len(v)*.9)]:.2f}")
grp("요일(0=월)",lambda r:datetime.datetime.fromisoformat(r[9].replace('Z','')).weekday())
grp("업로드 시각(KST)",lambda r:(datetime.datetime.fromisoformat(r[9].replace('Z',''))+datetime.timedelta(hours=9)).hour//3*3)
grp("쇼츠 길이",lambda r:None if (r[3] or 0)>60 else ('~15s' if r[3]<=15 else '16-30s' if r[3]<=30 else '31-45s' if r[3]<=45 else '46-60s'))
grp("제목 첫 글자 유형",lambda r:('숫자' if re.match(r'\W*\d',r[2]) else '대괄호' if r[2].startswith('[') else '이모지' if re.match(r'[^\w\s\[]',r[2]) else '글자'))
grp("해시태그 개수(제목)",lambda r:min(r[2].count('#'),5))
grp("제목에 비용(원/만원)",lambda r:bool(re.search(r"\d+\s*(만원|원|만 원)|경비|비용|가격",r[2])),50)
grp("제목에 시간표(1박2일/당일/N시간)",lambda r:bool(re.search(r"\d박\s*\d일|당일|\d+시간|하루",r[2])),50)
grp("제목에 지역명 포함",lambda r:bool(re.search(r"제주|부산|서울|강릉|경주|전주|속초|여수|대전|대구|인천|양양|통영|남해|거제|가평|춘천|순천|담양|포항|안동",r[2])),50)
grp("제목에 감정훅(이런곳이/진짜/미쳤/충격/후회/꼭)",lambda r:bool(re.search(r"이런 곳|이런곳|진짜|미쳤|충격|후회|꼭 |필수|비밀|몰랐|현실",r[2])),50)
grp("댓글유도(고정댓글/캡션/댓글)",lambda r:bool(re.search(r"고정댓글|캡션|댓글|설명란|더보기",(r[2] or '')+(r[8] or ''))),50)
# like rate / comment rate by score bucket
print("\n## 반응률")
for lo,hi in [(0,0.5),(0.5,1),(1,2),(2,5),(5,1e9)]:
    s=[r for sc,r in B if lo<=sc<hi and r[4]>1000]
    print(f"점수 {lo}-{hi}: n={len(s)} 좋아요율 {st.median([x[5]/x[4] for x in s if x[5] is not None]):.2%} 댓글율 {st.median([x[6]/x[4] for x in s if x[6] is not None]):.3%}")
# chapters of top long videos
print("\n## 상위 장편 챕터 구성")
top=sorted([x for x in B if x[1][7] and x[1][3]>480],key=lambda x:-x[0])[:12]
for sc,r in top:
    try: ch=json.loads(r[7])
    except Exception: ch=r[7]
    print(f"\n{sc:.0f}배 {r[3]//60}분 | {r[2][:55]}"); print("  ",str(ch)[:330])
# what descriptions start with in top shorts
print("\n## 상위 쇼츠 설명 첫줄")
for sc,r in sorted([x for x in B if x[1][3]<=60 and x[1][4]>=100000],key=lambda x:-x[0])[:15]:
    print(f"{sc:.0f}배 | {r[2][:40]} || {(r[8] or '').strip()[:110]!r}")
# save thumbs list
import random
sel=sorted([x for x in B if x[1][10]],key=lambda x:-x[0])
out={'short':[(r[0],r[10],r[2]) for s,r in sel if r[3]<=60 and r[4]>=300000][:16],'long':[(r[0],r[10],r[2]) for s,r in sel if r[3]>480 and r[4]>=150000][:16],'low':[(r[0],r[10],r[2]) for s,r in sel[::-1] if r[3]>480 and 20000<r[4]<60000][:16]}
json.dump(out,open('/tmp/claude-0/-home-user-ongrowth/faedb673-a90f-5fc2-961c-1998089c2abb/scratchpad/thumbs.json','w'),ensure_ascii=False)
