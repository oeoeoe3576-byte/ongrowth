#!/usr/bin/env node
// 10. Skill Interface - CLI (지시사항 32)
// 예: npm run cardnews -- create "평창 가을 여행지 5곳" --region "강원 평창" --publish-at "2026-09-05 19:00"

import { Command } from "commander";
import { DateTime } from "luxon";
import {
  createCardnews,
  scheduleCardnews,
  batchCreateAndSchedule,
} from "./skill/orchestrator.js";
import { listPosts, getPost, cancelPost, approvePost, reschedulePost } from "./queue/queueStore.js";
import { scanInbox } from "./queue/inboxWatcher.js";
import { tick } from "./scheduler/scheduler.js";
import { loadCalendar } from "./calendar/calendar.js";
import { loadConfig } from "./config.js";

const program = new Command();
program.name("cardnews").description("국내여행 카드뉴스 자동 제작·예약발행 CLI");

function toIsoWithSeoul(input: string): string {
  const tz = loadConfig().publishing.timezone;
  // "2026-09-05 19:00" 또는 "2026-09-05T19:00" 모두 허용
  const normalized = input.includes("T") ? input : input.replace(" ", "T");
  const dt = DateTime.fromISO(normalized, { zone: tz });
  if (!dt.isValid) throw new Error(`날짜 형식을 이해할 수 없습니다: "${input}" (예: "2026-09-05 19:00")`);
  return dt.toISO()!;
}

program
  .command("create")
  .description("카드뉴스를 생성한다 (리서치→콘텐츠→렌더→저장→캡션)")
  .argument("<topic>", "카드뉴스 주제, 예: '평창 가을 여행지 5곳'")
  .option("--region <region>", "지역 (생략 시 topic에서 추정)")
  .option("--season <season>", "계절 키워드")
  .option("--template <template>", "템플릿 이름 (기본 config.yaml 값)")
  .option("--cta <cta>", "CTA 문구 (기본 config.yaml 값)")
  .option("--slide-count <n>", "페이지 수", (v) => parseInt(v, 10))
  .option("--publish-at <datetime>", "예약 발행 시각, 예: '2026-09-05 19:00' (지정하면 큐에도 바로 등록)")
  .option("--account <account>", "발행 계정 (기본 config.yaml brand.account)")
  .option("--auto", "REVIEW 모드를 건너뛰고 승인됨으로 등록 (기본은 REVIEW)")
  .action(async (topic, opts) => {
    const result = await createCardnews({
      topic,
      region: opts.region,
      season: opts.season,
      template: opts.template,
      cta: opts.cta,
      slideCount: opts.slideCount,
    });
    console.log(`✅ 카드뉴스 생성 완료: ${result.relativeFolder}`);
    console.log(`   슬라이드 ${result.content.slide_count}장, 장소 ${result.content.places.length}곳`);
    console.log(`--- caption.txt ---\n${result.caption}`);

    if (opts.publishAt) {
      const publishAtIso = toIsoWithSeoul(opts.publishAt);
      const post = await scheduleCardnews({
        folder: result.folder,
        title: topic,
        publishAt: publishAtIso,
        account: opts.account,
        autoPublish: opts.auto ?? undefined,
      });
      console.log(`📅 예약 등록: ${post.id} → ${post.publish_at} (status=${post.status}, auto_publish=${post.auto_publish})`);
    } else {
      console.log(`ℹ️  예약하려면: cardnews schedule-folder "${result.relativeFolder}" "2026-09-05 19:00"`);
    }
  });

program
  .command("schedule-folder")
  .description("이미 생성된 폴더를 큐에 등록한다")
  .argument("<folder>", "cardnews_output 하위 폴더 경로")
  .argument("<datetime>", "예약 시각, 예: '2026-09-05 19:00'")
  .option("--title <title>", "게시물 제목")
  .option("--account <account>", "발행 계정")
  .option("--auto", "REVIEW 모드 건너뛰고 자동 승인")
  .action(async (folder, datetime, opts) => {
    const publishAtIso = toIsoWithSeoul(datetime);
    const post = await scheduleCardnews({
      folder,
      title: opts.title ?? folder,
      publishAt: publishAtIso,
      account: opts.account,
      autoPublish: opts.auto ?? undefined,
    });
    console.log(`📅 예약 등록: ${post.id} → ${post.publish_at}`);
  });

