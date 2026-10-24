// 릴스 시안용 정지 이미지: html의 .card를 한 장씩 output/stills/NN.jpg로 저장
// 실행: node design/beauty_news/stills.mjs <reel.html>
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const html = path.resolve(process.argv[2]);
const out = path.join(path.dirname(html), "output", "stills");
await mkdir(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
try {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(pathToFileURL(html).href, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  // 글자 겹침·화면 밖 검사: 겹치면 경고를 찍는다(시안 확인 전에 꼭 본다)
  const warn = await p.evaluate(() => {
    const SEL = ".wb, .rb, .hl, .say, .ttl2, .big, .follow, .note, .prods figure, .rs .ttl, .steps .st, .figbox, .prdpop, .ptag, .tprod, .pmain, .side";
    const out = [];
    for (const card of document.querySelectorAll(".card")) {
      card.style.display = "block";
      const els = [...card.querySelectorAll(SEL)];
      const r = els.map((e) => e.getBoundingClientRect());
      const cr = card.getBoundingClientRect();
      const name = card.dataset.name;
      const label = (e) => (e.className + " " + e.textContent.trim().slice(0, 12)).trim();
      els.forEach((e, i) => {
        if (r[i].right > cr.right + 1 || r[i].bottom > cr.bottom + 1) out.push(`${name}: 화면 밖 → ${label(e)}`);
        for (let j = i + 1; j < els.length; j++) {
          if (e.contains(els[j]) || els[j].contains(e)) continue;
          const a = r[i], b = r[j];
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 2 && h > 2) out.push(`${name}: 겹침 → [${label(e)}] / [${label(els[j])}]`);
        }
      });
      // 정렬 검사: 컬러칩·제품 모음처럼 가운데 정렬된 장에선 박스 글·띠도 가운데여야 한다
      if (!card.classList.contains("pf") && card.querySelector(".chips, .prods, .say")) {
        for (const e of card.querySelectorAll(".wb:not(.free), .rb:not(.free), .hl:not(.free)")) {
          const st = getComputedStyle(e), rr = e.getBoundingClientRect();
          if (!e.matches(".hl") && st.textAlign !== "center" && !e.querySelector("ol")) out.push(`${name}: 정렬 → 박스 글이 가운데가 아님 [${label(e)}]`);
          if (Math.abs((rr.left + rr.right) / 2 - (cr.left + cr.right) / 2) > 6) out.push(`${name}: 정렬 → 박스가 가운데가 아님 [${label(e)}]`);
        }
      }
      // 가장자리 검사: 박스·제품·태그가 양끝에 붙으면 인스타에서 잘리거나 버튼에 가린다 (왼쪽 90px, 오른쪽 150px, 위 200px)
      for (const e of card.querySelectorAll(".wb, .rb, .prdpop, .ptag, .tprod, .pmain, .side")) {
        const rr = e.getBoundingClientRect(), sx = cr.width / 1080;
        if (rr.left - cr.left < 90 * sx || cr.right - rr.right < 150 * sx || rr.top - cr.top < 200 * sx) out.push(`${name}: 가장자리 → 양끝·위에 너무 붙음 [${label(e)}]`);
      }
      // 인스타 UI 검사: 사진 장 박스는 가운데, 화면 높이 75% 위에 (아래 왼쪽은 프로필·리포스트·캡션, 오른쪽은 버튼에 가림)
      if (card.classList.contains("pf")) {
        for (const e of card.querySelectorAll(".wb, .rb")) {
          const rr = e.getBoundingClientRect();
          if (rr.bottom - cr.top > cr.height * 0.75) out.push(`${name}: 인스타 UI → 박스가 너무 아래 [${label(e)}]`);
          if (rr.bottom - cr.top > cr.height * 0.6 && Math.abs((rr.left + rr.right) / 2 - (cr.left + cr.right) / 2) > 6) out.push(`${name}: 인스타 UI → 아래쪽 박스는 가운데로(왼쪽 아래는 프로필에 가림) [${label(e)}]`);
        }
      }
      card.style.display = "";
    }
    return out;
  });
  for (const w of warn) console.log("⚠ " + w);
  for (const c of await p.$$(".card")) {
    const n = (await c.getAttribute("data-name")).slice(0, 2);
    await c.screenshot({ path: path.join(out, `${n}.jpg`), type: "jpeg", quality: 90 });
  }
} finally { await b.close(); }
console.log(out);
