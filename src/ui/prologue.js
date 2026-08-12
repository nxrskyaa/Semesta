// THE PROLOGUE.
//
// Shown once, after character creation, before the world builds — which is the
// only moment in the whole game where the player is already committed and has
// nothing else to do. A story told over a loading bar is the one piece of
// exposition nobody resents.
//
// Ten beats. Each is a painted pixel scene plus three lines of text that
// TYPE ON, because text that appears all at once gets skimmed and text that
// arrives a character at a time gets read. Everything is skippable from the
// first frame: a prologue you cannot escape is a prologue people come to hate
// on their second character.
//
// The scenes are painted here on a 320x180 canvas in the same idiom as the
// loading vignettes — no image files, per the project rule. They are not
// decoration: each one is the specific thing the words are describing, so the
// beat lands even if somebody reads none of it.

import { t, getLang } from './lang.js';

// ---------------------------------------------------------------------------
// the words
// ---------------------------------------------------------------------------

// TEN BEATS, and the shape is deliberate: it opens on something warm, takes it
// away in the middle, and ends on one small thing you can actually do. A tragedy
// that ends in tragedy is a reason to put the controller down; a tragedy that
// ends in a job is a reason to play.
//
// The grief is SPECIFIC. "The world ended" is not sad — it is scenery. What is
// sad is that your mother's name is on a list of people who went out to relight
// the road and did not come back, and that you were left behind because you
// were nine.

const BEATS = [
  {
    scene: 'semesta',
    title: { en: 'SEMESTA', id: 'SEMESTA' },
    lines: [
      {
        en: 'Semesta means "everything". It is not a boast — it is a census.',
        id: 'Semesta berarti "segalanya". Itu bukan sesumbar — itu sebuah pendataan.',
      },
      {
        en: 'One world, one sky, one long coast, and every living thing on it counted by name.',
        id: 'Satu dunia, satu langit, satu garis pantai panjang, dan setiap makhluk di atasnya dicatat namanya.',
      },
      {
        en: 'Anavela was the province that did the counting.',
        id: 'Anavela adalah wilayah yang melakukan pendataan itu.',
      },
    ],
  },
  {
    scene: 'lanterns',
    title: { en: 'THE LIGHT THAT WAS KEPT', id: 'CAHAYA YANG DIJAGA' },
    lines: [
      {
        en: 'For four hundred years the lanterns of Anavela were never allowed to go out.',
        id: 'Selama empat ratus tahun, lentera-lentera Anavela tidak pernah dibiarkan padam.',
      },
      {
        en: 'Not because the dark was dangerous. Because a light on a road means somebody is expected home.',
        id: 'Bukan karena gelap itu berbahaya. Tapi karena cahaya di jalan berarti ada yang ditunggu pulang.',
      },
      {
        en: 'Nine hundred lamps. Every one of them lit by hand, every night, without exception.',
        id: 'Sembilan ratus lampu. Semuanya dinyalakan dengan tangan, setiap malam, tanpa kecuali.',
      },
    ],
  },
  {
    scene: 'order',
    title: { en: 'THE LANTERNKEEPERS', id: 'PARA PENJAGA LENTERA' },
    lines: [
      {
        en: 'They were not soldiers. Oil, wick, a long brass match, and the same road every night.',
        id: 'Mereka bukan prajurit. Minyak, sumbu, korek kuningan panjang, dan jalan yang sama setiap malam.',
      },
      {
        en: 'Your mother walked the northern road. Twenty-two years, and she never once handed it to anybody else.',
        id: 'Ibumu menyusuri jalan utara. Dua puluh dua tahun, dan tak sekali pun ia menyerahkannya pada orang lain.',
      },
      {
        en: 'It was the least heroic work in the world, and it was the only thing holding it together.',
        id: 'Itu pekerjaan paling tidak heroik di dunia, dan hanya itu yang menahannya tetap utuh.',
      },
    ],
  },
  {
    scene: 'lastnight',
    title: { en: 'THE LAST ORDINARY EVENING', id: 'SENJA BIASA YANG TERAKHIR' },
    lines: [
      {
        en: 'You were nine. She let you carry the oil can as far as the gate, the way she always did.',
        id: 'Umurmu sembilan. Ia membiarkanmu membawa kaleng minyak sampai gerbang, seperti biasanya.',
      },
      {
        en: '"Not past the gate," she said. "You are not a Keeper yet."',
        id: '"Jangan lewat gerbang," katanya. "Kamu belum jadi Penjaga."',
      },
      {
        en: 'You were annoyed about it. That is the last thing you ever felt about her.',
        id: 'Kamu kesal soal itu. Dan itulah perasaan terakhirmu tentang dia.',
      },
    ],
  },
  {
    scene: 'dark',
    title: { en: 'THE NIGHT THEY FAILED', id: 'MALAM SAAT MEREKA GAGAL' },
    lines: [
      {
        en: 'Nobody agrees what came first — the lights going out, or the wilds walking back in.',
        id: 'Tidak ada yang sepakat mana yang lebih dulu — lampu yang padam, atau hutan liar yang kembali masuk.',
      },
      {
        en: 'Forty-one Keepers went out to relight the roads. The gate was shut behind them.',
        id: 'Empat puluh satu Penjaga pergi untuk menyalakan kembali jalan-jalan itu. Gerbang ditutup di belakang mereka.',
      },
      {
        en: 'By morning the roads were gone under the grass, and so were they.',
        id: 'Menjelang pagi, jalan-jalan itu hilang tertutup rumput, dan mereka pun begitu.',
      },
    ],
  },
  {
    scene: 'names',
    title: { en: 'THE LIST', id: 'DAFTAR NAMA' },
    lines: [
      {
        en: 'They carved the forty-one names into the shrine wall, because there was nothing to bury.',
        id: 'Empat puluh satu nama diukir di dinding kuil, karena tidak ada yang bisa dimakamkan.',
      },
      {
        en: 'Hers is the eleventh from the left. You have never once had to count to find it.',
        id: 'Namanya yang kesebelas dari kiri. Kamu tidak pernah perlu menghitung untuk menemukannya.',
      },
      {
        en: 'Eleven years now. The stone has moss on it. You clean it. Nobody asked you to.',
        id: 'Sudah sebelas tahun. Batunya berlumut. Kamu membersihkannya. Tidak ada yang menyuruh.',
      },
    ],
  },
  {
    scene: 'apprentice',
    title: { en: 'ALL BUT ONE', id: 'KECUALI SATU' },
    lines: [
      {
        en: 'You were too young to walk the roads. That is the only reason you are still breathing.',
        id: 'Kamu terlalu kecil untuk menyusuri jalan itu. Hanya karena itu kamu masih bernapas.',
      },
      {
        en: 'It is not a comfortable thing to be alive because of. It never becomes one.',
        id: 'Bukan alasan yang nyaman untuk tetap hidup. Dan tidak pernah menjadi nyaman.',
      },
      {
        en: 'They left you her sword. You have never swung it. It is heavier than it looks.',
        id: 'Mereka mewariskan pedangnya padamu. Kamu belum pernah mengayunkannya. Lebih berat dari kelihatannya.',
      },
    ],
  },
  {
    scene: 'village',
    title: { en: 'WHAT IS LEFT', id: 'YANG TERSISA' },
    lines: [
      {
        en: 'One village still stands, because somebody there refuses to stop lighting the square at dusk.',
        id: 'Satu desa masih berdiri, karena ada yang menolak berhenti menyalakan alun-alun saat senja.',
      },
      {
        en: 'They farm, they fish, they trade. They are kind to you and they are careful around you.',
        id: 'Mereka bertani, memancing, berdagang. Mereka baik padamu, dan berhati-hati di dekatmu.',
      },
      {
        en: 'Nobody says the word "road" while you are in the room.',
        id: 'Tidak ada yang menyebut kata "jalan" selama kamu ada di ruangan itu.',
      },
    ],
  },
  {
    scene: 'oath',
    title: { en: 'WHAT THE ORDER WAS FOR', id: 'UNTUK APA ORDE ITU ADA' },
    lines: [
      {
        en: 'The Keepers had one line they said to each other at the gate, every night, for four centuries.',
        id: 'Para Penjaga punya satu kalimat yang mereka ucapkan di gerbang, tiap malam, selama empat abad.',
      },
      {
        en: '"We are not keeping the dark out."',
        id: '"Kita bukan menahan kegelapan di luar."',
      },
      {
        en: '"We are keeping the place worth coming back to."',
        id: '"Kita menjaga agar tempat ini layak untuk dipulangi."',
      },
    ],
  },
  {
    scene: 'road',
    title: { en: 'YOUR FIRST NIGHT', id: 'MALAM PERTAMAMU' },
    lines: [
      {
        en: 'You are not going to save anyone yet. You know no skills, and you have no class at all.',
        id: 'Kamu belum akan menyelamatkan siapa pun. Kamu tak punya skill, dan belum punya class apa pun.',
      },
      {
        en: 'You are just somebody who is finally past the gate.',
        id: 'Kamu hanya seseorang yang akhirnya melewati gerbang.',
      },
      {
        en: 'There is a lantern at the edge of the village that has been dark for eleven years. Start there.',
        id: 'Ada satu lentera di ujung desa yang sudah sebelas tahun padam. Mulai dari sana.',
      },
    ],
  },
];

