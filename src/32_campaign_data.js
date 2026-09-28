/* =====================================================================
   v5 DATA - tower specializations (branching upgrades) + campaign.
   Specialization mods use multipliers (dmg/rate/range/aoe/burn/hp) and
   adders (crit/slowAdd/chainAdd/pierceAdd/thornsAdd).
   ===================================================================== */

const TOWER_SPECS = {
  gunner: { paths: [
    { id: "minigun", name: "Minigun", ds: "+70% fire rate, -25% damage.", mod: { rate: 1.70, dmg: 0.75 }, master: { name: "Lead Hose", ds: "+30% fire rate.", mod: { rate: 1.30 } } },
    { id: "marksman", name: "Marksman", ds: "+50% damage, +20% range, -15% rate.", mod: { dmg: 1.50, range: 1.20, rate: 0.85 }, master: { name: "Deadeye", ds: "+40% damage, +6% crit.", mod: { dmg: 1.40, crit: 0.06 } } },
  ] },
  shotgun: { paths: [
    { id: "breacher", name: "Breacher", ds: "+55% damage, -12% range.", mod: { dmg: 1.55, range: 0.88 }, master: { name: "Slug Rounds", ds: "+35% damage.", mod: { dmg: 1.35 } } },
    { id: "sweeper", name: "Sweeper", ds: "+35% fire rate, +15% range.", mod: { rate: 1.35, range: 1.15 }, master: { name: "Wide Choke", ds: "+30% fire rate.", mod: { rate: 1.30 } } },
  ] },
  sniper: { paths: [
    { id: "railgun", name: "Railgun", ds: "+55% damage, +30% range, +2 pierce.", mod: { dmg: 1.55, range: 1.30, pierceAdd: 2 }, master: { name: "Overpenetration", ds: "+3 pierce, +20% damage.", mod: { pierceAdd: 3, dmg: 1.20 } } },
    { id: "executioner", name: "Executioner", ds: "+40% damage, +12% crit.", mod: { dmg: 1.40, crit: 0.12 }, master: { name: "Headhunter", ds: "+45% damage, +5% crit.", mod: { dmg: 1.45, crit: 0.05 } } },
  ] },
  flamethrower: { paths: [
    { id: "inferno", name: "Inferno", ds: "+35% damage, +25% range.", mod: { dmg: 1.35, range: 1.25 }, master: { name: "White Phosphor", ds: "+45% damage.", mod: { dmg: 1.45 } } },
    { id: "napalm", name: "Napalm", ds: "+20% rate, +80% burn.", mod: { rate: 1.20, burn: 1.80 }, master: { name: "Sticky Fire", ds: "+35% damage.", mod: { dmg: 1.35 } } },
  ] },
  tesla: { paths: [
    { id: "storm", name: "Storm Coil", ds: "+2 chain, +18% damage.", mod: { chainAdd: 2, dmg: 1.18 }, master: { name: "Chain Reaction", ds: "+2 chain, +25% damage.", mod: { chainAdd: 2, dmg: 1.25 } } },
    { id: "stasis", name: "Stasis Field", ds: "+20% slow, +25% range.", mod: { slowAdd: 0.20, range: 1.25 }, master: { name: "Time Lock", ds: "+2 chain, +15% damage.", mod: { chainAdd: 2, dmg: 1.15 } } },
  ] },
  barricade: { paths: [
    { id: "bunker", name: "Bunker", ds: "+90% wall HP.", mod: { hp: 1.90 }, master: { name: "Reinforced Bunker", ds: "+60% wall HP.", mod: { hp: 1.60 } } },
    { id: "barbed", name: "Barbed Wall", ds: "+45% HP, attackers take 18 damage.", mod: { hp: 1.45, thornsAdd: 18 }, master: { name: "Razor Barbs", ds: "+14 thorns, +30% HP.", mod: { thornsAdd: 14, hp: 1.30 } } },
  ] },
  medic: { paths: [
    { id: "hospital", name: "Field Hospital", ds: "+70% healing, +40% HP.", mod: { dmg: 1.70, hp: 1.40 }, master: { name: "Trauma Ward", ds: "+50% healing.", mod: { dmg: 1.50 } } },
    { id: "triage", name: "Triage Post", ds: "+30% healing, +250 HP.", mod: { dmg: 1.30, hp: 2.0 }, master: { name: "MASH Unit", ds: "+40% healing.", mod: { dmg: 1.40 } } },
  ] },
  mortar: { paths: [
    { id: "siege", name: "Siege Mortar", ds: "+50% blast radius, +20% damage.", mod: { aoe: 1.50, dmg: 1.20 }, master: { name: "Earthshaker", ds: "+35% damage.", mod: { dmg: 1.35 } } },
    { id: "rapid", name: "Rapid Sling", ds: "+65% fire rate, -20% damage.", mod: { rate: 1.65, dmg: 0.80, aoe: 0.9 }, master: { name: "Autoloader", ds: "+30% fire rate.", mod: { rate: 1.30 } } },
  ] },
  cryo: { paths: [
    { id: "deepfreeze", name: "Deep Freeze", ds: "+22% slow, +25% range.", mod: { slowAdd: 0.22, range: 1.25 }, master: { name: "Absolute Zero", ds: "+25% damage, +10% slow.", mod: { dmg: 1.25, slowAdd: 0.10 } } },
    { id: "shatter", name: "Shatter Field", ds: "+70% damage.", mod: { dmg: 1.70 }, master: { name: "Cryo Shatter", ds: "+18% slow, +30% damage.", mod: { slowAdd: 0.18, dmg: 1.30 } } },
  ] },
  laser: { paths: [
    { id: "prism", name: "Prism Array", ds: "+25% range, +25% rate.", mod: { range: 1.25, rate: 1.25 }, master: { name: "Diffraction", ds: "+35% damage.", mod: { dmg: 1.35 } } },
    { id: "lance", name: "Lance", ds: "+75% damage, -12% rate.", mod: { dmg: 1.75, rate: 0.88 }, master: { name: "Photon Lance", ds: "+45% damage.", mod: { dmg: 1.45 } } },
  ] },
};

