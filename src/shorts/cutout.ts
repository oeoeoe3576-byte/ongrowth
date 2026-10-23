// 일러스트 누끼: 그림 가장자리에서부터 배경색과 이어진 영역만 투명하게 만든다 (색만 보고 지우면 피부색까지 지워진다).
//   npm run shorts-cutout -- <입력.png> [<입력2.png> ...]   → <입력>-cut.png (같은 폴더)
// 배경이 단색인 플랫 일러스트 전용. 윤곽선이 닫혀 있지 않으면 안쪽까지 지워질 수 있으니 결과를 눈으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "../design/renderPng.js";


// 브라우저 안에서 도는 코드 (번들러 변환을 피하려고 문자열로 둔다)
const BROWSER_FN = `async (b64, tol) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h);
  const px = d.data;
  const at = (x, y) => (y * w + x) * 4;
  const corners = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)];
  const bg = [0, 1, 2].map((k) => corners.reduce((n, i) => n + px[i + k], 0) / 4);
  const near = (i) => Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) <= tol;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const p = y * w + x; if (!seen[p] && near(p * 4)) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop(); const x = p % w, y = (p - x) / w;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  // 윤곽선 둘레의 밝은 번짐(헤일로) 제거
  const lum = (i) => px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  for (let pass = 0; pass < 2; pass++) {
    const kill = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      if ((seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) && lum(p * 4) > 205) kill.push(p);
    }
    for (const p of kill) seen[p] = 1;
  }
  for (let p = 0; p < w * h; p++) if (seen[p]) px[p * 4 + 3] = 0;
  // 내용이 있는 영역(불투명 픽셀이 줄·열마다 3개 이상)으로 잘라 투명한 여백을 없앤다
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  const rowCnt = new Uint32Array(h), colCnt = new Uint32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!seen[y * w + x]) { rowCnt[y]++; colCnt[x]++; }
  for (let y = 0; y < h; y++) if (rowCnt[y] >= 3) { if (y < y0) y0 = y; y1 = y; }
  for (let x = 0; x < w; x++) if (colCnt[x] >= 3) { if (x < x0) x0 = x; x1 = x; }
  ctx.putImageData(d, 0, 0);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
  return out.toDataURL("image/png");
}`;

export async function cutout(files: string[], opts: { tolerance?: number } = {}): Promise<string[]> {
  const tol = opts.tolerance ?? 36;
  const browser = await launchBrowser();
  const outs: string[] = [];
  try {
    const page = await browser.newPage();
    for (const f of files) {
      const b64 = fs.readFileSync(f).toString("base64");
      const dataUrl = (await page.evaluate(`(${BROWSER_FN})(${JSON.stringify(b64)}, ${tol})`)) as string;
      const out = f.replace(/\.png$/i, "-cut.png");
      fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
      outs.push(out);
    }
  } finally {
    await browser.close();
  }
  return outs;
}

if (process.argv[1]?.endsWith("cutout.ts") && process.argv[2]) {
  cutout(process.argv.slice(2).map((f) => path.resolve(f)))
    .then((o) => console.log(o.map((f) => `✓ ${f}`).join("\n")))
    .catch((e) => { console.error((e as Error).message); process.exitCode = 1; });
}
