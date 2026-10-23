import sqlite3,re,statistics as st,collections,datetime,json
c=sqlite3.connect('data/research/youtube_travel.db')
rows=c.execute("select v.video_id,v.channel_id,v.title,v.duration_sec,v.views,v.likes,v.comments,v.description_head,v.published_at,v.thumb_url,v.tags,ch.title,ch.subs from videos v join channels ch using(channel_id) where v.views is not null").fetchall()
by=collections.defaultdict(list)
for r in rows: by[r[1]].append(r)
trav=re.compile(r"여행|코스|가볼만|명소|축제|단풍|맛집|숙소|핫플|당일치기|드라이브|호캉스|국내|제주|부산|서울|강릉|경주|전주|속초|여수|일정|꿀팁|투어|트립|빵지|카페")
bad=re.compile(r"브이로그|vlog|광고|ETF|이수지|여기어때|뉴스|속보|PLUS|소노|설명회|트래블쇼")
cut=(datetime.datetime.utcnow()-datetime.timedelta(days=270)).isoformat()
# channels that are short-heavy
stats=[]
for ch,vs in by.items():
    sh=[v for v in vs if (v[3] or 0)<=60 and v[8]>cut and trav.search(v[2]) and not bad.search(v[2])]
    if len(sh)<12 or (vs[0][12] or 0)>600000: continue
    m=st.median([v[4] for v in sh]); top=sorted(v[4] for v in sh)[-3:]
    stats.append((m,len(sh),vs[0][11],vs[0][12],ch,top))
print("## 쇼츠 정보형 채널(최근9개월, 12편+) 중앙값 조회수 상위")
for m,n,t,s,ch,top in sorted(stats,reverse=True)[:25]: print(f"{int(m):>8,} n={n:<3} subs={s:<8} {t[:24]} top3={top}")
sel=[s[4] for s in sorted(stats,reverse=True)[:12]]
print("\n## 상위 채널들의 쇼츠 제목 샘플")
out=[]
for ch in sel:
    vs=sorted([v for v in by[ch] if (v[3] or 0)<=60 and v[8]>cut and trav.search(v[2]) and not bad.search(v[2])],key=lambda v:-v[4])[:6]
    print("\n###",vs[0][11])
    for v in vs: print(f"  {v[4]:>9,} {v[3]}s | {v[2][:70]} || {(v[7] or '').strip()[:60]!r}")
    out+= [(v[0],v[2]) for v in vs[:2]]
json.dump(out,open('/tmp/claude-0/-home-user-ongrowth/faedb673-a90f-5fc2-961c-1998089c2abb/scratchpad/bench.json','w'),ensure_ascii=False)
