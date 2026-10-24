# 將合併版前後測 CSV（含學號、姓名）轉成 survey_stats.html 的格式，並去識別化
#
# 用法：python convert_merged.py 原始前測.csv 原始後測.csv 輸出資料夾
#
# 1. 刪除姓名與學號；代碼改為「科別簡稱＋隨機編號」，例如 環安03、寵物17。
#    編號依學號隨機打亂，不對應座號；沒有原始檔就無法還原是哪位學生
# 2. 身分依科別分為「五專三年級（本科）」「五專三年級（非本科）」
# 3. 這份問卷的選項順序與 questions.js 不同（答案為 SRC_KEY）。
#    逐題把「此版答案字母」與「questions.js 答案字母」互換，使統計頁計分結果與原版一致；
#    錯誤選項只保證仍為錯誤，不代表 questions.js 中的同一個選項
# 4. 前測一律依作答重算分數；原始檔的分數欄另存為「原始答對題數」供對照
# 5. 後測回饋 F1～F16 原樣保留（題目內容待確認，未對應到 E1～R3）
import csv, io, sys, pathlib, random

SRC_KEY = "A C B A D B A C B A C D C B".split()   # 由後測答對題數反推，39 筆全部吻合
DST_KEY = "B C A C D B A C B D D A C A".split()   # questions.js
Q = [f"Q{i}" for i in range(1, 15)]
MAJOR = "環境與職業安全衛生科"
SHORT = {"五專環境與職業安全衛生科": "環安", "五專寵物照護暨美容科": "寵物"}

def remap(i, a):
    s, d = SRC_KEY[i], DST_KEY[i]
    return d if a == s else s if a == d else a

def read(p):
    return list(csv.DictReader(io.StringIO(open(p, encoding="utf-8-sig").read())))

CODE = {}
def assign_codes(rows):
    by_dept = {}
    for r in rows:
        by_dept.setdefault(r["班級"].rsplit("科", 1)[0] + "科", []).append(r["學號"])
    rng = random.SystemRandom()
    for dept, ids in by_dept.items():
        nums = list(range(1, len(ids) + 1)); rng.shuffle(nums)
        for sid, n in zip(sorted(ids), nums):
            CODE[sid] = SHORT.get(dept, dept[:2]) + str(n).zfill(2)

def ident(r):
    dept = r["班級"].rsplit("科", 1)[0] + "科"
    code = CODE[r["學號"]]
    role = "五專三年級（本科）" if MAJOR in dept else "五專三年級（非本科）"
    return code, role, dept.replace("五專", "")

def write(path, cols, rows):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\r\n"); w.writeheader(); w.writerows(rows)

pre, post = read(sys.argv[1]), read(sys.argv[2])
assign_codes(pre)
out = pathlib.Path(sys.argv[3])

pre_rows = []
for r in pre:
    code, role, dept = ident(r)
    row = {"時間": r["填答完成時間"], "表單": "前測", "代碼": code, "身分": role, "科別或社團": dept,
           "消防訓練經驗": "", "VR經驗": "", "原始答對題數": r["答對題數"]}
    row.update({q: remap(i, r[q]) for i, q in enumerate(Q)})
    pre_rows.append(row)
pre_rows.sort(key=lambda x: x["代碼"])

post_rows = []
for r in post:
    code, role, _ = ident(r)
    row = {"時間": r["填答完成時間"], "表單": "後測", "代碼": code, "身分": role, "原始答對題數": r["後測答對題數"]}
    row.update({q: remap(i, r[q]) for i, q in enumerate(Q)})
    row.update({f"F{k}": r[f"回饋F{k}"] for k in range(1, 17)})
    post_rows.append(row)
post_rows.sort(key=lambda x: x["代碼"])

codes = [r["代碼"] for r in pre_rows]
assert len(codes) == len(set(codes)), "代碼重複"
write(out / "五專實測_前測_去識別.csv", ["時間", "表單", "代碼", "身分", "科別或社團", "消防訓練經驗", "VR經驗", *Q, "原始答對題數"], pre_rows)
write(out / "五專實測_後測_去識別.csv", ["時間", "表單", "代碼", "身分", *Q, *[f"F{k}" for k in range(1, 17)], "原始答對題數"], post_rows)
print(f"前測 {len(pre_rows)} 筆、後測 {len(post_rows)} 筆 → {out}")
