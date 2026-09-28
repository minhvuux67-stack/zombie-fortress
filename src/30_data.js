/* ---------------------------------------------------------------------
   GAME DATA - towers, zombies, upgrades, achievements, ranks, dailies
   --------------------------------------------------------------------- */
const TOWER_DEFS = {
  gunner: {
    id: "gunner", name: "Gunner", glyph: "\u2699", color: "#5b8cff", accent: "#cfe0ff",
    cost: 50, unlockCost: 0, kind: "bullet",
    desc: "Rapid single-target fire. Cheap, dependable, never wasted.",
    base: { dmg: 7, rate: 2.7, range: 160, bulletSpeed: 640 },
  },
  shotgun: {
    id: "shotgun", name: "Shotgun", glyph: "\u29c9", color: "#ff9b4a", accent: "#ffd9b0",
    cost: 90, unlockCost: 120, kind: "shotgun",
    desc: "Short range, heavy spread. Shreds tight packs of walkers.",
    base: { dmg: 19, rate: 1.35, range: 125, bulletSpeed: 560, pellets: 5 },
  },
  sniper: {
    id: "sniper", name: "Sniper", glyph: "\u2316", color: "#9d7bff", accent: "#e0d4ff",
    cost: 140, unlockCost: 260, kind: "sniper",
    desc: "Extreme range, huge single hits, pierces a whole lane.",
    base: { dmg: 95, rate: 0.5, range: 470, bulletSpeed: 1500, pierce: 3 },
  },
  flamethrower: {
    id: "flamethrower", name: "Flamethrower", glyph: "\u2691", color: "#ff6a3d", accent: "#ffc27a",
    cost: 170, unlockCost: 480, kind: "flame",
    desc: "Torches everything in a cone and leaves them burning.",
    base: { dps: 30, range: 140, burn: 5 },
  },
  tesla: {
    id: "tesla", name: "Tesla Coil", glyph: "\u26a1", color: "#4ae0ff", accent: "#c8f7ff",
    cost: 200, unlockCost: 760, kind: "tesla",
    desc: "Chain lightning that arcs between zombies and slows them.",
    base: { dmg: 26, rate: 1.2, range: 195, chain: 4, slow: 0.45, slowDur: 1.6 },
  },
  barricade: {
    id: "barricade", name: "Barricade", glyph: "\u25ac", color: "#b9a06a", accent: "#ead9a8",
    cost: 40, unlockCost: 0, kind: "block",
    desc: "No gun. Zombies nearby stop to smash it instead of your wall.",
    base: { hp: 420, taunt: 120 },
  },
  medic: {
    id: "medic", name: "Medic Tent", glyph: "\u271a", color: "#59e0a0", accent: "#c9ffe4",
    cost: 220, unlockCost: 1000, kind: "heal",
    desc: "Patches the fortress wall back together, second by second.",
    base: { heal: 3.5, radius: 0 },
  },
};
const TOWER_IDS = Object.keys(TOWER_DEFS);

