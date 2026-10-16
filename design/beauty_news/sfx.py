"""릴스 효과음 입히기.

reel.mjs가 만든 output/<이름>_sfx.json(장 넘김·글자·박스 등장 시각)을 읽어
코드로 합성한 효과음(저작권 걱정 없음)을 깔고 <이름>_sfx.mp4로 저장한다.
  swish  : 장이 바뀔 때 가벼운 휙
  tick   : 제목 글자가 나올 때 타자 소리(너무 촘촘하면 건너뜀)
  pop    : 박스·사진이 뜰 때 톡
  whoosh : 비포→애프터 덮을 때
실행: python sfx.py <reel.mp4>
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(3)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def tick():
    n = int(0.018 * SR)
    x = rng.normal(0, 1, n)
    x = np.diff(x, prepend=0)  # 고음 위주의 짧은 딸깍
    return 0.10 * x * env(n, 0.001, 0.004)


def pop():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = 520 + 420 * (t / t[-1])
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.32 * np.sin(ph) * env(n, 0.002, 0.025)


def noise_sweep(dur, amp, lo, hi):
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    # 간단한 대역 통과: 저역 제거(diff) 후 이동평균으로 고역 제거, 폭을 시간에 따라 변화
    x = np.diff(x, prepend=0)
    out = np.zeros(n)
    acc = 0.0
    for i in range(n):
        k = lo + (hi - lo) * (i / n)
        acc += (x[i] - acc) * k
        out[i] = acc
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return amp * out / (np.abs(out).max() + 1e-9) * shape


SOUNDS = {"tick": tick, "pop": pop,
          "swish": lambda: noise_sweep(0.28, 0.16, 0.05, 0.35),
          "whoosh": lambda: noise_sweep(0.6, 0.22, 0.03, 0.4)}


def main(mp4):
    mp4 = Path(mp4)
    meta = json.loads(mp4.with_name(mp4.stem + "_sfx.json").read_text())
    total = int((meta["duration"] + 0.5) * SR)
    mix = np.zeros(total)
    last_tick = -1.0
    for e in sorted(meta["events"], key=lambda e: e["t"]):
        if e["k"] == "tick":
            if e["t"] - last_tick < 0.075:
                continue
            last_tick = e["t"]
        s = SOUNDS[e["k"]]()
        i = int(e["t"] * SR)
        j = min(total, i + len(s))
        mix[i:j] += s[: j - i]
    peak = np.abs(mix).max()
    if peak > 0.85:
        mix *= 0.85 / peak
    pcm = (np.stack([mix, mix], 1) * 32767).astype("<i2")
    wav = mp4.with_name(mp4.stem + "_sfx.wav")
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    out = mp4.with_name(mp4.stem + "_sfx.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4), "-i", str(wav),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", str(out)], check=True)
    wav.unlink()
    print(out)


if __name__ == "__main__":
    main(sys.argv[1])
