/* =====================================================================
   v6 JOURNEY SYSTEMS - commander level, daily board, bounties, collection.
   One manager fans gameplay events out to the daily board and bounties.
   ===================================================================== */
const STAT_MAX = { combo: 1, towerCount: 1, noHitStreak: 1 };

class CommanderSystem {
  constructor(game) { this.game = game; }
  get c() { return this.game.state.commander; }
  xpFor(level) { return commanderXpFor(level); }
  title() { return commanderTitle(this.c.level); }
  pct() { const need = commanderXpFor(this.c.level); return need > 0 ? clamp(this.c.xp / need, 0, 1) : 0; }
  _add(n, live) {
    n = Math.max(0, Math.round(n));
    if (!n || !this.c) return 0;
    this.c.xp += n; this.c.totalXp += n;
    let ups = 0;
    while (this.c.xp >= commanderXpFor(this.c.level)) { this.c.xp -= commanderXpFor(this.c.level); this.c.level++; ups++; }
    if (ups > 0) {
      this.game.ui.toast("\u2b06 Commander level " + this.c.level + "! Reward ready in the Command Center.", "#ffce4a");
      if (this.game.onCommanderLevel) this.game.onCommanderLevel(this.c.level);
      this.game.save();
    } else if (!live) this.game.save();
    return ups;
  }
  addXp(n) { return this._add(n, false); }
  addLiveXp(n) { return this._add(n, true); }
  pending() { const out = []; for (let l = 1; l <= this.c.level; l++) if (this.c.claimed.indexOf(l) < 0) out.push(l); return out; }
  pendingCount() { return this.pending().length; }
  claim(level) {
    if (this.c.claimed.indexOf(level) >= 0 || level > this.c.level) return null;
    const r = commanderReward(level);
    const got = grantQuestReward(this.game, r);
    if (r.relic) this.game.meta.relics.grantRandom();
    this.c.claimed.push(level);
    this.game.audio.sfx("achievement");
    this.game.save();
    return { level, got, r };
  }
  claimAll() {
    const out = this.pending().slice(0, 20);
    for (const l of out) this.claim(l);
    return out.length;
  }
}

class DailyBoardSystem {
  constructor(game) { this.game = game; }
  refresh() {
    const st = this.game.state, today = dateKey();
    if (st.dailyBoard.date === today && st.dailyBoard.tasks.length) return;
    const pool = DAILY_MISSIONS.slice();
    const tasks = [];
    while (tasks.length < 3 && pool.length) tasks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    st.dailyBoard.date = today;
    st.dailyBoard.tasks = tasks.map((m) => ({ id: m.id }));
    st.dailyBoard.claimed = []; st.dailyBoard.chestClaimed = false; st.dailyBoard.counters = {};
    this.game.save();
  }
  tasks() { return (this.game.state.dailyBoard.tasks || []).map((t) => DAILY_MISSIONS.find((m) => m.id === t.id)).filter(Boolean); }
  progress(id) { return this.game.state.dailyBoard.counters[id] || 0; }
  isDone(id) { const m = DAILY_MISSIONS.find((x) => x.id === id); return !!m && this.progress(id) >= m.target; }
  isClaimed(id) { return this.game.state.dailyBoard.claimed.indexOf(id) >= 0; }
  add(stat, amount) {
    const db = this.game.state.dailyBoard;
    for (const m of this.tasks()) {
      if (m.stat !== stat) continue;
      const cur = db.counters[m.id] || 0;
      db.counters[m.id] = STAT_MAX[stat] ? Math.max(cur, amount) : cur + amount;
    }
  }
  completedCount() { return this.tasks().filter((m) => this.isDone(m.id)).length; }
  claimTask(id) {
    if (!this.isDone(id) || this.isClaimed(id)) return null;
    const m = DAILY_MISSIONS.find((x) => x.id === id);
    this.game.state.dailyBoard.claimed.push(id);
    const got = grantQuestReward(this.game, m.reward);
    this.game.audio.sfx("coin");
    this.game.save();
    return { m, got };
  }
  canClaimChest() { return this.tasks().length > 0 && this.completedCount() >= this.tasks().length && !this.game.state.dailyBoard.chestClaimed; }
  claimChest() {
    if (!this.canClaimChest()) return null;
    this.game.state.dailyBoard.chestClaimed = true;
    const got = grantQuestReward(this.game, DAILY_CHEST);
    this.game.audio.sfx("achievement");
    this.game.save();
    return got;
  }
}

