"""Xuất hình WebP cho Đảo Khủng Long từ bản gốc PNG do Codex vẽ.

Chạy từ gốc repo:  python scripts/dkl-images.py
- Nhân vật, loài, đồ vật (PNG có alpha): cắt sát viền, cạnh dài tối đa 560 px (món đồ của khủng long, hộp quà: 360 px).
- Cảnh nền (PNG không alpha): rộng 1280 px.
- Biểu tượng PWA: dao-khung-long/icons/ (192, 180, 512, 512 maskable).
Kết quả ghi vào dao-khung-long/assets/img/. Cần Pillow có hỗ trợ WebP.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "dao-khung-long" / "assets" / "art"
OUT = ROOT / "dao-khung-long" / "assets" / "img"
ICONS = ROOT / "dao-khung-long" / "icons"
SPRITE_MAX = 560
ICON_MAX = 160  # berry dùng làm biểu tượng nhỏ
DO_MAX = 360  # món đồ của khủng long (pk-*) và hộp quà: hiện nhỏ hơn nhân vật
BG_WIDTH = 1280


def trim(im: Image.Image) -> Image.Image:
    alpha = im.getchannel("A").point(lambda a: 255 if a > 10 else 0)
    box = alpha.getbbox()
    if not box:
        return im
    pad = 6
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def fit(im: Image.Image, limit: int) -> Image.Image:
    scale = min(1.0, limit / max(im.size))
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    return im


def export() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for png in sorted(SRC.glob("*.png")):
        im = Image.open(png)
        dest = OUT / (png.stem + ".webp")
        if im.mode == "RGBA":
            limit = ICON_MAX if png.stem == "berry" else DO_MAX if png.stem.startswith("pk-") or png.stem == "hop-qua" else SPRITE_MAX
            im = fit(trim(im), limit)
            im.save(dest, "WEBP", quality=84, method=6)
        else:
            im = im.convert("RGB")
            if im.width > BG_WIDTH:
                im = im.resize((BG_WIDTH, round(im.height * BG_WIDTH / im.width)), Image.LANCZOS)
            im.save(dest, "WEBP", quality=78, method=6)
        total += dest.stat().st_size
        print(f"{dest.name:28s} {im.size[0]}x{im.size[1]:<5d} {dest.stat().st_size // 1024:5d} KB")
    print(f"Tổng: {total / 1024 / 1024:.2f} MB")


def icons() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    egg = trim(Image.open(SRC / "rex-hatchling.png").convert("RGBA"))

    def make(size: int, inner: float, name: str) -> None:
        bg = Image.new("RGBA", (size, size), (255, 214, 102, 255))
        # nền tròn xanh ngọc cho dễ nhận ra trên màn hình chính
        circle = Image.new("L", (size * 4, size * 4), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(circle).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        circle = circle.resize((size, size), Image.LANCZOS)
        teal = Image.new("RGBA", (size, size), (46, 196, 182, 255))
        bg.paste(teal, (0, 0), circle)
        sprite = egg.copy()
        side = round(size * inner)
        sprite.thumbnail((side, side), Image.LANCZOS)
        bg.alpha_composite(sprite, ((size - sprite.width) // 2, (size - sprite.height) // 2 + round(size * 0.02)))
        bg.convert("RGB").save(ICONS / name, "PNG", optimize=True)

    make(192, 0.8, "icon-192.png")
    make(180, 0.8, "icon-180.png")
    make(512, 0.8, "icon-512.png")
    make(512, 0.62, "icon-512-maskable.png")
    print("Biểu tượng PWA: xong")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    export()
    icons()
