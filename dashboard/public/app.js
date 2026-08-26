// Phase 8 대시보드 - 순수 JS (빌드 도구 없음), src/server/index.ts의 REST API를 호출한다.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function switchTab(tab) {
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${tab}`));
  if (tab === "scheduled") loadQueue("scheduled");
  if (tab === "success") loadQueue("published");
  if (tab === "failed") loadQueue("failed");
  if (tab === "templates") loadTemplates();
  if (tab === "settings") loadSettings();
}

$$(".nav-item").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "요청 실패");
  return json;
}

// --- 카드뉴스 만들기 ---
$("#create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const publishDate = fd.get("publishDate");
  const publishTime = fd.get("publishTime") || "19:00";
  const body = {
    topic: fd.get("topic"),
    region: fd.get("region") || undefined,
    season: fd.get("season") || undefined,
    template: fd.get("template") || undefined,
    cta: fd.get("cta") || undefined,
    slideCount: fd.get("slideCount") ? Number(fd.get("slideCount")) : undefined,
    account: fd.get("account") || undefined,
    autoPublish: fd.get("autoPublish") === "on",
    publishAt: publishDate ? `${publishDate}T${publishTime}:00+09:00` : undefined,
  };

  const resultBox = $("#create-result");
  resultBox.classList.remove("hidden");
  resultBox.textContent = "생성 중입니다... (이미지 렌더링에 몇 초 걸릴 수 있어요)";

  try {
    const json = await api("/api/cardnews/create", { method: "POST", body: JSON.stringify(body) });
    resultBox.textContent =
      `✅ 생성 완료: ${json.folder}\n` +
      `슬라이드 ${json.slideCount}장 / 장소: ${json.places.join(", ")}\n\n` +
      `--- caption.txt ---\n${json.caption}` +
      (json.post ? `\n\n📅 예약됨: ${json.post.id} → ${json.post.publish_at}` : `\n\nℹ️ 예약하려면 업로드 날짜/시간을 입력하세요.`);
  } catch (err) {
    resultBox.textContent = `❌ 오류: ${err.message}`;
  }
});

// --- 예약/완료/실패 목록 ---
function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
}

async function loadQueue(status) {
  const json = await api(`/api/queue?status=${status}`);
  const posts = json.posts;

  if (status === "scheduled") {
    $("#scheduled-body").innerHTML = posts
      .map(
        (p) => `<tr>
          <td>${p.title}</td>
          <td>${p.publish_at}</td>
          <td>${statusBadge(p.status)}${p.approved ? "" : " <small>(승인대기)</small>"}</td>
          <td>${p.retry_count}</td>
          <td>
            ${!p.approved ? `<button data-act="approve" data-id="${p.id}">승인</button>` : ""}
            <button data-act="publish-now" data-id="${p.id}">즉시발행</button>
            <button data-act="cancel" data-id="${p.id}">취소</button>
          </td>
        </tr>`
      )
      .join("");
  } else if (status === "published") {
    $("#success-body").innerHTML = posts
      .map((p) => `<tr><td>${p.title}</td><td>${p.published_at ?? ""}</td><td>${p.account}</td></tr>`)
      .join("");
  } else if (status === "failed") {
    $("#failed-body").innerHTML = posts
      .map(
        (p) => `<tr>
          <td>${p.title}</td>
          <td>${p.retry_count}</td>
          <td>${p.last_error ?? ""}</td>
          <td><button data-act="publish-now" data-id="${p.id}">재시도</button></td>
        </tr>`
      )
      .join("");
  }

  document.querySelectorAll("button[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { act, id } = btn.dataset;
      try {
        if (act === "approve") await api(`/api/queue/${id}/approve`, { method: "POST" });
        if (act === "cancel") await api(`/api/queue/${id}/cancel`, { method: "POST" });
        if (act === "publish-now") await api(`/api/queue/${id}/publish-now`, { method: "POST" });
        switchTab(status === "published" ? "success" : status);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// --- 템플릿 ---
async function loadTemplates() {
  const json = await api("/api/templates");
  $("#template-list").innerHTML = json.templates.map((t) => `<div>🖼 ${t}</div>`).join("");
}

async function populateTemplateSelect() {
  try {
    const json = await api("/api/templates");
    const select = $("#template-select");
    json.templates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  } catch {
    /* 서버가 아직 안 떠 있으면 무시 */
  }
}

// --- 설정 ---
async function loadSettings() {
  const json = await api("/api/settings");
  $("#settings-json").textContent = JSON.stringify(json.config, null, 2);
}

populateTemplateSelect();
