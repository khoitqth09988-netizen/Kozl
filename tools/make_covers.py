#!/usr/bin/env python3
"""Sinh ảnh bìa cho Kozl Music.

    python3 tools/make_covers.py

Kết quả:
  assets/playlists/    bìa playlist tuyển chọn (dựng từ 2 bìa gốc)
  assets/presets/      8 ảnh bìa dựng sẵn để người dùng chọn khi đổi ảnh bài hát

Cần: pillow  (pip install pillow)
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COV = os.path.join(ROOT, "assets", "covers")
PL = os.path.join(ROOT, "assets", "playlists")
PRE = os.path.join(ROOT, "assets", "presets")
os.makedirs(PL, exist_ok=True)
os.makedirs(PRE, exist_ok=True)

rose = Image.open(os.path.join(COV, "bloodstained-rose.jpg")).convert("RGB")
alley = Image.open(os.path.join(COV, "dakey.jpg")).convert("RGB")


def square(im, size):
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    return im.resize((size, size), Image.LANCZOS)


def grain(im, amount=10):
    w, h = im.size
    noise = Image.effect_noise((w, h), 26).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(0.4))
    n = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(im, ImageChops.add(im, n, scale=2.0, offset=-amount), 0.35)


def duotone(im, dark, light):
    g = ImageEnhance.Contrast(im.convert("L")).enhance(1.22)
    return Image.merge("RGB", [
        g.point(lambda v, a=a, b=b: int(a + (b - a) * v / 255))
        for a, b in zip(dark, light)
    ])


def vignette(im, strength=0.55):
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w // 5))
    dark = Image.new("RGB", (w, h), (4, 4, 6))
    return Image.composite(im, dark, mask.point(lambda v: int(255 - (255 - v) * strength)))


def save(im, path, quality=88):
    im.convert("RGB").save(path, quality=quality, optimize=True)
    print("·", os.path.relpath(path, ROOT))


def collage(size=640):
    canvas = Image.new("RGB", (size, size), (9, 9, 11))
    half = size // 2
    canvas.paste(square(alley, half), (0, 0))
    canvas.paste(square(rose, half), (half, 0))
    canvas.paste(square(rose, half).transpose(Image.FLIP_LEFT_RIGHT), (0, half))
    canvas.paste(square(alley, half).transpose(Image.FLIP_LEFT_RIGHT), (half, half))
    canvas = canvas.filter(ImageFilter.GaussianBlur(0.6))
    canvas = ImageEnhance.Brightness(canvas).enhance(0.9)
    canvas = ImageEnhance.Color(canvas).enhance(1.04)
    return grain(canvas, 8)


def main():
    save(collage(640), os.path.join(PL, "kozl-essentials.jpg"))

    duo = duotone(square(alley, 640), (10, 14, 26), (255, 168, 92))
    duo = Image.blend(duo, duotone(square(rose, 640), (8, 6, 12), (255, 92, 120)), 0.32)
    save(vignette(grain(duo, 9), 0.5), os.path.join(PL, "after-hours.jpg"))

    for name in ("kozl-essentials", "after-hours"):
        src = Image.open(os.path.join(PL, name + ".jpg")).convert("RGB")
        save(src.resize((64, 64), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5)),
             os.path.join(PL, name + "-blur.jpg"), 70)

    S = 800

    # 01 — đỏ thẫm
    save(vignette(grain(duotone(square(rose, S), (14, 4, 10), (255, 96, 96)), 12), .6),
         os.path.join(PRE, "01-crimson.jpg"))

    # 02 — xanh mòng két
    save(vignette(grain(duotone(square(alley, S), (2, 8, 14), (120, 232, 220)), 12), .65),
         os.path.join(PRE, "02-teal-noir.jpg"))

    # 03 — hoàng hôn
    img = Image.new("RGB", (S, S))
    d = ImageDraw.Draw(img)
    top, mid, bot = (24, 10, 46), (196, 62, 92), (255, 176, 92)
    for y in range(S):
        t = y / S
        if t < 0.62:
            k = t / 0.62
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.62) / 0.38
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        d.line([(0, y), (S, y)], fill=c)
    d.ellipse([S * 0.28, S * 0.5, S * 0.72, S * 0.94], fill=(255, 214, 148))
    hill = [(0, S * 0.74)]
    for x in range(0, S + 1, 20):
        hill.append((x, S * 0.74 + math.sin(x / 90) * 22 + math.sin(x / 37) * 9))
    hill += [(S, S), (0, S)]
    d.polygon(hill, fill=(26, 12, 26))
    img = grain(img.filter(ImageFilter.GaussianBlur(2.2)), 7)
    save(vignette(img, .45), os.path.join(PRE, "03-sunset.jpg"))

    # 04 — lưới neon
    img = Image.new("RGB", (S, S), (8, 4, 20))
    d = ImageDraw.Draw(img)
    for i in range(0, S, 40):
        d.line([(0, i), (S, i)], fill=(38, 22, 74), width=2)
        d.line([(i, 0), (i, S)], fill=(38, 22, 74), width=2)
    for i in range(9):
        x, y = S * 0.5, S * 0.52 + i * 26
        w = 30 + i * 70
        d.arc([x - w, y - w * 0.36, x + w, y + w * 0.36], 200, 340, fill=(255, 90, 160), width=3)
    img = img.filter(ImageFilter.GaussianBlur(1.4))
    img = ImageChops.add(img, img.filter(ImageFilter.GaussianBlur(18)), scale=1.6)
    save(vignette(grain(img, 8), .5), os.path.join(PRE, "04-neon-grid.jpg"))

    # 05 — giấy kem
    img = Image.new("RGB", (S, S), (238, 231, 219))
    d = ImageDraw.Draw(img)
    d.ellipse([S * 0.42, S * 0.3, S * 0.58, S * 0.46], fill=(198, 74, 58))
    for i in range(6):
        d.line([(S * 0.2, S * 0.62 + i * 16), (S * 0.8, S * 0.62 + i * 16)], fill=(62, 54, 48), width=2)
    save(grain(img, 12), os.path.join(PRE, "05-cream.jpg"))

    # 06 — băng VHS
    img = duotone(square(rose, S), (10, 2, 24), (255, 120, 190))
    d = ImageDraw.Draw(img)
    for y in range(0, S, 4):
        d.line([(0, y), (S, y)], fill=(0, 0, 0), width=1)
    img = Image.blend(img.filter(ImageFilter.GaussianBlur(1.1)), Image.new("RGB", (S, S), (18, 6, 26)), 0.12)
    save(grain(img, 14), os.path.join(PRE, "06-vhs.jpg"))

    # 07 — đĩa than
    img = Image.new("RGB", (S, S), (14, 14, 17))
    d = ImageDraw.Draw(img)
    for r in range(40, int(S * 0.72), 9):
        shade = 26 + int(18 * (r % 18) / 18)
        d.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], outline=(shade, shade, shade + 3), width=2)
    d.ellipse([S * 0.42, S * 0.42, S * 0.58, S * 0.58], fill=(200, 60, 30))
    d.ellipse([S * 0.487, S * 0.487, S * 0.513, S * 0.513], fill=(10, 10, 12))
    sheen = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sheen).ellipse([-S * 0.2, -S * 0.5, S * 1.1, S * 0.6], fill=70)
    sheen = sheen.filter(ImageFilter.GaussianBlur(S // 8))
    img = Image.composite(ImageEnhance.Brightness(img).enhance(1.7), img, sheen)
    save(grain(img, 8), os.path.join(PRE, "07-vinyl.jpg"))

    # 08 — ảnh bạc màu
    img = ImageEnhance.Color(square(alley, S)).enhance(0.35)
    img = Image.blend(img, Image.new("RGB", (S, S), (226, 216, 198)), 0.45)
    save(grain(img, 14), os.path.join(PRE, "08-faded-photo.jpg"))


if __name__ == "__main__":
    main()
