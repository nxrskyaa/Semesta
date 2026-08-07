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

  // ---------------------------------------------------------------------------
  // TRACKS. The old engine had ONE progression pair per mood, so however nice it
  // was you heard the same tune all session — that is the "cuma 1 lagu" problem.
  // Each mood now owns a SET of tracks, and each track is genuinely a different
  // piece: its own key, scale, tempo, chord progression and melodic voice. The
  // scheduler rotates to a different one every 16 bars, and never repeats the
  // track it just played.
  // ---------------------------------------------------------------------------
  const TRACKS = {
    day: [
      { name: 'Hammock Noon', root: 220, bpm: 64, voice: 'kalimba',
        scale: [0, 3, 5, 7, 10, 12, 15, 17],
        a: [[0, 5, 9], [0, 3, 7], [-2, 3, 7], [0, 5, 10]],
        b: [[0, 3, 7], [-4, 0, 5], [-2, 3, 7], [0, 5, 9]] },
      { name: 'Market Morning', root: 262, bpm: 76, voice: 'pluck',
        scale: [0, 2, 4, 7, 9, 12, 14, 16],           // major pentatonic, bright
        a: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [2, 5, 9]],
        b: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-1, 4, 7]] },
      { name: 'Long Grass', root: 196, bpm: 58, voice: 'kalimba',
        scale: [0, 2, 5, 7, 9, 12, 14, 17],           // mixolydian-ish, pastoral
        a: [[0, 4, 7], [-2, 2, 5], [-5, -1, 2], [0, 4, 9]],
        b: [[-5, -1, 2], [0, 4, 7], [-2, 2, 7], [0, 4, 7]] },
      { name: 'Wander', root: 233, bpm: 70, voice: 'bell',
        scale: [0, 3, 5, 6, 7, 10, 12, 15],           // a blue note in the middle
        a: [[0, 3, 7], [-2, 3, 8], [-4, 0, 7], [0, 5, 8]],
        b: [[0, 5, 8], [-4, 0, 7], [0, 3, 7], [-2, 3, 8]] },
    ],
    night: [
      { name: 'Lantern Road', root: 196, bpm: 66, voice: 'pluck',
        scale: [0, 2, 3, 7, 8, 12, 14, 15],
        a: [[0, 3, 8], [-2, 2, 7], [0, 3, 6], [-4, 0, 5]],
        b: [[-2, 2, 7], [0, 3, 8], [-4, 0, 5], [0, 2, 7]] },
      { name: 'Fireflies', root: 175, bpm: 54, voice: 'bell',
        scale: [0, 3, 5, 7, 10, 12, 15, 19],
        a: [[0, 3, 7], [-3, 0, 5], [-5, 0, 3], [0, 3, 10]],
        b: [[-5, 0, 3], [0, 3, 7], [-3, 0, 5], [-1, 3, 7]] },
      { name: 'Cold Stars', root: 208, bpm: 62, voice: 'pluck',
        scale: [0, 1, 5, 7, 8, 12, 13, 17],           // phrygian colour, a little eerie
        a: [[0, 5, 8], [-4, 1, 5], [0, 3, 8], [-2, 1, 7]],
        b: [[-4, 1, 5], [0, 5, 8], [-2, 1, 7], [0, 3, 8]] },
    ],
    // riding a jetski or swimming out at sea gets its own, brighter feel
    sea: [
      { name: 'Open Water', root: 247, bpm: 84, voice: 'pluck',
        scale: [0, 2, 4, 7, 9, 12, 14, 16],
        a: [[0, 4, 9], [2, 5, 9], [-3, 2, 7], [0, 4, 7]],
        b: [[-3, 2, 7], [0, 4, 9], [0, 4, 7], [2, 7, 11]] },
      { name: 'Trade Winds', root: 220, bpm: 92, voice: 'bell',
        scale: [0, 2, 5, 7, 9, 12, 14, 17],
        a: [[0, 5, 9], [-2, 3, 7], [0, 4, 9], [-5, 0, 4]],
        b: [[0, 4, 9], [-5, 0, 4], [0, 5, 9], [-2, 3, 7]] },
    ],
    menu: [
      { name: 'Title Waltz', root: 262, bpm: 54, voice: 'bell',
        scale: [0, 4, 7, 9, 12, 16, 19, 21],
        a: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [-3, 2, 5]],
        b: [[0, 4, 7], [-3, 0, 4], [-5, 0, 4], [-3, 2, 5]] },
    ],
  };

  // which track of the current mood is playing, and how long until it rotates
  let trackIdx = 0;
  let barsLeft = 16;

  /** Pick a DIFFERENT track from the mood's set. */
  function rollTrack(m) {
    const list = TRACKS[m] || TRACKS.day;
    if (list.length < 2) { trackIdx = 0; return; }
    let n = trackIdx;
    while (n === trackIdx) n = Math.floor(Math.random() * list.length);
    trackIdx = n;
  }
  const curTrack = () => (TRACKS[mood] || TRACKS.day)[trackIdx] || TRACKS.day[0];

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
  let bar = 0;
  let progB = false; // which progression is playing

  // --- MOTIFS ---------------------------------------------------------------
  // Eight-step shapes in SCALE DEGREES (null = rest). They are deliberately
  // simple and mostly stepwise, because a phrase you can hum is the whole point;
  // the variation comes from how they are answered, not from complexity.
  const MOTIF_SPAN = 8;
  const MOTIFS = [
    [0, null, 2, null, 4, null, 2, null],        // rising, open
    [4, 3, 2, null, 1, null, 0, null],           // falling, settled
    [0, 2, null, 4, 5, null, 4, null],           // arch
    [2, null, 2, 1, null, 3, null, 0],           // conversational
    [0, null, null, 3, null, 2, 4, null],        // sparse, wandering
    [5, 4, null, 2, null, 3, null, 1],           // descending answer
    [1, null, 3, null, 5, 4, null, 2],           // lifting
    [0, 1, 2, 3, null, 2, null, null],           // scalar run into a rest
  ];
  let motif = MOTIFS[0];
  let motifShift = 0;       // transposition in scale degrees
  let motifInvert = false;  // the answering phrase can mirror the question
  let motifOct = 2;         // 1 = low, 2 = an octave up
  let phraseBar = 0;        // 0..3 within the four-bar phrase

  /**
   * Pick the shape for the next two bars.
   * Bars 0-1 STATE a motif; bars 2-3 ANSWER it — same shape, moved, mirrored or
   * dropped an octave. That call-and-response is what makes eight notes sound
   * like a tune instead of a list.
   */
  function nextPhrase() {
    if (phraseBar === 0) {
      motif = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
      motifShift = 0;
      motifInvert = false;
      motifOct = 2;
    } else if (phraseBar === 2) {
      // the answer: usually a step down, sometimes mirrored, rarely an octave
      const r = Math.random();
      if (r < 0.45) motifShift = -2;
      else if (r < 0.75) { motifInvert = true; motifShift = 0; }
      else { motifOct = 1; motifShift = 2; }
    }
  }

  function noteHz(root, semi) { return root * Math.pow(2, semi / 12); }

  function scheduleMusic() {
    if (!ctx || muted) { return; }
    const stepDur = 60 / (curTrack().bpm || 72) / 2; // 8th notes
    while (nextNoteTime < ctx.currentTime + 0.35) {
      playStep(step, nextNoteTime, stepDur);
      step = (step + 1) % 8;
      if (step === 0) {
        bar = (bar + 1) % 4;
        phraseBar = bar;
        nextPhrase();
        if (bar === 0) {
          progB = !progB;              // swap progressions every 4 bars
          // and swap the whole TRACK every 16, so a session hears several
          if (--barsLeft <= 0) { barsLeft = 16; rollTrack(mood); }
        }
      }
      nextNoteTime += stepDur;
    }
  }

  function playStep(s, t, dur) {
    const tr = curTrack();
    const root = tr.root;
    const scale = tr.scale;
    const chord = (progB ? tr.b : tr.a)[bar];

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
    // MELODY BY MOTIF, not by dice.
    //
    // Every note used to be an independent random pick out of the scale. That
    // is why the music felt boring no matter how many chord progressions were
    // added: a random walk has no phrase, nothing repeats, and there is nothing
    // to remember. Music is memorable because it REPEATS and then varies.
    //
    // So: each phrase takes one 8-step motif of scale degrees (null = rest),
    // states it, and answers it — the answer is the same shape transposed,
    // reversed or octave-shifted. Bars 1-2 ask, bars 3-4 reply.
    if (mood !== 'menu') {
      const deg = motif[s];
      if (deg !== null && deg !== undefined) {
        let d = deg + motifShift;
        if (motifInvert) d = (MOTIF_SPAN - 1) - deg + motifShift;
        const semi = scale[Math.max(0, Math.min(scale.length - 1, d))];
        const oct = motifOct;
        const v = tr.voice;
        // the note is a touch stronger on the beat, so the phrase has stress
        const vol = (s % 4 === 0 ? 0.062 : 0.048) + combat * 0.012;
        if (v === 'kalimba') kalimba(noteHz(root * oct, semi), t, vol);
        else if (v === 'bell') bell(noteHz(root * oct, semi), t, vol * 0.92);
        else pluck(noteHz(root * oct, semi), t, vol * 0.95);
        // a soft echo a beat later — cheap, and it makes a small phrase sound
        // like it is happening in a place rather than in a box
        if (s % 4 === 0 && combat < 0.3) {
          const eV = v === 'bell' ? bell : v === 'kalimba' ? kalimba : pluck;
          eV(noteHz(root * oct, semi), t + dur * 3, vol * 0.3);
        }
      }
      // COUNTER-LINE: a slow arpeggio walking the current chord underneath the
      // melody, so there is always a second thing moving
      if (s === 2 || s === 6) {
        const ci = s === 2 ? 1 : 2;
        pluck(noteHz(root, chord[ci % chord.length]), t, 0.026);
      }
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
  function setMood(v) {
    // 'menu' | 'sea' | true(night) | false(day)
    const next = v === 'menu' ? 'menu' : v === 'sea' ? 'sea' : (v ? 'night' : 'day');
    if (next === mood) return;
    mood = next;
    trackIdx = -1;            // force rollTrack to land somewhere new
    rollTrack(mood);
    barsLeft = 16;
  }
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
    // BOSS TELL: a rising, uneasy swell. It has to be heard over a fight and
    // read as "get out of the way" without being a klaxon.
    boss_tell: () => {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      tone('sawtooth', 110, 220, 0.7, 0.09, t0);
      tone('sine', 55, 110, 0.7, 0.12, t0);
      tone('triangle', 330, 440, 0.5, 0.05, t0 + 0.15);
      noise(0.6, 0.05, 'bandpass', 900, null, t0 + 0.2);
    },
    // BOSS HIT: the move landing — a deep thump with debris on top
    boss_hit: () => {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      tone('sine', 90, 34, 0.55, 0.28, t0);
      tone('square', 160, 60, 0.22, 0.1, t0);
      noise(0.5, 0.16, 'lowpass', 1800, null, t0);
      noise(0.7, 0.06, 'highpass', 3200, null, t0 + 0.08);
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
