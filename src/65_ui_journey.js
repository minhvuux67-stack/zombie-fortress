/* =====================================================================
   UI - v6 Command Center + level-up celebration. Attached to UIManager.
   ===================================================================== */
Object.assign(UIManager.prototype, {
  _pbar(pct, color) {
    return `<div style="height:10px;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden;border:1px solid var(--panel-line)">
      <div style="height:100%;width:${Math.round(clamp(pct, 0, 1) * 100)}%;background:${color};transition:width .25s"></div></div>`;
  },
  _rewardLine(r) {
    return commanderRewardText(r) || "reward";
  },
  /* dashboard: commander level, daily board, bounties, collection */
  commandScreen() {
    const g = this.game, j = g.journey, c = j.commander, d = j.daily, col = j.collection;
    const need = c.xpFor(c.c.level), pct = need > 0 ? c.c.xp / need : 0;
    let html = "";

    /* --- commander level --- */
    const pending = c.pending();
    html += `<div class="cmdhero">
      <div class="lvbadge">${c.c.level}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <b style="font-size:17px">${T("Commander")} \u00b7 <span style="color:#57e08a">${I18N.tr(c.title())}</span></b>
          <span class="dim" style="font-size:12px">${fmt(c.c.totalXp)} ${T("total XP")}</span>
        </div>
        ${this._pbar(pct, "linear-gradient(90deg,#49d07c,#9bf0b6)")}
        <div class="dim" style="font-size:12px;margin-top:4px">${Math.floor(c.c.xp)} / ${need} XP \u00b7 ${T("every level pays out")}</div>
      </div>
      ${pending.length ? `<button class="btn primary" data-action="claimalllevels">${T("Claim")} ${pending.length} \u2605</button>` : `<span class="chip" style="color:#57e08a">\u2714 ${T("Up to date")}</span>`}
    </div>`;
    if (pending.length) {
      html += `<div class="dim" style="font-size:12px;margin:-2px 0 8px">${T("Unclaimed level rewards")}: ` +
        pending.slice(0, 6).map((l) => `<b style="color:#8fd3ff">Lv${l}</b> ${I18N.tr(this._rewardLine(commanderReward(l)))}`).join(" \u00b7 ") +
        (pending.length > 6 ? ` \u00b7 +${pending.length - 6} ${T("more")}` : "") + `</div>`;
    }

    /* --- getting started (new players) --- */
    if (j.starter.active()) {
      const list = j.starter.list();
      const left = list.filter((x) => !x.claimed).length;
      html += `<div class="cmdsec starter"><div class="spread"><b>\u{1F331} ${T("Getting Started")}</b><span class="chip">${left} ${T("left")}</span></div>`;
      for (const it of list) {
        html += `<div class="mrow ${it.done ? "ok" : ""}"><div style="flex:1"><div class="spread"><b>${I18N.tr(it.def.name)}</b><span class="dim" style="font-size:12px">${I18N.tr(commanderRewardText(it.def.reward))}</span></div><div class="dim" style="font-size:12px;margin-top:2px">${I18N.tr(it.def.ds)}</div></div>${it.claimed ? `<span class="chip" style="color:#57e08a">\u2714</span>` : it.done ? `<button class="btn sm primary" data-action="claimstarter" data-id="${it.def.id}">${T("Claim")}</button>` : `<span class="chip">${T("locked")}</span>`}</div>`;
      }
      html += `</div>`;
    }

    /* --- daily missions --- */
    const tasks = d.tasks(), doneN = d.completedCount();
    html += `<div class="cmdsec"><div class="spread"><b>\u{1F4CB} ${T("Daily Missions")}</b>
      <span class="chip${d.canClaimChest() ? " hot" : ""}">${doneN}/${tasks.length} \u00b7 ${T("chest")} ${d.canClaimChest() ? T("ready!") : (g.state.dailyBoard.chestClaimed ? T("claimed") : T("locked"))}</span></div>`;
    for (const m of tasks) {
      const p = d.progress(m.id), ok = d.isDone(m.id), claimed = d.isClaimed(m.id);
      html += `<div class="mrow ${ok ? "ok" : ""}">
        <div style="flex:1">
          <div class="spread"><b>${I18N.tr(m.name)}</b><span class="dim" style="font-size:12px">${Math.min(p, m.target)}/${m.target}</span></div>
          <div class="dim" style="font-size:12px;margin:1px 0 5px">${I18N.tr(m.ds)}</div>
          ${this._pbar(p / m.target, ok ? "#57e08a" : "#4aa8ff")}
        </div>
        ${claimed ? `<span class="chip" style="color:#57e08a">\u2714</span>` : ok ? `<button class="btn sm primary" data-action="claimdm" data-id="${m.id}">${T("Claim")}</button>` : `<span class="chip">${T("in progress")}</span>`}
      </div>`;
    }
    html += `<div class="mrow chest ${d.canClaimChest() ? "hot" : ""}">
      <div style="flex:1"><b>\u{1F381} ${T("Daily Chest")}</b><div class="dim" style="font-size:12px">${T("Finish all 3 missions to open it")} \u00b7 ${I18N.tr(commanderRewardText(DAILY_CHEST))}</div></div>
      ${g.state.dailyBoard.chestClaimed ? `<span class="chip" style="color:#57e08a">\u2714 ${T("claimed")}</span>` : d.canClaimChest() ? `<button class="btn primary" data-action="claimchest">${T("Open Chest")}</button>` : `<span class="chip">${T("locked")}</span>`}
    </div></div>`;

    /* --- bounties --- */
    if (g.screen === "play" && j.bounties.all().length) {
      html += `<div class="cmdsec"><div class="spread"><b>\u{1F3AF} ${T("This Run's Bounties")}</b><span class="chip">${j.bounties.remaining()} ${T("left")}</span></div>`;
      for (const b of j.bounties.all()) {
        const def = j.bounties.def(b.id);
        html += `<div class="mrow ${b.done ? "ok" : ""}"><div style="flex:1"><div class="spread"><b>${I18N.tr(def.name)}</b><span class="dim" style="font-size:12px">${j.bounties.progressText(b)}</span></div><div class="dim" style="font-size:12px;margin-top:2px">${I18N.tr(def.ds)}</div></div>${b.done ? `<span class="chip" style="color:#57e08a">\u2714</span>` : ""}</div>`;
      }
      html += `</div>`;
    }

    /* --- collection --- */
    const list = col.list();
    html += `<div class="cmdsec"><div class="spread"><b>\u{1F4DA} ${T("Collection Rewards")}</b><span class="chip">${col.doneCount()}/${col.total()}</span></div>`;
    for (const it of list) {
      html += `<div class="mrow ${it.done ? "ok" : ""}"><div style="flex:1"><div class="spread"><b>${I18N.tr(it.def.name)}</b><span class="dim" style="font-size:12px">${I18N.tr(commanderRewardText(it.def.reward))}</span></div><div class="dim" style="font-size:12px;margin-top:2px">${I18N.tr(it.def.ds)}</div></div>${it.claimed ? `<span class="chip" style="color:#57e08a">\u2714</span>` : it.done ? `<button class="btn sm primary" data-action="claimcollection" data-id="${it.def.id}">${T("Claim")}</button>` : `<span class="chip">${T("locked")}</span>`}</div>`;
    }
    html += `</div>`;

    this.el.overlay.innerHTML = I18N.tr(
      `<div class="ovl"><div class="box panel cmdbig">
        <div class="head"><h2>\u{1F3E0} ${T("Command Center")}</h2>
          <button class="btn sm ghost" data-action="close">${T("Back")}</button></div>
        <div class="scroll">${html}</div>
      </div></div>`);
  },
});
