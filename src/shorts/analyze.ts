// 부업 쇼츠 분석: 분류(tags.csv)가 valid인 영상만 훅 유형·CTA 유형·길이·제목 특징을 규칙으로 태깅한다.
//   npm run shorts-analyze   → data/shorts-db/analysis.csv + 요약 출력
// 자막은 확보하지 못해(유튜브가 서버 요청을 막음) 제목·설명·태그 기반이다.

import fs from "node:fs";

const DIR = "data/shorts-db";

function parse(l: string): string[] {
  const o: string[] = []; let c = "", q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { o.push(c); c = ""; } else c += ch;
  }
  o.push(c); return o;
}
const table = (f: string) => fs.readFileSync(`${DIR}/${f}`, "utf8").trim().split("\n").slice(1).map(parse);

// 한 영상에 훅 특징이 여러 개 걸릴 수 있다 (예: 숫자 + 반전)
const HOOKS: Array<[string, RegExp]> = [
  ["숫자·결과", /월\s?\d|\d+\s?만\s?원|\d+억|\d+원|하루\s?\d|\d+\s?(개|가지|일차|%)|TOP\s?\d/i],
  ["반전·경고", /하지\s?마세요|망했|현실|실체|처참|피눈물|그만|지옥|이유|사기|놓치지|필독|왜\b/],
  ["질문", /\?|할까|아세요|않으셨|가능/],
  ["인물·나이", /\d+\s?(살|세)\b|\d+대\b|워킹맘|직장인|의사|회계사|MZ|주부/],
  ["방법·정보", /방법|추천|총정리|노하우|꿀팁|공식|하는 법|가지/],
  ["후기·체험", /후기|해봤|결제해|시작|도전|일차|하루 일과|느낀점/],
];
const CTAS: Array<[string, RegExp]> = [
  ["강의·유료유도", /무료\s?(강의|특강|라이브|자료)|오픈채팅|강의 신청|멤버십|커뮤니티|풀버전|신청 방법/],
  ["문의·협업", /@|문의|협업|이메일/],
  ["구독·링크", /구독|링크|http/],
];
const tag = (list: Array<[string, RegExp]>, s: string) => list.filter(([, r]) => r.test(s)).map(([n]) => n);

const tags = new Map(table("tags.csv").map((r) => [r[0], r[1]]));
const videos = table("videos.csv").filter((r) => tags.get(r[0]) === "valid");
const out = ["id,views,seconds,title_len,hashtags,ad,hooks,cta,title"];
const cnt = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const hookN = new Map<string, number>(), ctaN = new Map<string, number>(), secs: number[] = [], lens: number[] = [];
let ad = 0, tagged = 0;
for (const r of videos) {
  const [id, title, , views, , , sec, , , , , desc] = r;
  const text = `${title} ${desc}`;
  const h = tag(HOOKS, title), c = tag(CTAS, desc);
  const hashtags = (text.match(/#/g) ?? []).length;
  const isAd = /#?광고|유료광고/.test(text) && !/포함하지 않습니다/.test(text) ? 1 : 0;
  h.forEach((x) => cnt(hookN, x)); (c.length ? c : ["없음"]).forEach((x) => cnt(ctaN, x));
  if (h.length) tagged++;
  ad += isAd; secs.push(Number(sec)); lens.push(title.length);
  out.push([id, views, sec, title.length, hashtags, isAd, `"${h.join("|")}"`, `"${c.join("|") || "없음"}"`, `"${title.replace(/"/g, '""')}"`].join(","));
}
fs.writeFileSync(`${DIR}/analysis.csv`, out.join("\n") + "\n");
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (n: number) => `${n}개 (${Math.round((n / videos.length) * 100)}%)`;
console.log(`분석 대상 ${videos.length}개 · 훅 규칙 매칭 ${pct(tagged)} · 광고표시 ${pct(ad)}`);
console.log(`길이 중앙값 ${med(secs)}초 · 20~40초 ${pct(secs.filter((s) => s >= 20 && s <= 40).length)} · 60초 이하 ${pct(secs.filter((s) => s <= 60).length)}`);
console.log(`제목 길이 중앙값 ${med(lens)}자`);
console.log("훅:", [...hookN].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log("CTA:", [...ctaN].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