const UI = {
  skip: { en: 'SKIP', id: 'LEWATI' },
  next: { en: 'NEXT', id: 'LANJUT' },
  begin: { en: 'BEGIN', id: 'MULAI' },
  chapter: { en: 'PROLOGUE', id: 'PROLOG' },
};

// ---------------------------------------------------------------------------
// the pictures — 320x180, painted, upscaled `pixelated`
// ---------------------------------------------------------------------------

const W = 320, H = 180;

function sky(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A ridge line built from a few sine terms — the same trick the load screen
 *  vignettes use, so the prologue and the loader look like one thing. */
function ridge(ctx, baseY, amp, color, seed = 1) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) {
    const y = baseY
      + Math.sin(x * 0.021 * seed + seed) * amp
      + Math.sin(x * 0.047 * seed + seed * 2) * amp * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** A soft round glow. fillRect halos read as literal squares at this scale —
 *  the whole illusion of light is that it has no edge. */
function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// MOTION.
//
// Every beat used to be painted exactly once, so ten still pictures went past
// while only the text moved. A held still frame reads as a slide, and the
// prologue is asking for four minutes of attention before anyone has played
// anything — it has to look alive to earn them.
//
// The rules the movement follows, which is what keeps it from looking like
// wobbling clip art:
//
//   * Nothing runs on one shared sine. Every flame, every breath and every
//     floating mote carries its own phase, so the frame never pulses as a
//     single object.
//   * The motion says what the scene says. The warm beats breathe and flicker;
//     the dark ones have wind in the grass and nothing lit at all. Movement is
//     part of the writing, not decoration sprinkled over it.
//   * Light moves more than matter. Flames, glows and reflections carry almost
//     all of it — pixel figures shift by a pixel, and no more.
// ---------------------------------------------------------------------------

/** A value that wanders instead of oscillating: two primes beaten together. */
const wob = (T, hz, phase = 0) =>
  Math.sin(T * hz + phase) * 0.65 + Math.sin(T * hz * 2.37 + phase * 1.7) * 0.35;

function star(ctx, n, seed = 7, T = 0) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H * 0.55);
    const bright = rnd() > 0.7;
    // stars twinkle on their own clocks; a couple of them are always mid-blink
    const tw = 0.55 + 0.45 * Math.sin(T * (1.1 + (i % 7) * 0.31) + i * 2.1);
    ctx.globalAlpha = bright ? 0.65 + tw * 0.35 : 0.35 + tw * 0.4;
    ctx.fillStyle = bright ? '#ffffff' : '#c8d8f0';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * Floating motes: embers, dust, snow, fireflies. `rise` is negative for things
 * that fall. Seeded, so the same scene always gets the same swarm.
 */
