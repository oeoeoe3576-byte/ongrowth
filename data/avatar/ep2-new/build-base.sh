#!/bin/bash
# 2편 새 버전 기본 영상: 실사 컷 4개(Seedance 2.0 Mini 480p 4초)를 목소리 길이(21.79초)에 맞춰 이어 붙인다.
# 구간: 1 노트북 0~5.0 / 2 식당 사진 5.0~10.25 / 3 폰 가입 10.25~14.8 / 4 택배 14.8~19.1 / 1 다시 19.1~21.79
set -e
cd "$(dirname "$0")"
V="scale=1104:1920:flags=lanczos,crop=1080:1920,fps=30,setsar=1"
ffmpeg -v error -y \
 -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 -i clip4.mp4 -i ../ep2/voice.mp3 -filter_complex "\
[0:v]setpts=PTS*5.0/4,$V,trim=0:5.0,setpts=PTS-STARTPTS[a];\
[1:v]setpts=PTS*5.25/4,$V,trim=0:5.25,setpts=PTS-STARTPTS[b];\
[2:v]setpts=PTS*4.55/4,$V,trim=0:4.55,setpts=PTS-STARTPTS[c];\
[3:v]setpts=PTS*4.3/4,$V,trim=0:4.3,setpts=PTS-STARTPTS[d];\
[0:v]$V,trim=1.2:3.9,setpts=PTS-STARTPTS[e];\
[a][b][c][d][e]concat=n=5:v=1:a=0[v]" -map "[v]" -map 4:a -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 128k -shortest base.mp4
echo base.mp4
