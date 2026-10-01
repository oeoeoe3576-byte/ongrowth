// 뷰티레터 빌더: letter.json → slides.html (→ render.mjs로 PNG/JPEG)
// 실행: node design/beauty_news/build.mjs <레터 폴더>   (폴더 안에 letter.json)
// 문구 표기: **강조** → 로즈색, 줄바꿈(\n) → 줄바꿈
//
// letter.json
// { "no": 2, "category": "Color Letter", "brand": "PURPLE MAKEUP",
//   "cover": { "style": "type"|"cut", "big": "Purple", "image": "img/x.png", "title": "...", "sub": "..." },
//   "slides": [ {"type":"points", ...}, {"type":"swatches", ...}, {"type":"html","name":"03_x","html":"..."} ],
//   "summary": { "rows": [["What","본문","작은 글씨"], ...], "chips": ["#태그"] },
//   "ps": { "label": "에디터의 한 줄 팁", "note": "...", "credit": "..." } }

import fs from "node:fs";
import path from "node:path";

const HANDLE = "@from.beautyletter";
const folder = process.argv[2];
if (!folder) throw new Error("레터 폴더를 지정하세요");
const L = JSON.parse(fs.readFileSync(path.join(folder, "letter.json"), "utf8"));
const rel = path.relative(folder, path.dirname(new URL(import.meta.url).pathname)).split(path.sep).join("/") || ".";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>').replace(/\n/g, "<br/>");
const mdB = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>");
const no2 = String(L.no).padStart(2, "0");

const total = 1 + L.slides.length + 2;
const pad = (n) => String(n).padStart(2, "0");
const top = (n, dark) =>
  `<div class="topbar"><div class="wordmark" style="font-size:26px;letter-spacing:5px">BEAUTY <i>letter</i></div><div class="pageno"><b>${pad(n)}</b> / ${pad(total)}</div></div>`;

function cover() {
  const c = L.cover;
  const kicker = `<div class="kicker"><span class="cat">${esc(L.category)}</span><span class="sep">·</span><span>${esc(L.brand)}</span></div>`;
  const foot = `<div class="footbar"><span class="letter-no">BEAUTY LETTER · <i>No.${no2}</i></span><span>옆으로 넘겨보기 →</span></div>`;
  const topbar = `<div class="topbar"><div class="wordmark">BEAUTY <i>letter</i></div><div class="issue-mark">No.<b>${no2}</b></div></div>`;
  if (c.style === "cut") {
    return `<section class="card cover-cut" data-name="01_cover"><div class="glow"></div><img class="cut" src="${esc(c.image)}" alt="" />${topbar}
  ${c.badge ? `<div class="new-badge">${esc(c.badge)}</div>` : ""}
  <div class="body">${kicker}<h1>${md(c.title)}</h1><p>${md(c.sub)}</p></div>${foot}</section>`;
  }
  return `<section class="card cover-type" data-name="01_cover"><div class="ring"></div><div class="ring two"></div>${topbar}
  <div class="big-word">${esc(c.big || "")}</div>
  <div class="body low">${kicker}<h1>${md(c.title)}</h1><p>${md(c.sub)}</p></div>${foot}</section>`;
}

function slide(s, i) {
  const n = i + 2, name = `${pad(n)}_${s.name || s.type}`;
  if (s.type === "points") {
    return `<section class="card points" data-name="${name}">${top(n)}<div class="kicker">${esc(s.kicker)}</div><h2>${md(s.title)}</h2>
  <div class="items">${s.items.map((it, k) => `<div class="item"><div class="n">${pad(k + 1)}</div><div><h3>${md(it.h)}</h3><p>${mdB(it.p)}</p></div></div>`).join("")}</div>
  ${s.foot ? `<div class="foot">${esc(s.foot)}</div>` : ""}</section>`;
  }
  if (s.type === "swatches") {
    return `<section class="card swatchset" data-name="${name}">${top(n)}<div class="kicker">${esc(s.kicker)}</div><h2>${md(s.title)}</h2>
  ${s.groups.map((g) => `<div class="group"><div class="gl">${md(g.label)}${g.sub ? `<small>${esc(g.sub)}</small>` : ""}</div><div class="chips">${g.chips.map((c) => `<div class="chip"><i style="background:${esc(c.hex)}"></i><b>${esc(c.name)}</b><span>${esc(c.desc || "")}</span></div>`).join("")}</div></div>`).join("")}
  ${s.note ? `<div class="note">${mdB(s.note)}</div>` : ""}
  ${s.foot ? `<div class="foot">${esc(s.foot)}</div>` : ""}</section>`;
  }
  if (s.type === "html") return `<section class="card ${esc(s.cls || "")}" data-name="${name}">${top(n)}${s.html}</section>`;
  throw new Error(`알 수 없는 슬라이드 타입: ${s.type}`);
}