program
  .command("schedule")
  .description("이미 큐에 있는 게시물의 예약 시각을 변경한다")
  .argument("<postId>")
  .argument("<datetime>", "예: '2026-09-05 19:00'")
  .action(async (postId, datetime) => {
    const publishAtIso = toIsoWithSeoul(datetime);
    const post = await reschedulePost(postId, publishAtIso);
    console.log(`📅 재예약: ${post.id} → ${post.publish_at}`);
  });

program
  .command("approve")
  .description("REVIEW 모드 게시물을 승인한다")
  .argument("<postId>")
  .action(async (postId) => {
    const post = await approvePost(postId);
    console.log(`✅ 승인됨: ${post.id}`);
  });

program
  .command("cancel")
  .description("게시물을 취소한다")
  .argument("<postId>")
  .action(async (postId) => {
    await cancelPost(postId);
    console.log(`🚫 취소됨: ${postId}`);
  });

program
  .command("publish")
  .description("즉시 발행을 시도한다 (예약 시각을 지금으로 당기고 스케줄러를 한 번 실행)")
  .argument("<postId>")
  .action(async (postId) => {
    const post = await getPost(postId);
    if (!post) throw new Error(`게시물을 찾을 수 없습니다: ${postId}`);
    if (post.status === "published") {
      console.log(`⚠️  이미 발행된 게시물입니다 (post_id=${postId}). 다시 발행하지 않습니다.`);
      return;
    }
    if (post.status === "cancelled") {
      console.log(`⚠️  취소된 게시물입니다 (post_id=${postId}). 먼저 재예약이 필요합니다.`);
      return;
    }
    if (post.status !== "scheduled" && post.status !== "failed") {
      console.log(`⚠️  현재 상태(${post.status})에서는 즉시 발행할 수 없습니다.`);
      return;
    }
    await reschedulePost(postId, new Date().toISOString());
    const summary = await tick();
    console.log(`발행 시도 결과: published=${summary.published} retried=${summary.retried} failed=${summary.failed}`);
  });

program
  .command("queue")
  .description("예약 큐 목록을 표시한다")
  .option("--status <status>", "상태로 필터링 (draft/ready/scheduled/publishing/published/failed/cancelled)")
  .action(async (opts) => {
    const posts = await listPosts(opts.status ? { status: opts.status } : undefined);
    if (posts.length === 0) {
      console.log("큐가 비어 있습니다.");
      return;
    }
    for (const p of posts) {
      console.log(`${p.id}\t${p.status}\t${p.publish_at}\t${p.title}\t(retry=${p.retry_count})`);
    }
  });

program
  .command("batch")
  .description("여러 주제를 한 번에 만들고 날짜별로 예약한다 (지시사항 30)")
  .argument("<topics>", "쉼표로 구분된 주제 목록, 예: '강릉,평창,부산,경주,여수,전주,제주'")
  .requiredOption("--start-date <date>", "YYYY-MM-DD (첫 번째 주제가 발행될 날짜)")
  .option("--hour <hour>", "발행 시각(시)", (v) => parseInt(v, 10), 19)
  .option("--minute <minute>", "발행 시각(분)", (v) => parseInt(v, 10), 0)
  .option("--interval-days <n>", "주제 간 간격(일)", (v) => parseInt(v, 10), 1)
  .action(async (topicsArg, opts) => {
    const topics = topicsArg.split(",").map((t: string) => ({ topic: t.trim() }));
    const results = await batchCreateAndSchedule(topics, {
      startDate: opts.startDate,
      hour: opts.hour,
      minute: opts.minute,
      intervalDays: opts.intervalDays,
    });
    for (const r of results) {
      if (r.ok) console.log(`✅ ${r.topic} → ${r.postId} @ ${r.publishAt}`);
      else console.log(`❌ ${r.topic} → 실패: ${r.error}`);
    }
  });

program
  .command("calendar")
  .description("콘텐츠 캘린더를 표시한다")
  .action(async () => {
    const entries = await loadCalendar();
    for (const e of entries) console.log(`${e.date}\t${e.status}\t${e.topic}\t${e.post_id ?? ""}`);
  });

program
  .command("inbox:scan")
  .description("publish_inbox 폴더를 스캔해 큐에 등록한다")
  .action(async () => {
    const results = await scanInbox();
    if (results.length === 0) {
      console.log("inbox에 새 폴더가 없습니다.");
      return;
    }
    for (const r of results) console.log(`${r.status}\t${r.folder}\t${r.detail}`);
  });

program
  .command("tick")
  .description("스케줄러를 한 번 수동 실행한다")
  .action(async () => {
    const summary = await tick();
    console.log(JSON.stringify(summary, null, 2));
  });

program.parseAsync(process.argv);
