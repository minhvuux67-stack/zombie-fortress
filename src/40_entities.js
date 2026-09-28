/* ---------------------------------------------------------------------
   VISUAL EFFECTS, PROJECTILES, FORTRESS
   --------------------------------------------------------------------- */
class Particle {
  constructor(x, y, vx, vy, life, color, size, grav) {
    this.reset(x, y, vx, vy, life, color, size, grav);
  }
  reset(x, y, vx, vy, life, color, size, grav) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.max = life; this.color = color;
    this.size = size; this.grav = grav == null ? 120 : grav;
    this.dead = false;
    this.live = false;
    return this;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.98;
  }
  draw(ctx) {
    const t = Math.max(0, this.life / this.max);
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    const s = this.size * (0.35 + t * 0.65);
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }
}

class DamageText {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color || "#fff";
    this.life = 0.85; this.max = 0.85; this.vy = -52; this.dead = false;
  }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; this.y += this.vy * dt; this.vy *= 0.94; }
  draw(ctx) {
    const t = Math.max(0, this.life / this.max);
    ctx.globalAlpha = t;
    ctx.font = "700 15px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.8)";
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

/* transient graphic effects: explosions, arcs, cones, rings, muzzle flash */
class Effect {
  constructor(type, opts) {
    this.type = type; this.dead = false; this.t = 0;
    Object.assign(this, opts);
    this.dur = opts.dur || 0.4;
  }
  update(dt) { this.t += dt; if (this.t >= this.dur) this.dead = true; }
  draw(ctx) {
    const p = clamp(this.t / this.dur, 0, 1);
    const a = 1 - p;
    // ---- sprite-based effects (fall back to vector if assets are absent) ----
    if (this.type === "explosion" && ART.ready && ART.has("fx/explosion_big")) {
      const im = ART.images["fx/explosion_big"];
      const fr = Math.min(11, Math.floor(p * 12));
      const size = (this.radius || 60) * 2.5;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = Math.min(1, a * 2.4);
      ctx.drawImage(im, fr * 96, 0, 96, 96, this.x - size / 2, this.y - size / 2, size, size);
      ctx.restore(); return;
    }
    if (this.type === "flash" && ART.ready && ART.has("fx/muzzle")) {
      const im = ART.images["fx/muzzle"];
      const fr = Math.min(4, Math.floor(p * 5));
      const size = (this.radius || 12) * 3.4;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a;
      ctx.drawImage(im, fr * 32, 0, 32, 32, this.x - size / 2, this.y - size / 2, size, size);
      ctx.restore(); return;
    }
    if (this.type === "zdeath" && ART.ready && ART.has("zombie/" + this.zid)) {
      const im = ART.images["zombie/" + this.zid];
      const ad = ZOMBIE_ANIM.death;
      const fr = Math.min(ad.frames - 1, Math.floor(p * ad.frames));
      const scale = ((this.r || 15) * 3.0) / ZS.fh;
      const w = ZS.fw * scale, h = ZS.fh * scale;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, fr * ZS.fw, ad.row * ZS.fh, ZS.fw, ZS.fh,
        this.x - w / 2, this.y + (this.r || 15) * 0.62 - h, w, h);
      ctx.restore(); return;
    }
    ctx.globalAlpha = a;
    if (this.type === "explosion") {
      const r = lerp(8, this.radius, Math.sqrt(p));
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
      g.addColorStop(0, "rgba(255,240,180,.95)");
      g.addColorStop(0.5, "rgba(255,140,40,.75)");
      g.addColorStop(1, "rgba(255,60,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.fill();
    } else if (this.type === "ring") {
      ctx.strokeStyle = this.color || "#fff";
      ctx.lineWidth = 4 * a + 1;
      ctx.beginPath(); ctx.arc(this.x, this.y, lerp(6, this.radius, p), 0, TAU); ctx.stroke();
    } else if (this.type === "arc") {
      ctx.strokeStyle = this.color || "#7ff";
      ctx.lineWidth = 2.5; ctx.shadowColor = this.color || "#7ff"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(this.ax, this.ay);
      const mx = (this.ax + this.bx) / 2 + rand(-16, 16), my = (this.ay + this.by) / 2 + rand(-16, 16);
      ctx.quadraticCurveTo(mx, my, this.bx, this.by); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (this.type === "flash") {
      ctx.fillStyle = this.color || "#ffe";
      ctx.beginPath(); ctx.arc(this.x, this.y, lerp(this.radius || 10, 2, p), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------------------------------------------------------------------
   PROJECTILES
   --------------------------------------------------------------------- */
class Projectile {
  constructor(opts) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, dmg: 10, speed: 600, radius: 4,
      color: "#ffe", life: 2, pierce: 0, aoe: 0, burn: 0, slow: 0, slowDur: 0,
      crit: false, kind: "bullet", hitIds: null, dead: false, trail: true,
    }, opts);
    this.hitIds = new Set();
  }
  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // sub-step movement so fast bullets can never tunnel through zombies
    const travel = Math.hypot(this.vx, this.vy) * dt;
    const steps = Math.max(1, Math.min(24, Math.ceil(travel / 8)));
    const sdt = dt / steps;
    for (let s = 0; s < steps && !this.dead; s++) this.step(sdt, game);
  }
  step(dt, game) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < -40 || this.x > W + 60 || this.y < -60 || this.y > H + 60) { this.dead = true; return; }
    if (this.hostile) {
      // acid lobbed by spitters at a tower or at the fortress wall
      if (dist(this.x, this.y, this.tx, this.ty) < 16) {
        if (this.targetTower && !this.targetTower.dead) this.targetTower.hurt(this.dmg);
        else game.fortress.hurt(this.dmg, game);
        game.effects.push(new Effect("flash", { x: this.x, y: this.y, radius: 20, color: "#9dff9d", dur: 0.25 }));
        game.burst(this.x, this.y, "#9dff9d", 7, 90);
        this.dead = true;
      }
      return;
    }
    for (const z of game.zombies) {
      if (z.dead || this.hitIds.has(z.id)) continue;
      if (dist(this.x, this.y, z.x, z.y) > z.r + this.radius) continue;
      // crawlers hug the ground: slow projectiles sail over them
      if (z.def.low && !this.hostile && this.kind !== "flame" && Math.random() < 0.35) continue;
      this.hitIds.add(z.id);
      if (this.aoe > 0) {
        game.explode(this.x, this.y, this.aoe, this.dmg, this.color);
        this.dead = true; return;
      }
      z.hurt(this.dmg, game, { crit: this.crit, burn: this.burn, slow: this.slow, slowDur: this.slowDur, src: "projectile" });
      game.hitParticles(this.x, this.y, this.color);
      if (this.pierce > 0) { this.pierce--; }
      else { this.dead = true; return; }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = 9;
    ctx.fillStyle = this.color;
    if (this.kind === "sniper") {
      const ang = Math.atan2(this.vy, this.vx);
      ctx.translate(this.x, this.y); ctx.rotate(ang);
      ctx.fillRect(-11, -2, 22, 4);
    } else {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------------------------------------------------------------------
   FORTRESS
   --------------------------------------------------------------------- */
class Fortress {
  constructor(maxHp) {
    this.maxHp = maxHp; this.hp = maxHp;
    this.flash = 0; this.regen = 0; this.shake = 0;
  }
  get pct() { return clamp(this.hp / this.maxHp, 0, 1); }
  heal(v) { this.hp = Math.min(this.maxHp, this.hp + v); }
  hurt(v, game) {
    this.hp -= v; this.flash = 0.25; this.shake = 0.3;
    game.fortressTouched = true; game.killCombo = 0;
    if (game.run) game.run.fortressHit = true;
    if (this.hp <= 0) { this.hp = 0; game.gameOver(); }
  }
  update(dt, game) {
    if (this.regen > 0) this.heal(this.regen * dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 3);
  }
  draw(ctx, game) {
    const x = FIELD_LEFT, shake = this.shake > 0 ? rand(-4, 4) * this.shake : 0;
    ctx.save();
    ctx.translate(shake, 0);
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0, 84, x, H - 168);
    // main wall
    const wallArt = ART.ready && ART.images[game && game.fortress && this.pct < 0.5 ? "fortress/wall_blood" : "fortress/wall"];
    if (wallArt) {
      const pat = ctx.createPattern(wallArt, "repeat");
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 78, x - 12, H - 156);
      // darken toward the outer edge
      const sh = ctx.createLinearGradient(x - 60, 0, x, 0);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.45)");
      ctx.fillStyle = sh; ctx.fillRect(0, 78, x - 12, H - 156);
    } else {
      const g = ctx.createLinearGradient(0, 0, x, 0);
      g.addColorStop(0, "#2b3550"); g.addColorStop(1, "#3d4a6b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 78, x - 12, H - 156);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      for (let yy = 96; yy < H - 80; yy += 22) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(x - 12, yy); ctx.stroke();
      }
    }
    // buttress stones along the inner edge
    for (let i = 0; i < 6; i++) {
      const yy = 78 + i * (H - 156) / 6;
      ctx.fillStyle = "#242c42";
      ctx.fillRect(x - 12 - 26, yy + 8, 12, 30);
      ctx.fillStyle = "#4d5a82";
      ctx.fillRect(x - 12 - 26, yy + 8, 12, 4);
    }
    // sandbags + battlements
    ctx.fillStyle = "#4a5570";
    for (let yy = 86; yy < H - 80; yy += 26) ctx.fillRect(x - 12, yy, 12, 16);
    ctx.fillStyle = "#59668a";
    ctx.fillRect(0, 70, x - 12, 12);
    // glowing emblem
    const pulse = 0.5 + 0.5 * Math.sin(nowMs() / 420);
    ctx.save();
    ctx.shadowColor = "#57e08a"; ctx.shadowBlur = 22 + pulse * 12;
    ctx.fillStyle = "rgba(87,224,138,.9)";
    ctx.beginPath();
    ctx.moveTo(x / 2 - 26, H / 2 + 26); ctx.lineTo(x / 2 - 26, H / 2 - 16);
    ctx.lineTo(x / 2 - 12, H / 2 - 30); ctx.lineTo(x / 2 + 2, H / 2 - 16);
    ctx.lineTo(x / 2 + 16, H / 2 - 30); ctx.lineTo(x / 2 + 30, H / 2 - 16);
    ctx.lineTo(x / 2 + 30, H / 2 + 26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0b1220";
    ctx.beginPath(); ctx.arc(x / 2 - 9, H / 2 - 2, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x / 2 + 9, H / 2 - 2, 4, 0, TAU); ctx.fill();
    ctx.fillRect(x / 2 - 8, H / 2 + 12, 16, 5);
    ctx.restore();
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = "#ff5566";
      ctx.fillRect(0, 78, x - 12, H - 156);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