function motes(ctx, T, n, color, seed, opts = {}) {
  const { rise = 9, sway = 7, x0 = 0, x1 = W, y0 = 40, y1 = H, size = 1, alpha = 0.6 } = opts;
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const bx = x0 + rnd() * (x1 - x0);
    const span = y1 - y0;
    const speed = 0.5 + rnd() * 0.9;
    const ph = rnd() * 100;
    // wrap through the band rather than respawning, so none of them ever pop
    let y = y1 - (((T * rise * speed + ph * span) % span) + span) % span;
    if (rise < 0) y = y0 + (((T * -rise * speed + ph * span) % span) + span) % span;
    const x = bx + Math.sin(T * (0.6 + speed) + ph) * sway;
    const life = 1 - Math.abs((y - y0) / span - 0.5) * 2;   // fade at both ends
    ctx.globalAlpha = alpha * Math.max(0, life) * (0.6 + 0.4 * Math.sin(T * 3 + ph));
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }
  ctx.globalAlpha = 1;
}

/**
 * A stone lantern, lit or dark. The single recurring motif of the prologue.
 *
 * A lit one now BURNS: the pane brightens and dims, the halo breathes on a
 * different rhythm from the core, and the flame jitters a pixel. Those three
 * running at different rates is the whole difference between fire and a bulb.
 * `phase` keeps each lantern on its own clock — a road of lamps flickering in
 * unison reads as a rendering glitch.
 */
function lantern(ctx, x, groundY, lit, scale = 1, T = 0, phase = 0) {
  const s = scale;
  const px = (w, h, c, ox, oy) => { ctx.fillStyle = c; ctx.fillRect(x + ox * s, groundY + oy * s, w * s, h * s); };
  const f = lit ? 0.5 + 0.5 * wob(T, 5.5, phase) : 0;
  px(14, 3, '#6a6a62', -7, -3);            // base
  px(5, 16, '#7a7a70', -2.5, -19);         // pillar
  px(12, 2, '#6a6a62', -6, -21);           // collar
  px(10, 9, lit ? (f > 0.5 ? '#fbeec0' : '#f2dc9c') : '#4a4a46', -5, -30);   // pane
  px(16, 3, '#7a7a70', -8, -33);           // roof
  px(10, 2, '#8a8a80', -5, -35);
  px(3, 3, '#8a8a80', -1.5, -38);          // cap
  if (lit) {
    glow(ctx, x, groundY - 26 * s, (20 + f * 5) * s, '#ffd77a', 0.42 + f * 0.22);
    const j = Math.round(wob(T, 8.3, phase * 2.1));   // the core dances, the stone does not
    px(4, 3 + (f > 0.6 ? 1 : 0), '#fff3c8', -2 + j * 0.4, -28);
  }
}

/**
 * A chibi figure. `T` gives them breath — the body rises a pixel and the head
 * follows a beat later, which is the whole trick; a figure that translates as
 * one block reads as a sprite being slid around.
 */
function chibi(ctx, x, groundY, coat = '#7a9ac8', hair = '#3a2a20', T = 0, phase = 0) {
  const br = Math.sin(T * 1.5 + phase);
  const body = br > 0.55 ? -1 : 0;
  const head = Math.sin(T * 1.5 + phase - 0.5) > 0.55 ? -1 : 0;
  const px = (w, h, c, ox, oy) => { ctx.fillStyle = c; ctx.fillRect(x + ox, groundY + oy, w, h); };
  px(3, 4, '#2e3038', -4, -4);   // legs
  px(3, 4, '#2e3038', 1, -4);
  px(9, 8 - body, coat, -4, -12);       // body
  px(10, 9, '#f0c9a2', -5, -21 + head); // big head
  px(11, 4, hair, -5, -22 + head);      // hair
  // a blink: closed for a fraction of a second, on a long irregular cycle
  const blink = (Math.sin(T * 0.9 + phase * 3.1) + Math.sin(T * 0.37 + phase)) > 1.86;
  px(2, blink ? 1 : 2, '#20241c', -3, -17 + head + (blink ? 1 : 0));
  px(2, blink ? 1 : 2, '#20241c', 1, -17 + head + (blink ? 1 : 0));
}

