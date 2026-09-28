/* =====================================================================
   RUN SYSTEMS (v3) - per-run variety: wave mutations, weather, synergies
   ===================================================================== */

/* rolls a mutation for every wave and applies its stat modifiers -------- */
class MutationSystem {
  constructor(game) { this.game = game; this.current = MUTATIONS[0]; }
  reset() { this.current = MUTATIONS[0]; }
  roll(wave) {
    let roll = Math.random() * MUTATIONS.reduce((a, m) => a + m.w, 0);
    for (const m of MUTATIONS) { roll -= m.w; if (roll <= 0) { this.current = m; break; } }
    // never repeat the "elite" mutation too early
    if (wave < 3 && this.current.id === "elite") this.current = MUTATIONS[0];
    return this.current;
  }
  applyToWave(n, game) {
    const m = this.current, mod = m.mod || {};
    if (mod.hp) game.waveHpMul *= mod.hp;
    if (mod.speed) game.waveSpeedMul *= mod.speed;
    if (mod.dmg) game.waveDmgMul *= mod.dmg;
    game.mutationVuln = mod.vuln || 1;
    game.mutationScrap = mod.scrap || 1;
    game.mutationMultiLane = !!mod.multiLane;
    if (m.id !== "none") {
      const colors = { horde: "#ff8093", frenzy: "#ffb347", armored: "#9aa08a", swarm: "#c06fd8", bounty: "#ffce4a", elite: "#e0526b" };
      game.ui.toast("\u2620 Mutation: " + m.name + " \u2014 " + m.ds, colors[m.id] || "#8fa2c0");
    }
    return m;
  }
}

/* picks a weather for the run and exposes its modifiers ---------------- */
class WeatherSystem {
  constructor(game) { this.game = game; this.def = WEATHER_DEFS.clear; }
  roll() {
    const ids = Object.keys(WEATHER_DEFS).filter((id) => id !== "clear");
    this.def = Math.random() < 0.55 ? WEATHER_DEFS.clear : WEATHER_DEFS[pick(ids)];
    return this.def;
  }
  get fx() { return this.def.fx || null; }
  mods() { return this.def.mod || {}; }
  force(id) { if (WEATHER_DEFS[id]) this.def = WEATHER_DEFS[id]; return this.def; }
}

/* adjacency bonuses between neighbouring towers ------------------------- */
class SynergySystem {
  constructor(game) { this.game = game; this.active = []; this.byTower = new Map(); }
  reset() { this.active = []; this.byTower = new Map(); }
  recompute() {
    const g = this.game;
    this.active = []; this.byTower = new Map();
    const grid = new Map();
    for (const t of g.towers) if (!t.dead) grid.set(t.row + "_" + t.col, t);
    const consider = (a, b) => {
      for (const s of SYNERGIES) {
        const pair = [a.id, b.id].sort().join("+");
        const want = s.towers.slice().sort().join("+");
        if (pair !== want) continue;
        const key = [a.row, a.col, b.row, b.col].sort().join(":");
        if (this.active.some((x) => x.key === key && x.def.id === s.id)) continue;
        this.active.push({ key, def: s, a, b, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        for (const t of [a, b]) {
          const cur = this.byTower.get(t) || {};
          mergeMods(cur, s.mod);
          this.byTower.set(t, cur);
        }
      }
    };
    for (const t of g.towers) {
      if (t.dead) continue;
      const neigh = [[t.row, t.col - 1], [t.row, t.col + 1], [t.row - 1, t.col], [t.row + 1, t.col]];
      for (const [r, c] of neigh) {
        const o = grid.get(r + "_" + c);
        if (o && t.row <= r && (t.row !== r || t.col < c)) consider(t, o);
      }
    }
    for (const t of g.towers) if (!t.dead && t.recompute) t.recompute();
  }
  modsFor(t) { return this.byTower.get(t) || {}; }
  has(id) { return this.active.some((a) => a.def.id === id); }
}
