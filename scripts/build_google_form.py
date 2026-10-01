"""Build the Google Forms kit from shared/survey-questions.json.

Usage: python3 scripts/build_google_form.py
Writes docs/google-forms/create_form.gs (Apps Script that creates the real Form in the
user's Google account) and docs/google-forms/preview.html (static preview of the form).
"""
import json
import os

OUT = "docs/google-forms"
doc = json.load(open("shared/survey-questions.json", encoding="utf-8"))
QS = doc["questions"]
os.makedirs(OUT, exist_ok=True)

PROFILE = [
    {"id": "P1", "text": "夥伴代碼(請填寫總部提供的代碼)", "required": True},
    {"id": "P2", "text": "公司名稱", "required": True},
    {"id": "P3", "text": "國家 / 地區", "required": True},
    {"id": "P4", "text": "聯絡 Email(選填,供補問使用)", "required": False},
]
DESCRIPTION = ("為建立一致的全球應收帳款(AR)作業標準,請協助填寫本問卷。全部為選擇題,約需 20 至 30 分鐘。"
               "標 * 為必填。若選項無法描述貴單位的做法,請選「其他」並簡短說明。")

slim = [{
    "id": q["id"], "section": q["section"], "text": q["text"], "multi": q["type"] == "multi",
    "options": q["options"], "other": q["allowOther"],
    "required": bool(q["required"] or q["id"] == "R0"), "subOnly": q["audience"] != "all",
} for q in QS]

GS = r"""/**
 * Global AR 問卷:建立 Google 表單
 * 使用方式:script.google.com -> 新增專案 -> 貼上本檔 -> 選函式 createGlobalArForm -> 執行 -> 授權。
 * 完成後,到「執行記錄」複製表單網址。重複執行會建立多份表單。
 * 本檔由 scripts/build_google_form.py 自動產生,請勿手動改題目(改 shared/survey-questions.json 後重新產生)。
 */
var DESCRIPTION = __DESCRIPTION__;
var PROFILE = __PROFILE__;
var QUESTIONS = __QUESTIONS__;

function createGlobalArForm() {
  var form = FormApp.create('Global AR 問卷盤點');
  form.setDescription(DESCRIPTION);
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage('感謝您的填寫,問卷已送出。');

  // Page 1: profile and routing question
  PROFILE.forEach(function (p) {
    form.addTextItem().setTitle(p.id + '. ' + p.text).setRequired(p.required);
  });
  var r0q = QUESTIONS[0];
  var r0 = form.addMultipleChoiceItem()
    .setTitle(r0q.id + '. ' + r0q.text)
    .setChoiceValues(r0q.options)
    .setRequired(true);

  // Pages A..H. Each section starts with a page break.
  var pages = {};
  var currentSection = null;
  QUESTIONS.slice(1).forEach(function (q) {
    if (q.section !== currentSection) {
      currentSection = q.section;
      pages[currentSection] = form.addPageBreakItem().setTitle(currentSection);
    }
    var title = q.id + '. ' + q.text;
    if (q.multi) {
      form.addCheckboxItem().setTitle(title).setChoiceValues(q.options)
        .showOtherOption(q.other).setRequired(q.required);
    } else {
      form.addMultipleChoiceItem().setTitle(title).setChoiceValues(q.options)
        .showOtherOption(q.other).setRequired(q.required);
    }
  });

  // Branching: subsidiary/JV goes to section A, agent skips to section B.
  var sections = Object.keys(pages);
  r0.setChoices([
    r0.createChoice(r0q.options[0], pages[sections[0]]),
    r0.createChoice(r0q.options[1], pages[sections[1]])
  ]);

  var ss = SpreadsheetApp.create('Global AR 問卷回覆');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('填寫連結(給夥伴): ' + form.getPublishedUrl());
  Logger.log('編輯連結(僅限你): ' + form.getEditUrl());
  Logger.log('回覆試算表: ' + ss.getUrl());
}
"""
gs = (GS.replace("__DESCRIPTION__", json.dumps(DESCRIPTION, ensure_ascii=False))
      .replace("__PROFILE__", json.dumps(PROFILE, ensure_ascii=False, indent=2))
      .replace("__QUESTIONS__", json.dumps(slim, ensure_ascii=False, indent=2)))
open(f"{OUT}/create_form.gs", "w", encoding="utf-8").write(gs)

PREVIEW = open("scripts/google_form_preview_template.html", encoding="utf-8").read()
html = (PREVIEW.replace("__DATA__", json.dumps({"description": DESCRIPTION, "profile": PROFILE, "questions": slim}, ensure_ascii=False)))
open(f"{OUT}/preview.html", "w", encoding="utf-8").write(html)
print(len(slim), "questions ->", OUT)