class BountySystem {
  constructor(game) { this.game = game; this.active = []; this.done = []; }
  roll() {
    const pool = BOUNTIES.slice(); const out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    this.active = out.map((b) => ({ id: b.id, progress: 0, done: false, stat: b.stat, max: !!STAT_MAX[b.stat], target: b.target }));
    this.done = [];
    if (this.game.ui) this.game.ui.toast("\u{1F3AF} 3 bounties posted for this run \u2014 see the pause menu.", "#8fd3ff");
  }
  def(id) { return BOUNTIES.find((b) => b.id === id); }
  event(stat, amount) {
    if (!this.active.length) return;
    for (const b of this.active) {
      if (b.done || b.stat !== stat) continue;
      b.progress = b.max ? Math.max(b.progress, amount) : b.progress + amount;
      if (b.progress >= b.target) { b.done = true; this.complete(b); }
    }
  }
  complete(b) {
    const d = this.def(b.id);
    const got = grantQuestReward(this.game, d.reward);
    this.game.state.stats.bountiesClaimed = (this.game.state.stats.bountiesClaimed || 0) + 1;
    if (this.game.journey) this.game.journey.commander.addLiveXp(BOUNTY_XP);
    this.done.push(b.id);
    this.game.audio.sfx("achievement");
    this.game.ui.toast("\u{1F3AF} Bounty complete: " + d.name + " (" + got.join(", ") + ")", "#ffce4a");
  }
  all() { return this.active; }
  remaining() { return this.active.filter((b) => !b.done).length; }
  progressText(b) { return Math.min(b.progress, b.target) + "/" + b.target; }
}

class CollectionSystem {
  constructor(game) { this.game = game; }
  claimed() { return this.game.state.collectionClaimed || []; }
  list() {
    return COLLECTION_MILESTONES.map((m) => ({ def: m, done: !!m.check(this.game.state), claimed: this.claimed().indexOf(m.id) >= 0 }));
  }
  canClaim(id) { const m = COLLECTION_MILESTONES.find((x) => x.id === id); return !!m && m.check(this.game.state) && this.claimed().indexOf(id) < 0; }
  claimableCount() { return COLLECTION_MILESTONES.filter((m) => this.canClaim(m.id)).length; }
  claim(id) {
    if (!this.canClaim(id)) return null;
    const m = COLLECTION_MILESTONES.find((x) => x.id === id);
    this.game.state.collectionClaimed.push(id);
    const got = grantQuestReward(this.game, m.reward);
    if (m.reward.relic) this.game.meta.relics.grantRandom();
    this.game.audio.sfx("achievement");
    this.game.save();
    return got;
  }
  /* how many milestones are complete, for the dashboard */
  doneCount() { return COLLECTION_MILESTONES.filter((m) => m.check(this.game.state)).length; }
  total() { return COLLECTION_MILESTONES.length; }
}

class JourneyManager {
  constructor(game) {
    this.game = game;
    this.commander = new CommanderSystem(game);
    this.daily = new DailyBoardSystem(game);
    this.bounties = new BountySystem(game);
    this.collection = new CollectionSystem(game);
    this.starter = new StarterSystem(game);
    this.daily.refresh();
  }
  /* single entry point for gameplay events -> daily board + bounties */
  event(stat, amount) { this.daily.add(stat, amount); this.bounties.event(stat, amount); }
  /* claimed/unclaimed badge total for the menu button */
  badge() {
    return this.commander.pendingCount() + this.collection.claimableCount() + this.starter.claimableCount() +
      this.daily.tasks().filter((m) => this.daily.isDone(m.id) && !this.daily.isClaimed(m.id)).length +
      (this.daily.canClaimChest() ? 1 : 0);
  }
}

/* short guided checklist shown while a new player still has steps left */
class StarterSystem {
  constructor(game) { this.game = game; }
  claimed() { return this.game.state.starterClaimed || []; }
  list() { return STARTER_TASKS.map((t) => ({ def: t, done: !!t.check(this.game.state), claimed: this.claimed().indexOf(t.id) >= 0 })); }
  canClaim(id) { const t = STARTER_TASKS.find((x) => x.id === id); return !!t && t.check(this.game.state) && this.claimed().indexOf(id) < 0; }
  claimableCount() { return STARTER_TASKS.filter((t) => this.canClaim(t.id)).length; }
  active() { return STARTER_TASKS.some((t) => this.claimed().indexOf(t.id) < 0); }
  claim(id) {
    if (!this.canClaim(id)) return null;
    const t = STARTER_TASKS.find((x) => x.id === id);
    this.game.state.starterClaimed.push(id);
    const got = grantQuestReward(this.game, t.reward);
    this.game.audio.sfx("coin");
    this.game.save();
    return got;
  }
}
