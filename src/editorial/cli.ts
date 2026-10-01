// 콘텐츠 캘린더 CLI (매일 자동 작업과 사람의 승인이 이 명령들을 쓴다)
//   npm run editorial -- next [--brand ongrowth] [--date YYYY-MM-DD] [--reserve]   오늘 주제와 기획 조건
//   npm run editorial -- swap [--to <topicId>]           오늘 주제를 다른 주제로 바꾸기 (주제 컨펌에서 '다른 주제')
//   npm run editorial -- link <topicId> <contentId>     주제 ↔ 원고 연결
//   npm run editorial -- review <contentId>             검토 요청 상태로
//   npm run editorial -- approve <contentId> [--at "YYYY-MM-DD HH:mm"]   승인 + 발행 시각
//   npm run editorial -- revise <contentId> --note "..." 수정 요청 기록 (다시 review로)
//   npm run editorial -- hold <contentId> [--note]      보류
//   npm run editorial -- published <contentId>          발행 완료 기록
//   npm run editorial -- due                            발행 시각이 지난 승인 건
//   npm run editorial -- add --channel blog --topic "..." --angle "..."
//   npm run editorial -- status                         전체 현황
//   npm run editorial -- ig-check                       인스타그램 토큰 확인 (게시 안 함)
//   npm run editorial -- publish <contentId> [--dry-run] 인스타그램 캐러셀 자동 발행 (승인 건만)

import { Command } from "commander";
import { loadStore } from "../planner/store.js";
import { renderContent } from "../design/renderHtml.js";
import { exportPackage } from "../design/exportPackage.js";
import { buildCaption, hostImages, waitForUrls, publishCarousel, checkInstagram } from "./instagram.js";
import { loadCalendar, saveCalendar, pickTopic, findByContent, setMasterStatus, defaultPublishAt, recentTopics, now, channelFor, type Topic } from "./calendar.js";

const program = new Command().name("editorial").description("콘텐츠 캘린더");
const brandOpt = ["--brand <brand>", "브랜드", "ongrowth"] as const;

program
  .command("next")
  .option(...brandOpt)
  .option("--date <date>", "날짜 (기본: 오늘, KST)")
  .option("--reserve", "이 주제를 오늘 것으로 확정")
  .option("--json", "JSON으로 출력")
  .action((o: { brand: string; date?: string; reserve?: boolean; json?: boolean }) => {
    const cal = loadCalendar(o.brand);
    const date = o.date ?? now(cal).toISODate()!;
    const { topic, channel, fallback, dayOff } = pickTopic(cal, date);
    if (dayOff) {
      console.log(`[${date}] 쉬는 날 (weekly 설정에 없는 요일). 오늘은 카드뉴스를 만들지 않습니다.`);
      process.exitCode = 3;
      return;
    }
    if (!topic) {
      console.log(`남은 주제가 없음 (${channel} 요일). editorial add로 주제를 추가하세요.`);
      process.exitCode = 2;
      return;
    }
    if (o.reserve && topic.status === "todo") {
      topic.status = "reserved";
      topic.date = date;
      saveCalendar(cal);
    }
    const recent = recentTopics(cal, date).map((t) => `${t.date} ${t.topic}`);
    const brief = {
      date,
      weekday_channel: channel,
      topic_id: topic.id,
      channel: topic.channel,
      channel_label: cal.channels[topic.channel] ?? topic.channel,
      topic: topic.topic,
      angle: topic.angle,
      status: topic.status,
      content_id: topic.content_id ?? null,
      planner_args: { brand: cal.brand, topic: topic.topic, objective: cal.objective, category: cal.category, target: cal.target, maxPages: cal.maxPages },
      rules: cal.rules,
      recent_topics: recent,
      publish_time: cal.publishTime,
    };
    if (o.json) {
      console.log(JSON.stringify(brief, null, 2));
      return;
    }
    console.log(`[${date}] ${channel} 요일${fallback ? ` → ${topic.channel} 주제로 대체` : ""}`);
    console.log(`주제 ${topic.id}: ${topic.topic}`);
    const alt = cal.backlog.find((t) => t.status === "todo" && t.channel === topic.channel && t.id !== topic.id);
    if (alt) console.log(`다른 후보 ${alt.id}: ${alt.topic}`);
    console.log(`방향: ${topic.angle}`);
    console.log(`상태: ${topic.status}${topic.content_id ? ` (${topic.content_id})` : ""}`);
    console.log(`기획 명령: npm run planner -- plan --brand ${cal.brand} --topic "${topic.topic}" --objective ${cal.objective} --category ${cal.category} --target "${cal.target}" --max-pages ${cal.maxPages} --response <응답.json>`);
    if (recent.length) console.log(`최근 주제 (겹치지 않게):\n  ${recent.join("\n  ")}`);
  });

