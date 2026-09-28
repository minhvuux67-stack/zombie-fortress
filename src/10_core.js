/* =====================================================================
   Zombie Fortress: Pandemic Defense
   A complete single-file HTML5 tower-defense survival game.
   No external requests, no libraries, no assets - everything is
   drawn with Canvas 2D and every sound is synthesised with WebAudio.
   ===================================================================== */
"use strict";

/* Wrap the whole game so it can be embedded or re-injected safely. */
(function () {

/* ---------------------------------------------------------------------
   CONSTANTS & GEOMETRY
   --------------------------------------------------------------------- */
const W = 1280, H = 720;                    // base render resolution (16:9)
const FIELD_LEFT = 168;                     // fortress occupies x < FIELD_LEFT
const FORTRESS_X = FIELD_LEFT - 8;          // zombies attack once x <= this
const SPAWN_X = 1270;                       // zombies spawn at the right edge
const LANES = [180, 300, 420, 540];         // walking lanes (y centres), 4 rows
const SLOT_ROWS = [120, 240, 360, 480, 600]; // build rows (between lanes + edges)
const SLOT_COLS = [235, 395, 555, 715, 875, 1035]; // 6 build columns
const MAX_LEVEL = 5;                        // tower level cap per run
const PREP_TIME = 12;                       // seconds of build time before a wave auto-starts
const VERSION = "3.0.0";
const DONATE_URL = "https://ko-fi.com/";

/* ---------------------------------------------------------------------
   SMALL UTILITIES
   --------------------------------------------------------------------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const nowMs = () => Date.now();
function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "k";
  return "" + n;
}
function hhmmss(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h > 0 ? h + "h " : "") + m + "m " + s + "s";
}
function dateKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// deterministic 32-bit hash -> seeded PRNG (used for the daily challenge)
function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------------
   SAVESYSTEM - JSON progress in localStorage, safe for private browsing
   --------------------------------------------------------------------- */
const SAVE_KEY = "zombieFortressSave";
const SAVE_BACKUP_KEY = "zombieFortressBackup";

function defaultState() {
  return {
    version: VERSION,
    highScore: 0,
    highestWave: 0,
    totalKills: 0,
    totalPlayTime: 0,
    totalRuns: 0,
    totalWins: 0,
    gold: 0,
    scrap: 0,
    food: 30,
    meds: 20,
    unlockedTowers: ["gunner", "barricade"],
    towerUpgrades: {},                 // { towerId: {statKey: level} } permanent tower perks (reserved)
    permanentUpgrades: {},             // { upgradeId: level }
    achievements: [],                  // [{id, unlocked, date}]
    dailyStreak: 0,
    lastPlayedDate: "",
    dailyRewardClaimedDate: "",
    dailyChallengeCompleted: "",
    dailyChallengeDate: "",
    leaderboard: [],                   // [{score, wave, kills, date}]
    settings: { soundOn: true, musicOn: true, difficulty: "normal", lang: "en" },
    seenTutorial: false,
    /* ---- v3 meta progression ---- */
    heroProgress: {},                  // { heroId: {level, xp, unlocked} }
    selectedHero: "commander",
    relics: { collected: [], equipped: [] },
    research: { nodes: ["root"], points: 1, spent: 0 },
    camp: { buildings: {}, materials: { wood: 40, metal: 30, food: 0 }, lastTick: 0 },
    survivors: { recruited: [] },
    codex: { entries: ["z_walker", "t_gunner"] },
    quests: { daily: null, dailyDate: "", weekly: null, weeklyDate: "", story: [], storyDone: [] },
    battlePass: { xp: 0, tier: 0, claimed: [], season: 1 },
    prestige: { level: 0, points: 0, mods: [] },
    season: { id: 1, bestRank: 0 },
    stats: { towerUse: {}, bosses: 0, relicsFound: 0, runsByHero: {} },
  };
}

/* deep-merge a loaded save over the defaults so older saves gain v3 keys */
function normalizeState(data) {
  const base = defaultState();
  const st = Object.assign(base, data && typeof data === "object" ? data : {});
  st.settings = Object.assign(defaultState().settings, (data && data.settings) || {});
  // English is always the default; only keep Vietnamese when it was chosen in Settings
  if (st.settings.lang !== "vi") st.settings.lang = "en";
  const arr = (v, fb) => (Array.isArray(v) ? v : fb);
  st.unlockedTowers = Array.isArray(data && data.unlockedTowers) && data.unlockedTowers.length ? data.unlockedTowers : base.unlockedTowers;
  st.achievements = arr(data && data.achievements, []);
  st.leaderboard = arr(data && data.leaderboard, []);
  st.permanentUpgrades = (data && data.permanentUpgrades) || {};
  st.towerUpgrades = (data && data.towerUpgrades) || {};
  st.heroProgress = Object.assign({}, base.heroProgress, (data && data.heroProgress) || {});
  st.relics = Object.assign({}, base.relics, (data && data.relics) || {});
  st.relics.collected = arr(st.relics.collected, []);
  st.relics.equipped = arr(st.relics.equipped, []).slice(0, 3);
  st.research = Object.assign({}, base.research, (data && data.research) || {});
  st.research.nodes = arr(st.research.nodes, ["root"]);
  st.camp = Object.assign({}, base.camp, (data && data.camp) || {});
  st.camp.materials = Object.assign({ wood: 40, metal: 30, food: 0 }, (data && data.camp && data.camp.materials) || {});
  st.camp.buildings = (data && data.camp && data.camp.buildings) || {};
  st.survivors = Object.assign({}, base.survivors, (data && data.survivors) || {});
  st.survivors.recruited = arr(st.survivors.recruited, []);
  st.codex = Object.assign({}, base.codex, (data && data.codex) || {});
  st.codex.entries = arr(st.codex.entries, base.codex.entries);
  st.quests = Object.assign({}, base.quests, (data && data.quests) || {});
  st.quests.story = arr(st.quests.story, []);
  st.quests.storyDone = arr(st.quests.storyDone, []);
  // migrate an early v3 build that stored finished story ids inside `story`
  const legacyStoryIds = st.quests.story.filter((x) => typeof x === "string");
  if (legacyStoryIds.length) {
    st.quests.storyDone = st.quests.storyDone.concat(legacyStoryIds);
    st.quests.story = st.quests.story.filter((x) => typeof x !== "string");
  }
  st.battlePass = Object.assign({}, base.battlePass, (data && data.battlePass) || {});
  st.battlePass.claimed = arr(st.battlePass.claimed, []);
  st.prestige = Object.assign({}, base.prestige, (data && data.prestige) || {});
  st.prestige.mods = arr(st.prestige.mods, []);
  st.season = Object.assign({}, base.season, (data && data.season) || {});
  st.stats = Object.assign({}, base.stats, (data && data.stats) || {});
  st.stats.towerUse = Object.assign({}, (data && data.stats && data.stats.towerUse) || {});
  if (typeof st.selectedHero !== "string") st.selectedHero = "commander";
  return st;
}

class SaveSystem {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return normalizeState(data);
      }
    } catch (e) {}
    // main save missing or corrupt - fall back to the rolling backup
    try {
      const raw = localStorage.getItem(SAVE_BACKUP_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return normalizeState(data);
      }
    } catch (e) {}
    return defaultState();
  }
  static save(st) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); return true; }
    catch (e) { return false; }
  }
  static saveBackup(st) {
    try { localStorage.setItem(SAVE_BACKUP_KEY, JSON.stringify(st)); return true; }
    catch (e) { return false; }
  }
  static loadBackup() {
    try {
      const raw = localStorage.getItem(SAVE_BACKUP_KEY);
      if (raw) { const d = JSON.parse(raw); if (d && typeof d === "object") return normalizeState(d); }
    } catch (e) {}
    return null;
  }
  static wipe() {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_BACKUP_KEY); } catch (e) {}
  }
}
