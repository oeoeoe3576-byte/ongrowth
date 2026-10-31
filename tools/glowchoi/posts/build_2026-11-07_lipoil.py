"""2026-11-07 립 오일 추천 (세트 A, 썸네일 1번 podium).
사용: python3 build_2026-11-07_lipoil.py <출력 폴더> <누끼 폴더>
누끼 출처: 토니모리 공식몰 / TIRTIR 글로벌 공식몰 / 클라랑스 공식몰(01 허니). 원본·누끼는 저장소 밖 gc_work/lipoil/src."""
import sys, os
sys.path.insert(0, "/home/user/ongrowth/tools/glowchoi")
from PIL import Image
import thumbs, body

OUT = sys.argv[1]
SRC = sys.argv[2] if len(sys.argv) > 2 else "/home/user/gc_work/lipoil/src"
os.makedirs(OUT, exist_ok=True)
cut = lambda n: Image.open(f"{SRC}/cut_{n}.png").convert("RGBA")
tm_b, tt_b, cl_b = cut("tonymoly_bottle"), cut("tirtir_bottle"), cut("clarins_bottle")

thumbs.podium([tm_b, tt_b, cl_b], "립 오일 추천", "립밤과 차이부터 고르는 법",
              en="Lip Oil Pick").save(f"{OUT}/01_cover.jpg", quality=92)

body.compare_columns("A", "BALM · OIL · TINTED", "립밤 vs 립오일", [
    ("BALM", "립밤", "왁스·오일을\n굳힌 제형", "얇은 막을 씌움\n각질 심한 날"),
    ("OIL", "립오일", "흐르는\n액상 제형", "얇게 펴 발림\n유리알 같은 광"),
    ("TINT", "틴티드 립오일", "컬러가 있는\n립오일", "혼자 발라도 생기\n발색은 은은"),
], row_labels=("제형", "특징")).save(f"{OUT}/02_compare.jpg", quality=92)

body.check_grid("A", "BEFORE YOU BUY", "립오일 고르기 전 체크", [
    ("컬러가\n있는지", "투명: 립 메이크업 위아래\n틴티드: 혼자 발라도 생기"),
    ("향료가\n있는지", "입술은 코와 가까워요\n전성분에서 향료 확인"),
    ("끈적임이\n없는지", "머리카락 붙는 게 싫다면\n끈적임 없는 마무리부터"),
    ("팁 모양은\n어떤지", "끈적임과 함께\n팁 모양도 확인"),
]).save(f"{OUT}/03_check.jpg", quality=92)

body.product("A", tm_b, 1, "TONYMOLY", "컬러 케어링 립 오일", "#7천원대",
             "스쿠알란·콜라겐·펩타이드").save(f"{OUT}/04_tonymoly.jpg", quality=92)
body.product("A", tt_b, 2, "TIRTIR", "글로우 팝 틴티드 립오일", "#8컬러",
             "피치부터 플럼까지").save(f"{OUT}/05_tirtir.jpg", quality=92)
body.product("A", cl_b, 3, "CLARINS", "립 컴포트 오일", "#식물성오일",
             "01 허니 · 투명 컬러").save(f"{OUT}/06_clarins.jpg", quality=92)

body.steps_flow("A", "HOW TO USE", "립오일 사용방법", [
    ("drop", "얇게 펴 바르기", "립 메이크업 전\n립오일 먼저"),
    ("tap", "티슈로 누르기", "잠시 둔 뒤\n가볍게 톡톡"),
    ("sun", "립 컬러 올리기", "립스틱이나\n틴트"),
], note="메이크업 후엔 입술 가운데에만 톡\n번지기 쉬우니 안쪽부터 채우세요").save(f"{OUT}/07_howto.jpg", quality=92)

body.pick("A", "MY PICK", "어떤 립오일을 고를까", [
    ("가격 부담 없이 처음 써본다면", "토니모리 컬러 케어링 립 오일", tm_b),
    ("내 톤에 맞는 컬러를 고르고 싶다면", "티르티르 글로우 팝 틴티드 립오일", tt_b),
    ("투명한 광과 보습, 선물까지", "클라랑스 립 컴포트 오일", cl_b),
]).save(f"{OUT}/08_guide.jpg", quality=92)
print("ok")
