"""Generate the fortress wall tileset + gate emblem."""
import os, sys, random
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "fortress")
S = 64


def wall(seed=5, blood=False):
    im = pa.new(S, S)
    d = ImageDraw.Draw(im)
    rng = random.Random(seed)
    rows = 4
    bh = S // rows
    for r in range(rows):
        y = r * bh
        off = (bh // 2) if r % 2 else 0
        for c in range(-1, 5):
            x = c * (S // 3) + off
            bw = S // 3
            col = rng.choice(["#3d4a6b", "#46527a", "#343f5e", "#4d5a82"])
            pa.rect(d, x, y, x + bw - 2, y + bh - 2, "#1c2233")
            pa.rect(d, x + 1, y + 1, x + bw - 3, y + bh - 3, col)
            pa.line(d, [(x + 1, y + 1), (x + bw - 3, y + 1)], "#5b6b95", 1)
            pa.line(d, [(x + 1, y + 1), (x + 1, y + bh - 3)], "#5b6b95", 1)
            pa.line(d, [(x + bw - 3, y + 1), (x + bw - 3, y + bh - 3)], "#242c42", 1)
            # damage speckle
            if rng.random() < 0.35:
                px = x + rng.randint(2, max(3, bw - 3))
                py = y + rng.randint(2, max(3, bh - 3))
                pa.rect(d, px, py, px + rng.randint(1, 3), py + rng.randint(1, 2), "#1c2233")
    if blood:
        for _ in range(6):
            x = rng.randint(0, S - 8); y = rng.randint(0, S - 12)
            pa.rect(d, x, y, x + rng.randint(1, 3), y + rng.randint(3, 9), P["blood_d"])
    return im


def gate():
    im = pa.new(96, 160)
    d = ImageDraw.Draw(im)
    # steel gate with cross-bracing
    pa.rect(d, 0, 0, 96, 160, "#151a28")
    pa.rect(d, 4, 4, 91, 156, "#2a3145")
    pa.rect(d, 8, 8, 87, 152, "#3d4a6b")
    for x in range(8, 88, 18):
        pa.rect(d, x, 8, x + 3, 152, "#1c2233")
        pa.rect(d, x + 1, 8, x + 2, 152, "#5b6b95")
    pa.line(d, [(8, 20), (87, 140)], "#1c2233", 5)
    pa.line(d, [(87, 20), (8, 140)], "#1c2233", 5)
    pa.line(d, [(8, 20), (87, 140)], "#46527a", 2)
    pa.line(d, [(87, 20), (8, 140)], "#46527a", 2)
    # glowing hazard light
    pa.ell(d, 40, 70, 56, 90, "#1c2233")
    pa.ell(d, 43, 73, 53, 87, P["bossred"])
    pa.ell(d, 46, 76, 50, 82, "#ffd9dd")
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    wall().save(os.path.join(OUT, "wall.png"))
    wall(seed=17, blood=True).save(os.path.join(OUT, "wall_blood.png"))
    gate().save(os.path.join(OUT, "gate.png"))
    print("fortress done")


if __name__ == "__main__":
    main()
