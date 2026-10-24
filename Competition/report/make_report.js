const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, SectionType, Footer,
  PageNumber, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak, ImageRun,
} = require('docx');

const FONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '標楷體', cs: 'Times New Roman' };
const OUT = process.argv[2];

const r = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 24, bold: o.bold, color: o.color, highlight: o.hl });
const todo = (text) => r(`【待補：${text}】`, { color: 'C00000' });
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [r(runs, o)],
  alignment: o.align || AlignmentType.JUSTIFIED,
  indent: o.noIndent ? undefined : { firstLine: 480 },
  spacing: { line: 240, before: o.before || 0, after: o.after || 0 },
});
const center = (runs, o = {}) => p(runs, { ...o, align: AlignmentType.CENTER, noIndent: true });
const h1 = (t) => center([r(t, { bold: true })], { before: 200, after: 100 });
const h2 = (t) => p([r(t, { bold: true })], { noIndent: true, align: AlignmentType.LEFT, before: 100 });
const blank = () => new Paragraph({ children: [r('')] });

// 兩欄寬度：A4 11906 - 左右 1418*2 = 9070，欄距 425 → 每欄約 4322
const COLW = 4300;
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (t, w, head) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders,
  shading: head ? { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined,
  margins: { top: 40, bottom: 40, left: 60, right: 60 },
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [r(t, { size: 18, bold: head })] })],
});
const widths = [700, 2300, 1300];
const rows = [
  ['層次', '模組', '負責'],
  ['認知', '職業安全問答轉盤、看圖找危害', '學生1'],
  ['場域', '大巨蛋 360° VR 防災安全導覽', '學生2'],
  ['場域', '疏散動線計算、大規模集客動態模擬', '學生3'],
  ['智慧', 'AIoT 消防安全模擬系統', '學生4'],
  ['智慧', '醫院智慧消防戰情中心', '學生5'],
  ['智慧', '智慧倉儲物流中心戰情室', '學生6'],
  ['整合', '首頁、課程路線、使用說明', '指導老師'],
];
const moduleTable = new Table({
  width: { size: COLW, type: WidthType.DXA }, columnWidths: widths,
  rows: rows.map((row, i) => new TableRow({ children: row.map((t, j) => cell(t, widths[j], i === 0)) })),
});

const mkTable = (widths, data) => new Table({
  width: { size: COLW, type: WidthType.DXA }, columnWidths: widths,
  rows: data.map((row, i) => new TableRow({ children: row.map((t, j) => cell(t, widths[j], i === 0)) })),
});
// 表2：simulate2 演唱會 55,000 人緊急疏散，每情境 5 次平均（data/modules/simulate2）
const evacTable = mkTable([1420, 720, 720, 720, 720], [
  ['情境', '全員離席(分)', '全員到戶外(分)', '最大局部密度(人/m²)', 'LOS F 累計(秒)'],
  ['全場同時撤離', '9.2', '11.2', '8.6', '279'],
  ['分區分批廣播', '9.5', '11.0', '5.5', '16'],
  ['恐慌推擠', '15.7', '17.7', '12.3', '597'],
  ['出口寬度 1.5 倍', '7.8', '8.6', '7.2', '135'],
  ['封鎖上層北側出口', '13.6', '15.5', '8.6', '506'],
]);
// 表3：aiot 5 種情境（3 種火災、2 種非火災），每種設定各 5 次，共 25 次（data/modules/aiot）
const alarmTable = mkTable([1500, 640, 640, 640, 880], [
  ['判定設定', '正確偵測', '誤報', '漏報', '火災平均警報(秒)'],
  ['任一條件／0 秒', '15', '10', '0', '66'],
  ['任一條件／25 秒', '15', '5', '0', '91'],
  ['兩項交叉／0 秒', '15', '0', '0', '94'],
  ['兩項交叉／25 秒', '15', '0', '0', '119'],
]);
const fig1 = new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
  new ImageRun({ type: 'png', data: fs.readFileSync(require('path').join(__dirname, 'fig1_report.png')), transformation: { width: 280, height: 451 } }),
] });
const resultWidths = [1500, 1400, 1400];
const resultTable = new Table({
  width: { size: COLW, type: WidthType.DXA }, columnWidths: resultWidths,
  rows: [
    ['疏散策略', '全員到達戶外時間', '最大密度(人/m²)'],
    ['全場同時撤離', '待補', '待補'],
    ['分區分批廣播', '待補', '待補'],
  ].map((row, i) => new TableRow({ children: row.map((t, j) => cell(t, resultWidths[j], i === 0)) })),
});

