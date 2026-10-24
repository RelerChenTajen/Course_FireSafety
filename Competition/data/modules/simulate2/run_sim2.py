# 以 simulate2 頁面自身的模型批次執行疏散情境，每種情境重複 N 次取平均
import json, pathlib, sys, statistics as st
from playwright.sync_api import sync_playwright

URL = pathlib.Path(r"E:\Courses\FireSafety\simulate2.html").as_uri()
N = int(sys.argv[1]) if len(sys.argv) > 1 else 5
SCEN = [
    ("全場同時撤離（基準）", dict(phase="all", width=1, panic=False, block=[])),
    ("分區分批廣播",         dict(phase="phased", width=1, panic=False, block=[])),
    ("恐慌推擠",             dict(phase="all", width=1, panic=True, block=[])),
    ("出口寬度 1.5 倍",       dict(phase="all", width=1.5, panic=False, block=[])),
    ("封鎖上層北側出口",      dict(phase="all", width=1, panic=False, block=["U-N"])),
]
JS = """
(c) => {
    mode = 'egress';
    $('cfg').value = 'concert'; $('phase').value = c.phase; $('widthMul').value = c.width;
    $('panic').checked = c.panic; $('counter').checked = false;
    blocked.clear(); reset();
    c.block.forEach(id => blocked.add(id));
    agents.forEach(a => { if (a.state === 'seat' || a.state === 'walk') assignGate(a); });
    let n = 0;
    while (!finished && n < 20000) { stepEgress(0.2); n++; }
    return { left: S.allLeft, out: S.allOut, rho: S.maxRho, losF: S.losF, t: S.t, finished };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    pg = b.new_page()
    pg.on("pageerror", lambda e: print("ERR", e))
    pg.goto(URL)
    print("mode var:", pg.evaluate("typeof mode + ' ' + mode"), "| gates:", pg.evaluate("Object.keys(gates).slice(0,6)"))
    out = {}
    for name, c in SCEN:
        runs = [pg.evaluate(JS, c) for _ in range(N)]
        out[name] = runs
        f = lambda k: [r[k] for r in runs if r[k] is not None]
        m = lambda k: (st.mean(f(k)), st.pstdev(f(k))) if f(k) else (None, None)
        print(f"{name}: 離席 {m('left')[0]/60:.2f}±{m('left')[1]/60:.2f} 分, 到戶外 {m('out')[0]/60:.2f}±{m('out')[1]/60:.2f} 分, "
              f"最大密度 {m('rho')[0]:.2f}, LOS F 累計 {m('losF')[0]:.0f}±{m('losF')[1]:.0f} s, finished={all(r['finished'] for r in runs)}")
    pathlib.Path(sys.argv[2]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    b.close()
