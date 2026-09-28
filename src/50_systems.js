/* ---------------------------------------------------------------------
   WAVEMANAGER - builds and spawns each wave
   --------------------------------------------------------------------- */
class WaveManager {
  constructor(game) { this.game = game; this.reset(); }
  reset() {
    this.active = false; this.wave = 0;
    this.queue = []; this.spawnTimer = 0; this.interval = 0.9;
    this.spawned = 0; this.total = 0; this.bossWave = false; this.prepTimer = 0;
  }
  isBossWave(n) { return n % 5 === 0 || (this.game.mods.bossEvery && n % this.game.mods.bossEvery === 0); }

  buildQueue(n) {
    const diff = DIFFICULTIES[this.game.state.settings.difficulty] || DIFFICULTIES.normal;
    let count = Math.max(3, Math.round((3 + n * 1.7) * diff.count));
    const mut = this.game.mutations ? this.game.mutations.current.mod || {} : {};
    if (mut.count) count = Math.max(3, Math.round(count * mut.count));
    const pool = [];
    pool.push(["walker", 1]);
    if (n >= 3) pool.push(["runner", Math.min(0.75, 0.15 + n * 0.035)]);
    if (n >= 5) pool.push(["tank", Math.min(0.5, 0.06 + n * 0.022)]);
    if (n >= 7) pool.push(["spitter", Math.min(0.42, 0.05 + n * 0.02)]);
    if (n >= 9) pool.push(["screamer", Math.min(0.28, 0.03 + n * 0.014)]);
    if (n >= 4) pool.push(["crawler", Math.min(0.4, 0.06 + n * 0.02)]);
    if (n >= 6) pool.push(["bomber", Math.min(0.3, 0.04 + n * 0.016)]);
    if (n >= 8) pool.push(["brute", Math.min(0.34, 0.03 + n * 0.018)]);
    if (n >= 11) pool.push(["shield", Math.min(0.3, 0.03 + n * 0.016)]);
    if (n >= 6) pool.push(["healer", Math.min(0.26, 0.02 + n * 0.014)]);
    if (n >= 7) pool.push(["splitter", Math.min(0.3, 0.03 + n * 0.016)]);
    const list = [];
    for (let i = 0; i < count; i++) {
      let r = Math.random(), acc = 0, type = "walker";
      const totalW = pool.reduce((s, p) => s + p[1], 0);
      for (const [id, w] of pool) { acc += w / totalW; if (r <= acc) { type = id; break; } }
      list.push(type);
    }
    this.bossWave = this.isBossWave(n);
    const bossType = (n >= 10 && n % 10 === 0) ? "colossus" : "boss";
    if (this.bossWave) { list.length = Math.max(3, Math.round(list.length * 0.7)); list.push(bossType); }
    if (mut.elite && !this.bossWave) { list.push("brute"); }
    // shuffle but keep the boss at the end
    if (this.bossWave) { list.pop(); list.sort(() => Math.random() - 0.5); list.push(bossType); }
    else list.sort(() => Math.random() - 0.5);
    return list;
  }
  startWave(n) {
    this.wave = n;
    this.queue = this.buildQueue(n);
    this.total = this.queue.length; this.spawned = 0;
    this.interval = Math.max(0.20, 0.72 - n * 0.010);
    this.spawnTimer = 0.3;
    this.active = true;
    this.game.waveHpMul = (1 + 0.17 * (n - 1) + 0.0045 * (n - 1) * (n - 1)) * (DIFFICULTIES[this.game.state.settings.difficulty] || DIFFICULTIES.normal).hp * (this.game.mods.zombieHp || 1);
    this.game.waveSpeedMul = Math.min(1.9, 1 + 0.013 * (n - 1)) * (DIFFICULTIES[this.game.state.settings.difficulty] || DIFFICULTIES.normal).speed;
    this.game.waveDmgMul = 1 + 0.045 * (n - 1);
    this.game.audio.sfx("wave");
    if (this.bossWave) { this.game.audio.sfx("boss"); this.game.ui.toast("\u2620 A BOSS APPROACHES", "#ff8093"); }
  }
  update(dt) {
    if (!this.active) return;
    if (this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.interval * rand(0.72, 1.28);
        const type = this.queue.shift();
        const lane = randInt(0, LANES.length - 1);
        this.game.spawnZombie(type, lane);
        if (this.game.mutationMultiLane && Math.random() < 0.6) {
          const other = (lane + randInt(1, LANES.length - 1)) % LANES.length;
          this.game.spawnZombie("walker", other, { hpMul: 0.7 });
        }
        this.spawned++;
      }
    }
  }
  get doneSpawning() { return this.active && this.queue.length === 0; }
}

