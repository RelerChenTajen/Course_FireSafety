// 轉盤與畫板共用：遊戲狀態（存在瀏覽器 localStorage）、音效、全螢幕
const Game = (() => {
    const KEY = 'osh-lottery-v1';
    const defaults = () => ({
        teams: [1, 2, 3, 4].map(n => ({ name: `第${n}組`, score: 0 })),
        current: 0,          // 輪到哪一組
        used: [],            // 已抽過的題號
        seconds: 90,         // 作答時間，0 = 不計時
        pools: { osh: true, pub: true },
        sound: true,
        round: null,         // 進行中的一輪 { topic, team, done, found, total }
        log: []              // 每輪紀錄
    });
    let state;
    try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { state = defaults(); }
    if (!state.teams.length) state.teams = defaults().teams;

    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 私密視窗等情況存不了，遊戲仍可進行 */ }
    }
    return { state, save, defaults };
})();

const Sound = (() => {
    let ac = null;
    function audio() {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function tone(freq, dur, type = 'sine', vol = 0.2, when = 0) {
        if (!Game.state.sound) return;
        try {
            const c = audio(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
            o.type = type;
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.connect(g).connect(c.destination);
            o.start(t);
            o.stop(t + dur + 0.02);
        } catch (e) { /* 不支援音效時略過 */ }
    }
    return {
        tick: () => tone(1500, 0.035, 'square', 0.06),
        win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, i * 0.12)),
        ok: () => { tone(880, 0.12, 'sine', 0.25); tone(1320, 0.22, 'sine', 0.2, 0.1); },
        bad: () => tone(170, 0.25, 'sawtooth', 0.12),
        beep: () => tone(1000, 0.1, 'square', 0.1),
        buzz: () => tone(220, 0.9, 'square', 0.16)
    };
})();

function toggleFullscreen() {
    const el = document.documentElement;
    try {
        if (document.fullscreenElement) document.exitFullscreen();
        else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) { /* 不支援全螢幕時略過 */ }
}

// 頁內確認視窗（取代 confirm()）
function askConfirm(message, onYes, yesText = '確定') {
    let m = document.getElementById('confirmModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'confirmModal';
        m.className = 'modal';
        m.innerHTML = `<div class="card" role="dialog" aria-modal="true"><p class="confirm-text"></p>
            <div class="actions"><button type="button" class="btn primary" data-yes></button><button type="button" class="btn" data-no>取消</button></div></div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-no')) m.hidden = true; });
    }
    m.querySelector('.confirm-text').textContent = message;
    const yes = m.querySelector('[data-yes]');
    yes.textContent = yesText;
    yes.onclick = () => { m.hidden = true; onYes(); };
    m.hidden = false;
    yes.focus();
}
