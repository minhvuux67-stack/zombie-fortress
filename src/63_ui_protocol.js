/* =====================================================================
   UI - v4 protocol draft + protocol roster. Attached to UIManager.
   ===================================================================== */
Object.assign(UIManager.prototype, {
  /* the between-wave choice. `pending` shows how many picks are left this wave */
  draftScreen(cards, pending) {
    const g = this.game;
    let html = "";
    for (const p of cards) {
      const stacks = g.protocols.count(p.id);
      const col = PROTO_RARITY[p.rarity] || "#8fa2c0";
      html += `<button class="proto" data-action="pickproto" data-id="${p.id}" style="--pc:${col}">
        <div class="pico">${p.icon}</div>
        <div class="pnm" style="color:${col}">${T(p.name)}</div>
        <div class="prar">${T(p.rarity)}${stacks ? " \u00b7 " + T("owned") + " " + stacks : ""}</div>
        <div class="pds">${T(p.ds)}</div>
      </button>`;
    }
    this.el.overlay.innerHTML = I18N.tr(
      `<div class="ovl"><div class="box panel draftbox">
        <div class="head"><h2>\u{1F9EC} ${T("Mutation Protocol")}</h2>
          <span class="chip">${T("Wave")} ${g.waves.wave} ${T("cleared")}${pending > 1 ? " \u00b7 " + pending + " " + T("picks") : ""}</span></div>
        <div class="dim" style="margin-bottom:14px">${T("The lab offers one permanent mutation for this run. Choose carefully \u2014 it stacks with everything you already carry.")}</div>
        <div class="protogrid">${html}</div>
        <div class="row" style="justify-content:center;margin-top:14px">
          <button class="btn ghost" data-action="skipdraft">${T("Skip \u00b7 no mutation")}</button>
        </div>
      </div></div>`);
  },

  /* browsable roster of everything drafted this run */
  protocolsScreen() {
    const g = this.game, ps = g.protocols;
    let cards = "";
    for (const id of ps.list()) {
      const p = PROTOCOL_BY_ID[id];
      if (!p) continue;
      const col = PROTO_RARITY[p.rarity] || "#8fa2c0";
      cards += `<div class="up on">
        <div class="spread"><div class="nm" style="color:${col}">${p.icon} ${p.name}</div><div class="lv">x${ps.count(id)}</div></div>
        <div class="ds">${p.ds}</div></div>`;
    }
    if (!cards) cards = `<div class="dim">No protocols yet \u2014 clear a wave and the lab will offer you one.</div>`;
    const f = ps.flags();
    const fx = [];
    if (f.burn) fx.push("Incendiary rounds");
    if (f.aoe) fx.push("Explosive rounds");
    if (f.slow) fx.push("Slowing rounds");
    if (f.vamp) fx.push("+ " + f.vamp + " HP per kill");
    if (f.thorns) fx.push(f.thorns + " thorns damage");
    if (f.boss) fx.push("+" + Math.round(f.boss * 100) + "% boss damage");
    this.setOverlayContent(this.metaHeader("\u{1F9EC} " + T("Protocols"), `<span class="chip">${T("Active")} <b>${ps.taken.length}</b></span>`) +
      `<div class="dim" style="margin-bottom:10px">${T("Run mutations drafted from the lab. They reset when the run ends.")}</div>
      ${fx.length ? `<div class="up"><div class="nm">${T("Active effects")}</div><div class="ds">${fx.join(" \u00b7 ")}</div></div>` : ""}
      <div class="scroll grid2">${cards}</div>`);
  },
});
