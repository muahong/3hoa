"""Bảng kiểm tra điểm neo phụ kiện của Đảo Khủng Long.

Chạy từ gốc repo:  python scripts/dkl-neo-phu-kien.py [thư mục ra] [mã món ...]
- Đọc khối NEO (giữa hai dấu NEO-BAT-DAU, NEO-KET-THUC) và danh mục DS trong dao-khung-long/js/phu-kien.js.
- Vẽ mỗi hình khủng long (Rex, Mây × mức lớn và dáng) mặc từng món, đúng cách js/phu-kien.js ghép (viTri, GOC, s, dy).
- Mặc định vẽ một món cho mỗi chỗ mặc (đầu, cổ, thân, tay, chân); ghi thêm mã món để vẽ đúng các món đó.
Kết quả: <thư mục ra>/neo-<mã món>.png (mặc định thư mục out/ ở gốc repo, đã có trong .gitignore).
"""
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "dao-khung-long" / "js" / "phu-kien.js"
IMG = ROOT / "dao-khung-long" / "assets" / "img"
GOC = {"dau": (0.5, 0.88), "co": (0.5, 0.32), "than": (0.5, 0.5), "tay": (0.5, 0.5), "chan": (0.5, 0.6)}
HINH = ["hatchling", "kid", "teen", "adult", "legend", "eating", "cheer", "think"]


def doc_js():
    src = JS.read_text(encoding="utf8")
    khoi = src.split("/* NEO-BAT-DAU */")[1].split("/* NEO-KET-THUC */")[0]
    neo = json.loads(khoi[khoi.index("{"): khoi.rindex("}") + 1])
    ds = {}
    for m in re.finditer(r"\{ ma: '([^']+)', ten: '([^']+)', anh: '([^']+)', vung: (\d+), cho: '([a-z]+)'.*?s: ([\d.]+), dy: ([-\d.]+)", src):
        ds[m.group(1)] = {"ten": m.group(2), "anh": m.group(3), "cho": m.group(5), "s": float(m.group(6)), "dy": float(m.group(7))}
    return neo, ds


def ghep(kl: Image.Image, mon: Image.Image, a: dict, d: dict, lat: bool) -> Image.Image:
    W, H = kl.size
    w = W * a["w"] / 100 * d["s"]
    h = w * mon.height / mon.width
    cx, cy = W * a["x"] / 100, H * a["y"] / 100 + d["dy"] * h
    g = GOC[d["cho"]]
    m = mon.resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
    if lat:
        m = m.transpose(Image.FLIP_LEFT_RIGHT)
    # Xoay quanh điểm neo: đặt món đồ lên tấm vuông có tâm là điểm neo rồi xoay tấm đó
    R = math.ceil(math.hypot(w, h)) * 2 + 4
    tam = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    tam.alpha_composite(m, (round(R / 2 - w * g[0]), round(R / 2 - h * g[1])))
    tam = tam.rotate(-a.get("r", 0), resample=Image.BICUBIC)
    return tam, round(cx - R / 2), round(cy - R / 2)


def ve(neo, ds, ma, ra: Path):
    d = ds[ma]
    mon = Image.open(IMG / (d["anh"] + ".webp")).convert("RGBA")
    o = 300
    font = ImageFont.truetype("arial.ttf", 14)
    sheet = Image.new("RGB", (o * 8, (o + 22) * 2), "white")
    for hang, loai in enumerate(["rex", "may"]):
        for cot, t in enumerate(HINH):
            ten = f"{loai}-{t}"
            kl = Image.open(IMG / f"{ten}.webp").convert("RGBA")
            W, H = kl.size
            pad = round(H * 0.25)
            nen = Image.new("RGBA", (W + 2 * pad, H + 2 * pad), (240, 238, 248, 255))
            nen.alpha_composite(kl, (pad, pad))
            a_ds = neo[ten][d["cho"]]
            a_ds = a_ds if isinstance(a_ds, list) else [a_ds]
            for i, a in enumerate(a_ds):
                tam, x, y = ghep(kl, mon, a, d, d["cho"] == "chan" and i == 0)
                nen.alpha_composite(tam, (x + pad, y + pad))
            sc = min((o - 10) / nen.width, (o - 10) / nen.height)
            nen = nen.resize((round(nen.width * sc), round(nen.height * sc)), Image.LANCZOS)
            sheet.paste(nen.convert("RGB"), (cot * o + (o - nen.width) // 2, hang * (o + 22) + 22 + (o - nen.height) // 2))
            ImageDraw.Draw(sheet).text((cot * o + 6, hang * (o + 22) + 4), ten, fill="black", font=font)
    ra.mkdir(parents=True, exist_ok=True)
    sheet.save(ra / f"neo-{ma}.png")
    print("đã vẽ", ra / f"neo-{ma}.png")


def main():
    # Cửa sổ lệnh Windows (cp1252) không in được chữ tiếng Việt
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    ra = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out"
    neo, ds = doc_js()
    chon = sys.argv[2:]
    if not chon:
        mot = {}
        for ma, d in ds.items():
            if (IMG / (d["anh"] + ".webp")).exists():
                mot.setdefault(d["cho"], ma)
        chon = list(mot.values())
    for ma in chon:
        ve(neo, ds, ma, ra)


if __name__ == "__main__":
    main()
