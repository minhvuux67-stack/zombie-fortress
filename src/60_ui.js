/* ---------------------------------------------------------------------
   UIMANAGER - all DOM screens, the HUD and tooltips
   --------------------------------------------------------------------- */
class UIManager {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.el = {
      hud: this.$("hud"), scrap: this.$("hud-scrap"), gold: this.$("hud-gold"),
      food: this.$("hud-food"), meds: this.$("hud-meds"), wave: this.$("hud-wave"),
      waveinfo: this.$("hud-waveinfo"), ffill: this.$("ffill"), ftext: this.$("ftext"),
      fbar: this.$("fbar"), toolbar: this.$("toolbar"), skillbar: this.$("skillbar"),
      nextwrap: this.$("nextwrap"), nextcount: this.$("nextcount"), toasts: this.$("toasts"),
      menu: this.$("screen-menu"), over: this.$("screen-over"), overlay: this.$("overlay"),
      tip: this.$("tooltip"), tutorial: this.$("tutorial"), daily: this.$("dailybanner"),
      menustats: this.$("menustats"), btnMusic: this.$("btn-music"), btnSfx: this.$("btn-sfx"),
      btnEndless: this.$("btn-endless"),
    };
    this.lastToolbarSig = "";
    this.lastSkillSig = "";
    this.tipEl = null;
  }

  /* ---------------- toasts + tooltips ---------------- */
  toast(msg, color) {
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = I18N.tr(msg);
    if (color) d.style.color = color;
    this.el.toasts.appendChild(d);
    setTimeout(() => { d.style.transition = "opacity .4s"; d.style.opacity = "0"; }, 2600);
    setTimeout(() => d.remove(), 3100);
  }
  showTip(target, html) {
    const t = this.el.tip;
    t.innerHTML = I18N.tr(html);
    t.classList.remove("hidden");
    const r = target.getBoundingClientRect(), s = this.game.stageRect();
    let x = (r.left - s.left) / s.scale + r.width / 2;
    let y = (r.top - s.top) / s.scale - 10;
    t.style.left = "0px"; t.style.top = "0px";
    const tw = t.offsetWidth, th = t.offsetHeight;
    t.style.left = clamp(x - tw / 2, 6, W - tw - 6) + "px";
    t.style.top = (y - th > 0 ? y - th : y + r.height / s.scale + 18) + "px";
  }
  hideTip() { this.el.tip.classList.add("hidden"); }

  /* ---------------- HUD ---------------- */
  showHud(on) { this.el.hud.classList.toggle("hidden", !on); }
  updateHUD() {
    const g = this.game, f = g.fortress;
    if (!f) return;
    this.el.scrap.textContent = fmt(g.scrap);
    this.el.gold.textContent = fmt(g.state.gold);
    this.el.food.textContent = fmt(g.food);
    this.el.meds.textContent = fmt(g.meds);
    const wm = g.waves;
    const alive = g.zombies.filter((z) => !z.dead).length;
    const shownWave = wm.active ? wm.wave : Math.max(1, wm.wave + 1);
    this.el.wave.textContent = T((g.endless && shownWave >= 20 ? "\u221E " : "") + "Wave " + shownWave);
    if (!wm.active) this.el.waveinfo.textContent = T("Build phase \u2014 " + Math.ceil(wm.prepTimer) + "s until next wave");
    else this.el.waveinfo.textContent = T(wm.doneSpawning ? alive + " zombie" + (alive === 1 ? "" : "s") + " left" : Math.max(0, wm.total - wm.spawned) + " incoming");
    const pct = f.pct * 100;
    this.el.ffill.style.width = pct + "%";
    this.el.ftext.textContent = T("Fortress " + Math.ceil(f.hp) + " / " + Math.round(f.maxHp));
    this.el.fbar.classList.toggle("low", pct < 35);
    // next-wave button
    this.el.nextwrap.classList.toggle("hidden", wm.active);
    if (!wm.active) {
      this.el.nextcount.textContent = T("Auto-starts in " + Math.ceil(wm.prepTimer) + "s  \u00b7  call early for bonus scrap");
    }
    this.syncToolbar(); this.syncSkills();
  }
  syncToolbar() {
    const g = this.game;
    const sig = TOWER_IDS.map((id) => {
      const unlocked = g.state.unlockedTowers.includes(id);
      return id + (unlocked ? "1" : "0") + (g.selectedTower === id ? "S" : "") + (g.scrap >= g.towerCost(id) ? "A" : "B");
    }).join("|");
    if (sig === this.lastToolbarSig) return;
    this.lastToolbarSig = sig;
    this.el.toolbar.innerHTML = "";
    for (const id of TOWER_IDS) {
      const def = TOWER_DEFS[id];
      const cost = g.towerCost(id);
      const unlocked = g.state.unlockedTowers.includes(id);
      const card = document.createElement("div");
      card.className = "tcard" + (g.selectedTower === id ? " sel" : "") + (!unlocked ? " locked" : "") + (unlocked && g.scrap < cost ? " poor" : "");
      card.dataset.tower = id;
      card.dataset.tip = I18N.tr(unlocked
        ? `<b>${def.name}</b><br>${def.desc}<br>Cost: <b>${cost}</b> scrap${def.kind === "block" ? "<br>HP: " + def.base.hp : ""}`
        : `<b>${def.name}</b> (locked)<br>Unlock in Collection for <b>${def.unlockCost}</b> gold.`);
      card.innerHTML = `<canvas width="52" height="52"></canvas><div class="nm">${I18N.tr(def.name.split(" ")[0])}</div>` +
        (unlocked ? `<div class="cst">${cost}</div>` : `<div class="lock">\u{1F512}</div>`);
      this.el.toolbar.appendChild(card);
      drawTowerGlyph(card.querySelector("canvas"), def, !unlocked);
    }
  }
  syncSkills() {
    const g = this.game;
    const sig = g.skills.map((s) => s.id + Math.ceil(s.cdLeft) + (g.selectedSkill === s.id ? "S" : "") + (g.skillUsable(s) ? "A" : "B")).join("|");
    if (sig === this.lastSkillSig) return;
    this.lastSkillSig = sig;
    this.el.skillbar.innerHTML = "";
    for (const s of g.skills) {
      const b = document.createElement("div");
      const ready = g.skillUsable(s);
      b.className = "sk" + (g.selectedSkill === s.id ? " sel" : "") + (ready ? "" : " disabled");
      b.dataset.skill = s.id;
      b.dataset.tip = I18N.tr(`<b>${s.name}</b><br>${s.desc}<br>Cost: <b>${s.cost}</b> ${s.costType === "food" ? "food" : "meds"} \u00b7 cooldown ${s.cd}s`);
      b.innerHTML = `<div class="ico">${s.icon}</div><div class="nm">${I18N.tr(s.name)}</div><div class="cost">${s.cost} ${s.costType === "food" ? "\u{1F35E}" : "\u{1F48A}"}</div>` +
        (s.cdLeft > 0 ? `<div class="cdmask">${Math.ceil(s.cdLeft)}</div>` : "");
      this.el.skillbar.appendChild(b);
    }
  }

  /* ---------------- screens ---------------- */
  hideScreens() {
    this.el.menu.classList.add("hidden");
    this.el.over.classList.add("hidden");
  }
  showMenu() {
    this.hideScreens(); this.closeOverlay();
    this.el.menu.classList.remove("hidden");
    this.buildMenu();
    this.game.setMusic("menu");
  }
  buildMenu() {
    const g = this.game, st = g.state;
    const r = rankFor(g.score());
    this.el.menustats.innerHTML = I18N.tr(
      `<span class="chip rankchip">Rank: <b style="color:${r.color}">${r.name}</b></span>` +
      `<span class="chip">Best Wave <b>${st.highestWave}</b></span>` +
      `<span class="chip">Total Kills <b>${fmt(st.totalKills)}</b></span>` +
      `<span class="chip">High Score <b>${fmt(st.highScore)}</b></span>` +
      `<span class="chip">Played <b>${hhmmss(st.totalPlayTime)}</b></span>` +
      `<span class="chip">Gold <b>${fmt(st.gold)}</b></span>`);
    const dr = g.daily;
    const c = dr.challenge;
    if (dr.rewardAvailable) {
      this.el.daily.innerHTML = I18N.tr(`\u{1F381} <b>Daily login reward ready</b> \u2014 Day ${dr.streak} streak \u00b7 +${30 + dr.streak * 12} gold. &nbsp;<span class="dim">(click to claim)</span>`);
      this.el.daily.style.cursor = "pointer";
      this.el.daily.dataset.action = "claimdaily";
    } else {
      this.el.daily.innerHTML = I18N.tr(`\u{1F4C5} <b>Daily challenge:</b> ${c.name} \u2014 ${c.ds}` +
        (dr.challengeDone ? ` <b style="color:#57e08a">\u2714 done today</b>` : ` <span class="dim">(click to start \u00b7 streak ${dr.streak})</span>`));
      this.el.daily.style.cursor = "pointer";
      this.el.daily.dataset.action = "daily";
    }
    this.el.btnEndless.style.display = (st.highestWave >= 20 || st.unlockedEndless) ? "" : "none";
    this.syncMute();
  }
  syncMute() {
    const s = this.game.state.settings;
    this.el.btnMusic.style.opacity = s.musicOn ? "1" : ".4";
    this.el.btnSfx.style.opacity = s.soundOn ? "1" : ".4";
  }
  openOverlay(html) { this.el.overlay.innerHTML = I18N.tr(html); this.el.overlay.classList.add("hidden"); this.el.overlay.firstElementChild && this.el.overlay.firstElementChild.classList.add("ovl"); }
  closeOverlay() { this.el.overlay.innerHTML = ""; }
  setOverlayContent(inner) {
    this.el.overlay.innerHTML = I18N.tr(`<div class="ovl"><div class="box panel">${inner}</div></div>`);
  }

  shop() {
    const g = this.game, st = g.state;
    let cards = "";
    for (const u of UPGRADES) {
      const lvl = st.permanentUpgrades[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : u.cost(lvl);
      cards += `<div class="up" data-tip="<b>${u.name}</b><br>${u.ds} per level.">
        <div class="spread"><div class="nm">${u.icon} ${u.name}</div><div class="lv">Lv ${lvl}/${u.max}</div></div>
        <div class="ds">${u.ds} per level</div>
        <button class="btn sm ${maxed ? "" : "primary"}" data-action="buyupgrade" data-id="${u.id}" ${maxed || st.gold < cost ? "disabled" : ""}>
          ${maxed ? "MAXED" : cost + " \u{1F4B0}"}</button></div>`;
    }
    this.setOverlayContent(`<div class="head"><h2>\u2699 Upgrade Shop</h2><div class="row"><span class="chip">Gold <b>${fmt(st.gold)}</b></span>
      <button class="btn sm ghost" data-action="close">Back</button></div></div>
      <div class="dim" style="margin-bottom:10px">Permanent upgrades bought with gold. They apply to every future run.</div>
      <div class="scroll grid2">${cards}</div>`);
  }
  collection() {
    const g = this.game, st = g.state;
    let cards = "";
    for (const id of TOWER_IDS) {
      const def = TOWER_DEFS[id];
      const owned = st.unlockedTowers.includes(id);
      cards += `<div class="towercard ${owned ? "" : "locked"}" data-tip="<b>${def.name}</b><br>${def.desc}">
        <canvas width="58" height="58"></canvas>
        <div class="grow"><div class="nm">${def.name}</div><div class="ds">${def.desc}</div>
        <div class="ds">Build cost: <b>${def.cost}</b> scrap</div></div>
        ${owned ? `<span class="chip" style="color:#57e08a">OWNED</span>`
          : `<button class="btn sm primary" data-action="unlocktower" data-id="${id}" ${st.gold < def.unlockCost ? "disabled" : ""}>${def.unlockCost} \u{1F4B0}</button>`}
      </div>`;
    }
    this.setOverlayContent(`<div class="head"><h2>\u{1F3F0} Tower Collection</h2><div class="row"><span class="chip">Gold <b>${fmt(st.gold)}</b></span>
      <button class="btn sm ghost" data-action="close">Back</button></div></div>
      <div class="scroll grid2">${cards}</div>`);
    this.el.overlay.querySelectorAll(".towercard canvas").forEach((cv, i) => drawTowerGlyph(cv, TOWER_DEFS[TOWER_IDS[i]], !st.unlockedTowers.includes(TOWER_IDS[i])));
  }
  achievements() {
    const st = this.game.state;
    const got = ACHIEVEMENTS.filter((a) => st.achievements.some((x) => x.id === a.id)).length;
    let cards = "";
    for (const a of ACHIEVEMENTS) {
      const rec = st.achievements.find((x) => x.id === a.id);
      cards += `<div class="ac ${rec ? "on" : ""}">
        <div class="ic">${rec ? a.icon : "\u{1F512}"}</div>
        <div class="grow"><div class="nm">${a.name}</div><div class="ds">${a.ds}</div>
        ${rec ? `<div class="dt">Unlocked ${new Date(rec.date).toLocaleDateString()}</div>` : ""}</div></div>`;
    }
    this.setOverlayContent(`<div class="head"><h2>\u{1F3C6} Achievements</h2><div class="row"><span class="chip"><b>${got}</b> / ${ACHIEVEMENTS.length}</span>
      <button class="btn sm ghost" data-action="close">Back</button></div></div>
      <div class="scroll grid2">${cards}</div>`);
  }
  leaderboard() {
    const st = this.game.state, lb = st.leaderboard.slice().sort((a, b) => b.score - a.score).slice(0, 10);
    let rows = lb.map((r, i) => `<tr><td>${i + 1}</td><td>${r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
      <td><b>${fmt(r.score)}</b></td><td>Wave ${r.wave}</td><td>${fmt(r.kills)}</td></tr>`).join("");
    if (!rows) rows = `<tr><td colspan="5" class="dim" style="text-align:center;padding:20px">No runs yet \u2014 go survive some waves.</td></tr>`;
    this.setOverlayContent(`<div class="head"><h2>\u{1F4CA} Leaderboard</h2><button class="btn sm ghost" data-action="close">Back</button></div>
      <div class="scroll"><table class="lb"><tr><th>#</th><th>Date</th><th>Score</th><th>Best Wave</th><th>Kills</th></tr>${rows}</table>
      <div class="grid3" style="margin-top:16px">
        <div class="up center"><div class="k dim">Best wave</div><div style="font-size:26px;font-weight:800">${st.highestWave}</div></div>
        <div class="up center"><div class="k dim">Total kills</div><div style="font-size:26px;font-weight:800">${fmt(st.totalKills)}</div></div>
        <div class="up center"><div class="k dim">Time played</div><div style="font-size:26px;font-weight:800">${hhmmss(st.totalPlayTime)}</div></div>
      </div></div>`);
  }
  settings() {
    const st = this.game.state, s = st.settings;
    const diffs = Object.keys(DIFFICULTIES).map((k) =>
      `<button class="btn sm ${s.difficulty === k ? "primary" : ""}" data-action="setdiff" data-v="${k}">${DIFFICULTIES[k].name}</button>`).join("");
    const langs = Object.keys(LANG_NAME).map((k) =>
      `<button class="btn sm ${s.lang === k ? "primary" : ""}" data-action="setlang" data-v="${k}">${LANG_NAME[k]}</button>`).join("");
    this.setOverlayContent(`<div class="head"><h2>\u2699 Settings</h2><button class="btn sm ghost" data-action="close">Back</button></div>
      <div class="scroll">
        <div class="up spread"><div><div class="nm">\u{1F3B5} Music</div><div class="ds">Synthesised background music</div></div>
          <button class="btn sm ${s.musicOn ? "primary" : ""}" data-action="togglemusic">${T(s.musicOn ? "ON" : "OFF")}</button></div>
        <div class="up spread" style="margin-top:10px"><div><div class="nm">\u{1F50A} Sound Effects</div><div class="ds">Shots, explosions, zombies</div></div>
          <button class="btn sm ${s.soundOn ? "primary" : ""}" data-action="togglesfx">${T(s.soundOn ? "ON" : "OFF")}</button></div>
        <div class="up spread" style="margin-top:10px"><div><div class="nm">\u{1F310} Language</div><div class="ds">Interface language</div></div>
          <div class="row">${langs}</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">\u{1F3AE} Difficulty</div>
          <div class="ds">Applies to the next run you start.</div><div class="row">${diffs}</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">\u{1F5D1} Reset Progress</div>
          <div class="ds">Erase all gold, unlocks, achievements and records. This cannot be undone.</div>
          <button class="btn sm danger" data-action="resetprogress">Reset everything</button></div>
        <div class="up" style="margin-top:10px"><div class="nm">\u2139 About</div>
          <div class="ds">Zombie Fortress: Pandemic Defense v${VERSION} \u2014 free HTML5 game. No ads, no tracking, no downloads.
          Progress is stored only in this browser.</div></div>
      </div>`);
  }
  help() {
    this.setOverlayContent(`<div class="head"><h2>\u{1F4D6} How to Play</h2><button class="btn sm ghost" data-action="close">Back</button></div>
      <div class="scroll">
        <div class="up"><div class="nm">Goal</div><div class="ds">Zombies pour in from the right. They want your fortress on the left. If its HP hits zero, the run ends.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Build</div><div class="ds">Tap a tower at the bottom, then tap an empty platform on the field. Towers shoot by themselves \u2014 you never aim.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Scrap vs Gold</div><div class="ds">Scrap drops from kills and pays for towers and upgrades during a run. Gold is awarded at the end of each wave and buys permanent upgrades between runs.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Upgrade / Sell</div><div class="ds">Tap a built tower on the field to open its panel, then upgrade (up to level 5) or sell it for 60% back.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Skills</div><div class="ds">Airstrike drops a bomb where you tap. Freeze stops every zombie for 3 seconds. Repair heals the fortress. They cost food or meds and share cooldowns.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Waves</div><div class="ds">Build time counts down automatically; press Next Wave to start early and earn bonus scrap. Bosses arrive every 5 waves. Survive wave 20 to unlock Endless Mode.</div></div>
        <div class="up" style="margin-top:10px"><div class="nm">Keyboard</div><div class="ds">1-7 pick a tower \u00b7 Q/W/E fire skills \u00b7 SPACE starts the next wave \u00b7 P pauses \u00b7 Esc closes panels and deselects.</div></div>
      </div>`);
  }
  modList(mods) {
    const out = [];
    if (mods.towers) out.push("Towers limited to " + mods.towers.map((t) => TOWER_DEFS[t].name).join(" + "));
    if (mods.noSkills) out.push("Special skills are disabled");
    if (mods.noTowerUpgrades) out.push("Towers cannot be upgraded");
    if (mods.zombieSpeed) out.push("Zombies move " + Math.round((mods.zombieSpeed - 1) * 100) + "% faster");
    if (mods.zombieHp) out.push("Zombies have +" + Math.round((mods.zombieHp - 1) * 100) + "% HP");
    if (mods.fhp) out.push("Fortress has " + Math.round(mods.fhp * 100) + "% HP");
    if (mods.startScrap) out.push("Start with " + Math.round(mods.startScrap * 100) + "% scrap");
    if (mods.startScrapFlat) out.push("Start with " + mods.startScrapFlat + " scrap");
    if (mods.bossEvery) out.push("A boss joins every wave");
    return out.length ? out : ["No modifiers"];
  }
  dailyScreen() {
    const g = this.game, d = g.daily, c = d.challenge;
    const mods = this.modList(c.mods).map((m) => `<li>${m}</li>`).join("");
    const done = d.challengeDone;
    this.setOverlayContent(`<div class="head"><h2>\u{1F4C5} Daily Challenge</h2>
      <div class="row"><span class="chip">Streak <b>${d.streak}</b></span><button class="btn sm ghost" data-action="close">Back</button></div></div>
      <div class="scroll">
        <div class="up"><div class="nm">${c.name}</div><div class="ds">${c.ds}</div>
          <div class="ds">Survive <b>wave ${c.target}</b> in a single run to complete it.</div>
          <div class="ds" style="margin-top:6px"><b>Modifiers</b><ul style="margin:4px 0 0 18px;padding:0">${mods}</ul></div>
          <div class="ds" style="margin-top:8px">Reward: <b>150 gold \u00b7 20 food \u00b7 15 meds</b></div></div>
        <div class="dim" style="margin:12px 0">${done ? "\u2714 Completed today \u2014 a new challenge arrives at midnight." : "Each day picks a new seeded challenge, the same for every player in the world."}</div>
        <div class="row">
          ${done ? `<button class="btn" disabled>Completed</button>` : `<button class="btn primary lg" data-action="startdaily">\u25B6 Start Challenge</button>`}
          <button class="btn ghost" data-action="close">Back</button>
        </div>
      </div>`);
  }
  pause() {    this.setOverlayContent(`<div class="head"><h2>Paused</h2></div>
      <div class="row" style="flex-wrap:wrap;gap:10px">
        <button class="btn primary" data-action="resume">Resume</button>
        <button class="btn" data-action="heroes">Heroes</button>
        <button class="btn" data-action="research">Research</button>
        <button class="btn" data-action="camp">Camp</button>
        <button class="btn" data-action="quests">Quests</button>
        <button class="btn" data-action="codex">Codex</button>
        <button class="btn" data-action="settings">Settings</button>
        <button class="btn" data-action="help">How to Play</button>
        <button class="btn ghost" data-action="quit">Quit to Menu</button>
      </div>`);
  }
  tutorial() {
    const t = this.el.tutorial;
    if (this.game.state.seenTutorial) { t.classList.add("hidden"); return; }
    t.classList.remove("hidden");
    t.style.opacity = "1";
    setTimeout(() => { t.style.opacity = "0"; }, 5000);
    setTimeout(() => t.classList.add("hidden"), 6200);
    this.game.state.seenTutorial = true;
    this.game.save();
  }

  showGameOver(info) {
    const g = this.game, st = g.state;
    this.hideScreens(); this.closeOverlay(); this.showHud(false);
    this.el.over.classList.remove("hidden");
    document.getElementById("over-wave").textContent = T("Wave " + info.wave);
    document.getElementById("over-sub").textContent = I18N.tr(info.score > info.best ? "A new record falls to the horde." : "The pandemic claimed another bunker.");
    document.getElementById("over-tease").textContent = I18N.tr(info.tease);
    document.getElementById("over-kv").innerHTML =
      `<div class="c"><div class="v">${fmt(info.score)}</div><div class="k">${T("Score")}</div></div>` +
      `<div class="c"><div class="v">${fmt(info.kills)}</div><div class="k">${T("Kills")}</div></div>` +
      `<div class="c"><div class="v">${fmt(info.best)}</div><div class="k">${T("Best score")}</div></div>` +
      `<div class="c"><div class="v">${st.highestWave}</div><div class="k">${T("Best wave")}</div></div>`;
    this.setMusicSafe("gameover");
  }
  setMusicSafe(kind) { try { this.game.setMusic(kind); } catch (e) {} }

  /* tower panel for a selected built tower */  towerPanel(t) {
    const g = this.game;
    const upCost = t.upgradeCost(), sell = t.sellValue();
    const maxed = !t.canUpgrade();
    const stat = (k, v) => `<div class="up center"><div class="k dim">${k}</div><div style="font-size:19px;font-weight:800">${v}</div></div>`;
    let stats = "";
    if (t.kind === "block") stats = stat("Wall HP", Math.ceil(t.maxHp));
    else if (t.kind === "heal") stats = stat("Heal / s", t.heal.toFixed(1));
    else stats = stat("Damage", t.kind === "flame" ? t.dmg.toFixed(1) + "/tick" : Math.round(t.dmg)) + stat("Range", Math.round(t.range)) + stat("Fire / s", t.rate.toFixed(2));
    this.setOverlayContent(`<div class="head"><h2>${t.def.name} \u00b7 Lv ${t.level}</h2><button class="btn sm ghost" data-action="close">Back</button></div>
      <div class="dim" style="margin-bottom:12px">${t.def.desc}</div>
      <div class="grid3">${stats}</div>
      <div class="row" style="margin-top:16px;gap:10px">
        <button class="btn primary" data-action="upgradetower" ${maxed || g.scrap < upCost ? "disabled" : ""}>
          ${maxed ? "MAX LEVEL" : `Upgrade \u00b7 ${upCost} scrap`}</button>
        <button class="btn danger" data-action="selltower">Sell \u00b7 +${sell} scrap</button>
      </div>`);
  }
}
