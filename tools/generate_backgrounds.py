"""Generate parallax background layers + ground tiles + a large menu splash.

Everything is authored at low resolution then upscaled with NEAREST so it stays
crisp pixel art.  Layers with alpha are meant to be scrolled at different
speeds at runtime.
"""
import os, sys, math, random
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds")
LW, LH = 480, 270          # authoring resolution
SCALE = 4                  # -> 1920x1080


def up(im, s=SCALE):
    return im.resize((im.width * s, im.height * s), Image.NEAREST)


def sky():
    im = pa.new(LW, LH)
    d = ImageDraw.Draw(im)
    # vertical gradient, red apocalypse dusk
    top = (22, 16, 38); mid = (74, 26, 44); bot = (140, 52, 46)
    for y in range(LH):
        t = y / LH
        if t < 0.55:
            k = t / 0.55
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        d.line([(0, y), (LW, y)], fill=c + (255,))
    rng = random.Random(11)
    # blood moon
    pa.ell(d, 330, 30, 396, 96, "#3a1a22")
    pa.ell(d, 336, 36, 392, 92, "#c8503f")
    pa.ell(d, 342, 42, 386, 86, "#e87a5a")
    pa.ell(d, 350, 48, 372, 78, "#f0a06a")
    for _ in range(24):
        x, y = rng.randint(340, 384), rng.randint(40, 88)
        pa.ell(d, x, y, x + rng.randint(1, 3), y + rng.randint(1, 3), "#c8503f")
    # clouds - long horizontal smears
    for _ in range(26):
        y = rng.randint(8, 150)
        x = rng.randint(-40, LW)
        w = rng.randint(30, 120)
        h = rng.randint(2, 5)
        col = rng.choice(["#3a2030", "#4a2438", "#5a2c3c", "#2c1a2c"])
        pa.ell(d, x, y, x + w, y + h, col)
    # distant skyline silhouette
    x = -6
    while x < LW:
        bw = rng.randint(14, 38)
        bh = rng.randint(24, 70)
        y = 178 - bh
        pa.rect(d, x, y, x + bw, 190, "#1a1428")
        pa.rect(d, x, y, x + bw, y + 3, "#241a34")
        for wy in range(y + 6, 184, 7):
            for wx in range(x + 3, x + bw - 3, 6):
                if rng.random() < 0.22:
                    pa.rect(d, wx, wy, wx + 2, wy + 2, rng.choice(["#7a4a3a", "#5a3a44", "#3a2a3a"]))
        x += bw + rng.randint(2, 6)
    return im


