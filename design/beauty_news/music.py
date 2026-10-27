"""릴스에 무료 배경음악 넣기 (API 자동 업로드용: 앱 음악 라이브러리를 못 붙이므로 파일에 넣는다).

음원은 저작권 걱정 없는 무료 음원만 쓴다(기본: Kevin MacLeod / incompetech.com, CC BY 4.0 → 캡션에 출처 한 줄 필수).
가요·팝 같은 일반 노래는 넣지 않는다(인스타가 잡아내 음소거·삭제될 수 있음).

- 곡의 조용한 도입부는 건너뛰고(음량이 충분히 올라온 지점부터) 영상 길이만큼 자른다.
- 음악은 -16 LUFS 근처, 기존 효과음은 살짝 낮춰 함께 섞는다. 끝 1.2초 페이드아웃.
실행: python music.py <영상.mp4> <음원.mp3> <출력.mp4> [--start 초]
"""
import argparse
import json
import re
import subprocess


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def auto_start(path):
    # 3초 단기 음량이 곡 전체 음량 -3dB 이상으로 처음 올라오는 지점
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    integ = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1])
    for t, s in re.findall(r"t:\s*([\d.]+).*?S:\s*(-?[\d.]+)", log):
        if float(t) >= 3 and float(s) >= integ - 3:
            return max(0.0, float(t) - 3)
    return 0.0


ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("music")
ap.add_argument("out")
ap.add_argument("--start", type=float)
a = ap.parse_args()

dur = duration(a.video)
start = a.start if a.start is not None else auto_start(a.music)
has_audio = bool(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                                 "-of", "csv=p=0", a.video], capture_output=True, text=True).stdout.strip())
mus = (f"[1:a]atrim=start={start}:duration={dur},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,"
       f"afade=t=in:d=0.3,afade=t=out:st={max(0, dur - 1.2)}:d=1.2[m]")
if has_audio:
    graph = mus + ";[0:a]volume=-4dB[s];[m][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[a]"
else:
    graph = mus.replace("[m]", "[a]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-i", a.music, "-filter_complex", graph,
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart", a.out], check=True)
print(json.dumps({"out": a.out, "music_start": round(start, 1), "duration": round(dur, 1)}))