/* ---------------------------------------------------------------------
   ACHIEVEMENTSYSTEM
   --------------------------------------------------------------------- */
class AchievementSystem {
  constructor(game) { this.game = game; }
  has(id) { return this.game.state.achievements.some((a) => a.id === id); }
  unlock(id, silent) {
    if (this.has(id)) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    this.game.state.achievements.push({ id, unlocked: true, date: new Date().toISOString() });
    this.game.save();
    if (!silent) {
      this.game.audio.sfx("achievement");
      this.game.ui.toast("\u{1F3C6} " + def.name + " \u2014 " + def.ds, "#ffce4a");
      this.game.celebration(def);
    }
    return true;
  }
  check() {
    const g = this.game, st = g.state, run = g.run;
    if (!st) return;
    if (st.totalKills >= 1) this.unlock("first_blood");
    if (st.totalKills >= 100) this.unlock("kills_100");
    if (st.totalKills >= 1000) this.unlock("kills_1000");
    if (st.totalKills >= 10000) this.unlock("kills_10000");
    if (st.highestWave >= 5) this.unlock("wave_5");
    if (st.highestWave >= 10) this.unlock("wave_10");
    if (st.highestWave >= 20) this.unlock("wave_20");
    if (st.highestWave >= 30) this.unlock("endless_30");
    if (st.unlockedTowers.length >= TOWER_IDS.length) this.unlock("all_towers");
    if (["mortar", "cryo", "laser"].every((t) => st.unlockedTowers.indexOf(t) >= 0)) this.unlock("arsenal_v4");
    if ((run && run.bossKills >= 1) || st.bossKills) this.unlock("boss_slay");
    if (run && run.wavesCleared >= 10 && !run.fortressHit) this.unlock("flawless_10");
    if (run && run.combo >= 50) this.unlock("combo_50");
    if (rankFor(g.score()).name === "Legend" || RANKS.indexOf(rankFor(g.score())) >= 3) this.unlock("rank_legend");
    if (st.dailyChallengeCompleted === dateKey()) this.unlock("daily_done");
    if (st.dailyStreak >= 7) this.unlock("streak_7");
    if (st.gold >= 1000) this.unlock("rich");
  }
}

/* ---------------------------------------------------------------------
   DAILYREWARDSYSTEM - streak bonus + a seeded challenge of the day
   --------------------------------------------------------------------- */
function yesterdayKey() {
  const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d);
}
class DailyRewardSystem {
  constructor(game) { this.game = game; this.refresh(); }
  refresh() {
    const st = this.game.state;
    const today = dateKey();
    this.today = today;
    if (st.lastPlayedDate !== today) {
      st.dailyStreak = st.lastPlayedDate === yesterdayKey() ? (st.dailyStreak || 0) + 1 : 1;
      st.lastPlayedDate = today;
      this.game.save();
    }
    this.challenge = dailyChallengeFor(today);
    this.challengeDone = st.dailyChallengeCompleted === today;
    this.rewardAvailable = st.dailyRewardClaimedDate !== today;
    this.streak = st.dailyStreak || 1;
  }
  claim() {
    if (!this.rewardAvailable) return null;
    const st = this.game.state;
    const gold = 30 + this.streak * 12;
    const scrap = 60 + this.streak * 25;
    const meds = 5 + Math.floor(this.streak / 2);
    st.gold += gold; st.scrap += scrap; st.meds += meds;
    st.dailyRewardClaimedDate = this.today;
    this.rewardAvailable = false;
    this.game.save();
    this.game.audio.sfx("coin");
    return { gold, scrap, meds, streak: this.streak };
  }
  completeChallenge() {
    if (this.challengeDone) return null;
    const st = this.game.state;
    st.dailyChallengeCompleted = this.today;
    this.challengeDone = true;
    const reward = { gold: 150, meds: 15, food: 20 };
    st.gold += reward.gold; st.food += reward.food; st.meds += reward.meds;
    this.game.save();
    this.game.audio.sfx("achievement");
    return reward;
  }
  // returns true when the active run satisfies the daily challenge target
  runMatches(run) {
    return run && run.wavesCleared >= this.challenge.target;
  }
}
