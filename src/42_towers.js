/* ---------------------------------------------------------------------
   TOWER - one per build slot. All towers fire automatically.
   --------------------------------------------------------------------- */
class Tower {
  constructor(game, defId, row, col) {
    this.game = game;
    this.def = TOWER_DEFS[defId];
    this.id = defId; this.row = row; this.col = col;
    this.x = SLOT_COLS[col]; this.y = SLOT_ROWS[row];
    this.level = 1; this.invested = this.def.cost;
    this.cd = 0; this.angle = 0; this.flash = 0; this.repairDelay = 0;
    this.dead = false; this.built = 0;
    this.spec = null; this.specTier = 0; this.thorns = 0;
    this.recompute();
    this.hp = this.maxHp;
  }
  get kind() { return this.def.kind; }
  get selectable() { return this.kind !== "block"; }

  recompute() {
    const b = this.def.base;
    const bonus = this.game.bonus;
    const syn = this.game.synergy ? this.game.synergy.modsFor(this) : null;
    const sm = (k) => (syn && syn[k]) || 1;
    const dm = (1 + 0.42 * (this.level - 1)) * sm("dmg");
    const rm = (1 + 0.10 * (this.level - 1)) * sm("rate");
    const rrm = (1 + 0.08 * (this.level - 1)) * sm("range");
    if (this.kind === "block") {
      this.maxHp = Math.round(b.hp * (1 + 0.4 * (this.level - 1)));
      this.taunt = b.taunt;
    } else if (this.kind === "heal") {
      this.heal = b.heal * (1 + 0.5 * (this.level - 1)) * sm("dmg");
      this.maxHp = Math.round(260 * (1 + 0.2 * (this.level - 1)));
    } else if (this.kind === "flame" || this.kind === "cryo") {
      this.dmg = b.dps * dm * bonus.dmg;
      this.rate = this.kind === "cryo" ? 6 : 6;
      this.range = b.range * rrm * bonus.range;
      if (this.kind === "flame") this.burn = b.burn;
      if (this.kind === "cryo") { this.slow = b.slow; this.slowDur = b.slowDur; }
      this.maxHp = Math.round(260 * (1 + 0.2 * (this.level - 1)));
    } else if (this.kind === "mortar") {
      this.dmg = b.dmg * dm * bonus.dmg;
      this.rate = b.rate * rm * bonus.rate;
      this.range = b.range * rrm * bonus.range;
      this.aoe = b.aoe * (1 + 0.05 * (this.level - 1));
      this.bulletSpeed = b.bulletSpeed;
      this.maxHp = Math.round(260 * (1 + 0.2 * (this.level - 1)));
    } else if (this.kind === "laser") {
      this.dmg = b.dmg * dm * bonus.dmg;
      this.rate = b.rate * rm * bonus.rate;
      this.range = b.range * rrm * bonus.range;
      this.maxHp = Math.round(260 * (1 + 0.2 * (this.level - 1)));
    } else {
      this.dmg = b.dmg * dm * bonus.dmg;
      this.rate = b.rate * rm * bonus.rate;
      this.range = b.range * rrm * bonus.range;
      this.maxHp = Math.round(260 * (1 + 0.2 * (this.level - 1)));
      if (b.pierce) this.pierce = b.pierce;
      if (b.chain) this.chain = b.chain;
      if (b.slow) { this.slow = b.slow; this.slowDur = b.slowDur; }
      this.bulletSpeed = b.bulletSpeed;
    }
    this.applySpec();
  }
  /* path bonus chosen at level SPEC_LEVEL; tier 2 auto-granted at max level */
  specDef() { const s = TOWER_SPECS[this.id]; return s ? s.paths : null; }
  specPath() { const p = this.specDef(); return p ? p.find((x) => x.id === this.spec) || null : null; }
  canSpec() { return !!this.specDef() && !this.spec && this.level >= SPEC_LEVEL; }
  pickSpec(id) {
    if (!this.canSpec()) return false;
    const path = this.specPath0(id);
    if (!path) return false;
    this.spec = id; this.specTier = this.level >= MAX_LEVEL ? 2 : 1;
    this.recompute();
    return true;
  }
  specPath0(id) { const p = this.specDef(); return p ? p.find((x) => x.id === id) || null : null; }
  specMods() {
    const path = this.specPath();
    if (!path) return null;
    return this.specTier >= 2 ? Object.assign({}, path.mod, path.master.mod) : path.mod;
  }
  applySpec() {
    this.thorns = 0;
    if (this.spec && this.level >= MAX_LEVEL && this.specTier < 2) this.specTier = 2;
    const sp = this.specMods();
    if (!sp) return;
    const M = (k) => (typeof sp[k] === "number" ? sp[k] : 1);
    const A = (k) => (typeof sp[k] === "number" ? sp[k] : 0);
    if (this.dmg != null) this.dmg *= M("dmg");
    if (this.rate != null) this.rate *= M("rate");
    if (this.range != null) this.range *= M("range");
    if (this.aoe != null) this.aoe *= M("aoe");
    if (this.burn != null) this.burn *= M("burn");
    if (this.heal != null) this.heal *= M("dmg");
    if (this.maxHp != null) this.maxHp = Math.round(this.maxHp * M("hp"));
    if (this.slow != null) this.slow = Math.min(0.85, this.slow + A("slowAdd"));
    if (this.chain != null) this.chain += A("chainAdd");
    if (this.pierce != null) this.pierce += A("pierceAdd");
    this.critAdd = A("crit");
    this.thorns = A("thornsAdd");
  }
  upgradeCost() { return Math.round(this.def.cost * (0.5 + 0.6 * this.level)); }
  sellValue() { return Math.floor(this.invested * 0.6); }
  canUpgrade() { return this.level < MAX_LEVEL && !this.game.mods.noTowerUpgrades; }

