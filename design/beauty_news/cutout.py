"""제품 사진 누끼(배경 제거): 흰 배경이면 테두리와 이어진 흰 영역을 투명하게, 이미 투명 PNG면 여백만 잘라 낸다.
사용: python cutout.py 입력파일 출력.png [입력파일 출력.png ...]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from skimage.measure import label


def cutout(src, dst, thr=236, spread=20):
    im = Image.open(src)
    if im.mode == "RGBA" and im.getextrema()[3][0] < 250:
        out = im
    else:
        rgb = np.asarray(im.convert("RGB")).astype(int)
        white = (rgb.min(axis=2) >= thr) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= spread)
        lab = label(white, connectivity=1)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(edge))
        a = Image.fromarray(np.where(bg, 0, 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
        out = im.convert("RGB").copy()
        out.putalpha(a)
    box = out.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
    if box:
        out = out.crop(box)
    out.save(dst)


if __name__ == "__main__":
    args = sys.argv[1:]
    for s, d in zip(args[0::2], args[1::2]):
        cutout(s, d)
        print(d)