const SCENES = {
  // SEMESTA — the whole world at a glance: a wide coast under a huge sky, and
  // a scatter of tiny lights along it. The point of the image is SCALE, so the
  // land is a thin band and the sky takes four fifths of the frame.
  semesta(ctx, T) {
    sky(ctx, '#101a2e', '#4a6a8a');
    star(ctx, 90, 5, T);
    // a low sun sitting right on the sea, so the horizon reads as enormous.
    // It sinks — very slowly, about a pixel every four seconds. You do not
    // watch it move; you notice it has moved, which is what a sunset is.
    const sunY = 126 + Math.min(6, T * 0.25);
    ctx.fillStyle = '#f0c078';
    ctx.beginPath(); ctx.arc(200, sunY, 13, 0, Math.PI * 2); ctx.fill();
    glow(ctx, 200, sunY, 44 + wob(T, 0.7) * 4, '#f0c078', 0.35);
    // sea
    ctx.fillStyle = '#1c3448';
    ctx.fillRect(0, 128, W, 22);
    // the swell: bands crawling at different speeds, which is what makes water
    // read as a surface rather than a striped rectangle
    for (let y = 130; y < 150; y += 3) {
      const k = (y - 130) / 3;
      const off = Math.sin(T * (0.5 + k * 0.11) + k) * 3;
      ctx.fillStyle = y % 6 ? 'rgba(120,180,220,0.10)' : 'rgba(120,180,220,0.05)';
      ctx.fillRect(off, y, W, 1);
    }
    // the sun's track on the water, breaking up as the swell passes through it
    for (let i = 0; i < 7; i++) {
      const y = 130 + i * 3;
      const w = 16 - i * 1.4 + Math.sin(T * 2.2 + i) * 3;
      ctx.globalAlpha = 0.16 + 0.1 * Math.sin(T * 1.7 + i * 1.3);
      ctx.fillStyle = '#ffd9a0';
      ctx.fillRect(200 - w / 2, y, w, 1);
    }
    ctx.globalAlpha = 1;
    // the long coast
    ridge(ctx, 146, 4, '#1a2a20', 1.4);
    ctx.fillStyle = '#1e2c22';
    ctx.fillRect(0, 150, W, 30);
    // nine little lights strung along it — Anavela, counted. Each on its own
    // rhythm: they are nine separate fires, not one row of pixels.
    for (let i = 0; i < 9; i++) {
      const x = 18 + i * 34;
      const y = 152 + Math.sin(i * 1.7) * 4;
      const f = 0.5 + 0.5 * wob(T, 3.1 + i * 0.4, i * 1.9);
      glow(ctx, x + 1, y + 1, 9 + f * 4, '#ffd77a', 0.36 + f * 0.24);
      ctx.fillStyle = f > 0.5 ? '#fff3c8' : '#ffe6a0';
      ctx.fillRect(x, y, 2, 2);
    }
  },

  // THE LAST ORDINARY EVENING — mother and child at the gate, warm, backlit.
  // The only fully warm frame in the prologue, so what follows lands.
  lastnight(ctx, T) {
    sky(ctx, '#5a4a5e', '#e0a068');
    ridge(ctx, 118, 8, '#6a5250', 1.1);
    ridge(ctx, 134, 6, '#4a3a3e', 1.8);
    ctx.fillStyle = '#3a2e30';
    ctx.fillRect(0, 140, W, 40);
    // the gate: two posts and a lintel, wide open
    ctx.fillStyle = '#2e2426';
    ctx.fillRect(120, 96, 8, 50);
    ctx.fillRect(196, 96, 8, 50);
    ctx.fillRect(112, 90, 100, 8);
    ctx.fillRect(108, 84, 108, 5);
    lantern(ctx, 124, 96, true, 0.55, T, 0);
    lantern(ctx, 200, 96, true, 0.55, T, 2.4);
    // the two of them, the child a head shorter, standing close. This is the
    // warmest frame in the prologue and the only one that gets to look easy, so
    // they simply breathe — the child a little faster than the mother, which is
    // the smallest possible way to say which of them is a child.
    chibi(ctx, 150, 172, '#6a5a48', '#4a3020', T * 0.85, 0.4);   // mother
    ctx.fillStyle = '#c8ccd4';                     // her sword at her hip
    ctx.fillRect(157, 158, 2, 12);
    chibi(ctx, 172, 174, '#7a9ac8', '#3a2a20', T * 1.25, 2.1);   // you, smaller
    ctx.fillStyle = '#8a8a80';                     // the oil can you were allowed to carry
    ctx.fillRect(179, 166, 6, 7);
    ctx.fillStyle = '#6a6a62';
    ctx.fillRect(180, 164, 4, 2);
    // low warm light pooling around them, and embers going up off the lamps
    glow(ctx, 164, 164, 48 + wob(T, 1.1) * 5, '#ffcf88', 0.28 + 0.06 * wob(T, 0.8, 1));
    motes(ctx, T, 14, '#ffcf88', 41, { rise: 11, sway: 5, x0: 110, x1: 214, y0: 70, y1: 150, alpha: 0.5 });
  },

  // THE LIST — the shrine wall, forty-one carved names, one of them cleaned.
  names(ctx, T) {
    sky(ctx, '#141c26', '#2c3a44');
    star(ctx, 22, 13, T);
    ctx.fillStyle = '#1a222a';
    ctx.fillRect(0, 120, W, 60);
    // the wall
    ctx.fillStyle = '#4a4a46';
    ctx.fillRect(48, 44, 224, 104);
    ctx.fillStyle = '#3a3a36';
    ctx.fillRect(48, 44, 224, 6);
    ctx.fillStyle = '#5a5a54';
    ctx.fillRect(44, 38, 232, 7);
    // forty-one names as carved bars, in rows
    let n = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 6 && n < 41; col++, n++) {
        const x = 60 + col * 35, y = 58 + row * 13;
        // the eleventh from the left, second row — hers, and it is CLEAN
        const hers = n === 10;
        ctx.fillStyle = hers ? '#c8c4b0' : '#3a3a34';
        ctx.fillRect(x, y, 26, 4);
        if (!hers && (n % 3 === 0)) {           // moss on the rest
          ctx.fillStyle = '#2e3a26';
          ctx.fillRect(x + 2, y + 3, 20, 2);
        }
      }
    }
    // A small offering below hers: one lit candle stub. It is the ONLY thing
    // moving in this frame, and that is deliberate — the wall is a wall, the
    // names do not change, and putting life anywhere else here would be a lie
    // about what the scene is. One flame and one person breathing.
    const f = 0.5 + 0.5 * wob(T, 4.2, 0.6);
    glow(ctx, 67, 138, 16 + f * 6, '#ffd77a', 0.32 + f * 0.2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(65, 138, 4, 10);
    ctx.fillStyle = f > 0.5 ? '#fff3c8' : '#ffcf88';
    ctx.fillRect(66, 134 - (f > 0.7 ? 1 : 0), 2, 4 + (f > 0.7 ? 1 : 0));
    // dust turning slowly in the candlelight
    motes(ctx, T, 10, '#b8b0a0', 77, { rise: 4, sway: 9, x0: 50, x1: 130, y0: 60, y1: 148, alpha: 0.3 });
    chibi(ctx, 200, 176, '#7a9ac8', '#3a2a20', T * 0.7, 1.2);
  },

  // THE OATH — the gate from inside, at the moment they used to say it: a line
  // of Keepers silhouetted against their own lamps, walking out.
  oath(ctx, T) {
    sky(ctx, '#0e1420', '#26344a');
    star(ctx, 40, 29, T);
    ridge(ctx, 124, 6, '#161e2a', 1.5);
    ctx.fillStyle = '#1a2028';
    ctx.fillRect(0, 140, W, 40);
    // the gate arch, seen from inside, framing the dark
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(96, 60, 128, 90);
    ctx.fillStyle = '#242c34';
    ctx.fillRect(88, 54, 10, 96);
    ctx.fillRect(222, 54, 10, 96);
    ctx.fillRect(82, 46, 156, 10);
    // Five keepers walking out, each carrying one point of light, receding.
    // They WALK: the body rises and falls on the stride and the carried lamp
    // swings a half-beat behind it, because a lantern hangs from an arm and
    // arrives late. Each is a step out of phase with the one ahead, so it reads
    // as five people rather than one sprite copied five times.
    const walk = [[112, 172, 1.0], [138, 166, 0.86], [160, 160, 0.72], [178, 155, 0.6], [193, 151, 0.5]];
    walk.forEach(([x, y0, sc], i) => {
      const ph = i * 1.3;
      const step = Math.abs(Math.sin(T * 2.1 + ph));
      const y = y0 - step * 1.6 * sc;
      const swing = Math.sin(T * 2.1 + ph - 0.8) * 1.6 * sc;
      glow(ctx, x + 1 + swing, y - 14 * sc, (15 + step * 4) * sc, '#ffd77a', 0.45 * sc);
      // a simple dark silhouette — faces would break the mood
      ctx.fillStyle = '#0e141a';
      ctx.fillRect(x - 4 * sc, y - 18 * sc, 9 * sc, 18 * sc);
      ctx.fillRect(x - 5 * sc, y - 27 * sc, 11 * sc, 10 * sc);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(x + 5 * sc + swing, y - 14 * sc, 2 * sc, 2 * sc);
    });
  },

  // four hundred years of light: a road of lanterns receding into the dark
  lanterns(ctx, T) {
    sky(ctx, '#1a2438', '#38445a');
    star(ctx, 60, 3, T);
    ridge(ctx, 118, 8, '#222c3a', 1.0);
    ridge(ctx, 134, 6, '#1a222e', 1.7);
    ctx.fillStyle = '#2a3242';
    ctx.fillRect(0, 140, W, 40);
    // the road, narrowing toward a vanishing point
    ctx.fillStyle = '#3a4250';
    ctx.beginPath();
    ctx.moveTo(120, 140); ctx.lineTo(200, 140); ctx.lineTo(260, 180); ctx.lineTo(60, 180);
    ctx.closePath(); ctx.fill();
    // FOUR HUNDRED YEARS OF LIGHT. Every lamp on its own phase — a road of
    // lanterns blinking together would read as the screen refreshing rather
    // than as fire, and this is the beat where the lights are the subject.
    lantern(ctx, 54, 176, true, 1.0, T, 0.0);
    lantern(ctx, 96, 164, true, 0.78, T, 1.7);
    lantern(ctx, 126, 154, true, 0.6, T, 3.1);
    lantern(ctx, 148, 148, true, 0.46, T, 4.6);
    lantern(ctx, 232, 176, true, 1.0, T, 2.2);
    lantern(ctx, 208, 162, true, 0.74, T, 5.3);
    lantern(ctx, 190, 152, true, 0.56, T, 0.9);
    // moths working the road, drawn to the lamps and never quite landing
    motes(ctx, T, 16, '#e8dcc0', 19, { rise: -6, sway: 12, y0: 130, y1: 176, alpha: 0.45 });
  },

  // the order: three keepers walking out together at dusk
  order(ctx, T) {
    sky(ctx, '#3e3a52', '#c88a5a');
    ridge(ctx, 112, 10, '#4a3f4e', 1.1);
    ridge(ctx, 130, 7, '#332c38', 1.9);
    ctx.fillStyle = '#2c2630';
    ctx.fillRect(0, 138, W, 42);
    ctx.fillStyle = '#3a3240';
    ctx.fillRect(0, 150, W, 30);
    lantern(ctx, 40, 172, true, 0.9, T, 1.1);
    lantern(ctx, 280, 172, true, 0.9, T, 3.8);
    // three walking out together: the same stride, a beat apart, which is what
    // "together" looks like from a distance
    const bob = (i) => -Math.abs(Math.sin(T * 2.0 + i * 2.1)) * 2;
    chibi(ctx, 130, 168 + bob(0), '#5a6470', '#3a2a20', T, 0.0);
    chibi(ctx, 152, 170 + bob(1), '#6a5a48', '#5a4030', T, 1.4);
    chibi(ctx, 174, 168 + bob(2), '#4a5a52', '#2a2018', T, 2.8);
    // each carries a small warm point of light, swinging off the arm
    [122, 144, 166].forEach((x, i) => {
      const sw = Math.sin(T * 2.0 + i * 2.1 - 0.7) * 1.8;
      const f = 0.5 + 0.5 * wob(T, 4.4, i * 2.3);
      glow(ctx, x + 1 + sw, 156 + bob(i), 11 + f * 5, '#ffd77a', 0.38 + f * 0.2);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(x + sw, 155 + bob(i), 2, 2);
    });
  },

  // the failure: the same road, unlit, grass coming through it
  dark(ctx, T) {
    sky(ctx, '#0e1218', '#1c2430');
    star(ctx, 28, 11, T);
    ridge(ctx, 116, 9, '#141a22', 1.2);
    ctx.fillStyle = '#161c18';
    ctx.fillRect(0, 138, W, 42);
    // the road, broken up by encroaching grass
    ctx.fillStyle = '#1e2620';
    ctx.beginPath();
    ctx.moveTo(122, 138); ctx.lineTo(198, 138); ctx.lineTo(258, 180); ctx.lineTo(62, 180);
    ctx.closePath(); ctx.fill();
    // THE ONLY MOTION HERE IS WIND AND SOMETHING WATCHING. No flame, no glow,
    // nothing warm — the beat is about the lights being out, so the animation
    // has to be the absence of them. The grass leans in one direction, together,
    // because that is what wind looks like and what a hundred separate wobbles
    // does not.
    let s = 5;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const gust = wob(T, 0.55) * 1.6;
    for (let i = 0; i < 90; i++) {
      const x = 60 + rnd() * 200, y = 140 + rnd() * 40;
      const lean = gust * (0.6 + rnd() * 0.8);
      ctx.fillStyle = rnd() > 0.5 ? '#26301f' : '#2e3a24';
      ctx.fillRect(Math.floor(x + lean), Math.floor(y), 2, 3);
    }
    lantern(ctx, 54, 176, false, 1.0, T);
    lantern(ctx, 100, 162, false, 0.72, T);
    lantern(ctx, 236, 176, false, 1.0, T);
    // one pair of eyes in the treeline, and nothing else. They blink, and every
    // so often they move a little along the trees — the frame is otherwise so
    // still that two pixels shifting is the loudest thing in the prologue.
    const drift = Math.round(Math.sin(T * 0.31) * 4);
    const shut = Math.sin(T * 0.8) + Math.sin(T * 0.29) > 1.72;
    if (!shut) {
      ctx.fillStyle = '#c8563a';
      ctx.fillRect(268 + drift, 126, 3, 2);
      ctx.fillRect(275 + drift, 126, 3, 2);
    }
  },

  // the apprentice: one small figure, one inherited sword
  apprentice(ctx, T) {
    sky(ctx, '#1a2230', '#4a5260');
    star(ctx, 34, 19, T);
    ridge(ctx, 124, 7, '#232b33', 1.4);
    ctx.fillStyle = '#242c24';
    ctx.fillRect(0, 142, W, 38);
    lantern(ctx, 96, 172, false, 1.1, T);
    chibi(ctx, 168, 172, '#7a9ac8', '#3a2a20', T, 0.3);
    // the sword: planted in the ground beside them, not held
    ctx.fillStyle = '#c4ccd4';
    ctx.fillRect(190, 150, 2, 20);
    ctx.fillStyle = '#8a6b42';
    ctx.fillRect(187, 168, 8, 2);
    ctx.fillRect(190, 170, 2, 5);
    // A first, weak glow off the player — the light is in them, not the lamp.
    // It beats slowly, like something being kept alive rather than something
    // burning: the lamp beside them is dead and stays dead.
    const beat = 0.5 + 0.5 * Math.sin(T * 1.25);
    glow(ctx, 170, 160, 25 + beat * 8, '#ffd77a', 0.2 + beat * 0.16);
  },

  // what is left: the village square, one fire, warm windows
  village(ctx, T) {
    sky(ctx, '#2a3450', '#7a6a72');
    star(ctx, 20, 23, T);
    ridge(ctx, 116, 9, '#3a4048', 1.3);
    ctx.fillStyle = '#3c4a32';
    ctx.fillRect(0, 132, W, 48);
    // three huts with lit windows — each window on its own slow breath, because
    // there is a different room and a different fire behind every one of them
    const hut = (x, w, h, wall, roof, ph) => {
      ctx.fillStyle = wall; ctx.fillRect(x, 132 - h, w, h);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 4, 132 - h); ctx.lineTo(x + w / 2, 132 - h - 12); ctx.lineTo(x + w + 4, 132 - h);
      ctx.closePath(); ctx.fill();
      const g = 0.5 + 0.5 * wob(T, 2.1, ph);
      glow(ctx, x + w / 2, 132 - h + 11, 10 + g * 4, '#ffd77a', 0.22 + g * 0.14);
      ctx.fillStyle = g > 0.5 ? '#ffe6a0' : '#ffd77a';
      ctx.fillRect(x + w / 2 - 3, 132 - h + 8, 6, 6);
      // smoke off the roof, thinning as it climbs
      motes(ctx, T, 5, '#8a8a90', 200 + ph * 13,
        { rise: 7, sway: 4, x0: x + w / 2 - 3, x1: x + w / 2 + 3, y0: 40, y1: 132 - h - 12, alpha: 0.22 });
    };
    hut(30, 34, 26, '#8a7458', '#6a4a38', 0.0);
    hut(232, 38, 30, '#8a7458', '#6a4a38', 2.3);
    hut(140, 30, 22, '#7f6a50', '#5e4232', 4.1);
    // THE SQUARE FIRE. The one thing in the prologue allowed to be loud: a real
    // flame, stacked tongues on different rhythms, throwing embers. This is the
    // beat about what is left, and a fire is how you say it without saying it.
    const f = 0.5 + 0.5 * wob(T, 6.5);
    const f2 = 0.5 + 0.5 * wob(T, 8.1, 1.7);
    glow(ctx, 162, 148, 28 + f * 10, '#ff9a3a', 0.36 + f * 0.18);
    ctx.fillStyle = '#ff7722';
    ctx.fillRect(156, 146 - Math.round(f * 2), 10, 12 + Math.round(f * 2));
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(158, 150 - Math.round(f2 * 2), 6, 8 + Math.round(f2 * 2));
    ctx.fillStyle = '#fff0b0';
    ctx.fillRect(160, 152 - Math.round(f * 1.5), 2, 4);
    ctx.fillStyle = '#5a4630'; ctx.fillRect(150, 158, 22, 4);
    motes(ctx, T, 12, '#ffb45a', 61, { rise: 15, sway: 6, x0: 152, x1: 172, y0: 96, y1: 152, alpha: 0.6 });
    chibi(ctx, 122, 166, '#a86a4a', '#5a4030', T * 0.9, 0.7);
    chibi(ctx, 200, 168, '#4a7a52', '#2a2018', T * 1.1, 2.5);
  },

  // the first job: one dark lantern at the edge of the light
  road(ctx, T) {
    sky(ctx, '#161e2c', '#3a4256');
    star(ctx, 44, 31, T);
    ridge(ctx, 120, 8, '#1e2630', 1.6);
    ctx.fillStyle = '#26301f';
    ctx.fillRect(0, 138, W, 42);
    ctx.fillStyle = '#38402c';
    ctx.beginPath();
    ctx.moveTo(0, 152); ctx.lineTo(W, 144); ctx.lineTo(W, 168); ctx.lineTo(0, 178);
    ctx.closePath(); ctx.fill();
    // LIT BEHIND YOU, DARK AHEAD: the whole game in one image, and the motion
    // says the same thing. Two lamps burning on the left, one dead on the
    // right, and the dead one gets nothing — no flicker, no glow, no hint that
    // it might come back on by itself. That is the job being handed over.
    lantern(ctx, 40, 174, true, 1.0, T, 0.0);
    lantern(ctx, 96, 168, true, 0.85, T, 2.6);
    lantern(ctx, 252, 164, false, 0.95, T);
    chibi(ctx, 168, 168, '#7a9ac8', '#3a2a20', T, 0.0);
    ctx.fillStyle = '#c4ccd4';
    ctx.fillRect(178, 156, 2, 12);
    // wind moving from the lit side toward the dark one
    motes(ctx, T, 9, '#6a7a5a', 137, { rise: 3, sway: 14, y0: 130, y1: 178, alpha: 0.28 });
  },
};

