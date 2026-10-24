// 職業安全問答轉盤：不重複抽題、分組計分、音效、全螢幕
const S = Game.state;
const $ = id => document.getElementById(id);
const wheel = $('wheel'), wctx = wheel.getContext('2d');
const btnSpin = $('btnSpin'), modal = $('modal');
const SPIN_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 4500;

let rotation = 0;      // 轉盤目前累計旋轉角度（順時針）
let spinning = false;
let picked = null;     // 本次抽中的題目

// 上一輪結束回到轉盤：輪到下一組
if (S.round) {
    if (S.round.done) S.current = (S.round.team + 1) % S.teams.length;
    S.round = null;
    Game.save();
}

const pool = () => TOPICS.filter(t => S.pools[t.cat]);
const unused = () => pool().filter(t => !S.used.includes(t.id));

// ---------- 轉盤 ----------
function drawWheel() {
    const list = pool();
    const sector = 360 / list.length;
    const size = wheel.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    wheel.width = wheel.height = Math.round(size * dpr);
    const r = wheel.width / 2;
    wctx.setTransform(1, 0, 0, 1, r, r);
    wctx.clearRect(-r, -r, 2 * r, 2 * r);
    list.forEach((t, i) => {
        const used = S.used.includes(t.id);
        const a0 = (i * sector - 90) * Math.PI / 180;
        const a1 = ((i + 1) * sector - 90) * Math.PI / 180;
        wctx.beginPath();
        wctx.moveTo(0, 0);
        wctx.arc(0, 0, r, a0, a1);
        wctx.closePath();
        wctx.fillStyle = used ? '#cfcfcf' : t.color;
        wctx.fill();
        wctx.strokeStyle = '#fff';
        wctx.lineWidth = r * 0.012;
        wctx.stroke();
        wctx.save();
        wctx.rotate((a0 + a1) / 2);
        wctx.fillStyle = used ? '#8a8a8a' : '#1a1a1a';
        const label = (used ? '✓ ' : '') + t.name;
        const maxW = r * (t.cat === 'pub' ? 0.5 : 0.6);   // 名稱可用的長度，太長就縮小字
        let fs = Math.round(r * (list.length > 8 ? 0.095 : 0.11));
        wctx.font = `bold ${fs}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
        const w = wctx.measureText(label).width;
        if (w > maxW) {
            fs = Math.floor(fs * maxW / w);
            wctx.font = `bold ${fs}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
        }
        wctx.textAlign = 'center';
        wctx.textBaseline = 'middle';
        wctx.fillText(label, t.cat === 'pub' ? r * 0.56 : r * 0.6, 0);
        if (t.cat === 'pub') {   // 公安題加上小標記
            wctx.font = `bold ${Math.round(r * 0.055)}px "Microsoft JhengHei", sans-serif`;
            wctx.fillText('公安', r * 0.88, 0);
        }
        wctx.restore();
    });
}

