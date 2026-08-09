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

function star(ctx, n, seed = 7) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H * 0.55);
    ctx.fillStyle = rnd() > 0.7 ? '#ffffff' : '#c8d8f0';
    ctx.fillRect(x, y, 1, 1);
  }
}

/** A stone lantern, lit or dark. The single recurring motif of the prologue. */
function lantern(ctx, x, groundY, lit, scale = 1) {
  const s = scale;
  const px = (w, h, c, ox, oy) => { ctx.fillStyle = c; ctx.fillRect(x + ox * s, groundY + oy * s, w * s, h * s); };
  px(14, 3, '#6a6a62', -7, -3);            // base
  px(5, 16, '#7a7a70', -2.5, -19);         // pillar
  px(12, 2, '#6a6a62', -6, -21);           // collar
  px(10, 9, lit ? '#f6e2a8' : '#4a4a46', -5, -30);   // light box (the pane)
  px(16, 3, '#7a7a70', -8, -33);           // roof
  px(10, 2, '#8a8a80', -5, -35);
  px(3, 3, '#8a8a80', -1.5, -38);          // cap
  if (lit) {
    glow(ctx, x, groundY - 26 * s, 22 * s, '#ffd77a', 0.55);
    px(4, 4, '#fff3c8', -2, -28);          // flame core
  }
}

function chibi(ctx, x, groundY, coat = '#7a9ac8', hair = '#3a2a20') {
  const px = (w, h, c, ox, oy) => { ctx.fillStyle = c; ctx.fillRect(x + ox, groundY + oy, w, h); };
  px(3, 4, '#2e3038', -4, -4);   // legs
  px(3, 4, '#2e3038', 1, -4);
  px(9, 8, coat, -4, -12);       // body
  px(10, 9, '#f0c9a2', -5, -21); // big head
  px(11, 4, hair, -5, -22);      // hair
  px(2, 2, '#20241c', -3, -17);  // eyes
  px(2, 2, '#20241c', 1, -17);
}

