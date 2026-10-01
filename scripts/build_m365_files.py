"""Build the Microsoft 365 (Forms) deliverables from shared/survey-questions.json.

Usage: python3 scripts/build_m365_files.py [--test-data]
Writes docs/m365/Global_AR_Forms建置清單.xlsx and docs/m365/Global_AR_回收統計範本.xlsx.
With --test-data, a fake Forms export and partner list are filled into a copy of the
stats template (docs/m365/_test_stats.xlsx) so the formulas can be checked.
"""
import json
import os
import random
import sys

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.formatting.rule import DataBarRule, CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

OUT_DIR = "docs/m365"
doc = json.load(open("shared/survey-questions.json", encoding="utf-8"))
QS = doc["questions"]
R0 = QS[0]
SUB_OPT, AGENT_OPT = R0["options"]

PROFILE = [  # extra Forms questions on page 1 (not in the app's question list)
    ("P1", "夥伴代碼(請填寫總部提供的代碼)", "文字", True),
    ("P2", "公司名稱", "文字", True),
    ("P3", "國家 / 地區", "文字", True),
    ("P4", "聯絡 Email(選填,供補問使用)", "文字", False),
]

HDR_FILL = PatternFill("solid", fgColor="1F3A5F")
HDR_FONT = Font(bold=True, color="FFFFFF")
SEC_FILL = PatternFill("solid", fgColor="DDE7F3")
GREY = PatternFill("solid", fgColor="F2F2F2")
thin = Side(style="thin", color="BBBBBB")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical="top")


def header(ws, row, heads):
    for c, h in enumerate(heads, 1):
        x = ws.cell(row, c, h)
        x.fill, x.font, x.border = HDR_FILL, HDR_FONT, BORDER
        x.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def put(ws, row, vals, fill=None, bold=False):
    for c, v in enumerate(vals, 1):
        x = ws.cell(row, c, v)
        x.alignment, x.border = WRAP, BORDER
        if fill:
            x.fill = fill
        if bold:
            x.font = Font(bold=True)


def widths(ws, ws_widths):
    for i, w in enumerate(ws_widths, 1):
        ws.column_dimensions[L(i)].width = w


# Sections in order; page 1 = profile + R0.
sections = []
for q in QS:
    if q["id"] != "R0" and q["section"] not in sections:
        sections.append(q["section"])
PAGE = {s: i + 2 for i, s in enumerate(sections)}  # page numbers; page 1 is the profile page


def title(qid, text):
    return f"{qid}. {text}"


