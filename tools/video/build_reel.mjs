// 릴스 제작: node tools/video/build_reel.mjs data/reels/<이름>/spec.json
// 결과: data/reels/<이름>/video.mp4, cover.jpg (spec의 photos는 data/images/travel/ 기준 경로)
import fs from "node:fs"; import path from "node:path"; import {execFileSync} from "node:child_process"; import {chromium} from "playwright";
const specPath=process.argv[2]; const spec=JSON.parse(fs.readFileSync(specPath,"utf8")); const dir=path.dirname(path.resolve(specPath));
const ROOT=process.cwd(); const P=n=>`file://${ROOT}/data/images/travel/${n}`;
const FONT=`file://${ROOT}/node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`; const AQ="#38D0F0";
const H=spec.hookDur||3.0, SD=3.6, OD=3.0, n=spec.stops.length, OUT0=H+n*SD, END=OUT0+OD;
const css=`@font-face{font-family:P;src:url(${FONT});font-weight:45 920}*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden;background:#000;font-family:P,sans-serif;color:#fff}
.sc{position:absolute;inset:0;opacity:0}.bg{position:absolute;inset:-50px;background-size:cover;background-position:center;filter:brightness(1.1) saturate(1.15)}
.shade2{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.1) 40%,rgba(0,0,0,.35) 70%,rgba(0,0,0,.6))}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.05) 40%,rgba(0,0,0,.5))}
.c{position:absolute;left:0;right:0;text-align:center;opacity:0;text-shadow:0 3px 16px rgba(0,0,0,.85)}.aq{color:${AQ}}
.pill{display:inline-block;background:${AQ};color:#06222b;font-weight:900;border-radius:999px;text-shadow:none}
.num{display:inline-block;width:100px;height:100px;border-radius:50%;background:${AQ};color:#06222b;font-size:66px;font-weight:900;line-height:100px;text-shadow:none;box-shadow:0 4px 16px rgba(0,0,0,.5)}
.nm{font-size:100px;font-weight:900;letter-spacing:-2px;line-height:1.15}.dt{font-size:54px;font-weight:800;line-height:1.4}.pd{display:inline-block;background:${AQ};color:#06222b;padding:4px 30px;border-radius:44px;text-shadow:none;margin-bottom:10px}.l2{font-size:44px;font-weight:700}
.src{position:absolute;right:130px;top:1574px;font-size:26px;font-weight:300;opacity:.8;text-shadow:0 1px 6px rgba(0,0,0,.8)}`;
let body="",js="";
const hp=spec.hook.photos; body+=`<div class=sc id=s0 style="opacity:1">${hp.map((p,k)=>`<div class=bg id=h${k} style="background-image:url(${P(p)});filter:brightness(1.15) saturate(1.2);opacity:${k?0:1}"></div>`).join("")}<div class=shade></div>
<div class=c id=hk1 style="top:300px;font-size:140px;font-weight:900;letter-spacing:-4px;opacity:1">${spec.hook.l1}</div>
<div class=c id=hk2 style="top:490px;font-size:${spec.hook.l2size||104}px;font-weight:900;letter-spacing:-3px;opacity:1;color:${AQ}">${spec.hook.l2}</div></div>`;
spec.stops.forEach((s,i)=>{const t0=H+i*SD;
 body+=`<div class=sc id=s${i+1}>${s.ph.map((p,k)=>`<div class="bg ph" id=p${i+1}_${k} style="background-image:url(${P(p)})"></div>`).join("")}<div class=shade2></div>
<div class=c id=a${i+1} style="top:${s.big?640:960}px"><span class=num>${i+1}</span></div>
${s.big?`<div class="c" id=b${i+1} style="top:770px;font-size:72px;font-weight:800;letter-spacing:-1px">${s.n}</div>
<div class="c" id=e${i+1} style="top:860px;font-size:${s.bigSize||160}px;font-weight:900;letter-spacing:-4px;line-height:1.05;color:#fff">${s.big}</div>
<div class="c dt" id=d${i+1} style="top:${s.dtop||1190}px;font-size:58px;text-shadow:0 3px 18px rgba(0,0,0,.95),0 0 6px rgba(0,0,0,.9)"><span class=aq>${s.l2||""}</span></div>`:`<div class="c nm" id=b${i+1} style="top:1075px;font-size:${s.fs||100}px">${s.n}</div>
<div class="c dt" id=d${i+1} style="top:${s.dtop||1200}px"><span class=pd>${s.when}</span>${s.l2?`<br><span class=l2>${s.l2}</span>`:""}</div>`}<div class=src>${s.src}</div></div>`;
 js+=`scene('s${i+1}',t,${t0-.15},${t0+SD},.3);show(g('a${i+1}'),t,${t0+.1},.3,30);show(g('b${i+1}'),t,${t0+.3},.3,30);show(g('d${i+1}'),t,${t0+.6},.3,20);${s.big?`show(g('e${i+1}'),t,${t0+.35},.3,30);`:''}\n`;
 s.ph.forEach((p,k)=>{const m=s.ph.length,a=t0+k*SD/m,b=t0+(k+1)*SD/m;js+=`ph('p${i+1}_${k}',t,${a},${b},${k===0},${k===m-1});\n`;});});
