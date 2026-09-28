/* ---------------------------------------------------------------------
   AUDIOSYSTEM - every sound is synthesised live with the WebAudio API.
   No audio files, no network. Music is a tiny step sequencer.
   --------------------------------------------------------------------- */
class AudioSystem {
  constructor(state) {
    this.state = state;
    this.ctx = null;
    this.master = null; this.musicBus = null; this.sfxBus = null;
    this.noiseBuf = null;
    this.musicOn = state.settings.musicOn !== false;
    this.sfxOn = state.settings.soundOn !== false;
    this.playing = false; this.track = null;
    this.step = 0; this.nextTime = 0; this.timer = null;
    this.tempo = 0.135; // seconds per 16th step
    this.samples = null;         // generated SFX / music elements (optional)
    this.musicEl = null; this._musicKey = null;
  }

  /* preload the generated .ogg samples listed in the asset manifest */
  loadSamples() {
    if (this.samples || typeof Audio === "undefined" || !ASSET_MANIFEST) return;
    this.samples = {};
    for (const k in ASSET_MANIFEST) {
      if (k.indexOf("sfx/") === 0 || k.indexOf("music/") === 0) {
        const a = new Audio();
        a.preload = "auto";
        a.src = ASSET_MANIFEST[k];
        this.samples[k] = a;
      }
    }
  }
  /* some game events have no matching generated file - alias them */
  static get SFX_ALIAS() {
    return { build: "place", zeath: "zombie_die", repair: "heal", lose: "gameover" };
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.5 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.85 : 0;
      this.sfxBus.connect(this.master);
      // reusable white-noise buffer
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.resume();
    } catch (e) { this.ctx = null; }
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); }
  setMusic(on) {
    this.musicOn = on; this.state.settings.musicOn = on;
    if (this.musicEl) this.musicEl.volume = on ? 0.5 : 0;
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }
  setSFX(on) {
    this.sfxOn = on; this.state.settings.soundOn = on;
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.85 : 0, this.ctx.currentTime, 0.02);
  }

  // one oscillator note (used by both sfx and the music sequencer, so it
  // must NOT check sfxOn - music would go silent when SFX are muted)
  tone(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + (o.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.dur || 0.15));
    const vol = (o.vol == null ? 0.3 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.15));
    osc.connect(g); g.connect(o.dest || this.sfxBus);
    osc.start(t); osc.stop(t + (o.dur || 0.15) + 0.03);
  }
  // filtered noise burst (same: shared by music, so no sfxOn check here)
  noise(o) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime + (o.delay || 0);
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter || "lowpass";
    f.frequency.setValueAtTime(o.freq || 900, t);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + (o.dur || 0.25));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol == null ? 0.4 : o.vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.25));
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfxBus);
    src.start(t); src.stop(t + (o.dur || 0.25) + 0.03);
  }

  sfx(name) {
    // prefer a generated sample when available
    if (this.samples && this.sfxOn) {
      const alias = AudioSystem.SFX_ALIAS[name] || name;
      const el = this.samples["sfx/" + alias];
      if (el) {
        try { const c = el.cloneNode(); c.volume = 0.8; c.play().catch(() => {}); } catch (e) {}
        return;
      }
    }
    if (!this.ctx || !this.sfxOn) return;
    switch (name) {
      case "click": this.tone({ freq: 620, type: "square", dur: 0.06, vol: 0.16, slide: 900 }); break;
      case "build":
        this.tone({ freq: 300, type: "triangle", dur: 0.1, vol: 0.28, slide: 620 });
        this.noise({ freq: 2200, freqTo: 500, dur: 0.16, vol: 0.18 }); break;
      case "upgrade":
        [0, 0.07, 0.14].forEach((d, i) => this.tone({ freq: 520 + i * 220, type: "triangle", dur: 0.12, vol: 0.2, delay: d }));
        break;
      case "sell": this.tone({ freq: 500, type: "sawtooth", dur: 0.16, vol: 0.2, slide: 180 }); break;
      case "error": this.tone({ freq: 170, type: "sawtooth", dur: 0.16, vol: 0.22, slide: 110 }); break;
      case "shoot": this.tone({ freq: 780, type: "square", dur: 0.045, vol: 0.07, slide: 320 }); break;
      case "shotgun":
        this.noise({ freq: 1800, freqTo: 260, dur: 0.16, vol: 0.28 });
        this.tone({ freq: 140, type: "square", dur: 0.1, vol: 0.16, slide: 60 }); break;
      case "sniper":
        this.tone({ freq: 950, type: "sawtooth", dur: 0.14, vol: 0.22, slide: 140 });
        this.noise({ freq: 2600, freqTo: 300, dur: 0.22, vol: 0.2 }); break;
      case "flame": this.noise({ freq: 700, freqTo: 2000, dur: 0.22, vol: 0.1, filter: "bandpass" }); break;
      case "tesla":
        [0, 0.045, 0.09].forEach((d) => this.tone({ freq: rand(900, 1500), type: "square", dur: 0.06, vol: 0.13, delay: d }));
        break;
      case "hit": this.tone({ freq: rand(260, 420), type: "square", dur: 0.04, vol: 0.08, slide: 150 }); break;
      case "zeath":
        this.noise({ freq: 1400, freqTo: 160, dur: 0.32, vol: 0.32 });
        this.tone({ freq: 190, type: "sawtooth", dur: 0.28, vol: 0.18, slide: 55 }); break;
      case "growl": this.tone({ freq: rand(70, 110), type: "sawtooth", dur: 0.5, vol: 0.14, slide: 45 }); break;
      case "spit": this.noise({ freq: 2400, freqTo: 700, dur: 0.18, vol: 0.16, filter: "bandpass" }); break;
      case "explode":
        this.noise({ freq: 1400, freqTo: 80, dur: 0.6, vol: 0.5 });
        this.tone({ freq: 90, type: "sine", dur: 0.5, vol: 0.35, slide: 35 }); break;
      case "freeze":
        [0, 0.06, 0.12, 0.18].forEach((d, i) => this.tone({ freq: 1200 + i * 380, type: "sine", dur: 0.2, vol: 0.16, delay: d }));
        break;
      case "repair":
        [0, 0.1, 0.2].forEach((d, i) => this.tone({ freq: 480 + i * 200, type: "triangle", dur: 0.18, vol: 0.2, delay: d }));
        break;
      case "wave":
        [0, 0.13, 0.26].forEach((d, i) => this.tone({ freq: [392, 494, 587][i], type: "triangle", dur: 0.3, vol: 0.24, delay: d }));
        break;
      case "achievement":
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: "triangle", dur: 0.34, vol: 0.24, delay: i * 0.09 }));
        break;
      case "boss":
        [0, 0.2, 0.4].forEach((d) => this.tone({ freq: 82, type: "sawtooth", dur: 0.5, vol: 0.3, delay: d, slide: 50 }));
        this.noise({ freq: 300, freqTo: 90, dur: 0.7, vol: 0.3 }); break;
      case "coin": this.tone({ freq: 1046, type: "triangle", dur: 0.08, vol: 0.2, slide: 1568 }); break;
      case "lose":
        [523, 466, 392, 294].forEach((f, i) => this.tone({ freq: f, type: "sawtooth", dur: 0.5, vol: 0.25, delay: i * 0.18 }));
        break;
    }
  }

  /* ---- music: a 16-step sequencer with a bass line and a lead ---- */
  startMusic(track) {
    track = track || "menu";
    const map = { menu: "music/menu", battle: "music/gameplay", boss: "music/boss", gameover: "music/gameover" };
    const key = map[track] || ("music/" + track);
    if (this.samples && this.samples[key]) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this._musicKey === key && this.musicEl && !this.musicEl.paused) { this.track = track; this.playing = true; return; }
      if (this.musicEl) { try { this.musicEl.pause(); } catch (e) {} }
      this.musicEl = this.samples[key]; this._musicKey = key;
      this.musicEl.loop = true;
      this.musicEl.volume = this.musicOn ? 0.5 : 0;
      try { this.musicEl.currentTime = 0; this.musicEl.play().catch(() => {}); } catch (e) {}
      this.track = track; this.playing = true;
      return;
    }
    if (!this.ctx) return;
    if (this.musicEl) { try { this.musicEl.pause(); } catch (e) {} }
    this.track = track;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 40);
  }
  stopMusic() {
    this.playing = false;
    if (this.musicEl) { try { this.musicEl.pause(); } catch (e) {} }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _schedule() {
    if (!this.ctx || !this.playing) return;
    const bassMenu = [110, 0, 110, 0, 146.8, 0, 110, 0, 98, 0, 98, 0, 130.8, 0, 146.8, 0];
    const leadMenu = [440, 0, 523, 0, 659, 0, 523, 0, 392, 0, 466, 0, 587, 0, 523, 0];
    const bassBattle = [110, 110, 0, 110, 110, 0, 146, 0, 110, 110, 0, 110, 165, 0, 146, 0];
    const leadBattle = [659, 0, 784, 659, 880, 0, 784, 0, 587, 0, 698, 587, 784, 0, 880, 0];
    const isBattle = this.track === "battle";
    const bass = isBattle ? bassBattle : bassMenu;
    const lead = isBattle ? leadBattle : leadMenu;
    const stepDur = isBattle ? 0.115 : 0.16;
    const ahead = this.ctx.currentTime + 0.25;
    while (this.nextTime < ahead) {
      const s = this.step % 16;
      const t = this.nextTime;
      const dest = this.musicBus;
      if (bass[s]) this.tone({ freq: bass[s], type: "triangle", dur: stepDur * 1.8, vol: 0.16, dest, delay: t - this.ctx.currentTime });
      if (lead[s] && (s % 2 === 0 || Math.random() < 0.6))
        this.tone({ freq: lead[s], type: "square", dur: stepDur * 1.2, vol: 0.05, dest, delay: t - this.ctx.currentTime });
      if (isBattle && s % 4 === 0) this.noise({ freq: 7000, freqTo: 4000, dur: 0.05, vol: 0.05, filter: "highpass", dest, delay: t - this.ctx.currentTime });
      this.nextTime += stepDur;
      this.step++;
    }
  }
}
