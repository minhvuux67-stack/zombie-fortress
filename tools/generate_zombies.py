"""Generate pixel-art sprite sheets for every zombie type.

Output: assets/sprites/zombies/<id>.png
Sheet layout: 8 columns x 6 rows, 48x48 per frame.
Rows: 0 idle(4) 1 walk(8) 2 attack(6) 3 hurt(2) 4 death(8) 5 spawn(4)
"""
import os, sys, math
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import pixel_art as pa
from pixel_art import P

FW, FH = 48, 48
COLS = 8

# palette per zombie ---------------------------------------------------------
ZOMBIES = {
    "walker": dict(skin=P["skin"], skinD=P["skin_d"], skinL=P["skin_l"],
                   cloth=P["cloth"], clothD=P["cloth_d"], clothL=P["cloth_l"],
                   leatherD=P["leather_d"], eye="#d6ff7a",
                   height=38, width=13, headR=6, shoulder=15),
    "runner": dict(skin="#a9b45c", skinD="#6f7736", skinL="#d7dd91",
                   cloth="#4a3d2a", clothD="#2e2618", clothL="#7a6540",
                   leatherD=P["leather_d"], eye="#fff2a0",
                   height=37, width=10, headR=5, shoulder=13),
    "tank": dict(skin="#8f9a7a", skinD="#5c6650", skinL="#bcc7a4",
                 cloth="#3a3f2e", clothD="#242819", clothL="#5c6347",
                 leatherD=P["leather_d"], eye="#c8ff8a", belly=1.0,
                 height=40, width=20, headR=6, shoulder=20),
    "spitter": dict(skin="#7fc24a", skinD="#4f7c2b", skinL="#b3e07a",
                    cloth="#3f4a2a", clothD="#28301a", clothL="#697a44",
                    leatherD=P["leather_d"], eye="#eaff7a", belly=0.7,
                    height=36, width=15, headR=6, shoulder=16),
    "screamer": dict(skin="#a06fbf", skinD="#6a3f85", skinL="#cf9fe4",
                     cloth="#3a2a4a", clothD="#241830", clothL="#5f4a78",
                     leatherD=P["leather_d"], eye="#ff7ae0",
                     height=38, width=13, headR=7, shoulder=15),
    "boss": dict(skin="#c65a6b", skinD="#82303d", skinL="#e88a97",
                 cloth="#2a1a2e", clothD="#1a0f1e", clothL="#4a2a52",
                 leatherD=P["leather_d"], eye="#ffce4a", belly=0.8,
                 height=42, width=24, headR=9, shoulder=24),
    "brute": dict(skin="#b98a5a", skinD="#7a5630", skinL="#dcb27f",
                  cloth="#4a3a2a", clothD="#2e2418", clothL="#75603f",
                  leatherD=P["leather_d"], eye="#ffb347",
                  height=40, width=20, headR=7, shoulder=22),
    "crawler": dict(skin=P["skin"], skinD=P["skin_d"], skinL=P["skin_l"],
                    cloth=P["cloth"], clothD=P["cloth_d"], clothL=P["cloth_l"],
                    leatherD=P["leather_d"], eye="#d6ff7a",
                    height=20, width=12, headR=5, shoulder=12),
    "bomber": dict(skin="#8a9a6a", skinD="#55613c", skinL="#b8c78f",
                   cloth="#5a3a2a", clothD="#382215", clothL="#8a5c3f",
                   leatherD=P["leather_d"], eye="#ff9b4a", belly=0.5,
                   height=37, width=15, headR=6, shoulder=16),
    "shield": dict(skin="#7f8f6a", skinD="#4f5c3f", skinL="#aebd8f",
                   cloth="#2f3a4a", clothD="#1c2430", clothL="#4f5f78",
                   leatherD=P["leather_d"], eye="#c8ff8a",
                   height=38, width=14, headR=6, shoulder=16),
    "splitter": dict(skin="#b06ad8", skinD="#6d3a8a", skinL="#dba6ef",
                     cloth="#3a2a4a", clothD="#241830", clothL="#5f4a78",
                     leatherD=P["leather_d"], eye="#ff9ae0", belly=1.2,
                     height=38, width=17, headR=6, shoulder=18),
    "healer": dict(skin="#5fd0b0", skinD="#337c68", skinL="#a6f0dd",
                   cloth="#2a4a44", clothD="#18302c", clothL="#4a7a70",
                   leatherD=P["leather_d"], eye="#d6fff0", belly=0.4,
                   height=37, width=14, headR=6, shoulder=16),
    "colossus": dict(skin="#a06ac0", skinD="#5f3a7a", skinL="#cf9fe4",
                     cloth="#2a1a3a", clothD="#180f24", clothL="#4a2a62",
                     leatherD=P["leather_d"], eye="#f0a6ff", belly=0.9,
                     height=42, width=25, headR=9, shoulder=25),
}

