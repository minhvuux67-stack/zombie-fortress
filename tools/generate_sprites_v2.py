"""v3 asset expansion.

Adds SOURCE / master assets that are intentionally NOT part of the runtime
manifest (build_manifest.py only scans assets/{sprites,effects,ui,tiles,
backgrounds,audio/sfx,audio/music}), so the browser build and the itch zip do
not grow:

  1. HD (3x nearest) derivatives of every pixel-art sheet  -> assets/source/hd/
  2. Large concept / parallax source plates                -> assets/source/concept/
  3. Long lossless v3 music masters (44.1k stereo PCM)     -> assets/source/audio/

Run:  python3 tools/generate_sprites_v2.py
"""
import os, wave, math, random
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "source")
SR = 44100
SEED = 20260927

SPRITE_DIRS = ["sprites/zombies", "sprites/towers", "sprites/fortress",
               "effects", "ui", "tiles", "backgrounds"]


def ensure(d):
    os.makedirs(d, exist_ok=True)


def du(path):
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


# ---------------------------------------------------------------------------
def hd_sprites(scale=3):
    """Upscale every sheet with nearest-neighbour to a crisp HD master."""
    out_root = os.path.join(SOURCE, "hd")
    count = 0
    for rel in SPRITE_DIRS:
        src_dir = os.path.join(ASSETS, rel)
        if not os.path.isdir(src_dir):
            continue
        for name in sorted(os.listdir(src_dir)):
            if not name.lower().endswith(".png"):
                continue
            out_dir = os.path.join(out_root, rel)
            ensure(out_dir)
            im = Image.open(os.path.join(src_dir, name)).convert("RGBA")
            im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            im.save(os.path.join(out_dir, name))
            count += 1
    print("hd_sprites: %d sheets -> assets/source/hd/" % count)


# ---------------------------------------------------------------------------
def concept_plates():
    """Big source-art plates: gritty pixel-composited city / wasteland layers."""
    out_dir = os.path.join(SOURCE, "concept")
    ensure(out_dir)
    rng = np.random.default_rng(SEED)
    specs = [
        ("ruined_skyline", 2048, 1152, (10, 14, 28), (60, 30, 70)),
        ("wasteland_ground", 2048, 1152, (18, 22, 30), (52, 44, 30)),
        ("blood_moon", 2048, 1152, (30, 8, 16), (150, 40, 40)),
    ]
    for name, w, h, c0, c1 in specs:
        y = np.linspace(0, 1, h)[:, None, None]
        base = np.array(c0)[None, None, :] * (1 - y) + np.array(c1)[None, None, :] * y
        base = np.repeat(base, w, axis=1)
        # chunky pixel noise (kept deliberately noisy so masters stay large)
        noise = rng.integers(-26, 27, size=(h // 4, w // 4, 1)).repeat(4, 0).repeat(4, 1)
        img = np.clip(base + noise, 0, 255).astype(np.uint8)
        Image.fromarray(img, "RGB").save(os.path.join(out_dir, name + "_source.png"))
        # a poster-framed variant
        poster = np.clip(base * 0.7 + rng.integers(0, 90, size=(h, w, 1)), 0, 255).astype(np.uint8)
        Image.fromarray(poster, "RGB").save(os.path.join(out_dir, name + "_poster.png"))
    print("concept_plates: 6 plates -> assets/source/concept/")


# ---------------------------------------------------------------------------
def _adsr(n, a=0.02, d=0.2, s=0.7, r=0.3):
    t = np.linspace(0, 1, n, endpoint=False)
    e = np.ones(n)
    ai, di, ri = int(a * n), int(d * n), int(r * n)
    if ai:
        e[:ai] = np.linspace(0, 1, ai)
    if di:
        e[ai:ai + di] = np.linspace(1, s, di)
    e[ai + di:n - ri] = s
    if ri:
        e[n - ri:] = np.linspace(s, 0, ri)
    return e


def _write_wav(path, x):
    x = np.asarray(x, dtype=np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = float(np.max(np.abs(x))) or 1.0
    if peak > 0.98:
        x = x / peak * 0.98
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def _pad(seq, freq, dur, kind="saw", detune=0.006):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    for i, n in enumerate(seq):
        f = freq(n)
        seg = np.where(t < (i + 1) * dur / len(seq), 1, 0)
        if kind == "saw":
            x = 2 * (f * t - np.floor(f * t + 0.5))
        elif kind == "square":
            x = np.sign(np.sin(2 * math.pi * f * t))
        else:
            x = np.sin(2 * math.pi * f * t)
        x = 0.6 * x + 0.4 * np.sin(2 * math.pi * f * (1 + detune) * t)
        out += x * seg
    return out * _adsr(len(out), 0.03, 0.25, 0.65, 0.35)


def _drums(n):
    rng = np.random.default_rng(SEED + 7)
    t = np.linspace(0, n / SR, n, endpoint=False)
    kick = np.zeros(n)
    beat = int(SR * 0.5)
    for b in range(0, n, beat):
        env = np.exp(-np.linspace(0, 6, min(beat, n - b)))
        f = 140 * np.exp(-np.linspace(0, 4, min(beat, n - b)))
        kick[b:b + len(env)] += np.sin(2 * math.pi * f * np.linspace(0, len(env) / SR, len(env))) * env * 0.6
    hat = np.zeros(n)
    for b in range(beat // 2, n, beat // 2):
        L = min(2000, n - b)
        hat[b:b + L] += rng.uniform(-1, 1, L) * np.linspace(1, 0, L) * 0.12
    return kick + hat


def v3_masters():
    out_dir = os.path.join(SOURCE, "audio")
    ensure(out_dir)
    base = 110.0

    def note(semitones):
        return base * (2 ** (semitones / 12.0))

    # Hero theme: 96s, slower heroic loop
    seq = [0, 4, 7, 4, 5, 9, 5, 2, 0, 4, 7, 11, 7, 4, 2, 0] * 3
    hero = _pad(seq, note, 96.0, "saw")
    drum = _drums(len(hero))
    hero[: len(drum)] += drum * 0.5

    # Blood storm: 84s minor, heavier
    seq2 = [0, 3, 5, 3, 7, 3, 5, 0, -2, 3, 5, 8, 5, 3, 0, -2] * 3
    storm = _pad(seq2, note, 84.0, "square")
    drum2 = _drums(len(storm))
    storm[: len(drum2)] += drum2 * 0.75

    _write_wav(os.path.join(out_dir, "v3_hero_theme_master.wav"), hero)
    _write_wav(os.path.join(out_dir, "v3_blood_storm_master.wav"), storm)
    print("v3_masters: 2 masters -> assets/source/audio/")


def main():
    ensure(SOURCE)
    hd_sprites(3)
    concept_plates()
    v3_masters()
    total = du(ASSETS)
    src = du(SOURCE)
    print("assets total: %.1f MB (source masters: %.1f MB)" % (total / 1e6, src / 1e6))


if __name__ == "__main__":
    main()
