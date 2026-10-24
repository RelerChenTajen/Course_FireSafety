// 轉盤題目資料：新增或修改題目只要改這裡
// id    ：題號（網址參數 ?topic=id）
// name  ：轉盤上顯示的名稱
// cat   ：題庫分類（osh 職業安全、pub 建築物公共安全）
// color ：扇形底色
// q / a ：題目圖、答案圖（答案圖可省略；危害位置與說明在 js/hazards*.js）
const TOPICS = [
    { id: 1,  name: '營造業',     cat: 'osh', color: '#4169e1', q: 'img/q1.jpg', a: 'img/a1.jpg' },
    { id: 2,  name: '餐飲業',     cat: 'osh', color: '#dda0dd', q: 'img/q2.jpg', a: 'img/a2.jpg' },
    { id: 3,  name: '堆高機',     cat: 'osh', color: '#f5deb3', q: 'img/q3.jpg', a: 'img/a3.jpg' },
    { id: 4,  name: '航空業',     cat: 'osh', color: '#98fb98', q: 'img/q4.jpg', a: 'img/a4.jpg' },
    { id: 5,  name: '物流運輸',   cat: 'osh', color: '#fa8072', q: 'img/q5.jpg', a: 'img/a5.jpg' },
    { id: 6,  name: '一般工廠',   cat: 'osh', color: '#4169e1', q: 'img/q6.jpg', a: 'img/a6.jpg' },
    { id: 7,  name: '醫療業',     cat: 'osh', color: '#98fb98', q: 'img/q7.jpg', a: 'img/a7.jpg' },
    { id: 8,  name: '螺絲產業',   cat: 'osh', color: '#fa8072', q: 'img/q8.jpg', a: 'img/a8.jpg' },
    { id: 9,  name: '商場通道',   cat: 'pub', color: '#ffca28', q: 'img/q9.svg' },
    { id: 10, name: '地下停車場', cat: 'pub', color: '#4dd0e1', q: 'img/q10.svg' }
];
const CATS = { osh: '職業安全', pub: '建築物公共安全' };

// 圖片原始尺寸（所有題目圖皆為 960×720）
const IMG_W = 960, IMG_H = 720;

function hazardsOf(t) {
    return (window.HAZARDS && window.HAZARDS[t.id]) || [];
}

// 由網址取得題目；接受 ?topic=N 以及舊版的 ?imgno=N，不合法時回到第 1 題
function topicFromUrl() {
    const p = new URLSearchParams(location.search);
    const n = parseInt(p.get('topic') || p.get('imgno'), 10);
    return TOPICS.find(t => t.id === n) || TOPICS[0];
}
