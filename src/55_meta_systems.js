/* =====================================================================
   META PROGRESSION SYSTEMS (v3)
   Each system reads/writes SaveSystem state and contributes modifiers to
   the run through the shared key vocabulary used by Game.computeBonus():
     multipliers : dmg rate range scrapGain cooldown costMul
     additive    : fhp regen startScrap startGold crit waveFood waveMeds researchRate
   ===================================================================== */

const MUL_KEYS = ["dmg", "rate", "range", "scrapGain", "cooldown", "costMul"];
function mergeMods(target, src) {
  if (!src) return target;
  for (const k in src) {
    const v = src[k];
    if (typeof v !== "number" || !isFinite(v)) continue;
    if (MUL_KEYS.indexOf(k) >= 0) target[k] = (target[k] == null ? 1 : target[k]) * v;
    else target[k] = (target[k] || 0) + v;
  }
  return target;
}
function heroLevelXp(level) { return Math.round(120 * Math.pow(1.35, level - 1)); }

/* ------------------------------------------------------------------ */
class HeroSystem {
  constructor(game) { this.game = game; }
  progress(id) {
    const st = this.game.state;
    if (!st.heroProgress[id]) st.heroProgress[id] = { level: 1, xp: 0, unlocked: (HERO_DEFS[id] && HERO_DEFS[id].unlockCost === 0) };
    const p = st.heroProgress[id];
    if (HERO_DEFS[id] && HERO_DEFS[id].unlockCost === 0) p.unlocked = true;
    return p;
  }
  unlocked(id) { return !!this.progress(id).unlocked; }
  current() { return HERO_DEFS[this.game.state.selectedHero] || HERO_DEFS.commander; }
  select(id) {
    if (!HERO_DEFS[id] || !this.unlocked(id)) return false;
    this.game.state.selectedHero = id; this.game.save(); return true;
  }
  unlock(id) {
    const def = HERO_DEFS[id]; if (!def) return false;
    const p = this.progress(id);
    if (p.unlocked) return false;
    const st = this.game.state;
    if (st.gold < def.unlockCost) return false;
    st.gold -= def.unlockCost; p.unlocked = true; this.game.save(); return true;
  }
  addXp(id, amount) {
    const p = this.progress(id);
    p.xp += Math.max(0, Math.round(amount));
    let leveled = 0;
    while (p.xp >= heroLevelXp(p.level)) { p.xp -= heroLevelXp(p.level); p.level++; leveled++; }
    return leveled;
  }
  /* combined hero modifiers (base stats + level bonus) */
  mods() {
    const def = this.current(), s = def.stats || {};
    const lvl = this.progress(def.id).level;
    const out = {
      dmg: (s.dmg || 1) * (1 + 0.015 * (lvl - 1)),
      rate: s.rate || 1,
      range: 1,
      fhp: (s.fhp || 0) + Math.round(30 * (lvl - 1)),
      regen: s.regen || 0,
      crit: s.crit || 0,
      cooldown: s.cooldown || 1,
      startScrap: s.scrap || 0,
      costMul: s.costMul || 1,
    };
    return out;
  }
}