const ZOMBIE_DEFS = {
  walker: { id: "walker", name: "Walker", hp: 42, speed: 50, dmg: 9, rate: 0.9, scrap: 5, armor: 0, r: 15, color: "#7fbf6a", score: 10 },
  runner: { id: "runner", name: "Runner", hp: 26, speed: 115, dmg: 6, rate: 0.7, scrap: 4, armor: 0, r: 13, color: "#d9d15b", score: 14 },
  tank: { id: "tank", name: "Tank", hp: 300, speed: 30, dmg: 24, rate: 1.25, scrap: 16, armor: 4, r: 23, color: "#9aa08a", score: 30 },
  spitter: { id: "spitter", name: "Spitter", hp: 82, speed: 44, dmg: 8, rate: 1.7, scrap: 11, armor: 1, r: 16, color: "#79e08f", ranged: 265, score: 24 },
  screamer: { id: "screamer", name: "Screamer", hp: 135, speed: 40, dmg: 10, rate: 1.1, scrap: 18, armor: 2, r: 18, color: "#c06fd8", summon: 7, score: 34 },
  boss: { id: "boss", name: "Necro Behemoth", hp: 1450, speed: 28, dmg: 48, rate: 1.4, scrap: 160, armor: 12, r: 40, color: "#e0526b", boss: true, roar: 9, score: 200 },
  crawler: { id: "crawler", name: "Crawler", hp: 34, speed: 88, dmg: 7, rate: 0.75, scrap: 6, armor: 0, r: 12, color: "#b0c46a", low: true, score: 16 },
  brute: { id: "brute", name: "Brute", hp: 520, speed: 34, dmg: 34, rate: 1.1, scrap: 26, armor: 6, r: 26, color: "#c98b5a", score: 44 },
  bomber: { id: "bomber", name: "Bomber", hp: 96, speed: 58, dmg: 12, rate: 1.4, scrap: 14, armor: 1, r: 17, color: "#d8674a", explode: 70, score: 28 },
  shield: { id: "shield", name: "Shield", hp: 210, speed: 40, dmg: 18, rate: 1.0, scrap: 20, armor: 10, frontArmor: true, r: 19, color: "#8fa2c0", score: 32 },
};

const UPGRADES = [
  { id: "damage", name: "Ballistics", icon: "\u{1F4A5}", ds: "+6% tower damage", max: 10, cost: (l) => Math.round(45 * Math.pow(1.6, l)) },
  { id: "firerate", name: "Trigger Servos", icon: "\u{1F3AF}", ds: "+4% tower fire rate", max: 10, cost: (l) => Math.round(50 * Math.pow(1.6, l)) },
  { id: "range", name: "Optic Arrays", icon: "\u{1F52D}", ds: "+5% tower range", max: 8, cost: (l) => Math.round(55 * Math.pow(1.68, l)) },
  { id: "fhp", name: "Reinforced Walls", icon: "\u{1F6E1}", ds: "+60 fortress max HP", max: 10, cost: (l) => Math.round(40 * Math.pow(1.55, l)) },
  { id: "scrap", name: "Scavenger Crew", icon: "\u267B", ds: "+25 starting scrap", max: 8, cost: (l) => Math.round(35 * Math.pow(1.5, l)) },
  { id: "scrapgain", name: "Recycling Rig", icon: "\u{1F4E6}", ds: "+7% scrap from kills", max: 8, cost: (l) => Math.round(55 * Math.pow(1.6, l)) },
  { id: "gold", name: "War Chest", icon: "\u{1F4B0}", ds: "+12 starting gold", max: 5, cost: (l) => Math.round(60 * Math.pow(1.7, l)) },
  { id: "cooldown", name: "Command Uplink", icon: "\u{1F4E1}", ds: "-6% skill cooldown", max: 6, cost: (l) => Math.round(70 * Math.pow(1.75, l)) },
  { id: "regen", name: "Field Medics", icon: "\u{1F489}", ds: "+0.8 fortress HP/s", max: 5, cost: (l) => Math.round(80 * Math.pow(1.7, l)) },
  { id: "crit", name: "Weak-Point Scans", icon: "\u{1F480}", ds: "+3% crit chance (x2 dmg)", max: 6, cost: (l) => Math.round(90 * Math.pow(1.7, l)) },
];

