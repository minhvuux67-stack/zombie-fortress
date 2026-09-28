"""Shared pixel-art drawing helpers.

Everything is drawn at native sprite resolution (no smooth scaling), so the
result is genuine pixel art: hard edges, limited palette, hand-placed shading.
"""
import math, random
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# "modern pixel" palette - 32 colours, close to Dead Cells / Brotato ramps
# ---------------------------------------------------------------------------
P = {
    "ink":      "#101018",
    "shadow":   "#1a1f2e",
    "night":    "#232a3d",

    "skin_d":   "#3f5c33",
    "skin":     "#6d9a4a",
    "skin_l":   "#a6c96e",
    "skin_xl":  "#d3e39a",

    "rot_d":    "#5a3a44",
    "rot":      "#8a5a5e",
    "rot_l":    "#b9807f",

    "bone_d":   "#8f8a72",
    "bone":     "#cfc7a6",
    "bone_l":   "#f0ead2",

    "cloth_d":  "#2a3145",
    "cloth":    "#3d4a6b",
    "cloth_l":  "#5b6b95",
    "cloth_xl": "#8b9bc4",

    "leather_d":"#402d1a",
    "leather":  "#6b4a2a",
    "leather_l":"#9a6f3e",

    "metal_d":  "#2f3547",
    "metal":    "#5a6780",
    "metal_l":  "#8b99b5",
    "metal_xl": "#c2cde0",

    "rust_d":   "#5a3320",
    "rust":     "#8a5028",
    "rust_l":   "#c07a3a",

    "blood_d":  "#5c1620",
    "blood":    "#9c2532",
    "blood_l":  "#e0434f",

    "acid_d":   "#3f6b1f",
    "acid":     "#7fbf2a",
    "acid_l":   "#c8f05a",

    "green":    "#57e08a",
    "cyan":     "#4ae0ff",
    "gold":     "#ffce4a",
    "orange":   "#ff9b4a",
    "purple":   "#c06fd8",
    "bossred":  "#e0526b",
    "white":    "#f4f7ff",
}

TAU = math.pi * 2