def city_mid():
    im = pa.new(LW, LH)
    d = ImageDraw.Draw(im)
    rng = random.Random(29)
    ybase = 214
    x = -10
    while x < LW:
        bw = rng.randint(26, 64)
        bh = rng.randint(40, 108)
        y = ybase - bh
        pa.rect(d, x, y, x + bw, ybase + 22, "#141020")
        pa.rect(d, x, y, x + bw, y + 4, "#241a2e")
        # windows
        for wy in range(y + 8, ybase - 6, 9):
            for wx in range(x + 4, x + bw - 4, 8):
                r = rng.random()
                if r < 0.3:
                    pa.rect(d, wx, wy, wx + 3, wy + 4, "#d9a04a")
                elif r < 0.45:
                    pa.rect(d, wx, wy, wx + 3, wy + 4, "#7a5a3a")
                elif r < 0.5:
                    pa.rect(d, wx, wy, wx + 3, wy + 4, "#4a3a4a")
        # broken roof / fire glow
        if rng.random() < 0.35:
            pa.ell(d, x + bw // 3, y - 3, x + bw // 2, y + 3, "#ff7a3a")
        # smoke
        for _ in range(rng.randint(0, 3)):
            sx = x + rng.randint(2, max(3, bw - 4)); sy = y - rng.randint(2, 10)
            pa.ell(d, sx, sy, sx + rng.randint(3, 8), sy + rng.randint(3, 8), "#241a24")
        x += bw + rng.randint(3, 10)
    return im


def fence_near():
    im = pa.new(LW, LH)
    d = ImageDraw.Draw(im)
    rng = random.Random(47)
    # foreground ruins strip along the bottom
    pa.rect(d, 0, 250, LW, LH, "#0e0a16")
    # chain-link fence posts + mesh
    for x in range(0, LW, 42):
        pa.rect(d, x, 150, x + 3, 258, "#1a1424")
        pa.rect(d, x, 150, x + 2, 258, "#2c2438")
    prev = None
    for x in range(0, LW, 6):
        pa.line(d, [(x, 200), (x + 10, 150)], "#241c30", 1)
    for x in range(0, LW, 6):
        pa.line(d, [(x, 150), (x + 10, 200)], "#241c30", 1)
    # barbed wire
    pa.line(d, [(0, 148), (LW, 148)], "#3a3244", 2)
    for x in range(6, LW, 14):
        pa.line(d, [(x - 3, 145), (x + 3, 151)], "#4a4254", 1)
    # dead trees
    for _ in range(5):
        x = rng.randint(20, LW - 20)
        pa.rect(d, x, 170, x + 4, 258, "#160f1a")
        for _ in range(4):
            ang = rng.uniform(-1.2, 1.2)
            ln = rng.randint(8, 22)
            y0 = rng.randint(172, 200)
            pa.line(d, [(x + 2, y0), (x + 2 + int(math.sin(ang) * ln), y0 - ln)], "#160f1a", 2)
    # rubble
    for _ in range(120):
        x = rng.randint(0, LW); y = rng.randint(252, LH - 2)
        pa.rect(d, x, y, x + rng.randint(1, 4), y + rng.randint(1, 3), rng.choice(["#1a1424", "#241c30", "#100c18"]))
    return im


def ground_tile(seed=7, size=64):
    """Seamless cracked-asphalt / dirt tile."""
    im = pa.new(size, size)
    d = ImageDraw.Draw(im)
    rng = random.Random(seed)
    pa.rect(d, 0, 0, size, size, "#39383f")
    for _ in range(size * size // 5):
        x = rng.randrange(size); y = rng.randrange(size)
        v = rng.choice(["#43424a", "#313037", "#4c4b54", "#2a2930"])
        pa.px(d, x, y, v)
    # cracks that wrap around the edges
    for _ in range(5):
        x = rng.randrange(size); y = rng.randrange(size)
        ang = rng.uniform(0, pa.TAU)
        for _ in range(rng.randint(8, 22)):
            nx = (x + int(math.cos(ang))) % size
            ny = (y + int(math.sin(ang))) % size
            pa.px(d, nx, ny, "#1d1c22")
            ang += rng.uniform(-0.5, 0.5)
            x, y = nx, ny
    # small debris, wrap drawn four times for seamlessness
    for _ in range(40):
        x = rng.randrange(size); y = rng.randrange(size)
        w = rng.randint(1, 3); h = rng.randint(1, 2)
        c = rng.choice(["#4c4b54", "#64626d", "#26252b"])
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                pa.rect(d, x + ox, y + oy, x + ox + w, y + oy + h, c)
    return im


def grass_tile(seed=13, size=64):
    im = pa.new(size, size)
    d = ImageDraw.Draw(im)
    rng = random.Random(seed)
    pa.rect(d, 0, 0, size, size, "#33381f")
    for _ in range(size * size // 4):
        x = rng.randrange(size); y = rng.randrange(size)
        v = rng.choice(["#3a4022", "#2c3018", "#454a28", "#262a14"])
        pa.px(d, x, y, v)
    for _ in range(70):
        x = rng.randrange(size); y = rng.randrange(size)
        h = rng.randint(2, 4)
        c = rng.choice(["#5a6a2a", "#6d7a34", "#8a9a44"])
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                pa.line(d, [(x + ox, y + oy), (x + ox, y + oy - h)], c, 1)
    return im


def splash():
    """Large pixel-art menu splash, 3840x2160."""
    sw, sh = 960, 540
    im = pa.new(sw, sh)
    d = ImageDraw.Draw(im)
    rng = random.Random(3)
    # reuse the sky palette as a backdrop
    top = (18, 13, 32); mid = (80, 28, 44); bot = (150, 56, 48)
    for y in range(sh):
        t = y / sh
        if t < 0.6:
            c = tuple(int(top[i] + (mid[i] - top[i]) * (t / 0.6)) for i in range(3))
        else:
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * ((t - 0.6) / 0.4)) for i in range(3))
        d.line([(0, y), (sw, y)], fill=c + (255,))
    pa.ell(d, 700, 40, 850, 190, "#4a2028")
    pa.ell(d, 715, 55, 835, 175, "#d8604a")
    pa.ell(d, 735, 75, 815, 155, "#f0a06a")
    # fortress silhouette left
    pa.rect(d, 0, 250, 210, 540, "#160f1e")
    for y in range(250, 540, 34):
        pa.rect(d, 196, y, 214, y + 18, "#100a16")
    pa.poly(d, [(0, 250), (210, 250), (210, 236), (0, 236)], "#241830")
    for i in range(3):
        pa.poly(d, [(30 + i * 60, 236), (48 + i * 60, 210), (66 + i * 60, 236)], "#241830")
    # zombie horde silhouettes right
    for i in range(60):
        x = 260 + rng.randint(0, 680); y = 480 - rng.randint(0, 60)
        h = rng.randint(34, 60)
        pa.rect(d, x, y - h, x + 14, y, "#0e0a14")
        pa.ell(d, x - 3, y - h - 16, x + 17, y - h + 4, "#0e0a14")
    return im.resize((sw * 4, sh * 4), Image.NEAREST)


def main():
    os.makedirs(OUT, exist_ok=True)
    layers = {
        "sky.png": sky(),
        "city_far.png": sky(),      # retained as a second distant layer
        "city_mid.png": city_mid(),
        "fence_near.png": fence_near(),
    }
    for name, im in layers.items():
        up(im).save(os.path.join(OUT, name))
        print("bg", name)
    tiles = os.path.join(OUT, "..", "tiles")
    os.makedirs(tiles, exist_ok=True)
    up(ground_tile(), 4).save(os.path.join(tiles, "ground.png"))
    up(grass_tile(), 4).save(os.path.join(tiles, "grass.png"))
    up(ground_tile(seed=23), 4).save(os.path.join(tiles, "ground_blood.png"))
    splash().save(os.path.join(OUT, "splash.png"))
    print("splash done")


if __name__ == "__main__":
    main()