const SCENES = {
  // SEMESTA — the whole world at a glance: a wide coast under a huge sky, and
  // a scatter of tiny lights along it. The point of the image is SCALE, so the
  // land is a thin band and the sky takes four fifths of the frame.
  semesta(ctx) {
    sky(ctx, '#101a2e', '#4a6a8a');
    star(ctx, 90, 5);
    // a low sun sitting right on the sea, so the horizon reads as enormous
    ctx.fillStyle = '#f0c078';
    ctx.beginPath(); ctx.arc(200, 128, 13, 0, Math.PI * 2); ctx.fill();
    glow(ctx, 200, 128, 46, '#f0c078', 0.35);
    // sea
    ctx.fillStyle = '#1c3448';
    ctx.fillRect(0, 128, W, 22);
    for (let y = 130; y < 150; y += 3) {
      ctx.fillStyle = y % 6 ? 'rgba(120,180,220,0.10)' : 'rgba(120,180,220,0.05)';
      ctx.fillRect(0, y, W, 1);
    }
    // the long coast
    ridge(ctx, 146, 4, '#1a2a20', 1.4);
    ctx.fillStyle = '#1e2c22';
    ctx.fillRect(0, 150, W, 30);
    // nine little lights strung along it — Anavela, counted
    for (let i = 0; i < 9; i++) {
      const x = 18 + i * 34;
      const y = 152 + Math.sin(i * 1.7) * 4;
      glow(ctx, x + 1, y + 1, 11, '#ffd77a', 0.5);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(x, y, 2, 2);
    }
  },

  // THE LAST ORDINARY EVENING — mother and child at the gate, warm, backlit.
  // The only fully warm frame in the prologue, so what follows lands.
  lastnight(ctx) {
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
    lantern(ctx, 124, 96, true, 0.55);
    lantern(ctx, 200, 96, true, 0.55);
    // the two of them, the child a head shorter, standing close
    chibi(ctx, 150, 172, '#6a5a48', '#4a3020');   // mother
    ctx.fillStyle = '#c8ccd4';                     // her sword at her hip
    ctx.fillRect(157, 158, 2, 12);
    chibi(ctx, 172, 174, '#7a9ac8', '#3a2a20');    // you, smaller
    ctx.fillStyle = '#8a8a80';                     // the oil can you were allowed to carry
    ctx.fillRect(179, 166, 6, 7);
    ctx.fillStyle = '#6a6a62';
    ctx.fillRect(180, 164, 4, 2);
    // low warm light pooling around them
    glow(ctx, 164, 164, 52, '#ffcf88', 0.3);
  },

  // THE LIST — the shrine wall, forty-one carved names, one of them cleaned.
  names(ctx) {
    sky(ctx, '#141c26', '#2c3a44');
    star(ctx, 22, 13);
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
    // a small offering below hers: one lit candle stub
    glow(ctx, 67, 138, 20, '#ffd77a', 0.45);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(65, 138, 4, 10);
    ctx.fillStyle = '#ffcf88';
    ctx.fillRect(66, 134, 2, 4);
    chibi(ctx, 200, 176, '#7a9ac8', '#3a2a20');
  },

  // THE OATH — the gate from inside, at the moment they used to say it: a line
  // of Keepers silhouetted against their own lamps, walking out.
  oath(ctx) {
    sky(ctx, '#0e1420', '#26344a');
    star(ctx, 40, 29);
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
    // five keepers walking out, each carrying one point of light, receding
    const walk = [[112, 172, 1.0], [138, 166, 0.86], [160, 160, 0.72], [178, 155, 0.6], [193, 151, 0.5]];
    for (const [x, y, sc] of walk) {
      glow(ctx, x + 1, y - 14 * sc, 17 * sc, '#ffd77a', 0.5 * sc);
      // a simple dark silhouette — faces would break the mood
      ctx.fillStyle = '#0e141a';
      ctx.fillRect(x - 4 * sc, y - 18 * sc, 9 * sc, 18 * sc);
      ctx.fillRect(x - 5 * sc, y - 27 * sc, 11 * sc, 10 * sc);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(x + 5 * sc, y - 14 * sc, 2 * sc, 2 * sc);
    }
  },

  // four hundred years of light: a road of lanterns receding into the dark
  lanterns(ctx) {
    sky(ctx, '#1a2438', '#38445a');
    star(ctx, 60, 3);
    ridge(ctx, 118, 8, '#222c3a', 1.0);
    ridge(ctx, 134, 6, '#1a222e', 1.7);
    ctx.fillStyle = '#2a3242';
    ctx.fillRect(0, 140, W, 40);
    // the road, narrowing toward a vanishing point
    ctx.fillStyle = '#3a4250';
    ctx.beginPath();
    ctx.moveTo(120, 140); ctx.lineTo(200, 140); ctx.lineTo(260, 180); ctx.lineTo(60, 180);
    ctx.closePath(); ctx.fill();
    lantern(ctx, 54, 176, true, 1.0);
    lantern(ctx, 96, 164, true, 0.78);
    lantern(ctx, 126, 154, true, 0.6);
    lantern(ctx, 148, 148, true, 0.46);
    lantern(ctx, 232, 176, true, 1.0);
    lantern(ctx, 208, 162, true, 0.74);
    lantern(ctx, 190, 152, true, 0.56);
  },

  // the order: three keepers walking out together at dusk
  order(ctx) {
    sky(ctx, '#3e3a52', '#c88a5a');
    ridge(ctx, 112, 10, '#4a3f4e', 1.1);
    ridge(ctx, 130, 7, '#332c38', 1.9);
    ctx.fillStyle = '#2c2630';
    ctx.fillRect(0, 138, W, 42);
    ctx.fillStyle = '#3a3240';
    ctx.fillRect(0, 150, W, 30);
    lantern(ctx, 40, 172, true, 0.9);
    lantern(ctx, 280, 172, true, 0.9);
    chibi(ctx, 130, 168, '#5a6470', '#3a2a20');
    chibi(ctx, 152, 170, '#6a5a48', '#5a4030');
    chibi(ctx, 174, 168, '#4a5a52', '#2a2018');
    // each carries a small warm point of light
    for (const x of [122, 144, 166]) {
      glow(ctx, x + 1, 156, 14, '#ffd77a', 0.5);
      ctx.fillStyle = '#fff3c8';
      ctx.fillRect(x, 155, 2, 2);
    }
  },

  // the failure: the same road, unlit, grass coming through it
  dark(ctx) {
    sky(ctx, '#0e1218', '#1c2430');
    star(ctx, 28, 11);
    ridge(ctx, 116, 9, '#141a22', 1.2);
    ctx.fillStyle = '#161c18';
    ctx.fillRect(0, 138, W, 42);
    // the road, broken up by encroaching grass
    ctx.fillStyle = '#1e2620';
    ctx.beginPath();
    ctx.moveTo(122, 138); ctx.lineTo(198, 138); ctx.lineTo(258, 180); ctx.lineTo(62, 180);
    ctx.closePath(); ctx.fill();
    let s = 5;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      const x = 60 + rnd() * 200, y = 140 + rnd() * 40;
      ctx.fillStyle = rnd() > 0.5 ? '#26301f' : '#2e3a24';
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 3);
    }
    lantern(ctx, 54, 176, false, 1.0);
    lantern(ctx, 100, 162, false, 0.72);
    lantern(ctx, 236, 176, false, 1.0);
    // one pair of eyes in the treeline, and nothing else
    ctx.fillStyle = '#c8563a';
    ctx.fillRect(268, 126, 3, 2);
    ctx.fillRect(275, 126, 3, 2);
  },

  // the apprentice: one small figure, one inherited sword
  apprentice(ctx) {
    sky(ctx, '#1a2230', '#4a5260');
    star(ctx, 34, 19);
    ridge(ctx, 124, 7, '#232b33', 1.4);
    ctx.fillStyle = '#242c24';
    ctx.fillRect(0, 142, W, 38);
    lantern(ctx, 96, 172, false, 1.1);
    chibi(ctx, 168, 172, '#7a9ac8', '#3a2a20');
    // the sword: planted in the ground beside them, not held
    ctx.fillStyle = '#c4ccd4';
    ctx.fillRect(190, 150, 2, 20);
    ctx.fillStyle = '#8a6b42';
    ctx.fillRect(187, 168, 8, 2);
    ctx.fillRect(190, 170, 2, 5);
    // a first, weak glow off the player — the light is in them, not the lamp
    glow(ctx, 170, 160, 30, '#ffd77a', 0.3);
  },

  // what is left: the village square, one fire, warm windows
  village(ctx) {
    sky(ctx, '#2a3450', '#7a6a72');
    star(ctx, 20, 23);
    ridge(ctx, 116, 9, '#3a4048', 1.3);
    ctx.fillStyle = '#3c4a32';
    ctx.fillRect(0, 132, W, 48);
    // three huts with lit windows
    const hut = (x, w, h, wall, roof) => {
      ctx.fillStyle = wall; ctx.fillRect(x, 132 - h, w, h);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 4, 132 - h); ctx.lineTo(x + w / 2, 132 - h - 12); ctx.lineTo(x + w + 4, 132 - h);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd77a'; ctx.fillRect(x + w / 2 - 3, 132 - h + 8, 6, 6);
    };
    hut(30, 34, 26, '#8a7458', '#6a4a38');
    hut(232, 38, 30, '#8a7458', '#6a4a38');
    hut(140, 30, 22, '#7f6a50', '#5e4232');
    // the square fire
    glow(ctx, 162, 148, 34, '#ff9a3a', 0.45);
    ctx.fillStyle = '#ff7722'; ctx.fillRect(156, 146, 10, 12);
    ctx.fillStyle = '#ffd23e'; ctx.fillRect(158, 150, 6, 8);
    ctx.fillStyle = '#5a4630'; ctx.fillRect(150, 158, 22, 4);
    chibi(ctx, 122, 166, '#a86a4a', '#5a4030');
    chibi(ctx, 200, 168, '#4a7a52', '#2a2018');
  },

  // the first job: one dark lantern at the edge of the light
  road(ctx) {
    sky(ctx, '#161e2c', '#3a4256');
    star(ctx, 44, 31);
    ridge(ctx, 120, 8, '#1e2630', 1.6);
    ctx.fillStyle = '#26301f';
    ctx.fillRect(0, 138, W, 42);
    ctx.fillStyle = '#38402c';
    ctx.beginPath();
    ctx.moveTo(0, 152); ctx.lineTo(W, 144); ctx.lineTo(W, 168); ctx.lineTo(0, 178);
    ctx.closePath(); ctx.fill();
    // lit behind you, dark ahead: the whole game in one image
    lantern(ctx, 40, 174, true, 1.0);
    lantern(ctx, 96, 168, true, 0.85);
    lantern(ctx, 252, 164, false, 0.95);
    chibi(ctx, 168, 168, '#7a9ac8', '#3a2a20');
    ctx.fillStyle = '#c4ccd4';
    ctx.fillRect(178, 156, 2, 12);
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

    function finish(done) {
      clearInterval(typer);
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
      const b = BEATS[i];
      ctx.clearRect(0, 0, W, H);
      SCENES[b.scene](ctx);
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
  });
}

/** So callers can note which language the story was told in. */
export const prologueLang = () => getLang();