/* ---- campaign: 3 chapters x 4 missions, unlocked in order ----------- */
const CAMPAIGN_CHAPTERS = [
  { id: 1, name: "Chapter I \u2014 Outskirts", ds: "The first barricades. Learn the field." },
  { id: 2, name: "Chapter II \u2014 The City", ds: "Deeper in. Harder weather, harder horde." },
  { id: 3, name: "Chapter III \u2014 The Hive", ds: "Cut the head off the outbreak." },
];
const CAMPAIGN_MISSIONS = [
  { id: "c1m1", chapter: 1, name: "First Light", ds: "Hold the line for 5 waves.", target: 5, mods: {}, reward: { gold: 120, research: 1 } },
  { id: "c1m2", chapter: 1, name: "Scrap Run", ds: "You start with extra scrap. Hold 7 waves.", target: 7, mods: { startScrapFlat: 250 }, reward: { gold: 160, research: 1 } },
  { id: "c1m3", chapter: 1, name: "Small Arms Only", ds: "Gunners and Barricades only. Hold 8 waves.", target: 8, mods: { towers: ["gunner", "barricade"] }, reward: { gold: 220, research: 2 } },
  { id: "c1m4", chapter: 1, name: "Ash Fog", ds: "Ash Fog cuts your range. Hold 10 waves.", target: 10, mods: { weather: "fog" }, reward: { gold: 300, research: 2 } },
  { id: "c2m1", chapter: 2, name: "Behemoth", ds: "Bosses join every wave. Hold 10 waves.", target: 10, mods: { bossEvery: 1 }, reward: { gold: 380, research: 2 } },
  { id: "c2m2", chapter: 2, name: "Frenzy", ds: "Zombies move 25% faster. Hold 12 waves.", target: 12, mods: { zombieSpeed: 1.25 }, reward: { gold: 420, research: 3 } },
  { id: "c2m3", chapter: 2, name: "Blood Storm", ds: "A blood storm rolls in. Hold 12 waves.", target: 12, mods: { weather: "storm" }, reward: { gold: 480, research: 3 } },
  { id: "c2m4", chapter: 2, name: "No Upgrades", ds: "Towers cannot be upgraded. Hold 12 waves.", target: 12, mods: { noTowerUpgrades: true, startScrapFlat: 400 }, reward: { gold: 560, research: 3 } },
  { id: "c3m1", chapter: 3, name: "Swarm", ds: "The horde is tougher (+35% HP). Hold 15 waves.", target: 15, mods: { zombieHp: 1.35 }, reward: { gold: 650, research: 4 } },
  { id: "c3m2", chapter: 3, name: "Paper Walls", ds: "The fortress has 60% HP. Hold 15 waves.", target: 15, mods: { fhp: 0.6 }, reward: { gold: 720, research: 4 } },
  { id: "c3m3", chapter: 3, name: "Blackout", ds: "Tougher zombies, more starting scrap. Hold 18 waves.", target: 18, mods: { startScrapFlat: 500, zombieHp: 1.45 }, reward: { gold: 820, research: 4 } },
  { id: "c3m4", chapter: 3, name: "Last Stand", ds: "The outbreak at full strength. Hold 20 waves.", target: 20, mods: { zombieHp: 1.5, zombieSpeed: 1.15 }, reward: { gold: 1200, research: 6, relic: "apocalypse_sigil" } },
];
