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
    const SEL = ".wb, .rb, .hl, .say, .ttl2, .big, .follow, .note, .prods figure, .rs .ttl";
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