  upgrade() {
    if (!this.canUpgrade()) return false;
    const c = this.upgradeCost();
    if (this.game.scrap < c) return false;
    this.game.spendScrap(c);
    this.invested += c; this.level++;
    this.game.state.stats.upgrades = (this.game.state.stats.upgrades || 0) + 1;
    this.recompute(); this.hp = this.maxHp;
    this.game.audio.sfx("upgrade");
    this.game.spawnRing(this.x, this.y, this.def.color, 60);
    return true;
  }
  repair(v) { this.hp = Math.min(this.maxHp, this.hp + v); this.repairDelay = 0; }
  hurt(v) {
    if (this.kind === "block" && v > 0) {}
    this.hp -= v; this.repairDelay = 6; this.flash = 0.2;
    if (this.hp <= 0) { this.hp = 0; this.die(); }
  }
  die() {
    this.dead = true;
    this.game.burst(this.x, this.y, this.def.color, 22, 210);
    this.game.effects.push(new Effect("ring", { x: this.x, y: this.y, radius: 70, color: this.def.color, dur: 0.5 }));
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.built < 1) this.built = Math.min(1, this.built + dt * 4);
    // auto repair after a lull
    if (this.hp < this.maxHp && this.repairDelay <= 0 && this.kind !== "heal") {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.06 * dt);
    }
    if (this.repairDelay > 0) this.repairDelay -= dt;

    if (this.kind === "block") return;
    if (this.kind === "heal") {
      game.fortress.heal(this.heal * dt);
      if (Math.random() < dt * 3) {
        game.emitPfx(this.x + rand(-14, 14), this.y + 10, rand(-6, 6), -rand(20, 45), 0.9, "#9dffcf", 3, -20);
      }
      return;
    }

    // acquire the zombie closest to the fortress inside range
    let target = null, bestX = Infinity;
    for (const z of game.zombies) {
      if (z.dead) continue;
      const d = dist(this.x, this.y, z.x, z.y);
      if (d > this.range + z.r) continue;
      if (z.x < bestX) { bestX = z.x; target = z; }
    }
    if (target) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      let diff = ((want - this.angle + Math.PI * 3) % TAU) - Math.PI;
      this.angle += diff * Math.min(1, dt * 12);
    }
    this.cd -= dt;
    if (this.cd <= 0 && target) { this.fire(target, game); this.cd = 1 / (this.rate * (game.overdriveT > 0 ? 1.6 : 1)); }
  }

  fire(target, game) {
    this.flash = 0.12;
    const ang = Math.atan2(target.y - this.y, target.x - this.x);
    const mx = this.x + Math.cos(ang) * 18, my = this.y + Math.sin(ang) * 18 - 22;
    const b = this.def.base;
    const crit = Math.random() < game.bonus.crit + (this.critAdd || 0);
    const pf = game.protocolFlags || {};
    const odMul = game.overdriveT > 0 ? 1.25 : 1;
    const round = { burn: pf.burn || 0, slow: pf.slow || 0, slowDur: pf.slowDur || 1.4 };
    const dmg = this.dmg * (crit ? 2 : 1) * odMul;
    if (this.kind === "bullet") {
      game.audio.sfx("shoot");
      game.projectiles.push(new Projectile({
        x: mx, y: my, vx: Math.cos(ang) * b.bulletSpeed, vy: Math.sin(ang) * b.bulletSpeed,
        dmg, radius: 4, color: this.def.accent, crit, speed: b.bulletSpeed,
        burn: round.burn, slow: round.slow, slowDur: round.slowDur, aoe: pf.aoe || 0,
      }));
      game.effects.push(new Effect("flash", { x: mx, y: my, radius: 12, color: this.def.accent, dur: 0.08 }));
    } else if (this.kind === "mortar") {
      game.audio.sfx("shotgun");
      game.projectiles.push(new Projectile({
        x: mx, y: my, vx: Math.cos(ang) * b.bulletSpeed, vy: Math.sin(ang) * b.bulletSpeed,
        dmg: dmg * 1.0, radius: 7, color: this.def.accent, crit, speed: b.bulletSpeed,
        aoe: (this.aoe || b.aoe), life: 3, kind: "shell",
      }));
      game.effects.push(new Effect("flash", { x: mx, y: my, radius: 15, color: "#ffd9a0", dur: 0.12 }));
    } else if (this.kind === "laser") {
      game.audio.sfx("sniper");
      const ex = this.x + Math.cos(ang) * this.range, ey = this.y - 22 + Math.sin(ang) * this.range;
      game.effects.push(new Effect("beam", { ax: this.x, ay: this.y - 22, bx: ex, by: ey, color: this.def.accent, dur: 0.14 }));
      const nx = Math.cos(ang), ny = Math.sin(ang);
      for (const z of game.zombies) {
        if (z.dead) continue;
        const rx = z.x - this.x, ry = (z.y - (this.y - 22));
        const along = rx * nx + ry * ny;
        if (along < -z.r || along > this.range + z.r) continue;
        const perp = Math.abs(rx * (-ny) + ry * nx);
        if (perp > z.r + 6) continue;
        z.hurt(dmg, game, { crit, burn: round.burn, slow: round.slow, slowDur: round.slowDur, src: "laser" });
      }
    } else if (this.kind === "cryo") {
      game.audio.sfx("freeze");
      for (const z of game.zombies) {
        if (z.dead) continue;
        if (dist(this.x, this.y, z.x, z.y) > this.range + z.r) continue;
        z.hurt(this.dmg * odMul, game, { slow: this.slow, slowDur: this.slowDur, src: "cryo" });
      }
      for (let i = 0; i < 6; i++) {
        const a = rand(0, TAU), rr = rand(6, this.range);
        game.emitPfx(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr, rand(-10, 10), -rand(10, 40), rand(0.3, 0.7), pick(["#bff0ff", "#8fe4ff", "#e6faff"]), rand(2, 5), -20);
      }
      game.effects.push(new Effect("ring", { x: this.x, y: this.y, radius: this.range * 0.7, color: "#8fe4ff", dur: 0.3 }));
    } else if (this.kind === "shotgun") {
      game.audio.sfx("shotgun");
      for (let i = 0; i < b.pellets; i++) {
        const a = ang + rand(-0.26, 0.26);
        const sp = b.bulletSpeed * rand(0.85, 1.15);
        game.projectiles.push(new Projectile({
          x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dmg: dmg / b.pellets * 1.6, radius: 3, color: this.def.accent, crit, life: 0.3, speed: sp,
          burn: round.burn, slow: round.slow, slowDur: round.slowDur, aoe: pf.aoe || 0,
        }));
      }
    } else if (this.kind === "sniper") {
      game.audio.sfx("sniper");
      game.projectiles.push(new Projectile({
        x: mx, y: my, vx: Math.cos(ang) * b.bulletSpeed, vy: Math.sin(ang) * b.bulletSpeed,
        dmg, radius: 5, color: this.def.accent, crit, pierce: this.pierce, kind: "sniper",
        burn: round.burn, slow: round.slow, slowDur: round.slowDur, aoe: pf.aoe || 0,
      }));
      game.effects.push(new Effect("flash", { x: mx, y: my, radius: 16, color: "#efe", dur: 0.1 }));
    } else if (this.kind === "flame") {
      game.audio.sfx("flame");
      for (const z of game.zombies) {
        if (z.dead) continue;
        const d = dist(this.x, this.y, z.x, z.y);
        if (d > this.range + z.r) continue;
        const za = Math.atan2(z.y - this.y, z.x - this.x);
        let diff = Math.abs(((za - ang + Math.PI * 3) % TAU) - Math.PI);
        if (diff < 0.42) {
          z.hurt(this.dmg, game, { burn: this.burn, src: "flame" });
          z.burning = { t: this.burn, dps: this.dmg * 0.8 };
        }
      }
      for (let i = 0; i < 8; i++) {
        const a = ang + rand(-0.36, 0.36);
        game.emitPfx(
          this.x + Math.cos(a) * 16, this.y - 22 + Math.sin(a) * 16,
          Math.cos(a) * rand(90, 200), Math.sin(a) * rand(90, 200) - 20,
          rand(0.25, 0.5), pick(["#ffd24a", "#ff8a2a", "#ff5a1a"]), rand(4, 9), -30);
      }
      game.effects.push(new Effect("flash", { x: this.x + Math.cos(ang) * 30, y: this.y - 22 + Math.sin(ang) * 30, radius: 20, color: "#ffb347", dur: 0.12 }));
    } else if (this.kind === "tesla") {
      game.audio.sfx("tesla");
      const hit = new Set();
      let cur = target, cx = this.x, cy = this.y - 22;
      let chained = 0;
      while (cur && chained < this.chain) {
        game.effects.push(new Effect("arc", { ax: cx, ay: cy, bx: cur.x, by: cur.y, color: this.def.accent, dur: 0.16 }));
        cur.hurt(dmg * Math.pow(0.82, chained), game, { slow: this.slow, slowDur: this.slowDur, src: "tesla" });
        hit.add(cur.id);
        cx = cur.x; cy = cur.y; chained++;
        let next = null, nd = 130;
        for (const z of game.zombies) {
          if (z.dead || hit.has(z.id)) continue;
          const d = dist(cx, cy, z.x, z.y);
          if (d < nd) { nd = d; next = z; }
        }
        cur = next;
      }
    }
  }

  draw(ctx, game) {
    if (ART.ready && ART.has("tower/" + this.id + "_base")) this.drawSprite(ctx);
    else this.drawVector(ctx, game);
    this.drawHealth(ctx);
  }

  /* pixel-art base + rotating turret */
  drawSprite(ctx) {
    const p = this.built;
    const s = 0.82 + 0.18 * p;
    const baseKey = "tower/" + this.id + "_base";
    const turKey = "tower/" + this.id + "_turret";
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.imageSmoothingEnabled = false;
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(0, 14, 34 * s, 13 * s, 0, 0, TAU); ctx.fill();
    const bw = 84 * s, bh = 84 * s;
    ctx.drawImage(ART.images[baseKey], -bw / 2, -bh / 2, bw, bh);
    if (this.kind !== "block" && this.kind !== "heal" && ART.has(turKey)) {
      const im = ART.images[turKey];
      let fr = 0;
      if (this.flash > 0) fr = (Math.floor(nowMs() / 45) % 2) ? 1 : 2;
      else if (this.built < 1) fr = 3;
      const tw = 68 * s, th = 68 * s;
      ctx.save();
      ctx.translate(0, 6 * s);
      ctx.rotate(this.angle);
      ctx.drawImage(im, fr * 48, 0, 48, 48, -tw / 2, -th / 2, tw, th);
      ctx.restore();
    }
    for (let i = 0; i < this.level; i++) {
      ctx.fillStyle = this.level >= MAX_LEVEL ? "#ffce4a" : "#7fe0a8";
      ctx.fillRect(-20 + i * 9, 22, 6, 4);
    }
    ctx.restore();
  }

  drawVector(ctx, game) {
    const p = this.built;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p);
    // base plate
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(0, 12, 30, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#20293d";
    ctx.beginPath(); ctx.roundRect(-24, -12, 48, 26, 6); ctx.fill();
    ctx.strokeStyle = "rgba(150,190,255,.25)"; ctx.lineWidth = 1.5; ctx.stroke();
    // body
    const c = this.flash > 0 ? "#ffffff" : this.def.color;
    ctx.fillStyle = c;
    if (this.kind === "block") {
      ctx.fillStyle = this.flash > 0 ? "#fff" : "#8a7748";
      for (let i = 0; i < 3; i++) { ctx.fillRect(-22, -6 + i * 8, 44, 6); }
      ctx.fillStyle = this.def.accent;
      ctx.fillRect(-22, -8, 44, 3);
    } else if (this.kind === "heal") {
      ctx.beginPath(); ctx.arc(0, -14, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = "#eafff5";
      ctx.fillRect(-3, -23, 6, 18); ctx.fillRect(-9, -17, 18, 6);
    } else {
      ctx.beginPath(); ctx.arc(0, -12, 14, 0, TAU); ctx.fill();
      // turret
      ctx.save();
      ctx.translate(0, -22); ctx.rotate(this.angle);
      ctx.fillStyle = this.def.accent;
      if (this.kind === "sniper") ctx.fillRect(0, -2.5, 30, 5);
      else if (this.kind === "shotgun") { ctx.fillRect(0, -5, 22, 4); ctx.fillRect(0, 1, 22, 4); }
      else if (this.kind === "flame") { ctx.fillRect(0, -4, 20, 8); ctx.beginPath(); ctx.arc(20, 0, 5, 0, TAU); ctx.fill(); }
      else if (this.kind === "mortar") { ctx.fillRect(0, -7, 24, 14); ctx.fillRect(20, -5, 10, 10); }
      else if (this.kind === "cryo") {
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
        ctx.strokeStyle = this.def.accent; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * -8, Math.sin(a) * -8); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke(); }
      }
      else if (this.kind === "laser") {
        ctx.fillRect(0, -3, 16, 6);
        ctx.beginPath(); ctx.arc(18, 0, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(18, 0, 2, 0, TAU); ctx.fill();
      }
      else if (this.kind === "tesla") {
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        ctx.strokeStyle = this.def.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -8, 9, 0, TAU); ctx.stroke();
      } else ctx.fillRect(0, -3, 24, 6);
      ctx.restore();
      if (this.flash > 0) {
        ctx.globalAlpha = this.flash * 5;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(Math.cos(this.angle) * 26, -22 + Math.sin(this.angle) * 26, 9, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // level pips
    for (let i = 0; i < this.level; i++) {
      ctx.fillStyle = this.level >= MAX_LEVEL ? "#ffce4a" : "#7fe0a8";
      ctx.fillRect(-20 + i * 9, 18, 6, 4);
    }
    ctx.restore();
  }

  drawHealth(ctx) {
    if (this.hp < this.maxHp - 0.5) {
      const w = 52, h = 6, x = this.x - w / 2, y = this.y - 50;
      ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = this.kind === "block" ? "#c9b06a" : "#57e08a";
      ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), h);
    }
  }
  drawRange(ctx) {
    if (this.kind === "heal") { ctx.strokeStyle = "rgba(89,224,160,.5)"; }
    else ctx.strokeStyle = "rgba(140,200,255,.45)";
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.range || 60, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
}

