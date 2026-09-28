"""Synthesise all music and SFX with numpy, write OGG Vorbis via soundfile."""
import os, sys, math, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")


def save(path, x, sr=SR, quality="VORBIS"):
    import soundfile as sf
    x = np.asarray(x, dtype=np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x)) or 1.0
    if peak > 0.99:
        x = x / peak * 0.99
    sf.write(path, x, sr, format="OGG", subtype="VORBIS")


def env(n, a=0.01, d=0.1, s=0.7, r=0.2, sus=0.6):
    l = n / SR
    t = np.linspace(0, l, n, endpoint=False)
    e = np.ones(n)
    ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    ai = min(ai, n); di = min(di, max(0, n - ai)); ri = min(ri, max(0, n - ai - di))
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[ai:ai + di] = np.linspace(1, sus, di)
    si = max(0, n - ai - di - ri)
    e[ai + di:ai + di + si] = sus
    if ri: e[n - ri:] = np.linspace(sus, 0, ri)
    return e


def tone(f, n, kind="sine", detune=0.0):
    t = np.linspace(0, n / SR, n, endpoint=False)
    if kind == "sine":
        x = np.sin(2 * np.pi * f * t)
    elif kind == "square":
        x = np.sign(np.sin(2 * np.pi * f * t))
    elif kind == "saw":
        x = 2 * (t * f - np.floor(t * f + 0.5))
    elif kind == "tri":
        x = 2 * np.abs(2 * (t * f - np.floor(t * f + 0.5))) - 1
    else:
        x = np.sin(2 * np.pi * f * t)
    if detune:
        x = 0.5 * x + 0.5 * np.sin(2 * np.pi * f * (1 + detune) * t)
    return x


def noise(n):
    return np.random.uniform(-1, 1, n)


def dec(t, k):
    return np.exp(-k * t)


def kick(n):
    t = np.linspace(0, n / SR, n, endpoint=False)
    f = 120 * np.exp(-8 * t) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-6 * t) * 1.0


def snare(n):
    t = np.linspace(0, n / SR, n, endpoint=False)
    return (noise(n) * 0.7 + tone(190, n) * 0.3) * np.exp(-14 * t)


def hat(n, short=True):
    t = np.linspace(0, n / SR, n, endpoint=False)
    k = 60 if short else 18
    return np.sign(noise(n)) * np.exp(-k * t) * 0.35


# ---------------------------------------------------------------------------
# SFX
# ---------------------------------------------------------------------------
def sfx_shoot(dist=0):
    n = int(0.09 * SR)
    x = noise(n) * env(n, 0.001, 0.02, 0.2, 0.06, 0) * 0.5
    x += tone(220, n, "square") * env(n, 0, 0.01, 0.1, 0.05, 0) * 0.25
    return x


def sfx_shotgun():
    n = int(0.22 * SR)
    x = noise(n) * env(n, 0.001, 0.05, 0.3, 0.15, 0) * 0.8
    x += kick(n) * 0.5
    return x


def sfx_sniper():
    n = int(0.35 * SR)
    x = noise(n) * env(n, 0.001, 0.03, 0.2, 0.3, 0) * 0.9
    x += tone(1400, n, "sine") * env(n, 0, 0.02, 0.05, 0.3, 0) * 0.3
    x += kick(n) * 0.4
    return x


def sfx_flame():
    n = int(0.4 * SR)
    x = noise(n) * env(n, 0.02, 0.1, 0.6, 0.25, 0.7) * 0.5
    # low-pass-ish
    x = np.convolve(x, np.ones(9) / 9, mode="same")
    return x * 0.8


def sfx_tesla():
    n = int(0.3 * SR)
    t = np.linspace(0, n / SR, n, endpoint=False)
    x = np.sign(np.sin(2 * np.pi * (300 + 900 * t) * t)) * np.exp(-8 * t) * 0.3
    x += noise(n) * np.exp(-20 * t) * 0.3
    return x


def sfx_explode():
    n = int(0.9 * SR)
    t = np.linspace(0, n / SR, n, endpoint=False)
    x = noise(n) * np.exp(-4 * t) * 0.9
    x = np.convolve(x, np.ones(5) / 5, mode="same")
    x += np.sin(2 * np.pi * (80 * np.exp(-5 * t) + 30) * t) * np.exp(-3 * t) * 0.7
    return x


def sfx_hit():
    n = int(0.12 * SR)
    return (noise(n) * np.exp(-30 * np.linspace(0, 0.12, n)) + tone(160, n, "tri") * np.exp(-20 * np.linspace(0, 0.12, n))) * 0.7


def sfx_growl(base=90, dur=0.7):
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    vib = 1 + 0.12 * np.sin(2 * np.pi * 5 * t)
    x = np.sign(np.sin(2 * np.pi * base * vib * t)) * 0.3
    x += noise(n) * 0.2
    e = env(n, 0.05, 0.15, 0.7, 0.35, 0.65)
    x = np.convolve(x * e, np.ones(7) / 7, mode="same")
    return x * 0.7


