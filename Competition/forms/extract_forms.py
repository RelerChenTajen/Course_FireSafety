# 從競賽簡章拆出附件1（參賽同意書）、附件2（切結書），保留原格式
# 用法：python extract_forms.py
import copy, pathlib, zipfile
import lxml.etree as ET

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "115年度學生實務專題製作競賽簡章.docx"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def text(el):
    return "".join(el.itertext())

def strip_page_breaks(el):
    for br in list(el.iter(W + "br")):
        if br.get(W + "type") == "page":
            br.getparent().remove(br)

def extract(start_mark, end_mark, out_name):
    with zipfile.ZipFile(SRC) as z:
        parts = {n: z.read(n) for n in z.namelist()}
    root = ET.fromstring(parts["word/document.xml"])
    body = root.find(W + "body")
    kids = list(body)
    start = next(i for i, k in enumerate(kids) if text(k).strip().startswith(start_mark))
    end = next(i for i, k in enumerate(kids) if i > start and text(k).strip().startswith(end_mark))
    # 附件所在區段的版面設定：從起點往後找第一個段落內的 sectPr
    sect = next(k.find(".//" + W + "sectPr") for k in kids[start:] if k.find(".//" + W + "sectPr") is not None)
    keep = [copy.deepcopy(k) for k in kids[start:end]]
    for k in keep:
        strip_page_breaks(k)
        for sp in k.findall(".//" + W + "sectPr"):
            sp.getparent().remove(sp)
    for k in kids:
        body.remove(k)
    for k in keep:
        body.append(k)
    body.append(copy.deepcopy(sect))
    parts["word/document.xml"] = ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
    out = HERE / out_name
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for n, data in parts.items():
            z.writestr(n, data)
    print(f"{out.name}：簡章第 {start}～{end - 1} 個元素")

extract("【附件1】", "【附件2】", "附件1_參賽同意書.docx")
extract("【附件2】", "【附件3】", "附件2_切結書.docx")
