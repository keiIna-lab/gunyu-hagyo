# -*- coding: utf-8 -*-
"""Resize for LINE Creators Market and pack a ZIP for bulk upload."""
from __future__ import annotations

import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "official"
UPLOAD = ROOT / "line-upload"
ZIP_PATH = ROOT / "houki-chan-line-stamps.zip"

MARGIN = 10
STAMP_SIZE = (370, 320)
MAIN_SIZE = (240, 240)
TAB_SIZE = (96, 74)
DPI = (72, 72)


def opaque_bbox(im: Image.Image, threshold: int = 12) -> tuple[int, int, int, int] | None:
    alpha = im.split()[-1]
    return alpha.point(lambda a: 255 if a > threshold else 0).getbbox()


def fit_with_margin(im: Image.Image, size: tuple[int, int], margin: int = MARGIN) -> Image.Image:
    im = im.convert("RGBA")
    canvas_w, canvas_h = size
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    bbox = opaque_bbox(im)
    if not bbox:
        return canvas
    cropped = im.crop(bbox)
    inner_w = max(1, canvas_w - margin * 2)
    inner_h = max(1, canvas_h - margin * 2)
    scale = min(inner_w / cropped.width, inner_h / cropped.height)
    nw = max(1, int(round(cropped.width * scale)))
    nh = max(1, int(round(cropped.height * scale)))
    # Keep even dimensions so LINE auto-scale stays clean.
    nw -= nw % 2
    nh -= nh % 2
    nw = max(2, min(nw, inner_w - inner_w % 2))
    nh = max(2, min(nh, inner_h - inner_h % 2))
    fitted = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (canvas_w - nw) // 2
    y = (canvas_h - nh) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True, dpi=DPI)


def main() -> None:
    if UPLOAD.exists():
        for old in UPLOAD.glob("*.png"):
            old.unlink()
    UPLOAD.mkdir(parents=True, exist_ok=True)

    files: list[Path] = []
    for i in range(1, 41):
        src = SRC / f"{i:02d}.png"
        out = UPLOAD / f"{i:02d}.png"
        save_png(fit_with_margin(Image.open(src), STAMP_SIZE), out)
        files.append(out)

    save_png(fit_with_margin(Image.open(SRC / "main.png"), MAIN_SIZE), UPLOAD / "main.png")
    files.append(UPLOAD / "main.png")
    save_png(fit_with_margin(Image.open(SRC / "tab.png"), TAB_SIZE, margin=6), UPLOAD / "tab.png")
    files.append(UPLOAD / "tab.png")

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in files:
            zf.write(path, arcname=path.name)

    print(f"packed {len(files)} files")
    print(ZIP_PATH)
    print(f"zip bytes: {ZIP_PATH.stat().st_size}")
    from PIL import Image as PImage

    for name in ("01.png", "40.png", "main.png", "tab.png"):
        im = PImage.open(UPLOAD / name)
        print(name, im.size, im.mode, im.info.get("dpi"))


if __name__ == "__main__":
    main()
