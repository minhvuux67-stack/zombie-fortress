/* ---------------------------------------------------------------------
   ZOMBIE - walks right-to-left, smashes whatever blocks the way.
   --------------------------------------------------------------------- */
class Zombie {
  constructor(typeId, lane, wave, game, opts) {
    opts = opts || {};
    const d = ZOMBIE_DEFS[typeId];
    this.type = typeId; this.def = d;
    this.id = game.nextId();
    this.lane = lane;
    this.x = opts.x != null ? opts.x : SPAWN_X + rand(0, 60);
    this.y = LANES[lane] + rand(-16, 16);
    this.maxHp = d.hp * game.waveHpMul * (opts.hpMul || 1);
    this.hp = this.maxHp;
    this.speed = d.speed * game.waveSpeedMul * (opts.speedMul || 1) * (game.mods.zombieSpeed || 1) * (game.weatherZombieSpeed || 1);
    this.dmg = d.dmg * game.waveDmgMul;
    this.scrap = Math.max(1, Math.round(d.scrap * (1 + wave * 0.05) * (game.mutationScrap || 1)));
    this.r = d.r;
    this.vuln = (opts.vuln != null ? opts.vuln : 1) * (game.mutationVuln || 1);
    this.dead = false;
    this.attackCd = 0;
    this.slowMul = 1; this.slowT = 0;
    this.frozenT = 0; this.burning = null; this.rageT = 0;
    this.phase = rand(0, TAU);
    this.hitFlash = 0;
    this.target = null;          // {type:'tower'|'fortress', tower}
    this.state = "walk";
    this.lunge = 0;
    this.spawnAnim = 0;
  }
  get armored() { return this.def.armor || 0; }

  hurt(amount, game, opts) {
    opts = opts || {};
    if (this.dead) return 0;
    let dmg = amount;
    const armor = this.armored;
    if (armor && opts.src !== "flame" && opts.src !== "burn") dmg = Math.max(1, dmg - armor * 0.5);
    // shield-bearers angle their cover at the towers: bullet/shotgun/sniper
    // rounds glance off, but fire, lightning and explosions ignore the cover
    if (this.def.frontArmor && opts.src === "projectile") {
      dmg *= 0.45;
    }
    if (this.vuln && this.vuln !== 1) dmg *= this.vuln;
    this.hp -= dmg;
    this.hitFlash = 0.12;
    if (opts.burn) this.burning = { t: Math.max(this.burning ? this.burning.t : 0, opts.burn), dps: Math.max(this.burning ? this.burning.dps : 0, dmg * 0.5) };
    if (opts.slow) {
      this.slowMul = Math.min(this.slowMul, 1 - opts.slow);
      this.slowT = Math.max(this.slowT, opts.slowDur || 1.5);
    }
    if (dmg >= 6 && (dmg > 20 || Math.random() < 0.5)) game.damageTexts.push(new DamageText(this.x + rand(-8, 8), this.y - this.r - 6, (opts.crit ? "\u2726" : "") + Math.round(dmg), opts.crit ? "#ffce4a" : "#ffffff"));
    if (this.hp <= 0) this.die(game);
    return dmg;
  }
  die(game) {
    if (this.dead) return;
    this.dead = true;
    game.onZombieKilled(this);
  }

  update(dt, game) {
    if (this.dead) return;
    this.spawnAnim = Math.min(1, this.spawnAnim + dt * 3);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
    if (this.burning && this.burning.t > 0) {
      this.burning.t -= dt;
      this.hp -= this.burning.dps * dt;
      if (Math.random() < dt * 14) game.emitPfx(this.x + rand(-8, 8), this.y - rand(0, 20), rand(-14, 14), -rand(30, 70), 0.4, pick(["#ffb347", "#ff6a3d"]), rand(3, 6), -40);
      if (this.hp <= 0) { this.die(game); return; }
    }
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowMul = 1; }
    if (this.frozenT > 0) this.frozenT -= dt;
    if (this.rageT > 0) this.rageT -= dt;
    this.lunge = Math.max(0, this.lunge - dt * 4);

    const frozen = this.frozenT > 0;
    let spd = this.speed * this.slowMul * (frozen ? 0.05 : 1) * (this.rageT > 0 ? 1.3 : 1);
    this.phase += spd * dt * 0.055;

    // pick a target: nearby barricade taunts, otherwise the fortress
    let towerTarget = null, bestD = Infinity;
    for (const t of game.towers) {
      if (t.dead || t.kind !== "block") continue;
      const d = dist(this.x, this.y, t.x, t.y);
      if (d < (t.taunt || 0) && d < bestD) { bestD = d; towerTarget = t; }
    }
    this.target = towerTarget ? { type: "tower", tower: towerTarget } : { type: "fortress" };

