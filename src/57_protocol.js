/* =====================================================================
   RUN PROTOCOLS (v4) - the roguelite draft.
   After every cleared wave the lab offers a choice of run mutations.
   Each pick is permanent for that run and stacks, so no two runs build
   the same fortress.  Mods reuse the shared vocabulary consumed by
   Game.computeBonus(); the handful of behaviour flags are exposed as
   `protocolFlags()` and read by towers, zombies and projectiles.
   ===================================================================== */

const PROTO_RARITY = { common: "#8fa2c0", rare: "#4aa8ff", epic: "#c08bff" };
const PROTO_RARITY_W = { common: 58, rare: 30, epic: 12 };

const PROTOCOLS = [
  /* --- common: clean, always-useful stat lines --- */
  { id: "p_dmg",   name: "Hollow Points",   icon: "\u{1F4A5}", rarity: "common", max: 5, ds: "+12% tower damage.", mod: { dmg: 1.12 } },
  { id: "p_rate",  name: "Trigger Tuning",  icon: "\u{1F3AF}", rarity: "common", max: 5, ds: "+10% tower fire rate.", mod: { rate: 1.10 } },
  { id: "p_range", name: "Spotter Drone",   icon: "\u{1F52D}", rarity: "common", max: 4, ds: "+10% tower range.", mod: { range: 1.10 } },
  { id: "p_scrap", name: "Scrap Magnet",    icon: "\u{1F9F2}", rarity: "common", max: 5, ds: "+15% scrap from kills.", mod: { scrapGain: 1.15 } },
  { id: "p_crit",  name: "Weak-Point Map",  icon: "\u{1F480}", rarity: "common", max: 4, ds: "+5% crit chance.", mod: { crit: 0.05 } },
  { id: "p_fhp",   name: "Concrete Mix",    icon: "\u{1F9F1}", rarity: "common", max: 5, ds: "+180 fortress HP.", mod: { fhp: 180 } },
  { id: "p_regen", name: "Auto-Medics",     icon: "\u{1FA79}", rarity: "common", max: 4, ds: "+1.5 fortress HP/s.", mod: { regen: 1.5 } },
  { id: "p_cd",    name: "Command Relay",   icon: "\u{1F4E1}", rarity: "common", max: 3, ds: "-12% skill cooldowns.", mod: { cooldown: 0.88 } },
  { id: "p_cost",  name: "Requisition",     icon: "\u{1F4E6}", rarity: "common", max: 3, ds: "Towers cost 8% less.", mod: { costMul: 0.92 } },
  { id: "p_food",  name: "Ration Cache",    icon: "\u{1F35E}", rarity: "common", max: 4, ds: "+1 food and +1 med per wave.", mod: { waveFood: 1, waveMeds: 1 } },

  /* --- rare: new behaviour you can feel --- */
  { id: "p_burn",   name: "Incendiary Rounds", icon: "\u{1F525}", rarity: "rare", max: 2, ds: "Bullets set zombies on fire.", mod: {}, flag: "burn" },
  { id: "p_boom",   name: "Explosive Tips",    icon: "\u{1F4A3}", rarity: "rare", max: 2, ds: "Bullets explode on impact.", mod: {}, flag: "boom" },
  { id: "p_static", name: "Static Rounds",     icon: "\u26A1",    rarity: "rare", max: 2, ds: "Bullets slow what they hit.", mod: {}, flag: "static" },
  { id: "p_vamp",   name: "Leech Protocol",    icon: "\u{1FA78}", rarity: "rare", max: 3, ds: "Each kill restores 2 fortress HP.", mod: {}, flag: "vamp" },
  { id: "p_thorns", name: "Razor Wire",        icon: "\u{1F529}", rarity: "rare", max: 2, ds: "Zombies that strike your wall take 25 damage.", mod: {}, flag: "thorns" },
  { id: "p_boss",   name: "Titan Slayer",      icon: "\u{1F451}", rarity: "rare", max: 2, ds: "+35% damage against bosses.", mod: {}, flag: "boss" },
  { id: "p_greed",  name: "War Bonds",         icon: "\u{1F4B0}", rarity: "rare", max: 3, ds: "+120 starting scrap.", mod: { startScrap: 120 } },

  /* --- epic: run-defining --- */
  { id: "p_berserk",  name: "Berserker Strain", icon: "\u{1F9AC}", rarity: "epic", max: 1, ds: "+30% damage, -250 fortress HP.", mod: { dmg: 1.30, fhp: -250 } },
  { id: "p_twin",     name: "Twin Barrels",     icon: "\u{1F52B}", rarity: "epic", max: 1, ds: "+28% fire rate, -12% range.", mod: { rate: 1.28, range: 0.88 } },
  { id: "p_aegis",    name: "Aegis Protocol",   icon: "\u{1F6E1}", rarity: "epic", max: 1, ds: "+500 fortress HP, +3 HP/s.", mod: { fhp: 500, regen: 3 } },
  { id: "p_scavenge", name: "Total Salvage",    icon: "\u267B",    rarity: "epic", max: 1, ds: "+30% scrap, +10% fire rate.", mod: { scrapGain: 1.30, rate: 1.10 } },
];
const PROTOCOL_BY_ID = {};
for (const p of PROTOCOLS) PROTOCOL_BY_ID[p.id] = p;

