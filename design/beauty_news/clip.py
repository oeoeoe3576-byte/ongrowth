"""릴스용 영상 클립 자르기: 화면 녹화(mp4/mov)에서 짧은 구간을 세로 1080x1920 webm(소리 없음)으로 만든다.

남의 영상은 짧게(1인당 2~3초)만 쓰고, 영상 속 자막은 crop으로 잘라 낸다.
실행: python clip.py <입력> <출력.webm> --start 12.3 --dur 3 [--crop x:y:w:h]
  --crop: 원본 픽셀 기준 잘라 낼 영역(세로 9:16 비율 권장). 없으면 가운데 9:16.
reel.html에서: <video class="clip" src="img/clip_이름.webm" muted playsinline preload="auto"></video>
"""
import argparse
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("out")
ap.add_argument("--start", type=float, default=0)
ap.add_argument("--dur", type=float, default=3)
ap.add_argument("--crop")
a = ap.parse_args()

if a.crop:
    x, y, w, h = a.crop.split(":")
    crop = f"crop={w}:{h}:{x}:{y}"
else:
    crop = "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'"
vf = f"{crop},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error", "-ss", str(a.start), "-t", str(a.dur), "-i", a.src,
    "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", "-row-mt", "1", a.out,
], check=True)
print(a.out)
