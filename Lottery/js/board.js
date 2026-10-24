// 看圖找危害畫板
// 筆畫以「圖片座標」（960×720）記錄成向量資料，視窗縮放、轉向都能重畫，不會遺失。
// 學生圈選或點選後，依 js/hazards*.js 的危害位置自動判定對錯。
const topic = topicFromUrl();
const hazards = hazardsOf(topic);
const total = hazards.length;
const S = Game.state;
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const board = $('board'), stage = $('stage');
const keyUndo = $('keyUndo'), keyRedo = $('keyRedo'), keyClear = $('keyClear'), keyAnswer = $('keyAnswer');

const COLORS = ['#FFD700', '#005AB5', '#019858', '#2828FF', '#E800E8', '#7373B9'];
const MAX_SIZE = 100;
const SVG_NS = 'http://www.w3.org/2000/svg';

const pen = { mode: 'pen', color: COLORS[0], size: 10 };
let actions = [];   // 已完成的動作：筆畫 {mode,color,width,pts} 或 {clear:true}
let redoStack = [];
let current = null; // 正在畫的筆畫
let scale = 1;      // 畫布像素 / 圖片座標

// 作答狀態：practice 自由練習｜ready 等待開始｜playing 計時作答中｜over 作答結束
const play = new URLSearchParams(location.search).get('play') === '1'
    && S.round && S.round.topic === topic.id && !S.round.done;
const team = play ? S.teams[S.round.team] : null;
let mode = play ? 'ready' : 'practice';
const found = new Array(total).fill(false);
let wrong = 0;
let startTime = 0, timerId = null, lastBeep = null;
let revealing = false, revealIdx = 0, revealAll = false;

// ---------- 題目 ----------
document.title = `看圖找危害：${topic.name}`;
$('imgQ').src = topic.q; $('imgQ').alt = `${topic.name} 題目圖`;
if (topic.a) { $('imgA').src = topic.a; $('imgA').alt = `${topic.name} 答案圖`; }
$('hudTopic').textContent = `${CATS[topic.cat]}｜${topic.name}`;
$('hudTotal').textContent = total;
$('hudFoundBox').hidden = total === 0;

// ---------- 版面：board 保持 4:3 並塞滿可用空間 ----------
function layout() {
    const r = stage.getBoundingClientRect();
    const availW = r.width - 12, availH = r.height - 12;
    const w = Math.max(100, Math.min(availW, availH * IMG_W / IMG_H));
    const h = w * IMG_H / IMG_W;
    board.style.width = w + 'px';
    board.style.height = h + 'px';
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = canvas.width / IMG_W;
    redraw();
}

// ---------- 繪製筆畫 ----------
function strokePath(c, s, k) {
    c.save();
    c.globalCompositeOperation = s.mode === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.width * k;
    c.lineCap = c.lineJoin = 'round';
    const p = s.pts;
    if (p.length === 1) {   // 只點一下：畫一個點
        c.beginPath(); c.arc(p[0][0] * k, p[0][1] * k, s.width * k / 2, 0, Math.PI * 2); c.fill();
    } else {
        c.beginPath();
        c.moveTo(p[0][0] * k, p[0][1] * k);
        for (let i = 1; i < p.length; i++) c.lineTo(p[i][0] * k, p[i][1] * k);
        c.stroke();
    }
    c.restore();
}
// 從最後一次「清除」之後開始重畫
function visibleActions() {
    let start = 0;
    actions.forEach((a, i) => { if (a.clear) start = i + 1; });
    return actions.slice(start);
}
function renderStrokes(c, k) {
    visibleActions().forEach(s => strokePath(c, s, k));
}
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderStrokes(ctx, scale);
    if (current) strokePath(ctx, current, scale);
    updateButtons();
}

function updateButtons() {
    keyUndo.disabled = actions.length === 0;
    keyRedo.disabled = redoStack.length === 0;
    keyClear.disabled = visibleActions().length === 0;
    keyAnswer.disabled = mode === 'ready' || mode === 'playing' || (total === 0 && !topic.a);
    $('answerLabel').textContent = revealing || $('imgA').classList.contains('show') ? 'HIDE' : 'ANSWER';
    keyAnswer.classList.toggle('on', revealing);
}

function commit(action) {
    actions.push(action);
    redoStack = [];
    updateButtons();
}

// ---------- 判定標記（SVG 疊在畫布上） ----------
const marks = $('marks');
const hzLayer = document.createElementNS(SVG_NS, 'g');
const wrongLayer = document.createElementNS(SVG_NS, 'g');
marks.append(hzLayer, wrongLayer);