const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Blood", icon: "\u{1FA78}", ds: "Kill your first zombie." },
  { id: "kills_100", name: "Cleanup Crew", icon: "\u{1F9F9}", ds: "Kill 100 zombies." },
  { id: "kills_1000", name: "Exterminator", icon: "\u{1F52B}", ds: "Kill 1,000 zombies." },
  { id: "kills_10000", name: "Pandemic Ended", icon: "\u2620", ds: "Kill 10,000 zombies." },
  { id: "wave_5", name: "Holding On", icon: "\u{1F6E1}", ds: "Survive to wave 5." },
  { id: "wave_10", name: "Last Commander", icon: "\u2694", ds: "Survive to wave 10." },
  { id: "wave_20", name: "Endless Horizon", icon: "\u{1F30C}", ds: "Survive to wave 20 and unlock Endless Mode." },
  { id: "boss_slay", name: "Behemoth Slayer", icon: "\u{1F451}", ds: "Take down your first boss." },
  { id: "flawless_10", name: "Not a Scratch", icon: "\u2728", ds: "Clear 10 waves without the fortress being hit." },
  { id: "all_towers", name: "Full Arsenal", icon: "\u{1F3F0}", ds: "Unlock every tower." },
  { id: "combo_50", name: "Untouchable", icon: "\u{1F525}", ds: "50 kills in a row before the fortress is touched." },
  { id: "rank_legend", name: "Living Legend", icon: "\u{1F31F}", ds: "Reach the Legend rank." },
  { id: "daily_done", name: "Daily Duty", icon: "\u{1F4C5}", ds: "Complete a Daily Challenge." },
  { id: "streak_7", name: "Week Survivor", icon: "\u{1F4AA}", ds: "Reach a 7-day login streak." },
  { id: "rich", name: "War Profiteer", icon: "\u{1F48E}", ds: "Hold 1,000 gold at once." },
  { id: "endless_30", name: "Apocalypse Now", icon: "\u{1F30B}", ds: "Reach wave 30." },
];

const RANKS = [
  { name: "Rookie", min: 0, color: "#8fa2c0" },
  { name: "Ace", min: 2500, color: "#57e08a" },
  { name: "Veteran", min: 8000, color: "#4aa8ff" },
  { name: "Legend", min: 20000, color: "#c08bff" },
  { name: "Apocalypse", min: 45000, color: "#ffb347" },
];
function rankFor(score) {
  let r = RANKS[0];
  for (const k of RANKS) if (score >= k.min) r = k;
  return r;
}

const DIFFICULTIES = {
  easy: { name: "Easy", hp: 0.8, speed: 0.92, count: 0.85, reward: 0.9 },
  normal: { name: "Normal", hp: 1, speed: 1, count: 1, reward: 1 },
  hard: { name: "Hard", hp: 1.25, speed: 1.08, count: 1.15, reward: 1.25 },
  nightmare: { name: "Nightmare", hp: 1.6, speed: 1.16, count: 1.3, reward: 1.6 },
};

const DAILY_CHALLENGES = [
  { id: "gunner_only", name: "Iron Wall", ds: "Clear wave 10 using only Gunners and Barricades.", target: 10, mods: { towers: ["gunner", "barricade"] } },
  { id: "sprint", name: "Outbreak Sprint", ds: "Zombies move 35% faster. Clear wave 10.", target: 10, mods: { zombieSpeed: 1.35 } },
  { id: "poverty", name: "Scrap Poverty", ds: "Start with half scrap and no skills. Clear wave 8.", target: 8, mods: { startScrap: 0.5, noSkills: true } },
  { id: "bossrush", name: "Behemoth Parade", ds: "A boss joins every wave. Clear wave 8.", target: 8, mods: { bossEvery: 1 } },
  { id: "fragile", name: "Paper Walls", ds: "The fortress has 50% HP. Clear wave 10.", target: 10, mods: { fhp: 0.5 } },
  { id: "rich", name: "Armed to the Teeth", ds: "Start with 400 scrap but zombies have +50% HP. Clear wave 12.", target: 12, mods: { startScrapFlat: 400, zombieHp: 1.5 } },
  { id: "purist", name: "No Upgrades", ds: "Towers cannot be upgraded. Clear wave 8.", target: 8, mods: { noTowerUpgrades: true } },
];

function dailyChallengeFor(key) {
  return DAILY_CHALLENGES[hashStr(key) % DAILY_CHALLENGES.length];
}
