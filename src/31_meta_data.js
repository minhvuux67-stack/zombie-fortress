/* =====================================================================
   META DATA (v3) - heroes, relics, research, camp, survivors, codex,
   quests, battle pass, prestige, mutations, synergies, seasons.
   Pure data; every system in 55_meta_systems.js reads from here.
   ===================================================================== */

/* hero roster - each hero changes how a run plays ---------------------- */
const HERO_DEFS = {
  commander: {
    id: "commander", name: "Commander", unlockCost: 0,
    role: "Balanced front-line officer. Extra starting scrap and a sturdier wall.",
    color: "#57e08a", icon: "ui/icon_star",
    stats: { scrap: 60, fhp: 120, dmg: 1.0, rate: 1.0, speed: 1.0 },
    passive: "+60 starting scrap, +120 fortress HP.",
  },
  engineer: {
    id: "engineer", name: "Engineer", unlockCost: 600,
    role: "Tower specialist. Cheaper builds and faster repairs.",
    color: "#4ae0ff", icon: "ui/skill_repair",
    stats: { scrap: 0, fhp: 0, dmg: 1.05, rate: 1.05, speed: 1.0, costMul: 0.9, regen: 1.5 },
    passive: "Towers cost 10% less, +1.5 fortress HP/s.",
  },
  marksman: {
    id: "marksman", name: "Marksman", unlockCost: 900,
    role: "Precision damage dealer with a higher crit chance.",
    color: "#ff9b4a", icon: "ui/skill_airstrike",
    stats: { scrap: 20, fhp: 0, dmg: 1.12, rate: 0.96, speed: 1.0, crit: 0.10 },
    passive: "+12% tower damage, +10% crit chance.",
  },
  warlord: {
    id: "warlord", name: "Warlord", unlockCost: 1400,
    role: "Aggressive. Skills recharge faster and hit harder.",
    color: "#e0526b", icon: "ui/skill_rage",
    stats: { scrap: 40, fhp: 60, dmg: 1.06, rate: 1.02, speed: 1.0, cooldown: 0.75 },
    passive: "Skill cooldowns -25%, +6% damage.",
  },
  guardian: {
    id: "guardian", name: "Guardian", unlockCost: 2000,
    role: "Defensive turtle. Massive wall, self-healing, slower start.",
    color: "#c08bff", icon: "ui/icon_meds",
    stats: { scrap: -20, fhp: 420, dmg: 0.94, rate: 1.0, speed: 1.0, regen: 3.0 },
    passive: "+420 fortress HP and +3 HP/s regen, but 20 less starting scrap.",
  },
};