// 每一處目前要怎麼顯示：found 已找到、missed 揭曉但沒找到、null 不顯示
function statusOf(i) {
    if (found[i]) return 'found';
    if (revealing && (revealAll || i <= revealIdx)) return 'missed';
    return null;
}
function renderMarks() {
    hzLayer.innerHTML = hazards.map((h, i) => {
        const st = statusOf(i);
        if (!st) return '';
        const cur = revealing && !revealAll && i === revealIdx ? ' current' : '';
        const bx = Math.min(IMG_W - 18, h.x + h.r * 0.72), by = Math.max(18, h.y - h.r * 0.72);
        return `<g class="${st}${cur}"><circle cx="${h.x}" cy="${h.y}" r="${h.r}"/>` +
            `<g class="badge"><circle cx="${bx}" cy="${by}" r="17"/><text x="${bx}" y="${by}">${i + 1}</text></g></g>`;
    }).join('');
    $('hudFound').textContent = found.filter(Boolean).length;
}
function showWrong(x, y) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', 'wrong');
    p.setAttribute('d', `M${x - 18} ${y - 18}L${x + 18} ${y + 18}M${x + 18} ${y - 18}L${x - 18} ${y + 18}`);
    wrongLayer.appendChild(p);
    setTimeout(() => p.remove(), 1500);
}

let toastTimer = null;
function toast(msg, bad = false) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (bad ? ' bad' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.hidden = true, 1800);
}

// 判定一筆筆畫：點一下看點的位置；圈一圈看圈的中心與大小
function checkStroke(s) {
    if (!total || !(mode === 'practice' || mode === 'playing') || revealing) return;
    const p = s.pts;
    let len = 0;
    for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    let cx, cy, size = 0;
    if (len < 15) {
        [cx, cy] = p[0];
    } else {
        const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
        cx = xs.reduce((a, b) => a + b) / xs.length;
        cy = ys.reduce((a, b) => a + b) / ys.length;
        size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }
    const hits = hazards.map((h, i) => ({ i, d: Math.hypot(cx - h.x, cy - h.y), h }))
        .filter(o => o.d <= o.h.r && size <= o.h.r * 4)
        .sort((a, b) => a.d - b.d);
    const hit = hits.find(o => !found[o.i]);
    if (hit) {
        found[hit.i] = true;
        renderMarks();
        Sound.ok();
        toast(`✔ 第 ${hit.i + 1} 處：${hit.h.title}`);
        if (found.every(Boolean)) {
            if (mode === 'playing') setTimeout(() => finish('all'), 700);
            else toast('🎉 全部找到了！');
        }
    } else if (hits.length) {
        toast('這一處已經找到了');
    } else {
        wrong++;
        showWrong(cx, cy);
        Sound.bad();
        const big = hazards.some(h => Math.hypot(cx - h.x, cy - h.y) <= h.r) && size > 0;
        toast(big ? '圈小一點，一次圈一處' : '✘ 這裡不是', true);
    }
}

// ---------- 滑鼠／觸控／觸控筆（Pointer Events 統一處理） ----------
function toImage(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * IMG_W / r.width, (e.clientY - r.top) * IMG_H / r.height];
}
canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    const displayToImage = IMG_W / canvas.getBoundingClientRect().width;
    current = { mode: pen.mode, color: pen.color, width: pen.size * displayToImage, pts: [toImage(e)] };
    redraw();
});
canvas.addEventListener('pointermove', e => {
    if (!current) return;
    const p = toImage(e), last = current.pts[current.pts.length - 1];
    current.pts.push(p);
    // 只畫新的一段，避免每次移動都整張重畫
    strokePath(ctx, { ...current, pts: [last, p] }, scale);
});
function endStroke() {
    if (!current) return;
    const s = current;
    commit(s);
    current = null;
    redraw();
    if (s.mode === 'pen') checkStroke(s);
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

// ---------- 計時與計分 ----------
const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function startRound() {
    if (mode !== 'ready') return;
    mode = 'playing';
    $('cover').hidden = true;
    $('btnFinish').hidden = false;
    startTime = Date.now();
    timerId = setInterval(tickTimer, 200);
    tickTimer();
    Sound.beep();
    updateButtons();
}
function tickTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const el = $('hudTimer');
    if (!S.seconds) { el.textContent = fmt(elapsed); return; }
    const remain = Math.max(0, S.seconds - elapsed);
    el.textContent = fmt(remain);
    el.classList.toggle('warn', remain <= 10);
    if (remain <= 5 && remain > 0 && remain !== lastBeep) { lastBeep = remain; Sound.beep(); }
    if (remain === 0) finish('time');
}
function finish(reason) {
    if (mode !== 'playing') return;
    mode = 'over';
    clearInterval(timerId);
    $('hudTimer').classList.remove('warn');
    $('btnFinish').hidden = true;
    const n = found.filter(Boolean).length;
    const secs = Math.round((Date.now() - startTime) / 1000);
    // 計分（每找到一處得 1 分），寫回遊戲狀態讓轉盤頁顯示
    team.score += n;
    Object.assign(S.round, { done: true, found: n, total });
    S.log.push({ team: team.name, topic: topic.name, found: n, total, wrong, secs });
    Game.save();
    $('rmTitle').textContent = { time: '⏰ 時間到！', all: '🎉 全部找到！', manual: '作答結束' }[reason];
    $('rmText').textContent = `${team.name} 找到 ${n} / ${total} 處，得 ${n} 分（用時 ${secs} 秒${wrong ? `，點錯 ${wrong} 次` : ''}）。目前總分 ${team.score} 分。`;
    $('resultModal').hidden = false;
    $('rmReveal').focus();
    (reason === 'all' ? Sound.win : reason === 'time' ? Sound.buzz : Sound.beep)();
    updateButtons();
}
$('btnStart').addEventListener('click', startRound);
$('btnFinish').addEventListener('click', () => askConfirm('確定結束作答並計分？', () => finish('manual'), '結束作答'));
$('rmReveal').addEventListener('click', () => { $('resultModal').hidden = true; if (total) enterReveal(); });

