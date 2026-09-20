# -*- coding: utf-8 -*-
"""Compose LINE official-size stamps (370x320) with Japanese captions."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OUT = ROOT / "official"
PREVIEW = ROOT / "preview-sheet.png"

STAMP_W, STAMP_H = 370, 320
MAIN_SIZE = 240
TAB_W, TAB_H = 96, 74

FONT_CANDIDATES = [
    ("C:/Windows/Fonts/HGRSKP.TTF", 0),
    ("C:/Windows/Fonts/HGRSMP.TTF", 0),
    ("C:/Windows/Fonts/HGRPP1.TTC", 0),
    ("C:/Windows/Fonts/YuGothB.ttc", 0),
    ("C:/Windows/Fonts/meiryob.ttc", 0),
]

STAMPS = [
    {"file": "stamp-01-ohayou.png", "text": "おはよう", "pos": "top"},
    {"file": "stamp-02-otsukare.png", "text": "おつかれさま", "pos": "top"},
    {"file": "stamp-03-yoroshiku.png", "text": "よろしく\nお願いします", "pos": "top"},
    {"file": "stamp-04-oyasumi.png", "text": "おやすみなさい", "pos": "top"},
    {"file": "stamp-05-kaerimasu.png", "text": "今から帰ります", "pos": "top"},
    {"file": "stamp-06-tsukimashita.png", "text": "着きました", "pos": "top"},
    {"file": "stamp-07-ryokai.png", "text": "了解です", "pos": "bottom"},
    {"file": "stamp-08-ok.png", "text": "オッケー", "pos": "top"},
    {"file": "stamp-09-sorena.png", "text": "それな！", "pos": "top"},
    {"file": "stamp-10-eh.png", "text": "えっ！？", "pos": "top"},
    {"file": "stamp-11-naruhodo.png", "text": "なるほど…", "pos": "top"},
    {"file": "stamp-12-dame.png", "text": "ダメー", "pos": "top"},
    {"file": "stamp-13-arigatou.png", "text": "ありがとう\nございます", "pos": "top"},
    {"file": "stamp-14-gomen.png", "text": "ごめんなさい…", "pos": "top"},
    {"file": "stamp-15-kami.png", "text": "神…", "pos": "top"},
    {"file": "stamp-16-tasukari.png", "text": "助かりました", "pos": "top"},
    {"file": "stamp-17-muri.png", "text": "無理しないでね", "pos": "top"},
    {"file": "stamp-18-peko.png", "text": "ペコッ", "pos": "top"},
    {"file": "stamp-19-jii.png", "text": "じーっ…", "pos": "top"},
    {"file": "stamp-20-chiin.png", "text": "ちーん", "pos": "top"},
    {"file": "stamp-21-wakuwaku.png", "text": "ワクワク", "pos": "top"},
    {"file": "stamp-22-toutoi.png", "text": "尊い…", "pos": "top"},
    {"file": "stamp-23-onaka.png", "text": "お腹すいたー", "pos": "top"},
    {"file": "stamp-24-atsuryoku.png", "text": "（無言の圧力）", "pos": "top"},
    {"file": "stamp-25-gomi.png", "text": "ゴミみっけ", "pos": "top"},
    {"file": "stamp-26-chiritori.png", "text": "チリトリは相棒", "pos": "top"},
    {"file": "stamp-27-majo.png", "text": "魔女のお供", "pos": "top"},
    {"file": "stamp-28-ittekimasu.png", "text": "いってきます", "pos": "top"},
    {"file": "stamp-29-tadaima.png", "text": "ただいま", "pos": "top"},
    {"file": "stamp-30-itterasshai.png", "text": "いってらっしゃい", "pos": "bottom"},
    {"file": "stamp-31-itadakimasu.png", "text": "いただきます", "pos": "top"},
    {"file": "stamp-32-gochisou.png", "text": "ごちそうさま", "pos": "top"},
    {"file": "stamp-33-omedetou.png", "text": "おめでとう", "pos": "bottom"},
    {"file": "stamp-34-ganbatte.png", "text": "がんばって", "pos": "bottom"},
    {"file": "stamp-35-daijoubu.png", "text": "大丈夫？", "pos": "top"},
    {"file": "stamp-36-matte.png", "text": "待っててね", "pos": "top"},
    {"file": "stamp-37-kanryou.png", "text": "おそうじ完了", "pos": "top"},
    {"file": "stamp-38-pikapika.png", "text": "ピカピカ！", "pos": "top"},
    {"file": "stamp-39-matane.png", "text": "またねー", "pos": "top"},
    {"file": "stamp-40-houki.png", "text": "ほおきちゃんだよ", "pos": "top"},
]

FILL = (255, 255, 255, 255)
STROKE = (212, 84, 24, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    last_err = None
    for path, index in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size=size, index=index)
        except OSError as err:
            last_err = err
    raise RuntimeError(f"No Japanese font found: {last_err}")


def remove_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    arr = np.array(im)
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    spread = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    is_bg = (r > 226) & (g > 220) & (b > 200) & (spread < 52)

    h, w = is_bg.shape
    reachable = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if is_bg[0, x]:
            q.append((0, x))
        if is_bg[h - 1, x]:
            q.append((h - 1, x))
    for y in range(h):
        if is_bg[y, 0]:
            q.append((y, 0))
        if is_bg[y, w - 1]:
            q.append((y, w - 1))

    while q:
        y, x = q.pop()
        if y < 0 or x < 0 or y >= h or x >= w or reachable[y, x] or not is_bg[y, x]:
            continue
        # span fill
        left = x
        while left > 0 and is_bg[y, left - 1] and not reachable[y, left - 1]:
            left -= 1
        right = x
        while right < w - 1 and is_bg[y, right + 1] and not reachable[y, right + 1]:
            right += 1
        reachable[y, left : right + 1] = True
        for nx in range(left, right + 1):
            if y > 0 and is_bg[y - 1, nx] and not reachable[y - 1, nx]:
                q.append((y - 1, nx))
            if y < h - 1 and is_bg[y + 1, nx] and not reachable[y + 1, nx]:
                q.append((y + 1, nx))

    alpha = arr[:, :, 3].astype(np.int16)
    alpha[reachable] = 0
    arr[:, :, 3] = alpha.astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    # Slight edge feather so cutouts aren't jagged.
    a = out.split()[3].filter(ImageFilter.GaussianBlur(radius=0.6))
    out.putalpha(a)
    return out


def crop_opaque(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def fit_into(im: Image.Image, box_w: int, box_h: int) -> Image.Image:
    scale = min(box_w / im.width, box_h / im.height)
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def text_block_size(text: str, font: ImageFont.FreeTypeFont, stroke: int) -> tuple[int, int]:
    dummy = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    lines = text.split("\n")
    widths = []
    heights = []
    for line in lines:
        bbox = dummy.textbbox((0, 0), line, font=font, stroke_width=stroke)
        widths.append(bbox[2] - bbox[0])
        heights.append(bbox[3] - bbox[1])
    return max(widths) if widths else 0, sum(heights) + 4 * (len(lines) - 1)


def choose_font(text: str, max_w: int, max_h: int) -> tuple[ImageFont.FreeTypeFont, int]:
    for size in range(54, 20, -2):
        stroke = max(3, size // 11)
        font = load_font(size)
        tw, th = text_block_size(text, font, stroke)
        if tw <= max_w and th <= max_h:
            return font, stroke
    font = load_font(22)
    return font, 3


def draw_caption(canvas: Image.Image, text: str, pos: str) -> None:
    draw = ImageDraw.Draw(canvas)
    font, stroke = choose_font(text, STAMP_W - 16, 78)
    lines = text.split("\n")
    line_sizes = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke)
        line_sizes.append((bbox[2] - bbox[0], bbox[3] - bbox[1]))
    total_h = sum(h for _, h in line_sizes) + 4 * (len(lines) - 1)
    y = 6 if pos == "top" else STAMP_H - total_h - 8
    for line, (lw, lh) in zip(lines, line_sizes):
        x = (STAMP_W - lw) // 2
        draw.text(
            (x, y),
            line,
            font=font,
            fill=FILL,
            stroke_width=stroke,
            stroke_fill=STROKE,
        )
        y += lh + 4


def compose_stamp(spec: dict) -> Image.Image:
    src = Image.open(RAW / spec["file"])
    cut = crop_opaque(remove_background(src))
    canvas = Image.new("RGBA", (STAMP_W, STAMP_H), (0, 0, 0, 0))
    skip = spec.get("skip_text", False)
    pos = spec["pos"]
    if skip:
        char = fit_into(cut, STAMP_W - 12, STAMP_H - 12)
        xy = ((STAMP_W - char.width) // 2, (STAMP_H - char.height) // 2)
    elif pos == "top":
        char = fit_into(cut, STAMP_W - 10, STAMP_H - 78)
        xy = ((STAMP_W - char.width) // 2, STAMP_H - char.height - 4)
    else:
        char = fit_into(cut, STAMP_W - 10, STAMP_H - 72)
        xy = ((STAMP_W - char.width) // 2, 4)
    canvas.alpha_composite(char, xy)
    if not skip:
        draw_caption(canvas, spec["text"], pos)
    return canvas


def compose_square(src_name: str, size: int) -> Image.Image:
    cut = crop_opaque(remove_background(Image.open(RAW / src_name)))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fitted = fit_into(cut, size - 8, size - 8)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def compose_tab() -> Image.Image:
    cut = crop_opaque(remove_background(Image.open(RAW / "stamp-tab.png")))
    canvas = Image.new("RGBA", (TAB_W, TAB_H), (0, 0, 0, 0))
    fitted = fit_into(cut, TAB_W, TAB_H)
    canvas.alpha_composite(fitted, ((TAB_W - fitted.width) // 2, (TAB_H - fitted.height) // 2))
    return canvas


def make_preview(stamps: list[Image.Image]) -> Image.Image:
    cols, rows = 8, 5
    gap = 12
    cell_w, cell_h = STAMP_W, STAMP_H
    sheet = Image.new(
        "RGBA",
        (cols * cell_w + (cols + 1) * gap, rows * cell_h + (rows + 1) * gap),
        (255, 248, 236, 255),
    )
    for i, stamp in enumerate(stamps):
        r, c = divmod(i, cols)
        x = gap + c * (cell_w + gap)
        y = gap + r * (cell_h + gap)
        bg = Image.new("RGBA", (cell_w, cell_h), (255, 255, 255, 255))
        bg.alpha_composite(stamp)
        sheet.alpha_composite(bg, (x, y))
    return sheet.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    finished = []
    for i, spec in enumerate(STAMPS, start=1):
        stamp = compose_stamp(spec)
        name = f"{i:02d}.png"
        stamp.save(OUT / name, "PNG", optimize=True)
        finished.append(stamp)
        print(f"saved {name}  {spec['text'].replace(chr(10), '/')}")

    compose_square("stamp-01-ohayou.png", MAIN_SIZE).save(OUT / "main.png", "PNG", optimize=True)
    print("saved main.png")
    compose_tab().save(OUT / "tab.png", "PNG", optimize=True)
    print("saved tab.png")
    make_preview(finished).save(PREVIEW, "PNG", optimize=True)
    print(f"saved {PREVIEW}")


if __name__ == "__main__":
    main()