/* relics - collected from boss kills / quests, equip up to 3 ---------- */
const RELIC_DEFS = {
  iron_scrap: { id: "iron_scrap", name: "Iron Scrap", rarity: "common", icon: "ui/icon_scrap", ds: "+8% scrap from every kill.", mod: { scrapGain: 1.08 } },
  oil_can: { id: "oil_can", name: "Oil Can", rarity: "common", icon: "ui/icon_food", ds: "+6% tower fire rate.", mod: { rate: 1.06 } },
  target_scope: { id: "target_scope", name: "Target Scope", rarity: "common", icon: "ui/skill_airstrike", ds: "+8% tower range.", mod: { range: 1.08 } },
  hollow_point: { id: "hollow_point", name: "Hollow Point", rarity: "rare", icon: "ui/icon_skull", ds: "+10% damage, +4% crit.", mod: { dmg: 1.10, crit: 0.04 } },
  medkit_stash: { id: "medkit_stash", name: "Medkit Stash", rarity: "rare", icon: "ui/skill_medkit", ds: "+2 fortress HP/s.", mod: { regen: 2 } },
  war_chest: { id: "war_chest", name: "War Chest", rarity: "rare", icon: "ui/icon_gold", ds: "+20 starting scrap, +10 starting gold.", mod: { startScrap: 20, startGold: 10 } },
  command_uplink: { id: "command_uplink", name: "Command Uplink", rarity: "rare", icon: "ui/skill_freeze", ds: "Skill cooldowns -12%.", mod: { cooldown: 0.88 } },
  reinforced_plate: { id: "reinforced_plate", name: "Reinforced Plate", rarity: "rare", icon: "ui/icon_lock", ds: "+180 fortress HP.", mod: { fhp: 180 } },
  lucky_charm: { id: "lucky_charm", name: "Lucky Charm", rarity: "epic", icon: "ui/icon_star", ds: "+18% scrap, +5% crit.", mod: { scrapGain: 1.18, crit: 0.05 } },
  tesla_core: { id: "tesla_core", name: "Tesla Core", rarity: "epic", icon: "ui/skill_freeze", ds: "+14% fire rate, -10% cooldown.", mod: { rate: 1.14, cooldown: 0.90 } },
  necrotic_heart: { id: "necrotic_heart", name: "Necrotic Heart", rarity: "epic", icon: "ui/icon_skull", ds: "+16% damage but -8% fortress HP.", mod: { dmg: 1.16, fhp: -100 } },
  titan_shell: { id: "titan_shell", name: "Titan Shell", rarity: "legendary", icon: "ui/icon_lock", ds: "+400 fortress HP, +3 HP/s.", mod: { fhp: 400, regen: 3 } },
  apocalypse_sigil: { id: "apocalypse_sigil", name: "Apocalypse Sigil", rarity: "legendary", icon: "ui/icon_skull", ds: "+22% damage, +20% scrap.", mod: { dmg: 1.22, scrapGain: 1.20 } },
  chrono_capacitor: { id: "chrono_capacitor", name: "Chrono Capacitor", rarity: "legendary", icon: "ui/skill_freeze", ds: "Skill cooldowns -25%, +10% rate.", mod: { cooldown: 0.75, rate: 1.10 } },
  bulwark_charm: { id: "bulwark_charm", name: "Bulwark Charm", rarity: "legendary", icon: "ui/icon_star", ds: "+500 fortress HP, +25% scrap.", mod: { fhp: 500, scrapGain: 1.25 } },
  plague_mask: { id: "plague_mask", name: "Plague Mask", rarity: "epic", icon: "ui/icon_meds", ds: "+2 meds and +1 food per wave.", mod: { waveFood: 1, waveMeds: 2 } },
  cryo_cell: { id: "cryo_cell", name: "Cryo Cell", rarity: "rare", icon: "ui/skill_freeze", ds: "+8% fire rate, +2 fortress HP/s.", mod: { rate: 1.08, regen: 2 } },
  splicing_serum: { id: "splicing_serum", name: "Splicing Serum", rarity: "epic", icon: "ui/icon_skull", ds: "+14% damage, +6% crit.", mod: { dmg: 1.14, crit: 0.06 } },
};
const RELIC_RARITY_COLOR = { common: "#8fa2c0", rare: "#4aa8ff", epic: "#c08bff", legendary: "#ffb347" };

/* research tree - spend research points earned from waves/quests ------- */
const RESEARCH_NODES = {
  root: { id: "root", name: "Command Core", tier: 0, cost: 0, req: [], ds: "Unlocks the research tree.", mod: {} },
  ballistics1: { id: "ballistics1", name: "Ballistics I", tier: 1, cost: 1, req: ["root"], ds: "+5% tower damage.", mod: { dmg: 1.05 } },
  logistics1: { id: "logistics1", name: "Logistics I", tier: 1, cost: 1, req: ["root"], ds: "+10% scrap.", mod: { scrapGain: 1.10 } },
  masonry1: { id: "masonry1", name: "Masonry I", tier: 1, cost: 1, req: ["root"], ds: "+150 fortress HP.", mod: { fhp: 150 } },
  ballistics2: { id: "ballistics2", name: "Ballistics II", tier: 2, cost: 2, req: ["ballistics1"], ds: "+8% damage.", mod: { dmg: 1.08 } },
  servos: { id: "servos", name: "Servo Motors", tier: 2, cost: 2, req: ["ballistics1"], ds: "+7% fire rate.", mod: { rate: 1.07 } },
  optics: { id: "optics", name: "Optic Arrays", tier: 2, cost: 2, req: ["logistics1"], ds: "+8% range.", mod: { range: 1.08 } },
  salvage: { id: "salvage", name: "Salvage Rig", tier: 2, cost: 2, req: ["logistics1"], ds: "+15% scrap.", mod: { scrapGain: 1.15 } },
  medbay: { id: "medbay", name: "Field Medbay", tier: 2, cost: 2, req: ["masonry1"], ds: "+2 fortress HP/s.", mod: { regen: 2 } },
  fortify: { id: "fortify", name: "Fortification", tier: 3, cost: 3, req: ["masonry1", "medbay"], ds: "+300 fortress HP.", mod: { fhp: 300 } },
  targeting: { id: "targeting", name: "Weak-Point Scans", tier: 3, cost: 3, req: ["ballistics2", "optics"], ds: "+6% crit.", mod: { crit: 0.06 } },
  command: { id: "command", name: "Command Uplink", tier: 3, cost: 3, req: ["servos", "salvage"], ds: "-12% cooldowns.", mod: { cooldown: 0.88 } },
  arsenal: { id: "arsenal", name: "Total Arsenal", tier: 4, cost: 5, req: ["targeting", "fortify", "command"], ds: "+15% damage, +10% rate.", mod: { dmg: 1.15, rate: 1.10 } },
};

