/* =============================================================================
   Familiar — sound
   -----------------------------------------------------------------------------
   Strictly opt-in. Nothing is created until the visitor presses the sound
   toggle, and every sound is synthesised live with the Web Audio API:

     pad       a pleasant major-seventh chord that sinks and detunes with dread
     room      filtered brown noise, the sound of an empty room
     drone     detuned low sawtooths through a resonant filter
     heart     a heartbeat that slowly speeds up
     whine     a thin, beating high tone at the very end
     sting     one hit, for the scare
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const btn = document.getElementById('sound-toggle');
  const label = document.getElementById('sound-label');
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) {
    if (btn) btn.hidden = true;
    F.audio = { sting() {}, hush() {}, on: false };
    return;
  }

  let ctx = null;
  let master;
  let padGain;
  let pad = [];
  let roomGain;
  let droneGain;
  let droneFilter;
  let heartGain;
  let whineGain;
  let on = false;
  let hushed = false;
  let nextBeat = 0;
  let bpm = 52;

  function init() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    // pad: Cmaj7, the most reassuring chord in marketing
    padGain = ctx.createGain();
    padGain.gain.value = 0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1600;
    padGain.connect(padFilter).connect(master);
    [261.63, 329.63, 392.0, 493.88].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g).connect(padGain);
      o.start();
      pad.push({ o, drift: (i % 2 ? 1 : -1) * F.rand(0.6, 1.4) });
    });

    // room tone: brown noise
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 380;
    roomGain = ctx.createGain();
    roomGain.gain.value = 0;
    noise.connect(nf).connect(roomGain).connect(master);
    noise.start();

    // drone
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 140;
    droneFilter.Q.value = 7;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneFilter.connect(droneGain).connect(master);
    [55, 55.9, 41.2, 82.7].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      o.connect(g).connect(droneFilter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 60;
    lfo.connect(lfoAmt).connect(droneFilter.frequency);
    lfo.start();

    // heartbeat bus
    heartGain = ctx.createGain();
    heartGain.gain.value = 0;
    heartGain.connect(master);

    // whine
    whineGain = ctx.createGain();
    whineGain.gain.value = 0;
    whineGain.connect(master);
    [1760, 1766.5].forEach((f) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(whineGain);
      o.start();
    });

    nextBeat = ctx.currentTime + 0.5;
    setInterval(scheduleHeart, 60);
  }

  function thump(time, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, time);
    o.frequency.exponentialRampToValueAtTime(34, time + 0.14);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    o.connect(g).connect(heartGain);
    o.start(time);
    o.stop(time + 0.32);
  }

  function scheduleHeart() {
    if (!ctx || !on) return;
    while (nextBeat < ctx.currentTime + 0.2) {
      thump(nextBeat, 0.9);
      thump(nextBeat + 0.26, 0.55);
      nextBeat += 60 / bpm;
    }
  }

  function apply(d) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const tc = 0.6;
    padGain.gain.setTargetAtTime(0.09 * (1 - F.smooth(0.5, 0.78, d)), t, tc);
    pad.forEach((p) => p.o.detune.setTargetAtTime(p.drift * d * 80 - d * 140, t, 1.5));
    roomGain.gain.setTargetAtTime(0.012 + 0.09 * d, t, tc);
    droneGain.gain.setTargetAtTime(0.2 * F.smooth(0.3, 0.8, d), t, tc);
    droneFilter.frequency.setTargetAtTime(120 + 520 * d * d, t, tc);
    heartGain.gain.setTargetAtTime(0.5 * F.smooth(0.5, 0.75, d), t, tc);
    whineGain.gain.setTargetAtTime(0.012 * F.smooth(0.84, 1, d), t, tc);
    bpm = 52 + 64 * F.smooth(0.5, 1, d);
    master.gain.setTargetAtTime(on && !hushed ? 0.85 : 0, t, hushed ? 0.05 : 0.4);
  }

  function sting() {
    if (!ctx || !on) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    out.connect(ctx.destination);

    // screech: detuned saws sweeping down
    [880, 932, 1245].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f / 5, t + 1.2);
      o.connect(out);
      o.start(t);
      o.stop(t + 1.6);
    });
    // noise burst
    const len = ctx.sampleRate * 0.8;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    n.connect(hp).connect(out);
    n.start(t);
    // boom
    const b = ctx.createOscillator();
    const bg = ctx.createGain();
    b.frequency.setValueAtTime(90, t);
    b.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    bg.gain.setValueAtTime(1.2, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    b.connect(bg).connect(ctx.destination);
    b.start(t);
    b.stop(t + 1.3);
  }

  let lastLabel = '';
  function renderLabel() {
    const begging = !on && F.dread > 0.8;
    const text = F.t(on ? 'sound.on' : begging ? 'sound.beg' : 'sound.off');
    if (text === lastLabel) return;
    lastLabel = text;
    btn.classList.toggle('is-begging', begging);
    btn.setAttribute('aria-pressed', String(on));
    label.textContent = text;
  }

  btn.addEventListener('click', () => {
    if (!ctx) init();
    on = !on;
    if (on && ctx.state === 'suspended') ctx.resume();
    apply(F.dread);
    renderLabel();
  });

  F.on('dread', (d) => {
    apply(d);
    renderLabel();
  });
  F.on('lang', renderLabel);
  renderLabel();

  F.audio = {
    sting,
    /* silence everything (quickly), e.g. right before something happens */
    hush(v) {
      hushed = !!v;
      apply(F.dread);
    },
    get on() { return on; },
  };
})();