function summary() {
  const n = total - 1;
  return `<section class="card summary" data-name="${pad(n)}_summary"><div class="topbar"><div class="wordmark" style="font-size:26px;letter-spacing:5px">BEAUTY <i>letter</i></div><div class="pageno"><b>${pad(n)}</b> / ${pad(total)}</div></div>
  <div class="kicker">TODAY'S SUMMARY</div><h2>오늘의 요약</h2><p class="lead">끝까지 읽어줘서 고마워요. 오늘 레터를 한 장으로 정리했어요.</p>
  <div class="rows">${L.summary.rows.map(([q, a, s]) => `<div class="row"><div class="q">${esc(q)}</div><div class="a">${esc(a)}<small>${esc(s || "")}</small></div></div>`).join("")}</div>
  <div class="chips">${(L.summary.chips || []).map((c) => `<span>${esc(c)}</span>`).join("")}</div></section>`;
}

function ps() {
  const p = L.ps;
  return `<section class="card ps" data-name="${pad(total)}_ps"><div class="wordmark">BEAUTY <i>letter</i></div>
  <div class="inner"><div class="ps-mark">P.S.</div><div class="note"><div class="label">${esc(p.label || "에디터의 한 줄 팁")}</div><p>${mdB(p.note)}</p></div>
  <div class="bye"><h2>다음 레터에서<br/><em>만나요</em></h2><p><i></i>저장해두고 쇼핑할 때 꺼내보세요</p><div><span class="follow">${HANDLE} 팔로우</span></div></div></div>
  <div class="credit">${md(p.credit || "")}</div></section>`;
}

const extraCss = fs.existsSync(path.join(folder, "extra.css")) ? `<link rel="stylesheet" href="extra.css" />` : "";
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><title>뷰티레터 No.${no2}</title>
<link rel="stylesheet" href="${rel}/styles.css" />
<style>
.cover-cut { background: var(--blush); }
.cover-cut .glow { position: absolute; right: -160px; top: 120px; width: 820px; height: 820px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 68%); }
.cover-cut .cut { position: absolute; right: 110px; top: 70px; width: 420px; transform: rotate(-6deg); z-index: 1; filter: drop-shadow(0 30px 40px rgba(120,60,50,.22)); }
.cover-cut .body { position: absolute; left: var(--pad); right: var(--pad); bottom: 170px; z-index: 2; }
.cover-cut h1 { font-size: 100px; line-height: 1.16; font-weight: 800; letter-spacing: -3.5px; margin: 30px 0 34px; }
.cover-cut p { font-size: 34px; color: var(--mauve); font-weight: 500; line-height: 1.5; }
.new-badge { position: absolute; left: var(--pad); top: 190px; z-index: 2; font-family: var(--serif); font-style: italic; font-size: 44px; font-weight: 600; color: var(--rose); border: 2px solid var(--rose); border-radius: 999px; padding: 6px 30px 10px; }
</style>${extraCss}
</head><body><div class="sheet">
${cover()}
${L.slides.map(slide).join("\n")}
${summary()}
${ps()}
</div></body></html>
`;
fs.writeFileSync(path.join(folder, "slides.html"), html);
console.log(`slides.html 작성: ${total}장`);
