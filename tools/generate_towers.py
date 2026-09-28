"""Generate tower base + rotating turret sprite sheets.

Output:
  assets/sprites/towers/<id>_base.png    48x48, 1 frame
  assets/sprites/towers/<id>_turret.png  48x48 x4 (idle, flash, flash2, recoil)
Turret frames point +x; the game rotates them to the aim angle.
"""
import os, sys, math
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P, o_poly, rect, ell, line, px, poly

FW = FH = 48
TYPES = {
    "gunner":      dict(color="#5b8cff", accent="#cfe0ff"),
    "shotgun":     dict(color="#ff9b4a", accent="#ffd9b0"),
    "sniper":      dict(color="#9d7bff", accent="#e0d4ff"),
    "flamethrower":dict(color="#ff6a3d", accent="#ffc27a"),
    "tesla":       dict(color="#4ae0ff", accent="#c8f7ff"),
    "barricade":   dict(color="#b9a06a", accent="#ead9a8"),
    "medic":       dict(color="#59e0a0", accent="#c9ffe4"),
    "mortar":      dict(color="#c9a24a", accent="#ffe6a8"),
}


def frame():
    im = pa.new(FW, FH)
    return im, ImageDraw.Draw(im)


def mount(d, col):
    # dark base ring where the turret pivots
    ell(d, 16, 16, 32, 32, P["ink"])
    ell(d, 17, 17, 31, 31, P["metal_d"])
    ell(d, 19, 19, 29, 29, P["metal"])
    ell(d, 20, 19, 27, 26, P["metal_l"])


def draw_turret(tid, col, acc, mode):
    im, d = frame()
    piv = (24, 24)
    recoil = 2 if mode == "recoil" else 0
    if tid == "tesla":
        # coil: vertical rod with glowing orb
        rect(d, 22, 8 + recoil, 25, 26, P["ink"])
        rect(d, 23, 9 + recoil, 24, 26, P["metal_l"])
        glow = mode in ("flash", "flash2")
        orb = P["cyan"] if not glow else P["white"]
        ell(d, 18, 2 + recoil, 30, 14 + recoil, P["ink"])
        ell(d, 19, 3 + recoil, 29, 13 + recoil, P["cyan"])
        ell(d, 21, 5 + recoil, 27, 11 + recoil, orb)
        for i in range(6):
            a = i / 6 * pa.TAU
            line(d, [(24 + int(math.cos(a) * 9), 8 + recoil + int(math.sin(a) * 9)),
                     (24 + int(math.cos(a) * 14), 8 + recoil + int(math.sin(a) * 14))],
                 P["cyan"] if glow else P["metal_l"], 1)
        return im
    if tid == "mortar":
        # short fat tube angled +x
        rect(d, 6, 16 - recoil, 34, 30 - recoil, P["ink"])
        poly(d, [(8, 18 - recoil), (38, 12 - recoil), (40, 20 - recoil), (8, 28 - recoil)], P["ink"])
        poly(d, [(9, 19 - recoil), (37, 13 - recoil), (39, 19 - recoil), (9, 27 - recoil)], col)
        line(d, [(10, 20 - recoil), (37, 14 - recoil)], acc, 1)
        rect(d, 4, 18 - recoil, 12, 30 - recoil, P["metal_l"])
    elif tid == "flamethrower":
        # tank + nozzle
        rect(d, 8, 14, 20, 34, P["ink"])
        rect(d, 9, 15, 19, 33, P["rust"])
        rect(d, 10, 16, 18, 22, P["rust_l"])
        line(d, [(22, 24 - recoil), (34, 24 - recoil)], P["ink"], 7)
        line(d, [(22, 24 - recoil), (34, 24 - recoil)], P["metal"], 5)
        ell(d, 33, 20 - recoil, 39, 28 - recoil, P["ink"])
        ell(d, 34, 21 - recoil, 38, 27 - recoil, P["rust_l"])
    elif tid == "sniper":
        line(d, [(10, 23), (40 - recoil, 23)], P["ink"], 6)
        line(d, [(10, 23), (40 - recoil, 23)], col, 4)
        line(d, [(10, 22), (39 - recoil, 22)], acc, 1)
        rect(d, 18, 12, 28, 20, P["ink"])
        rect(d, 19, 13, 27, 18, P["metal"])
        rect(d, 20, 14, 26, 16, P["cyan"] if mode != "idle" else P["metal_l"])
        rect(d, 12, 18, 20, 30, P["metal_d"])
    elif tid == "shotgun":
        for dy in (-5, 1):
            line(d, [(12, 24 + dy), (36 - recoil, 24 + dy)], P["ink"], 6)
            line(d, [(12, 24 + dy), (36 - recoil, 24 + dy)], col, 4)
            line(d, [(12, 23 + dy), (35 - recoil, 23 + dy)], acc, 1)
        rect(d, 10, 14, 22, 34, P["ink"])
        rect(d, 11, 15, 21, 33, P["metal"])
        rect(d, 12, 16, 20, 22, P["metal_l"])
    else:  # gunner
        line(d, [(8, 23), (38 - recoil, 23)], P["ink"], 7)
        line(d, [(8, 23), (38 - recoil, 23)], col, 4)
        line(d, [(9, 21), (37 - recoil, 21)], acc, 1)
        rect(d, 10, 26, 30, 30, P["metal_d"])
        rect(d, 14, 14, 26, 32, P["ink"])
        rect(d, 15, 15, 25, 31, P["metal"])
        rect(d, 16, 16, 24, 21, P["metal_l"])
    # muzzle flash
    if mode in ("flash", "flash2"):
        r = 4 if mode == "flash" else 7
        ex = 38 if tid != "mortar" else 40
        ell(d, ex - 1, 24 - r, ex + r * 2, 24 + r, P["orange"])
        ell(d, ex, 24 - r + 2, ex + r + 2, 24 + r - 2, P["gold"])
        ell(d, ex + 1, 22, ex + r, 26, P["white"])
    return im


