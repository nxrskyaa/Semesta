// Semesta audio — everything is synthesized with WebAudio (no files):
// generative music (calm day / tense night / combat layer) + a full SFX kit
// + a filtered-noise rain loop for the weather system.

export function createAudio() {
  let ctx = null;
  let master, musicBus, sfxBus;
  let muted = localStorage.getItem('semesta.muted') === '1';
  let started = false;

  // state musik
  let nextNoteTime = 0;
  let step = 0;
  let mood = 'day'; // day | night
  let combat = 0;   // 0..1 intensitas
  let schedTimer = null;

  const SCALES = {
    day: [0, 3, 5, 7, 10, 12, 15, 17],      // A minor pentatonic-ish, hangat
    night: [0, 2, 3, 7, 8, 12, 14, 15],     // harmonic minor color, tegang
    menu: [0, 4, 7, 9, 12, 16, 19, 21],     // major pentatonic — dreamy music box
  };
  const ROOT = { day: 220, night: 196, menu: 262 }; // A3 / G3 / C4
  const BPM = { day: 64, night: 66, menu: 54 };     // lazy, hammock-y tempos

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.5;
    const musicLP = ctx.createBiquadFilter();
    musicLP.type = 'lowpass';
    musicLP.frequency.value = 2400;
    musicBus.connect(musicLP).connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);
  }

  function start() {
    if (started) return;
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    started = true;
    nextNoteTime = ctx.currentTime + 0.1;
    schedTimer = setInterval(scheduleMusic, 80);
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('semesta.muted', muted ? '1' : '0');
    if (master) master.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.1);
    return muted;
  }

  function isMuted() { return muted; }

  // -------------------------------------------------------------------------
  // MUSIK generatif: pad akor + arpeggio pluck + bass, tempo 72bpm, 8 step/bar
  // -------------------------------------------------------------------------
  const CHORDS = {
    day: [[0, 5, 9], [0, 3, 7], [-2, 3, 7], [0, 5, 10]],
    night: [[0, 3, 8], [-2, 2, 7], [0, 3, 6], [-4, 0, 5]],
    menu: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [-3, 2, 5]], // I - vi - IV - ii, cozy
  };
  // a SECOND progression per mood — the track alternates every 4 bars so it
  // never loops into sameness
  const CHORDS_B = {
    day: [[0, 3, 7], [-4, 0, 5], [-2, 3, 7], [0, 5, 9]],
    night: [[-2, 2, 7], [0, 3, 8], [-4, 0, 5], [0, 2, 7]],
    menu: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [-3, 2, 5]],
  };
  let bar = 0;
  let progB = false; // which progression is playing

  function noteHz(root, semi) { return root * Math.pow(2, semi / 12); }

  function scheduleMusic() {
    if (!ctx || muted) { return; }
    const stepDur = 60 / (BPM[mood] || 72) / 2; // 8th notes
    while (nextNoteTime < ctx.currentTime + 0.35) {
      playStep(step, nextNoteTime, stepDur);
      step = (step + 1) % 8;
      if (step === 0) {
        bar = (bar + 1) % 4;
        if (bar === 0) progB = !progB; // swap progressions every 4 bars
      }
      nextNoteTime += stepDur;
    }
  }

  function playStep(s, t, dur) {
    const root = ROOT[mood];
    const scale = SCALES[mood];
    const chord = (progB ? CHORDS_B : CHORDS)[mood][bar];

    // MENU: dreamy music-box waltz — soft pad swells, sparse bell melody,
    // no percussion. Deliberately different from the in-world tracks.
    if (mood === 'menu') {
      if (s === 0) {
        for (const semi of chord) pad(noteHz(root, semi), t, dur * 8.6, 0.038);
        bassPluck(noteHz(root / 2, chord[0]), t, dur * 8, 0.07);
      }
      // gentle fixed arpeggio: root-3rd-5th-octave rising through the bar
      if (s % 2 === 0) {
        const arp = [chord[0], chord[1], chord[2], chord[0] + 12][s / 2];
        bell(noteHz(root * 2, arp), t, 0.045);
      }
      // occasional high twinkle
      if (s === 5 && Math.random() < 0.5) {
        bell(noteHz(root * 4, scale[Math.floor(Math.random() * scale.length)]), t, 0.025);
      }
      return;
    }

    // pad akor di awal bar
    if (s === 0) {
      for (const semi of chord) pad(noteHz(root, semi), t, dur * 8.4, 0.046);
      bassPluck(noteHz(root / 2, chord[0]), t, dur * 7, 0.1);
    }
    // melody: warm kalimba by day, softer pluck by night — sparse & lazy
    const density = 0.3 + combat * 0.4 + (mood === 'night' ? -0.08 : 0);
    if (Math.random() < density && s % 2 === (mood === 'day' ? 0 : 1)) {
      const semi = scale[Math.floor(Math.random() * scale.length)];
      if (mood === 'day') kalimba(noteHz(root * 2, semi), t, 0.055 + Math.random() * 0.02);
      else pluck(noteHz(root * 2, semi), t, 0.05 + Math.random() * 0.02);
    }
    // occasional playful grace pair (two quick kalimba 16ths) in the day
    if (mood === 'day' && s === 5 && Math.random() < 0.2 && combat < 0.2) {
      const a = scale[Math.floor(Math.random() * 4)];
      const b = scale[Math.min(scale.length - 1, Math.floor(Math.random() * 4) + 2)];
      kalimba(noteHz(root * 2, a), t, 0.04);
      kalimba(noteHz(root * 2, b), t + dur * 0.5, 0.04);
    }
    // perkusi saat combat (gentler than before)
    if (combat > 0.15) {
      if (s === 0 || (s === 4 && combat > 0.5)) kick(t, 0.13 * combat);
      if (s % 2 === 1) hat(t, 0.035 * combat);
    }
  }

  // kalimba: rounded thumb-piano pluck — triangle body + airy octave overtone
  function kalimba(freq, t, vol) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.004;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
    o.start(t); o2.start(t);
    o.stop(t + 0.9); o2.stop(t + 0.9);
  }

  // music-box bell: sine + soft 3rd harmonic with a long shimmering decay
  function bell(freq, t, vol) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 3.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
    o.start(t); o2.start(t);
    o.stop(t + 1.5); o2.stop(t + 1.5);
  }

  function pad(freq, t, dur, vol) {
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq * 1.006;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o1.connect(f); o2.connect(f); f.connect(g).connect(musicBus);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  function pluck(freq, t, vol) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + 0.55);
  }

  function bassPluck(freq, t, dur, vol) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + dur + 0.1);
  }

  function kick(t, vol) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + 0.2);
  }

  function hat(t, vol) {
    const b = noiseBuf();
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(musicBus);
    src.start(t); src.stop(t + 0.06);
  }

  let _noise = null;
  function noiseBuf() {
    if (_noise) return _noise;
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    _noise = b;
    return b;
  }

  // setMood(true/false) = night/day (in-world); setMood('menu') = title/creation music
  function setMood(v) { mood = v === 'menu' ? 'menu' : (v ? 'night' : 'day'); }
  function setCombat(level) { combat += (level - combat) * 0.05; }

  // --- rain loop: looped noise through a lowpass, faded by intensity ---
  let rainSrc = null, rainGain = null;
  function setRain(intensity) {
    if (!ctx || !started) return;
    if (intensity > 0.02 && !rainSrc) {
      rainSrc = ctx.createBufferSource();
      rainSrc.buffer = noiseBuf();
      rainSrc.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      rainGain = ctx.createGain();
      rainGain.gain.value = 0;
      rainSrc.connect(f).connect(rainGain).connect(master);
      rainSrc.start();
    }
    if (rainGain) {
      rainGain.gain.linearRampToValueAtTime(muted ? 0 : intensity * 0.055, ctx.currentTime + 0.4);
    }
    if (intensity <= 0.02 && rainSrc) {
      const src = rainSrc, g = rainGain;
      rainSrc = null; rainGain = null;
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 800);
    }
  }

  // -------------------------------------------------------------------------
  // SFX
  // -------------------------------------------------------------------------
  function env(g, t, a, vol, d) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(type, f0, f1, dur, vol, t = null) {
    if (!ctx || muted) return;
    t = t ?? ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.1);
  }

  function noise(dur, vol, fType = 'bandpass', f0 = 1200, f1 = null, t = null) {
    if (!ctx || muted) return;
    t = t ?? ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = fType;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    env(g, t, 0.005, vol, dur);
    src.connect(f).connect(g).connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.1);
  }

  const SFX = {
    swing:      () => noise(0.16, 0.22, 'bandpass', 900, 2600),
    swing_bow:  () => { noise(0.08, 0.12, 'highpass', 2000); tone('triangle', 700, 250, 0.14, 0.1); },
    swing_staff:() => { tone('sine', 300, 700, 0.2, 0.12); noise(0.18, 0.08, 'bandpass', 1600, 600); },
    hit:        () => { tone('square', 200, 90, 0.09, 0.16); noise(0.07, 0.14, 'lowpass', 900); },
    hit_squish: () => { noise(0.12, 0.2, 'lowpass', 500, 150); tone('sine', 260, 90, 0.1, 0.1); },
    crit:       () => { tone('square', 320, 110, 0.1, 0.18); tone('sine', 1400, 2000, 0.08, 0.1); },
    hurt:       () => { tone('sawtooth', 160, 70, 0.18, 0.2); noise(0.1, 0.1, 'lowpass', 500); },
    death_squish:() => { noise(0.3, 0.22, 'lowpass', 600, 100); tone('sine', 220, 55, 0.28, 0.14); },
    death_chirp:() => { tone('square', 900, 250, 0.22, 0.12); },
    death_thud: () => { tone('sine', 130, 45, 0.3, 0.22); noise(0.2, 0.14, 'lowpass', 400, 120); },
    pickup:     () => { tone('square', 660, 660, 0.05, 0.08); tone('square', 990, 990, 0.07, 0.08, ctx ? ctx.currentTime + 0.06 : null); },
    levelup:    () => { [440, 554, 659, 880].forEach((f, i) => tone('triangle', f, f, 0.16, 0.14, ctx ? ctx.currentTime + i * 0.09 : null)); },
    potion:     () => { tone('sine', 500, 900, 0.2, 0.1); tone('sine', 700, 1100, 0.2, 0.08, ctx ? ctx.currentTime + 0.1 : null); },
    roll:       () => noise(0.2, 0.14, 'bandpass', 500, 1400),
    craft:      () => { tone('square', 800, 780, 0.06, 0.14); tone('square', 1200, 1180, 0.09, 0.1, ctx ? ctx.currentTime + 0.1 : null); },
    forge_hit:  () => { tone('square', 1500, 400, 0.07, 0.2); noise(0.06, 0.16, 'highpass', 3000); },
    forge_ok:   () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.14, 0.13, ctx ? ctx.currentTime + i * 0.08 : null)); },
    forge_fail: () => { tone('sawtooth', 300, 90, 0.4, 0.16); },
    ui:         () => tone('square', 800, 800, 0.03, 0.05),
    deny:       () => tone('square', 220, 160, 0.12, 0.1),
    bash:       () => { tone('square', 150, 60, 0.16, 0.24); noise(0.14, 0.2, 'lowpass', 800, 200); },
    whirl:      () => noise(0.4, 0.2, 'bandpass', 600, 2200),
    warcry:     () => { tone('sawtooth', 180, 320, 0.3, 0.18); tone('sawtooth', 120, 240, 0.34, 0.14); },
    powershot:  () => { noise(0.1, 0.16, 'highpass', 1800); tone('triangle', 900, 200, 0.2, 0.14); },
    multishot:  () => { for (let i = 0; i < 3; i++) noise(0.08, 0.1, 'highpass', 2000, null, ctx ? ctx.currentTime + i * 0.05 : null); },
    swiftness:  () => { tone('sine', 600, 1400, 0.25, 0.1); },
    fireball:   () => { noise(0.3, 0.16, 'lowpass', 900, 300); tone('sawtooth', 200, 90, 0.3, 0.1); },
    explosion:  () => { noise(0.45, 0.3, 'lowpass', 700, 60); tone('sine', 110, 35, 0.4, 0.24); },
    icenova:    () => { tone('sine', 1600, 2600, 0.2, 0.1); tone('sine', 2100, 3100, 0.24, 0.07, ctx ? ctx.currentTime + 0.05 : null); noise(0.3, 0.1, 'highpass', 4000); },
    blink:      () => { tone('sine', 900, 90, 0.16, 0.12); tone('sine', 90, 1200, 0.14, 0.1, ctx ? ctx.currentTime + 0.08 : null); },
    dash:       () => noise(0.18, 0.18, 'bandpass', 700, 2400),
    fanknives:  () => { for (let i = 0; i < 4; i++) noise(0.06, 0.09, 'highpass', 2500, null, ctx ? ctx.currentTime + i * 0.04 : null); },
    spit:       () => { tone('sine', 400, 150, 0.14, 0.1); noise(0.1, 0.08, 'lowpass', 700); },
    wisp_shot:  () => tone('sine', 1200, 500, 0.18, 0.1),
    boar_charge:() => { tone('sawtooth', 140, 90, 0.3, 0.18); noise(0.25, 0.12, 'lowpass', 500); },
    death_player:() => { [330, 262, 196, 131].forEach((f, i) => tone('sawtooth', f, f, 0.3, 0.14, ctx ? ctx.currentTime + i * 0.22 : null)); },
    // fishing — gentle & watery: pure soft sines, NO noise buzz at all
    cast:       () => { tone('sine', 420, 190, 0.22, 0.055); tone('sine', 300, 140, 0.14, 0.035, ctx ? ctx.currentTime + 0.16 : null); },
    splash:     () => { tone('sine', 250, 90, 0.2, 0.06); tone('sine', 170, 70, 0.16, 0.04, ctx ? ctx.currentTime + 0.05 : null); },
    bite:       () => { tone('sine', 620, 640, 0.1, 0.11); tone('sine', 880, 900, 0.13, 0.11, ctx ? ctx.currentTime + 0.12 : null); },
    catch:      () => { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.12, 0.11, ctx ? ctx.currentTime + i * 0.07 : null)); },
    // world & quests
    chest:      () => { tone('square', 300, 500, 0.1, 0.12); [660, 880, 1100].forEach((f, i) => tone('triangle', f, f, 0.12, 0.1, ctx ? ctx.currentTime + 0.1 + i * 0.07 : null)); },
    talk:       () => { tone('square', 520, 660, 0.05, 0.06); },
    quest_accept: () => { [440, 587].forEach((f, i) => tone('triangle', f, f, 0.14, 0.12, ctx ? ctx.currentTime + i * 0.09 : null)); },
    quest_done: () => { [523, 659, 784, 988, 1175].forEach((f, i) => tone('triangle', f, f, 0.15, 0.13, ctx ? ctx.currentTime + i * 0.08 : null)); },
    pet_summon: () => { [660, 880, 990].forEach((f, i) => tone('sine', f, f * 1.2, 0.12, 0.1, ctx ? ctx.currentTime + i * 0.06 : null)); },
    thunder:    () => { noise(0.9, 0.2, 'lowpass', 300, 60); tone('sine', 80, 30, 0.7, 0.16); },
    jump:       () => noise(0.12, 0.1, 'bandpass', 700, 1800),
    land:       () => { tone('sine', 150, 60, 0.1, 0.1); noise(0.08, 0.08, 'lowpass', 600); },
    roar:       () => { tone('sawtooth', 90, 40, 1.0, 0.22); tone('sawtooth', 130, 55, 0.9, 0.16, ctx ? ctx.currentTime + 0.1 : null); noise(0.8, 0.14, 'lowpass', 500, 120); },
    mount:      () => { tone('square', 400, 700, 0.08, 0.1); tone('square', 700, 1000, 0.1, 0.1, ctx ? ctx.currentTime + 0.09 : null); },
    // gacha — a rattling crank, then a reveal fanfare that scales with rarity
    gacha_crank: () => {
      if (!ctx) return;
      for (let i = 0; i < 6; i++) {
        noise(0.05, 0.1, 'bandpass', 1400 + i * 180, null, ctx.currentTime + i * 0.11);
        tone('square', 220 + i * 40, 200, 0.04, 0.06, ctx.currentTime + i * 0.11);
      }
    },
    gacha_pop: () => { tone('sine', 300, 900, 0.12, 0.14); noise(0.08, 0.12, 'highpass', 2200); },
    // rising tension sweep while the capsule tumbles
    gacha_riser: () => {
      if (!ctx) return;
      tone('sine', 220, 880, 0.85, 0.06);
      [330, 392, 494, 587].forEach((f, i) => tone('triangle', f, f, 0.1, 0.05, ctx.currentTime + 0.15 + i * 0.18));
    },
    // capsule falls out & bounces
    gacha_drop: () => {
      if (!ctx) return;
      tone('sine', 500, 180, 0.12, 0.12);
      tone('sine', 400, 160, 0.09, 0.09, ctx.currentTime + 0.18);
      tone('sine', 350, 150, 0.06, 0.06, ctx.currentTime + 0.32);
    },
    reveal_common:   () => { [523, 659].forEach((f, i) => tone('triangle', f, f, 0.12, 0.11, ctx ? ctx.currentTime + i * 0.08 : null)); },
    reveal_uncommon: () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.12, 0.12, ctx ? ctx.currentTime + i * 0.08 : null)); },
    reveal_rare:     () => { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.13, 0.13, ctx ? ctx.currentTime + i * 0.08 : null)); },
    reveal_epic:     () => {
      [440, 554, 659, 880, 1108].forEach((f, i) => tone('triangle', f, f, 0.15, 0.13, ctx ? ctx.currentTime + i * 0.08 : null));
      noise(0.3, 0.08, 'highpass', 3500);
    },
    reveal_legendary: () => {
      if (!ctx) return;
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone('triangle', f, f, 0.18, 0.14, ctx.currentTime + i * 0.09));
      tone('sine', 2093, 2093, 0.5, 0.07, ctx.currentTime + 0.54);
      noise(0.5, 0.09, 'highpass', 4000, null, ctx.currentTime + 0.3);
    },
    reveal_mythic: () => {
      if (!ctx) return;
      // shimmering rising arpeggio + deep boom + sparkle tail
      tone('sine', 60, 30, 0.5, 0.2);
      [392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) =>
        tone('triangle', f, f * 1.01, 0.2, 0.13, ctx.currentTime + 0.1 + i * 0.08));
      [2637, 3136, 3520].forEach((f, i) => tone('sine', f, f, 0.3, 0.05, ctx.currentTime + 0.8 + i * 0.12));
      noise(0.9, 0.08, 'highpass', 5000, null, ctx.currentTime + 0.4);
    },
    // level up — big two-bar fanfare with sparkle tail
    levelup_big: () => {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      [[392, 0], [523, 0.1], [659, 0.2], [784, 0.3], [1046, 0.42], [784, 0.56], [1046, 0.66], [1318, 0.78]]
        .forEach(([f, dt]) => tone('triangle', f, f, 0.2, 0.15, t0 + dt));
      tone('sine', 1568, 1568, 0.5, 0.06, t0 + 0.95);
      tone('sine', 100, 45, 0.35, 0.16, t0);
      noise(0.6, 0.07, 'highpass', 4200, null, t0 + 0.5);
    },
    teleport: () => {
      if (!ctx) return;
      tone('sine', 1400, 200, 0.3, 0.12);
      tone('sine', 200, 1600, 0.3, 0.12, ctx.currentTime + 0.28);
      noise(0.4, 0.08, 'highpass', 3000);
    },
  };

  function sfx(name) {
    if (!ctx || muted || !started) return;
    SFX[name]?.();
  }

  return { start, sfx, setMood, setCombat, setRain, toggleMute, isMuted };
}
