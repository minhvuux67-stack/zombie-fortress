"""Generate pixel-art particle / effect sprite sheets.

Output: assets/effects/<name>.png (columns = frames, 1 row)
"""
import os, sys, math, random
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "effects")


def frame(n):
    return pa.new(n, n), None


def explosion(n=64, frames=10, hot="#ff7a3a", core="#ffe6a0"):
    out = []
    rng = random.Random(5)
    for i in range(frames):
        t = i / (frames - 1)
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        r = int(6 + t * (n // 2 - 6))
        a = int(255 * (1 - t))
        # layered rings
        for rr, col in ((r, hot), (int(r * 0.68), core), (int(r * 0.34), "#ffffff")):
            if rr <= 0:
                continue
            pa.ell(d, n // 2 - rr, n // 2 - rr, n // 2 + rr, n // 2 + rr,
                   col, a if col != "#ffffff" else int(a * 0.8))
        # jagged puffs
        for k in range(10):
            ang = k / 10 * pa.TAU + i * 0.2
            px = n // 2 + int(math.cos(ang) * r * rng.uniform(0.7, 1.05))
            py = n // 2 + int(math.sin(ang) * r * rng.uniform(0.7, 1.05))
            s = max(1, int((1 - t) * 6))
            pa.ell(d, px - s, py - s, px + s, py + s, rng.choice([hot, core, "#ffb347"]), a)
        out.append(im)
    return pa.sheet([out], n, n)


def muzzle(n=32, frames=5):
    out = []
    for i in range(frames):
        t = i / (frames - 1)
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        r = int(3 + t * 10)
        pa.ell(d, n // 2 - r, n // 2 - r, n // 2 + r, n // 2 + r, P["orange"])
        pa.ell(d, n // 2 - r + 2, n // 2 - r + 2, n // 2 + r - 2, n // 2 + r - 2, P["gold"])
        pa.ell(d, n // 2 - r // 2, n // 2 - r // 2, n // 2 + r // 2, n // 2 + r // 2, P["white"])
        for k in range(4):
            a = k / 4 * pa.TAU + t
            pa.line(d, [(n // 2, n // 2),
                        (n // 2 + int(math.cos(a) * (r + 4)), n // 2 + int(math.sin(a) * (r + 4)))],
                    P["gold"], 1)
        out.append(im)
    return pa.sheet([out], n, n)


def blood(n=32, frames=6):
    out = []
    rng = random.Random(9)
    for i in range(frames):
        t = i / (frames - 1)
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        for _ in range(14 + i * 6):
            a = rng.uniform(0, pa.TAU)
            rr = rng.uniform(1, 3 + t * 12)
            x = n // 2 + int(math.cos(a) * rr)
            y = n // 2 + int(math.sin(a) * rr * 0.8)
            s = max(1, int(3 * (1 - t)) + 1)
            pa.ell(d, x - s, y - s, x + s, y + s,
                   rng.choice([P["blood"], P["blood_l"], P["blood_l"], P["blood_d"]]),
                   int(255 * (1 - t * 0.6)))
        out.append(im)
    return pa.sheet([out], n, n)


def smoke(n=48, frames=8):
    out = []
    rng = random.Random(21)
    for i in range(frames):
        t = i / (frames - 1)
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        for _ in range(7):
            cx = n // 2 + int(rng.uniform(-8, 8) * t)
            cy = n // 2 - int(t * 14) + int(rng.uniform(-6, 6))
            r = int(4 + t * rng.uniform(6, 12))
            grey = rng.choice(["#3a3a44", "#4a4a55", "#2c2c34"])
            pa.ell(d, cx - r, cy - r, cx + r, cy + r, grey, int(160 * (1 - t)))
        out.append(im)
    return pa.sheet([out], n, n)


def fire(n=32, frames=8):
    out = []
    rng = random.Random(31)
    for i in range(frames):
        t = i / frames
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        for k in range(14):
            x = n // 2 + int(rng.uniform(-7, 7))
            h = int(rng.uniform(4, 16) * (1 - k / 20))
            y = n - 4 - int(rng.uniform(0, 14)) - int(t * 4) % 10
            col = rng.choice([P["orange"], P["gold"], "#ff5a1a", P["white"]])
            pa.rect(d, x, y - h, x + 2, y, col)
        out.append(im)
    return pa.sheet([out], n, n)


def spark(n=16, frames=4):
    out = []
    for i in range(frames):
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        r = 4 - i
        pa.ell(d, n // 2 - r, n // 2 - r, n // 2 + r, n // 2 + r, P["gold"])
        pa.ell(d, n // 2 - r + 1, n // 2 - r + 1, n // 2 + r - 1, n // 2 + r - 1, P["white"])
        out.append(im)
    return pa.sheet([out], n, n)


def ice(n=32, frames=6):
    out = []
    rng = random.Random(43)
    for i in range(frames):
        t = i / (frames - 1)
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        for k in range(6):
            a = k / 6 * pa.TAU + t
            ln = int(6 + t * 8)
            pa.line(d, [(n // 2, n // 2),
                        (n // 2 + int(math.cos(a) * ln), n // 2 + int(math.sin(a) * ln))],
                    P["cyan"], 2)
        pa.ell(d, n // 2 - 3, n // 2 - 3, n // 2 + 3, n // 2 + 3, P["white"])
        out.append(im)
    return pa.sheet([out], n, n)


def lightning(n=32, frames=4):
    out = []
    rng = random.Random(53)
    for i in range(frames):
        im = pa.new(n, n)
        d = ImageDraw.Draw(im)
        x, y = n // 2, 2
        pts = [(x, y)]
        while y < n - 2:
            x += rng.randint(-5, 5); y += rng.randint(4, 8)
            pts.append((max(1, min(n - 2, x)), min(n - 2, y)))
        pa.line(d, pts, P["cyan"], 3)
        pa.line(d, pts, P["white"], 1)
        out.append(im)
    return pa.sheet([out], n, n)


def fog(w=256, h=128, frames=4):
    out = []
    rng = random.Random(61)
    for i in range(frames):
        im = pa.new(w, h)
        d = ImageDraw.Draw(im)
        for _ in range(60):
            x = rng.randint(-20, w); y = rng.randint(0, h)
            rw = rng.randint(20, 60)
            pa.ell(d, x, y, x + rw, y + rng.randint(4, 10), "#9aa4b4",
                   rng.randint(10, 26))
        out.append(im)
    return pa.sheet([out], w, h)


def rain(frames=4, w=64, h=64):
    out = []
    rng = random.Random(71)
    for i in range(frames):
        im = pa.new(w, h)
        d = ImageDraw.Draw(im)
        for _ in range(40):
            x = rng.randint(0, w); y = rng.randint(0, h)
            pa.line(d, [(x, y), (x - 1, y + 5)], "#aac4e0", 1)
        out.append(im)
    return pa.sheet([out], w, h)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, im in {
        "explosion.png": explosion(),
        "explosion_big.png": explosion(n=96, frames=12),
        "muzzle.png": muzzle(),
        "blood.png": blood(),
        "smoke.png": smoke(),
        "fire.png": fire(),
        "spark.png": spark(),
        "ice.png": ice(),
        "lightning.png": lightning(),
        "fog.png": fog(),
        "rain.png": rain(),
    }.items():
        im.save(os.path.join(OUT, name))
        print("fx", name)
    # combined contact sheet for review
    from PIL import Image
    sheet = Image.new("RGBA", (1100, 200), (20, 22, 30, 255))
    x = 0
    for name in ["explosion", "muzzle", "blood", "smoke", "fire", "spark", "ice", "lightning"]:
        im = Image.open(os.path.join(OUT, name + ".png"))
        sheet.alpha_composite(im, (x, 0)); x += im.width + 4
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save("/tmp/bcode/fx_preview.png")


if __name__ == "__main__":
    main()