// ---------------------------------------------------------------------------
// the overlay
// ---------------------------------------------------------------------------

const CSS = `
#prologue {
  position: fixed; inset: 0; z-index: 200;
  background: #070a08;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--font-body, sans-serif);
  animation: pro-in 0.5s ease-out;
}
@keyframes pro-in { from { opacity: 0; } }
#prologue .stage {
  position: relative; width: min(680px, 92vw);
  box-shadow: 0 24px 70px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(216,184,102,0.35);
}
#prologue canvas {
  display: block; width: 100%; height: auto;
  image-rendering: pixelated; image-rendering: crisp-edges;
}
#prologue .veil {
  position: absolute; inset: 0; pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 3px),
    radial-gradient(circle at 50% 50%, transparent 46%, rgba(0,0,0,0.6) 100%);
}
#prologue .chapline {
  margin-top: 16px; font-size: 9px; letter-spacing: 4px; color: #7d8a70;
}
#prologue h2 {
  font-family: var(--font-display, sans-serif);
  font-size: 15px; letter-spacing: 3px; color: #ffe9b0;
  margin: 6px 0 12px; text-align: center; min-height: 18px;
}
#prologue .text {
  width: min(660px, 90vw); min-height: 84px;
  font-size: 12.5px; line-height: 2.0; color: #dfe6d4; text-align: center;
}
#prologue .text p { margin: 0 0 6px; }
#prologue .text .cursor { color: #d8b866; }
#prologue .bar {
  display: flex; gap: 5px; margin: 14px 0 18px;
}
#prologue .bar i {
  width: 22px; height: 3px; background: rgba(255,255,255,0.16); display: block;
}
#prologue .bar i.on { background: #d8b866; }
#prologue .row { display: flex; gap: 10px; align-items: center; }
#prologue button {
  font-family: inherit; cursor: pointer; border: 0; padding: 11px 22px;
  font-size: 11px; letter-spacing: 2px;
}
#prologue .go {
  color: #10160f; background: #d8b866;
  box-shadow: 0 3px 0 #8a7038;
}
#prologue .go:hover { filter: brightness(1.15); }
#prologue .skip {
  color: #8a9880; background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);
}
#prologue .skip:hover { color: #dfe6d4; }
@media (max-width: 520px) {
  #prologue .text { font-size: 11.5px; line-height: 1.9; min-height: 96px; }
  #prologue h2 { font-size: 12px; }
}
`;

