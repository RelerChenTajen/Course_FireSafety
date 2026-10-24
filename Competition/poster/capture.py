# 擷取各模組畫面供海報使用：python capture.py
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(__file__).resolve().parent / "img"
OUT.mkdir(exist_ok=True)
SHOTS = [
    ("lottery", "Lottery/lottery.html", None),
    ("vr", "simulate0.html", None),
    ("evac", "simulate1.html", None),
    ("crowd", "simulate2.html", "() => { $('speed').value = '20'; $('btnStart').click(); }"),
    ("aiot", "aiot.html", None),
    ("hospital", "hospital-aiot.html", None),
    ("warehouse", "warehouse_aiot.html", None),
]
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for name, path, action in SHOTS:
        pg = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1.5)
        pg.on("pageerror", lambda e, n=name: print(n, "ERR", e))
        pg.goto((ROOT / path).as_uri(), wait_until="load")
        pg.wait_for_timeout(1500)
        if action:
            pg.evaluate(action); pg.wait_for_timeout(6000)
        pg.screenshot(path=str(OUT / f"{name}.png"))
        print("saved", name)
        pg.close()
    b.close()
