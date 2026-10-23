#!/usr/bin/env python3
"""여행 정보 유튜브 수집기 (공식 YouTube Data API v3). 키는 환경변수 YOUTUBE_API_KEY로만 읽는다.
사용: python3 tools/research/yt_collect.py search [--max-pages 2] [--keywords-file f]  # 영상 검색 → 채널 후보 수집
      python3 tools/research/yt_collect.py channels                                    # 채널 통계·업로드 목록 확인
      python3 tools/research/yt_collect.py videos [--per-channel 60] [--min-subs 500]   # 채널별 최근 영상 수집
      python3 tools/research/yt_collect.py status
할당량(하루 10,000 유닛): 검색 1회 100유닛, 그 외 호출은 1유닛. 중단 후 다시 실행하면 이어서 한다."""
import os, sys, json, re, sqlite3, time, argparse, urllib.request, urllib.parse
from datetime import datetime, timezone, timedelta

DB = os.environ.get("YT_DB") or os.path.join(os.path.dirname(__file__), "..", "..", "data", "research", "youtube_travel.db")
API = "https://www.googleapis.com/youtube/v3"
KST = timezone(timedelta(hours=9))
now = lambda: datetime.now(KST).strftime("%Y-%m-%d %H:%M")

DEFAULT_KEYWORDS = [
 "국내여행 가볼만한곳","국내여행 코스 추천","국내여행 꿀팁","국내 당일치기 여행","서울 근교 여행","1박2일 국내여행 코스",
 "제주도 여행 코스","강릉 여행 코스","부산 여행 코스","경주 여행 코스","전주 여행 정보","여수 여행 정보","속초 여행 정보",
 "단풍 명소 추천","벚꽃 명소 추천","국내 축제 추천","이번 주말 어디 갈까","숨은 명소 국내","국내 숙소 추천","오션뷰 숙소 추천",
 "국내 전시 추천","서울 팝업 추천","기차여행 코스","국내 드라이브 코스","캠핑 여행 정보","여행 준비물 정리",
 "여행지 추천 TOP","가성비 여행 코스","당일치기 코스 정리","여행 코스 총정리"]

def key():
    k = os.environ.get("YOUTUBE_API_KEY")
    if not k: sys.exit("환경변수 YOUTUBE_API_KEY가 없어요 (환경 설정에 넣은 뒤 새 세션에서 실행)")
    return k

def call(path, **p):
    p["key"] = key()
    url = f"{API}/{path}?{urllib.parse.urlencode(p)}"
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(url, timeout=40))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf8", "ignore")
            if e.code == 403 and "quota" in body.lower(): sys.exit("오늘 할당량을 다 썼어요. 내일 이어서 실행하세요")
            if e.code in (429, 500, 503): time.sleep(2 ** i); continue
            sys.exit(f"API 오류 {e.code}: {body[:200]}")
    sys.exit("API 재시도 실패")

def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    c.executescript(open(os.path.join(os.path.dirname(__file__), "schema.sql")).read()); return c

def iso_dur(s):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    h, mi, se = (int(x or 0) for x in m.groups()) if m else (0, 0, 0)
    return h * 3600 + mi * 60 + se

def chapters(desc):
    out = []
    for line in (desc or "").splitlines():
        m = re.match(r"\s*(?:[-•▶▷]\s*)?((?:\d+:)?\d{1,2}:\d{2})\s+(.+)", line)
        if m: out.append([m.group(1), m.group(2).strip()[:60]])
    return out if len(out) >= 3 else []

def cmd_search(a):
    c = db(); kws = open(a.keywords_file, encoding="utf8").read().split("\n") if a.keywords_file else DEFAULT_KEYWORDS
    kws = [k.strip() for k in kws if k.strip()]
    for kw in kws:
        for order in ("viewCount", "relevance"):
            token = ""
            for page in range(a.max_pages):
                if c.execute("SELECT 1 FROM searches WHERE keyword=? AND order_by=? AND page_token=?", (kw, order, token)).fetchone():
                    r = None; break
                p = dict(part="snippet", q=kw, type="video", maxResults=50, regionCode="KR", relevanceLanguage="ko", order=order,
                         publishedAfter=(datetime.now(timezone.utc) - timedelta(days=540)).strftime("%Y-%m-%dT%H:%M:%SZ"))
                if token: p["pageToken"] = token
                r = call("search", **p)
                n = 0
                for it in r.get("items", []):
                    ch = it["snippet"]["channelId"]
                    if not c.execute("SELECT 1 FROM channels WHERE channel_id=?", (ch,)).fetchone():
                        c.execute("INSERT INTO channels(channel_id,title,first_seen,found_by) VALUES(?,?,?,?)", (ch, it["snippet"]["channelTitle"], now(), kw)); n += 1
                c.execute("INSERT OR REPLACE INTO searches VALUES(?,?,?,?,?)", (kw, order, token, now(), n)); c.commit()
                print(f"[{kw}/{order}/p{page+1}] 새 채널 {n}")
                token = r.get("nextPageToken", "")
                if not token: break
    print(cmd_status(a))