/* small tower icon renderer used by the build bar and collection screen */
function drawTowerGlyph(canvas, def, locked) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || parseInt(canvas.getAttribute("width"), 10) || 56;
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  const s = size / 56;
  ctx.save();
  ctx.translate(size / 2, size / 2 + 4 * s);
  ctx.scale(s, s);
  ctx.globalAlpha = locked ? 0.5 : 1;
  ctx.fillStyle = "rgba(255,255,255,.07)";
  ctx.beginPath(); ctx.roundRect(-22, -22, 44, 44, 10); ctx.fill();
  // pixel-art glyph when the sprites are loaded
  if (ART.ready && ART.has("tower/" + def.id + "_base")) {
    ctx.imageSmoothingEnabled = false;
    const bs = 40;
    ctx.drawImage(ART.images["tower/" + def.id + "_base"], -bs / 2, -bs / 2 + 6, bs, bs);
    if (ART.has("tower/" + def.id + "_turret")) {
      const ts = 30;
      ctx.drawImage(ART.images["tower/" + def.id + "_turret"], 0, 0, 48, 48, -ts / 2, -ts / 2 - 6, ts, ts);
    }
    ctx.restore();
    return;
  }
  const c = def.color;
  if (def.kind === "block") {
    ctx.fillStyle = c;
    for (let i = 0; i < 3; i++) ctx.fillRect(-16, -12 + i * 9, 32, 7);
  } else if (def.kind === "heal") {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0b1220"; ctx.fillRect(-3, -10, 6, 20); ctx.fillRect(-10, -3, 20, 6);
  } else {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 6, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = def.accent;
    ctx.save(); ctx.translate(0, -6); ctx.rotate(-Math.PI / 4);
    ctx.fillRect(0, -3, 24, 6); ctx.restore();
  }
  ctx.restore();
}
