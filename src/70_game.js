/* ---------------------------------------------------------------------
   GAME - the main loop, run lifecycle, economy and input
   --------------------------------------------------------------------- */
class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.state = SaveSystem.load();
    I18N.init(this.state.settings.lang);
    this.audio = new AudioSystem(this.state);
    this.ui = new UIManager(this);
    I18N.start();
    this.waves = new WaveManager(this);
    this.achievements = new AchievementSystem(this);
    this.scrap = 0;
    this.food = this.state.food || 0;
    this.meds = this.state.meds || 0;
    this.daily = new DailyRewardSystem(this);
    this.meta = new MetaProgressionManager(this);
    this.mutations = new MutationSystem(this);
    this.weather = new WeatherSystem(this);
    this.synergy = new SynergySystem(this);
    this.protocols = new ProtocolSystem(this);
    this.campaign = new CampaignSystem(this);
    this.speed = this.state.settings.speed || 1;
    this.overdriveT = 0;
    this.weatherZombieSpeed = 1;
    this.mutationVuln = 1; this.mutationScrap = 1; this.mutationMultiLane = false;
    this.mods = {};
    this.endless = false;
    this.screen = "menu";
    this.paused = false;
    this.idCounter = 1;
    this.zombies = []; this.towers = []; this.projectiles = [];
    this.hostile = []; this.particles = []; this.effects = []; this.damageTexts = [];
    this.fortress = null;
    this.waveHpMul = 1; this.waveSpeedMul = 1; this.waveDmgMul = 1;
    this.selectedTower = null; this.selectedSkill = null; this.selectedSlot = null;
    this.scrap = 0; this.food = this.state.food || 0; this.meds = this.state.meds || 0;
    this.shake = 0; this.killCombo = 0; this.killComboBest = 0;    this.run = null;
    this.mouse = { x: -100, y: -100, on: 0 };
    this.decor = this.makeDecor();
    this.computeBonus();
    this.skills = [
      { id: "airstrike", name: "Strike", icon: "\u{1F4A3}", costType: "food", cost: 25, cd: 45, cdLeft: 0, desc: "Tap the field to call a bombing run (220 damage over a wide area)." },
      { id: "freeze", name: "Freeze", icon: "\u2744", costType: "food", cost: 20, cd: 40, cdLeft: 0, desc: "Freeze every zombie on screen for 3 seconds." },
      { id: "repair", name: "Repair", icon: "\u{1F6E0}", costType: "meds", cost: 20, cd: 60, cdLeft: 0, desc: "Restore 35% of the fortress maximum HP." },
      { id: "overdrive", name: "Overdrive", icon: "\u{1F680}", costType: "food", cost: 30, cd: 75, cdLeft: 0, desc: "Overclock every tower: +25% damage and +60% fire rate for 8 seconds." },
    ];
    this.setupStage();
    this.bindInput();
    this.loadAssets();
    this.lastT = performance.now();
    this.saveTimer = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  score() { return this.state.highestWave * 120 + this.state.totalKills * 2; }
  destroy() {
    this.destroyed = true;
    try { this.audio.stopMusic(); } catch (e) {}
  }
  computeBonus() {
    const u = (id) => this.state.permanentUpgrades[id] || 0;
    const m = this.meta ? this.meta.bonus : {};
    const mul = (k) => (typeof m[k] === "number" ? m[k] : 1);
    const add = (k) => (typeof m[k] === "number" ? m[k] : 0);
    this.bonus = {
      dmg: (1 + 0.06 * u("damage")) * mul("dmg"),
      rate: (1 + 0.04 * u("firerate")) * mul("rate"),
      range: (1 + 0.05 * u("range")) * mul("range"),
      crit: 0.03 * u("crit") + add("crit"),
      scrapGain: (1 + 0.07 * u("scrapgain")) * mul("scrapGain"),
      cooldown: Math.max(0.3, (Math.max(0.4, 1 - 0.06 * u("cooldown"))) * mul("cooldown")),
      fortressRegen: 0.8 * u("regen") + add("regen"),
      startScrap: 25 * u("scrap") + add("startScrap"),
      startGold: 12 * u("gold") + add("startGold"),
      fortressHp: 60 * u("fhp") + add("fhp"),
      costMul: mul("costMul"),
      waveFood: add("waveFood"),
      waveMeds: add("waveMeds"),
    };
    // fold this run's drafted protocols on top (they stack multiplicatively)
    if (this.protocols) {
      mergeMods(this.bonus, this.protocols.mods());
      this.protocolFlags = this.protocols.flags();
    } else {
      this.protocolFlags = { burn: 0, aoe: 0, slow: 0, slowDur: 1.4, vamp: 0, thorns: 0, boss: 0 };
    }
  }
  /* apply the current bonus bundle to every tower already on the field */
  refreshTowers() {
    for (const t of this.towers) if (!t.dead && t.recompute) t.recompute();
    if (this.synergy && this.synergy.recompute) this.synergy.recompute();
  }
  towerCost(id) {
    const def = TOWER_DEFS[id];
    return Math.round(def.cost * (this.bonus.costMul || 1));
  }
  makeDecor() {
    const rng = mulberry32(90210); const out = [];
    for (let i = 0; i < 40; i++) out.push({ x: 200 + rng() * 1030, y: 70 + rng() * 590, t: Math.floor(rng() * 4), s: 6 + rng() * 10, a: rng() * TAU });
    return out;
  }
  nextId() { return this.idCounter++; }
  /* pooled particle spawner - reuses dead particles so 500+ entities stay smooth */
  emitPfx(x, y, vx, vy, life, color, size, grav) {
    const pool = this._pfxPool || (this._pfxPool = []);
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.dead && !p.live) { p.reset(x, y, vx, vy, life, color, size, grav); p.live = true; this.particles.push(p); return p; }
    }
    if (pool.length >= 1400) return null;
    const p = new Particle(x, y, vx, vy, life, color, size, grav);
    p.live = true;
    pool.push(p);
    this.particles.push(p);
    return p;
  }
  spawnRing(x, y, color, radius) { this.effects.push(new Effect("ring", { x, y, radius, color, dur: 0.5 })); }
  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.25, speed);
      this.emitPfx(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, rand(0.3, 0.8), color, rand(2, 5), 220);
    }
  }
  hitParticles(x, y, color) { for (let i = 0; i < 3; i++) { const a = rand(0, TAU); this.emitPfx(x, y, Math.cos(a) * rand(30, 110), Math.sin(a) * rand(30, 110), 0.25, color, rand(2, 4), 60); } }
  celebration(def) {
    for (let i = 0; i < 90; i++) {
      this.emitPfx(rand(0, W), rand(-40, 160), rand(-90, 90), rand(40, 190), rand(1.2, 2.4), pick(["#57e08a", "#4aa8ff", "#ffce4a", "#ff7d9c", "#c08bff"]), rand(3, 7), 90);
    }
  }
  explode(x, y, radius, dmg, color) {
    this.effects.push(new Effect("explosion", { x, y, radius, dur: 0.5 }));
    this.audio.sfx("explode");
    this.shake = Math.max(this.shake, 0.35);
    this.burst(x, y, color || "#ffb347", 26, 320);
    for (const z of this.zombies) {
      if (z.dead) continue;
      const d = dist(x, y, z.x, z.y);
      if (d > radius + z.r) continue;
      z.hurt(dmg * (1 - 0.5 * (d / radius)), this, { src: "explosion" });
    }
    for (const t of this.towers) if (!t.dead) { const d = dist(x, y, t.x, t.y); if (d < radius * 0.4) t.hurt(dmg * 0.05); }
  }
  spawnZombie(type, lane, opts) {
    const z = new Zombie(type, lane, Math.max(1, this.waves.wave), this, opts);
    this.zombies.push(z);
    return z;
  }
  onZombieKilled(z) {
    this.run.kills++; this.state.totalKills++;
    this.killCombo++; this.killComboBest = Math.max(this.killComboBest, this.killCombo);
    this.run.combo = Math.max(this.run.combo, this.killCombo);
    const scrap = Math.round(z.scrap * this.bonus.scrapGain);
    this.addScrap(scrap);
    this.damageTexts.push(new DamageText(z.x, z.y - z.r - 18, "+" + scrap, "#8fd3ff"));
    this.effects.push(new Effect("zdeath", { x: z.x, y: z.y, r: z.r, zid: z.type, dur: z.def.boss ? 1.1 : 0.72 }));
    this.effects.push(new Effect("flash", { x: z.x, y: z.y - z.r * 0.4, radius: z.r * 0.8, color: "#e0434f", dur: 0.2 }));
    this.burst(z.x, z.y, z.def.color, z.def.boss ? 40 : 12, z.def.boss ? 340 : 170);
    if (this.meta) this.meta.codex.unlock("z_" + z.type, "Bestiary", z.def.name, "");
    if (z.def.explode) {
      const dmg = z.def.explode * (1 + this.waves.wave * 0.02);
      this.explode(z.x, z.y, 80, dmg, "#ff8a2a");
      if (this.fortress) { const d = dist(z.x, z.y, FORTRESS_X, z.y); if (d < 150) this.fortress.hurt(dmg * 0.35, this); }
      for (const t of this.towers) if (!t.dead && dist(z.x, z.y, t.x, t.y) < 80) t.hurt(dmg * 0.4);
    }
    this.audio.sfx("zeath");
    if (z.def.boss) {
      this.run.bossKills++; this.state.bossKills = (this.state.bossKills || 0) + 1;
      this.shake = Math.max(this.shake, 0.6);
      this.audio.sfx("explode");
      this.ui.toast("\u2620 Boss down! +" + scrap + " scrap", "#ffce4a");
      this.food += 10; this.meds += 8;
      this.effects.push(new Effect("ring", { x: z.x, y: z.y, radius: 260, color: "#ffce4a", dur: 0.8 }));
      if (z.type === "colossus") { this.state.stats.colossusKills = (this.state.stats.colossusKills || 0) + 1; this.unlock("colossus_slay"); }
    }
    // Splitter bursts open into a pair of runners
    if (z.def.split) {
      this.state.stats.splitterKills = (this.state.stats.splitterKills || 0) + 1;
      this.effects.push(new Effect("ring", { x: z.x, y: z.y, radius: 70, color: "#c47ad8", dur: 0.5 }));
      for (let i = 0; i < z.def.split; i++) this.spawnZombie("runner", z.lane, { x: z.x + rand(-16, 16), hpMul: 0.75 });
      if (this.state.stats.splitterKills >= 50) this.unlock("splitter_kill");
    }
    if (z.type === "healer") {
      this.state.stats.healerKills = (this.state.stats.healerKills || 0) + 1;
      if (this.state.stats.healerKills >= 50) this.unlock("healer_kill");
    }
    // Leech Protocol: each kill patches the wall
    if (this.protocolFlags && this.protocolFlags.vamp && this.fortress) this.fortress.heal(this.protocolFlags.vamp);
    this.achievements.check();
  }
  addScrap(n) { this.scrap += n; this.run.scrapEarned += n; }
  spendScrap(n) { if (this.scrap < n) return false; this.scrap -= n; return true; }
  skillUsable(s) {
    if (this.mods.noSkills) return false;
    if (s.cdLeft > 0) return false;
    const have = s.costType === "food" ? this.food : this.meds;
    return have >= s.cost;
  }
  skillCostValue(s) { return s.costType === "food" ? this.food : this.meds; }
  paySkill(s) {
    if (s.costType === "food") this.food = Math.max(0, this.food - s.cost);
    else this.meds = Math.max(0, this.meds - s.cost);
    s.cdLeft = s.cd * this.bonus.cooldown;
  }

  /* ---------------- run lifecycle ---------------- */
  startRun(mode) {
    this.audio.init(); this.audio.resume();
    this.runMode = mode || "normal";
    this.endless = this.runMode === "endless";
    this.mods = {};
    if (this.runMode === "daily" && this.daily && !this.daily.challengeDone && this.daily.today === dateKey()) {
      this.mods = Object.assign({}, this.daily.challenge.mods);
    }
    if (this.runMode === "campaign" && this.campaign && this.campaign.current) {
      this.mods = Object.assign({}, this.campaign.current.mods);
    }
    this.speed = this.state.settings.speed || 1;
    // roll run-wide variety, then fold meta + weather into the bonus bundle
    this.mutations.reset();
    this.synergy.reset();
    this.protocols.reset();
    this.overdriveT = 0;
    if (this.meta) this.meta.recompute();
    this.weather.roll();
    if (this.mods.weather) this.weather.force(this.mods.weather);
    this.computeBonus();
    const wm = this.weather.mods();
    this.bonus.dmg *= wm.dmg || 1;
    this.bonus.rate *= wm.rate || 1;
    this.bonus.range *= wm.range || 1;
    this.bonus.fortressHp += wm.fhp || 0;
    this.weatherZombieSpeed = wm.zombieSpeed || 1;
    this.mutationVuln = 1; this.mutationScrap = 1; this.mutationMultiLane = false;
    this.state.gold += this.bonus.startGold;
    this.run = { kills: 0, wavesCleared: 0, fortressHit: false, combo: 0, bossKills: 0, scrapEarned: 0, builds: 0, protocols: 0, hero: this.state.selectedHero, startTime: nowMs() };
    this.killCombo = 0; this.killComboBest = 0;
    let startScrap = 200 + this.bonus.startScrap;
    if (this.mods.startScrap) startScrap = Math.round(startScrap * this.mods.startScrap);
    if (this.mods.startScrapFlat) startScrap = this.mods.startScrapFlat;
    if (this.endless) startScrap += 300;
    this.scrap = startScrap;
    // food/meds carry over between runs, with a small per-run stipend so skills are always usable
    this.food = Math.max(this.state.food || 0, 15) + (this.endless ? 20 : 0);
    this.meds = Math.max(this.state.meds || 0, 10) + (this.endless ? 20 : 0);
    const fhp = Math.round((600 + this.bonus.fortressHp) * (this.mods.fhp || 1));
    this.fortress = new Fortress(fhp);
    this.fortress.regen = this.bonus.fortressRegen;
    this.zombies = []; this.towers = []; this.projectiles = []; this.hostile = [];
    this.particles = []; this.effects = []; this.damageTexts = [];
    if (this._pfxPool) for (const p of this._pfxPool) { p.dead = true; p.live = false; }
    this.waves.reset();
    if (this.endless) this.waves.wave = 19;
    this.waves.prepTimer = PREP_TIME;
    this.selectedTower = null; this.selectedSkill = null; this.selectedSlot = null;
    this.paused = false; this.autoPaused = false; this.screen = "play";
    this.ui.hideScreens(); this.ui.closeOverlay(); this.ui.showHud(true);
    this.lastToolbarSigReset();
    this.ui.tutorial();
    this.setMusic("menu");
    if (this.weather.def && this.weather.def.id !== "clear") {
      this.ui.toast("\u{1F327} Weather: " + this.weather.def.name + " \u2014 " + this.weather.def.ds, "#8fe4ff");
    }
    this.meta.hero.progress(this.state.selectedHero);
    this.meta.codex.unlock("p_run", "Command", "Battle Record", "Runs survive in the archive.");
    this.save();
  }
  lastToolbarSigReset() { this.ui.lastToolbarSig = ""; this.ui.lastSkillSig = ""; }
  nextWave() {
    if (this.waves.active) return;
    const bonus = Math.max(0, Math.ceil(this.waves.prepTimer) * 3);
    if (bonus > 0 && this.waves.wave > 0) { this.addScrap(bonus); this.damageTexts.push(new DamageText(150, 130, "+" + bonus + " " + T("early"), "#8fd3ff")); }
    const n = this.waves.wave + 1;
    this.mutations.roll(n);
    this.waves.startWave(n);
    this.mutations.applyToWave(n, this);
    this.setMusic("battle");
  }
  waveCleared() {
    this.waves.active = false;
    this.run.wavesCleared++;
    const n = this.waves.wave;
    const dm = (DIFFICULTIES[this.state.settings.difficulty] || DIFFICULTIES.normal).reward;
    const gold = Math.round((14 + n * 6) * dm);
    this.state.gold += gold;
    if (n % 3 === 0) this.food += 8;
    if (n % 4 === 0) this.meds += 6;
    if (this.bonus.waveFood) this.food += this.bonus.waveFood;
    if (this.bonus.waveMeds) this.meds += this.bonus.waveMeds;
    if (n > this.state.highestWave) { this.state.highestWave = n; }
    if (this.run.kills > 0 && this.killComboBest >= 50) this.unlock("combo_50");
    this.ui.toast("\u2714 Wave " + n + " cleared  \u00b7  +" + gold + " gold", "#57e08a");
    this.audio.sfx("coin");
    this.achievements.check();
    if (this.daily && this.runMode === "daily" && !this.daily.challengeDone && this.daily.runMatches(this.run)) {
      const r = this.daily.completeChallenge();
      if (r) this.ui.toast("\u{1F4C5} Daily Challenge complete! +" + r.gold + " gold, +" + r.food + " food, +" + r.meds + " meds", "#57e08a");
    }
    if (!this.endless && n >= 20) { this.state.unlockedEndless = true; }
    this.waves.prepTimer = PREP_TIME;
    this.setMusic("menu");
    this.save();
    // campaign victory: beating the mission's target wave clears the mission
    if (this.runMode === "campaign" && this.campaign && this.campaign.current && n >= this.campaign.current.target) {
      const res = this.campaign.complete();
      this.winRun(res);
      return;
    }
    // roguelite beat: the lab offers a mutation before the next wave
    if (this.protocols) this.protocols.offer();
  }
  gameOver() {
    if (this.screen !== "play") return;
    this.screen = "over";
    this.audio.sfx("lose");
    this.setMusic("gameover");
    const score = this.run.wavesCleared * 120 + this.run.kills * 2;
    const prevBest = this.state.highScore;
    this.state.highScore = Math.max(this.state.highScore, score);
    this.state.totalRuns = (this.state.totalRuns || 0) + 1;
    this.state.totalPlayTime += (nowMs() - this.run.startTime) / 1000;
    this.state.scrap = this.scrap;
    this.state.food = this.food; this.state.meds = this.meds;
    this.state.leaderboard.push({ score, wave: this.waves.wave, kills: this.run.kills, date: new Date().toISOString() });
    this.state.leaderboard.sort((a, b) => b.score - a.score);
    this.state.leaderboard = this.state.leaderboard.slice(0, 10);
    this.achievements.check();
    if (this.meta) {
      this.meta.finishRun(this.run, false);
      this.meta.season.noteRank(rankFor(this.score()).name);
    }
    this.save();
    // "one more wave" tease
    let tease;
    if (score > prevBest) tease = "\u{1F525} New personal best! You beat your old score by " + (score - prevBest) + " points \u2014 go further.";
    else if (this.waves.wave >= this.state.highestWave) tease = "\u{1F525} That ties your best wave. One more wave and you own the record!";
    else tease = "\u{1F525} You were only " + Math.max(1, this.state.highestWave - this.waves.wave) + " wave(s) from your best. One more try?";
    this.ui.showGameOver({ score, wave: this.waves.wave, kills: this.run.kills, best: this.state.highScore, tease });
  }
  /* campaign mission victory - finalise the run, then show the result card */
  winRun(res) {
    if (this.screen !== "play") return;
    this.screen = "won";
    this.audio.sfx("achievement");
    this.setMusic("menu");
    const score = this.run.wavesCleared * 120 + this.run.kills * 2;
    this.state.highScore = Math.max(this.state.highScore, score);
    this.state.totalRuns = (this.state.totalRuns || 0) + 1;
    this.state.totalWins = (this.state.totalWins || 0) + 1;
    this.state.totalPlayTime += (nowMs() - this.run.startTime) / 1000;
    this.state.scrap = this.scrap;
    this.state.food = this.food; this.state.meds = this.meds;
    this.state.leaderboard.push({ score, wave: this.waves.wave, kills: this.run.kills, date: new Date().toISOString() });
    this.state.leaderboard.sort((a, b) => b.score - a.score);
    this.state.leaderboard = this.state.leaderboard.slice(0, 10);
    if (this.meta) this.meta.finishRun(this.run, true);
    this.achievements.check();
    this.save();
    this._lastMission = res && res.mission ? res.mission.id : null;
    this.ui.missionResult(res, { score, wave: this.waves.wave, kills: this.run.kills });
  }
  /* speed control: cycle 1x -> 2x -> 3x -> 1x */
  setSpeed(v) {
    this.speed = [1, 2, 3].includes(v) ? v : 1;
    this.state.settings.speed = this.speed;
    if (this.speed >= 3) this.achievements.unlock("speed_max", true);
    this.save();
    this.ui.lastToolbarSig = "";
    this.ui.toast("\u23E9 Speed " + this.speed + "x", "#8fd3ff");
  }
  cycleSpeed() { this.setSpeed(this.speed >= 3 ? 1 : this.speed + 1); }
  nextCampaignMission() {
    if (!this._lastMission) { this.ui.campaignScreen(); return; }
    const i = this.campaign.indexOf(this._lastMission);
    const next = CAMPAIGN_MISSIONS[i + 1];
    if (next && this.campaign.isUnlocked(next.id)) this.campaign.start(next.id);
    else this.ui.campaignScreen();
  }
  quitToMenu() {
    if (this.screen === "play") {
      this.state.totalPlayTime += (nowMs() - (this.run ? this.run.startTime : nowMs())) / 1000;
      this.state.scrap = this.scrap; this.state.food = this.food; this.state.meds = this.meds;
      this.save();
    }
    this.screen = "menu"; this.paused = false; this.autoPaused = false;
    this.ui.closeOverlay(); this.ui.showHud(false); this.ui.showMenu();
    this.fortress = null;
  }
  setMusic(kind) { this.audio.init(); if (this.audio.track !== kind || !this.audio.playing) this.audio.startMusic(kind); }
  stopMusic() { this.audio.stopMusic(); }
  save() {
    this.state.version = VERSION;
    if (typeof this.food === "number") this.state.food = this.food;
    if (typeof this.meds === "number") this.state.meds = this.meds;
    SaveSystem.save(this.state);
    // rolling backup so a corrupted slot never loses everything (every 10 minutes)
    const t = nowMs();
    if (!this.lastBackup || t - this.lastBackup > 600000) { this.lastBackup = t; SaveSystem.saveBackup(this.state); }
  }
  unlock(id) { return this.achievements.unlock(id); }
  /* panels opened mid-battle auto-pause; this is the single place that
     un-pauses again so no code path can leave the game stuck paused */
  endAutoPause() {
    if (!this.autoPaused) return;
    this.autoPaused = false;
    if (this.screen === "play") {
      this.paused = false;
      this.setMusic(this.waves.active ? "battle" : "menu");
    } else {
      this.paused = false;
    }
  }

  /* ---------------- input ---------------- */
  setupStage() {
    const stage = document.getElementById("stage");
    this.stageEl = stage;
    const fit = () => {
      const s = Math.min(window.innerWidth / W, window.innerHeight / H);
      stage.style.transform = `scale(${s})`;
      stage.style.left = Math.max(0, (window.innerWidth - W * s) / 2) + "px";
      stage.style.top = Math.max(0, (window.innerHeight - H * s) / 2) + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", () => setTimeout(fit, 200));
  }
  stageRect() {
    const r = this.stageEl.getBoundingClientRect();
    return { left: r.left, top: r.top, scale: r.width / W };
  }
  toField(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
  }
  bindInput() {
    const unlockAudio = () => { this.audio.init(); this.audio.resume(); };
    window.addEventListener("pointerdown", unlockAudio, { once: false });
    window.addEventListener("keydown", () => this.audio.init(), { once: true });

    this.canvas.addEventListener("pointermove", (e) => {
      const p = this.toField(e.clientX, e.clientY);
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.on = 1;
    });
    this.canvas.addEventListener("pointerleave", () => { this.mouse.on = 0; });
    this.canvas.addEventListener("pointerdown", (e) => {
      const p = this.toField(e.clientX, e.clientY);
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (this.screen === "play" && !this.paused) this.fieldClick(p.x, p.y);
    });

    // delegated UI clicks
    document.getElementById("stage").addEventListener("click", (e) => {
      const el = e.target.closest("[data-action],[data-tower],[data-skill],[data-tip]");
      if (!el) return;
      this.audio.init();
      if (el.dataset.tower) { this.onTowerCard(el.dataset.tower); return; }
      if (el.dataset.skill) { this.onSkillCard(el.dataset.skill); return; }
      if (el.dataset.action) this.action(el.dataset.action, el.dataset);
    });
    // tooltips
    const stage = document.getElementById("stage");
    stage.addEventListener("mousemove", (e) => {
      const el = e.target.closest("[data-tip]");
      if (el) this.ui.showTip(el, el.dataset.tip); else this.ui.hideTip();
    });
    stage.addEventListener("mouseleave", () => this.ui.hideTip());

    document.addEventListener("keydown", (e) => this.onKey(e));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.save();
        if (this.screen === "play" && !this.paused) {
          this.paused = true;
          this.ui.pause();
          this.setMusic("menu");
        }
      }
    });
    window.addEventListener("beforeunload", () => this.save());
  }
  onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "escape") {
      if (this.ui.el.overlay.innerHTML) {
        this.ui.closeOverlay();
        if (this.autoPaused) this.endAutoPause();
        else if (this.screen === "play" && this.paused) { this.paused = false; this.setMusic(this.waves.active ? "battle" : "menu"); }
        this.selectedTower = null; this.selectedSkill = null; this.selectedSlot = null;
      } else if (this.screen === "play") {
        this.selectedTower = null; this.selectedSkill = null; this.selectedSlot = null;
      }
      return;
    }
    if (this.screen === "play") {
      if (k === "p") { this.paused = !this.paused; this.autoPaused = false; this.paused ? this.ui.pause() : this.ui.closeOverlay(); this.setMusic(this.paused ? "menu" : (this.waves.active ? "battle" : "menu")); }
      if (k === "t") this.cycleSpeed();
      if (this.paused) return;
      if (k === " ") { e.preventDefault(); this.nextWave(); }
      if (k === "q") this.onSkillCard("airstrike");
      if (k === "w") this.onSkillCard("freeze");
      if (k === "e") this.onSkillCard("repair");
      if (k === "r") this.onSkillCard("overdrive");
      const n = parseInt(k, 10);
      if (n >= 1 && n <= TOWER_IDS.length) this.onTowerCard(TOWER_IDS[n - 1]);
    } else if (this.screen === "over" && k === " ") {
      if (this.ui.el.overlay.innerHTML) { this.ui.closeOverlay(); return; }
      e.preventDefault(); this.startRun(this.runMode || "normal");
    }
  }
  onTowerCard(id) {
    if (this.screen !== "play" || this.paused) return;
    const def = TOWER_DEFS[id];
    if (!this.state.unlockedTowers.includes(id)) { this.audio.sfx("error"); this.ui.toast("\u{1F512} " + def.name + " is locked \u2014 unlock it in Collection for " + def.unlockCost + " gold.", "#ffb347"); return; }
    if (this.mods.towers && !this.mods.towers.includes(id)) { this.audio.sfx("error"); this.ui.toast("\u{1F4C5} Daily challenge restricts towers to: " + this.mods.towers.map((t) => TOWER_DEFS[t].name).join(", "), "#ffb347"); return; }
    this.audio.sfx("click");
    this.selectedSkill = null;
    this.selectedTower = this.selectedTower === id ? null : id;
    this.ui.lastToolbarSig = "";
  }
  onSkillCard(id) {
    if (this.screen !== "play" || this.paused) return;
    const s = this.skills.find((x) => x.id === id);
    if (!s) return;
    if (!this.skillUsable(s)) { this.audio.sfx("error"); this.ui.toast(this.mods.noSkills ? "\u{1F4C5} Skills are disabled in today's challenge." : "\u23F3 " + s.name + " is on cooldown or you lack " + (s.costType === "food" ? "food" : "meds") + ".", "#ffb347"); return; }
    this.audio.sfx("click");
    if (id === "freeze") this.doFreeze();
    else if (id === "repair") this.doRepair();
    else if (id === "overdrive") this.doOverdrive();
    else { this.selectedTower = null; this.selectedSkill = this.selectedSkill === id ? null : id; }
    this.ui.lastSkillSig = "";
  }
  findSlot(x, y) {
    for (let r = 0; r < SLOT_ROWS.length; r++) for (let c = 0; c < SLOT_COLS.length; c++) {
      if (Math.abs(x - SLOT_COLS[c]) < 48 && Math.abs(y - SLOT_ROWS[r]) < 46) return { r, c };
    }
    return null;
  }
  towerAt(r, c) { return this.towers.find((t) => !t.dead && t.row === r && t.col === c); }
  fieldClick(x, y) {
    if (this.selectedSkill === "airstrike") { this.doAirstrike(x, y); return; }
    const slot = this.findSlot(x, y);
    if (!slot) { this.selectedSlot = null; return; }
    const existing = this.towerAt(slot.r, slot.c);
    if (existing) {
      this.selectedSlot = existing;
      this.selectedTower = null; this.selectedSkill = null;
      if (!this.paused) { this.paused = true; this.autoPaused = true; this.setMusic("menu"); }
      this.ui.towerPanel(existing);
      return;
    }
    if (this.selectedTower) this.build(this.selectedTower, slot.r, slot.c);
    else { this.selectedSlot = null; this.ui.toast("Pick a tower from the bar below first.", "#8fa2c0"); }
  }
  build(id, r, c) {
    const def = TOWER_DEFS[id];
    if (!this.state.unlockedTowers.includes(id)) return;
    const cost = this.towerCost(id);
    if (this.scrap < cost) { this.audio.sfx("error"); this.ui.toast("\u26A0 Not enough scrap (need " + cost + ").", "#ffb347"); return; }
    this.spendScrap(cost);
    const t = new Tower(this, id, r, c);
    this.towers.push(t);
    this.audio.sfx("build");
    this.spawnRing(t.x, t.y, def.color, 52);
    this.burst(t.x, t.y, def.color, 10, 130);
    if (this.run) this.run.builds = (this.run.builds || 0) + 1;
    this.state.stats.towerUse[id] = (this.state.stats.towerUse[id] || 0) + 1;
    if (this.meta) this.meta.codex.unlock("t_" + id, "Arsenal", def.name, def.desc);
    if (this.synergy) this.synergy.recompute();
    if (this.scrap < cost) this.selectedTower = null;
  }
  doAirstrike(x, y) {
    const s = this.skills.find((v) => v.id === "airstrike");
    if (!this.skillUsable(s)) return;
    this.paySkill(s);
    this.explode(x, y, 220, 220, "#ffb347");
    this.damageTexts.push(new DamageText(x, y - 20, T("AIRSTRIKE!"), "#ffce4a"));
    this.selectedSkill = null;
  }
  doFreeze() {
    const s = this.skills.find((v) => v.id === "freeze");
    if (!this.skillUsable(s)) return;
    this.paySkill(s);
    this.audio.sfx("freeze");
    for (const z of this.zombies) z.frozenT = Math.max(z.frozenT, 3);
    this.effects.push(new Effect("ring", { x: W / 2, y: H / 2, radius: 0, color: "#8fe4ff", dur: 0.6 }));
    for (let i = 0; i < 60; i++) this.emitPfx(rand(0, W), rand(0, H), 0, rand(-40, 40), rand(0.4, 1), "#bff0ff", rand(2, 5), 0);
    this.ui.toast("\u2744 Everything on the field is frozen!", "#8fe4ff");
  }
  doRepair() {
    const s = this.skills.find((v) => v.id === "repair");
    if (!this.skillUsable(s)) return;
    this.paySkill(s);
    this.audio.sfx("repair");
    this.fortress.heal(this.fortress.maxHp * 0.35);
    this.effects.push(new Effect("ring", { x: FIELD_LEFT / 2, y: H / 2, radius: 120, color: "#57e08a", dur: 0.6 }));
    for (let i = 0; i < 30; i++) this.emitPfx(rand(10, FIELD_LEFT - 10), rand(120, H - 120), rand(-20, 20), rand(-80, -20), 0.8, "#9dffcf", rand(3, 6), -30);
    this.ui.toast("\u{1F6E0} Fortress repaired", "#57e08a");
  }
  doOverdrive() {
    const s = this.skills.find((v) => v.id === "overdrive");
    if (!this.skillUsable(s)) return;
    this.paySkill(s);
    this.overdriveT = 8;
    this.audio.sfx("upgrade");
    this.effects.push(new Effect("ring", { x: W / 2, y: H / 2, radius: 0, color: "#ffce4a", dur: 0.6 }));
    for (let i = 0; i < 40; i++) this.emitPfx(rand(FIELD_LEFT, W), rand(80, H - 60), rand(-30, 30), -rand(40, 140), rand(0.4, 1), pick(["#ffce4a", "#ff9b4a", "#fff2a0"]), rand(2, 5), -10);
    this.unlock("overdrive");
    this.ui.toast("\u{1F680} OVERDRIVE \u2014 all towers overclocked for 8s!", "#ffce4a");
  }

  action(name, data) {
    const st = this.state;
    // opening any informational panel during a run pauses the battle so nothing sneaks past
    if (["shop", "collection", "achievements", "leaderboard", "settings", "help", "daily", "codex", "quests", "camp", "research", "heroes", "relics", "battlepass", "prestige", "season", "protocols"].indexOf(name) >= 0) {
      if (this.screen === "play" && !this.paused) {
        this.paused = true; this.autoPaused = true; this.setMusic("menu");
      }
    }
    if (name === "close") {
      this.ui.closeOverlay();
      if (this.autoPaused) { this.endAutoPause(); }
      else if (this.screen === "play" && this.paused) { this.paused = false; this.setMusic(this.waves.active ? "battle" : "menu"); }
      return;
    }
    switch (name) {
      case "play": this.startRun("normal"); break;
      case "endless": this.startRun("endless"); break;
      case "campaign": this.ui.campaignScreen(); break;
      case "startmission":
        if (this.campaign.start(data.id)) { this.audio.sfx("click"); this.ui.closeOverlay(); }
        else { this.audio.sfx("error"); }
        break;
      case "nextmission": this.nextCampaignMission(); break;
      case "replaymission": if (this._lastMission) this.campaign.start(this._lastMission); break;
      case "speed": this.cycleSpeed(); break;
      case "pickspec": {
        const t = this.selectedSlot;
        if (t && this.towers.includes(t) && !t.dead && t.pickSpec(data.id)) {
          this.state.stats.specs = (this.state.stats.specs || 0) + 1;
          if (t.specTier >= 2) this.state.stats.masters = (this.state.stats.masters || 0) + 1;
          this.audio.sfx("upgrade");
          this.spawnRing(t.x, t.y, "#8fd3ff", 60);
          if (this.synergy) this.synergy.recompute();
          this.refreshTowers();
          this.achievements.check();
          this.save();
          this.ui.towerPanel(t);
        } else { this.audio.sfx("error"); }
        break;
      }
      case "daily": this.ui.dailyScreen(); break;
      case "startdaily": this.startRun("daily"); break;
      case "retry": this.startRun(this.runMode || "normal"); break;
      case "menu": this.quitToMenu(); break;
      case "nextwave": this.nextWave(); break;
      case "pause": if (this.screen === "play") { this.paused = true; this.ui.pause(); this.setMusic("menu"); } break;
      case "resume": this.paused = false; this.autoPaused = false; this.ui.closeOverlay(); this.setMusic(this.waves.active ? "battle" : "menu"); break;
      case "quit": this.quitToMenu(); break;
      case "shop": this.ui.shop(); break;
      case "collection": this.ui.collection(); break;
      case "achievements": this.ui.achievements(); break;
      case "leaderboard": this.ui.leaderboard(); break;
      case "settings": this.ui.settings(); break;
      case "help": this.ui.help(); break;
      case "donate":
        try { window.open(DONATE_URL, "_blank", "noopener"); } catch (e) {}
        this.ui.toast("\u2764 Thank you for supporting the fortress!", "#ff7d9c");
        break;
      case "togglemusic": this.audio.setMusic(!st.settings.musicOn); SaveSystem.save(st); this.ui.syncMute(); if (st.settings.musicOn && this.screen === "menu") this.setMusic("menu"); this.ui.buildMenu(); break;
      case "togglesfx": this.audio.setSFX(!st.settings.soundOn); SaveSystem.save(st); this.ui.syncMute(); if (st.settings.soundOn) this.audio.sfx("click"); this.ui.buildMenu(); break;
      case "setdiff": st.settings.difficulty = data.v; SaveSystem.save(st); this.ui.settings(); break;
      case "setlang":
        st.settings.lang = data.v === "vi" ? "vi" : "en";
        I18N.setLang(st.settings.lang);
        SaveSystem.save(st);
        this.ui.buildMenu(); this.ui.settings();
        this.ui.toast(st.settings.lang === "vi" ? "Đã chuyển sang Tiếng Việt" : "Switched to English", "#4aa8ff");
        break;
      case "resetprogress":
        if (window.confirm("Erase all progress? Gold, unlocks, achievements and records will be deleted. This cannot be undone.")) {
          SaveSystem.wipe(); this.state = SaveSystem.load(); this.audio.state = this.state;
          this.food = this.state.food; this.meds = this.state.meds;
          this.daily = new DailyRewardSystem(this);
          this.meta = new MetaProgressionManager(this);
          this.mutations = new MutationSystem(this);
          this.weather = new WeatherSystem(this);
          this.synergy = new SynergySystem(this);
          this.protocols = new ProtocolSystem(this);
          this.overdriveT = 0;
          this.computeBonus(); this.ui.closeOverlay(); this.ui.showMenu(); this.quitToMenu();
        }
        break;
      case "claimdaily": {
        const r = this.daily.claim();
        if (r) { this.ui.toast("\u{1F381} Day " + r.streak + " reward: +" + r.gold + " gold, +" + r.scrap + " scrap, +" + r.meds + " meds", "#ffce4a"); this.ui.buildMenu(); }
        break;
      }
      case "buyupgrade": {
        const u = UPGRADES.find((x) => x.id === data.id);
        if (!u) break;
        const lvl = st.permanentUpgrades[u.id] || 0;
        if (lvl >= u.max) break;
        const cost = u.cost(lvl);
        if (st.gold < cost) { this.audio.sfx("error"); break; }
        st.gold -= cost; st.permanentUpgrades[u.id] = lvl + 1;
        this.audio.sfx("upgrade"); this.computeBonus(); SaveSystem.save(st);
        this.ui.toast("\u2b06 " + u.name + " \u2192 Lv " + (lvl + 1), "#57e08a");
        this.ui.shop(); this.achievements.check();
        break;
      }
      case "unlocktower": {
        const def = TOWER_DEFS[data.id];
        if (!def || st.unlockedTowers.includes(data.id)) break;
        if (st.gold < def.unlockCost) { this.audio.sfx("error"); break; }
        st.gold -= def.unlockCost; st.unlockedTowers.push(data.id);
        this.audio.sfx("upgrade"); SaveSystem.save(st);
        this.ui.toast("\u{1F513} " + def.name + " unlocked!", "#57e08a");
        this.ui.collection(); this.achievements.check();
        break;
      }
      case "upgradetower": {
        const t = this.selectedSlot;
        if (t && this.towers.includes(t) && !t.dead) { if (t.upgrade()) this.ui.towerPanel(t); }
        break;
      }
      case "selltower": {
        const t = this.selectedSlot;
        if (t && this.towers.includes(t) && !t.dead) {
          this.addScrap(t.sellValue()); t.dead = true; this.selectedSlot = null;
          this.audio.sfx("sell"); this.ui.closeOverlay();
          this.burst(t.x, t.y, "#b9a06a", 12, 150);
          if (this.synergy) this.synergy.recompute();
          this.endAutoPause();
        }
        break;
      }
      /* ---- v3 meta screens ---- */
      case "codex": this.ui.codexScreen(); break;
      case "codexcat": this.ui._codexCat = data.v; this.ui.codexScreen(); break;
      case "protocols": this.ui.protocolsScreen(); break;
      case "pickproto": this.protocols.pick(data.id); break;
      case "skipdraft":
        this.protocols.pending = 0;
        this.ui.closeOverlay();
        this.endAutoPause();
        this.ui.toast("\u{1F9EC} Skipped the mutation.", "#8fa2c0");
        break;
      case "toggledraft": st.settings.draft = !st.settings.draft; SaveSystem.save(st); this.ui.settings(); break;
      case "quests": this.ui.questsScreen(); break;
      case "camp": this.ui.campScreen(); break;
      case "research": this.ui.researchScreen(); break;
      case "heroes": this.ui.heroScreen(); break;
      case "relics": this.ui.relicScreen(); break;
      case "battlepass": this.ui.passScreen(); break;
      case "prestige": this.ui.prestigeScreen(); break;
      case "season": this.ui.seasonScreen(); break;
      case "selecthero":
        this.meta.hero.select(data.id);
        this.computeBonus(); SaveSystem.save(this.state);
        this.ui.toast("\u{1F9D1} Hero: " + HERO_DEFS[data.id].name, HERO_DEFS[data.id].color);
        this.ui.heroScreen();
        break;
      case "unlockhero":
        if (this.meta.hero.unlock(data.id)) { this.audio.sfx("upgrade"); this.ui.toast("\u{1F513} " + HERO_DEFS[data.id].name + " recruited!", "#57e08a"); }
        else this.audio.sfx("error");
        this.ui.heroScreen();
        break;
      case "buyresearch":
        if (this.meta.research.buy(data.id)) this.ui.toast("\u{1F9EA} Researched " + RESEARCH_NODES[data.id].name, "#4aa8ff");
        else this.audio.sfx("error");
        this.meta.recompute(); this.computeBonus();
        this.ui.researchScreen();
        break;
      case "buildcamp":
        if (this.meta.camp.build(data.id)) this.ui.toast("\u{1F3D7} " + CAMP_BUILDINGS[data.id].name + " upgraded", "#57e08a");
        else this.audio.sfx("error");
        this.meta.recompute(); this.computeBonus();
        this.ui.campScreen();
        break;
      case "collectcamp": {
        const gain = this.meta.camp.collectIdle(nowMs());
        if (gain) this.ui.toast("\u{1F4E6} Collected " + Object.keys(gain).map((k) => "+" + gain[k] + " " + k).join(", "), "#ffce4a");
        else this.ui.toast("Nothing to collect yet \u2014 come back later.", "#8fa2c0");
        this.ui.campScreen();
        break;
      }
      case "recruit":
        if (this.meta.survivors.recruit(data.id)) { this.audio.sfx("upgrade"); this.ui.toast("\u{1F464} " + SURVIVOR_DEFS[data.id].name + " joined the fortress!", "#57e08a"); }
        else this.audio.sfx("error");
        this.meta.recompute(); this.computeBonus();
        this.ui.campScreen();
        break;
      case "equiprelic":
        this.meta.relics.toggleEquip(data.id);
        this.meta.recompute(); this.computeBonus();
        this.ui.relicScreen();
        break;
      case "claimpass":
        if (this.meta.pass.claim(parseInt(data.id, 10))) this.audio.sfx("coin");
        else this.audio.sfx("error");
        this.ui.passScreen();
        break;
      case "buyprestige":
        if (this.meta.prestige.buy(data.id)) { this.audio.sfx("upgrade"); this.ui.toast("\u2699 Prestige perk unlocked", "#c08bff"); }
        else this.audio.sfx("error");
        this.meta.recompute(); this.computeBonus();
        this.ui.prestigeScreen();
        break;
      case "doprestige":
        if (!this.meta.prestige.canPrestige()) { this.audio.sfx("error"); this.ui.toast("Reach wave 20 before prestiging.", "#ffb347"); break; }
        if (window.confirm("Prestige now? Gold, shop upgrades, research and camp levels reset, but you gain " + this.meta.prestige.pointsFor() + " prestige points and permanent perks. Relics, heroes and achievements are kept.")) {
          const gain = this.meta.prestige.prestige();
          this.computeBonus();
          this.ui.toast("\u2b50 Prestiged! +" + gain + " prestige points", "#c08bff");
          this.ui.prestigeScreen();
        }
        break;
      case "rotseason":
        this.meta.season.rotate();
        this.ui.toast("\u{1F311} Season rotated", "#4aa8ff");
        this.ui.seasonScreen();
        break;
    }
  }
}