def cmd_channels(a):
    c = db(); ids = [r[0] for r in c.execute("SELECT channel_id FROM channels WHERE subs IS NULL")]
    for i in range(0, len(ids), 50):
        r = call("channels", part="snippet,statistics,contentDetails", id=",".join(ids[i:i+50]), maxResults=50)
        for it in r.get("items", []):
            s, st = it["snippet"], it.get("statistics", {})
            c.execute("UPDATE channels SET title=?,handle=?,country=?,subs=?,video_count=?,view_count=?,uploads_playlist=?,description=?,updated_at=? WHERE channel_id=?",
                (s["title"], s.get("customUrl"), s.get("country"), int(st.get("subscriberCount", 0)), int(st.get("videoCount", 0)), int(st.get("viewCount", 0)),
                 it["contentDetails"]["relatedPlaylists"]["uploads"], (s.get("description") or "")[:300], now(), it["id"]))
        c.commit(); print(f"채널 정보 {min(i+50, len(ids))}/{len(ids)}")

def cmd_videos(a):
    c = db()
    chs = c.execute("""SELECT channel_id, uploads_playlist FROM channels WHERE uploads_playlist IS NOT NULL AND subs>=?
        AND channel_id NOT IN (SELECT DISTINCT channel_id FROM videos) ORDER BY subs DESC""", (a.min_subs,)).fetchall()
    for n, (ch, pl) in enumerate(chs, 1):
        vids, token = [], ""
        while len(vids) < a.per_channel:
            p = dict(part="contentDetails", playlistId=pl, maxResults=50)
            if token: p["pageToken"] = token
            r = call("playlistItems", **p)
            vids += [x["contentDetails"]["videoId"] for x in r.get("items", [])]
            token = r.get("nextPageToken", "")
            if not token: break
        vids = vids[:a.per_channel]
        for i in range(0, len(vids), 50):
            r = call("videos", part="snippet,contentDetails,statistics", id=",".join(vids[i:i+50]))
            for it in r.get("items", []):
                s, st = it["snippet"], it.get("statistics", {})
                c.execute("INSERT OR REPLACE INTO videos VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                    it["id"], ch, s["title"], s["publishedAt"], iso_dur(it["contentDetails"]["duration"]),
                    int(st.get("viewCount", 0)), int(st.get("likeCount", 0)), int(st.get("commentCount", 0)),
                    json.dumps(s.get("tags", [])[:15], ensure_ascii=False), (s.get("description") or "")[:400],
                    json.dumps(chapters(s.get("description")), ensure_ascii=False),
                    (s.get("thumbnails", {}).get("high") or s.get("thumbnails", {}).get("default") or {}).get("url"), now(), now()))
                c.execute("INSERT OR IGNORE INTO snapshots VALUES(?,?,?,?,?)", (it["id"], now()[:10], int(st.get("viewCount", 0)), int(st.get("likeCount", 0)), int(st.get("commentCount", 0))))
        c.commit()
        if n % 20 == 0: print(f"채널 영상 수집 {n}/{len(chs)}")
    print(cmd_status(a))

def cmd_status(a=None):
    c = db(); q = lambda s: c.execute(s).fetchone()[0]
    return f"채널 {q('select count(*) from channels')}개 (통계 확인 {q('select count(*) from channels where subs is not null')}) · 영상 {q('select count(*) from videos')}개 · 검색 {q('select count(*) from searches')}회"

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("search"); s.add_argument("--max-pages", type=int, default=2); s.add_argument("--keywords-file")
    sp.add_parser("channels")
    v = sp.add_parser("videos"); v.add_argument("--per-channel", type=int, default=60); v.add_argument("--min-subs", type=int, default=500)
    sp.add_parser("status")
    a = ap.parse_args()
    {"search": cmd_search, "channels": cmd_channels, "videos": cmd_videos, "status": lambda a: print(cmd_status())}[a.cmd](a)
