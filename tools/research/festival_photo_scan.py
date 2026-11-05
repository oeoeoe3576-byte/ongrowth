import subprocess,re,sys
rows=[l.rstrip('\n').split('|') for l in open(sys.argv[1],encoding='utf-8')]
out=open(sys.argv[2],'w',encoding='utf-8')
for s,e,n,loc,cid in rows:
    k=re.sub(r'^2026 ','',n); k=re.sub(r'^제\d+회 ','',k); k=re.sub(r'[「」《》〈〉‘’“”:：]','',k)[:14]
    r=subprocess.run(['npm','run','editorial','--','photos',k,'--id',cid,'--brand','travel'],capture_output=True,text=True,cwd='.')
    t=r.stdout+r.stderr
    lines=[x for x in t.splitlines() if re.match(r'^\d+\.',x) or '✓' in x or '없음' in x]
    ok=any('✓' in x for x in lines)
    first=[x for x in lines if re.match(r'^\d+\.',x)][:2]
    out.write(f"{s}~{e}|{n}|{cid}|{'OK' if ok else 'X'}|{' // '.join(x[:60] for x in first)}\n"); out.flush()
