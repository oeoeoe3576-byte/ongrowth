"""2026-11-08 연말 뷰티 선물 (세트 B, 썸네일 2번 label_photo).
사용: python3 build_2026-11-08_yearendgift.py <출력 폴더> <누끼 폴더>
누끼 출처: 컬리 상세 이미지 (조 말론 30ml 코롱 단독 컷 / 키엘 홀리데이 세트 패키지 컷 / 캐스키드슨 세트 대표 컷(상자에 담긴 구성)).
원본·누끼는 저장소 밖 gc_work/yearend_gift/src."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image
import thumbs, body

OUT = sys.argv[1]
SRC = sys.argv[2] if len(sys.argv) > 2 else "/home/user/gc_work/yearend_gift/src"
os.makedirs(OUT, exist_ok=True)
cut = lambda n: Image.open(f"{SRC}/cut_{n}.png").convert("RGBA")
jm, kh, ca = cut("jomalone"), cut("kiehls"), cut("cath_thumb")

# 표지: 공식 제형 사진이 없어 그레이지 그라데이션 + 조명 배경. label_photo 로 배경 톤·라벨을 만들고
# 크기가 제각각인 세트 3종(가로로 넓은 세트 상자 포함)은 높이를 맞춰 직접 세운다.
bg = thumbs.light(thumbs.vgrad("#F0EBE6", "#DCD1C7"), 500, 380, 560, 0.45)
cover = thumbs.label_photo(bg, [], "받는 사람별 3가지", "연말 뷰티 선물").convert("RGBA")
thumbs.stand(cover, kh, 185, 700, 290, 440, 0.75)          # 왼쪽: 키엘 듀오 세트
thumbs.stand(cover, ca, 505, 700, 340, 420, 0.75)          # 가운데: 캐스키드슨 세트
thumbs.stand(cover, jm, 815, 700, 120, 430, 0.75)          # 오른쪽: 조 말론 코롱 30ml
thumbs.grain(cover.convert("RGB"), 2.0).save(f"{OUT}/01_cover.jpg", quality=92)

body.check_grid("B", "BEFORE YOU PICK", "고르기 전 체크", [
    ("향 취향이\n확실한지", "취향을 많이 타요\n평소 쓰는 향을 알 때"),
    ("피부가\n예민한지", "매일 쓰는 기초 제품이\n무난해요"),
    ("박스 포장이\n필요한지", "선물박스·세트 패키지\n미리 확인"),
    ("가격대는\n어떤지", "10만원대 2가지\n2만원대 1가지"),
]).save(f"{OUT}/02_check.jpg", quality=92)

body.product("B", jm, 1, "JO MALONE LONDON", "코롱 30ml", "#향선물",
             "7가지 향 중 택1").save(f"{OUT}/03_jomalone.jpg", quality=92)
body.product("B", kh, 2, "KIEHL'S", "칼렌듈라 듀오 세트 2026 홀리데이", "#실용선물",
             "토너 250mL + 클렌저 230mL").save(f"{OUT}/04_kiehls.jpg", quality=92)
body.product("B", ca, 3, "CATH KIDSTON BEAUTY", "머스크로즈 바디 선물세트", "#가성비",
             "바디워시·로션·스크럽·솝").save(f"{OUT}/05_cathkidston.jpg", quality=92)

body.pick("B", "GIFT GUIDE", "누구에게 뭘 줄까", [
    ("향 취향이 확실한 사람", "조 말론 런던 코롱 30ml", jm),
    ("예민한 피부, 실용파", "키엘 칼렌듈라 듀오 세트", kh),
    ("여러 명을 가볍게 챙길 때", "캐스키드슨 머스크로즈 바디 선물세트", ca),
]).save(f"{OUT}/06_guide.jpg", quality=92)
print("ok")