def new(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def _rgb(hexs, a=255):
    hexs = hexs.lstrip("#")
    return (int(hexs[0:2], 16), int(hexs[2:4], 16), int(hexs[4:6], 16), a)


def px(d, x, y, c, a=255):
    d.point((x, y), fill=_rgb(c, a))


def rect(d, x0, y0, x1, y1, c, a=255):
    d.rectangle([x0, y0, x1, y1], fill=_rgb(c, a))


def ell(d, x0, y0, x1, y1, c, a=255):
    d.ellipse([x0, y0, x1, y1], fill=_rgb(c, a))


def poly(d, pts, c, a=255):
    d.polygon(pts, fill=_rgb(c, a))


def line(d, pts, c, w=1, a=255):
    d.line(pts, fill=_rgb(c, a), width=w, joint="curve")


def _expand(pts, cx, cy, pad):
    out = []
    for (x, y) in pts:
        dx, dy = x - cx, y - cy
        l = math.hypot(dx, dy) or 1
        out.append((x + dx / l * pad, y + dy / l * pad))
    return out


def o_poly(d, pts, fill, ink=None, pad=1):
    """Outlined polygon: dark silhouette then the fill on top."""
    ink = ink or P["ink"]
    if pad:
        cxm = sum(p[0] for p in pts) / len(pts)
        cym = sum(p[1] for p in pts) / len(pts)
        poly(d, _expand(pts, cxm, cym, pad), ink)
    poly(d, pts, fill)


def limb(d, pts, col, ink=None, w=4, cap=True):
    """Two/three segment limb with a 1px outline on each side."""
    ink = ink or P["ink"]
    line(d, pts, ink, w + 2)
    line(d, pts, col, w)
    if cap:
        ex, ey = pts[-1]
        ell(d, ex - w // 2, ey - w // 2, ex + w // 2, ey + w // 2, ink)
        ell(d, ex - w // 2 + 1, ey - w // 2 + 1, ex + w // 2 - 1, ey + w // 2 - 1, col)


# ---------------------------------------------------------------------------
# Biped (zombie / soldier) renderer - 3/4 view, facing left
# ---------------------------------------------------------------------------
# Pose keys: lean, stride(-1..1), arms(0..1), bob(px), mouth(0..1),
#            drop(0..1), side(-1..1)


def draw_biped(d, pal, pose, o):
    cx = o.get("cx", 24)
    ground = o.get("ground", 45)
    h = o.get("height", 38)
    w = o.get("width", 12)
    headr = o.get("headR", 5)
    belly = o.get("belly", 0)

    lean = pose.get("lean", 0.0)
    stride = pose.get("stride", 0.0)
    arms = pose.get("arms", 0.5)
    bob = pose.get("bob", 0)
    mouth = pose.get("mouth", 0.2)
    drop = pose.get("drop", 0.0)
    side = pose.get("side", 0.0)

    sk, skd, skl = pal["skin"], pal["skinD"], pal["skinL"]
    cl, cld, cll = pal["cloth"], pal["clothD"], pal["clothL"]
    ink = P["ink"]

    if drop > 0.5:
        ground_h = ground + 6
    else:
        ground_h = ground

    hx = cx - int(lean * 5)
    headY = ground_h - h + headr + 1 + bob
    shoulderY = headY + headr - 1
    hipY = ground_h - int(h * 0.42)

    shw = w // 2 + int(belly * 4)                 # shoulder half-width
    waist = max(3, w // 2 - 2 + int(belly * 2))

    reach = arms * 7

    # ---- back arm (behind body) ------------------------------------------
    bay = shoulderY + 1
    bex = hx + 5 - int(reach * 0.2)
    line(d, [(hx + 3, bay), (hx + 5, bay + 4), (bex + 4, bay + 7)], ink, 4)
    line(d, [(hx + 3, bay), (hx + 5, bay + 4), (bex + 4, bay + 7)], skd, 2)

    # ---- back leg ---------------------------------------------------------
    for back in (True, False):
        sgn = -1 if back else 1
        sw = stride * 6 * sgn
        hipx = hx + (1 if back else -2)
        knee = (hipx + int(sw * 0.55), (hipY + ground_h) // 2 + 1)
        foot = (hipx + int(sw), ground_h - 1)
        if drop > 0.5:
            knee = (hipx + 4 * sgn, ground_h - 3)
            foot = (hipx + 9 * sgn, ground_h - 1)
        col = cld if back else cl
        line(d, [(hipx, hipY), knee, foot], ink, 5)
        line(d, [(hipx, hipY), knee, foot], col, 3)
        # boot
        rect(d, foot[0] - 3, foot[1] - 2, foot[0] + 2, foot[1], ink)
        rect(d, foot[0] - 3, foot[1] - 1, foot[0] + 2, foot[1], P["leather"])
        if back:
            pass

    # ---- torso ------------------------------------------------------------
    torso = [
        (hx - shw, shoulderY), (hx + shw, shoulderY),
        (hx + waist + int(side), hipY), (hx - waist + int(side), hipY + 1),
    ]
    o_poly(d, torso, cld, ink, 1)
    inner = [
        (hx - shw + 1, shoulderY + 1), (hx + shw - 1, shoulderY + 1),
        (hx + waist - 1 + int(side), hipY - 1), (hx - waist + 1 + int(side), hipY),
    ]
    poly(d, inner, cl)
    # lit left edge + belt
    line(d, [(hx - shw + 1, shoulderY + 1), (hx - waist + 1 + int(side), hipY)], cll, 1)
    line(d, [(hx - waist, hipY), (hx + waist + int(side), hipY - 1)], P["leather_d"], 2)
    # belly shading
    if belly > 0.2 and hipY - 2 > shoulderY + 6:
        ell(d, hx - shw + 2, shoulderY + 3, hx + shw - 2, hipY - 1, cll)
        ell(d, hx - shw + 3, shoulderY + 4, hx + shw - 3, hipY - 2, cl)

    # ---- head / upper body forward lean ----------------------------------
    hcx = hx - int(lean * 2)
    ell(d, hcx - headr - 1, headY - headr - 1, hcx + headr + 1, headY + headr + 1, ink)
    ell(d, hcx - headr, headY - headr, hcx + headr, headY + headr, skd)
    ell(d, hcx - headr, headY - headr, hcx + headr - 1, headY + headr - 1, sk)
    ell(d, hcx - headr + 1, headY - headr + 1, hcx + headr - 3, headY + headr - 3, skl)
    if pal.get("hair"):
        for i in range(-headr, headr + 1, 2):
            px(d, hcx + i, headY - headr, pal["hair"])
            px(d, hcx + i, headY - headr + 1, pal["hair"])
    # brow + eyes
    line(d, [(hcx - headr + 1, headY - 2), (hcx + headr - 2, headY - 2)], ink, 1)
    rect(d, hcx - 3, headY - 1, hcx - 2, headY, ink)
    rect(d, hcx + 1, headY - 1, hcx + 2, headY, ink)
    px(d, hcx - 3, headY, pal.get("eye", P["acid_l"]))
    px(d, hcx + 2, headY, pal.get("eye", P["acid_l"]))
    # mouth / jaw
    if mouth > 0.15:
        mh = max(1, int(mouth * 3))
        rect(d, hcx - 3, headY + 2, hcx + 2, headY + 1 + mh, ink)
        if mouth > 0.55:
            for tx in (-2, 0, 2):
                px(d, hcx + tx, headY + 2, P["bone"])
    else:
        line(d, [(hcx - 3, headY + 3), (hcx + 2, headY + 3)], ink, 1)

    # ---- front arm (in front of torso) -----------------------------------
    fay = shoulderY + 2
    fex = hx - 4 - int(reach)
    fey = fay + int((1 - arms) * 5)
    limb(d, [(hx - 2, fay), ((hx + fex) // 2 - 1, fay - int(arms * 3)), (fex, fey)],
         sk, ink, 4)
    ell(d, fex - 2, fey - 2, fex + 2, fey + 2, ink)
    ell(d, fex - 1, fey - 1, fex + 2, fey + 2, sk)
    return (hcx, headY)


def draw_crawler(d, pal, pose, o):
    cx = o.get("cx", 24)
    ground = o.get("ground", 44)
    cl, cld, cll = pal["cloth"], pal["clothD"], pal["clothL"]
    sk, skd, skl = pal["skin"], pal["skinD"], pal["skinL"]
    ink = P["ink"]
    stride = pose.get("stride", 0)

    # dragging legs (behind)
    limb(d, [(cx + 6, ground - 9), (cx + 13, ground - 5 + int(stride * 2)),
             (cx + 19, ground - 3)], cld, ink, 4)
    limb(d, [(cx + 6, ground - 8), (cx + 12, ground - 1 - int(stride * 2)),
             (cx + 18, ground - 2)], cld, ink, 4)
    # torso
    torso = [(cx - 11, ground - 11), (cx + 9, ground - 13),
             (cx + 10, ground - 6), (cx - 10, ground - 4)]
    o_poly(d, torso, cld, ink, 1)
    poly(d, [(cx - 9, ground - 10), (cx + 7, ground - 11),
             (cx + 8, ground - 7), (cx - 8, ground - 5)], cl)
    line(d, [(cx - 9, ground - 10), (cx - 8, ground - 5)], cll, 1)
    # clawing arms (front)
    for i, dy in ((0, 0), (1, 2)):
        limb(d, [(cx - 8, ground - 9 + dy), (cx - 14, ground - 7 + dy),
                 (cx - 19 - i, ground - 4 + dy)], sk, ink, 3)
    # head
    hx = cx - 14
    hy = ground - 13
    ell(d, hx - 6, hy - 6, hx + 6, hy + 6, ink)
    ell(d, hx - 5, hy - 5, hx + 5, hy + 5, skd)
    ell(d, hx - 5, hy - 5, hx + 4, hy + 4, sk)
    rect(d, hx - 4, hy - 1, hx - 3, hy, ink)
    rect(d, hx - 1, hy - 1, hx, hy, ink)
    px(d, hx - 4, hy, pal.get("eye", P["acid_l"]))
    px(d, hx - 1, hy, pal.get("eye", P["acid_l"]))
    rect(d, hx - 4, hy + 2, hx + 1, hy + 3, ink)


# ---------------------------------------------------------------------------
# Sheet assembly
# ---------------------------------------------------------------------------
def sheet(frames_by_row, fw, fh, pad=0):
    cols = max(len(r) for r in frames_by_row)
    rows = len(frames_by_row)
    w = cols * (fw + pad)
    h = rows * (fh + pad)
    out = new(w, h)
    for r, row in enumerate(frames_by_row):
        for c, im in enumerate(row):
            out.alpha_composite(im, (c * (fw + pad), r * (fh + pad)))
    return out


def save(img, path):
    img.save(path)
    return path