# ---------------------------------------------------------------- Forms build list
def build_forms():
    wb = Workbook()
    ws = wb.active
    ws.title = "建置說明"
    steps = [
        ("Global AR 問卷:Microsoft Forms 建置清單", None),
        ("", None),
        ("一、先確認(請 IT 協助)", "b"),
        ("1. 貴公司 Microsoft 365 是否允許外部人員填寫 Forms?(表單設定「誰可以回應」要能選「任何人都可以回應」。)", None),
        ("2. 若不允許,請 IT 說明替代方式(例如以來賓帳號邀請夥伴),再通知我調整。", None),
        ("", None),
        ("二、建立表單(介面文字以實際畫面為準)", "b"),
        ("1. 到 forms.office.com 建立新表單,標題「Global AR 問卷盤點」。", None),
        ("2. 設定:誰可以回應 = 任何人;不要隨機排序題目;不需勾選記錄姓名(外部夥伴不適用)。", None),
        (f"3. 依「表單題目」分頁的順序建立,共 {len(PAGE) + 1} 個區段(頁面):第 1 頁為基本資料與身份,之後 A 到 H 各一頁。", None),
        ("4. 每題:題目文字整行複製(含「A1. 」前綴,統計範本靠這個前綴找欄位);選項整格複製貼上,Forms 通常會依換行拆成多個選項;依「題型」欄開關「多重答案」;「加其他選項」為「是」的題目,開啟「其他」選項;「必填」欄為「是」的題目,開啟必填。", None),
        ("5. 分支:請照「頁面與分支」分頁設定(R0 依身份跳到 A 區或 B 區)。", None),
        ("6. 測試:用兩種身份各送一份,再到「回應」匯出 Excel,貼進「Global_AR_回收統計範本」的「回覆資料」分頁,確認統計正常。", None),
        ("", None),
        ("三、重要提醒", "b"),
        ("• 題目文字的「A1. 」前綴請勿刪除或改動,否則統計範本找不到該題。", None),
        ("• 夥伴代碼請由總部預先編好(對應統計範本「夥伴名單」分頁),以追蹤誰已回覆。", None),
        ("• Forms 無法限制外部夥伴只填一次;同一夥伴填多份時,統計範本會標紅,請在匯出資料中保留最新一列。", None),
        ("• 英文或其他語言版:複製表單後翻譯題目;每種語言的題號前綴必須相同,匯出後各語言資料可貼在同一張回覆資料表。", None),
    ]
    for i, (t, style) in enumerate(steps, 1):
        c = ws.cell(i, 1, t)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if i == 1:
            c.font = Font(bold=True, size=14)
        elif style == "b":
            c.font = Font(bold=True)
    ws.column_dimensions["A"].width = 110

    wp = wb.create_sheet("頁面與分支")
    header(wp, 1, ["Forms 頁面", "頁面名稱", "包含題號", "誰會看到", "分支規則"])
    ids_by_section = {}
    for q in QS:
        if q["id"] != "R0":
            ids_by_section.setdefault(q["section"], []).append(q["id"])
    put(wp, 2, [1, "基本資料與身份", "P1–P4, R0", "所有人",
                f"在 R0 設分支:選「{SUB_OPT}」→ 前往第 {PAGE[sections[0]]} 頁(A 區);選「{AGENT_OPT}」→ 前往第 {PAGE[sections[1]]} 頁(B 區)"])
    for s in sections:
        ids = ids_by_section[s]
        who = "僅子公司 / 合資" if s.startswith("A.") else "所有人"
        rule = ""
        if s.startswith("A."):
            rule = "不需分支,送出本頁後依序進入第 3 頁(B 區)"
        elif s.startswith("H."):
            rule = "最後一頁,按「提交」"
        put(wp, PAGE[s] + 1, [PAGE[s], s, f"{ids[0]}–{ids[-1]}({len(ids)} 題)", who, rule])
    widths(wp, [10, 34, 22, 18, 80])
    wp.freeze_panes = "A2"

    wq = wb.create_sheet("表單題目")
    header(wq, 1, ["順序", "Forms 頁面", "題號", "Forms 題目文字(整行複製)", "題型", "選項(整格複製)", "加「其他」選項", "必填", "備註"])
    r = 2
    order = 1
    for pid, text, kind, required in PROFILE:
        put(wq, r, [order, 1, pid, title(pid, text), kind, "", "否", "是" if required else "否", "文字題" if kind == "文字" else ""])
        r += 1
        order += 1
    for q in QS:
        page = 1 if q["id"] == "R0" else PAGE[q["section"]]
        kind = "選擇題-多選(開啟多重答案)" if q["type"] == "multi" else "選擇題-單選"
        note = "分支題:見「頁面與分支」" if q["id"] == "R0" else ("僅子公司/合資" if q["audience"] != "all" else "")
        put(wq, r, [order, page, q["id"], title(q["id"], q["text"]), kind, "\n".join(q["options"]),
                    "是" if q["allowOther"] else "否", "是" if (q["required"] or q["id"] == "R0") else "否", note])
        r += 1
        order += 1
    widths(wq, [6, 8, 7, 58, 22, 46, 12, 7, 20])
    wq.freeze_panes = "E2"
    wq.auto_filter.ref = f"A1:I{r - 1}"

    os.makedirs(OUT_DIR, exist_ok=True)
    path = f"{OUT_DIR}/Global_AR_Forms建置清單.xlsx"
    wb.save(path)
    return path


# ---------------------------------------------------------------- stats template
MAXROW = int(os.environ.get("AR_MAXROW", 1000))  # response rows supported (env override only for tests)
MAXCOL = "CZ"      # response columns supported (~100)
PARTNER_ROWS = 300
HDR = f"回覆資料!$A$1:${MAXCOL}$1"
DATA = f"回覆資料!$A$2:${MAXCOL}${MAXROW}"


