/**
 * Global AR 問卷:建立 Google 表單
 * 使用方式:script.google.com -> 新增專案 -> 貼上本檔 -> 選函式 createGlobalArForm -> 執行 -> 授權。
 * 完成後,到「執行記錄」複製表單網址。重複執行會建立多份表單。
 * 本程式只需要「Google 表單」權限。回覆試算表請在表單的「回應」分頁按「連結到試算表」自行建立。
 * 本檔由 scripts/build_google_form.py 自動產生,請勿手動改題目(改 shared/survey-questions.json 後重新產生)。
 */
var DESCRIPTION = "為建立一致的全球應收帳款(AR)作業標準,請協助填寫本問卷。全部為選擇題,約需 20 至 30 分鐘。標 * 為必填。若選項無法描述貴單位的做法,請選「其他」並簡短說明。";
var PROFILE = [
  {"id":"P1","text":"夥伴代碼(請填寫總部提供的代碼)","required":true},
  {"id":"P2","text":"公司名稱","required":true},
  {"id":"P3","text":"國家 / 地區","required":true},
  {"id":"P4","text":"聯絡 Email(選填,供補問使用)","required":false}
];
var QUESTIONS = [
  {"id":"R0","section":"0. 分流(新增)","text":"貴單位屬於哪一類?","multi":false,"options":["子公司 / 合資公司(例如 YMA、YMC)","代理行(Agent)"],"other":false,"required":true,"subOnly":false},
  {"id":"A1","section":"A. 基本資料及作業範圍","text":"前端收款作業涵蓋哪些項目?","multi":true,"options":["進口運費","出口運費","Manifest Charge","Non-Manifest Charge","Local Charge","非運費收入","第三地付款"],"other":true,"required":true,"subOnly":true},
  {"id":"A2","section":"A. 基本資料及作業範圍","text":"進口與出口的收款作業,在地與 ICBO 如何分工?","multi":false,"options":["全部由在地處理","收款在地、銷帳由 ICBO 集中處理","收款與銷帳皆由 ICBO 集中,在地僅聯繫客戶","進口與出口分工不同"],"other":true,"required":true,"subOnly":true},
  {"id":"A3","section":"A. 基本資料及作業範圍","text":"收款與銷帳由哪些單位負責?","multi":true,"options":["YMA-NJ","LAX office","ICBO-DSA","ICBO-NSA","HSC"],"other":true,"required":true,"subOnly":true},
  {"id":"A4","section":"A. 基本資料及作業範圍","text":"日班與夜班如何分工及交接?","multi":false,"options":["無日夜班分工","有分工,書面交接並以系統追蹤","有分工,僅以 Email / 口頭交接","有分工,無交接機制"],"other":false,"required":true,"subOnly":true},
  {"id":"A5","section":"A. 基本資料及作業範圍","text":"每月帳單數約為多少?","multi":false,"options":["未滿 500","500–2,000","2,001–5,000","5,001–10,000","10,001–50,000","超過 50,000"],"other":false,"required":false,"subOnly":true},
  {"id":"A6","section":"A. 基本資料及作業範圍","text":"每月收款及銷帳筆數約為多少?","multi":false,"options":["未滿 500","500–2,000","2,001–5,000","5,001–10,000","10,001–50,000","超過 50,000"],"other":false,"required":false,"subOnly":true},
  {"id":"A7","section":"A. 基本資料及作業範圍","text":"目前 Outstanding 金額(USD)約為多少?","multi":false,"options":["未滿 100 萬","100–500 萬","501–1,000 萬","1,001–5,000 萬","超過 5,000 萬"],"other":false,"required":false,"subOnly":true},
  {"id":"B1","section":"B. 應收帳款及帳單開立","text":"應收帳款於哪一個作業時點成立?","multi":false,"options":["訂艙","開船","到港","Arrival Notice","提單","Draft","Invoice / Due Bill 開立時"],"other":true,"required":true,"subOnly":false},
  {"id":"B2","section":"B. 應收帳款及帳單開立","text":"應收帳款資料來源(含 Manifest 與 Non-Manifest / Local Charge 建檔)使用哪些系統?","multi":true,"options":["AFSYS","ILIS","YMGA","Web AR","Local System(當地系統)","ICES/FRNA","Excel","人工輸入"],"other":true,"required":true,"subOnly":false},
  {"id":"B3","section":"B. 應收帳款及帳單開立","text":"發票 / 帳單依何種層級開立?","multi":false,"options":["客戶別","航次別","提單別","客戶別 + 航次別"],"other":true,"required":true,"subOnly":false},
  {"id":"B4","section":"B. 應收帳款及帳單開立","text":"進口與出口的發票 / 帳單,由誰、以何種方式開立?","multi":false,"options":["在地以系統自動產出","在地以 Excel / 手工開立","ICBO 集中開立","進口與出口方式不同"],"other":true,"required":true,"subOnly":false},
  {"id":"B5","section":"B. 應收帳款及帳單開立","text":"帳單是否有獨立編號?若無,以什麼作為辨識及付款依據?","multi":false,"options":["有獨立發票編號","無,以 Arrival Notice(A/N)代替","無,以 B/L copy 代替","無,以 B/L No. 或 Booking No."],"other":true,"required":true,"subOnly":false},
  {"id":"B6","section":"B. 應收帳款及帳單開立","text":"Due Date(含授信客戶)如何計算?","multi":true,"options":["依合約約定","Invoice Date 加天數","開船日加天數","到港日加天數","月結","人工設定"],"other":true,"required":true,"subOnly":false},
  {"id":"B7","section":"B. 應收帳款及帳單開立","text":"帳單修改、重開或作廢時,是否保留原始資料及異動紀錄?","multi":false,"options":["系統自動完整保留","僅保留最新版本","以 Excel / Email 記錄","無紀錄"],"other":false,"required":true,"subOnly":false},
  {"id":"B8","section":"B. 應收帳款及帳單開立","text":"是否使用 Payment Center 傳輸發票及查詢付款狀態?","multi":false,"options":["全面使用(自動傳輸及查詢)","部分客戶使用","不使用"],"other":false,"required":false,"subOnly":false},
  {"id":"B9","section":"B. 應收帳款及帳單開立","text":"Non-Manifest / Local Charge 等特殊費用的開立及收款流程為何?","multi":false,"options":["與運費相同","另行開立,收款流程相同","開立與收款皆為獨立流程"],"other":true,"required":false,"subOnly":false},
  {"id":"B10","section":"B. 應收帳款及帳單開立","text":"每筆應收帳款可連結哪些資訊?","multi":true,"options":["B/L or Booking No.","Invoice / Due Bill No.","Customer Code","Charge Code","CNTR No. / Type","Currency / Amount","POR / POD","Due Date","Account Term","Account Type"],"other":true,"required":false,"subOnly":false},
  {"id":"C1","section":"C. 客戶付款及銀行入帳","text":"客戶可使用哪些付款方式?","multi":true,"options":["Cash","Wire Transfer","ACH","Check","Credit Card","第三方付款平台"],"other":true,"required":true,"subOnly":false},
  {"id":"C2","section":"C. 客戶付款及銀行入帳","text":"付款幣別規定為何?","multi":false,"options":["須與帳單幣別一致","可用不同幣別(依客戶)","Manifest 與 Non-Manifest 的付款幣別規定不同"],"other":true,"required":true,"subOnly":false},
  {"id":"C3","section":"C. 客戶付款及銀行入帳","text":"銀行入帳 / 交易明細如何取得?","multi":true,"options":["API","Bank File","Email","系統下載","人工查詢"],"other":true,"required":true,"subOnly":false},
  {"id":"C4","section":"C. 客戶付款及銀行入帳","text":"從客戶付款至可取得銀行入帳資料,通常需多久?","multi":false,"options":["當日","1 個工作天內","2–3 個工作天","4–7 個工作天","超過 7 個工作天"],"other":false,"required":true,"subOnly":false},
  {"id":"C5","section":"C. 客戶付款及銀行入帳","text":"銀行明細可提供哪些欄位?","multi":true,"options":["Value Date","Amount","Currency","Payer Name","Reference","Bank Account","Transaction ID"],"other":true,"required":true,"subOnly":false},
  {"id":"C6","section":"C. 客戶付款及銀行入帳","text":"客戶付款明細如何取得?","multi":true,"options":["Email","Remittance Advice","Payment Center","EDI","網銀通知","人工詢問"],"other":true,"required":true,"subOnly":false},
  {"id":"C7","section":"C. 客戶付款及銀行入帳","text":"客戶未提供付款明細時,如何辨識付款對象及帳款?","multi":true,"options":["依匯款人名稱","依金額比對","依銀行 Reference","聯絡客戶詢問","暫列未辨識款"],"other":true,"required":true,"subOnly":false},
  {"id":"C8","section":"C. 客戶付款及銀行入帳","text":"短付、溢付、已匯款未入帳或付款取消,如何追蹤?","multi":false,"options":["系統追蹤","Excel 清單","Email 追蹤","無追蹤"],"other":false,"required":true,"subOnly":false},
  {"id":"D1","section":"D. 核對、銷帳及退款","text":"哪些單位負責核對銀行入帳與客戶付款明細並銷帳?","multi":true,"options":["本地財務/會計","本地業務/客服","ICBO 集中處理","總部 FRMD","區域辦公室"],"other":true,"required":true,"subOnly":false},
  {"id":"D2","section":"D. 核對、銷帳及退款","text":"比對條件為何?(付款明細通常包含的資訊)","multi":true,"options":["B/L","Invoice No.","Customer Code","金額","幣別","付款 Reference","Charge Item"],"other":true,"required":true,"subOnly":false},
  {"id":"D3","section":"D. 核對、銷帳及退款","text":"款項比對及銷帳的主要方式為何?","multi":false,"options":["系統自動","系統輔助、人工確認","以 Excel 為主","全人工"],"other":false,"required":true,"subOnly":false},
  {"id":"D4","section":"D. 核對、銷帳及退款","text":"系統目前支援哪些比對 / 銷帳方式?","multi":true,"options":["一對一","一對多","多對一","部分付款","皆不支援(以 Excel / 人工處理)"],"other":false,"required":true,"subOnly":false},
  {"id":"D5","section":"D. 核對、銷帳及退款","text":"無法辨識、預收、短付、溢付、折讓或減免款項,如何處理?","multi":true,"options":["暫列未辨識款","暫列預收款","小額自動沖銷(Waive)","核准後調整","抵扣其他 Outstanding","退回客戶","以 Excel 列管"],"other":true,"required":true,"subOnly":false},
  {"id":"D6","section":"D. 核對、銷帳及退款","text":"取得銀行入帳 / 付款明細後,通常多久完成核對及銷帳?","multi":false,"options":["當日","1 個工作天內","2–3 個工作天","4–7 個工作天","超過 7 個工作天"],"other":false,"required":true,"subOnly":false},
  {"id":"D7","section":"D. 核對、銷帳及退款","text":"銷帳日期以何時點為準?","multi":false,"options":["銀行入帳日","Value Date","取得收款明細日","實際完成銷帳日"],"other":true,"required":false,"subOnly":false},
  {"id":"D8","section":"D. 核對、銷帳及退款","text":"銷帳完成後,Outstanding、放貨 / 放單狀態及 LFC 資料是否同步更新?","multi":false,"options":["全部同步自動更新","部分同步,其餘人工更新","皆人工更新"],"other":false,"required":true,"subOnly":false},
  {"id":"D9","section":"D. 核對、銷帳及退款","text":"銷帳錯誤、或需跨 B/L / 帳單 / 客戶沖帳時,如何處理並追溯?","multi":false,"options":["系統 Reverse 重銷,並保留完整紀錄","系統支援但紀錄不完整","人工調整(Excel)","須總部核准後調整"],"other":true,"required":true,"subOnly":false},
  {"id":"D10","section":"D. 核對、銷帳及退款","text":"退款的核准層級及流程為何?","multi":false,"options":["代理行主管核准","區域主管核准","總部核准","依金額分級核准"],"other":true,"required":false,"subOnly":false},
  {"id":"E1","section":"E. 催收、爭議、高風險客戶","text":"Outstanding Report 如何產生及更新?","multi":false,"options":["系統每日自動產生","系統每週產生","Excel 每月彙整","不定期"],"other":false,"required":true,"subOnly":false},
  {"id":"E2","section":"E. 催收、爭議、高風險客戶","text":"Outstanding Aging 以什麼為計算基準?","multi":false,"options":["Invoice Date","Sailing Date","Arrival Date","Due Date"],"other":true,"required":true,"subOnly":false},
  {"id":"E3","section":"E. 催收、爭議、高風險客戶","text":"催收頻率及主要方式為何?","multi":false,"options":["每週以上,Email / Statement","每週以上,電話","每月","逾期後才催收","不定期"],"other":true,"required":true,"subOnly":false},
  {"id":"E4","section":"E. 催收、爭議、高風險客戶","text":"催收紀錄放在哪裡?","multi":false,"options":["系統記錄","Excel","Email","無記錄"],"other":false,"required":true,"subOnly":false},
  {"id":"E5","section":"E. 催收、爭議、高風險客戶","text":"爭議款項常見的原因有哪些?","multi":true,"options":["Rate Dispute","Invoice Error","Duplicate Charge","Missing Document","Claim","Short Pay"],"other":true,"required":true,"subOnly":false},
  {"id":"E6","section":"E. 催收、爭議、高風險客戶","text":"爭議案件是否有標準原因類型、處理時限、責任單位及提醒機制?","multi":false,"options":["皆已建立並系統追蹤","部分建立","未建立"],"other":false,"required":false,"subOnly":false},
  {"id":"E7","section":"E. 催收、爭議、高風險客戶","text":"已收款但尚未銷帳的款項,是否仍列為 Outstanding?","multi":false,"options":["仍列入並標註","仍列入但未標註","不列入"],"other":true,"required":false,"subOnly":false},
  {"id":"E8","section":"E. 催收、爭議、高風險客戶","text":"高風險客戶(如黑名單)如何管理?","multi":false,"options":["有名單,系統註記並自動限制","有名單,系統註記但不限制","有名單,以 Excel 管理","無名單"],"other":false,"required":true,"subOnly":false},
  {"id":"F1","section":"F. 放貨 / 放單","text":"放貨 / 放單前需確認哪些條件?","multi":true,"options":["銀行入帳","完成銷帳","信用額度內","無逾期帳款","主管核准"],"other":true,"required":true,"subOnly":false},
  {"id":"F2","section":"F. 放貨 / 放單","text":"Cash、Credit、Central Billing、Non-hold 客戶的放行條件是否不同?","multi":false,"options":["有書面規定","有慣例但無書面","無差異"],"other":false,"required":false,"subOnly":false},
  {"id":"F3","section":"F. 放貨 / 放單","text":"款項須到哪個階段才可解除 Hold?","multi":false,"options":["銀行入帳","完成款項核對","完成銷帳"],"other":true,"required":true,"subOnly":false},
  {"id":"F4","section":"F. 放貨 / 放單","text":"授信客戶的信用額度及逾期,如何檢核及定期檢視?","multi":false,"options":["系統自動檢核並定期檢視","系統檢核額度,不定期檢視","人工查詢","無檢核機制"],"other":false,"required":true,"subOnly":false},
  {"id":"F5","section":"F. 放貨 / 放單","text":"緊急放貨、Non-Hold 或部分付款 / 短付時放行,如何核准及記錄?","multi":false,"options":["須核准並系統記錄","須核准,以 Email / Excel 記錄","無核准規定"],"other":false,"required":false,"subOnly":false},
  {"id":"G1","section":"G. 第三地付款","text":"第三地付款通常在哪些情況下發生?","multi":true,"options":["客戶委託第三方付款","貨主與付款人不同","運費到付轉付","當地外匯規定"],"other":true,"required":true,"subOnly":false},
  {"id":"G2","section":"G. 第三地付款","text":"第三地付款每月平均筆數約為多少?","multi":false,"options":["未滿 10","10–50","51–200","201–500","超過 500"],"other":false,"required":false,"subOnly":false},
  {"id":"G3","section":"G. 第三地付款","text":"如何確認付款人、實際應收客戶及對應 B/L 和 Invoice?","multi":true,"options":["付款證明","客戶書面確認","銀行資料","付款 Reference"],"other":true,"required":true,"subOnly":false},
  {"id":"G4","section":"G. 第三地付款","text":"無法即時確認付款人或帳款歸屬時,如何處理?","multi":false,"options":["暫掛未辨識款並暫停放貨","暫掛未辨識款但可放貨","確認前不收款 / 退回","依情況個案處理"],"other":true,"required":true,"subOnly":false},
  {"id":"H1","section":"H. LFC 報收及匯款","text":"LFC 資料由哪個系統產生?","multi":true,"options":["AFSYS","YMGA","Web AR","Local System(當地系統)","Excel"],"other":true,"required":true,"subOnly":false},
  {"id":"H2","section":"H. LFC 報收及匯款","text":"LFC 檔案包含哪些收入項目類別?","multi":true,"options":["Manifest","Non-Manifest","Local Charge"],"other":true,"required":false,"subOnly":false},
  {"id":"H3","section":"H. LFC 報收及匯款","text":"LFC 報收頻率為何?","multi":false,"options":["每日","每週 1 次","每週 2 次","每週 3 次以上","每月"],"other":true,"required":true,"subOnly":false},
  {"id":"H4","section":"H. LFC 報收及匯款","text":"LFC 報收以何時點作為認列依據?","multi":false,"options":["客戶入帳日","完成銷帳日"],"other":true,"required":true,"subOnly":false},
  {"id":"H5","section":"H. LFC 報收及匯款","text":"LFC 是否可追溯至 B/L、Invoice、付款及銷帳紀錄,並與前端核對?","multi":false,"options":["系統可追溯並自動核對","可追溯,人工核對","僅部分可追溯","無法追溯"],"other":false,"required":true,"subOnly":false},
  {"id":"H6","section":"H. LFC 報收及匯款","text":"匯款至總部的核准流程為何?","multi":false,"options":["單人核准","雙人覆核","區域 / 總部核准"],"other":true,"required":false,"subOnly":false},
  {"id":"H7","section":"H. LFC 報收及匯款","text":"不同幣別間使用何種匯率?","multi":true,"options":["航次匯率","每月平均匯率","收款日匯率","匯款日匯率","銀行實際買匯匯率"],"other":true,"required":true,"subOnly":false},
  {"id":"H8","section":"H. LFC 報收及匯款","text":"匯率差異及匯兌盈損如何處理?","multi":false,"options":["代理行認列","回報總部認列","調整收入","人工調整"],"other":true,"required":true,"subOnly":false}
];

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

  Logger.log('填寫連結(給夥伴): ' + form.getPublishedUrl());
  Logger.log('編輯連結(僅限你): ' + form.getEditUrl());
}