// ---------- 逐一揭曉答案 ----------
function enterReveal() {
    revealing = true; revealIdx = 0; revealAll = false;
    document.body.classList.add('revealing');
    $('reveal').hidden = false;
    $('rvOrig').hidden = !topic.a;
    $('rvLink').hidden = topic.cat !== 'pub';
    updateReveal();
}
function exitReveal() {
    revealing = false;
    document.body.classList.remove('revealing');
    $('reveal').hidden = true;
    $('imgA').classList.remove('show');
    renderMarks();
    updateButtons();
}
function updateReveal() {
    const h = hazards[revealIdx];
    $('rvIdx').textContent = `第 ${revealIdx + 1} / ${total} 處`;
    const st = $('rvStatus');
    st.textContent = found[revealIdx] ? '✔ 有找到' : '✘ 沒找到';
    st.className = 'rv-status ' + (found[revealIdx] ? 'ok' : 'miss');
    $('rvTitle').textContent = h.title;
    $('rvDesc').textContent = h.desc;
    $('rvLaw').textContent = h.law || '';
    $('rvLaw').hidden = !h.law;
    $('rvPrev').disabled = revealIdx === 0;
    $('rvNext').disabled = revealIdx === total - 1;
    $('rvAll').textContent = revealAll ? '逐一顯示' : '全部顯示';
    renderMarks();
    updateButtons();
}
function step(d) {
    if (!revealing) return;
    revealIdx = Math.min(total - 1, Math.max(0, revealIdx + d));
    updateReveal();
}
$('rvPrev').addEventListener('click', () => step(-1));
$('rvNext').addEventListener('click', () => step(1));
$('rvAll').addEventListener('click', () => { revealAll = !revealAll; updateReveal(); });
$('rvOrig').addEventListener('click', () => { $('imgA').classList.toggle('show'); updateButtons(); });

keyAnswer.addEventListener('click', () => {
    if (keyAnswer.disabled) return;
    if (revealing) exitReveal();
    else if (total) enterReveal();
    else { $('imgA').classList.toggle('show'); updateButtons(); }   // 尚未設定危害位置的題目：疊上整張答案圖
});

// ---------- 上方功能鍵 ----------
function undo() {
    if (!actions.length) return;
    redoStack.push(actions.pop());
    redraw();
}
function redo() {
    if (!redoStack.length) return;
    actions.push(redoStack.pop());
    redraw();
}
keyUndo.addEventListener('click', undo);
keyRedo.addEventListener('click', redo);
// 清除也算一個動作，按 UNDO 可以救回來
keyClear.addEventListener('click', () => { commit({ clear: true }); redraw(); });
$('keyHome').addEventListener('click', () => {
    if (mode === 'playing') askConfirm('還在作答中，現在離開這一輪不計分。確定回轉盤？', () => { location.href = 'lottery.html'; }, '回轉盤');
    else location.href = 'lottery.html';
});
$('keyFull').addEventListener('click', toggleFullscreen);

