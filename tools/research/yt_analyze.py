#!/usr/bin/env python3
"""수집한 DB로 '정보성 여행 영상'의 길이·제목 구조·주제·챕터 구조를 분석해 마크다운 보고서를 만든다.
사용: python3 tools/research/yt_analyze.py [--out docs/research/youtube-travel-report.md]
성적 기준: 영상 조회수 ÷ 그 채널 영상 조회수 중앙값 (채널 크기 영향을 줄인 '초과 성과' 점수)"""
import os, re, json, sqlite3, statistics as S, argparse
from collections import Counter, defaultdict
DB = os.environ.get("YT_DB") or os.path.join(os.path.dirname(__file__), "..", "..", "data", "research", "youtube_travel.db")
VLOG = re.compile(r"브이로그|vlog|먹방|일상|언박싱|리뷰만|ASMR", re.I)
FEATS = {
 "숫자(N곳·TOP·N가지)": r"\d+\s*(곳|가지|선|개|위|TOP|top|군데)|TOP\s*\d+|베스트\s*\d+",
 "질문형(?·왜·어디)": r"\?|왜|어디|뭐|언제|어떻게|일까",
 "급함·시기(지금·이번·마감·D-)": r"지금|이번\s*(주|달)|마감|D-?\d|곧|오늘|내일|주말|올해|요즘|10월|11월|12월|가을|겨울",
 "정리·꿀팁·총정리": r"총정리|정리|꿀팁|팁|가이드|한방에|전부|모음",
 "코스·일정": r"코스|일정|동선|1박|당일|\d박\d일",
 "추천·필수": r"추천|필수|꼭|무조건|best|BEST",
 "비교·vs": r"비교|vs|VS|차이",
 "손해·주의": r"손해|후회|실패|주의|조심|모르면|피해야|하지\s*마",
 "숨은·현지인": r"숨은|숨겨진|현지인|로컬|비밀|아는\s*사람",
 "괄호·구분자": r"[\[\(【|｜\|]",
 "이모지": r"[\U0001F300-\U0001FAFF☀-➿]",
}
TOPICS = {"단풍·가을":"단풍|가을|은행나무|억새","벚꽃·봄꽃":"벚꽃|봄|튤립|유채","여름·바다":"여름|해수욕|계곡|물놀이","겨울·눈":"겨울|눈꽃|스키|온천",
 "축제":"축제|페스티벌","전시·팝업":"전시|팝업|미술관|박물관","숙소":"숙소|호텔|펜션|리조트|풀빌라|에어비앤비","맛집·먹거리":"맛집|먹거리|카페|빵|시장",
 "코스·일정":"코스|일정|동선|1박|당일","제주":"제주","서울·근교":"서울|근교|경기","부산·경남":"부산|경남|통영|거제","강원":"강원|강릉|속초|양양|평창",
 "경주·경북":"경주|경북|안동|포항","전라":"전주|전라|여수|순천|광주|담양","교통·예약":"기차|KTX|버스|예약|예매|주차|렌터카","준비물·팁":"준비물|꿀팁|팁|주의","해외":"일본|오사카|도쿄|후쿠오카|베트남|태국|유럽|대만|해외"}