/* camp buildings - idle material generation + small permanent buffs ---- */
const CAMP_BUILDINGS = {
  workshop: { id: "workshop", name: "Workshop", icon: "ui/icon_scrap", maxLevel: 5, cost: (l) => ({ metal: 20 + l * 25, wood: 10 + l * 10 }), ds: "+4% tower damage per level.", mod: (l) => ({ dmg: 1 + 0.04 * l }) },
  farm: { id: "farm", name: "Ration Farm", icon: "ui/icon_food", maxLevel: 5, cost: (l) => ({ wood: 25 + l * 20, food: 10 + l * 8 }), ds: "+1 food per wave per level.", mod: (l) => ({ waveFood: l }) },
  clinic: { id: "clinic", name: "Field Clinic", icon: "ui/icon_meds", maxLevel: 5, cost: (l) => ({ metal: 15 + l * 18, food: 12 + l * 6 }), ds: "+1 med per wave per level.", mod: (l) => ({ waveMeds: l }) },
  barracks: { id: "barracks", name: "Barracks", icon: "ui/icon_skull", maxLevel: 5, cost: (l) => ({ metal: 30 + l * 30, wood: 20 + l * 14 }), ds: "+30 fortress HP per level.", mod: (l) => ({ fhp: 30 * l }) },
  lab: { id: "lab", name: "Research Lab", icon: "ui/skill_repair", maxLevel: 5, cost: (l) => ({ metal: 40 + l * 35, wood: 25 + l * 18 }), ds: "+1 research point every 5 waves per level.", mod: (l) => ({ researchRate: l }) },
  depot: { id: "depot", name: "Supply Depot", icon: "ui/icon_gold", maxLevel: 5, cost: (l) => ({ metal: 35 + l * 28, wood: 22 + l * 16 }), ds: "+8 starting scrap per level.", mod: (l) => ({ startScrap: 8 * l }) },
};

/* survivors - recruitable helpers with quests -------------------------- */
const SURVIVOR_DEFS = {
  scout: { id: "scout", name: "Scout Riley", cost: { food: 25, metal: 10 }, ds: "Reveals the next wave composition.", perk: { intel: 1 } },
  medic: { id: "medic", name: "Nurse Dana", cost: { meds: 20, food: 20 }, ds: "+1 fortress HP/s.", perk: { regen: 1 } },
  gunner: { id: "gunner", name: "Gunner Bo", cost: { metal: 30, food: 15 }, ds: "+3% tower damage.", perk: { dmg: 1.03 } },
  forager: { id: "forager", name: "Forager Kai", cost: { food: 35 }, ds: "+12% scrap from kills.", perk: { scrapGain: 1.12 } },
  tinker: { id: "tinker", name: "Tinker Vi", cost: { metal: 45 }, ds: "+5% fire rate.", perk: { rate: 1.05 } },
  sniper: { id: "sniper", name: "Sniper Ash", cost: { metal: 40, gold: 120 }, ds: "+8% range.", perk: { range: 1.08 } },
  pyromaniac: { id: "pyromaniac", name: "Pyro Zeke", cost: { metal: 35, meds: 15 }, ds: "+6% damage.", perk: { dmg: 1.06 } },
  veteran: { id: "veteran", name: "Veteran Mo", cost: { gold: 300 }, ds: "+200 fortress HP.", perk: { fhp: 200 } },
};