const margin = { top: 1418, bottom: 1418, left: 1418, right: 1418 };
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] });

// ── 封面（附件4）
const check = (on, t) => `${on ? '■' : '□'}${t}`;
const cover = {
  properties: { page: { margin } },
  children: [
    blank(), blank(),
    center([r('大仁科技大學學生實務專題製作競賽', { size: 36, bold: true })]),
    center([r('研究成果報告書', { size: 36, bold: true })], { after: 600 }),
    blank(), blank(),
    center([r('作品名稱：消防與職業安全教育互動推廣平台', { size: 32, bold: true })]),
    blank(), blank(), blank(), blank(),
    p([r('參賽領域：', { size: 28 }), r(check(false, '智慧健康與照護創新'), { size: 28 })], { noIndent: true, align: AlignmentType.LEFT }),
    p([r('　　　　　', { size: 28 }), r(check(true, '數位科技與人文創新'), { size: 28 })], { noIndent: true, align: AlignmentType.LEFT }),
    p([r('　　　　　', { size: 28 }), r(check(false, '環境永續與地方經濟'), { size: 28 })], { noIndent: true, align: AlignmentType.LEFT }),
    blank(), blank(), blank(),
    p([r('學校：大仁科技大學', { size: 28 })], { noIndent: true }),
    blank(),
    p([r('科系：', { size: 28 }), todo('科系')], { noIndent: true }),
    blank(),
    p([r('指導老師：', { size: 28 }), todo('指導老師姓名')], { noIndent: true }),
    blank(),
    p([r('組員：', { size: 28 }), todo('六位組員姓名')], { noIndent: true }),
    blank(), blank(), blank(),
    center([r('中華民國115年　　月　　日', { size: 28 })]),
  ],
};

// ── 題目與作者（不分欄）
const head = {
  properties: { page: { margin, pageNumbers: { start: 1 } } },
  footers: { default: footer },
  children: [
    center([r('消防與職業安全教育互動推廣平台', { size: 28, bold: true })], { after: 120 }),
    center([r('大仁科技大學')]),
    center([todo('指導老師姓名'), r(' 老師')]),
    center([todo('系所 職稱')]),
    center([todo('組員1、組員2、組員3、組員4、組員5、組員6')]),
    center([todo('系所')], { after: 200 }),
  ],
};