class ProtocolSystem {
  constructor(game) { this.game = game; this.taken = []; this.pending = 0; this.current = []; }
  reset() { this.taken = []; this.pending = 0; this.current = []; }
  count(id) { let n = 0; for (const t of this.taken) if (t === id) n++; return n; }
  list() { return this.taken.slice(); }
  has(id) { return this.taken.indexOf(id) >= 0; }
  maxed(id) { const d = PROTOCOL_BY_ID[id]; return !!d && this.count(id) >= d.max; }

  /* aggregate every taken protocol into one modifier bundle */
  mods() { const out = {}; for (const id of this.taken) { const d = PROTOCOL_BY_ID[id]; if (d) mergeMods(out, d.mod); } return out; }
  /* behaviour flags read by the combat code */
  flags() {
    const f = { burn: 0, aoe: 0, slow: 0, slowDur: 1.4, vamp: 0, thorns: 0, boss: 0 };
    for (const id of this.taken) {
      const d = PROTOCOL_BY_ID[id]; if (!d || !d.flag) continue;
      if (d.flag === "burn") f.burn = 4;
      else if (d.flag === "boom") f.aoe = 62;
      else if (d.flag === "static") f.slow = Math.min(0.6, f.slow + 0.38);
      else if (d.flag === "vamp") f.vamp += 2;
      else if (d.flag === "thorns") f.thorns += 25;
      else if (d.flag === "boss") f.boss += 0.35;
    }
    return f;
  }
  picksPerWave() { return this.game.mods && this.game.mods.doubleDraft ? 2 : 1; }

  /* roll a fresh offer: distinct, not maxed, weighted toward lower rarity */
  roll() {
    const pool = PROTOCOLS.filter((p) => !this.maxed(p.id) && !this.current.some((c) => c.id === p.id));
    const out = [];
    const bag = pool.slice();
    while (out.length < 3 && bag.length) {
      let total = 0; for (const p of bag) total += PROTO_RARITY_W[p.rarity] || 10;
      let r = Math.random() * total, chosen = bag[0];
      for (const p of bag) { r -= PROTO_RARITY_W[p.rarity] || 10; if (r <= 0) { chosen = p; break; } }
      out.push(chosen);
      bag.splice(bag.indexOf(chosen), 1);
    }
    return out;
  }

  /* called by Game.waveCleared - opens the draft and pauses the battle */
  offer() {
    const g = this.game;
    if (!g.state.settings.draft) return false;
    if (g.mods && g.mods.noProtocols) return false;
    if (g.screen !== "play") return false;
    this.pending = this.picksPerWave();
    return this.show();
  }
  show() {
    if (this.pending <= 0) return false;
    const g = this.game;
    this.current = this.roll();
    if (!this.current.length) { this.pending = 0; return false; }
    if (!g.paused) { g.paused = true; g.autoPaused = true; g.setMusic("menu"); }
    g.ui.draftScreen(this.current, this.pending);
    return true;
  }
  pick(id) {
    const g = this.game;
    const d = PROTOCOL_BY_ID[id];
    if (!d || !this.current.some((c) => c.id === id) || this.maxed(id)) return false;
    this.taken.push(id);
    g.state.stats.protocolsPicked = (g.state.stats.protocolsPicked || 0) + 1;
    if (this.taken.length > (g.state.stats.bestDraft || 0)) g.state.stats.bestDraft = this.taken.length;
    if (g.run) g.run.protocols = this.taken.length;
    g.meta.codex.unlock("proto_core", "Protocols", "Mutation Protocol", "");
    g.meta.codex.unlock("proto_" + id, "Protocols", d.name, d.ds);
    g.burst(W / 2, H / 2, PROTO_RARITY[d.rarity], 26, 300);
    g.audio.sfx("upgrade");
    if (this.taken.length >= 10) g.unlock("proto_10");
    if (this.taken.length >= 18) g.unlock("proto_all");
    if (this.taken.length === 1) g.unlock("proto_first");
    // fold the new mutation into the run and refresh every built tower
    g.computeBonus();
    g.refreshTowers();
    this.pending--;
    if (this.pending > 0) { this.show(); return true; }
    g.ui.closeOverlay();
    g.endAutoPause();
    g.ui.toast("\u{1F9EC} Protocol online: " + d.name, PROTO_RARITY[d.rarity]);
    g.save();
    return true;
  }
}
