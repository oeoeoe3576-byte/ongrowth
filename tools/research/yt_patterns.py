import sqlite3,re,statistics as st,collections
c=sqlite3.connect('data/research/youtube_travel.db')
rows=c.execute("select v.video_id,v.channel_id,v.title,v.duration_sec,v.views,v.likes,v.comments,v.chapters,v.description_head,ch.title,ch.subs from videos v join channels ch using(channel_id) where v.views is not null").fetchall()
by=collections.defaultdict(list)
for r in rows: by[r[1]].append(r[4])
med={k:st.median(v) for k,v in by.items() if len(v)>=15}
trav=re.compile(r"여행|코스|가볼만|명소|축제|단풍|맛집|숙소|핫플|당일치기|드라이브|호캉스|국내|제주|부산|서울|강릉|경주|전주|속초|여수|일정|꿀팁|투어|트립")
bad=re.compile(r"브이로그|vlog|VLOG|광고|ETF|이수지|여기어때|뉴스|속보|PLUS|ft\.|일상")
bank=[]
for r in rows:
    vid,ch,t,d,v,l,cm,chap,desc,cht,subs=r
    if ch not in med or med[ch]<500 or not trav.search(t) or bad.search(t): continue
    if (subs or 0)>3_000_000: continue
    bank.append((v/med[ch],r))
print("pool",len(bank))
def seg(name,f):
    s=[x for x in bank if f(x[1][3] or 0)]
    sc=sorted(x[0] for x in s)
    print(name,len(s),"median",round(st.median(sc),2),"p90",round(sc[int(len(sc)*.9)],2))
seg("<=60s",lambda d:d<=60);seg("1-3m",lambda d:60<d<=180);seg("3-8m",lambda d:180<d<=480);seg("8-15m",lambda d:480<d<=900);seg("15m+",lambda d:d>900)
def show(name,f,n=18):
    print("\n##",name)
    s=sorted([x for x in bank if f(x[1])],key=lambda x:-x[0])
    s=[x for x in s if x[1][4]>=30000][:n]
    for sc,r in s: print(round(sc,1),r[4],r[3],"|",r[9][:12],"|",r[2][:70])
show("쇼츠(<=60s) 상위",lambda r:(r[3] or 0)<=60)
show("3~15분 상위",lambda r:180<(r[3] or 0)<=900)
show("15분+ 상위",lambda r:(r[3] or 0)>900,12)
# hook word frequency in top decile titles vs rest
top=[x for x in bank if x[0]>=3]; rest=[x for x in bank if x[0]<1.5]
def words(s): 
    c=collections.Counter()
    for _,r in s:
        for w in set(re.findall(r"[가-힣A-Za-z0-9]{2,}",r[2])): c[w]+=1
    return c
a,b=words(top),words(rest);na,nb=len(top),len(rest)
print("\ntop n",na,"rest n",nb)
res=[(w,a[w]/na,b[w]/nb,(a[w]/na)/((b[w]+1)/nb)) for w in a if a[w]>=25]
for w,x,y,l in sorted(res,key=lambda z:-z[3])[:30]: print(w,f"{x:.1%} vs {y:.1%} x{l:.1f}")