// 存檔：以圖片原始尺寸合成「題目圖（或答案圖）＋筆畫＋判定圈」
$('keySave').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = IMG_W; out.height = IMG_H;
    const o = out.getContext('2d');
    const showAns = $('imgA').classList.contains('show');
    o.drawImage(showAns ? $('imgA') : $('imgQ'), 0, 0, IMG_W, IMG_H);
    const layer = document.createElement('canvas');
    layer.width = IMG_W; layer.height = IMG_H;
    renderStrokes(layer.getContext('2d'), 1);   // 橡皮擦只擦筆畫層，不會擦到題目圖
    o.drawImage(layer, 0, 0);
    hazards.forEach((h, i) => {
        const st = statusOf(i);
        if (!st) return;
        o.beginPath();
        o.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        o.lineWidth = 6;
        o.strokeStyle = st === 'found' ? '#00c853' : '#ff1744';
        o.setLineDash(st === 'found' ? [] : [16, 10]);
        o.stroke();
    });
    let url;
    try {
        url = out.toDataURL('image/png');
    } catch (err) {
        // 直接雙擊開啟（file://）時，瀏覽器視圖片為跨來源，不允許輸出含圖片的畫布
        alert('直接以檔案開啟時，瀏覽器不允許存檔。\n請透過網站開啟（例如課程網站或 VS Code 的 Live Server），或改用螢幕截圖。');
        return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `看圖找危害_${topic.name}${team ? '_' + team.name : ''}.png`;
    a.click();
});

// ---------- 下方工具 ----------
function setMode(m) {
    pen.mode = m;
    $('toolPen').classList.toggle('on', m === 'pen');
    $('toolEraser').classList.toggle('on', m === 'eraser');
    document.querySelectorAll('.colorItem').forEach(c => {
        const on = m === 'pen' && c.dataset.color === pen.color;
        c.classList.toggle('on', on);
        c.textContent = on ? '✓' : '';
    });
}
$('toolPen').addEventListener('click', () => setMode('pen'));
$('toolEraser').addEventListener('click', () => setMode('eraser'));

COLORS.forEach(color => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'colorItem';
    b.style.background = color;
    b.dataset.color = color;
    b.title = color;
    b.addEventListener('click', () => { pen.color = color; setMode('pen'); });
    $('colors').appendChild(b);
});

// 筆刷尺寸：限制在 1～100，輸入錯誤時恢復原值
const sizeInput = $('penSize');
function applySize() {
    const n = Math.round(Number(sizeInput.value));
    if (Number.isFinite(n) && sizeInput.value !== '') pen.size = Math.min(MAX_SIZE, Math.max(1, n));
    sizeInput.value = pen.size;
}
sizeInput.addEventListener('change', applySize);
sizeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { applySize(); sizeInput.blur(); } });

// ---------- 收合工具列 ----------
function bindToggle(btnId, barId, openChar, closedChar) {
    const btn = $(btnId), bar = $(barId);
    btn.addEventListener('click', () => {
        const collapsed = bar.classList.toggle('collapsed');
        btn.textContent = collapsed ? closedChar : openChar;
        btn.setAttribute('aria-expanded', String(!collapsed));
    });
}
bindToggle('toggleTop', 'topBar', '∧', '∨');
bindToggle('toggleBottom', 'bottomBar', '∨', '∧');

// ---------- 快捷鍵 ----------
document.addEventListener('keydown', e => {
    if (e.target === sizeInput) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (e.code === 'Space' && mode === 'ready') { e.preventDefault(); startRound(); }
    else if (revealing && (e.key === 'ArrowRight' || e.key === 'PageDown')) { e.preventDefault(); step(1); }
    else if (revealing && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); step(-1); }
    else if (k === 'f' && !e.ctrlKey && !e.metaKey) toggleFullscreen();
    else if (e.key === 'Escape') $('resultModal').hidden = true;
});

// ---------- 啟動 ----------
if (play) {
    $('hudTeam').hidden = false;
    $('hudTeam').textContent = team.name;
    $('hudTimer').hidden = false;
    $('hudTimer').textContent = fmt(S.seconds);
    $('cover').hidden = false;
    $('btnStart').textContent = `▶ 開始作答${S.seconds ? `（${S.seconds} 秒）` : ''}`;
    $('coverText').textContent = total
        ? `${team.name}準備好了嗎？在圖中圈出或點選 ${total} 處危害，每找到一處得 1 分。`
        : `${team.name}準備好了嗎？在圖中圈出所有危害。`;
}
setMode('pen');
renderMarks();
updateButtons();
// 舞台大小改變（視窗縮放、手機轉向、工具列收合、圖示載入）時重新排版，筆畫依向量重畫不會遺失
new ResizeObserver(layout).observe(stage);