/**
 * Play the prologue. Resolves when the player finishes or skips it.
 * Never rejects — a story must not be able to block the game from starting.
 */
export function showPrologue() {
  return new Promise((resolve) => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'prologue';
    el.innerHTML = `
      <div class="stage">
        <canvas width="${W}" height="${H}"></canvas>
        <div class="veil"></div>
      </div>
      <div class="chapline">${t(UI.chapter)}</div>
      <h2></h2>
      <div class="text"></div>
      <div class="bar">${BEATS.map(() => '<i></i>').join('')}</div>
      <div class="row">
        <button class="skip">${t(UI.skip)}</button>
        <button class="go">${t(UI.next)}</button>
      </div>`;
    document.body.appendChild(el);

    const canvas = el.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = el.querySelector('h2');
    const textEl = el.querySelector('.text');
    const pips = [...el.querySelectorAll('.bar i')];
    const go = el.querySelector('.go');

    let beat = -1;
    let typer = null;
    let typing = false;
    let raf = 0;
    let beatT0 = 0;

    /**
     * Repaint the current scene.
     *
     * The scene used to be drawn once when the beat opened, so the reader spent
     * up to a minute on a photograph. The canvas is 320x180 — a fifty-seventh
     * of a 1080p frame — so redrawing all of it every frame costs less than the
     * text layout above it, and there is nothing to be clever about.
     *
     * `T` is wall-clock seconds since the beat opened, not a frame count, so a
     * slow machine sees the same motion at a lower frame rate rather than the
     * same animation in slow motion.
     */
    let lastPaint = 0;
    function draw() {
      if (beat < 0) return;
      lastPaint = performance.now();
      const T = (lastPaint - beatT0) / 1000;
      ctx.clearRect(0, 0, W, H);
      SCENES[BEATS[beat].scene](ctx, T);
    }

    function paint() {
      raf = requestAnimationFrame(paint);
      draw();
    }

    // rAF STOPS DEAD IN A BACKGROUND TAB, and the prologue is exactly the kind
    // of screen somebody alt-tabs away from — it is four minutes of reading
    // before the game starts. Without a fallback the scene freezes on whatever
    // frame it was on and stays frozen after they come back, because the
    // browser resumes rAF but the picture is already a beat behind and the beat
    // may have changed. Same shape of fix as the cooking pot: rAF DRAWS, and a
    // slow interval steps in whenever rAF has gone quiet.
    const keepAlive = setInterval(() => {
      if (performance.now() - lastPaint > 250) draw();
    }, 120);

    function finish(done) {
      clearInterval(typer);
      clearInterval(keepAlive);
      cancelAnimationFrame(raf);
      el.style.transition = 'opacity 0.45s';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); style.remove(); resolve(done); }, 470);
    }

    /** Type the beat's lines in, one character at a time. Clicking NEXT while
     *  it is still typing completes it instantly — making somebody wait out an
     *  animation they have already read is the fastest way to teach them to
     *  skip everything. */
    function type(lines) {
      clearInterval(typer);
      typing = true;
      const full = lines.map((l) => t(l));
      let li = 0, ci = 0;
      const render = (partial) => {
        textEl.innerHTML = full.slice(0, li).map((s) => `<p>${s}</p>`).join('')
          + (li < full.length ? `<p>${partial}<span class="cursor">▌</span></p>` : '');
      };
      render('');
      typer = setInterval(() => {
        if (li >= full.length) { clearInterval(typer); typing = false; return; }
        ci += 2;
        if (ci >= full[li].length) { li++; ci = 0; render(''); }
        else render(full[li].slice(0, ci));
        if (li >= full.length) {
          textEl.innerHTML = full.map((s) => `<p>${s}</p>`).join('');
          typing = false;
          clearInterval(typer);
        }
      }, 16);
    }

    function showBeat(i) {
      beat = i;
      beatT0 = performance.now();     // every scene's motion starts from zero
      const b = BEATS[i];
      draw();                         // never show the previous beat's picture
      titleEl.textContent = t(b.title);
      type(b.lines);
      pips.forEach((p, k) => p.classList.toggle('on', k <= i));
      go.textContent = i === BEATS.length - 1 ? t(UI.begin) : t(UI.next);
    }

    go.addEventListener('click', () => {
      if (typing) {          // first press completes the typing, second advances
        clearInterval(typer);
        typing = false;
        textEl.innerHTML = BEATS[beat].lines.map((l) => `<p>${t(l)}</p>`).join('');
        return;
      }
      if (beat >= BEATS.length - 1) finish(true);
      else showBeat(beat + 1);
    });
    el.querySelector('.skip').addEventListener('click', () => finish(false));

    showBeat(0);
    paint();
  });
}

/** So callers can note which language the story was told in. */
export const prologueLang = () => getLang();
