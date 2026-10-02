"""Build shared/survey-questions.bilingual.json (Chinese / English) from the Chinese question file.

Usage: python3 scripts/build_bilingual_json.py
Each question text and option becomes "中文 / English". An option is left as is when it is plain
ASCII or already contains its English wording (e.g. "Local System(當地系統)").
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from translations_en import BANDS_COUNT, DESCRIPTION_EN, EN, PROFILE_EN, SECTIONS_EN  # noqa: E402

SEP = " / "
doc = json.load(open("shared/survey-questions.json", encoding="utf-8"))


def both(zh, en):
    zl, el = zh.lower(), en.lower()
    if zl == el or zl.isascii() or el in zl:
        return zh
    return f"{zh}{SEP}{en}"


problems = []
out = []
for q in doc["questions"]:
    en_text, en_opts = EN[q["id"]]
    if len(en_opts) != len(q["options"]):
        problems.append(f"{q['id']}: {len(q['options'])} Chinese options but {len(en_opts)} English")
        continue
    nq = dict(q)
    nq["text"] = both(q["text"], en_text)
    nq["options"] = [both(z, e) for z, e in zip(q["options"], en_opts)]
    if q["type"] == "multi" and any(", " in o for o in nq["options"]):
        problems.append(f"{q['id']}: a multi-select option contains ', '")
    if len(set(nq["options"])) != len(nq["options"]):
        problems.append(f"{q['id']}: duplicate options after merging")
    if q["id"] != "R0":
        nq["section"] = f"{q['section']}{SEP}{SECTIONS_EN[q['section'][0]]}"
    out.append(nq)

if problems:
    print("\n".join(problems))
    sys.exit(1)

doc_out = {"version": doc["version"] + "-bilingual", "questions": out,
           "profile": [{"id": k, "text": f"{zh}{SEP}{PROFILE_EN[k]}"} for k, zh in
                       [("P1", "夥伴代碼(請填寫總部提供的代碼)"), ("P2", "公司名稱"), ("P3", "國家 / 地區"),
                        ("P4", "聯絡 Email(選填,供補問使用)")]],
           "description": ("為建立一致的全球應收帳款(AR)作業標準,請協助填寫本問卷。全部為選擇題,約需 20 至 30 分鐘。"
                           "標 * 為必填。若選項無法描述貴單位的做法,請選「其他」並簡短說明。"
                           f"\n\n{DESCRIPTION_EN}")}
json.dump(doc_out, open("shared/survey-questions.bilingual.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "questions ->", "shared/survey-questions.bilingual.json")
print("sample:", out[1]["text"], "|", out[1]["options"][:2])