/* codex entries - unlocked by playing / discovering -------------------- */
const CODEX_ENTRIES = [
  { id: "z_walker", cat: "Bestiary", name: "Walker", ds: "Standard infected. Slow and weak, but they never stop coming." },
  { id: "z_runner", cat: "Bestiary", name: "Runner", ds: "Emaciated sprinter. Reaches the wall before your first tower spins up." },
  { id: "z_tank", cat: "Bestiary", name: "Tank", ds: "Bloated host with thick hide. Bring armour-piercing rounds." },
  { id: "z_spitter", cat: "Bestiary", name: "Spitter", ds: "Ranged attacker. Lobs acid that eats towers and walls." },
  { id: "z_screamer", cat: "Bestiary", name: "Screamer", ds: "Calls fresh walkers to the field while it lives." },
  { id: "z_brute", cat: "Bestiary", name: "Brute", ds: "Muscle-bound bruiser that swings a crowbar into your barricades." },
  { id: "z_crawler", cat: "Bestiary", name: "Crawler", ds: "Legless and low. Standard shots sail right over it." },
  { id: "z_bomber", cat: "Bestiary", name: "Bomber", ds: "Detonates on death. Keep it away from your firing line." },
  { id: "z_shield", cat: "Bestiary", name: "Shield", ds: "Carries a manhole cover. Frontal shots glance off." },
  { id: "z_boss", cat: "Bestiary", name: "Necro Behemoth", ds: "Apex infected. Roars to enrage the horde and summons reinforcements." },
  { id: "t_gunner", cat: "Arsenal", name: "Gunner", ds: "Cheap automatic turret. The backbone of any defence." },
  { id: "t_shotgun", cat: "Arsenal", name: "Shotgun", ds: "Wide pellets that shred tight packs at close range." },
  { id: "t_sniper", cat: "Arsenal", name: "Sniper", ds: "Extreme range, piercing shots that cross whole lanes." },
  { id: "t_flamethrower", cat: "Arsenal", name: "Flamethrower", ds: "Cone of fire that leaves zombies burning." },
  { id: "t_tesla", cat: "Arsenal", name: "Tesla Coil", ds: "Chain lightning that slows everything it touches." },
  { id: "t_barricade", cat: "Arsenal", name: "Barricade", ds: "A wall that taunts nearby zombies into stopping to smash it." },
  { id: "t_medic", cat: "Arsenal", name: "Medic Tent", ds: "Slowly patches the fortress wall back together." },
  { id: "w_rain", cat: "Weather", name: "Acid Rain", ds: "Reduces tower range and fire rate while it lasts." },
  { id: "w_fog", cat: "Weather", name: "Ash Fog", ds: "Thick ash cuts visibility and accuracy." },
  { id: "m_horde", cat: "Mutations", name: "Horde Surge", ds: "A wave mutation that doubles the count at lower HP." },
  { id: "m_frenzy", cat: "Mutations", name: "Frenzy", ds: "Zombies move faster but take more damage." },
  { id: "s_adjacent", cat: "Synergies", name: "Overwatch Net", ds: "Two Gunners side by side gain +15% fire rate." },
  { id: "s_firestorm", cat: "Synergies", name: "Firestorm", ds: "Flamethrower next to a Tesla adds burn to every arc." },
  { id: "z_splitter", cat: "Bestiary", name: "Splitter", ds: "Bloated carrier. Bursts open into two runners when it dies." },
  { id: "z_healer", cat: "Bestiary", name: "Mender", ds: "Pulses healing ichor that mends every zombie near it. Kill it first." },
  { id: "z_colossus", cat: "Bestiary", name: "Hive Colossus", ds: "Living nest. Slams the ground and hatches crawlers while it lives." },
  { id: "t_mortar", cat: "Arsenal", name: "Mortar", ds: "Lobs explosive shells that splash a whole cluster at long range." },
  { id: "t_cryo", cat: "Arsenal", name: "Cryo Coil", ds: "Freezing aura that slows and chips every zombie caught inside it." },
  { id: "t_laser", cat: "Arsenal", name: "Laser Prism", ds: "Piercing beam that cuts through every zombie in a straight line." },
  { id: "proto_core", cat: "Protocols", name: "Mutation Protocol", ds: "Between waves the lab offers a choice of permanent run mutations. Stack them to build a broken fortress." },
  { id: "p_rank", cat: "Command", name: "Fortress Ranks", ds: "Rookie to Apocalypse - your career score determines your rank." },
];
const CODEX_CATS = ["Bestiary", "Arsenal", "Protocols", "Weather", "Mutations", "Synergies", "Command"];

