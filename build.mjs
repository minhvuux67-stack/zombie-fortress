import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, "src");

const manifest = JSON.parse(readFileSync(join(root, "asset_manifest.json"), "utf8"));
const manifestJS = "\nconst ASSET_MANIFEST = " + JSON.stringify(manifest) + ";\n";

const order = readdirSync(srcDir).filter((f) => /^\d+_/.test(f)).sort();
let out = "";
for (const f of order) {
  let text = readFileSync(join(srcDir, f), "utf8");
  if (/<script>/.test(text)) text = text.replace(/<script>/, "<script>" + manifestJS);
  out += text + "\n";
}

const target = join(root, "index.html");
writeFileSync(target, out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`built ${target} from ${order.length} parts, ${Object.keys(manifest).length} assets -> ${kb} KB`);
