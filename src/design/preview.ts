// 미리보기 화면 (파일 하나짜리 HTML). 카드는 PNG와 같은 HTML/CSS로 그린다.
// 왼쪽: 카드 목록 / 가운데: 선택 카드 4:5 미리보기 / 오른쪽: 데이터 + 검수 결과. 전체 보기(썸네일) 화면 포함.

import { cardCss, type RenderedContent } from "./renderHtml.js";
import { MEASURE_SCRIPT } from "./checks.js";
import { esc } from "./parts.js";

export function buildPreviewHtml(contents: RenderedContent[]): string {
  const data = contents.map((c) => ({
    id: c.master.content_id,
    topic: c.master.topic,
    brand: c.master.brand,
    objective: c.master.objective,
    contentType: c.master.content_type,
    theme: c.designLabel + (c.themeFallback ? ` (분야 '${c.master.category}' 전용 테마 없음 → 기본 테마)` : ""),
    cards: c.cards.map((k) => ({ ...k.page, component: k.component, checks: k.checks })),
  }));
  const sources = contents
    .map((c) => `<section class="src" data-content="${esc(c.master.content_id)}">${c.cards.map((k) => k.html).join("")}</section>`)
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>카드뉴스 미리보기</title>
<style>
${cardCss(contents.flatMap((c) => c.themes))}
:root { --ui-bg:#EEECE7; --ui-panel:#FFFFFF; --ui-text:#18181B; --ui-muted:#71717A; --ui-line:#E2DFD8; --ui-accent:#2F54EB; --ui-err:#D92D20; --ui-warn:#B54708; --ui-info:#475467; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--ui-bg); color: var(--ui-text); font-family: 'Pretendard', system-ui, sans-serif; font-size: 14px; }
.src { position: absolute; left: -20000px; top: 0; visibility: hidden; }
.app { display: grid; grid-template-rows: auto 1fr; grid-template-columns: minmax(0, 1fr); height: 100vh; }
.bar { display: flex; gap: 12px; align-items: center; padding: 12px 20px; background: var(--ui-panel); border-bottom: 1px solid var(--ui-line); flex-wrap: wrap; }
.bar h1 { font-size: 16px; margin: 0 8px 0 0; font-weight: 800; }
.bar select { max-width: 100%; min-width: 0; text-overflow: ellipsis; }
.bar select, .bar button { font: inherit; padding: 7px 12px; border: 1px solid var(--ui-line); border-radius: 8px; background: #fff; color: inherit; cursor: pointer; }
.bar button[aria-pressed="true"] { background: var(--ui-text); color: #fff; border-color: var(--ui-text); }
.bar .meta { color: var(--ui-muted); margin-left: auto; font-size: 13px; }
.detail { display: grid; grid-template-columns: 200px 1fr 340px; min-height: 0; }
.list { overflow-y: auto; padding: 12px; border-right: 1px solid var(--ui-line); display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; gap: 10px; align-items: center; padding: 6px; border-radius: 10px; cursor: pointer; border: 2px solid transparent; background: none; font: inherit; text-align: left; color: inherit; }
.item:hover { background: rgba(0,0,0,.04); }
.item.on { border-color: var(--ui-accent); background: #fff; }
.item .scaler { width: 64px; flex: 0 0 64px; }
.item b { display: block; font-size: 13px; }
.item small { color: var(--ui-muted); font-size: 11px; }
.scaler { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 4px; background: #ddd; }
.scaler > .cn-card { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: scale(var(--s, .1)); }
.stage { display: flex; align-items: center; justify-content: center; padding: 24px; min-height: 0; min-width: 0; }
.stage .scaler { width: min(100%, calc((100vh - 120px) * .8)); box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08); border-radius: 6px; }
.panel { overflow-y: auto; padding: 18px 20px; background: var(--ui-panel); border-left: 1px solid var(--ui-line); }
.panel h2 { font-size: 15px; margin: 0 0 12px; }
.panel dl { display: grid; grid-template-columns: 96px 1fr; gap: 8px 10px; margin: 0 0 18px; }
.panel dt { color: var(--ui-muted); font-size: 12px; padding-top: 2px; }
.panel dd { margin: 0; word-break: keep-all; overflow-wrap: anywhere; line-height: 1.5; }
.panel dd.empty { color: #A1A1AA; }
.panel code { font-size: 12px; background: #F4F4F5; padding: 1px 6px; border-radius: 4px; }
.checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.checks li { padding: 8px 10px; border-radius: 8px; font-size: 13px; line-height: 1.45; border-left: 3px solid; background: #FAFAF9; }
.checks .error { border-color: var(--ui-err); color: var(--ui-err); background: #FEF3F2; }
.checks .warning { border-color: var(--ui-warn); color: var(--ui-warn); background: #FFFAEB; }
.checks .info { border-color: var(--ui-info); color: var(--ui-info); }
.checks .ok { border-color: #12B76A; color: #027A48; background: #ECFDF3; }
.badge { display: inline-block; min-width: 18px; padding: 0 5px; border-radius: 9px; font-size: 11px; font-weight: 700; color: #fff; text-align: center; margin-left: 4px; }
.badge.error { background: var(--ui-err); } .badge.warning { background: var(--ui-warn); }
.overview { display: none; overflow-y: auto; padding: 24px; }
.overview .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
.overview figure { margin: 0; cursor: pointer; }
.overview figcaption { margin-top: 8px; font-size: 13px; display: flex; justify-content: space-between; gap: 6px; }
.overview figcaption span { color: var(--ui-muted); }
.app.mode-overview .detail { display: none; }
.app.mode-overview .overview { display: block; }
@media (max-width: 900px) {
  .app { height: auto; min-height: 100vh; }
  .detail { grid-template-columns: minmax(0, 1fr); }
  .bar select { width: 100%; }
  .stage { order: 1; padding: 16px; }
  .stage .scaler { width: 100%; max-width: 520px; }
  .list { order: 2; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: 0; border-top: 1px solid var(--ui-line); padding: 10px 16px; }
  .item { flex-direction: column; flex: 0 0 auto; }
  .item .scaler { width: 72px; flex-basis: auto; }
  .panel { order: 3; border-left: 0; border-top: 1px solid var(--ui-line); padding: 16px; }
  .bar { padding: 10px 16px; }
  .bar .meta { margin-left: 0; width: 100%; }
  .overview { padding: 16px; }
  .overview .grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
}
</style>
</head>
<body>
<div class="app" id="app">
  <div class="bar">
    <h1>카드뉴스 미리보기</h1>
    <select id="content" aria-label="카드뉴스 선택"></select>
    <button id="btn-detail" aria-pressed="true">카드별 보기</button>
    <button id="btn-overview" aria-pressed="false">전체 보기</button>
    <span class="meta" id="meta"></span>
  </div>
  <div class="detail">
    <nav class="list" id="list" aria-label="카드 목록"></nav>
    <div class="stage"><div class="scaler" id="stage"></div></div>
    <aside class="panel" id="panel"></aside>
  </div>
  <div class="overview"><div class="grid" id="grid"></div></div>
</div>
${sources}
<script>
var DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};
${MEASURE_SCRIPT}
var state = { content: 0, page: 0, measured: {} };
var $ = function (id) { return document.getElementById(id); };
function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function srcCard(cid, n) { return document.querySelector('.src[data-content="' + cid + '"] .cn-card[data-page="' + n + '"]'); }
function cloneInto(el, cid, n) { el.innerHTML = ""; el.appendChild(srcCard(cid, n).cloneNode(true)); fit(el); }
function fit(el) { el.style.setProperty("--s", el.clientWidth / 1080); }
var ro = new ResizeObserver(function (es) { es.forEach(function (e) { fit(e.target); }); });
function checksFor(c, card) { return card.checks.concat(state.measured[c.id + ":" + card.number] || []); }
function counts(list) { var e = 0, w = 0; list.forEach(function (x) { if (x.level === "error") e++; else if (x.level === "warning") w++; }); return { e: e, w: w }; }
function badges(list) { var k = counts(list); return (k.e ? '<span class="badge error">' + k.e + "</span>" : "") + (k.w ? '<span class="badge warning">' + k.w + "</span>" : ""); }

function measureAll() {
  DATA.forEach(function (c) {
    cnMeasure(document.querySelector('.src[data-content="' + c.id + '"]')).forEach(function (r) { state.measured[c.id + ":" + r.page] = r.issues; });
  });
}
function renderList() {
  var c = DATA[state.content];
  $("list").innerHTML = ""; $("grid").innerHTML = "";
  c.cards.forEach(function (card, i) {
    var b = document.createElement("button");
    b.className = "item" + (i === state.page ? " on" : "");
    b.innerHTML = '<div class="scaler"></div><div><b>PAGE ' + card.number + badges(checksFor(c, card)) + "</b><small>" + card.component + "</small></div>";
    b.onclick = function () { select(i); };
    $("list").appendChild(b);
    var s = b.querySelector(".scaler"); cloneInto(s, c.id, card.number); ro.observe(s);
    var f = document.createElement("figure");
    f.innerHTML = '<div class="scaler"></div><figcaption><b>PAGE ' + card.number + badges(checksFor(c, card)) + "</b><span>" + card.component + "</span></figcaption>";
    f.onclick = function () { setMode("detail"); select(i); };
    $("grid").appendChild(f);
    var g = f.querySelector(".scaler"); cloneInto(g, c.id, card.number); ro.observe(g);
  });
}
function field(label, v) { return "<dt>" + label + "</dt><dd" + (v ? "" : ' class="empty"') + ">" + (v ? escHtml(v) : "없음") + "</dd>"; }
function renderPanel() {
  var c = DATA[state.content], card = c.cards[state.page];
  var list = checksFor(c, card);
  var items = card.items.length ? "<ol style='margin:0;padding-left:18px'>" + card.items.map(function (x) { return "<li>" + escHtml(x) + "</li>"; }).join("") + "</ol>" : "";
  var img = card.imageRequired ? "필요 · " + card.imageType + (card.imageSource ? " · " + card.imageSource : " · 아직 없음 (placeholder)") : "필요 없음";
  $("panel").innerHTML =
    "<h2>PAGE " + card.number + " / " + c.cards.length + "</h2>" +
    "<dl>" +
    "<dt>layout_type</dt><dd><code>" + escHtml(card.layout) + "</code>" + (card.layout !== card.component ? " → " + card.component : "") + "</dd>" +
    "<dt>page_role</dt><dd><code>" + escHtml(card.role) + "</code></dd>" +
    field("headline", card.headline) + field("subheadline", card.subheadline) + field("body", card.body) +
    field("visual_focus", card.visualFocus) +
    "<dt>items</dt><dd" + (items ? ">" + items : ' class="empty">없음') + "</dd>" +
    field("cta", card.cta) +
    "<dt>image</dt><dd>" + escHtml(img) + "</dd>" +
    (card.imagePrompt ? field("image_prompt", card.imagePrompt) : "") +
    "<dt>fact_check</dt><dd><code>" + escHtml(card.factCheck) + "</code></dd>" +
    "</dl><h2>검수</h2><ul class='checks'>" +
    (list.length ? list.map(function (x) { return '<li class="' + x.level + '">' + escHtml(x.field) + " · " + escHtml(x.message) + "</li>"; }).join("") : '<li class="ok">문제 없음</li>') +
    "</ul>";
}
function select(i) {
  var c = DATA[state.content];
  state.page = Math.max(0, Math.min(c.cards.length - 1, i));
  Array.prototype.forEach.call($("list").children, function (el, j) { el.classList.toggle("on", j === state.page); });
  cloneInto($("stage"), c.id, c.cards[state.page].number);
  renderPanel();
  var on = $("list").children[state.page]; if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function setMode(m) {
  $("app").classList.toggle("mode-overview", m === "overview");
  $("btn-detail").setAttribute("aria-pressed", m === "detail");
  $("btn-overview").setAttribute("aria-pressed", m === "overview");
  document.querySelectorAll(".scaler").forEach(fit);
}
function loadContent(i) {
  state.content = i; state.page = 0;
  var c = DATA[i], all = [];
  c.cards.forEach(function (k) { all = all.concat(checksFor(c, k)); });
  var k = counts(all);
  $("meta").textContent = c.brand + " · " + c.contentType + " · " + c.cards.length + "장 · 테마 " + c.theme + " · 오류 " + k.e + " / 경고 " + k.w;
  renderList(); select(0);
}
DATA.forEach(function (c, i) { var o = document.createElement("option"); o.value = i; o.textContent = c.id + " · " + c.topic; $("content").appendChild(o); });
$("content").onchange = function (e) { loadContent(Number(e.target.value)); };
$("btn-detail").onclick = function () { setMode("detail"); };
$("btn-overview").onclick = function () { setMode("overview"); };
document.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowDown") select(state.page + 1); if (e.key === "ArrowLeft" || e.key === "ArrowUp") select(state.page - 1); });
ro.observe($("stage"));
var start = function () {
  measureAll();
  var h = location.hash.slice(1).split("/");
  var ci = Math.max(0, DATA.findIndex(function (c) { return c.id === h[0]; }));
  $("content").value = ci; loadContent(ci);
  if (h[1]) select(Number(h[1]) - 1);
  if (h[2] === "overview") setMode("overview");
  document.body.setAttribute("data-ready", "1");
};
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
</script>
</body>
</html>`;
}