/* quest pools ---------------------------------------------------------- */
const QUEST_POOLS = {
  daily: [
    { id: "d_kill300", name: "Cull the Horde", ds: "Kill 300 zombies in one run.", target: 300, stat: "kills", reward: { gold: 60, research: 1 } },
    { id: "d_wave8", name: "Hold the Line", ds: "Clear wave 8.", target: 8, stat: "waves", reward: { gold: 70, scrap: 120 } },
    { id: "d_build12", name: "Fortify", ds: "Build 12 towers in one run.", target: 12, stat: "builds", reward: { gold: 55, material: 15 } },
    { id: "d_combo40", name: "Untouched", ds: "Reach a 40 kill combo.", target: 40, stat: "combo", reward: { gold: 65, research: 1 } },
  ],
  weekly: [
    { id: "w_wave20", name: "Apocalypse Run", ds: "Clear wave 20 in a single run.", target: 20, stat: "waves", reward: { gold: 300, research: 3 } },
    { id: "w_kill5000", name: "Pandemic Response", ds: "Kill 5,000 zombies this week.", target: 5000, stat: "killsTotal", reward: { gold: 320, research: 3 } },
    { id: "w_boss5", name: "Behemoth Cull", ds: "Kill 5 bosses this week.", target: 5, stat: "bossesTotal", reward: { gold: 280, research: 2 } },
  ],
  story: [
    { id: "st_1", name: "Chapter I - First Contact", ds: "Reach wave 5.", target: 5, stat: "highestWave", reward: { gold: 100, research: 1 } },
    { id: "st_2", name: "Chapter II - Endless Night", ds: "Reach wave 20.", target: 20, stat: "highestWave", reward: { gold: 250, research: 2 } },
    { id: "st_3", name: "Chapter III - Prestige", ds: "Prestige once.", target: 1, stat: "prestigeLevel", reward: { gold: 400, research: 3 } },
  ],
};

/* battle pass - 10 free tiers per season, earn pass XP ------------- */
const BATTLEPASS_TIERS = [
  { tier: 1, xp: 100, reward: { gold: 50 } },
  { tier: 2, xp: 250, reward: { research: 1 } },
  { tier: 3, xp: 450, reward: { material: 25 } },
  { tier: 4, xp: 700, reward: { relic: "hollow_point" } },
  { tier: 5, xp: 1000, reward: { gold: 200 } },
  { tier: 6, xp: 1350, reward: { research: 2 } },
  { tier: 7, xp: 1750, reward: { relic: "tesla_core" } },
  { tier: 8, xp: 2200, reward: { gold: 350 } },
  { tier: 9, xp: 2700, reward: { relic: "titan_shell" } },
  { tier: 10, xp: 3300, reward: { relic: "apocalypse_sigil", gold: 500 } },
];

/* prestige - reset permanent progress for lasting multipliers --------- */
const PRESTIGE_MODS = [
  { id: "p_dmg", name: "Veteran Ballistics", cost: 1, ds: "+5% damage, permanently.", mod: { dmg: 1.05 } },
  { id: "p_scrap", name: "Wartime Economy", cost: 1, ds: "+10% scrap, permanently.", mod: { scrapGain: 1.10 } },
  { id: "p_fhp", name: "Concrete Legacy", cost: 1, ds: "+200 fortress HP.", mod: { fhp: 200 } },
  { id: "p_rate", name: "Mass Production", cost: 2, ds: "+6% fire rate.", mod: { rate: 1.06 } },
  { id: "p_crit", name: "Killing Blow", cost: 2, ds: "+5% crit.", mod: { crit: 0.05 } },
  { id: "p_cd", name: "Rapid Command", cost: 2, ds: "-12% skill cooldowns.", mod: { cooldown: 0.88 } },
];

