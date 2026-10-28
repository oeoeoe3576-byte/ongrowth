"""공유·참여가 큰 주제 탐색(대리지표): 쇼츠의 좋아요율·댓글율을 채널 평소값 대비로 비교. 공유 수는 유튜브 공개 데이터에 없음."""
import sqlite3,re,collections,statistics as st,sys
db=sys.argv[1] if len(sys.argv)>1 else 'data/research/youtube_travel.db'
c=sqlite3.connect(db)
rows=c.execute("select v.channel_id,v.title,v.duration_sec,v.views,v.likes,v.comments,v.tags from videos v where v.views>=1000 and v.likes is not null and v.comments is not null").fetchall()
bad=re.compile(r"브이로그|vlog|광고|ETF|이수지|여기어때|뉴스|속보|PLUS|소노|설명회|ft\.")
trav=re.compile(r"여행|코스|가볼만|명소|축제|단풍|맛집|숙소|핫플|당일치기|드라이브|호캉스|국내|제주|부산|서울|강릉|경주|전주|속초|여수|일정|꿀팁|투어|카페|데이트|온천")
by=collections.defaultdict(list)
for r in rows:
    if (r[2] or 0)<=60 and trav.search(r[1]) and not bad.search(r[1]): by[r[0]].append(r)
base={}
for ch,v in by.items():
    if len(v)>=12:
        base[ch]=(st.median([x[4]/x[3] for x in v]),st.median([x[5]/x[3] for x in v]),st.median([x[3] for x in v]))
items=[(ch,r) for ch,v in by.items() if ch in base for r in v]
T={'데이트·커플':r"데이트|커플|연인|기념일",'가족·아이·부모님':r"가족|아이|부모님|엄마|아빠|효도|어르신",'친구·여럿':r"친구|동기|모임|단체",'혼자':r"혼자|혼행|솔로",'무료·가성비':r"무료|공짜|가성비|저렴|\d+만\s?원|\d+원",'숨은·현지인':r"숨은|현지인|로컬|아는 사람|비밀",'당일치기·근교':r"당일|근교|하루",'1박2일·일정':r"\d박\s*\d일|코스|일정|루트",'N곳·TOP·순위':r"\d+\s*(곳|가지|개|선)|TOP|BEST|순위|랭킹",'비교·vs':r"vs|비교|차이|어디가 더",'실패·주의':r"후회|손해|주의|절대|하지 마|망",'날짜·마감':r"\d+월|\d+/\d+|마감|까지|이번 주|이번주|올해",'핫플·신상':r"핫플|신상|새로 생|오픈|개장|요즘",'야경·불꽃·축제':r"야경|불꽃|축제|야행|라이트",'바다·섬':r"바다|섬|해변|해수욕",'단풍·꽃':r"단풍|벚꽃|꽃|억새|은행",'숙소·호캉스':r"숙소|호텔|호캉스|펜션|글램핑|독채",'기차·교통':r"기차|KTX|열차|버스|교통|렌터카"}
print(f"표본 쇼츠 {len(items)}편 · 채널 {len(base)}개 (좋아요율·댓글율은 그 채널 평소값 대비 배수, 조회수 3배↑ 비율)")
out=[]
for k,p in T.items():
    sel=[(ch,r) for ch,r in items if re.search(p,r[1])]
    if len(sel)<60: continue
    lk=[ (r[4]/r[3])/max(base[ch][0],1e-9) for ch,r in sel]
    cm=[ (r[5]/r[3])/max(base[ch][1],1e-9) for ch,r in sel]
    vw=[ r[3]/base[ch][2] for ch,r in sel]
    out.append((k,len(sel),st.median(lk),st.median(cm),sum(v>=3 for v in vw)/len(vw),st.median(vw)))
for k,n,l,cm,hit,vm in sorted(out,key=lambda x:-(x[2]+x[3])):
    print(f"{k}: n={n} 좋아요율 ×{l:.2f} 댓글율 ×{cm:.2f} · 조회 중앙 {vm:.2f} · 3배↑ {hit:.0%}")