def build_stats(test_data=False):
    heads = ["ID", "Start time", "Completion time", "Email", "Name"]
    heads += [title(pid, t) for pid, t, _, _ in PROFILE]
    heads += [title(q["id"], q["text"]) for q in QS]
    colno = {h.split(". ")[0]: c for c, h in enumerate(heads, 1) if ". " in h}

    def rng(idx_ref, qid):
        """Column of responses for a question. Production: located by header via INDEX/MATCH.
        Test mode: direct reference, because the Python formula engine cannot evaluate INDEX(range,0,n)."""
        if test_data:
            col = L(colno[qid])
            return f"回覆資料!${col}$2:${col}${MAXROW}"
        return f"INDEX({DATA},0,{idx_ref})"

    wb = Workbook()
    wsx = wb.active
    wsx.title = "說明"
    notes = [
        "Global AR 問卷:回收統計範本",
        "",
        "使用方式",
        "1. 在「夥伴名單」填入全部要發送的夥伴(代碼、名稱、國家、身份)。代碼要和發給夥伴的一致。",
        "2. 在 Forms 的「回應」按「在 Excel 中開啟」或下載,複製整張表(含標題列),貼到「回覆資料」分頁的 A1。每次更新都整張重貼。",
        "3. 「總覽」看回收率;「各題統計」看每題選項人數與比例(含子公司/合資、代理行分開)。",
        "",
        "注意",
        "• 統計靠標題列開頭的「A1. 」這類題號前綴找欄位,Forms 題目文字請勿改動前綴。",
        "• 假設:Forms 匯出時,多選題的答案以分號「;」連接。請用第一份測試回覆確認格式。",
        "• 同一夥伴填多份時,「夥伴名單」的回覆份數會標紅;請在回覆資料中保留最新一列再統計。",
        "• 單選題「其他(自填)」人數 = 作答人數減去各選項人數;多選題的自填內容請直接在回覆資料查看。",
        f"• 支援最多 {MAXROW - 1} 份回覆、約 100 欄。不要在回覆資料之外的分頁手動改公式。",
    ]
    for i, t in enumerate(notes, 1):
        c = wsx.cell(i, 1, t)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if i == 1:
            c.font = Font(bold=True, size=14)
        elif t in ("使用方式", "注意"):
            c.font = Font(bold=True)
    wsx.column_dimensions["A"].width = 110

    # ---- 設定
    wset = wb.create_sheet("設定")
    put(wset, 1, ["子公司/合資選項文字", SUB_OPT], bold=False)
    put(wset, 2, ["代理行選項文字", AGENT_OPT])
    put(wset, 3, ["R0 所在欄", f'=IFERROR(MATCH("R0. *",{HDR},0),0)'])
    put(wset, 4, ["夥伴代碼所在欄", f'=IFERROR(MATCH("P1. *",{HDR},0),0)'])
    put(wset, 5, ["說明", "選項文字須與 Forms 的 R0 選項完全一致;一般不需修改"])
    widths(wset, [24, 60])
    R0COL, CODECOL = "設定!$B$3", "設定!$B$4"
    R0RNG = rng(R0COL, "R0")
    CODERNG = rng(CODECOL, "P1")

    # ---- 夥伴名單
    wpt = wb.create_sheet("夥伴名單")
    header(wpt, 1, ["夥伴代碼", "夥伴名稱", "國家", "身份", "負責人", "已回覆", "回覆份數"])
    for r in range(2, PARTNER_ROWS + 2):
        for c in range(1, 8):
            x = wpt.cell(r, c)
            x.border = BORDER
        wpt.cell(r, 6, f'=IF(A{r}="","",IF(G{r}>0,"是","否"))')
        wpt.cell(r, 7, f'=IF(A{r}="","",IF({CODECOL}=0,0,COUNTIF({CODERNG},A{r})))')
    dv = DataValidation(type="list", formula1='"代理行,子公司/合資"', allow_blank=True)
    wpt.add_data_validation(dv)
    dv.add(f"D2:D{PARTNER_ROWS + 1}")
    wpt.conditional_formatting.add(f"G2:G{PARTNER_ROWS + 1}",
                                   CellIsRule(operator="greaterThan", formula=["1"], fill=PatternFill("solid", bgColor="F4CCCC")))
    widths(wpt, [14, 36, 16, 14, 14, 9, 10])
    wpt.freeze_panes = "A2"
    PL = f"夥伴名單!$A$2:$A${PARTNER_ROWS + 1}"
    PD = f"夥伴名單!$D$2:$D${PARTNER_ROWS + 1}"
    PF = f"夥伴名單!$F$2:$F${PARTNER_ROWS + 1}"
    PG = f"夥伴名單!$G$2:$G${PARTNER_ROWS + 1}"

    # ---- 回覆資料 (paste area)
    wd = wb.create_sheet("回覆資料")
    for c, h in enumerate(heads, 1):
        x = wd.cell(1, c, h)
        x.fill, x.font = GREY, Font(bold=True)
        x.alignment = Alignment(wrap_text=True, vertical="top")
        wd.column_dimensions[L(c)].width = 22
    wd.freeze_panes = "A2"

    # ---- 總覽
    wo = wb.create_sheet("總覽", 1)
    wo["A1"], wo["A1"].font = "回收總覽", Font(bold=True, size=14)
    put(wo, 3, ["已發送夥伴數", f'=COUNTA({PL})'])
    put(wo, 4, ["已回收夥伴數", f'=COUNTIF({PF},"是")'])
    put(wo, 5, ["回收率", '=IF(B3=0,"",B4/B3)'])
    put(wo, 6, ["總回覆份數", f'=IF({R0COL}=0,0,SUMPRODUCT(({R0RNG}<>"")*1))'])
    put(wo, 7, ["代碼不在名單的回覆數", f'=IF({CODECOL}=0,0,SUMPRODUCT(({CODERNG}<>"")*(COUNTIF({PL},{CODERNG})=0)))'])
    put(wo, 8, ["有重複回覆的夥伴數", f'=COUNTIF({PG},">1")'])
    wo["B5"].number_format = "0%"
    header(wo, 10, ["身份", "已發送", "已回收", "回收率", "回覆份數"])
    for i, (label, opt_ref) in enumerate([("子公司/合資", "設定!$B$1"), ("代理行", "設定!$B$2")], 11):
        put(wo, i, [label,
                    f'=COUNTIF({PD},A{i})',
                    f'=COUNTIFS({PD},A{i},{PF},"是")',
                    f'=IF(B{i}=0,"",C{i}/B{i})',
                    f'=IF({R0COL}=0,0,SUMPRODUCT(({R0RNG}={opt_ref})*1))'])
        wo.cell(i, 4).number_format = "0%"
    widths(wo, [24, 12, 12, 12, 12])
    ch = BarChart()
    ch.type, ch.title = "col", "各身份回收率"
    ch.add_data(Reference(wo, min_col=4, min_row=10, max_row=12), titles_from_data=True)
    ch.set_categories(Reference(wo, min_col=1, min_row=11, max_row=12))
    ch.y_axis.numFmt, ch.y_axis.scaling.max, ch.y_axis.scaling.min = "0%", 1, 0
    ch.legend = None
    ch.height, ch.width = 7, 12
    wo.add_chart(ch, "G3")

    # ---- 各題統計
    wq = wb.create_sheet("各題統計", 2)
    header(wq, 1, ["題號", "題目 / 選項", "題型", "全部人數", "全部 %", "子公司/合資", "代理行", "欄位位置"])
    r = 2
    first_opt_rows = []
    for q in QS:
        multi = q["type"] == "multi"
        qrow = r
        put(wq, r, [q["id"], q["text"], "多選" if multi else "單選",
                    None, None, None, None, f'=IFERROR(MATCH(A{r}&". *",{HDR},0),0)'], fill=SEC_FILL, bold=True)
        col = rng(f"$H${qrow}", q["id"])
        wq.cell(r, 4, f'=IF($H${qrow}=0,0,SUMPRODUCT(({col}<>"")*1))')
        wq.cell(r, 6, f'=IF(OR($H${qrow}=0,{R0COL}=0),0,SUMPRODUCT(({col}<>"")*({R0RNG}=設定!$B$1)))')
        wq.cell(r, 7, f'=IF(OR($H${qrow}=0,{R0COL}=0),0,SUMPRODUCT(({col}<>"")*({R0RNG}=設定!$B$2)))')
        wq.cell(r, 2).value = f"{q['text']}(作答人數)"
        r += 1
        opt_start = r
        for opt in q["options"]:
            m = f'ISNUMBER(FIND(";"&$B{r}&";",";"&{col}&";"))'
            put(wq, r, [q["id"], opt, "", None, None, None, None, ""])
            wq.cell(r, 4, f'=IF($H${qrow}=0,0,SUMPRODUCT({m}*1))')
            wq.cell(r, 5, f'=IF($D${qrow}=0,"",D{r}/$D${qrow})')
            wq.cell(r, 6, f'=IF(OR($H${qrow}=0,{R0COL}=0),0,SUMPRODUCT({m}*({R0RNG}=設定!$B$1)))')
            wq.cell(r, 7, f'=IF(OR($H${qrow}=0,{R0COL}=0),0,SUMPRODUCT({m}*({R0RNG}=設定!$B$2)))')
            wq.cell(r, 5).number_format = "0%"
            r += 1
        opt_end = r - 1
        if q["allowOther"] and not multi:
            put(wq, r, [q["id"], "其他(自填)", "", None, None, None, None, ""])
            for c, L_ in ((4, "D"), (6, "F"), (7, "G")):
                wq.cell(r, c, f"={L_}{qrow}-SUM({L_}{opt_start}:{L_}{opt_end})")
            wq.cell(r, 5, f'=IF($D${qrow}=0,"",D{r}/$D${qrow})')
            wq.cell(r, 5).number_format = "0%"
            opt_end = r
            r += 1
        elif q["allowOther"]:
            put(wq, r, [q["id"], "(多選題的「其他」自填內容請到回覆資料查看)", "", "", "", "", "", ""])
            wq.cell(r, 2).font = Font(italic=True, color="888888")
            r += 1
        first_opt_rows.append((opt_start, opt_end))
    wq.freeze_panes = "C2"
    widths(wq, [7, 62, 7, 10, 9, 12, 9, 9])
    for a, b in first_opt_rows:
        wq.conditional_formatting.add(f"E{a}:E{b}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color="3AA88A"))
    wq.sheet_properties.tabColor = "3AA88A"

    os.makedirs(OUT_DIR, exist_ok=True)

    if test_data:
        random.seed(7)
        for i in range(1, 41):
            code = f"P{i:03d}"
            kind = "子公司/合資" if i <= 10 else "代理行"
            for c, v in enumerate([code, f"Partner {i}", "測試國", kind, "tester"], 1):
                wpt.cell(i + 1, c, v)
        # 20 responses: first 8 subsidiaries, then 12 agents; partner P009 answers twice (duplicate)
        rows = []
        codes = [f"P{i:03d}" for i in range(1, 9)] + [f"P{i:03d}" for i in range(11, 23)] + ["P011", "ZZZ999"]
        for n, code in enumerate(codes, 1):
            sub = code <= "P010"
            row = {"ID": n, "Start time": "2026-11-01", "Completion time": "2026-11-01", "Email": "anonymous", "Name": ""}
            row[title("P1", PROFILE[0][1])] = code
            row[title("P2", PROFILE[1][1])] = "Co " + code
            row[title("P3", PROFILE[2][1])] = "測試國"
            row[title("R0", R0["text"])] = SUB_OPT if sub else AGENT_OPT
            for q in QS[1:]:
                if q["audience"] != "all" and not sub:
                    continue
                if random.random() < 0.1 and not q["required"]:
                    continue
                if q["type"] == "multi":
                    k = random.randint(1, min(3, len(q["options"])))
                    val = ";".join(random.sample(q["options"], k)) + ";"
                else:
                    val = random.choice(q["options"])
                    if q["allowOther"] and random.random() < 0.15:
                        val = "自填內容"
                row[title(q["id"], q["text"])] = val
            rows.append(row)
        for ri, row in enumerate(rows, 2):
            for ci, h in enumerate(heads, 1):
                if h in row:
                    wd.cell(ri, ci, row[h])
        json.dump(rows, open(f"{OUT_DIR}/_test_rows.json", "w", encoding="utf-8"), ensure_ascii=False)
        path = f"{OUT_DIR}/_test_stats.xlsx"
    else:
        path = f"{OUT_DIR}/Global_AR_回收統計範本.xlsx"
    wb.save(path)
    return path


if __name__ == "__main__":
    print(build_forms())
    print(build_stats(test_data="--test-data" in sys.argv))
