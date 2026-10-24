// 教學實測問卷題庫：survey.html（填答）與 survey_stats.html（統計）共用
// 題目內容對應 ../data/教學實測問卷.md；修改題目時兩邊一起改
// 選項依序為 A、B、C、D；ans 是正確選項。畫面上會打亂選項順序，但 CSV 一律記原始字母

const QUIZ = [
    { id: 'Q1', mod: '問答轉盤', q: '依職業安全衛生設施規則，高度幾公尺以上的高處作業，應設置護欄或使用安全帶等防墜措施？',
      opts: ['1 公尺', '2 公尺', '3 公尺', '5 公尺'], ans: 'B' },
    { id: 'Q2', mod: '問答轉盤', q: '員工在工作中遭同事辱罵或被顧客騷擾，屬於職業安全衛生法要求雇主預防的哪一類危害？',
      opts: ['人因性危害', '異常工作負荷', '執行職務遭受不法侵害', '化學性危害'], ans: 'C' },
    { id: 'Q3', mod: 'VR 導覽', q: '避難時發現前方防火捲門已經放下，正確做法是？',
      opts: ['改走捲門旁邊的防火門', '從捲門下方縫隙鑽過去', '原地等捲門升起', '用力把捲門往上推'], ans: 'A' },
    { id: 'Q4', mod: 'VR 導覽', q: '地下停車場發生火災時，應該怎麼離開？',
      opts: ['沿著汽車車道往外走', '回到車上開車離開', '依出口標示走安全梯', '搭電梯到地面層'], ans: 'C' },
    { id: 'Q5', mod: '疏散動線', q: '球場位在地下的場館，場地與下層觀眾避難時有什麼特性？',
      opts: ['往下走，所以比上層快', '可以留在原地等待救援', '一律搭電梯離開', '必須向上避難，比往下走慢也更累'], ans: 'D' },
    { id: 'Q6', mod: '疏散動線', q: '某一區疏散時間超過目標，最直接的改善方式是？',
      opts: ['減少出口數量', '加寬看台出口與疏散路線', '延後疏散廣播', '關閉通道照明'], ans: 'B' },
    { id: 'Q7', mod: '人流模擬', q: '比較「全場同時撤離」與「分區分批廣播」，模擬結果最接近哪一項？',
      opts: ['總時間差不多，但危險的擁擠擠壓明顯減少', '分批廣播使總時間大幅延長', '兩者完全沒有差別', '分批廣播造成更嚴重的擁擠'], ans: 'A' },
    { id: 'Q8', mod: '人流模擬', q: '觀眾恐慌、用衝的往出口跑，會發生什麼事？',
      opts: ['全部到達戶外的時間縮短', '只有前排觀眾變快', '出口前擠成一團，反而更慢', '沒有影響'], ans: 'C' },
    { id: 'Q9', mod: 'AIoT 偵測', q: '「差動式」火警探測器在什麼情況下動作？',
      opts: ['溫度超過固定門檻', '溫度上升速度過快', '煙霧濃度過高', '一氧化碳濃度過高'], ans: 'B' },
    { id: 'Q10', mod: 'AIoT 偵測', q: '烤焦吐司常造成火警誤報，下列哪一種做法能降低誤報、又不容易漏報真正的火災？',
      opts: ['把偵測器拆掉', '把所有門檻調到最高', '只看溫度不看煙', '要求異常持續一段時間，或多項感測同時異常才發警報'], ans: 'D' },
    { id: 'Q11', mod: '醫院戰情', q: '醫院火災應變 R.A.C.E. 的正確順序是？',
      opts: ['通報 → 救援 → 疏散 → 侷限', '疏散 → 通報 → 救援 → 侷限', '侷限 → 救援 → 通報 → 疏散', '救援 → 通報 → 侷限 → 疏散'], ans: 'D' },
    { id: 'Q12', mod: '醫院戰情', q: '病房起火時，對無法自行行動的病人，優先的避難方式是？',
      opts: ['水平移到同一層、以防火門區隔的安全區劃', '立刻搭電梯送到一樓', '留在病房內等待救援', '往頂樓移動'], ans: 'A' },
    { id: 'Q13', mod: '倉儲戰情', q: '天花板很高（例如 12 公尺）的倉庫，起火初期的煙可能會怎樣？',
      opts: ['很快到達天花板，偵煙器立刻動作', '全部沉到地面', '停留在半空中，天花板上的點型偵煙器較晚偵測到', '自動從屋頂散出，不影響偵測'], ans: 'C' },
    { id: 'Q14', mod: '倉儲戰情', q: '2023 年屏東明揚火災後，消防法修正要求工廠與倉庫失火時，業者應該？',
      opts: ['馬上提供化學品種類、數量、位置，並派人到場協助', '先自行滅火再通報', '封鎖現場等待調查', '只需通報 119'], ans: 'A' },
];

const LIKERT = [
    { id: 'E1', dim: '易用性', q: '平台的操作方式容易理解' },
    { id: 'E2', dim: '易用性', q: '使用說明頁幫助我很快上手' },
    { id: 'E3', dim: '易用性', q: '平台在手機或電腦上都能順利操作' },
    { id: 'M1', dim: '學習投入', q: '問答轉盤的分組競賽讓我更專心參與' },
    { id: 'M2', dim: '學習投入', q: 'VR 導覽與避難體驗讓我有身歷其境的感覺' },
    { id: 'M3', dim: '學習投入', q: '比起只聽講解，我更喜歡用互動模擬學習' },
    { id: 'U1', dim: '知覺有用性', q: '平台幫助我辨識職場與公共場所的危害' },
    { id: 'U2', dim: '知覺有用性', q: '平台讓我理解出口寬度與人群密度對疏散的影響' },
    { id: 'U3', dim: '知覺有用性', q: '平台讓我理解火警偵測器如何判斷火災與避免誤報' },
    { id: 'R1', dim: '推廣意願', q: '我會想再使用這個平台學習' },
    { id: 'R2', dim: '推廣意願', q: '我願意推薦這個平台給其他同學或朋友' },
    { id: 'R3', dim: '推廣意願', q: '我認為這個平台適合用於學校或社區的防災宣導' },
];
const LIKERT_LABELS = ['非常不同意', '不同意', '普通', '同意', '非常同意'];

// 實測對象：國三社團與多元課程學生、五專一至三年級學生
const ROLES = ['國三（社團／多元課程）', '五專一年級', '五專二年級', '五專三年級', '其他'];
const MODULES =['問答轉盤', 'VR 導覽', '疏散動線計算', '人流模擬', 'AIoT 偵測', '醫院戰情中心', '倉儲戰情室'];
const DEVICES = ['電腦', '手機', '平板', 'VR 眼鏡'];

// CSV 欄位：前測與後測各一種格式
const QIDS = QUIZ.map(x => x.id);
const COLS = {
    pre:  ['時間', '表單', '代碼', '身分', '科別或社團', '消防訓練經驗', 'VR經驗', ...QIDS],
    post: ['時間', '表單', '代碼', '身分', ...QIDS, ...LIKERT.map(x => x.id), 'O1', 'O2', 'O3', 'O4'],
};
const FORM_NAME = { pre: '前測', post: '後測' };

// CSV 工具：欄位含逗號、引號或換行時加上引號
function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(cols, rows) {
    return '﻿' + [cols, ...rows.map(r => cols.map(c => r[c]))].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) {
            if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += ch;
        } else if (ch === '"') q = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift() || [];
    return rows.filter(r => r.some(c => c !== '')).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}
function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
