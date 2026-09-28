/* =====================================================================
   v6 "HANH TRINH CHI HUY" DATA - commander levels, daily mission board,
   per-run bounties and collection milestones. Pure data + helpers.
   ===================================================================== */

/* ---- commander account level: always goes up, never resets ---------- */
const COMMANDER_TITLES = [
  { lv: 1, name: "Rookie" }, { lv: 5, name: "Sergeant" }, { lv: 10, name: "Captain" },
  { lv: 20, name: "Major" }, { lv: 35, name: "Colonel" }, { lv: 50, name: "Commander" },
  { lv: 75, name: "Warlord" }, { lv: 100, name: "Legend" },
];
function commanderTitle(level) { let t = COMMANDER_TITLES[0]; for (const x of COMMANDER_TITLES) if (level >= x.lv) t = x; return t.name; }
function commanderXpFor(level) { return Math.round(400 * Math.pow(1.16, level - 1)); }
function commanderReward(level) {
  const out = { gold: 40 + level * 12 };
  if (level % 2 === 0) out.research = 1;
  if (level % 5 === 0) out.material = 30 + level * 4;
  if (level % 10 === 0) out.relic = true;
  return out;
}
function commanderRewardText(r) {
  const p = [];
  if (r.gold) p.push("+" + r.gold + " gold");
  if (r.research) p.push("+" + r.research + " research");
  if (r.material) p.push("+" + r.material + " supplies");
  if (r.relic) p.push("a relic");
  return p.join(", ");
}

/* ---- daily mission board: 3 tasks + a completion chest ------------- */
const DAILY_MISSIONS = [
  { id: "dm_kill200", name: "Cull the Horde", ds: "Kill 200 zombies today.", stat: "kills", target: 200, reward: { gold: 80 } },
  { id: "dm_wave15", name: "Hold the Line", ds: "Clear 15 waves today.", stat: "waves", target: 15, reward: { gold: 90 } },
  { id: "dm_build20", name: "Fortify", ds: "Build 20 towers today.", stat: "builds", target: 20, reward: { gold: 70, scrap: 80 } },
  { id: "dm_gold800", name: "War Chest", ds: "Earn 800 gold today.", stat: "goldEarned", target: 800, reward: { research: 1 } },
  { id: "dm_mission2", name: "Campaign Veteran", ds: "Clear 2 campaign missions today.", stat: "missions", target: 2, reward: { gold: 130, research: 1 } },
  { id: "dm_boss4", name: "Behemoth Cull", ds: "Kill 4 bosses today.", stat: "bosses", target: 4, reward: { gold: 110 } },
  { id: "dm_combo60", name: "Untouchable", ds: "Reach a 60 kill combo today.", stat: "combo", target: 60, reward: { gold: 100, research: 1 } },
  { id: "dm_mission1", name: "Campaign Duty", ds: "Complete 1 campaign mission today.", stat: "missions", target: 1, reward: { gold: 150 } },
];
const DAILY_CHEST = { gold: 250, research: 2, material: 40 };

/* ---- per-run bounties: variable reward + a purpose for every run ---- */
const BOUNTIES = [
  { id: "b_hunter", name: "Headhunter", ds: "Kill 120 zombies this run.", stat: "kills", target: 120, reward: { gold: 80 } },
  { id: "b_architect", name: "Master Builder", ds: "Build 8 towers this run.", stat: "builds", target: 8, reward: { gold: 70 } },
  { id: "b_walls", name: "Wall of Steel", ds: "Have 5 towers standing at once.", stat: "towerCount", target: 5, reward: { gold: 70 } },
  { id: "b_unbroken", name: "Unbroken", ds: "Clear 4 waves without the fortress being hit.", stat: "noHitStreak", target: 4, reward: { gold: 110 } },
  { id: "b_boss", name: "Behemoth Bane", ds: "Kill a boss this run.", stat: "bosses", target: 1, reward: { gold: 140 } },
  { id: "b_combo", name: "Killing Spree", ds: "Reach a 50 kill combo.", stat: "combo", target: 50, reward: { gold: 100 } },
  { id: "b_spender", name: "Big Spender", ds: "Spend 600 scrap this run.", stat: "scrapSpent", target: 600, reward: { gold: 80 } },
  { id: "b_skills", name: "Field Commander", ds: "Use 3 skills this run.", stat: "skills", target: 3, reward: { gold: 70 } },
  { id: "b_waves", name: "Line Holder", ds: "Clear 12 waves this run.", stat: "waves", target: 12, reward: { gold: 120 } },
  { id: "b_scavenger", name: "Scavenger", ds: "Earn 500 scrap this run.", stat: "scrapEarned", target: 500, reward: { gold: 70 } },
];
const BOUNTY_XP = 40;