def sfx_spit():
    n = int(0.2 * SR)
    t = np.linspace(0, 0.2, n, endpoint=False)
    x = noise(n) * np.exp(-14 * t) * 0.5
    x += np.sin(2 * np.pi * (500 - 300 * t / 0.2) * t) * np.exp(-10 * t) * 0.3
    return x


def sfx_boss():
    n = int(1.4 * SR)
    t = np.linspace(0, 1.4, n, endpoint=False)
    x = np.sin(2 * np.pi * (60 + 20 * np.sin(2 * np.pi * 3 * t)) * t) * 0.6
    x += np.sign(np.sin(2 * np.pi * 45 * t)) * 0.3
    x *= env(n, 0.1, 0.3, 0.5, 0.7, 0.6)
    return x * 0.8


def sfx_blip(f=660, dur=0.06, kind="square"):
    n = int(dur * SR)
    return tone(f, n, kind) * env(n, 0.002, 0.01, 0.2, 0.04, 0) * 0.4


def sfx_coin():
    n = int(0.35 * SR)
    a = tone(880, n, "square") * env(n, 0.001, 0.05, 0.4, 0.2, 0)
    b = tone(1320, n, "square") * env(n, 0.001, 0.05, 0.4, 0.2, 0)
    x = np.zeros(n); h = n // 4
    x[:h] = a[:h]; x[h:] = b[:n - h]
    return x * 0.35