program
  .command("swap")
  .option(...brandOpt)
  .option("--date <date>", "날짜 (기본: 오늘, KST)")
  .option("--to <topicId>", "바꿀 주제 ID (없으면 같은 채널의 다음 주제)")
  .action((o: { brand: string; date?: string; to?: string }) => {
    const cal = loadCalendar(o.brand);
    const date = o.date ?? now(cal).toISODate()!;
    const cur = cal.backlog.find((t) => t.date === date && t.status === "reserved");
    if (!cur) throw new Error(`${date}에 바꿀 수 있는 주제(reserved)가 없음. 이미 원고가 만들어졌으면 hold 후 새로 진행`);
    const next = o.to
      ? cal.backlog.find((t) => t.id === o.to && t.status === "todo")
      : cal.backlog.find((t) => t.status === "todo" && t.channel === cur.channel && t.id !== cur.id);
    if (!next) throw new Error(o.to ? `주제 ${o.to}가 없거나 이미 사용됨` : "같은 채널에 남은 주제가 없음 (editorial add로 추가)");
    cur.status = "todo";
    delete cur.date;
    next.status = "reserved";
    next.date = date;
    saveCalendar(cal);
    console.log(`✓ ${cur.id} → ${next.id}: ${next.topic}`);
  });

program
  .command("link")
  .argument("<topicId>")
  .argument("<contentId>")
  .option(...brandOpt)
  .action((topicId: string, contentId: string, o: { brand: string }) => {
    const cal = loadCalendar(o.brand);
    const t = cal.backlog.find((x) => x.id === topicId);
    if (!t) throw new Error(`주제 ${topicId} 없음`);
    t.content_id = contentId;
    t.status = "planned";
    t.date ??= now(cal).toISODate()!;
    saveCalendar(cal);
    console.log(`✓ ${topicId} ↔ ${contentId}`);
  });

function transition(contentId: string, brand: string, status: Topic["status"], master: string, extra: (t: Topic) => void = () => {}) {
  const cal = loadCalendar(brand);
  const t = findByContent(cal, contentId);
  t.status = status;
  extra(t);
  saveCalendar(cal);
  setMasterStatus(contentId, master);
  return t;
}

program.command("review").argument("<contentId>").option(...brandOpt).action((id: string, o: { brand: string }) => {
  const t = transition(id, o.brand, "review", "review");
  console.log(`✓ ${id} 검토 요청 (${t.topic})`);
});

program
  .command("approve")
  .argument("<contentId>")
  .option(...brandOpt)
  .option("--at <datetime>", "발행 시각 YYYY-MM-DD HH:mm (KST). 기본: 오늘 발행 시각, 지났으면 지금")
  .action((id: string, o: { brand: string; at?: string }) => {
    const cal = loadCalendar(o.brand);
    const at = o.at ?? defaultPublishAt(cal);
    const t = transition(id, o.brand, "approved", "approved", (x) => (x.publish_at = at));
    console.log(`✓ ${id} 승인 · 발행 ${at} (KST) · ${t.topic}`);
  });

program
  .command("revise")
  .argument("<contentId>")
  .requiredOption("--note <note>")
  .option(...brandOpt)
  .action((id: string, o: { brand: string; note: string }) => {
    transition(id, o.brand, "review", "review", (x) => (x.note = o.note));
    console.log(`✓ ${id} 수정 요청 기록: ${o.note}`);
  });

program
  .command("hold")
  .argument("<contentId>")
  .option("--note <note>")
  .option(...brandOpt)
  .action((id: string, o: { brand: string; note?: string }) => {
    transition(id, o.brand, "hold", "hold", (x) => {
      if (o.note) x.note = o.note;
    });
    console.log(`✓ ${id} 보류`);
  });

program.command("published").argument("<contentId>").option(...brandOpt).action((id: string, o: { brand: string }) => {
  const cal = loadCalendar(o.brand);
  transition(id, o.brand, "published", "published", (x) => (x.published_at = now(cal).toFormat("yyyy-MM-dd HH:mm")));
  console.log(`✓ ${id} 발행 완료 기록`);
});

