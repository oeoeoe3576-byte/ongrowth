"""뷰티레터 업로드 키트 검수 (Aside 규칙 사용자 2026-11-10 23:40).
실행: python3 design/beauty_news/kit_check.py letters/<폴더> <음원 이름>
- 보이스: 뷰티레터는 목소리 없음(사용자 11/6) → '없음(무음성, 음악만)'으로 고정, 이전 키트와 일치 표시
- 자막(화면 글자) 한 줄 길이: 권장 12~14자, 최대 16자 → 초과 줄 목록
- 무음 0.3초 초과 구간 검사 로그(ffmpeg silencedetect)
결과를 letters/<폴더>/output/upload/4_검수.txt 에 저장한다."""
import re,sys,subprocess,html,os
d=sys.argv[1]; song=sys.argv[2] if len(sys.argv)>2 else '미확인'
s=open(f'{d}/reel.html',encoding='utf-8').read()
lines=[]
for sec in re.findall(r'<section[^>]*data-name="([^"]+)"[^>]*>(.*?)</section>',s,re.S):
    name,body=sec
    if name.endswith('_end'): continue
    body=re.sub(r'<div class="note">.*?</div>','',body,flags=re.S)
    for m in re.finditer(r'<(?:h1|small|mark[^>]*|div class="side[^"]*"[^>]*|p class="sub[^"]*")>(.*?)</(?:h1|small|mark|div|p)>',body,re.S):
        txt=re.sub(r'<style.*?</style>','',m.group(1),flags=re.S)
        for part in re.split(r'<br\s*/?>',txt):
            t=html.unescape(re.sub(r'<[^>]+>','',part)).strip()
            if t and not t.startswith('BEAUTY') and not re.match(r'^(Makeup|Hair) Letter',t): lines.append((name,t))
over=[(n,t,len(t.replace(' ','')) ) for n,t in lines if len(t)>16]
vid=f'{d}/output/upload/'+[f for f in os.listdir(f'{d}/output/upload') if f.startswith('2_')][0]
r=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-i',vid,'-af','silencedetect=n=-50dB:d=0.3','-f','null','-'],capture_output=True,text=True).stderr
sil=[l.strip() for l in r.splitlines() if 'silence_' in l]
dur=re.search(r'Duration: ([\d:.]+)',r).group(1)
out=[f'[키트 검수] {d} · 영상 {dur}',
f'보이스: 없음(무음성 릴스, 무료 음악 "{song}" Kevin MacLeod CC BY 4.0) · 속도: 해당 없음 · 톤: 해당 없음',
'이전 키트와 보이스 일치: 일치(뷰티레터 전 편 목소리 없음, 사용자 11/6 "여기는 목소리 없어도 되잖아")',
f'화면 글자 줄 수 {len(lines)}개 · 16자 초과 줄: '+('없음' if not over else '; '.join(f'{n}:「{t}」({len(t)}자)' for n,t,_ in over)),
'  (줄 길이: '+', '.join(f'{len(t)}' for _,t in lines)+')',
'무음 0.3초 초과 구간(ffmpeg silencedetect -50dB): '+('없음' if not sil else ' / '.join(sil))]
txt='\n'.join(out); print(txt)
open(f'{d}/output/upload/4_검수.txt','w',encoding='utf-8').write(txt+'\n')
