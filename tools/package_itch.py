"""Package the full-asset itch zip.

Includes index.html + every runtime asset + the lossless audio masters so the
upload is a complete, self-contained build. `assets/source/**` (v3 HD/concept
masters, which the game never loads) is excluded so the zip stays under the
browser upload bridge limit (~52 MB).

All entries are ZIP_STORED except one music master, which is deflated to keep
the final size within budget.

Run:  python3 tools/package_itch.py [out.zip]
"""
import os, sys, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "outputs", "zombie-fortress-full-itch.zip")
DEFLATE_ONE = os.path.join("assets", "audio", "master", "boss.wav")
DEFLATE_EXTRA = {os.path.join("assets", "audio", "master", "gameover.wav")}
LIMIT = 52 * 1000 * 1000


def include(path):
    rel = os.path.relpath(path, ROOT)
    if rel.startswith("assets" + os.sep + "source"):
        return False
    if rel.startswith("dist") or rel.startswith("tools"):
        return False
    return True


def main():
    files = []
    for base in ("index.html", "README.md", "asset_manifest.json"):
        p = os.path.join(ROOT, base)
        if os.path.isfile(p):
            files.append(p)
    for sub in ("assets", "data"):
        for root, _, names in os.walk(os.path.join(ROOT, sub)):
            if os.path.relpath(root, ROOT).startswith("assets" + os.sep + "source"):
                continue
            for n in names:
                p = os.path.join(root, n)
                if include(p):
                    files.append(p)
    files.sort()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    raw = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=1) as z:
        for p in files:
            rel = os.path.relpath(p, ROOT)
            comp = zipfile.ZIP_DEFLATED if (rel == DEFLATE_ONE or rel in DEFLATE_EXTRA) else zipfile.ZIP_STORED
            z.write(p, rel, compress_type=comp, compresslevel=9 if comp == zipfile.ZIP_DEFLATED else None)
            raw += os.path.getsize(p)
    size = os.path.getsize(OUT)
    print("packaged %d files, raw %.1f MB -> %s %.1f MB" % (len(files), raw / 1e6, OUT, size / 1e6))
    if size > LIMIT:
        print("WARNING: exceeds upload limit %d" % LIMIT)
    return 0 if size <= LIMIT else 1


if __name__ == "__main__":
    sys.exit(main())
