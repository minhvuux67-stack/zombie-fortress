/* =====================================================================
   ART / ASSET LAYER
   Preloads every pixel-art PNG + audio sample listed in ASSET_MANIFEST
   and exposes helpers used by the renderer.  If a sprite is missing the
   game falls back to the original vector drawing, so it never breaks.
   ===================================================================== */

/* ASSET_MANIFEST is injected by the build step (external paths for the
   full itch build, data: URIs for the single-file / min build). */

const ART = {
  ready: false,
  images: {},
  loaded: 0,
  total: 0,
  failed: 0,
  has(key) { return !!this.images[key]; },
  img(key) { return this.images[key]; },
  /* every audio key that was loaded (sfx/... and music/...) */
  audioURL(key) { return ASSET_MANIFEST[key]; },
};

class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest || {};
    this.keys = Object.keys(this.manifest).filter((k) => k.indexOf("sfx/") !== 0 && k.indexOf("music/") !== 0);
  }
  load(onProgress, onDone) {
    const keys = this.keys;
    const total = keys.length || 1;
    ART.total = keys.length;
    let done = 0;
    const tick = () => {
      ART.loaded = done;
      if (onProgress) onProgress(done, keys.length);
      if (done >= keys.length) { ART.ready = true; if (onDone) onDone(); }
    };
    if (!keys.length) { ART.ready = true; tick(); return; }
    for (const k of keys) {
      const im = new Image();
      im.onload = () => { ART.images[k] = im; done++; tick(); };
      im.onerror = () => { ART.failed++; done++; tick(); };
      im.decoding = "async";
      im.src = this.manifest[k];
    }
  }
}

/* --- sprite sheet metadata ------------------------------------------- */
const ZS = { fw: 48, fh: 48, cols: 8 };
const ZOMBIE_ANIM = {
  idle:   { row: 0, frames: 4, fps: 5 },
  walk:   { row: 1, frames: 8, fps: 9 },
  attack: { row: 2, frames: 6, fps: 13 },
  hurt:   { row: 3, frames: 2, fps: 9 },
  death:  { row: 4, frames: 8, fps: 11 },
  spawn:  { row: 5, frames: 4, fps: 8 },
};

/* draw one frame of a sprite sheet, centred on (cx,cy) */
function artFrame(ctx, key, col, row, fw, fh, cx, cy, w, h, flip) {
  const im = ART.images[key];
  if (!im) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(cx, cy); ctx.scale(-1, 1);
    ctx.drawImage(im, col * fw, row * fh, fw, fh, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(im, col * fw, row * fh, fw, fh, cx - w / 2, cy - h / 2, w, h);
  }
  ctx.restore();
  return true;
}

/* draw a whole single-frame sprite (no sheet slicing) */
function artImage(ctx, key, cx, cy, w, h, flip) {
  const im = ART.images[key];
  if (!im) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) { ctx.translate(cx, cy); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); }
  else ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

/* helper for DOM image URLs (menu splash, icons) */
function artURL(key) { return ASSET_MANIFEST[key] || ""; }