// 轉動時，指針每經過一格就「喀」一聲
function tickWhileSpinning(sector) {
    let last = null;
    function frame() {
        if (!spinning) return;
        const m = new DOMMatrixReadOnly(getComputedStyle(wheel).transform);
        const deg = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360;
        const idx = Math.floor(((360 - deg) % 360) / sector);
        if (last !== null && idx !== last) Sound.tick();
        last = idx;
        if (!modal.hidden) return;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function spin() {
    if (spinning || !modal.hidden || !$('allDone').hidden) return;
    const list = pool(), left = unused();
    if (!left.length) { showAllDone(); return; }
    spinning = true;
    btnSpin.disabled = true;
    const sector = 360 / list.length;
    picked = left[Math.floor(Math.random() * left.length)];
    const idx = list.indexOf(picked);
    const target = idx * sector + sector * (0.12 + Math.random() * 0.76);
    const delta = ((360 - target - rotation) % 360 + 360) % 360;
    rotation += 360 * 5 + delta;
    wheel.style.transform = `rotate(${rotation}deg)`;
    tickWhileSpinning(sector);
    setTimeout(showResult, SPIN_MS + 200);
}

function showResult() {
    spinning = false;
    Sound.win();
    const team = S.teams[S.current];
    const n = hazardsOf(picked).length;
    $('resultTeam').textContent = `${team.name}抽到的是`;
    $('resultName').textContent = picked.name;
    $('resultInfo').textContent = `${CATS[picked.cat]}・${n ? `共 ${n} 處要找` : '找出圖中的危害'}・${S.seconds ? `限時 ${S.seconds} 秒` : '不計時'}`;
    modal.hidden = false;
    $('btnGo').focus();
}

function closeResult() {
    modal.hidden = true;
    btnSpin.disabled = false;
}

// 開始作答：這題記為已抽，並建立本輪紀錄
$('btnGo').addEventListener('click', e => {
    e.preventDefault();
    if (!S.used.includes(picked.id)) S.used.push(picked.id);
    S.round = { topic: picked.id, team: S.current, done: false };
    Game.save();
    location.href = `showimg.html?topic=${picked.id}&play=1`;
});
$('btnAgain').addEventListener('click', () => { closeResult(); spin(); });
modal.addEventListener('click', e => { if (e.target === modal) closeResult(); });

function showAllDone() {
    const rank = S.teams.map(t => t).sort((a, b) => b.score - a.score);
    $('finalRank').textContent = rank.map((t, i) => `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} ${t.name} ${t.score} 分`).join('　');
    $('allDone').hidden = false;
    $('btnRestart').focus();
}
$('btnRestart').addEventListener('click', () => { S.used = []; Game.save(); $('allDone').hidden = true; render(); });
$('allDone').addEventListener('click', e => { if (e.target.id === 'allDone' || e.target.hasAttribute('data-close')) $('allDone').hidden = true; });

// ---------- 計分板 ----------
function renderTeams() {
    const ol = $('teams');
    ol.innerHTML = '';
    S.teams.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = i === S.current ? 'now' : '';
        li.innerHTML = `<button type="button" class="mark" title="輪到這一組">▶</button>
            <input type="text" id="teamName${i}" maxlength="12" aria-label="組名">
            <span class="score">${t.score}</span>
            <button type="button" class="adj" title="減 1 分">−</button>
            <button type="button" class="adj" title="加 1 分">+</button>`;
        const input = li.querySelector('input');
        input.value = t.name;
        input.addEventListener('change', () => { t.name = input.value.trim() || `第${i + 1}組`; Game.save(); render(); });
        li.querySelector('.mark').addEventListener('click', () => { S.current = i; Game.save(); render(); });
        const [minus, plus] = li.querySelectorAll('.adj');
        minus.addEventListener('click', () => { t.score = Math.max(0, t.score - 1); Game.save(); renderTeams(); });
        plus.addEventListener('click', () => { t.score++; Game.save(); renderTeams(); });
        ol.appendChild(li);
    });
    $('turnName').textContent = S.teams[S.current].name;
}

// ---------- 設定 ----------
function renderSettings() {
    $('teamCount').value = S.teams.length;
    $('seconds').value = String(S.seconds);
    $('poolOsh').checked = S.pools.osh;
    $('poolPub').checked = S.pools.pub;
    $('usedInfo').textContent = `已抽 ${pool().length - unused().length} / ${pool().length} 題`;
    $('btnSound').textContent = S.sound ? '🔊' : '🔇';
    $('btnSound').classList.toggle('off', !S.sound);
}
$('teamCount').addEventListener('change', e => {
    const n = Math.min(8, Math.max(1, parseInt(e.target.value, 10) || S.teams.length));
    while (S.teams.length < n) S.teams.push({ name: `第${S.teams.length + 1}組`, score: 0 });
    S.teams.length = n;
    if (S.current >= n) S.current = 0;
    Game.save();
    render();
});
$('seconds').addEventListener('change', e => { S.seconds = parseInt(e.target.value, 10); Game.save(); });
['Osh', 'Pub'].forEach(k => $('pool' + k).addEventListener('change', e => {
    const key = k.toLowerCase();
    S.pools[key] = e.target.checked;
    if (!S.pools.osh && !S.pools.pub) S.pools[key] = e.target.checked = true;   // 至少保留一個題庫
    Game.save();
    render();
}));
$('btnResetUsed').addEventListener('click', () => askConfirm('所有題目都恢復成可以抽？（分數不變）', () => { S.used = []; Game.save(); render(); }, '重新抽題'));
$('btnResetScore').addEventListener('click', () => askConfirm('所有組的分數歸零？', () => { S.teams.forEach(t => t.score = 0); S.log = []; Game.save(); render(); }, '歸零'));
$('btnSound').addEventListener('click', () => { S.sound = !S.sound; Game.save(); renderSettings(); if (S.sound) Sound.beep(); });
$('btnFull').addEventListener('click', toggleFullscreen);

function render() { drawWheel(); renderTeams(); renderSettings(); }

// ---------- 鍵盤 ----------
btnSpin.addEventListener('click', spin);
document.addEventListener('keydown', e => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === 'Escape') { if (!modal.hidden) closeResult(); $('allDone').hidden = true; }
    if (typing) return;
    if (e.code === 'Space' && modal.hidden && document.activeElement !== btnSpin) { e.preventDefault(); spin(); }
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});
window.addEventListener('resize', drawWheel);
document.addEventListener('fullscreenchange', () => setTimeout(drawWheel, 50));
render();