// ── 內文（兩欄）
const body = {
  properties: { type: SectionType.CONTINUOUS, page: { margin }, column: { count: 2, space: 425 } },
  footers: { default: footer },
  children: [
    h1('摘要'),
    p('本平台的教學對象為消防安全科及環境與職業安全衛生科五專一至三年級學生，以及參與社團與多元課程的國中三年級學生；後者也是平台建置的起點，希望藉由國中端的多元教學推廣兩科、吸引學生就讀。國中生對消防與環境安全衛生專業的認識有限，傳統的簡章與簡報也難以呈現科系實際學習的內容。此外，大型場館、醫院與物流倉儲一旦發生火災，常造成重大傷亡，而現行消防與職業安全教育多以講授與靜態圖片為主，學生不易將法規與設備知識轉換為現場判斷能力。本團隊開發「消防與職業安全教育互動推廣平台」，以純網頁技術整合七個互動模擬，依「認知、場域、智慧」三個層次規劃學習路線：以遊戲化問答轉盤與看圖找危害建立危害辨識能力；以臺北大巨蛋為情境，透過 360° VR 導覽、疏散動線計算與數萬人人流模擬，理解大型場館的消防設備與避難規劃；再以 AIoT 火警偵測模擬延伸至醫院與倉儲的監測、連動與案例回顧。平台免安裝，可在電腦、手機與 VR 眼鏡上操作，每個模擬均附圖解使用說明，國中生與五專低年級學生第一次使用也能自行上手。'),
    p([r('經實際測試，'), todo('實測對象、人數與主要成果數據'), r('。本平台可作為國中社團與多元課程推廣兩科的教材，也是五專一至三年級的專業入門教材，並可推廣至其他學校與場館的防災宣導。')]),
    p([r('關鍵詞：', { bold: true }), r('消防安全教育、職業安全、遊戲化學習、虛擬實境、人流模擬、AIoT')], { noIndent: true }),

    h1('1. 前言'),
    h2('1.1 平台建置的起點與教學對象'),
    p('本平台最初是為了消防安全科及環境與職業安全衛生科的招生推廣而建置，第一個對象是參與社團與多元課程的國中三年級學生。國三學生在會考前後必須決定升學的學校與科別，但多數學生對消防與環境安全衛生專業的印象，僅止於消防車、救火或工地安全帽，並不清楚這兩個科系實際學習的內容，例如職場危害辨識、建築物避難設計、群眾疏散規劃與火警偵測系統，也難以想像畢業後的職涯發展。'),
    p([r('招生的困難也反映在本專題的實測中：參與實測的五專三年級學生共'), todo('總人數'), r('人，其中屬於本科的環境與職業安全衛生科學生僅'), todo('本科人數'), r('人，其餘為他科學生。')]),
    p('傳統的招生宣傳多仰賴簡章、海報與簡報，資訊以單向傳遞為主，不易引起國中生的興趣，也難以呈現科系的專業特色。因此，本團隊希望在國中的社團活動與多元課程中，讓國中生用手機或 VR 眼鏡「玩」幾分鐘，就能親身體驗消防與環境安全衛生專業在做什麼：在轉盤競賽中找出工作場所的危害，走進大巨蛋在濃煙中找出口，或觀察火警偵測器如何判斷真火與誤報。'),
    p('平台的第二個對象是兩科五專一至三年級學生。五專前三年是建立專業基礎的階段，學生剛從國中進入專業領域，需要先理解危害辨識、避難疏散與火警偵測等核心概念，再銜接高年級的專業課程與實務。同一套平台在國中多元課程中是「體驗」，入學後則可在五專課堂中「深化」：例如以疏散計算器調整出口寬度並分析瓶頸，或依 Arduino 與 Node-RED 教材接上實體感測器。'),
    p('基於這兩類對象，平台的設計原則是：免安裝、手機即可開啟；單一活動可在數分鐘內完成；介面與說明使用國中生也能理解的語言，並以遊戲化的計分、限時與分組競賽提高參與感，同時保留可供五專學生深入操作的參數與教材。讓國中生在體驗中認識科系所學與未來職涯，進而提升就讀意願，是本平台的主要訴求目標；入學後延續使用同一平台，則讓招生體驗與在校學習銜接。'),
    h2('1.2 公共安全教育的需求'),
    p('近年國內數起重大火災凸顯公共安全教育的重要性：2018 年臺北醫院護理之家火災造成多名住民死亡，突顯醫療場所水平避難與初期應變的困難；2023 年屏東明揚國際科技公司火災則造成多名消防人員殉職，顯示大型廠倉的火災偵測、資訊傳遞與搶救安全仍有改善空間。另一方面，臺北大巨蛋等可容納數萬人的大型場館啟用後，大量群眾的進場、散場與緊急疏散也成為新的公安課題。'),
    p('然而，傳統的消防與職安教學多以講授、法規條文與靜態圖片為主，學生難以親身體會濃煙中尋找出口、人群在出口前壅塞，或偵測器誤報與漏報的取捨。因此，本專題以互動模擬與遊戲化設計，讓學生在安全的數位環境中反覆練習觀察、判斷與應變。'),

    h1('2. 研究目的'),
    p('本專題的目的如下：'),
    p([r('(1) 主要目標：透過國中三年級社團與多元課程推廣消防安全科及環境與職業安全衛生科，讓國中生以互動體驗認識科系所學與職涯發展，提升就讀意願。', { bold: true })], { noIndent: true }),
    p('(2) 作為兩科五專一至三年級學生的專業入門教材，銜接國中體驗與五專專業學習。', { noIndent: true }),
    p('(3) 建立一套免安裝、跨裝置、國中生與五專學生皆能自行上手的消防與職業安全互動平台。', { noIndent: true }),
    p('(4) 以遊戲化設計提升學生辨識職場與公共場所危害的動機與能力。', { noIndent: true }),
    p('(5) 以大型場館為情境，讓學生理解消防設備、避難動線與群眾密度對疏散的影響。', { noIndent: true }),
    p('(6) 讓學生理解 AIoT 火警偵測的原理、誤報控制與設備連動，並連結真實火災案例。', { noIndent: true }),
    p('(7) 分別以國中三年級與五專一至三年級學生進行實測，驗證平台的學習成效與招生推廣價值。', { noIndent: true }),

    h1('3. 文獻探討'),
    h2('3.1 遊戲化學習'),
    p('遊戲化是將遊戲設計元素應用於非遊戲情境 [1]，計分、限時與分組競賽等機制可提高學習參與度。在安全教育上，Chittaro 與 Buttussi 比較沉浸式嚴肅遊戲與傳統安全須知卡，發現遊戲組一週後的安全知識保留較佳，學習投入感也較高 [2]。'),
    h2('3.2 虛擬實境防災訓練'),
    p('虛擬實境能在不暴露於真實危險的情況下，讓學習者體驗火災與避難情境。Feng 等人系統性回顧沉浸式虛擬實境嚴肅遊戲在疏散訓練與研究上的應用 [3]；Buttussi 與 Chittaro 則發現，無論使用何種顯示裝置，虛擬實境安全訓練都能提升學習者的知識與自我效能，顯示類型主要影響臨場感 [4]。這也支持本平台同時支援手機與 VR 眼鏡的設計。'),
    h2('3.3 群眾疏散與服務水準'),
    p('Fruin 以每平方公尺人數定義行人服務水準 [5]；Helbing 等人以社會力模型模擬恐慌情境下的群眾行為，指出出口前壅塞會使疏散效率下降，出現「越急越慢」的現象 [6]。本平台的人流模擬即以群眾密度與服務水準作為觀察指標。'),
    h2('3.4 火警偵測與誤報'),
    p('依「各類場所消防安全設備設置標準」[7]，火警探測器分為定溫式、差動式、偵煙式等類型。單一感測器容易因炊煙、水蒸氣等因素誤報。Fonollosa 等人的回顧指出，一氧化碳等氣體感測可比煙霧更早預警，但需結合多變量演算法，才能兼顧靈敏度與抗誤報 [8]；Zervas 等人則以多感測器資料融合提升火災偵測的可靠度 [9]。本平台的 AIoT 模組即讓學生比較單一條件與多條件交叉確認的差異。'),

    h1('4. 研究方法'),
    h2('4.1 系統架構'),
    p('平台以 HTML、CSS 與 JavaScript 開發，所有模擬皆在瀏覽器中執行，不需安裝軟體，可直接以電腦、手機或 VR 眼鏡開啟。平台依學習層次分為三層（如圖1），首頁提供建議上課順序，引導學生由淺入深學習。'),
    fig1,
    center([r('圖1. 平台三層架構圖', { size: 20 })], { after: 120 }),
    h2('4.2 模組設計與分工'),
    p('本團隊六名學生各負責一個模組的開發，指導老師負責平台整合與展示，分工如表1。'),
    center([r('表1. 模組與分工', { size: 20 })], { before: 120 }),
    moduleTable,
    p('', { noIndent: true, after: 120 }),
    h2('4.3 認知層：職業安全問答轉盤'),
    p('分組輪流轉動轉盤抽題，在限時內於圖片中圈出危害，系統自動判定並計分，最後逐一揭曉答案與相關法規。題庫共 10 題，包含 8 個行業的職業安全情境，以及商場通道、地下停車場 2 題建築物公共安全情境。'),
    h2('4.4 場域層：臺北大巨蛋公安模擬'),
    p('(1) VR 防災安全導覽：學生進入球場層、通道商場與地下停車場三個場景，可選擇設備導覽並作答、扮演檢查員找出藏在場景中的公安缺失，或在濃煙下降前找到正確出口，學習紀錄可下載為 CSV。'),
    p('(2) 疏散動線與避難時間：在動線圖上計算避難時間、找出疏散瓶頸，並以剖面圖說明向上避難的原理。'),
    p('(3) 大規模集客動態模擬：模擬數萬名觀眾在緊急疏散、散場搭捷運與進場三種模式下的人流，比較全場同時撤離與分區分批廣播的差異，並觀察群眾密度與服務水準。'),
    h2('4.5 智慧層：AIoT 火警偵測'),
    p('(1) AIoT 消防安全模擬系統：以滑桿或 5 種情境比較定溫式、差動式與煙霧／CO 偵測的反應時機，調整判定方式與持續秒數以降低誤報，並提供 Arduino 與 Node-RED 實作教材，可連接實體 Arduino。'),
    p('(2) 醫院智慧消防戰情中心：同時監測病房、氧氣室與 ICU 熱影像，練習確認、復歸與誤報處理，並在 7 樓演練中依 R.A.C.E. 原則將病人水平避難，回顧 2018 年臺北醫院火災。'),
    p('(3) 智慧倉儲物流中心戰情室：以全倉熱力地圖搭配「兩項異常才發火警」的判定，比較高天花板下四種偵測方式，觀察撒水連動、人員清點與搶救資訊卡，回顧 2023 年屏東明揚火災。'),
    h2('4.6 教學實測設計'),
    p([r('本團隊於'), todo('施測日期'), r('，以五專三年級兩個班級進行實測：環境與職業安全衛生科學生'), todo('人數'), r('名（本科），以及寵物照護暨美容科學生'), todo('人數'), r('名（非本科）。非本科學生與國中生同樣缺乏消防與環境安全衛生的專業背景，其學習成效可作為平台推廣至國中多元課程的參考。學生依首頁建議順序使用平台，使用前後填寫相同的 14 題前後測，使用後另填寫 12 題五點量表與開放題回饋。'), todo('若採紙本施測，註明「採紙本問卷，事後人工輸入」')]),
    p([r('國中三年級社團或多元課程的實測（'), todo('學校、日期、人數；若未能於截止前完成，刪除本段'), r('）採用相同的前後測。')]),

    h1('5. 結果與討論'),
    h2('5.1 疏散策略模擬結果'),
    p('以大規模集客動態模擬，設定演唱會約 55,000 名觀眾進行緊急疏散，每種情境執行 5 次取平均，結果如表2。模型中每個點代表約 25 人，步行速度依周圍密度以 Weidmann 速度–密度關係計算；LOS F 累計為局部密度超過 5.38 人/m² 的累計秒數。'),
    center([r('表2. 疏散情境比較（5 次平均）', { size: 20 })], { before: 120 }),
    evacTable,
    p('', { noIndent: true, after: 120 }),
    p('分區分批廣播的全員到達戶外時間與全場同時撤離相近（11.0 與 11.2 分），但最大局部密度由 8.6 降至 5.5 人/m²，LOS F 累計時間由 279 秒大幅降至 16 秒，顯示分批疏散能在不延長疏散時間的前提下，明顯降低推擠風險。恐慌推擠則使疏散時間延長至 17.7 分，印證「越急越慢」[6]；封鎖一個上層出口即使到達戶外時間增加約 4.3 分，超過 15 分鐘的目標，說明大型場館需要足夠的出口備援。出口寬度加大 1.5 倍可縮短約 2.6 分。學生可在平台上自行重現這些比較，理解疏散規劃的關鍵因素。'),
    p('', { noIndent: true, after: 120 }),
    h2('5.2 火警判定與誤報'),
    p('以 AIoT 消防安全模擬系統的 5 種情境（垃圾桶陰燃、廚房油鍋起火、電線走火 3 種火災，烤焦吐司、開暖爐熱氣 2 種非火災），比較判定方式與持續秒數的影響。感測值含隨機雜訊，每種設定各執行 5 次，結果如表3。'),
    center([r('表3. 火警判定設定比較（各 25 次）', { size: 20 })], { before: 120 }),
    alarmTable,
    p('', { noIndent: true, after: 120 }),
    p('「任一條件」的反應最快，火災平均 66 秒即警報，但兩種非火災情境全部誤報。只延長持續秒數至 25 秒，可濾除短暫的烤吐司煙霧，卻無法排除只有升溫的暖爐。改為「至少兩項交叉確認」後，誤報降為 0 且無漏報，代價是平均警報時間延後約 28 秒。此結果讓學生具體看到靈敏度與誤報之間的取捨，也呼應倉儲模組「兩項異常才發火警」的設計 [8][9]。'),
    h2('5.3 教學實測成果'),
    p([todo('前後測成績比較、問卷滿意度、VR 學習紀錄統計（測驗答對率、缺失找到率、逃生成功率）、學生質性回饋')]),
    h2('5.4 結論與建議'),
    p('本平台以三層次學習路線整合七個互動模擬，將消防法規、設備知識與真實案例轉化為可操作的學習體驗。平台免安裝、跨裝置，國中生在社團與多元課程中可用手機在數分鐘內完成體驗，五專一至三年級學生則可在課堂中深入操作，題庫亦可自行增修。未來可擴充更多場所類型與題庫，並結合實體感測器建置校園示範場域，推廣至其他學校與場館的防災宣導。'),
    p([r('本平台的模擬數值皆為教學示意，不能取代經認證的消防設備與正式訓練。', { size: 20 })], { noIndent: true }),

    h1('參考文獻'),
    ...[
      '[1] Deterding, S., D. Dixon, R. Khaled and L. E. Nacke, “From game design elements to gamefulness: defining gamification,” Proceedings of the 15th International Academic MindTrek Conference, pp. 9-15 (2011).',
      '[2] Chittaro, L. and F. Buttussi, “Assessing knowledge retention of an immersive serious game vs. a traditional education method in aviation safety,” IEEE Transactions on Visualization and Computer Graphics, Vol. 21, No. 4, pp. 529-538 (2015).',
      '[3] Feng, Z., V. A. González, R. Amor, R. Lovreglio and G. Cabrera-Guerrero, “Immersive virtual reality serious games for evacuation training and research: A systematic literature review,” Computers & Education, Vol. 127, pp. 252-266 (2018).',
      '[4] Buttussi, F. and L. Chittaro, “Effects of different types of virtual reality display on presence and learning in a safety training scenario,” IEEE Transactions on Visualization and Computer Graphics, Vol. 24, No. 2, pp. 1063-1076 (2018).',
      '[5] Fruin, J. J., Pedestrian Planning and Design, Metropolitan Association of Urban Designers and Environmental Planners, New York (1971).',
      '[6] Helbing, D., I. Farkas and T. Vicsek, “Simulating dynamical features of escape panic,” Nature, Vol. 407, No. 6803, pp. 487-490 (2000).',
    ].map(t => p(t, { noIndent: true, align: AlignmentType.LEFT })),
    p('[7] 內政部，各類場所消防安全設備設置標準，全國法規資料庫。', { noIndent: true, align: AlignmentType.LEFT }),
    ...[
      '[8] Fonollosa, J., A. Solórzano and S. Marco, “Chemical sensor systems and associated algorithms for fire detection: A review,” Sensors, Vol. 18, No. 2, Article 553 (2018).',
      '[9] Zervas, E., A. Mpimpoudis, C. Anagnostopoulos, O. Sekkas and S. Hadjiefthymiades, “Multisensor data fusion for fire detection,” Information Fusion, Vol. 12, No. 3, pp. 150-159 (2011).',
    ].map(t => p(t, { noIndent: true, align: AlignmentType.LEFT })),
  ],
};

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 24 } } } },
  sections: [cover, head, body],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log('ok', OUT); });
