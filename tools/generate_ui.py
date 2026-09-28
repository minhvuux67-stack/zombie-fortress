"""Generate pixel-art UI chrome: panels, buttons, bars, icons, cursor."""
import os, sys, math
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "ui")


def panel(size=48):
    """Wood-and-iron 9-slice panel."""
    im = pa.new(size, size)
    d = ImageDraw.Draw(im)
    pa.rect(d, 0, 0, size - 1, size - 1, "#241a2e")
    pa.rect(d, 2, 2, size - 3, size - 3, "#3a2a34")
    pa.rect(d, 4, 4, size - 5, size - 5, "#2a1e28")
    # wooden planks
    for x in range(5, size - 5, 10):
        pa.line(d, [(x, 5), (x, size - 6)], "#241a26", 1)
    # iron corner rivets
    for (x, y) in [(3, 3), (size - 5, 3), (3, size - 5), (size - 5, size - 5)]:
        pa.rect(d, x, y, x + 2, y + 2, P["metal_l"])
        pa.rect(d, x + 1, y + 1, x + 1, y + 1, P["metal_xl"])
    pa.line(d, [(0, 0), (size - 1, 0)], P["metal_l"], 1)
    pa.line(d, [(0, size - 1), (size - 1, size - 1)], P["ink"], 1)
    return im


def button(w=128, h=32):
    """Stacked normal / hover / pressed states."""
    im = pa.new(w, h * 3)
    d = ImageDraw.Draw(im)
    states = [
        ("#3d4a6b", "#5b6b95", "#8b9bc4"),
        ("#4a5c82", "#6b80b0", "#a8b8dc"),
        ("#2a3145", "#3d4a6b", "#5b6b95"),
    ]
    for i, (base, mid, hi) in enumerate(states):
        y0 = i * h
        pad = 1
        pa.rect(d, 0, y0, w - 1, y0 + h - 1, P["ink"])
        pa.rect(d, pad, y0 + pad, w - 1 - pad, y0 + h - 1 - pad, base)
        pa.rect(d, pad + 1, y0 + pad + 1, w - 2 - pad, y0 + h - 2 - pad, mid)
        off = 2 if i == 2 else 0
        pa.rect(d, pad + 2, y0 + pad + 2 + off, w - 3 - pad, y0 + h - 3 - pad, base)
        pa.line(d, [(pad + 1, y0 + pad + 1), (w - 2 - pad, y0 + pad + 1)], hi, 1)
        pa.line(d, [(pad + 1, y0 + pad + 1), (pad + 1, y0 + h - 2 - pad)], hi, 1)
        pa.line(d, [(w - 2 - pad, y0 + pad + 2), (w - 2 - pad, y0 + h - 2 - pad)], P["ink"], 1)
        pa.line(d, [(pad + 2, y0 + h - 2 - pad), (w - 2 - pad, y0 + h - 2 - pad)], P["ink"], 1)
    return im


def bar(w=64, h=12):
    im = pa.new(w, h * 2)
    d = ImageDraw.Draw(im)
    for i in range(2):
        y0 = i * h
        pa.rect(d, 0, y0, w - 1, y0 + h - 1, P["ink"])
        if i == 0:
            pa.rect(d, 1, y0 + 1, w - 2, y0 + h - 2, "#1a1424")
        else:
            pa.rect(d, 1, y0 + 1, w - 2, y0 + h - 2, P["green"])
            pa.rect(d, 1, y0 + 1, w - 2, y0 + 2, "#a8ffcf")
            pa.rect(d, 1, y0 + h - 3, w - 2, y0 + h - 2, "#2a8a55")
    return im


def icon(kind, n=24):
    im = pa.new(n, n)
    d = ImageDraw.Draw(im)
    c = n // 2
    if kind == "scrap":
        pa.rect(d, 3, 6, 20, 18, P["ink"])
        pa.rect(d, 4, 7, 19, 17, P["metal"])
        pa.rect(d, 5, 8, 18, 12, P["metal_l"])
        pa.line(d, [(5, 14), (18, 14)], P["ink"], 1)
        pa.rect(d, 7, 10, 9, 15, P["rust_l"])
    elif kind == "gold":
        pa.ell(d, 3, 3, 21, 21, P["ink"])
        pa.ell(d, 4, 4, 20, 20, "#b8860b")
        pa.ell(d, 6, 6, 18, 18, P["gold"])
        pa.ell(d, 8, 8, 15, 14, "#ffe9a0")
        pa.rect(d, 11, 9, 13, 16, "#b8860b")
    elif kind == "food":
        pa.ell(d, 2, 2, 22, 22, P["ink"])
        pa.ell(d, 3, 3, 21, 21, "#8a3a2a")
        pa.ell(d, 5, 5, 19, 19, "#c05a3a")
        pa.ell(d, 8, 8, 16, 16, "#e88a5a")
        pa.rect(d, 11, 4, 13, 10, "#3f6b1f")
    elif kind == "meds":
        pa.rect(d, 2, 7, 22, 20, P["ink"])
        pa.rect(d, 3, 8, 21, 19, P["white"])
        pa.rect(d, 4, 9, 20, 14, "#c8d0dc")
        pa.rect(d, 10, 10, 14, 18, P["blood_l"])
        pa.rect(d, 7, 12, 17, 15, P["blood_l"])
    elif kind == "skull":
        pa.ell(d, 3, 2, 21, 18, P["ink"])
        pa.ell(d, 4, 3, 20, 17, "#d8d2c0")
        pa.rect(d, 7, 8, 9, 11, P["ink"])
        pa.rect(d, 14, 8, 16, 11, P["ink"])
        pa.rect(d, 10, 14, 13, 16, P["ink"])
        pa.rect(d, 8, 18, 15, 21, "#d8d2c0")
    elif kind == "lock":
        pa.rect(d, 5, 11, 19, 21, P["ink"])
        pa.rect(d, 6, 12, 18, 20, P["metal"])
        pa.arc if False else None
        for a in range(180, 361, 20):
            x = 12 + int(math.cos(math.radians(a)) * 5)
            y = 13 + int(math.sin(math.radians(a)) * 5)
            pa.px(d, x, y, P["metal_l"])
        pa.rect(d, 10, 15, 14, 19, P["gold"])
    elif kind == "star":
        pa.poly(d, [(12, 1), (15, 9), (23, 9), (17, 14), (19, 22),
                    (12, 17), (5, 22), (7, 14), (1, 9), (9, 9)], P["ink"])
        pa.poly(d, [(12, 3), (14, 10), (21, 10), (16, 14), (18, 20),
                    (12, 16), (6, 20), (8, 14), (3, 10), (10, 10)], P["gold"])
    return im