/* ---- collection milestones: completionism with a payout ------------- */
const COLLECTION_MILESTONES = [
  { id: "c_bestiary_half", name: "Field Notes", ds: "Unlock half the Bestiary.", check: (st) => codexCount(st, "Bestiary") >= Math.ceil(CODEX_ENTRIES.filter((e) => e.cat === "Bestiary").length / 2), reward: { gold: 180, research: 1 } },
  { id: "c_bestiary_all", name: "Monster Manual", ds: "Unlock every Bestiary entry.", check: (st) => codexCount(st, "Bestiary") >= CODEX_ENTRIES.filter((e) => e.cat === "Bestiary").length, reward: { gold: 400, research: 2 } },
  { id: "c_arsenal_all", name: "Full Arsenal", ds: "Unlock every tower.", check: (st) => TOWER_IDS.every((t) => st.unlockedTowers.indexOf(t) >= 0), reward: { gold: 500, research: 3 } },
  { id: "c_relics_5", name: "Relic Hunter", ds: "Collect 5 relics.", check: (st) => (st.relics.collected || []).length >= 5, reward: { gold: 300, research: 2 } },
  { id: "c_relics_10", name: "Curator", ds: "Collect 10 relics.", check: (st) => (st.relics.collected || []).length >= 10, reward: { gold: 500, research: 3 } },
  { id: "c_ach24", name: "Decorated", ds: "Unlock 24 achievements.", check: (st) => (st.achievements || []).length >= 24, reward: { gold: 420, research: 2 } },
  { id: "c_campaign_all", name: "Outbreak Ended", ds: "Complete all 12 campaign missions.", check: (st) => ((st.campaign && st.campaign.done) || []).length >= CAMPAIGN_MISSIONS.length, reward: { gold: 900, research: 5, relic: true } },
  { id: "c_towers_5", name: "Arsenal Builder", ds: "Unlock 5 towers.", check: (st) => (st.unlockedTowers || []).length >= 5, reward: { gold: 220, research: 1 } },
];
function codexCount(st, cat) {
  const ids = CODEX_ENTRIES.filter((e) => e.cat === cat).map((e) => e.id);
  const have = (st.codex && st.codex.entries) || [];
  return ids.filter((id) => have.indexOf(id) >= 0).length;
}

/* ---- getting started: a short guided checklist for new players ------ */
const STARTER_TASKS = [
  { id: "s_build", name: "Raise the Walls", ds: "Build your first tower.", check: (st) => Object.keys(st.stats.towerUse || {}).length > 0, reward: { gold: 60 } },
  { id: "s_wave3", name: "Hold Them Back", ds: "Reach wave 3.", check: (st) => st.highestWave >= 3, reward: { gold: 80 } },
  { id: "s_upgrade", name: "Sharpen the Edge", ds: "Upgrade a tower.", check: (st) => (st.stats.upgrades || 0) >= 1, reward: { gold: 70, scrap: 60 } },
  { id: "s_skill", name: "Call Support", ds: "Use a skill in battle.", check: (st) => (st.stats.skillsUsed || 0) >= 1, reward: { gold: 70 } },
  { id: "s_bounty", name: "Contract Work", ds: "Complete a bounty.", check: (st) => (st.stats.bountiesClaimed || 0) >= 1, reward: { gold: 90 } },
  { id: "s_wave5", name: "First Stand", ds: "Reach wave 5.", check: (st) => st.highestWave >= 5, reward: { gold: 100, research: 1 } },
];
