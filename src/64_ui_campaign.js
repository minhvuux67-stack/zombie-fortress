/* =====================================================================
   UI - v5 campaign mission select. Attached to UIManager.
   ===================================================================== */
Object.assign(UIManager.prototype, {
  campaignScreen() {
    const g = this.game, c = g.campaign;
    let body = "";
    for (const ch of CAMPAIGN_CHAPTERS) {
      const missions = CAMPAIGN_MISSIONS.filter((m) => m.chapter === ch.id);
      const chStars = c.chapterStars(ch.id), chMax = missions.length * 3;
      const cleared = c.chapterDone(ch.id);
      body += `<div class="chhead"><div><b>${I18N.tr(ch.name)}</b>${cleared ? ` <span style="color:#57e08a">\u2714</span>` : ""}<div class="dim" style="font-size:12px">${I18N.tr(ch.ds)}</div></div>
        <span class="chip">\u2605 ${chStars}/${chMax}</span></div><div class="msngrid">`;
      for (const m of missions) {
        const unlocked = c.isUnlocked(m.id);
        const done = c.isDone(m.id);
        const stars = c.stars(m.id);
        const starStr = [1, 2, 3].map((i) => `<span style="opacity:${i <= stars ? 1 : 0.2}">\u2605</span>`).join("");
        const tag = done ? `<span class="chip" style="color:#57e08a">${T("Cleared")}</span>` : unlocked ? "" : `<span class="chip">\u{1F512}</span>`;
        body += `<button class="msn${unlocked ? "" : " locked"}" ${unlocked ? `data-action="startmission" data-id="${m.id}"` : "disabled"}>
          <div class="spread"><div class="nm">${I18N.tr(m.name)}</div>${tag}</div>
          <div class="dms">${I18N.tr(m.ds)}</div>
          <div class="mstars">${starStr}<span class="dim" style="margin-left:8px;font-size:11px">${T("target")} ${m.target}</span></div>
        </button>`;
      }
      body += `</div>`;
    }
    this.el.overlay.innerHTML = I18N.tr(
      `<div class="ovl"><div class="box panel campaignbox">
        <div class="head"><h2>\u{1F3D9} ${T("Campaign")}</h2>
          <span class="chip">\u2605 ${c.totalStars()}/${c.maxStars()} \u00b7 ${c.doneCount()}/${c.all().length}</span>
          <button class="btn sm ghost" data-action="close">${T("Back")}</button></div>
        <div class="dim" style="margin-bottom:12px">${T("Twelve handcrafted missions across three chapters. Clear a mission to unlock the next, and finish without the fortress taking a hit for 3 stars.")}</div>
        <div class="campaignlist">${body}</div>
      </div></div>`);
  },
});
