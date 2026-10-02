"""Build shared/survey-questions.json from docs/global-ar-survey-merged.xlsx.

Usage: python3 scripts/build_survey_json.py
The xlsx is the review copy; the JSON is what the survey app and server read.
"""
import json
import openpyxl

SRC = "docs/global-ar-survey-merged.xlsx"
OUT = "shared/survey-questions.json"
OTHER = "其他(請說明)"

ws = openpyxl.load_workbook(SRC)["題目與選項"]
questions = []
for row in ws.iter_rows(min_row=2, values_only=True):
    section, qid, orig, text, qtype, options, audience, priority = row
    opts = options.split("\n")
    allow_other = OTHER in opts
    questions.append({
        "id": qid,
        "section": section,
        "text": text,
        "type": "multi" if qtype == "多選" else "single",
        "options": [o for o in opts if o != OTHER],
        "allowOther": allow_other,
        "audience": "subsidiary" if audience.startswith("僅") else "all",
        "required": priority == "核心",
        "origin": orig,
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"version": "0.1", "questions": questions}, f, ensure_ascii=False, indent=2)
print(f"{len(questions)} questions -> {OUT}")
