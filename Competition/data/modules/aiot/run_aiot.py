# 以 aiot 頁面自身的判定邏輯，比較不同判定方式與持續秒數在 5 種情境下的結果
import pathlib, statistics as st, sys, json
from playwright.sync_api import sync_playwright

URL = pathlib.Path(r"E:\Courses\FireSafety\aiot.html").as_uri()
N = 5
CONFIGS = [("or", 0), ("or", 25), ("two", 0), ("two", 25)]
JS = """
([mode, deb, key]) => {
    stopTicker();
    document.querySelector(`[name=cfgMode][value=${mode}]`).checked = true;
    $('cfgDebounce').value = deb;
    scnKey = key; source = 'scenario'; resetRun(); t = 0;
    const before = results.length;
    let guard = 0;
    while (results.length === before && guard++ < 1000) tick();
    stopTicker();
    return results[0];
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge"); pg = b.new_page()
    pg.on("pageerror", lambda e: print("ERR", e))
    pg.goto(URL)
    keys = pg.evaluate("Object.keys(SCENARIOS)")
    out = {}
    for mode, deb in CONFIGS:
        label = ("任一條件" if mode == "or" else "兩項交叉") + f"／持續 {deb} 秒"
        tally = {"正確偵測": 0, "正確不報": 0, "漏報": 0, "誤報": 0}
        rows = []
        for k in keys:
            rs = [pg.evaluate(JS, [mode, deb, k]) for _ in range(N)]
            for r in rs: tally[r["verdict"]] += 1
            at = [r["alarmAt"] for r in rs if r["alarmAt"] is not None]
            verdicts = sorted(set(r["verdict"] for r in rs))
            rows.append((rs[0]["name"], "/".join(verdicts), round(st.mean(at)) if at else None))
        out[label] = {"tally": tally, "rows": rows}
        print(f"\n{label}: " + "，".join(f"{k} {v}" for k, v in tally.items()) + f"（共 {N * len(keys)} 次）")
        for name, v, at in rows: print(f"   {name}: {v}  警報時間 {at}s")
    pathlib.Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    b.close()