EXTRA_ANIMS = {"boss": True}


def base_pose(**kw):
    p = dict(lean=0.0, stride=0.0, arms=0.5, bob=0, mouth=0.15, drop=0.0, side=0.0)
    p.update(kw)
    return p


def render(pal, pose, opts):
    im = pa.new(FW, FH)
    d = ImageDraw.Draw(im)
    if opts.get("crawler"):
        pa.draw_crawler(d, pal, pose, opts)
    else:
        pa.draw_biped(d, pal, pose, opts)
    return im


def row_idle(pal, o):
    out = []
    for i in range(4):
        t = i / 4
        out.append(render(pal, base_pose(bob=int(-1 - math.sin(t * pa.TAU)),
                                         arms=0.45 + 0.06 * math.sin(t * pa.TAU),
                                         mouth=0.15 + 0.1 * math.sin(t * pa.TAU)), o))
    return out


def row_walk(pal, o, n=8):
    out = []
    for i in range(n):
        t = i / n
        stride = math.sin(t * pa.TAU)
        out.append(render(pal, base_pose(lean=0.18, stride=stride,
                                         arms=0.62 + 0.18 * math.sin(t * pa.TAU + 0.6),
                                         bob=int(-abs(math.sin(t * pa.TAU)) * 1.6),
                                         mouth=0.25, side=-stride * 0.3), o))
    return out


def row_attack(pal, o, n=6):
    out = []
    for i in range(n):
        t = i / (n - 1)
        lunge = math.sin(t * math.pi)
        out.append(render(pal, base_pose(lean=0.35 + lunge * 0.3,
                                         arms=0.7 + lunge * 0.3,
                                         stride=0.4 * lunge, bob=int(-lunge * 2),
                                         mouth=0.6 + lunge * 0.4, side=-0.2 * lunge), o))
    return out


def row_hurt(pal, o):
    out = []
    for i in range(2):
        s = 1 if i == 0 else -1
        out.append(render(pal, base_pose(lean=-0.25 * s, arms=0.3,
                                         bob=-1, mouth=0.8, side=0.4 * s), o))
    return out


def row_death(pal, o, n=8):
    out = []
    for i in range(n):
        t = i / (n - 1)
        if t < 0.75:
            pose = base_pose(lean=-0.35, arms=0.2 + t * 0.4,
                             bob=int(t * 14), mouth=0.85, side=t * 0.8, drop=0)
            im = render(pal, pose, o)
        else:
            im = render_dead(pal, o, (t - 0.75) / 0.25)
        out.append(im)
    return out


def render_dead(pal, o, t):
    im = pa.new(FW, FH)
    d = ImageDraw.Draw(im)
    ground = 45
    # a crumpled heap: dark silhouette with a hint of colour
    pa.poly(d, [(12, ground - 6), (34, ground - 9), (38, ground - 3), (10, ground - 1)], P["ink"])
    pa.poly(d, [(14, ground - 5), (32, ground - 7), (35, ground - 3), (12, ground - 2)], pal["clothD"])
    pa.ell(d, 32, ground - 8, 42, ground - 2, P["ink"])
    pa.ell(d, 33, ground - 7, 41, ground - 2, pal["skinD"])
    if t > 0.5:
        pa.ell(d, 8, ground - 2, 22, ground + 2, P["blood_d"])
    return im


def row_spawn(pal, o, n=4):
    out = []
    for i in range(n):
        t = i / (n - 1)
        pose = base_pose(lean=0.2, arms=0.3 + t * 0.3, bob=int((1 - t) * 10),
                         mouth=0.5, drop=1 - t)
        out.append(render(pal, pose, o))
    return out


def build(zid, pal):
    opts = dict(cx=24, ground=46, height=pal.get("height", 38),
                width=pal.get("width", 13), headR=pal.get("headR", 6),
                shoulder=pal.get("shoulder", 15), belly=pal.get("belly", 0),
                crawler=(zid == "crawler"))
    rows = [row_idle(pal, opts), row_walk(pal, opts), row_attack(pal, opts),
            row_hurt(pal, opts), row_death(pal, opts), row_spawn(pal, opts)]
    return pa.sheet(rows, FW, FH)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "zombies")
    os.makedirs(out_dir, exist_ok=True)
    for zid, pal in ZOMBIES.items():
        s = build(zid, pal)
        s.save(os.path.join(out_dir, zid + ".png"))
        print("zombie", zid, s.size)


if __name__ == "__main__":
    main()
