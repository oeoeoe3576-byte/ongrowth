"""릴스 효과음 입히기 (코드로 합성 → 저작권 걱정 없음, 크레딧 0).

reel.mjs가 만든 output/<이름>_sfx.json(장 넘김·박스·사진 등장 시각)을 읽어
<이름>_sfx.mp4로 저장한다.

원칙: 적당히, 다양하게
- 장 넘김 소리 1개 + 사진·강조 박스가 뜨는 장에만 등장 소리 1개(일반 흰 박스는 소리 없음)
- 글자마다 소리 내지 않는다
- 장 넘김 소리는 종이 넘김 / 휙 / 부드러운 바람을 돌아가며, 마지막 장은 반짝 소리
- 등장 소리도 장마다 다른 음(카메라 셔터, 맑은 띵, 물방울 톡, 나무 똑)으로 바꿔 가며
실행: python sfx.py <reel.mp4>
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR  # noqa: E731


def env(t, attack, decay):
    return np.clip(t / max(attack, 1e-4), 0, 1) * np.exp(-t / decay)


def lowpass(x, k):
    out = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += (v - acc) * (k[i] if hasattr(k, "__len__") else k)
        out[i] = acc
    return out


def norm(x, amp):
    return amp * x / (np.abs(x).max() + 1e-9)


# ── 장 넘김 ──
def paper_flip():
    t = T(0.32)
    n = rng.normal(0, 1, len(t))
    crackle = n * (rng.random(len(t)) < 0.08)  # 바스락 알갱이
    body = lowpass(np.diff(n, prepend=0), np.linspace(0.08, 0.25, len(t)))
    shape = np.sin(np.linspace(0, np.pi, len(t))) ** 1.5
    return norm((body + 0.5 * crackle) * shape, 0.14)


def swish():
    t = T(0.26)
    n = np.diff(rng.normal(0, 1, len(t)), prepend=0)
    x = lowpass(n, np.linspace(0.04, 0.4, len(t)))
    return norm(x * np.sin(np.linspace(0, np.pi, len(t))) ** 2, 0.13)


def breeze():
    t = T(0.45)
    n = rng.normal(0, 1, len(t))
    x = lowpass(n, np.linspace(0.02, 0.09, len(t)))
    return norm(x * np.sin(np.linspace(0, np.pi, len(t))) ** 2, 0.12)


def sparkle():
    t = T(0.9)
    out = np.zeros(len(t))
    for i, f in enumerate([1568, 1976, 2349, 3136]):  # 위로 올라가는 반짝
        d = int(i * 0.07 * SR)
        tt = t[: len(t) - d]
        out[d:] += np.sin(2 * np.pi * f * tt) * env(tt, 0.003, 0.18)
    return norm(out, 0.16)


# ── 등장 ──
def shutter():
    t = T(0.12)
    n = rng.normal(0, 1, len(t))
    c1 = np.diff(n, prepend=0) * env(t, 0.0005, 0.006)
    t2 = t - 0.05
    c2 = np.where(t2 > 0, np.diff(n, prepend=0) * env(np.clip(t2, 0, None), 0.0005, 0.012), 0)
    return norm(c1 + 0.8 * c2, 0.22)


def chime(f=1318.5):
    t = T(0.7)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t)
    return norm(x * env(t, 0.004, 0.2), 0.16)


def droplet(f0=700):
    t = T(0.11)
    f = f0 + 900 * (t / t[-1]) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return norm(x * env(t, 0.002, 0.03), 0.2)


def wood(f=520):
    t = T(0.09)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.7 * t)
    return norm(x * env(t, 0.0008, 0.018), 0.22)


def whoosh():
    t = T(0.6)
    n = np.diff(rng.normal(0, 1, len(t)), prepend=0)
    x = lowpass(n, np.linspace(0.02, 0.35, len(t)))
    return norm(x * np.sin(np.linspace(0, np.pi, len(t))) ** 2, 0.18)


PAGE = [paper_flip, swish, breeze]
BOX = [lambda: droplet(650), lambda: wood(520), lambda: droplet(820), lambda: wood(640)]
ACCENT = [lambda: chime(1318.5), lambda: chime(1046.5), lambda: chime(1568)]


def main(mp4):
    mp4 = Path(mp4)
    meta = json.loads(mp4.with_name(mp4.stem + "_sfx.json").read_text())
    ev = meta["events"]
    total = int((meta["duration"] + 0.8) * SR)
    mix = np.zeros(total)

    def put(t, s):
        i = int(t * SR)
        j = min(total, i + len(s))
        mix[i:j] += s[: j - i]

    pages = sorted({e["p"] for e in ev})
    for n, p in enumerate(pages):
        mine = [e for e in ev if e["p"] == p]
        pg = next(e for e in mine if e["k"] == "page")
        if pg.get("last"):
            put(pg["t"] + 0.15, sparkle())
        elif n > 0:  # 첫 장은 넘김 소리 없이 시작
            put(pg["t"], PAGE[n % len(PAGE)]())
        # 그 장의 대표 등장 하나만
        for kind in ("whoosh", "photo", "accent"):
            hit = next((e for e in mine if e["k"] == kind), None)
            if hit:
                s = {"whoosh": whoosh, "photo": shutter,
                     "accent": ACCENT[n % len(ACCENT)], "box": BOX[n % len(BOX)]}[kind]()
                put(max(hit["t"], pg["t"] + 0.35), s)  # 넘김 소리와 겹치지 않게
                break

    peak = np.abs(mix).max()
    if peak > 0.8:
        mix *= 0.8 / peak
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