program.command("due").option(...brandOpt).action((o: { brand: string }) => {
  const cal = loadCalendar(o.brand);
  const n = now(cal).toFormat("yyyy-MM-dd HH:mm");
  const due = cal.backlog.filter((t) => t.status === "approved" && t.publish_at && t.publish_at <= n);
  if (!due.length) console.log("발행할 승인 건 없음");
  for (const t of due) console.log(`${t.content_id} · ${t.publish_at} · ${t.topic}`);
});

program
  .command("add")
  .requiredOption("--channel <channel>")
  .requiredOption("--topic <topic>")
  .option("--angle <angle>", "방향", "")
  .option(...brandOpt)
  .action((o: { brand: string; channel: string; topic: string; angle: string }) => {
    const cal = loadCalendar(o.brand);
    if (!cal.channels[o.channel]) throw new Error(`채널 '${o.channel}' 없음 (${Object.keys(cal.channels).join(", ")})`);
    if (cal.backlog.some((t) => t.topic === o.topic)) throw new Error("같은 주제가 이미 있음");
    const prefix = o.channel.charAt(0).toUpperCase();
    const n = cal.backlog.filter((t) => t.id.startsWith(prefix)).length + 1;
    const id = `${prefix}${String(n).padStart(2, "0")}`;
    cal.backlog.push({ id, channel: o.channel, topic: o.topic, angle: o.angle, status: "todo" });
    saveCalendar(cal);
    console.log(`✓ ${id} 추가: ${o.topic}`);
  });

program.command("status").option(...brandOpt).action((o: { brand: string }) => {
  const cal = loadCalendar(o.brand);
  const today = now(cal).toISODate()!;
  const count = (s: string) => cal.backlog.filter((t) => t.status === s).length;
  console.log(`${cal.brand} · 오늘 ${today} (${channelFor(cal, today) ?? "쉬는"} 요일) · 검토 ${cal.reviewTime} / 발행 ${cal.publishTime} KST`);
  console.log(`대기 ${count("todo")} · 진행 ${count("reserved") + count("planned")} · 검토 ${count("review")} · 승인 ${count("approved")} · 발행 ${count("published")} · 보류 ${count("hold")}`);
  for (const ch of Object.keys(cal.channels)) console.log(`  ${cal.channels[ch]}: 남은 주제 ${cal.backlog.filter((t) => t.channel === ch && t.status === "todo").length}개`);
  for (const t of cal.backlog.filter((x) => x.status !== "todo")) console.log(`  ${t.id} ${t.status.padEnd(9)} ${t.date ?? ""} ${t.content_id ?? ""} ${t.topic}`);
});

program.command("ig-check").option(...brandOpt).action(async (o: { brand: string }) => {
  console.log(`✓ 인스타그램 연결 확인 (${o.brand}): ${await checkInstagram(o.brand)}`);
});

program
  .command("publish")
  .argument("<contentId>")
  .option(...brandOpt)
  .option("--dry-run", "이미지·캡션만 만들고 업로드하지 않음")
  .option("--force", "승인(approved) 상태가 아니어도 발행")
  .action(async (id: string, o: { brand: string; dryRun?: boolean; force?: boolean }) => {
    const cal = loadCalendar(o.brand);
    const t = findByContent(cal, id);
    if (t.status === "published") throw new Error(`${id}는 이미 발행됨 (${t.published_at})`);
    if (t.status !== "approved" && !o.force) throw new Error(`${id}는 승인 전 (상태 ${t.status}). 승인 후 발행`);
    const store = loadStore();
    const master = store.master.find((m) => m.content_id === id);
    if (!master) throw new Error(`MASTER에 ${id} 없음`);
    const caption = buildCaption(master.caption, master.hashtags);
    const pkg = await exportPackage(renderContent(master, store.pages));
    console.log(`JPEG ${pkg.images.length}장 · 캡션 ${caption.length}자`);
    if (o.dryRun) {
      console.log(`[dry-run] 업로드하지 않음 → ${pkg.dir}\n---\n${caption}`);
      return;
    }
    const urls = hostImages(id, pkg.images);
    await waitForUrls(urls);
    console.log(`이미지 주소 준비 (${urls.length}장)`);
    const mediaId = await publishCarousel(urls, caption, o.brand);
    transition(id, o.brand, "published", "published", (x) => {
      x.published_at = now(cal).toFormat("yyyy-MM-dd HH:mm");
      x.note = `instagram media ${mediaId}`;
    });
    console.log(`✓ ${id} 인스타그램 발행 완료 (media ${mediaId})`);
  });

program.parseAsync().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
