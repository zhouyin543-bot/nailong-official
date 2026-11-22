/* ============================================================
   Cinema Horror Foley & 3D Binaural Web Audio Engine
   Real-time synthesis: cute duang chime, wall light switch,
   hollow wooden door knocks, creaking hinges, xenon camera flash
   whine, 3D stereo-panned breathing, bulb shatter & climax slam!
   ============================================================ */

class CinemaHorrorAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.dread = 0;
    this.masterGain = null;
    this.ambientGain = null;
    this.droneGain = null;
    this.noiseBuffer = null;
    this.musicTimer = null;
    this.breathTimer = null;
    this.breathingActive = false;
    this.breathPan = -0.8;
    this.silenced = false;
    this.noteIdx = 0;
    this.melody = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25];
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    // Pre-generate 3s white/pinkish noise buffer for realistic foley
    const len = this.ctx.sampleRate * 3;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = this.noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      ch[i] = (last + 0.08 * white) / 1.08; // smooth natural air/room texture
      last = ch[i];
    }

    // Subtle dark room tone + cold distant fluorescent buzz
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.0001;
    const ambSrc = this.ctx.createBufferSource();
    ambSrc.buffer = this.noiseBuffer;
    ambSrc.loop = true;
    const ambLp = this.ctx.createBiquadFilter();
    ambLp.type = 'lowpass';
    ambLp.frequency.value = 420;
    ambSrc.connect(ambLp);
    ambLp.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    ambSrc.start();

    // Unsettling low sub-bass cinema room pressure (34Hz + 35.2Hz)
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0001;
    const dFilter = this.ctx.createBiquadFilter();
    dFilter.type = 'lowpass';
    dFilter.frequency.value = 95;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = 34.0;
    o2.frequency.value = 35.2;
    o1.connect(dFilter);
    o2.connect(dFilter);
    dFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    o1.start();
    o2.start();

    this._startMusicLoop();
    this._startBreathingLoop();
  }

  toggle() {
    if (!this.ctx) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.8 : 0.0001, now, 0.12);
    this.updateDread(this.dread);
    return this.enabled;
  }

  enable() {
    if (!this.enabled) return this.toggle();
    return true;
  }

  _makePanner(panVal) {
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, panVal));
      return p;
    }
    return this.ctx.createGain();
  }

  updateDread(d) {
    this.dread = Math.max(0, Math.min(1, d));
    if (!this.ctx || !this.enabled || this.silenced) return;
    const now = this.ctx.currentTime;

    // Very gentle room pressure only after 38% (NO early cheesy horror drone!)
    const amb = this.dread > 0.36 ? Math.pow((this.dread - 0.36) / 0.64, 1.4) * 0.24 : 0.0001;
    const drone = this.dread > 0.50 ? Math.pow((this.dread - 0.50) / 0.50, 1.5) * 0.38 : 0.0001;
    this.ambientGain.gain.setTargetAtTime(amb, now, 0.35);
    this.droneGain.gain.setTargetAtTime(drone, now, 0.35);
  }

  setBreathingActive(active) {
    this.breathingActive = active;
  }

  cutToSilence() {
    this.silenced = true;
    this.breathingActive = false;
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(0.0001, now, 0.03);
    this.droneGain.gain.setTargetAtTime(0.0001, now, 0.03);
  }

  restoreAmbient() {
    this.silenced = false;
    this.updateDread(this.dread);
  }

  // Cheerful cartoon chime that gently slows/warps as you descend (stops completely before bedroom)
  _startMusicLoop() {
    const tick = () => {
      if (this.ctx && this.enabled && !this.silenced && this.dread < 0.54) {
        const now = this.ctx.currentTime;
        const base = this.melody[this.noteIdx % this.melody.length];
        this.noteIdx++;
        // Pure cheerful in 0..0.28, subtle uncanny pitch sag in 0.28..0.54
        const sag = this.dread > 0.28 ? 1.0 - (this.dread - 0.28) * 0.42 : 1.0;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * sag, now);
        if (this.dread > 0.34) {
          osc.frequency.exponentialRampToValueAtTime(base * sag * 0.94, now + 0.7);
        }
        const vol = 0.075 * Math.max(0.15, 1.0 - this.dread * 1.45);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.58 + this.dread * 0.6);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 1.3);
      }
      const next = 460 + Math.pow(Math.max(0, this.dread - 0.18), 1.6) * 1800;
      this.musicTimer = setTimeout(tick, next);
    };
    this.musicTimer = setTimeout(tick, 600);
  }

  // 3D Stereo-Panned Slow Wet Breathing in the Dark Bedroom!
  _startBreathingLoop() {
    const breathe = () => {
      if (this.ctx && this.enabled && !this.silenced && this.breathingActive && this.noiseBuffer) {
        const now = this.ctx.currentTime;
        // Slowly shift from left ear (-0.82) to right ear (+0.82)
        this.breathPan = -this.breathPan * (0.85 + Math.random() * 0.25);
        const panner = this._makePanner(this.breathPan);
        panner.connect(this.masterGain);

        // Inhale (0..1.1s) + Wet raspy Exhale (1.3..2.7s)
        const playHalf = (offset, dur, freq, peak) => {
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(freq, now + offset);
          bp.frequency.linearRampToValueAtTime(freq * 0.78, now + offset + dur);
          bp.Q.value = 3.2;

          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, now + offset);
          g.gain.linearRampToValueAtTime(peak, now + offset + dur * 0.42);
          g.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

          src.connect(bp);
          bp.connect(g);
          g.connect(panner);
          src.start(now + offset, Math.random());
          src.stop(now + offset + dur + 0.05);
        };
        playHalf(0, 1.05, 620, 0.22);
        playHalf(1.25, 1.35, 420, 0.28);
      }
      this.breathTimer = setTimeout(breathe, 3400 + Math.random() * 900);
    };
    this.breathTimer = setTimeout(breathe, 1200);
  }

  // Interactive #1: Cute bouncy belly-poke sound (turns eerie on click >= 4!)
  playDuang(clickNum) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    if (clickNum <= 3) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(590, now + 0.11);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.24);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Uncanny flat slow downward pitch drop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.55);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.16, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.68);
    }
  }

  // Interactive #3: Realistic Bedroom Wall Light Switch CLICK (and broken spark!)
  playLightSwitch(broken = false) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = broken ? 2400 : 1850;
    hp.Q.value = 2.0;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    src.start(now, 0.2);
    src.stop(now + 0.06);

    if (broken) {
      // Tiny electrical filament buzz
      const buzz = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      buzz.type = 'sawtooth';
      buzz.frequency.value = 120;
      bg.gain.setValueAtTime(0.12, now + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      buzz.connect(bg);
      bg.connect(this.masterGain);
      buzz.start(now + 0.03);
      buzz.stop(now + 0.2);
    }
  }

  // Realistic Hollow Wooden Door Knock ("咚… 咚… 咚…") spatialized in 3D stereo!
  playWoodKnock(count = 3, pan = 0.6, vol = 0.6) {
    if (!this.ctx || !this.enabled) return;
    const panner = this._makePanner(pan);
    panner.connect(this.masterGain);

    for (let i = 0; i < count; i++) {
      const t = this.ctx.currentTime + i * (0.38 + Math.random() * 0.08);
      // Hollow wood body resonance
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145 + (Math.random() - 0.5) * 14, t);
      osc.frequency.exponentialRampToValueAtTime(68, t + 0.085);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(g);
      g.connect(panner);
      osc.start(t);
      osc.stop(t + 0.15);

      // Knuckle tap transient
      if (this.noiseBuffer) {
        const n = this.ctx.createBufferSource();
        n.buffer = this.noiseBuffer;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 480;
        bp.Q.value = 2.8;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(vol * 0.65, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        n.connect(bp);
        bp.connect(ng);
        ng.connect(panner);
        n.start(t, Math.random());
        n.stop(t + 0.06);
      }
    }
  }

  // Wooden door hinge creak as user drags bedroom door open!
  playDoorCreak(strength = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260 + Math.random() * 80, now);
    osc.frequency.linearRampToValueAtTime(190 + Math.random() * 60, now + 0.24);

    lfo.frequency.value = 28 + strength * 24;
    lfoGain.gain.value = 42;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    bp.type = 'bandpass';
    bp.frequency.value = 640;
    bp.Q.value = 6.0;

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11 * strength, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.28);
    lfo.stop(now + 0.28);
  }

  playBulbShatter() {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.65, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    n.start(now, 0.1);
    n.stop(now + 0.32);

    const pop = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    pop.frequency.setValueAtTime(180, now);
    pop.frequency.exponentialRampToValueAtTime(34, now + 0.14);
    pg.gain.setValueAtTime(0.45, now);
    pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    pop.connect(pg);
    pg.connect(this.masterGain);
    pop.start(now);
    pop.stop(now + 0.18);
  }

  // Camera shutter click + authentic xenon flash capacitor recharge whine!
  playCameraFlash(failed = false) {
    if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Shutter snap
    const snap = this.ctx.createBufferSource();
    snap.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = failed ? 1400 : 3200;
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(failed ? 0.22 : 0.55, now);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    snap.connect(bp);
    bp.connect(sg);
    sg.connect(this.masterGain);
    snap.start(now, 0.3);
    snap.stop(now + 0.06);

    if (!failed) {
      // Classic creepy camera flash recharge rising whine (1.9kHz -> 6.8kHz)
      const whine = this.ctx.createOscillator();
      const wg = this.ctx.createGain();
      whine.type = 'sine';
      whine.frequency.setValueAtTime(1750, now + 0.06);
      whine.frequency.exponentialRampToValueAtTime(6600, now + 1.15);
      wg.gain.setValueAtTime(0.0001, now + 0.06);
      wg.gain.linearRampToValueAtTime(0.055, now + 0.18);
      wg.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      whine.connect(wg);
      wg.connect(this.masterGain);
      whine.start(now + 0.06);
      whine.stop(now + 1.3);
    }
  }

  playFootstep(pan = 0, vol = 0.45) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const panner = this._makePanner(pan);
    panner.connect(this.masterGain);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(86, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.16);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(g);
    g.connect(panner);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // THE R-RATED HORROR MOVIE CLIMAX DETONATION!
  playClimaxLunge() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    // 1. Massive cinema sub-bass chest slam
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 1.5);
    subG.gain.setValueAtTime(0.001, now);
    subG.gain.linearRampToValueAtTime(1.0, now + 0.018);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
    sub.connect(subG);
    subG.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 2.5);

    // 2. Dissonant waterphone / Insidious horror violin shriek
    [790, 842, 1270, 1345, 2240, 2390].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const bp = this.ctx.createBiquadFilter();
      o.type = i % 2 === 0 ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(freq, now);
      o.frequency.linearRampToValueAtTime(freq * (i % 2 === 0 ? 1.12 : 0.89), now + 1.25);
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 3.0;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.10, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
      o.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      o.start(now);
      o.stop(now + 2.0);
    });

    // 3. Visceral distorted noise impact + phone dropping onto wooden floor at +0.75s
    if (this.noiseBuffer) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.65, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      n.connect(g);
      g.connect(this.masterGain);
      n.start(now, 0.1);
      n.stop(now + 0.9);
    }

    setTimeout(() => {
      this.playFootstep(-0.3, 0.65);
      setTimeout(() => this.playFootstep(0.25, 0.32), 180);
    }, 850);
  }
}

window.horrorAudio = new CinemaHorrorAudio();