const o=spec.outro; body+=`<div class=sc id=s9><div class=bg style="background-image:url(${P(o.bg)})"></div><div class=shade></div>
<div class=c id=o1 style="top:640px"><span class=pill style="font-size:96px;padding:20px 64px">${o.pill}</span></div>
<div class=c id=o2 style="top:870px;font-size:68px;font-weight:900;line-height:1.35">${o.l2}</div>
<div class=c id=o3 style="top:1500px;font-size:30px;font-weight:600;opacity:.85">${o.note}</div><div class=src>${o.src}</div></div>`;
const html=`<!doctype html><meta charset=utf-8><style>${css}</style><body>${body}<script>
const E=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);const g=i=>document.getElementById(i);
function show(el,t,t0,dur=.5,dy=40){const p=E((t-t0)/dur);el.style.opacity=p;el.style.transform=dy?'translateY('+(1-p)*dy+'px)':'';}
function scene(id,t,a,b,f=.3){g(id).style.opacity=Math.min(E((t-a)/f),E((b-t)/f));}
function ph(id,t,a,b,first,last,f=.3){const el=g(id);let o=1;if(!first)o=Math.min(o,E((t-a)/f));if(!last&&t>b-f)o=Math.min(o,E((b-t)/f));if(t<a&&!first)o=0;if(t>b&&!last)o=0;el.style.opacity=o;const pr=Math.min(1,Math.max(0,(t-a)/(b-a)));const dx=((id.charCodeAt(id.length-1)%2)?-1:1)*34*(pr-.5);el.style.transform='translateX('+dx+'px) scale('+(1.04+0.16*pr)+')';}
window.END=${END};
function setT(t){g('s0').style.opacity=E((${H}+.25-t)/.25);
 ['h0','h1','h2'].forEach((id,k)=>{const el=g(id);if(!el)return;const a=k*${H/3},b=(k+1)*${H/3}+.1;let o=0;if(k===0)o=t<b?1:0;else o=(t>=a-.1&&t<(k===2?9:b+1))?Math.min(1,(t-(a-.1))/.2):0;el.style.opacity=o;el.style.transform='translateX('+((k%2?-1:1)*30*(t/${H}-.5))+'px) scale('+(1.04+.16*Math.min(1,t/${H}))+')';});
${js}scene('s9',t,${OUT0-.3},${END},.3);show(g('o1'),t,${OUT0},.35,30);show(g('o2'),t,${OUT0+.5},.3,30);show(g('o3'),t,${OUT0+1.1},.3,20);}
setT(0);</script></body>`;
const th=spec.thumb; const thumb=`<html><head><meta charset=utf-8><style>${css}
.tb{position:absolute;inset:0;background:url(${P(th.photo)}) center/cover;filter:brightness(.9)}.tp{position:absolute;left:130px;top:930px;background:${AQ};color:#06222b;font-size:40px;font-weight:800;padding:12px 30px;border-radius:999px}
.tt{position:absolute;left:130px;right:80px;top:1050px;font-size:116px;font-weight:900;line-height:1.12;letter-spacing:-4px}.tt span{color:${AQ}}</style></head><body><div class=tb></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.55) 75%,rgba(0,0,0,.8))"></div><div class=tp>${th.pill||"주말 어디감?"}</div><div class=tt>${th.l1}<br><span>${th.l2}</span></div></body></html>`;
const tmp=fs.mkdtempSync("/tmp/reel-"); fs.writeFileSync(path.join(tmp,"anim.html"),html); fs.writeFileSync(path.join(tmp,"thumb.html"),thumb);
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"}); const pg=await b.newPage({viewport:{width:1080,height:1920}});
await pg.goto("file://"+path.join(tmp,"thumb.html")); await pg.waitForTimeout(900); await pg.screenshot({path:path.join(dir,"cover.jpg"),type:"jpeg",quality:94});
await pg.goto("file://"+path.join(tmp,"anim.html")); await pg.waitForTimeout(1200);
const fps=24,N=Math.round(END*fps); fs.mkdirSync(path.join(tmp,"fr"));
for(let i=0;i<N;i++){await pg.evaluate(`setT(${i/fps})`);await pg.screenshot({path:path.join(tmp,"fr",`f${String(i).padStart(4,"0")}.jpg`),type:"jpeg",quality:92});}
await b.close();
const wav=path.join(tmp,"bgm.wav"); execFileSync("python3",[path.join(ROOT,"tools/video/bgm.py"),wav,String(END),String(spec.music.bpm),String(spec.music.seed)]);
const voices=[]; if(spec.voice){ if(spec.voice.hook)voices.push([spec.voice.hook,0.15]); (spec.voice.stops||[]).forEach((f,i)=>f&&voices.push([f,H+i*SD+0.2])); if(spec.voice.outro)voices.push([spec.voice.outro,OUT0+0.2]); }
const args=["-y","-loglevel","error","-framerate",String(fps),"-i",path.join(tmp,"fr","f%04d.jpg"),"-i",wav];
voices.forEach(([f])=>args.push("-i",path.join(dir,f)));
let fc; if(voices.length){ const parts=[`[1:a]volume=0.30[m]`]; voices.forEach(([f,t],i)=>parts.push(`[${i+2}:a]adelay=${Math.round(t*1000)}|${Math.round(t*1000)},volume=1.0[v${i}]`)); parts.push(`[m]${voices.map((_,i)=>`[v${i}]`).join("")}amix=inputs=${voices.length+1}:normalize=0:duration=longest[mx]`,`[mx]loudnorm=I=-20:TP=-2:LRA=7,alimiter=limit=0.9,aresample=44100[a]`); fc=parts.join(";"); args.push("-filter_complex",fc,"-map","0:v","-map","[a]"); }
else args.push("-af","loudnorm=I=-22:TP=-3:LRA=7,alimiter=limit=0.7,volume=-1.5dB,aresample=44100");
args.push("-ac","2","-ar","44100","-t",String(END),"-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-profile:a","aac_low","-b:a","128k","-movflags","+faststart",path.join(dir,"video.mp4"));
execFileSync("ffmpeg",args);
console.log("done",END+"s",path.join(dir,"video.mp4")); fs.cpSync(path.join(tmp,"fr","f0030.jpg"),path.join(tmp,"keep.jpg"));
for(const t of [0,2,20,45,70,95]){const f=path.join(tmp,"fr",`f${String(Math.min(N-1,t)).padStart(4,"0")}.jpg`);}
console.log("frames in",tmp);
