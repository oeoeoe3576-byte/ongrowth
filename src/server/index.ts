// Phase 8: 관리 대시보드용 REST API 서버 (지시사항 23~25)
// dashboard/public의 정적 UI가 이 API를 호출한다.
// Vercel Cron이 있다면 POST /api/scheduler/tick 을 주기적으로 호출하도록 구성할 수 있다.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCardnews,
  scheduleCardnews,
  batchCreateAndSchedule,
} from "../skill/orchestrator.js";
import {
  listPosts,
  getPost,
  cancelPost,
  approvePost,
  reschedulePost,
} from "../queue/queueStore.js";
import { scanInbox } from "../queue/inboxWatcher.js";
import { tick } from "../scheduler/scheduler.js";
import { loadCalendar } from "../calendar/calendar.js";
import { listAvailableTemplates } from "../render/renderCard.js";
import { loadConfig } from "../config.js";
import { readTodayLogs } from "../logging/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "..", "dashboard", "public")));

function handle(fn: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response) => {
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: (err as Error).message });
    });
  };
}

// --- 카드뉴스 생성 (섹션 24) ---
app.post(
  "/api/cardnews/create",
  handle(async (req, res) => {
    const { topic, region, season, template, cta, slideCount, publishAt, account, autoPublish } = req.body;
    const result = await createCardnews({ topic, region, season, template, cta, slideCount });
    let post = null;
    if (publishAt) {
      post = await scheduleCardnews({ folder: result.folder, title: topic, publishAt, account, autoPublish });
    }
    res.json({
      folder: result.relativeFolder,
      slideCount: result.content.slide_count,
      places: result.content.places.map((p) => p.place_name),
      caption: result.caption,
      post,
    });
  })
);

app.post(
  "/api/cardnews/batch",
  handle(async (req, res) => {
    const { topics, startDate, hour, minute, intervalDays, account, autoPublish } = req.body;
    const results = await batchCreateAndSchedule(
      (topics as string[]).map((t) => ({ topic: t })),
      { startDate, hour, minute, intervalDays, account, autoPublish }
    );
    res.json({ results });
  })
);

// --- 예약 목록 (섹션 25) ---
app.get(
  "/api/queue",
  handle(async (req, res) => {
    const status = req.query.status as string | undefined;
    const posts = await listPosts(status ? { status: status as any } : undefined);
    res.json({ posts });
  })
);

app.get(
  "/api/queue/:id",
  handle(async (req, res) => {
    const post = await getPost(req.params.id);
    if (!post) return void res.status(404).json({ error: "not found" });
    res.json({ post });
  })
);

app.post(
  "/api/queue/:id/reschedule",
  handle(async (req, res) => {
    const post = await reschedulePost(req.params.id, req.body.publishAt);
    res.json({ post });
  })
);

app.post(
  "/api/queue/:id/cancel",
  handle(async (req, res) => {
    const post = await cancelPost(req.params.id);
    res.json({ post });
  })
);

app.post(
  "/api/queue/:id/approve",
  handle(async (req, res) => {
    const post = await approvePost(req.params.id);
    res.json({ post });
  })
);

app.post(
  "/api/queue/:id/publish-now",
  handle(async (req, res) => {
    const post = await getPost(req.params.id);
    if (!post) return void res.status(404).json({ error: "not found" });
    if (post.status === "published") return void res.status(409).json({ error: "이미 발행된 게시물입니다." });
    await reschedulePost(req.params.id, new Date().toISOString());
    const summary = await tick();
    res.json({ summary });
  })
);

// --- 스케줄러/인박스 (수동 트리거 - Vercel Cron 등에서 호출) ---
app.post(
  "/api/scheduler/tick",
  handle(async (_req, res) => {
    const inbox = await scanInbox();
    const summary = await tick();
    res.json({ inbox, summary });
  })
);

// --- 캘린더 ---
app.get(
  "/api/calendar",
  handle(async (_req, res) => {
    res.json({ entries: await loadCalendar() });
  })
);

// --- 템플릿/설정 ---
app.get(
  "/api/templates",
  handle(async (_req, res) => {
    res.json({ templates: await listAvailableTemplates() });
  })
);

app.get(
  "/api/settings",
  handle(async (_req, res) => {
    res.json({ config: loadConfig() });
  })
);

// --- 로그 ---
app.get(
  "/api/logs/today",
  handle(async (_req, res) => {
    res.json({ logs: await readTodayLogs() });
  })
);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`[dashboard] http://localhost:${port} 에서 실행 중`);
});