def draw_base(tid, col, acc):
    im, d = frame()
    if tid == "barricade":
        # stacked planks + posts
        rect(d, 4, 26, 44, 44, P["ink"])
        for i in range(3):
            y = 28 + i * 6
            rect(d, 6, y, 42, y + 6, P["leather_d"])
            rect(d, 7, y + 1, 41, y + 5, P["leather"])
            line(d, [(8, y + 1), (40, y + 1)], P["leather_l"], 1)
            for nx in (12, 34):
                px(d, nx, y + 3, P["metal_l"])
        rect(d, 8, 20, 12, 46, P["ink"]); rect(d, 9, 21, 11, 45, P["leather_d"])
        rect(d, 36, 20, 40, 46, P["ink"]); rect(d, 37, 21, 39, 45, P["leather_d"])
        return im
    if tid == "medic":
        # tent with a red cross
        rect(d, 6, 34, 42, 46, P["ink"])
        poly(d, [(6, 36), (24, 16), (42, 36)], P["ink"])
        poly(d, [(8, 35), (24, 19), (40, 35)], P["cloth_l"])
        poly(d, [(10, 35), (24, 21), (38, 35)], P["cloth"])
        rect(d, 21, 24, 27, 34, P["white"])
        rect(d, 18, 27, 30, 31, P["white"])
        rect(d, 22, 25, 26, 33, P["blood_l"])
        rect(d, 19, 28, 29, 30, P["blood_l"])
        return im
    # armored emplacement platform with a colour trim band
    rect(d, 5, 26, 43, 46, P["ink"])
    rect(d, 6, 27, 42, 45, P["metal_d"])
    rect(d, 8, 29, 40, 44, P["metal"])
    rect(d, 9, 30, 39, 32, P["metal_l"])
    rect(d, 9, 42, 39, 44, P["ink"])
    rect(d, 8, 35, 40, 38, col)
    line(d, [(9, 36), (39, 36)], acc, 1)
    for nx in (11, 24, 37):
        px(d, nx, 31, P["metal_xl"])
    px(d, 11, 41, P["metal_d"]); px(d, 37, 41, P["metal_d"])
    # central pivot mount
    ell(d, 15, 19, 33, 35, P["ink"])
    ell(d, 16, 20, 32, 34, P["metal_d"])
    ell(d, 18, 22, 30, 31, P["metal_l"])
    return im


def main():
    out = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "towers")
    os.makedirs(out, exist_ok=True)
    for tid, c in TYPES.items():
        draw_base(tid, c["color"], c["accent"]).save(os.path.join(out, tid + "_base.png"))
        if tid in ("barricade", "medic"):
            continue
        cols = [draw_turret(tid, c["color"], c["accent"], m)
                for m in ("idle", "flash", "flash2", "recoil")]
        pa.sheet([cols], FW, FH).save(os.path.join(out, tid + "_turret.png"))
    print("towers done")


if __name__ == "__main__":
    main()