    const ranged = this.def.ranged;
    // movement / attacking
    if (this.target.type === "tower") {
      const t = this.target.tower;
      const d = dist(this.x, this.y, t.x, t.y);
      if (d > this.r + 26) this.moveTo(t.x, t.y, spd, dt);
      else this.attack(t, game, dt, true);
    } else {
      const stopAt = ranged ? FORTRESS_X + ranged : FORTRESS_X + this.r;
      if (this.x > stopAt) this.moveTo(stopAt, this.y, spd, dt);
      else this.attack(null, game, dt, false);
    }

    // specials
    if (this.def.summon && !frozen) {
      this.summonT = (this.summonT || this.def.summon) - dt;
      if (this.summonT <= 0) {
        this.summonT = this.def.summon;
        game.audio.sfx("growl");
        game.effects.push(new Effect("ring", { x: this.x, y: this.y, radius: 60, color: "#c06fd8", dur: 0.5 }));
        for (let i = 0; i < 2; i++) game.spawnZombie("walker", randInt(0, LANES.length - 1), { x: this.x + rand(-20, 20), hpMul: 0.9 });
      }
    }
    if (this.def.boss && !frozen) {
      this.roarT = (this.roarT || this.def.roar) - dt;
      if (this.roarT <= 0) {
        this.roarT = this.def.roar;
        game.audio.sfx("boss");
        game.effects.push(new Effect("ring", { x: this.x, y: this.y, radius: 300, color: "#ff5566", dur: 0.7 }));
        for (const z of game.zombies) if (!z.dead && dist(z.x, z.y, this.x, this.y) < 320) z.rageT = 6;
        game.shake = Math.max(game.shake, 0.4);
      }
    }
  }
  moveTo(tx, ty, spd, dt) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * spd * dt;
    this.y += (dy / d) * spd * dt * 0.6;
    this.y = clamp(this.y, LANES[0] - 44, LANES[LANES.length - 1] + 44);
  }
  attack(tower, game, dt, isTower) {
    this.attackCd -= dt;
    if (this.attackCd > 0) return;
    this.attackCd = this.def.rate;
    this.lunge = 1;
    if (this.def.ranged) {
      game.audio.sfx("spit");
      const tx = isTower ? tower.x : FORTRESS_X + 4;
      const ty = isTower ? tower.y : clamp(this.y, 100, H - 100);
      const ang = Math.atan2(ty - this.y, tx - this.x);
      const sp = 300;
      game.hostile.push(new Projectile({
        x: this.x, y: this.y - 14, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        hostile: true, tx, ty, dmg: this.dmg * 1.5, radius: 6, color: "#9dff9d",
        targetTower: isTower ? tower : null, life: 4,
      }));
      return;
    }
    if (isTower && tower) {
      tower.hurt(this.dmg);
      game.effects.push(new Effect("flash", { x: tower.x - 14, y: tower.y, radius: 14, color: "#ffd0d0", dur: 0.16 }));
      game.emitPfx(tower.x - 12, tower.y, -rand(20, 90), rand(-40, 40), 0.4, "#d9c06a", 4, 200);
    } else {
      game.fortress.hurt(this.dmg, game);
      game.audio.sfx("hit");
      game.effects.push(new Effect("flash", { x: FORTRESS_X - 4, y: this.y, radius: 18, color: "#ff8090", dur: 0.2 }));
    }
  }

  draw(ctx, game) {
    if (!(ART.ready && ART.has("zombie/" + this.type) && this.drawSprite(ctx))) this.drawVector(ctx, game);
    this.drawStatus(ctx);
  }

  /* pixel-art animated body; returns false when the sheet is unavailable */
  drawSprite(ctx) {
    const key = "zombie/" + this.type;
    let anim = "walk";
    if (this.spawnAnim < 1) anim = "spawn";
    else if (this.hitFlash > 0) anim = "hurt";
    else if (this.lunge > 0.15) anim = "attack";
    const a = ZOMBIE_ANIM[anim] || ZOMBIE_ANIM.walk;
    const t = (nowMs() / 1000) * a.fps + this.phase * 2.2;
    const col = Math.floor(t) % a.frames;
    const scale = (this.r * 3.0) / ZS.fh;
    const w = ZS.fw * scale, h = ZS.fh * scale;
    const dy = this.y + this.r * 0.62;
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath(); ctx.ellipse(this.x, this.y + this.r * 0.68, this.r * 0.95, this.r * 0.34, 0, 0, TAU); ctx.fill();
    if (this.hitFlash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.9, this.hitFlash * 5); ctx.globalCompositeOperation = "lighter";
      artFrame(ctx, key, col, a.row, ZS.fw, ZS.fh, this.x, dy, w, h, false);
      ctx.restore();
    }
    artFrame(ctx, key, col, a.row, ZS.fw, ZS.fh, this.x, dy, w, h, false);
    return true;
  }

  /* original vector drawing, used as a fallback before assets load */
  drawVector(ctx, game) {
    const s = 0.7 + 0.3 * this.spawnAnim;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath(); ctx.ellipse(0, this.r, this.r * 0.9, this.r * 0.36, 0, 0, TAU); ctx.fill();
    const body = this.hitFlash > 0 ? "#ffffff" : this.def.color;
    const dark = "#26301f";
    const legSwing = Math.sin(this.phase) * (this.r * 0.4);
    // legs
    ctx.strokeStyle = dark; ctx.lineWidth = this.r * 0.34; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-this.r * 0.1, -this.r * 0.2); ctx.lineTo(-this.r * 0.1 + legSwing, this.r * 0.85);
    ctx.moveTo(this.r * 0.1, -this.r * 0.2); ctx.lineTo(this.r * 0.1 - legSwing, this.r * 0.85);
    ctx.stroke();
    // torso
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.roundRect(-this.r * 0.6, -this.r * 1.05, this.r * 1.2, this.r * 1.1, this.r * 0.3); ctx.fill();
    // arms reaching left
    ctx.strokeStyle = body; ctx.lineWidth = this.r * 0.3;
    ctx.beginPath();
    ctx.moveTo(-this.r * 0.3, -this.r * 0.85); ctx.lineTo(-this.r * 1.35, -this.r * 0.7 + legSwing * 0.5);
    ctx.moveTo(this.r * 0.3, -this.r * 0.85); ctx.lineTo(-this.r * 1.05, -this.r * 0.95 - legSwing * 0.5);
    ctx.stroke();
    // head
    ctx.fillStyle = this.hitFlash > 0 ? "#fff" : this.def.color;
    ctx.beginPath(); ctx.arc(-this.r * 0.15, -this.r * 1.5, this.r * 0.52, 0, TAU); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(-this.r * 0.4, -this.r * 1.6, this.r * 0.13, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-this.r * 0.02, -this.r * 1.62, this.r * 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8dff7a";
    ctx.beginPath(); ctx.arc(-this.r * 0.4, -this.r * 1.62, this.r * 0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-this.r * 0.02, -this.r * 1.64, this.r * 0.06, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawStatus(ctx) {
    // status tint
    if (this.frozenT > 0) {
      ctx.globalAlpha = clamp(this.frozenT, 0, 1) * 0.55;
      ctx.fillStyle = "#8fe4ff";
      ctx.beginPath(); ctx.arc(this.x, this.y - this.r * 0.5, this.r * 1.15, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.slowT > 0) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#6fd0ff";
      ctx.beginPath(); ctx.arc(this.x, this.y - this.r * 0.5, this.r * 1.05, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // boss crown
    if (this.def.boss) {
      ctx.save();
      ctx.shadowColor = "#ffce4a"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffce4a";
      ctx.beginPath();
      ctx.moveTo(this.x - 18, this.y - this.r * 2.05);
      ctx.lineTo(this.x - 18, this.y - this.r * 2.5);
      ctx.lineTo(this.x - 8, this.y - this.r * 2.15);
      ctx.lineTo(this.x, this.y - this.r * 2.6);
      ctx.lineTo(this.x + 8, this.y - this.r * 2.15);
      ctx.lineTo(this.x + 18, this.y - this.r * 2.5);
      ctx.lineTo(this.x + 18, this.y - this.r * 2.05);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // hp bar
    const w = this.r * 2.4, h = this.def.boss ? 8 : 5;
    const bx = this.x - w / 2, by = this.y - this.r * (this.def.boss ? 3.5 : 2.4) - 8;
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(bx, by, w, h);
    const pct = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = pct > 0.5 ? "#ff6b6b" : pct > 0.22 ? "#ffb347" : "#ffe066";
    ctx.fillRect(bx, by, w * pct, h);
    if (this.def.boss) {
      ctx.font = "700 11px Segoe UI, sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#ffd9dd";
      ctx.fillText(T(this.def.name).toUpperCase(), this.x, by - 5);
    }
  }
}