def bucket(d): return "~30초" if d<=30 else "31~60초" if d<=60 else "1~3분" if d<=180 else "3~8분" if d<=480 else "8~15분" if d<=900 else "15분+"
BORDER=["~30초","31~60초","1~3분","3~8분","8~15분","15분+"]
def med(x): return S.median(x) if x else 0
def fmt(x): return f"{x:.2f}"
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--out",default="docs/research/youtube-travel-report.md"); ap.add_argument("--min-channel-videos",type=int,default=8); a=ap.parse_args()
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row
    ch={r["channel_id"]:r for r in c.execute("select * from channels")}
    rows=[dict(r) for r in c.execute("select * from videos")]
    by=defaultdict(list)
    for r in rows: by[r["channel_id"]].append(r["views"])
    data=[]
    for r in rows:
        t=r["title"] or ""
        if VLOG.search(t) or VLOG.search(r["tags"] or ""): continue
        v=by[r["channel_id"]]
        if len(v)<a.min_channel_videos: continue
        m=med(v) or 1
        r["out"]=r["views"]/m
        r["subs"]=ch.get(r["channel_id"],{"subs":0})["subs"] or 0
        data.append(r)
    out=[f"# 여행 정보 유튜브 분석 보고서\n\n- 대상: 채널 {len(ch)}개 중 영상 {len(rows)}개 수집, 브이로그 제외·채널당 {a.min_channel_videos}개 이상 영상 기준으로 **{len(data)}개** 분석",
         "- 성적 점수 = 영상 조회수 ÷ 그 채널 영상 조회수 중앙값 (1이면 평소 수준, 2면 평소의 2배)",
         "- 한계: 영상 안의 화면·자막은 못 봄. 제목·길이·챕터·태그·썸네일 주소 기반 분석\n"]
    if len(data)<30:
        out.append("\n> 표본이 30개 미만이라 분석을 하지 않았어요. 수집을 더 진행해 주세요.\n"); open(a.out,"w",encoding="utf8").write("\n".join(out)); print("표본 부족"); return
    base=med([d["out"] for d in data])
    out.append(f"\n전체 중앙값 점수 {fmt(base)}\n")
    # 길이
    out.append("## 1. 길이별 성적\n\n| 길이 | 영상 수 | 중앙값 점수 | 상위10% 비중 |\n|---|---|---|---|")
    thr=sorted(d["out"] for d in data)[int(len(data)*0.9)]
    for b in BORDER:
        g=[d for d in data if bucket(d["duration_sec"])==b]
        if len(g)>=5: out.append(f"| {b} | {len(g)} | {fmt(med([d['out'] for d in g]))} | {sum(d['out']>=thr for d in g)/len(g)*100:.0f}% |")
    # 제목 구조
    out.append("\n## 2. 제목 구조별 성적 (있을 때 vs 없을 때)\n\n| 요소 | 있는 영상 수 | 있을 때 | 없을 때 | 차이 |\n|---|---|---|---|---|")
    res=[]
    for k,p in FEATS.items():
        rg=re.compile(p); w=[d["out"] for d in data if rg.search(d["title"])]; wo=[d["out"] for d in data if not rg.search(d["title"])]
        if len(w)>=20 and len(wo)>=20: res.append((med(w)/(med(wo) or 1),k,len(w),med(w),med(wo)))
    for ratio,k,n,w,wo in sorted(res,reverse=True): out.append(f"| {k} | {n} | {fmt(w)} | {fmt(wo)} | ×{ratio:.2f} |")
    # 제목 길이
    out.append("\n## 3. 제목 길이\n\n| 글자 수 | 영상 수 | 중앙값 점수 |\n|---|---|---|")
    for lo,hi in [(0,15),(16,25),(26,35),(36,50),(51,200)]:
        g=[d for d in data if lo<=len(d["title"])<=hi]
        if len(g)>=10: out.append(f"| {lo}~{hi} | {len(g)} | {fmt(med([d['out'] for d in g]))} |")
    # 주제
    out.append("\n## 4. 주제별 성적\n\n| 주제 | 영상 수 | 중앙값 점수 | 상위10% 비중 |\n|---|---|---|---|")
    tr=[]
    for k,p in TOPICS.items():
        rg=re.compile(p); g=[d for d in data if rg.search(d["title"])]
        if len(g)>=15: tr.append((med([d["out"] for d in g]),k,len(g),sum(d["out"]>=thr for d in g)/len(g)*100))
    for m_,k,n,top in sorted(tr,reverse=True): out.append(f"| {k} | {n} | {fmt(m_)} | {top:.0f}% |")
    # 챕터
    wc=[d for d in data if json.loads(d["chapters"] or "[]")]
    out.append(f"\n## 5. 챕터(구성)\n\n- 챕터가 있는 영상: {len(wc)}/{len(data)} ({len(wc)/len(data)*100:.0f}%) · 챕터 있을 때 중앙값 {fmt(med([d['out'] for d in wc]))} vs 없을 때 {fmt(med([d['out'] for d in data if d not in wc]))}")
    if wc:
        cnt=Counter(len(json.loads(d["chapters"])) for d in wc); out.append("- 챕터 수 분포: "+", ".join(f"{k}개 {v}편" for k,v in sorted(cnt.items())[:10]))
        first=Counter(re.sub(r"\d+","N",json.loads(d["chapters"])[0][1])[:20] for d in wc); out.append("- 첫 챕터 제목 흔한 것: "+", ".join(f"{k}({v})" for k,v in first.most_common(8)))
    # 상위
    out.append("\n## 6. 초과 성과 상위 30개 (제목 패턴 참고)\n\n| 점수 | 조회수 | 길이 | 제목 |\n|---|---|---|---|")
    for d in sorted(data,key=lambda x:-x["out"])[:30]: out.append(f"| {d['out']:.1f} | {d['views']:,} | {d['duration_sec']//60}:{d['duration_sec']%60:02d} | {d['title'][:60]} |")
    os.makedirs(os.path.dirname(a.out),exist_ok=True); open(a.out,"w",encoding="utf8").write("\n".join(out)+"\n"); print(f"보고서 저장: {a.out} (분석 영상 {len(data)}개)")
main()
