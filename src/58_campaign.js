/* ---------------------------------------------------------------------
   CAMPAIGNSYSTEM - v5 "Chi\u1ebfn d\u1ecbch" chapter/mission progression.
   Missions unlock in order; each clears with a 1-3 star rating.
   --------------------------------------------------------------------- */
class CampaignSystem {
  constructor(game) { this.game = game; this.current = null; }
  all() { return CAMPAIGN_MISSIONS; }
  mission(id) { return CAMPAIGN_MISSIONS.find((m) => m.id === id) || null; }
  chapter(id) { return CAMPAIGN_CHAPTERS.find((c) => c.id === id) || null; }
  indexOf(id) { return CAMPAIGN_MISSIONS.findIndex((m) => m.id === id); }
  isDone(id) { return (this.game.state.campaign.done || []).indexOf(id) >= 0; }
  stars(id) { return this.game.state.campaign.stars[id] || 0; }
  isUnlocked(id) {
    const i = this.indexOf(id);
    if (i < 0) return false;
    if (i === 0) return true;
    return this.isDone(CAMPAIGN_MISSIONS[i - 1].id);
  }
  doneCount() { return (this.game.state.campaign.done || []).length; }
  totalStars() { return CAMPAIGN_MISSIONS.reduce((a, m) => a + this.stars(m.id), 0); }
  maxStars() { return CAMPAIGN_MISSIONS.length * 3; }
  chapterStars(chapterId) {
    return CAMPAIGN_MISSIONS.filter((m) => m.chapter === chapterId).reduce((a, m) => a + this.stars(m.id), 0);
  }
  chapterDone(chapterId) {
    return CAMPAIGN_MISSIONS.filter((m) => m.chapter === chapterId).every((m) => this.isDone(m.id));
  }
  start(id) {
    const m = this.mission(id);
    if (!m || !this.isUnlocked(id)) return false;
    this.current = m;
    this.game.startRun("campaign");
    return true;
  }
  target() { return this.current ? this.current.target : 20; }
  /* called on mission victory; records stars + rewards (first clear only) */
  complete() {
    const m = this.current;
    if (!m) return null;
    const g = this.game, st = g.state;
    const pct = g.fortress ? g.fortress.hp / Math.max(1, g.fortress.maxHp) : 1;
    let stars = 1;
    if (!g.run.fortressHit) stars = 3;
    else if (pct > 0.5) stars = 2;
    st.campaign.stars[m.id] = Math.max(st.campaign.stars[m.id] || 0, stars);
    const first = !this.isDone(m.id);
    let got = [];
    if (first) {
      st.campaign.done.push(m.id);
      got = grantQuestReward(g, m.reward || {});
    }
    g.save();
    const res = { mission: m, stars, first, got };
    this.current = null;
    return res;
  }
}