def skill(kind, n=40):
    im = pa.new(n, n)
    d = ImageDraw.Draw(im)
    c = n // 2
    pa.rect(d, 0, 0, n - 1, n - 1, "#101018")
    pa.rect(d, 2, 2, n - 3, n - 3, "#2a1e28")
    if kind == "airstrike":
        pa.poly(d, [(6, 12), (34, 20), (6, 28)], "#3f6b1f")
        pa.poly(d, [(10, 16), (28, 20), (10, 24)], "#7fbf2a")
        pa.ell(d, 26, 26, 36, 34, P["orange"])
        pa.ell(d, 28, 28, 34, 32, P["gold"])
    elif kind == "freeze":
        for k in range(6):
            a = k / 6 * pa.TAU
            pa.line(d, [(c, c), (c + int(math.cos(a) * 13), c + int(math.sin(a) * 13))], P["cyan"], 3)
        pa.ell(d, c - 4, c - 4, c + 4, c + 4, P["white"])
    elif kind == "repair":
        pa.rect(d, 10, 8, 30, 34, P["metal_d"])
        pa.rect(d, 12, 10, 28, 32, P["metal"])
        pa.rect(d, 17, 14, 23, 28, P["green"])
        pa.rect(d, 13, 19, 27, 23, P["green"])
    elif kind == "rage":
        pa.poly(d, [(c, 4), (34, 18), (30, 34), (10, 34), (6, 18)], P["ink"])
        pa.poly(d, [(c, 7), (31, 19), (27, 31), (13, 31), (9, 19)], P["blood"])
        pa.poly(d, [(c, 12), (26, 20), (24, 28), (16, 28), (14, 20)], P["blood_l"])
        pa.rect(d, 15, 20, 18, 24, P["ink"]); pa.rect(d, 22, 20, 25, 24, P["ink"])
    elif kind == "medkit":
        pa.rect(d, 4, 12, 36, 34, P["ink"])
        pa.rect(d, 5, 13, 35, 33, P["white"])
        pa.rect(d, 6, 13, 34, 18, "#c8d0dc")
        pa.rect(d, 17, 17, 23, 31, P["blood_l"])
        pa.rect(d, 12, 21, 28, 27, P["blood_l"])
        pa.rect(d, 15, 8, 25, 13, P["ink"])
    return im


def cursor(n=24):
    im = pa.new(n, n)
    d = ImageDraw.Draw(im)
    pa.poly(d, [(2, 1), (2, 17), (6, 13), (9, 20), (12, 19), (9, 12), (15, 12)], P["ink"])
    pa.poly(d, [(3, 3), (3, 15), (6, 12), (9, 18), (10, 18), (7, 11), (13, 11)], P["white"])
    pa.poly(d, [(4, 5), (4, 13), (7, 10), (10, 15), (7, 10), (11, 10)], P["metal_l"])
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    panel().save(os.path.join(OUT, "panel.png"))
    button().save(os.path.join(OUT, "button.png"))
    bar().save(os.path.join(OUT, "bar.png"))
    for k in ("scrap", "gold", "food", "meds", "skull", "lock", "star"):
        icon(k).save(os.path.join(OUT, "icon_" + k + ".png"))
    for k in ("airstrike", "freeze", "repair", "rage", "medkit"):
        skill(k).save(os.path.join(OUT, "skill_" + k + ".png"))
    cursor().save(os.path.join(OUT, "cursor.png"))
    # contact sheet
    imgs = ["panel", "cursor", "icon_scrap", "icon_gold", "icon_food", "icon_meds",
            "icon_skull", "icon_lock", "icon_star"]
    sheet = Image.new("RGBA", (500, 90), (20, 22, 30, 255))
    x = 0
    for n in imgs:
        im = Image.open(os.path.join(OUT, n + ".png"))
        sheet.alpha_composite(im, (x, 4)); x += im.width + 6
    for k in ("airstrike", "freeze", "repair", "rage", "medkit"):
        sheet.alpha_composite(Image.open(os.path.join(OUT, "skill_" + k + ".png")), (x, 4))
        x += 44
    sheet.alpha_composite(Image.open(os.path.join(OUT, "button.png")), (x, 4))
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save("/tmp/bcode/ui_preview.png")
    print("ui done")


if __name__ == "__main__":
    main()
