// FOLLOW: 마지막 장. 계정 프로필 카드 + 팔로우 버튼. 게시물/팔로워 숫자는 브랜드 설정에 있을 때만 표시 (지어내지 않음)
import { frame, text, esc, rich } from "../parts.js";
import type { LayoutComponent } from "../types.js";

export const FollowTemplate: LayoutComponent = {
  name: "FOLLOW",
  label: "프로필 카드",
  limits: { headline: 22, subheadline: 30, body: 50, itemChars: 0, itemsMin: 0, itemsMax: 0 },
  tone: (p) => (p.imageSource ? "photo" : "dark"),
  css: `
.cn-l-FOLLOW .cn-main { justify-content: center; align-items: center; text-align: center; gap: 40px; }
.cn-l-FOLLOW .cn-display { font-size: calc(var(--fs-display) * .8); }
.cn-l-FOLLOW .cn-profile { --c-accent: var(--c-accent-base); width: 100%; background: var(--c-card-bg); color: var(--c-card-text); border-radius: var(--r-box); padding: 44px 48px; text-align: left; display: flex; flex-direction: column; gap: 26px; }
.cn-l-FOLLOW .cn-profile-row { display: flex; align-items: center; gap: 28px; }
.cn-l-FOLLOW .cn-avatar { width: 128px; height: 128px; flex: 0 0 128px; border-radius: 50%; overflow: hidden; background: var(--c-accent); color: var(--c-on-accent); display: flex; align-items: center; justify-content: center; font-size: 56px; font-weight: var(--w-heavy); box-shadow: 0 0 0 5px var(--c-card-bg), 0 0 0 9px var(--c-accent); }
.cn-l-FOLLOW .cn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.cn-l-FOLLOW .cn-profile-name { flex: 1; min-width: 0; }
.cn-l-FOLLOW .cn-handle { font-size: 40px; font-weight: var(--w-heavy); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cn-l-FOLLOW .cn-dname { font-size: 28px; opacity: .6; margin-top: 4px; }
.cn-l-FOLLOW .cn-stats { display: flex; gap: 40px; margin-top: 12px; font-size: 24px; opacity: .75; }
.cn-l-FOLLOW .cn-stats b { font-size: 30px; opacity: 1; margin-right: 6px; }
.cn-l-FOLLOW .cn-bio { font-size: 27px; line-height: 1.55; }
.cn-l-FOLLOW .cn-follow-btn { background: var(--c-accent); color: var(--c-on-accent); border-radius: 16px; padding: 22px; text-align: center; font-size: 32px; font-weight: var(--w-heavy); }
.cn-l-FOLLOW .cn-body { color: var(--c-muted); max-width: 820px; font-style: italic; font-size: calc(var(--fs-body) * .85); transform: rotate(-2deg); letter-spacing: .01em; }
.cn-l-FOLLOW .cn-cta-line { font-size: calc(var(--fs-sub) * 1.05); font-weight: var(--w-heavy); color: var(--c-accent); }`,
  render(p, ctx) {
    const b = ctx.brand;
    const avatar = b.logo ? `<img src="${esc(b.logo)}" alt="">` : esc((b.displayName || b.handle).trim().charAt(0).toUpperCase());
    const s = b.stats;
    const stats = s && (s.posts || s.followers || s.following)
      ? `<div class="cn-stats">${s.posts ? `<span><b>${esc(s.posts)}</b>게시물</span>` : ""}${s.followers ? `<span><b>${esc(s.followers)}</b>팔로워</span>` : ""}${s.following ? `<span><b>${esc(s.following)}</b>팔로잉</span>` : ""}</div>`
      : "";
    const bio = b.bio?.length ? `<div class="cn-bio">${b.bio.slice(0, 3).map((l) => rich(l)).join("<br>")}</div>` : "";
    const bg = p.imageSource ? `<img src="${esc(p.imageSource)}" alt=""><div class="cn-bg-shade" style="background:rgba(0,0,0,.55)"></div>` : "";
    return frame(p, ctx, this.tone!(p, ctx), `
      ${text("cn-display", "headline", p.headline, 2, p.visualFocus)}
      <div class="cn-profile" data-fit data-field="card">
        <div class="cn-profile-row"><div class="cn-avatar">${avatar}</div><div class="cn-profile-name"><div class="cn-handle">@${esc(b.handle)}</div>${b.displayName ? `<div class="cn-dname">${esc(b.displayName)}</div>` : ""}${stats}</div></div>
        ${bio}
        <div class="cn-follow-btn cn-on-accent">팔로우</div>
      </div>
      ${text("cn-body", "body", p.body, 2, p.visualFocus)}
      ${p.cta ? `<div class="cn-cta-line cn-fit" style="--lines:1" data-fit data-field="cta">${rich(p.cta)} →</div>` : ""}`, bg);
  },
};
