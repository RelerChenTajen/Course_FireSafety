# 輸出海報 PDF（A1）與預覽圖：python render.py
import pathlib
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    pg = b.new_page(viewport={"width": 2245, "height": 3179})
    pg.on("pageerror", lambda e: print("ERR", e))
    pg.goto((HERE / "poster.html").as_uri(), wait_until="networkidle")
    pg.wait_for_timeout(800)
    over = pg.evaluate("""() => [...document.querySelectorAll('main section, header, footer')]
        .map(e => e.getBoundingClientRect()).map(r => Math.round(r.bottom))""")
    print("區塊底部 y:", over, "（頁高 3179）")
    pg.screenshot(path=str(HERE / "poster_preview.png"))
    pg.pdf(path=str(HERE / "poster.pdf"), width="594mm", height="841mm", print_background=True, page_ranges="1")
    b.close()
print("ok")