def sfx_level():
    n = int(0.8 * SR)
    x = np.zeros(n)
    for i, f in enumerate([523, 659, 784, 1046]):
        seg = tone(f, n // 4, "square") * env(n // 4, 0.005, 0.05, 0.5, 0.15, 0.5)
        x[i * (n // 4):(i + 1) * (n // 4)] = seg
    return x * 0.35


def sfx_achievement():
    n = int(1.0 * SR)
    x = np.zeros(n)
    for i, f in enumerate([659, 784, 988, 1318, 1568]):
        seg = tone(f, n // 5, "square") * env(n // 5, 0.005, 0.05, 0.5, 0.1, 0.5)
        x[i * (n // 5):(i + 1) * (n // 5)] = seg
    return x * 0.3


def sfx_rain(dur=2.0):
    n = int(dur * SR)
    x = noise(n) * 0.25
    x = np.convolve(x, np.ones(6) / 6, mode="same")
    return x


def sfx_wind(dur=2.0):
    n = int(dur * SR)
    x = noise(n)
    x = np.convolve(x, np.ones(40) / 40, mode="same")
    t = np.linspace(0, dur, n, endpoint=False)
    x *= 0.3 + 0.2 * np.sin(2 * np.pi * 0.4 * t)
    return x * 0.5


def sfx_thunder():
    n = int(2.0 * SR)
    t = np.linspace(0, 2.0, n, endpoint=False)
    x = noise(n) * np.exp(-3 * t) * 0.8
    x = np.convolve(x, np.ones(30) / 30, mode="same")
    x += np.sin(2 * np.pi * 45 * t) * np.exp(-2 * t) * 0.4
    return x


SFX = {
    "shoot": lambda: sfx_shoot(),
    "shoot2": lambda: sfx_shoot() * 0.85,
    "shotgun": sfx_shotgun,
    "sniper": sfx_sniper,
    "flame": sfx_flame,
    "tesla": sfx_tesla,
    "explode": sfx_explode,
    "hit": sfx_hit,
    "growl": lambda: sfx_growl(85, 0.7),
    "growl2": lambda: sfx_growl(120, 0.5),
    "growl3": lambda: sfx_growl(70, 0.9),
    "spit": sfx_spit,
    "boss": sfx_boss,
    "zombie_die": lambda: sfx_growl(95, 0.5) * 0.7,
    "click": lambda: sfx_blip(660, 0.05),
    "hover": lambda: sfx_blip(880, 0.03, "sine") * 0.6,
    "buy": lambda: sfx_blip(520, 0.09) ,
    "sell": lambda: sfx_blip(400, 0.1, "sine"),
    "place": lambda: sfx_blip(300, 0.12, "tri"),
    "error": lambda: sfx_blip(160, 0.15, "saw") * 0.7,
    "upgrade": lambda: sfx_blip(740, 0.12, "square"),
    "wave": lambda: sfx_blip(440, 0.25, "sine"),
    "coin": sfx_coin,
    "levelup": sfx_level,
    "achievement": sfx_achievement,
    "donate": lambda: sfx_level() * 0.8,
    "freeze": lambda: (tone(1200, int(0.4 * SR), "sine") * env(int(0.4 * SR), 0.001, 0.1, 0.3, 0.25, 0.3)) * 0.35,
    "airstrike": lambda: sfx_explode() * 0.8,
    "heal": lambda: (tone(700, int(0.3 * SR), "sine") * env(int(0.3 * SR), 0.01, 0.1, 0.5, 0.15, 0.5)) * 0.35,
    "rain": sfx_rain,
    "wind": sfx_wind,
    "thunder": sfx_thunder,
    "ambient_city": lambda: sfx_wind(1.5) * 0.5,
    "hurt": lambda: sfx_blip(200, 0.18, "saw") * 0.6,
    "shield": lambda: sfx_blip(260, 0.12, "tri") * 0.6,
    "acid": lambda: sfx_spit() * 0.9,
    "grenade": lambda: sfx_explode() * 0.7,
    "reload": lambda: (noise(int(0.12 * SR)) * np.exp(-30 * np.linspace(0, 0.12, int(0.12 * SR)))) * 0.5,
}


# ---------------------------------------------------------------------------
# Music: simple loop-based synth tracks
# ---------------------------------------------------------------------------
def note(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
             "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[p] + (o - 4) * 12 - 9) / 12)


def _add(out, t0, x, gain=1.0):
    x = np.asarray(x) * gain
    end = min(len(out), t0 + len(x))
    if t0 >= len(out) or end <= t0:
        return
    out[t0:end] += x[:end - t0]


def render_pattern(chords, bpm, bars, style, seed=0):
    rng = np.random.RandomState(seed)
    beat = 60 / bpm
    bar = beat * 4
    n = int(bars * bar * SR)
    out = np.zeros(n)
    step = beat / 2
    total_steps = int(bars * bar / step)
    for i in range(total_steps):
        t0 = int(i * step * SR)
        ch = chords[(i // 8) % len(chords)]
        root = note(ch[0])
        b = tone(root / 2, int(step * SR), "square") * env(int(step * SR), 0.005, 0.05, 0.5, 0.1, 0.6)
        _add(out, t0, b, 0.22)
        if i % 2 == 0:
            pad_n = int(step * SR * 2)
            pad = np.zeros(pad_n)
            for cn in ch:
                pad += tone(note(cn) * 2, pad_n, "tri", 0.004)
            pad /= len(ch)
            pad *= env(pad_n, 0.05, 0.2, 0.6, 0.4, 0.5)
            _add(out, t0, pad, 0.12)
    for i in range(int(bars * bar / step)):
        t0 = int(i * step * SR)
        if style in ("metal", "boss", "menu"):
            if i % 4 == 0:
                _add(out, t0, kick(int(beat * SR)), 0.5)
            if i % 4 == 2:
                _add(out, t0, snare(int(beat * SR)), 0.3)
            _add(out, t0, hat(int(step * SR)), 0.15 if i % 2 else 0.22)
    return out


TRACKS = {
    "menu": dict(chords=[["A2", "C3", "E3"], ["F2", "A2", "C3"], ["G2", "B2", "D3"], ["E2", "G2", "B2"]],
                 bpm=70, bars=24, style="menu", seed=1),
    "gameplay": dict(chords=[["E2", "G2", "B2"], ["C2", "E2", "G2"], ["D2", "F#2", "A2"], ["A2", "C3", "E3"]],
                     bpm=132, bars=32, style="metal", seed=2),
    "boss": dict(chords=[["D2", "F2", "A2"], ["D2", "F2", "A2"], ["A#1", "D2", "F2"], ["C2", "E2", "G2"]],
                 bpm=170, bars=32, style="boss", seed=3),
    "gameover": dict(chords=[["A2", "C3", "E3"], ["F2", "A2", "C3"], ["D2", "F2", "A2"], ["E2", "G#2", "B2"]],
                     bpm=60, bars=20, style="menu", seed=4),
}


def main():
    sfx_dir = os.path.join(OUT, "sfx")
    mus_dir = os.path.join(OUT, "music")
    os.makedirs(sfx_dir, exist_ok=True)
    os.makedirs(mus_dir, exist_ok=True)
    sfx_master = os.path.join(OUT, "master", "sfx")
    os.makedirs(sfx_master, exist_ok=True)
    import soundfile as sf
    for name, fn in SFX.items():
        x = np.asarray(fn(), dtype=np.float32)
        save(os.path.join(sfx_dir, name + ".ogg"), x)
        sf.write(os.path.join(sfx_master, name + ".wav"),
                 np.stack([x, x], 1).astype(np.float32), SR, subtype="PCM_16")
    print("sfx", len(SFX))
    master_dir = os.path.join(OUT, "master")
    os.makedirs(master_dir, exist_ok=True)
    MSR = 22050
    for name, cfg in TRACKS.items():
        x44 = render_pattern(cfg["chords"], cfg["bpm"], cfg["bars"], cfg["style"], cfg["seed"])
        f = min(SR, len(x44) // 8)
        x44 = x44.copy()
        x44[:f] *= np.linspace(0, 1, f); x44[-f:] *= np.linspace(1, 0, f)
        # lossless 44.1 kHz master (shipped in the full itch build)
        import soundfile as sf
        sf.write(os.path.join(master_dir, name + ".wav"), np.stack([x44, x44], 1).astype(np.float32), SR, subtype="PCM_16")
        x = ((x44[:-1] + x44[1:]) * 0.5)[::2].copy()
        save(os.path.join(mus_dir, name + ".ogg"), x, sr=MSR)
        print("music", name, round(len(x) / MSR, 1), "s")


if __name__ == "__main__":
    main()
