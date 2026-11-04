// 최근 릴스 인사이트(조회·도달·저장·공유·평균 시청 ms·3초 이탈 %) 확인. 토큰 값은 출력하지 않는다.
// 실행: node design/beauty_news/insights.mjs  (환경 변수 META_FB_ACCESS_TOKEN_BEAUTY, INSTAGRAM_BUSINESS_ID_BEAUTY)
const T=process.env.META_FB_ACCESS_TOKEN_BEAUTY, IG=process.env.INSTAGRAM_BUSINESS_ID_BEAUTY, H="https://graph.facebook.com/v23.0";
const g=async(p,q={})=>{const u=new URL(`${H}/${p}`);for(const[k,v]of Object.entries({...q,access_token:T}))u.searchParams.set(k,v);return (await fetch(u)).json();};
const media=(await g(`${IG}/media`,{fields:"id,caption,timestamp,like_count,comments_count",limit:process.argv[2]||"6"})).data||[];
for(const m of media){const i=await g(`${m.id}/insights`,{metric:"views,reach,saved,shares,ig_reels_avg_watch_time,reels_skip_rate"});const o={};(i.data||[]).forEach(d=>o[d.name]=d.values?.[0]?.value);if(i.error)o.err=i.error.message.slice(0,80);
console.log(m.timestamp,(m.caption||"").split("\n")[0].slice(0,22),JSON.stringify(o),"좋아요",m.like_count,"댓글",m.comments_count);}
