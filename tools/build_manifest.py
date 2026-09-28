"""Scan assets/ and emit asset_manifest.json (logical key -> relative path)."""
import os, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets")

RULES = [
    ("sprites/zombies", "zombie/", ".png", ""),
    ("sprites/towers", "tower/", ".png", ""),
    ("sprites/fortress", "fortress/", ".png", ""),
    ("effects", "fx/", ".png", ""),
    ("ui", "ui/", ".png", ""),
    ("tiles", "tile/", ".png", ""),
    ("backgrounds", "bg/", ".png", ""),
    ("audio/sfx", "sfx/", ".ogg", ""),
    ("audio/music", "music/", ".ogg", ""),
]


def main():
    manifest = {}
    for folder, prefix, ext, _ in RULES:
        d = os.path.join(ASSETS, folder)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(ext):
                continue
            key = prefix + name[: -len(ext)]
            rel = "assets/" + folder + "/" + name
            manifest[key] = rel
    out = os.path.join(ROOT, "asset_manifest.json")
    with open(out, "w") as f:
        json.dump(manifest, f, indent=0, sort_keys=True)
    print("manifest: %d entries -> %s" % (len(manifest), out))
    return manifest


if __name__ == "__main__":
    main()
