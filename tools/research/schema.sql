-- 여행 정보 유튜브 조사 DB (공식 YouTube Data API v3로만 수집, 누적 저장)
CREATE TABLE IF NOT EXISTS channels(
  channel_id TEXT PRIMARY KEY, title TEXT, handle TEXT, country TEXT,
  subs INTEGER, video_count INTEGER, view_count INTEGER, uploads_playlist TEXT,
  description TEXT, first_seen TEXT, updated_at TEXT, found_by TEXT);
CREATE TABLE IF NOT EXISTS videos(
  video_id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, published_at TEXT,
  duration_sec INTEGER, views INTEGER, likes INTEGER, comments INTEGER,
  tags TEXT, description_head TEXT, chapters TEXT, thumb_url TEXT,
  first_seen TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS searches(keyword TEXT, order_by TEXT, page_token TEXT, done_at TEXT, n_videos INTEGER,
  PRIMARY KEY(keyword, order_by, page_token));
CREATE TABLE IF NOT EXISTS snapshots(video_id TEXT, taken_at TEXT, views INTEGER, likes INTEGER, comments INTEGER,
  PRIMARY KEY(video_id, taken_at));
CREATE INDEX IF NOT EXISTS ix_videos_ch ON videos(channel_id);
