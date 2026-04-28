#!/usr/bin/env python3
"""
Generate placeholder PNG previews for restaurant sizes.
Writes files to public/res/previews/{W}x{H}.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'public', 'res', 'previews')
os.makedirs(OUT_DIR, exist_ok=True)

sizes = [(10,6),(10,7),(14,6),(13,9),(16,12),(20,12)]
CELL = 16  # pixels per cell
PADDING = 4

for w,h in sizes:
    img_w = w * CELL + PADDING * 2
    img_h = h * CELL + PADDING * 2
    img = Image.new('RGBA', (img_w, img_h), (249,251,255,255))
    draw = ImageDraw.Draw(img)

    # outer border
    draw.rectangle([PADDING, PADDING, img_w-PADDING-1, img_h-PADDING-1], outline=(17,88,214,255), width=2)

    # grid lines (terminate slightly inside the outer border so lines don't stick out)
    for i in range(1, w):
        x = PADDING + i * CELL
        draw.line([(x, PADDING+1), (x, img_h-PADDING-2)], fill=(75,85,99,230), width=1)
    for j in range(1, h):
        y = PADDING + j * CELL
        draw.line([(PADDING+1, y), (img_w-PADDING-2, y)], fill=(75,85,99,230), width=1)

    # no label on preview images; labels are shown in the UI below the image
    label = f"{w}×{h}"

    out_path = os.path.join(OUT_DIR, f"{w}x{h}.png")
    img.save(out_path)
    print("Wrote", out_path)

    # also write a dark-mode variant
    dark = Image.new('RGBA', (img_w, img_h), (7,16,41,255))
    dd = ImageDraw.Draw(dark)
    # outer border (lighter blue)
    dd.rectangle([PADDING, PADDING, img_w-PADDING-1, img_h-PADDING-1], outline=(125,167,255,255), width=2)
    for i in range(1, w):
        x = PADDING + i * CELL
        dd.line([(x, PADDING+1), (x, img_h-PADDING-2)], fill=(154,167,184,220), width=1)
    for j in range(1, h):
        y = PADDING + j * CELL
        dd.line([(PADDING+1, y), (img_w-PADDING-2, y)], fill=(154,167,184,220), width=1)
    # no label on dark preview images; labels are shown in the UI below the image
    out_dark = os.path.join(OUT_DIR, f"{w}x{h}-dark.png")
    dark.save(out_dark)
    print("Wrote", out_dark)
