/* =====================================================================
   UI - v3 meta screens (heroes, relics, research, camp, quests, codex,
   battle pass, prestige, season). Attached to UIManager.prototype.
   ===================================================================== */
Object.assign(UIManager.prototype, {
  metaHeader(title, chip) {
    return `<div class="head"><h2>${title}</h2><div class="row">${chip || ""}<button class="btn sm ghost" data-action="close">Back</button></div></div>`;
  },
  resourceChips() {
    const st = this.game.state, m = st.camp.materials;
    return `<span class="chip">Gold <b>${fmt(st.gold)}</b></span>` +
      `<span class="chip">Metal <b>${fmt(m.metal || 0)}</b></span>` +
      `<span class="chip">Wood <b>${fmt(m.wood || 0)}</b></span>` +
      `<span class="chip">Research <b>${st.research.points}</b></span>`;
  },

  /* ---------------- heroes ---------------- */
  heroScreen() {
    const g = this.game, hs = g.meta.hero, st = g.state;
    let cards = "";
    for (const id in HERO_DEFS) {
      const d = HERO_DEFS[id], p = hs.progress(id);
      const selected = st.selectedHero === id;
      const nextXp = heroLevelXp(p.level);
      const bar = p.unlocked ? `<div class="ds">Level ${p.level} \u00b7 XP ${p.xp}/${nextXp} \u00b7 <b>${d.passive}</b></div>` : "";
      cards += `<div class="up ${selected ? "on" : ""}">
        <div class="spread"><div class="nm" style="color:${d.color}">${d.name}${selected ? " \u2605" : ""}</div><div class="lv">${p.unlocked ? "LV " + p.level : d.unlockCost + " \u{1F4B0}"}</div></div>
        <div class="ds">${d.role}</div>${bar}
        <div class="row" style="margin-top:8px">
          ${p.unlocked
            ? `<button class="btn sm ${selected ? "" : "primary"}" data-action="selecthero" data-id="${id}" ${selected ? "disabled" : ""}>${selected ? "Selected" : "Select"}</button>`
            : `<button class="btn sm primary" data-action="unlockhero" data-id="${id}" ${st.gold < d.unlockCost ? "disabled" : ""}>Recruit \u00b7 ${d.unlockCost} \u{1F4B0}</button>`}
        </div></div>`;
    }
    this.setOverlayContent(this.metaHeader("\u{1F9D1} Hero Command", `<span class="chip">Gold <b>${fmt(st.gold)}</b></span>`) +
      `<div class="dim" style="margin-bottom:10px">Your chosen hero changes every run. Earn hero XP by surviving waves and killing zombies.</div>
      <div class="scroll grid2">${cards}</div>`);
  },

  /* ---------------- relics ---------------- */
  relicScreen() {
    const g = this.game, st = g.state;
    const byRar = relicsByRarity();
    let cards = "";
    for (const rar of ["common", "rare", "epic", "legendary"]) {
      for (const id of byRar[rar]) {
        const d = RELIC_DEFS[id], owned = g.meta.relics.has(id), equipped = st.relics.equipped.indexOf(id) >= 0;
        cards += `<div class="up ${equipped ? "on" : ""}">
          <div class="spread"><div class="nm" style="color:${RELIC_RARITY_COLOR[rar]}">${owned ? d.name : "???"}</div><div class="lv">${rar}</div></div>
          <div class="ds">${owned ? d.ds : "Not yet found \u2014 hunt bosses and quests."}</div>
          ${owned ? `<div class="row" style="margin-top:8px"><button class="btn sm ${equipped ? "" : "primary"}" data-action="equiprelic" data-id="${id}">${equipped ? "Unequip" : "Equip"}</button></div>` : ""}
        </div>`;
      }
    }
    this.setOverlayContent(this.metaHeader("\u{1F48E} Relics", `<span class="chip">Found <b>${st.relics.collected.length}</b>/${Object.keys(RELIC_DEFS).length}</span>`) +
      `<div class="dim" style="margin-bottom:10px">Equip up to 3 relics. Slot ${st.relics.equipped.length}/3 used.</div>
      <div class="scroll grid2">${cards}</div>`);
  },

  /* ---------------- research ---------------- */
  researchScreen() {
    const g = this.game, rs = g.meta.research, st = g.state;
    let tiers = "";
    for (let t = 0; t <= 4; t++) {
      const nodes = researchTier(t);
      if (!nodes.length) continue;
      let row = "";
      for (const n of nodes) {
        const owned = rs.has(n.id), can = rs.canBuy(n.id);
        row += `<div class="up ${owned ? "on" : ""}" data-tip="<b>${n.name}</b><br>${n.ds}${n.req.length ? "<br>Requires: " + n.req.map((r) => RESEARCH_NODES[r].name).join(", ") : ""}">
          <div class="spread"><div class="nm">${n.name}</div><div class="lv">${owned ? "\u2714" : n.cost + " RP"}</div></div>
          <div class="ds">${n.ds}</div>
          ${owned ? "" : `<button class="btn sm ${can ? "primary" : ""}" data-action="buyresearch" data-id="${n.id}" ${can ? "" : "disabled"}>Research</button>`}
        </div>`;
      }
      tiers += `<div class="dim" style="margin:10px 0 4px">Tier ${t}</div><div class="grid2">${row}</div>`;
    }
    this.setOverlayContent(this.metaHeader("\u{1F9EA} Research Lab", `<span class="chip">Points <b>${st.research.points}</b></span>`) +
      `<div class="dim" style="margin-bottom:6px">Research points come from cleared waves and the camp lab. Bonuses are permanent.</div>
      <div class="scroll">${tiers}</div>`);
  },

  /* ---------------- camp + survivors ---------------- */
  campScreen() {
    const g = this.game, m = g.state.camp.materials, cs = g.meta.camp;
    let builds = "";
    for (const id in CAMP_BUILDINGS) {
      const b = CAMP_BUILDINGS[id], lvl = cs.level(id), cost = cs.cost(id);
      const costTxt = Object.keys(cost).map((k) => cost[k] + " " + k).join(", ");
      builds += `<div class="up">
        <div class="spread"><div class="nm">${b.name}</div><div class="lv">LV ${lvl}/${b.maxLevel}</div></div>
        <div class="ds">${b.ds}</div>
        <button class="btn sm ${cs.canBuild(id) ? "primary" : ""}" data-action="buildcamp" data-id="${id}" ${cs.canBuild(id) ? "" : "disabled"}>
          ${lvl >= b.maxLevel ? "MAXED" : "Upgrade \u00b7 " + costTxt}</button></div>`;
    }
    let surv = "";
    for (const id in SURVIVOR_DEFS) {
      const d = SURVIVOR_DEFS[id], owned = g.meta.survivors.has(id);
      const costTxt = Object.keys(d.cost).map((k) => d.cost[k] + " " + k).join(", ");
      surv += `<div class="up ${owned ? "on" : ""}">
        <div class="spread"><div class="nm">${d.name}</div><div class="lv">${owned ? "\u2714 joined" : ""}</div></div>
        <div class="ds">${d.ds}</div>
        ${owned ? "" : `<button class="btn sm ${g.meta.survivors.canRecruit(id) ? "primary" : ""}" data-action="recruit" data-id="${id}" ${g.meta.survivors.canRecruit(id) ? "" : "disabled"}>Recruit \u00b7 ${costTxt}</button>`}
      </div>`;
    }
    this.setOverlayContent(this.metaHeader("\u{1F3D5} Survivor Camp", this.resourceChips()) +
      `<div class="row" style="margin-bottom:10px"><button class="btn sm primary" data-action="collectcamp">Collect idle materials</button></div>
      <div class="scroll"><div class="dim">Buildings</div><div class="grid2">${builds}</div>
      <div class="dim" style="margin:12px 0 4px">Survivors</div><div class="grid2">${surv}</div></div>`);
  },

  /* ---------------- quests ---------------- */
  questsScreen() {
    const g = this.game, q = g.meta.quests;
    const card = (quest, label) => {
      if (!quest) return "";
      const done = quest.done;
      const pct = done ? 100 : Math.min(100, Math.round(((quest.progress || 0) / quest.target) * 100));
      const reward = Object.keys(quest.reward || {}).map((k) => quest.reward[k] + " " + k).join(", ");
      return `<div class="up ${done ? "on" : ""}">
        <div class="spread"><div class="nm">${label} \u00b7 ${quest.name}</div><div class="lv">${q.progressText(quest)}</div></div>
        <div class="ds">${quest.ds}</div>
        <div class="ds">Reward: <b>${reward || "none"}</b></div>
        <div style="margin-top:8px;height:8px;border-radius:5px;background:rgba(0,0,0,.45);overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${done ? "#57e08a" : "#4aa8ff"}"></div></div>
      </div>`;
    };
    const activeStory = (g.state.quests.story || []);
    const doneStory = g.meta.quests.completedStory();
    let storyCards = "";
    for (const quest of activeStory) storyCards += card(quest, "Story");
    for (const tpl of doneStory) {
      const quest = { id: tpl.id, name: tpl.name, ds: tpl.ds, target: tpl.target, reward: tpl.reward, progress: tpl.target, done: true };
      storyCards += card(quest, "Story");
    }
    if (!storyCards) storyCards = `<div class="dim">All story chapters complete.</div>`;
    this.setOverlayContent(this.metaHeader("\u{1F4DC} Quests", `<span class="chip">Daily <b>${g.state.quests.daily ? 1 : 0}</b></span>`) +
      `<div class="scroll">
        <div class="dim">Daily</div>${card(g.state.quests.daily, "Daily")}
        <div class="dim" style="margin:12px 0 4px">Weekly</div>${card(g.state.quests.weekly, "Weekly")}
        <div class="dim" style="margin:12px 0 4px">Story</div><div class="grid2">${storyCards}</div>
      </div>`);
  },

  /* ---------------- codex ---------------- */
  codexScreen() {
    const cat = this._codexCat || CODEX_CATS[0];
    const byCat = this.game.meta.codex.byCat();
    const tabs = CODEX_CATS.map((c) => `<button class="btn sm ${c === cat ? "primary" : ""}" data-action="codexcat" data-v="${c}">${c}</button>`).join("");
    let cards = "";
    for (const e of (byCat[cat] || [])) {
      const known = this.game.meta.codex.has(e.id);
      cards += `<div class="up ${known ? "on" : ""}"><div class="nm">${known ? e.name : "???"}</div>
        <div class="ds">${known ? e.ds : "Undiscovered \u2014 encounter it in battle."}</div></div>`;
    }
    this.setOverlayContent(this.metaHeader("\u{1F4D6} Codex", `<span class="chip">${this.game.meta.codex.percent()}%</span>`) +
      `<div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px">${tabs}</div>
      <div class="scroll grid2">${cards}</div>`);
  },

  /* ---------------- battle pass ---------------- */
  passScreen() {
    const g = this.game, p = g.state.battlePass;
    let rows = "";
    for (const t of BATTLEPASS_TIERS) {
      const unlocked = p.xp >= t.xp, claimed = p.claimed.indexOf(t.tier) >= 0;
      const reward = Object.keys(t.reward).map((k) => t.reward[k] + " " + k).join(", ");
      rows += `<div class="up ${claimed ? "on" : ""}">
        <div class="spread"><div class="nm">Tier ${t.tier}</div><div class="lv">${t.xp} XP</div></div>
        <div class="ds">Reward: <b>${reward}</b></div>
        <button class="btn sm ${unlocked && !claimed ? "primary" : ""}" data-action="claimpass" data-id="${t.tier}" ${unlocked && !claimed ? "" : "disabled"}>
          ${claimed ? "Claimed" : unlocked ? "Claim" : "Locked"}</button></div>`;
    }
    this.setOverlayContent(this.metaHeader("\u{1F396} Battle Pass", `<span class="chip">${g.meta.season.current().name}</span>`) +
      `<div class="up"><div class="spread"><div class="nm">Season XP</div><div class="lv">${p.xp} \u00b7 Tier ${p.tier}</div></div></div>
      <div class="scroll"><div class="grid2">${rows}</div></div>`);
  },

  /* ---------------- prestige ---------------- */
  prestigeScreen() {
    const g = this.game, p = g.state.prestige;
    let rows = "";
    for (const m of PRESTIGE_MODS) {
      const owned = p.mods.indexOf(m.id) >= 0;
      rows += `<div class="up ${owned ? "on" : ""}">
        <div class="spread"><div class="nm">${m.name}</div><div class="lv">${owned ? "\u2714" : m.cost + " pts"}</div></div>
        <div class="ds">${m.ds}</div>
        ${owned ? "" : `<button class="btn sm ${p.points >= m.cost ? "primary" : ""}" data-action="buyprestige" data-id="${m.id}" ${p.points >= m.cost ? "" : "disabled"}>Unlock</button>`}</div>`;
    }
    const can = g.meta.prestige.canPrestige();
    this.setOverlayContent(this.metaHeader("\u2B50 Prestige", `<span class="chip">Points <b>${p.points}</b></span>`) +
      `<div class="up"><div class="nm">Prestige level ${p.level}</div>
        <div class="ds">Reset gold, shop upgrades, research and camp levels for permanent perks. Relics, heroes and achievements are kept.</div>
        <div class="ds">Reaching wave 20 again grants <b>${g.meta.prestige.pointsFor()}</b> prestige point(s).</div>
        <button class="btn ${can ? "primary" : ""}" data-action="doprestige" ${can ? "" : "disabled"} style="margin-top:10px">Prestige now</button></div>
      <div class="scroll"><div class="grid2">${rows}</div></div>`);
  },

  /* ---------------- season ---------------- */
  seasonScreen() {
    const g = this.game, s = g.meta.season.current(), st = g.state;
    const rank = rankFor(g.score());
    this.setOverlayContent(this.metaHeader("\u{1F311} Season", `<span class="chip">Season ${s.id}</span>`) +
      `<div class="up"><div class="nm" style="font-size:20px">${s.name}</div><div class="ds">${s.ds}</div>
        <div class="ds">Your rank: <b style="color:${rank.color}">${rank.name}</b> \u00b7 best this season: <b>${RANKS[st.season.bestRank || 0].name}</b></div></div>
      <div class="scroll"><div class="grid2">
        <div class="up center"><div class="k dim">Best wave</div><div style="font-size:26px;font-weight:800">${st.highestWave}</div></div>
        <div class="up center"><div class="k dim">Relics</div><div style="font-size:26px;font-weight:800">${st.relics.collected.length}</div></div>
        <div class="up center"><div class="k dim">Prestige</div><div style="font-size:26px;font-weight:800">${st.prestige.level}</div></div>
        <div class="up center"><div class="k dim">Codex</div><div style="font-size:26px;font-weight:800">${g.meta.codex.percent()}%</div></div>
      </div>
      <div class="dim" style="margin-top:12px">Seasons rotate manually on this build.</div>
      <button class="btn sm ghost" data-action="rotseason" style="margin-top:8px">Rotate to next season</button></div>`);
  },
});
