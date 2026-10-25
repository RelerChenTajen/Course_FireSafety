# 輸出海報 PDF（A1）與預覽圖
# 用法：python render.py                 → poster.html
#       python render.py poster_intro    → poster_intro.html
import pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
name = sys.argv[1] if len(sys.argv) > 1 else "poster"
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    pg = b.new_page(viewport={"width": 2245, "height": 3179})
    pg.on("pageerror", lambda e: print("ERR", e))
    pg.goto((HERE / f"{name}.html").as_uri(), wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(800)
    print("楷體已載入:", pg.evaluate("document.fonts.check('700 40px \"LXGW WenKai TC\"', '用玩的')"))
    over = pg.evaluate("""() => [...document.querySelectorAll('main section, header, footer')]
        .map(e => e.getBoundingClientRect()).map(r => Math.round(r.bottom))""")
    print("區塊底部 y:", over, "（頁高 3179）")
    pg.screenshot(path=str(HERE / f"{name}_preview.png"))
    pg.pdf(path=str(HERE / f"{name}.pdf"), width="594mm", height="841mm", print_background=True, page_ranges="1")
    b.close()
print("ok")
