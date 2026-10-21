#!/usr/bin/env python3
"""Erzeugt die App-Icons (PNG 180/192/512) mit Pillow. Aufruf: python3 scripts/make_icons.py"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
BG, ACCENT, WARN, FG = (11, 13, 18), (10, 132, 255), (255, 159, 10), (238, 241, 246)


def draw(size: int) -> Image.Image:
    s = 1024
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    # Raster
    for i in range(1, 6):
        y = int(s * (0.2 + i * 0.12))
        d.line([(int(s * .12), y), (int(s * .88), y)], fill=(30, 36, 50), width=6)
    # Gestrichelte Limit-Linie
    y_lim = int(s * .34)
    for x in range(int(s * .12), int(s * .88), 60):
        d.line([(x, y_lim), (x + 32, y_lim)], fill=WARN, width=14)
    # Druckkurve (Spielzeugform: schneller Anstieg, langsamer Abfall)
    pts = []
    for i in range(200):
        t = i / 199
        p = (t / .22) ** 2 * math.exp(2 * (1 - t / .22)) if t > 0 else 0
        pts.append((s * (.12 + .76 * t), s * (.86 - .48 * min(p, 1.05))))
    d.line(pts, fill=ACCENT, width=46, joint="curve")
    # Schriftzug
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 190)
    except OSError:
        font = ImageFont.load_default()
    d.text((s * .5, s * .17), "CS", fill=FG, font=font, anchor="mm")
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    draw(180).save(os.path.join(OUT, "apple-touch-icon.png"))
    draw(192).save(os.path.join(OUT, "icon-192.png"))
    draw(512).save(os.path.join(OUT, "icon-512.png"))
    print("Icons geschrieben nach", os.path.abspath(OUT))