/* wave mutations - rolled each wave for variety ----------------------- */
const MUTATIONS = [
  { id: "none", name: "Clear Skies", ds: "No mutation this wave.", w: 30, mod: {} },
  { id: "horde", name: "Horde Surge", ds: "+60% zombies, -20% HP.", w: 16, mod: { count: 1.6, hp: 0.8 } },
  { id: "frenzy", name: "Frenzy", ds: "Zombies +30% speed, +25% damage taken.", w: 16, mod: { speed: 1.3, vuln: 1.25 } },
  { id: "armored", name: "Hardened", ds: "+40% HP, -15% speed.", w: 14, mod: { hp: 1.4, speed: 0.85 } },
  { id: "swarm", name: "Endless Swarm", ds: "Two lanes spawn at once, -25% HP.", w: 10, mod: { count: 1.35, hp: 0.75, multiLane: true } },
  { id: "bounty", name: "Bounty", ds: "Double scrap, but zombies hit harder.", w: 8, mod: { scrap: 2, dmg: 1.25 } },
  { id: "elite", name: "Elite Guard", ds: "A mini-boss joins the wave.", w: 6, mod: { elite: true } },
];

/* tower synergies - adjacency bonuses --------------------------------- */
const SYNERGIES = [
  { id: "overwatch", name: "Overwatch Net", towers: ["gunner", "gunner"], ds: "+15% fire rate.", mod: { rate: 1.15 } },
  { id: "crossfire", name: "Crossfire", towers: ["gunner", "sniper"], ds: "+12% range.", mod: { range: 1.12 } },
  { id: "firestorm", name: "Firestorm", towers: ["flamethrower", "tesla"], ds: "+20% damage.", mod: { dmg: 1.20 } },
  { id: "bunker", name: "Bunker Line", towers: ["barricade", "gunner"], ds: "+25% fire rate.", mod: { rate: 1.25 } },
  { id: "hospital", name: "Field Hospital", towers: ["medic", "barricade"], ds: "+40 fortress HP/s while medic lives.", mod: { regen: 40 } },
  { id: "artillery", name: "Artillery Park", towers: ["shotgun", "shotgun"], ds: "+18% damage.", mod: { dmg: 1.18 } },
];

/* weather - active during runs, changes gameplay ---------------------- */
const WEATHER_DEFS = {
  clear: { id: "clear", name: "Clear", ds: "No weather effect.", mod: {} },
  rain: { id: "rain", name: "Acid Rain", ds: "-8% range, -6% fire rate.", mod: { range: 0.92, rate: 0.94 }, fx: "rain" },
  fog: { id: "fog", name: "Ash Fog", ds: "-10% range, zombies +5% speed.", mod: { range: 0.90, zombieSpeed: 1.05 }, fx: "fog" },
  storm: { id: "storm", name: "Blood Storm", ds: "-12% range, +10% damage, lightning visuals.", mod: { range: 0.88, dmg: 1.10 }, fx: "storm" },
  clear_night: { id: "clear_night", name: "Nightfall", ds: "Darker field, +6% damage.", mod: { dmg: 1.06 }, fx: "night" },
};
const SEASONS = [
  { id: 1, name: "Season of Ash", ds: "The first season of Pandemic Defense." },
  { id: 2, name: "Season of Rust", ds: "Corroded hordes and bounty waves." },
  { id: 3, name: "Season of Frost", ds: "Freezing nights and frozen lanes." },
  { id: 4, name: "Season of Blood", ds: "The blood moon rises." },
];

/* helpers -------------------------------------------------------------- */
function relicsByRarity() {
  const out = { common: [], rare: [], epic: [], legendary: [] };
  for (const id in RELIC_DEFS) out[RELIC_DEFS[id].rarity].push(id);
  return out;
}
function researchTier(nodes) { return Object.values(RESEARCH_NODES).filter((n) => n.tier === nodes); }
