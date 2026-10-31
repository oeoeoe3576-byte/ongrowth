"""직접 합성하는 배경음악(저작권 문제 없음). 사용: python3 bgm.py out.wav 길이(초) bpm seed [nodrums]"""
import numpy as np, wave, sys
SR=44100
def midi(n): return 440*2**((n-69)/12)
def make(path,dur,bpm,seed,drums=True):
    rng=np.random.default_rng(seed)
    def pluck(freq,d,decay=0.996,bright=0.5):
        n=int(SR*d);N=max(2,int(SR/freq));buf=rng.uniform(-1,1,N)*bright+np.sin(np.linspace(0,2*np.pi,N))*(1-bright)
        out=np.zeros(n);idx=0
        for i in range(n):
            out[i]=buf[idx];buf[idx]=decay*0.5*(buf[idx]+buf[(idx+1)%N]);idx=(idx+1)%N
        return out
    def pad(freqs,d,vol=.12):
        t=np.arange(int(SR*d))/SR;y=np.zeros_like(t)
        for f in freqs:
            for dd in (-.4,0,.4): y+=np.sin(2*np.pi*(f+dd)*t)+0.3*np.sin(2*np.pi*2*(f+dd)*t)
        env=np.minimum(1,t/0.8)*np.minimum(1,(d-t)/0.8)
        return y*env*vol/len(freqs)/3
    def place(mix,sig,t0):
        i=int(t0*SR);j=min(len(mix),i+len(sig))
        if i<len(mix): mix[i:j]+=sig[:j-i]
    def kick():
        t=np.arange(int(SR*.25))/SR;return np.sin(2*np.pi*(55+90*np.exp(-t*30))*t)*np.exp(-t*14)*.8
    def hat():
        n=int(SR*.05);return rng.uniform(-1,1,n)*np.exp(-np.arange(n)/SR*90)*.12
    def reverb(x,wet=.28,rt=1.5):
        n=int(SR*rt);ir=rng.normal(0,1,n)*np.exp(-np.arange(n)/SR*4.5);ir[0]=0
        L=len(x)+len(ir);y=np.fft.irfft(np.fft.rfft(x,L)*np.fft.rfft(ir,L),L)[:len(x)];y/=np.max(np.abs(y))+1e-9
        return x*(1-wet)+y*np.max(np.abs(x))*wet
    chords=[[60,64,67,71],[55,59,62,67],[57,60,64,67],[53,57,60,64],[60,64,67,72],[55,59,62,66]]
    mel=[79,83,84,83,79,76,72,76,79,83,86,84,83,79,76,72]
    beat=60/bpm;bar=4*beat;mix=np.zeros(int(SR*(dur+2)))
    for b in range(int(dur/bar)+1):
        ch=chords[b%len(chords)];place(mix,pad([midi(n-12) for n in ch],bar+.4),b*bar)
        for k,n in enumerate(ch): place(mix,pluck(midi(n),1.4,.997)*.30,b*bar+k*beat)
        for k,i in enumerate(mel[(b*4)%len(mel):(b*4)%len(mel)+4]): place(mix,pluck(midi(i+12),1.2,.996,.4)*.22,b*bar+k*beat+beat/2)
        if drums:
            for k in range(4):
                if k%2==0: place(mix,kick()*.6,b*bar+k*beat)
                place(mix,hat(),b*bar+k*beat+beat/2)
    mix=reverb(mix);x=mix[:int(SR*dur)];x=x/np.max(np.abs(x))*.85
    t=np.arange(len(x))/SR;x*=np.minimum(1,t/0.5)*np.minimum(1,(dur-t)/1.2)
    w=wave.open(path,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
if __name__=="__main__":
    a=sys.argv;make(a[1],float(a[2]),float(a[3]),int(a[4]),drums=(len(a)<6 or a[5]!='nodrums'))