/* ------------------------------------------------------------------ */
class RelicSystem {
  constructor(game) { this.game = game; }
  has(id) { return this.game.state.relics.collected.indexOf(id) >= 0; }
  granted(id) {
    const st = this.game.state;
    if (this.has(id)) return false;
    st.relics.collected.push(id);
    st.stats.relicsFound = (st.stats.relicsFound || 0) + 1;
    if (st.relics.equipped.length < 3) st.relics.equipped.push(id);
    this.game.meta.codex.unlock("relic_" + id, "Relics", RELIC_DEFS[id] ? RELIC_DEFS[id].name : id, "A relic recovered from the horde.");
    this.game.ui.toast("\u{1F48E} Relic found: " + (RELIC_DEFS[id] ? RELIC_DEFS[id].name : id), RELIC_RARITY_COLOR[RELIC_DEFS[id] ? RELIC_DEFS[id].rarity : "common"]);
    this.game.audio.sfx("achievement");
    this.game.save();
    return true;
  }
  grantRandom(weight) {
    const pool = Object.keys(RELIC_DEFS).filter((id) => !this.has(id));
    if (!pool.length) return null;
    const rar = { common: 55, rare: 30, epic: 12, legendary: 3 };
    const weighted = [];
    for (const id of pool) { const r = RELIC_DEFS[id].rarity; weighted.push([id, rar[r] || 10]); }
    const total = weighted.reduce((a, b) => a + b[1], 0);
    let roll = Math.random() * total, chosen = pool[0];
    for (const [id, w] of weighted) { roll -= w; if (roll <= 0) { chosen = id; break; } }
    this.granted(chosen); return chosen;
  }
  toggleEquip(id) {
    const eq = this.game.state.relics.equipped;
    const i = eq.indexOf(id);
    if (i >= 0) { eq.splice(i, 1); }
    else { if (eq.length >= 3) { this.game.ui.toast("Equip limit is 3 \u2014 unequip one first.", "#ffb347"); return false; } eq.push(id); }
    this.game.save(); return true;
  }
  mods() {
    const out = {};
    for (const id of this.game.state.relics.equipped) {
      const def = RELIC_DEFS[id]; if (def) mergeMods(out, def.mod);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */
class ResearchSystem {
  constructor(game) { this.game = game; }
  has(id) { return this.game.state.research.nodes.indexOf(id) >= 0; }
  canBuy(id) {
    const n = RESEARCH_NODES[id]; if (!n || this.has(id)) return false;
    if (this.game.state.research.points < n.cost) return false;
    return n.req.every((r) => this.has(r));
  }
  buy(id) {
    if (!this.canBuy(id)) return false;
    const st = this.game.state.research;
    st.points -= RESEARCH_NODES[id].cost; st.spent += RESEARCH_NODES[id].cost;
    st.nodes.push(id);
    this.game.audio.sfx("upgrade"); this.game.save(); return true;
  }
  addPoints(n) { this.game.state.research.points += Math.max(0, n | 0); this.game.save(); }
  mods() { const out = {}; for (const id of this.game.state.research.nodes) { const n = RESEARCH_NODES[id]; if (n) mergeMods(out, n.mod); } return out; }
}

/* ------------------------------------------------------------------ */
class CampSystem {
  constructor(game) { this.game = game; }
  buildings() { return this.game.state.camp.buildings; }
  level(id) { return this.buildings()[id] || 0; }
  cost(id) { const b = CAMP_BUILDINGS[id]; return b ? b.cost(this.level(id)) : null; }
  canBuild(id) {
    const b = CAMP_BUILDINGS[id];
    if (!b || this.level(id) >= b.maxLevel) return false;
    const c = this.cost(id), m = this.game.state.camp.materials;
    for (const k in c) if ((m[k] || 0) < c[k]) return false;
    return true;
  }
  build(id, free) {
    if (!free && !this.canBuild(id)) return false;
    const b = CAMP_BUILDINGS[id]; if (!b) return false;
    if (!free) { const c = this.cost(id), m = this.game.state.camp.materials; for (const k in c) m[k] -= c[k]; }
    this.buildings()[id] = this.level(id) + 1;
    this.game.audio.sfx("build"); this.game.save(); return true;
  }
  clockIn(ms) {
    const due = 0;
    this.game.state.camp.lastTick = this.game.state.camp.lastTick || ms;
    void due;
  }
  /* award idle materials based on elapsed real time, capped at 8 hours */
  collectIdle(now) {
    const camp = this.game.state.camp;
    // first ever call after install/load: stamp the clock, never dump 8h at once
    if (!camp.lastTick) { camp.lastTick = now; this.game.save(); return null; }
    const last = camp.lastTick;
    const hrs = Math.min(8, (now - last) / 3600000);
    camp.lastTick = now;
    if (hrs <= 0) return null;
    const lv = (id) => camp.buildings[id] || 0;
    const rate = { wood: 6 * lv("farm") + 3 * lv("workshop"), metal: 5 * lv("workshop") + 3 * lv("barracks"), food: 4 * lv("clinic") + 2 * lv("farm") };
    const gain = {};
    for (const k in rate) { const v = Math.floor(rate[k] * hrs); if (v > 0) { camp.materials[k] = (camp.materials[k] || 0) + v; gain[k] = v; } }
    if (Object.keys(gain).length) this.game.save();
    return Object.keys(gain).length ? gain : null;
  }
  mods() { const out = {}; for (const id in CAMP_BUILDINGS) { const l = this.level(id); if (l > 0) mergeMods(out, CAMP_BUILDINGS[id].mod(l)); } return out; }
}

/* ------------------------------------------------------------------ */
class SurvivorSystem {
  constructor(game) { this.game = game; }
  has(id) { return this.game.state.survivors.recruited.indexOf(id) >= 0; }
  cost(id) { return SURVIVOR_DEFS[id] ? SURVIVOR_DEFS[id].cost : null; }
  /* every survivor cost key is read through one resolver so a missing
     material bucket can never compare/deduct as NaN */
  _have(key) {
    const st = this.game.state, m = st.camp.materials;
    if (key === "gold") return st.gold || 0;
    if (key === "meds") return st.meds || 0;
    return m[key] || 0;
  }
  _spend(key, n) {
    const st = this.game.state, m = st.camp.materials;
    if (key === "gold") st.gold = Math.max(0, st.gold - n);
    else if (key === "meds") st.meds = Math.max(0, st.meds - n);
    else m[key] = Math.max(0, (m[key] || 0) - n);
  }
  canRecruit(id) {
    const d = SURVIVOR_DEFS[id]; if (!d || this.has(id)) return false;
    for (const k in d.cost) if (this._have(k) < d.cost[k]) return false;
    return true;
  }
  recruit(id) {
    if (!this.canRecruit(id)) return false;
    const d = SURVIVOR_DEFS[id], st = this.game.state;
    for (const k in d.cost) this._spend(k, d.cost[k]);
    st.survivors.recruited.push(id);
    this.game.audio.sfx("upgrade"); this.game.save(); return true;
  }
  mods() { const out = {}; for (const id of this.game.state.survivors.recruited) { const d = SURVIVOR_DEFS[id]; if (d && d.perk) mergeMods(out, d.perk); } return out; }
}

/* ------------------------------------------------------------------ */
class CodexSystem {
  constructor(game) { this.game = game; }
  has(id) { return this.game.state.codex.entries.indexOf(id) >= 0; }
  unlock(id, cat, name, ds) {
    if (!id || this.has(id)) return false;
    this.game.state.codex.entries.push(id);
    if (cat) {
      const entry = CODEX_ENTRIES.find((e) => e.id === id);
      if (!entry) CODEX_ENTRIES.push({ id, cat, name: name || id, ds: ds || "" });
    }
    this.game.save(); return true;
  }
  percent() { return Math.round((this.game.state.codex.entries.length / CODEX_ENTRIES.length) * 100); }
  byCat() { const out = {}; for (const c of CODEX_CATS) out[c] = []; for (const e of CODEX_ENTRIES) { (out[e.cat] || (out[e.cat] = [])).push(e); } return out; }
}

/* ------------------------------------------------------------------ */
let _qseq = 1;
function makeQuest(tpl, kind) {
  return { qid: kind + "_" + tpl.id + "_" + (_qseq++), id: tpl.id, kind, name: tpl.name, ds: tpl.ds, target: tpl.target, stat: tpl.stat, reward: tpl.reward, progress: 0, done: false };
}
function weekKey(d) {
  d = d || new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - ys) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + "W" + wk;
}
function grantQuestReward(game, reward) {
  const st = game.state, got = [];
  if (reward.gold) { st.gold += reward.gold; got.push("+" + reward.gold + " gold"); }
  if (reward.research) { st.research.points += reward.research; got.push("+" + reward.research + " research"); }
  if (reward.scrap) { st.scrap += reward.scrap; got.push("+" + reward.scrap + " scrap"); }
  if (reward.material) { st.camp.materials.metal = (st.camp.materials.metal || 0) + reward.material; got.push("+" + reward.material + " metal"); }
  if (reward.relic) { game.meta.relics.granted(reward.relic); }
  return got;
}
class QuestSystem {
  constructor(game) { this.game = game; this.refresh(); }
  refresh() {
    const q = this.game.state.quests, today = dateKey(), week = weekKey();
    if (q.dailyDate !== today || !q.daily) { q.daily = makeQuest(pick(QUEST_POOLS.daily), "daily"); q.dailyDate = today; }
    if (q.weeklyDate !== week || !q.weekly) { q.weekly = makeQuest(pick(QUEST_POOLS.weekly), "weekly"); q.weeklyDate = week; }
    // rebuild the active story list, preserving progress of still-open quests
    const doneIds = q.storyDone || [];
    const prev = {};
    for (const s of (q.story || [])) if (s && s.id) prev[s.id] = s;
    q.story = QUEST_POOLS.story
      .filter((t) => doneIds.indexOf(t.id) < 0)
      .map((t) => {
        const was = prev[t.id];
        return { qid: "story_" + t.id, id: t.id, kind: "story", name: t.name, ds: t.ds, target: t.target, stat: t.stat, reward: t.reward, progress: was ? was.progress || 0 : 0, done: false };
      });
    this.game.save();
  }
  all() { const q = this.game.state.quests; return [q.daily, q.weekly].filter(Boolean).concat(q.story || []); }
  completedStory() { return (this.game.state.quests.storyDone || []).map((id) => QUEST_POOLS.story.find((t) => t.id === id)).filter(Boolean); }
  /* called at run end - evaluates the run's stats plus cumulative records */
  recordRun(run, game) {
    const st = game.state, q = st.quests;
    const vals = {
      kills: run.kills, waves: run.wavesCleared, combo: run.combo, builds: run.builds || 0,
      killsTotal: st.totalKills, bossesTotal: st.stats.bosses || 0,
      bosses: run.bossKills, highestWave: st.highestWave, prestigeLevel: st.prestige.level,
    };
    const apply = (quest) => {
      if (!quest || quest.done) return;
      const v = vals[quest.stat] || 0;
      if (v > (quest.progress || 0)) quest.progress = v;
      if (quest.progress >= quest.target) {
        quest.done = true;
        const got = grantQuestReward(game, quest.reward);
        game.ui.toast("\u{1F4DC} Quest complete: " + quest.name + " (" + got.join(", ") + ")", "#ffce4a");
        if (quest.kind === "story" && (q.storyDone || []).indexOf(quest.id) < 0) {
          q.storyDone = (q.storyDone || []).concat(quest.id);
        }
      }
    };
    apply(q.daily); apply(q.weekly);
    for (const s of (q.story || [])) apply(s);
    q.story = (q.story || []).filter((s) => !s.done);
    game.save();
  }
  progressText(q) {
    const cur = q.done ? q.target : (q.progress || 0);
    return Math.min(cur, q.target) + " / " + q.target;
  }
}

/* ------------------------------------------------------------------ */
class BattlePassSystem {
  constructor(game) { this.game = game; }
  get p() { return this.game.state.battlePass; }
  tierForXp(xp) { let t = 0; for (const row of BATTLEPASS_TIERS) if (xp >= row.xp) t = row.tier; return t; }
  addXp(n) {
    const before = this.tierForXp(this.p.xp);
    this.p.xp += Math.max(0, Math.round(n));
    const after = this.tierForXp(this.p.xp);
    this.p.tier = after;
    if (after > before) this.game.ui.toast("\u{1F396} Battle Pass tier " + after + " reached!", "#c08bff");
    this.game.save();
  }
  claim(tier) {
    const row = BATTLEPASS_TIERS.find((r) => r.tier === tier);
    if (!row || this.p.claimed.indexOf(tier) >= 0 || this.p.xp < row.xp) return false;
    this.p.claimed.push(tier);
    const got = grantQuestReward(this.game, row.reward);
    this.game.ui.toast("\u{1F396} Tier " + tier + " claimed: " + (got.join(", ") || "reward"), "#c08bff");
    this.game.save(); return true;
  }
  mods() { return {}; }
}

/* ------------------------------------------------------------------ */
class PrestigeSystem {
  constructor(game) { this.game = game; }
  get p() { return this.game.state.prestige; }
  canPrestige() { return this.game.state.highestWave >= 20; }
  pointsFor() { return Math.max(1, Math.floor((this.game.state.highestWave - 18) / 3) + Math.floor(this.game.state.totalKills / 2500)); }
  prestige() {
    if (!this.canPrestige()) return false;
    const gain = this.pointsFor();
    const st = this.game.state;
    st.prestige.level += 1; st.prestige.points += gain;
    // soft reset: gold, shop upgrades, research and camp levels reset.
    // Career records (highest wave, kills, achievements) are NOT touched.
    st.gold = 0; st.permanentUpgrades = {};
    st.research = { nodes: ["root"], points: 1 + st.prestige.level, spent: 0 };
    st.camp.buildings = {};
    this.game.meta.recompute();
    this.game.save();
    return gain;
  }
  buy(id) {
    const mod = PRESTIGE_MODS.find((m) => m.id === id);
    if (!mod || this.p.mods.indexOf(id) >= 0 || this.p.points < mod.cost) return false;
    this.p.points -= mod.cost; this.p.mods.push(id);
    this.game.audio.sfx("upgrade"); this.game.save(); return true;
  }
  mods() { const out = {}; for (const id of this.p.mods) { const m = PRESTIGE_MODS.find((x) => x.id === id); if (m) mergeMods(out, m.mod); } return out; }
}

/* ------------------------------------------------------------------ */
class SeasonSystem {
  constructor(game) { this.game = game; }
  current() {
    const id = this.game.state.season.id || 1;
    return SEASONS.find((s) => s.id === id) || SEASONS[0];
  }
  rotate() {
    const next = ((this.game.state.season.id || 1) % SEASONS.length) + 1;
    this.game.state.season.id = next;
    this.game.state.battlePass.xp = 0; this.game.state.battlePass.tier = 0; this.game.state.battlePass.claimed = [];
    this.game.save(); return next;
  }
  noteRank(rank) {
    const order = RANKS.map((r) => r.name);
    const i = order.indexOf(rank);
    if (i > (this.game.state.season.bestRank || 0)) this.game.state.season.bestRank = i;
  }
  mods() {
    // each season grants a small themed bonus
    switch (this.game.state.season.id) {
      case 2: return { scrapGain: 1.05 };
      case 3: return { fhp: 100 };
      case 4: return { dmg: 1.05 };
      default: return {};
    }
  }
}

/* ------------------------------------------------------------------ */
/* aggregates every permanent system into one modifier bundle */
class MetaProgressionManager {
  constructor(game) {
    this.game = game;
    this.hero = new HeroSystem(game);
    this.relics = new RelicSystem(game);
    this.research = new ResearchSystem(game);
    this.camp = new CampSystem(game);
    this.survivors = new SurvivorSystem(game);
    this.codex = new CodexSystem(game);
    this.quests = new QuestSystem(game);
    this.pass = new BattlePassSystem(game);
    this.prestige = new PrestigeSystem(game);
    this.season = new SeasonSystem(game);
    this.bonus = {};
    this.recompute();
  }
  recompute() {
    const out = {};
    mergeMods(out, this.hero.mods());
    mergeMods(out, this.relics.mods());
    mergeMods(out, this.research.mods());
    mergeMods(out, this.camp.mods());
    mergeMods(out, this.survivors.mods());
    mergeMods(out, this.prestige.mods());
    mergeMods(out, this.season.mods());
    this.bonus = out;
  }
  /* award everything that happens when a run ends */
  finishRun(run, won) {
    const st = this.game.state, g = this.game;
    const hero = st.selectedHero;
    const lvl = this.hero.addXp(hero, run.wavesCleared * 12 + Math.floor(run.kills / 4) + (run.bossKills || 0) * 40);
    st.stats.runsByHero[hero] = (st.stats.runsByHero[hero] || 0) + 1;
    st.stats.favoriteHero = Object.keys(st.stats.runsByHero).sort((a, b) => st.stats.runsByHero[b] - st.stats.runsByHero[a])[0];
    st.stats.bosses = (st.stats.bosses || 0) + (run.bossKills || 0);
    st.camp.materials.metal = (st.camp.materials.metal || 0) + Math.floor(run.wavesCleared * 1.5);
    st.camp.materials.wood = (st.camp.materials.wood || 0) + Math.floor(run.wavesCleared * 1.2);
    // research points from the lab
    const rp = Math.floor(run.wavesCleared / 5) + (this.camp.level("lab") > 0 ? Math.floor(run.wavesCleared / 5) * this.camp.level("lab") : 0);
    if (rp > 0) st.research.points += rp;
    // battle pass xp
    this.pass.addXp(run.wavesCleared * 15 + Math.floor(run.kills / 3) + (won ? 200 : 0));
    // quests
    this.quests.recordRun(run, g);
    // relic from bosses
    if (run.bossKills > 0 && Math.random() < Math.min(1, run.bossKills * 0.5)) this.relics.grantRandom();
    // codex
    this.codex.unlock("p_run", "Command", "Battle Record", "Runs survive in the archive.");
    if (st.highestWave >= 20) this.codex.unlock("p_endless", "Command", "Endless", "The horde has no end.");
    if (lvl > 0) g.ui.toast("\u2b50 " + HERO_DEFS[hero].name + " reached level " + this.hero.progress(hero).level + "!", "#57e08a");
    this.recompute();
    g.save();
  }
}
