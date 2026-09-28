/* ---------------------------------------------------------------------
   RENDER + MAIN LOOP - attached to Game.prototype
   --------------------------------------------------------------------- */
Object.assign(Game.prototype, {
  /* preload every pixel-art sprite before the menu appears */
  loadAssets() {
    const stage = document.getElementById("stage");
    const el = document.createElement("div");
    el.id = "loadscreen";
    el.innerHTML = '<div class="loadinner panel"><div class="loadtitle">ZOMBIE FORTRESS<small>PANDEMIC DEFENSE</small></div>' +
      '<div class="loadbar"><div id="loadfill"></div></div><div class="loadpct" id="loadpct">LOADING 0%</div></div>';
    if (stage) stage.appendChild(el);
    const fill = el.querySelector("#loadfill");
    const pct = el.querySelector("#loadpct");
    const loader = new AssetLoader(ASSET_MANIFEST);
    loader.load((d, t) => {
      const p = t ? Math.round((d / t) * 100) : 100;
      if (fill) fill.style.width = p + "%";
      if (pct) pct.textContent = T("LOADING " + p + "%");
    }, () => {
      this.audio.loadSamples();
      if (fill) fill.style.width = "100%";
      if (pct) pct.textContent = T("READY");
      setTimeout(() => {
        el.classList.add("done");
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 500);
      }, 150);
      this.ui.showMenu();
    });
  },

  update(dt) {
    if (this.screen !== "play" || this.paused) return;
    for (const s of this.skills) if (s.cdLeft > 0) s.cdLeft = Math.max(0, s.cdLeft - dt);
    if (this.overdriveT > 0) this.overdriveT = Math.max(0, this.overdriveT - dt);
    this.fortress.update(dt, this);
    if (this.synergy && this.synergy.has && this.synergy.has("hospital")) this.fortress.heal(40 * dt);
    this.waves.update(dt);
    if (!this.waves.active) {
      this.waves.prepTimer -= dt;
      if (this.waves.prepTimer <= 0) this.nextWave();
    }
    for (const t of this.towers) t.update(dt, this);
    // snapshot: summoners can append zombies mid-loop, which would otherwise
    // let brand-new spawns update twice in the same frame
    for (const z of this.zombies.slice()) z.update(dt, this);
    if (this.zombies.some((z) => z.dead)) this.zombies = this.zombies.filter((z) => !z.dead);
    for (const p of this.projectiles) p.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    for (const p of this.hostile) p.update(dt, this);
    this.hostile = this.hostile.filter((p) => !p.dead);
    if (this.towers.some((t) => t.dead)) this.towers = this.towers.filter((t) => !t.dead);
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => { if (p.dead) { p.live = false; return false; } return true; });
    if (this.particles.length > 1400) this.particles.splice(0, this.particles.length - 1400);
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter((e) => !e.dead);
    for (const d of this.damageTexts) d.update(dt);
    this.damageTexts = this.damageTexts.filter((d) => !d.dead);
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.waves.active && this.waves.doneSpawning && this.zombies.length === 0) this.waveCleared();
    this.saveTimer += dt;
    if (this.saveTimer > 10) { this.saveTimer = 0; this.save(); }
    this.achTimer = (this.achTimer || 0) + dt;
    if (this.achTimer > 1) { this.achTimer = 0; this.achievements.check(); }
  },

  loop(t) {
    if (this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (t - this.lastT) / 1000));
    this.lastT = t;
    if (!document.hidden) this.update(dt);
    this.render();
    this.ui.updateHUD();
    requestAnimationFrame((x) => this.loop(x));
  },

  buildGroundPattern() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#0b1020"; x.fillRect(0, 0, 128, 128);
    const rng = mulberry32(7);
    for (let i = 0; i < 240; i++) {
      const s = 1 + rng() * 2.6;
      x.fillStyle = "rgba(" + (26 + rng() * 40 | 0) + "," + (36 + rng() * 42 | 0) + "," + (56 + rng() * 54 | 0) + "," + (0.22 + rng() * 0.4) + ")";
      x.fillRect(rng() * 128, rng() * 128, s, s);
    }
    this.groundPat = this.ctx.createPattern(c, "repeat");
  },

  /* the field backdrop never changes, so it is painted once into an offscreen layer */
  buildBackdrop() {
    if (!this.groundPat) this.buildGroundPattern();
    const dpr = this.dpr || 1;
    const c = document.createElement("canvas"); c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    // --- cracked-asphalt pixel tile ground -------------------------------
    const gt = ART.ready ? ART.images["tile/ground"] : null;
    if (gt) {
      const pat = ctx.createPattern(gt, "repeat");
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = this.groundPat || "#0b1020"; ctx.fillRect(0, 0, W, H);
    }
    // bloody patches near the lanes
    const bt = ART.ready ? ART.images["tile/blood"] : null;
    if (bt) {
      const bp = ctx.createPattern(bt, "repeat");
      const rng = mulberry32(11);
      for (let i = 0; i < 14; i++) {
        const yy = LANES[i % LANES.length] + (rng() - 0.5) * 90;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = bp;
        ctx.fillRect(200 + rng() * 900, yy, 150 + rng() * 120, 70 + rng() * 40);
      }
      ctx.globalAlpha = 1;
    }
    // atmospheric darkening
    const g = ctx.createRadialGradient(W * 0.35, H * 0.5, 60, W * 0.35, H * 0.5, 950);
    g.addColorStop(0, "rgba(34,30,44,.22)");
    g.addColorStop(1, "rgba(4,3,10,.72)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // lane markings
    for (let i = 0; i < LANES.length; i++) {
      const y = LANES[i];
      const lg = ctx.createLinearGradient(0, y - 50, 0, y + 50);
      lg.addColorStop(0, "rgba(18,22,36,0)");
      lg.addColorStop(0.5, "rgba(24,30,48,.55)");
      lg.addColorStop(1, "rgba(18,22,36,0)");
      ctx.fillStyle = lg; ctx.fillRect(FIELD_LEFT, y - 50, W - FIELD_LEFT, 100);
      ctx.strokeStyle = "rgba(150,180,220,.12)"; ctx.setLineDash([18, 22]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(FIELD_LEFT + 8, y); ctx.lineTo(W + 20, y); ctx.stroke();
      ctx.setLineDash([]);
    }
    // foreground fence strip along the bottom
    const fence = ART.ready ? ART.images["bg/fence_near"] : null;
    if (fence) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(fence, 0, H - 200, W, 200);
      ctx.globalAlpha = 1;
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.62)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    this.bgCanvas = c;
  },

  drawBackground(ctx) {
    // main menu gets the big pixel-art splash, animated city behind it
    if (this.screen === "menu" && ART.ready && ART.images["bg/splash"]) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ART.images["bg/splash"], 0, 0, W, H);
      const t = nowMs() / 1000;
      ctx.globalAlpha = 0.16 + 0.05 * Math.sin(t * 0.7);
      ctx.fillStyle = "rgba(20,8,20,1)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      return;
    }
    // rebuild once the pixel-art tiles have finished loading
    if (ART.ready && !this._bgArtBuilt) { this._bgArtBuilt = true; this.bgCanvas = null; }
    if (!this.bgCanvas) this.buildBackdrop();
    ctx.drawImage(this.bgCanvas, 0, 0, W, H);
    // animated right-edge danger markers
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(nowMs() / 600));
    for (const y of LANES) {
      ctx.fillStyle = "rgba(255,80,100," + (0.1 + pulse * 0.14) + ")";
      ctx.fillRect(W - 26, y - 40, 26, 80);
    }
  },

  drawSlots(ctx) {
    const occ = new Set(this.towers.map((t) => t.row + "_" + t.col));
    for (let r = 0; r < SLOT_ROWS.length; r++) {
      for (let c = 0; c < SLOT_COLS.length; c++) {
        if (occ.has(r + "_" + c)) continue;
        const x = SLOT_COLS[c], y = SLOT_ROWS[r];
        const hover = this.mouse.on && Math.abs(this.mouse.x - x) < 48 && Math.abs(this.mouse.y - y) < 46 && this.selectedTower;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = hover ? "rgba(87,224,138,.16)" : "rgba(120,160,220,.06)";
        ctx.strokeStyle = hover ? "rgba(87,224,138,.95)" : (this.selectedTower ? "rgba(140,190,255,.32)" : "rgba(120,160,220,.15)");
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-42, -34, 84, 68, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(150,190,255,.12)";
        ctx.beginPath(); ctx.roundRect(-30, -22, 60, 44, 8); ctx.fill();
        if (this.selectedTower) {
          ctx.fillStyle = "rgba(200,225,255,.4)"; ctx.font = "600 20px Segoe UI, sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("+", 0, 1);
        }
        ctx.restore();
      }
    }
  },

  drawGhost(ctx) {
    if (!this.selectedTower || !this.mouse.on) return;
    const slot = this.findSlot(this.mouse.x, this.mouse.y);
    if (!slot || this.towerAt(slot.r, slot.c)) return;
    const def = TOWER_DEFS[this.selectedTower];
    const x = SLOT_COLS[slot.c], y = SLOT_ROWS[slot.r];
    const afford = this.scrap >= this.towerCost(this.selectedTower);
    const range = (def.base.range || def.base.taunt || 80) * this.bonus.range;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = afford ? "rgba(87,224,138,.08)" : "rgba(255,85,102,.08)";
    ctx.strokeStyle = afford ? "rgba(87,224,138,.55)" : "rgba(255,85,102,.55)";
    ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, range, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    const ghost = new Tower(this, this.selectedTower, slot.r, slot.c);
    ghost.built = 1; ghost.hp = ghost.maxHp;
    ctx.globalAlpha = afford ? 0.72 : 0.32;
    ghost.draw(ctx, this);
    ctx.restore();
  },

  drawMenuBackdrop(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const d of this.decor) { ctx.fillStyle = "rgba(120,160,220,.12)"; ctx.fillRect(d.x, d.y, 2, 2); }
    ctx.restore();
  },

  drawCanvasHud(ctx) {
    // run conditions (weather + wave mutation)
    if (this.screen === "play") {
      const bits = [];
      if (this.weather && this.weather.def && this.weather.def.id !== "clear") bits.push("\u2601 " + T(this.weather.def.name));
      if (this.mutations && this.mutations.current && this.mutations.current.id !== "none") bits.push("\u2620 " + T(this.mutations.current.name));
      if (this.synergy && this.synergy.active.length) bits.push("\u26A1 " + this.synergy.active.length + T(" synergy"));
      if (bits.length) {
        ctx.save();
        ctx.textAlign = "left"; ctx.font = "600 13px Segoe UI, sans-serif";
        ctx.fillStyle = "rgba(180,210,255,.82)";
        ctx.fillText(bits.join("   "), 14, 72);
        ctx.restore();
      }
      // mutation protocol count
      if (this.protocols && this.protocols.taken.length) {
        ctx.save();
        ctx.textAlign = "left"; ctx.font = "600 13px Segoe UI, sans-serif";
        ctx.fillStyle = "rgba(200,150,255,.9)";
        ctx.fillText("\u{1F9EC} " + this.protocols.taken.length + " " + T("protocols"), 14, this.synergy && this.synergy.active.length ? 90 : 90);
        ctx.restore();
      }
      // overdrive banner
      if (this.overdriveT > 0) {
        ctx.save();
        ctx.textAlign = "center"; ctx.font = "800 15px Segoe UI, sans-serif";
        ctx.fillStyle = "rgba(255,206,74,.95)";
        ctx.shadowColor = "#ffce4a"; ctx.shadowBlur = 12;
        ctx.fillText("\u{1F680} " + T("OVERDRIVE") + " " + Math.ceil(this.overdriveT) + "s", W / 2, 132);
        ctx.restore();
      }
    }
    // kill combo
    if (this.killCombo >= 5) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "800 26px Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(255,206,74,.92)";
      ctx.shadowColor = "#ffce4a"; ctx.shadowBlur = 16;
      ctx.fillText(T("COMBO x") + this.killCombo, W / 2, 104);
      ctx.restore();
    }
    // airstrike targeting
    if (this.selectedSkill === "airstrike" && this.mouse.on) {
      const x = this.mouse.x, y = this.mouse.y;
      ctx.save();
      ctx.strokeStyle = "rgba(255,160,60,.9)"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.arc(x, y, 220, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 40, y); ctx.lineTo(x - 14, y); ctx.moveTo(x + 14, y); ctx.lineTo(x + 40, y);
      ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 14); ctx.moveTo(x, y + 14); ctx.lineTo(x, y + 40);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,206,74,.95)"; ctx.font = "700 15px Segoe UI, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(T("TAP THE FIELD TO BOMB"), x, y - 246);
      ctx.restore();
    }
    if (this.mods && this.mods.noSkills) {
      ctx.save(); ctx.textAlign = "right"; ctx.font = "600 13px Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(255,179,71,.85)"; ctx.fillText("\u{1F4C5} " + T("Daily challenge active \u2014 skills disabled"), W - 16, 74);
      ctx.restore();
    }
    // low fortress warning
    if (this.fortress && this.fortress.pct < 0.25) {
      const a = 0.25 + 0.25 * Math.sin(nowMs() / 200);
      ctx.save();
      ctx.strokeStyle = "rgba(255,60,80," + a + ")"; ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, W - 14, H - 14);
      ctx.restore();
    }
  },

  drawWeather(ctx) {
    const wx = this.weather && this.weather.fx;
    if (!wx) return;
    const t = nowMs() / 1000;
    if (wx === "night") {
      ctx.fillStyle = "rgba(8,10,30,.42)";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    if (wx === "fog") {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#b9c4d6";
      for (let i = 0; i < 7; i++) {
        const y = ((i * 130 + t * 12) % (H + 200)) - 100;
        ctx.beginPath(); ctx.ellipse(W * 0.5, y, W * 0.72, 70, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
      return;
    }
    const drops = wx === "storm" ? 130 : 90;
    ctx.save();
    ctx.strokeStyle = wx === "storm" ? "rgba(190,120,150,.5)" : "rgba(140,220,255,.38)";
    ctx.lineWidth = wx === "storm" ? 2 : 1.4;
    const rng = mulberry32(wx === "storm" ? 99 : 77);
    const seeds = this._rainSeeds || (this._rainSeeds = Array.from({ length: drops }, () => ({ x: rng() * W, y: rng() * H, s: 260 + rng() * 240 })));
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    for (const d of seeds) {
      const y = (d.y + t * d.s) % (H + 60) - 30;
      ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x - 4, y + 18); ctx.stroke();
    }
    ctx.restore();
    if (wx === "storm" && Math.random() < 0.02) {
      ctx.fillStyle = "rgba(200,220,255,.16)"; ctx.fillRect(0, 0, W, H);
    }
  },
  drawSynergy(ctx) {
    if (!this.synergy || !this.synergy.active || !this.synergy.active.length) return;
    ctx.save();
    for (const s of this.synergy.active) {
      ctx.strokeStyle = "rgba(87,224,138,.35)";
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y - 20); ctx.lineTo(s.b.x, s.b.y - 20); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  },

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.fillStyle = "#070b14"; ctx.fillRect(0, 0, W, H);
    this.drawBackground(ctx);
    if (this.screen === "play" || this.screen === "over") {
      ctx.save();
      if (this.shake > 0) ctx.translate(rand(-7, 7) * this.shake, rand(-7, 7) * this.shake);
      this.drawSlots(ctx);
      if (this.fortress) this.fortress.draw(ctx, this);
      for (const t of this.towers) t.draw(ctx, this);
      this.drawSynergy(ctx);
      if (this.selectedSlot && this.towers.includes(this.selectedSlot) && !this.selectedSlot.dead) this.selectedSlot.drawRange(ctx);
      const zs = this.zombies.slice().sort((a, b) => a.y - b.y);
      for (const z of zs) { if (z.x < -80 || z.x > W + 100) continue; z.draw(ctx, this); }
      for (const p of this.projectiles) { if (p.x < -60 || p.x > W + 80) continue; p.draw(ctx); }
      for (const p of this.hostile) p.draw(ctx);
      for (const p of this.particles) p.draw(ctx);
      for (const e of this.effects) e.draw(ctx);
      for (const d of this.damageTexts) d.draw(ctx);
      this.drawGhost(ctx);
      ctx.restore();
      if (this.screen === "play") this.drawWeather(ctx);
      if (this.screen === "play") this.drawCanvasHud(ctx);
    }
  },
});

/* roundRect polyfill for older engines */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = Math.min(typeof r === "number" ? r : 8, w / 2, h / 2);
    this.moveTo(x + rr, y);
    this.arcTo(x + w, y, x + w, y + h, rr);
    this.arcTo(x + w, y + h, x, y + h, rr);
    this.arcTo(x, y + h, x, y, rr);
    this.arcTo(x, y, x + w, y, rr);
    this.closePath();
    return this;
  };
}

/* ---------------------------------------------------------------------
   BOOT
   --------------------------------------------------------------------- */
if (window.__game && typeof window.__game.destroy === "function") {
  try { window.__game.destroy(); } catch (e) {}
}
const game = new Game();
game.dpr = Math.min(2, window.devicePixelRatio || 1);
game.canvas.width = W * game.dpr;
game.canvas.height = H * game.dpr;
window.__game = game;

})();
