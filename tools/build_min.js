/* Build a single self-contained index.min.html (<= 8 MB) with every asset
   embedded as a data: URI.  Used for Poki / CrazyGames uploads and for quick
   previews where relative asset paths are not available. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "asset_manifest.json"), "utf8"));

const MIME = { ".png": "image/png", ".ogg": "audio/ogg", ".jpg": "image/jpeg" };
const embedded = {};
let bytes = 0;
for (const [key, rel] of Object.entries(manifest)) {
  const buf = readFileSync(join(root, rel));
  bytes += buf.length;
  const mime = MIME[extname(rel)] || "application/octet-stream";
  embedded[key] = `data:${mime};base64,${buf.toString("base64")}`;
}

let html = readFileSync(join(root, "index.html"), "utf8");
// replace the external manifest with the embedded one
html = html.replace(/const ASSET_MANIFEST = \{[\s\S]*?\};\n/, "const ASSET_MANIFEST = " + JSON.stringify(embedded) + ";\n");
html = html.replace("<title>", "<!-- single-file min build: all assets embedded as data URIs -->\n<title>");

const outDir = join(root, "dist");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.min.html"), html);
const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`min build: assets ${(bytes / 1048576).toFixed(2)} MB raw -> dist/index.min.html ${mb} MB`);
