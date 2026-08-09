// THE PROLOGUE.
//
// Shown once, after character creation, before the world builds — which is the
// only moment in the whole game where the player is already committed and has
// nothing else to do. A story told over a loading bar is the one piece of
// exposition nobody resents.
//
// Six beats. Each is a painted pixel scene plus two or three lines of text that
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

const BEATS = [
  {
    scene: 'lanterns',
    title: { en: 'THE LIGHT THAT WAS KEPT', id: 'CAHAYA YANG DIJAGA' },
    lines: [
      {
        en: 'For four hundred years, the lanterns of Anavela were never allowed to go out.',
        id: 'Selama empat ratus tahun, lentera-lentera Anavela tidak pernah dibiarkan padam.',
      },
      {
        en: 'Not because the dark was dangerous. Because a light on a road means somebody is expected home.',
        id: 'Bukan karena gelap itu berbahaya. Tapi karena cahaya di jalan berarti ada yang ditunggu pulang.',
      },
    ],
  },
  {
    scene: 'order',
    title: { en: 'THE LANTERNKEEPERS', id: 'PARA PENJAGA LENTERA' },
    lines: [
      {
        en: 'They were not soldiers. They carried oil, wick and a long brass match, and they walked the same roads every night.',
        id: 'Mereka bukan prajurit. Mereka membawa minyak, sumbu, dan korek kuningan panjang, lalu menyusuri jalan yang sama setiap malam.',
      },
      {
        en: 'It was the least heroic work in the world, and it held the world together.',
        id: 'Itu pekerjaan paling tidak heroik di dunia, dan justru itu yang menahan dunia tetap utuh.',
      },
    ],
  },
  {
    scene: 'dark',
    title: { en: 'THE NIGHT THEY FAILED', id: 'MALAM SAAT MEREKA GAGAL' },
    lines: [
      {
        en: 'Nobody agrees on what came first — the lights going out, or the wilds walking back in.',
        id: 'Tidak ada yang sepakat mana yang lebih dulu — lampu yang padam, atau hutan liar yang kembali masuk.',
      },
      {
        en: 'By morning the roads were gone under the grass, and the Keepers were gone with them.',
        id: 'Menjelang pagi, jalan-jalan itu hilang tertutup rumput, dan para Penjaga hilang bersamanya.',
      },
    ],
  },
  {
    scene: 'apprentice',
    title: { en: 'ALL BUT ONE', id: 'KECUALI SATU' },
    lines: [
      {
        en: 'You were too young to walk the roads. That is the only reason you are still here.',
        id: 'Kamu terlalu kecil untuk ikut menyusuri jalan itu. Hanya karena itu kamu masih di sini.',
      },
      {
        en: 'They left you a sword you have never swung, and a name nobody has said out loud in years: apprentice.',
        id: 'Mereka mewariskan pedang yang belum pernah kamu ayunkan, dan sebutan yang bertahun-tahun tak diucapkan orang: murid.',
      },
    ],
  },
  {
    scene: 'village',
    title: { en: 'WHAT IS LEFT', id: 'YANG TERSISA' },
    lines: [
      {
        en: 'One village still stands, because somebody there refuses to stop lighting the square at dusk.',
        id: 'Satu desa masih berdiri, karena ada orang di sana yang menolak berhenti menyalakan alun-alun saat senja.',
      },
      {
        en: 'They farm, they fish, they trade, and they do not talk about the road out.',
        id: 'Mereka bertani, memancing, berdagang, dan tidak pernah membicarakan jalan keluar.',
      },
    ],
  },
  {
    scene: 'road',
    title: { en: 'YOUR FIRST NIGHT', id: 'MALAM PERTAMAMU' },
    lines: [
      {
        en: 'You are not going to save anyone yet. You do not know a single skill, and the sword is heavier than it looks.',
        id: 'Kamu belum akan menyelamatkan siapa pun. Kamu belum menguasai satu skill pun, dan pedang itu lebih berat dari kelihatannya.',
      },
      {
        en: 'But there is a lantern at the edge of the village that has been dark for eleven years.',
        id: 'Tapi ada satu lentera di ujung desa yang sudah sebelas tahun padam.',
      },
      {
        en: 'Start there.',
        id: 'Mulai dari sana.',
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
    // an additive-looking halo, painted as three fading rings
    for (let r = 3; r >= 1; r--) {
      ctx.globalAlpha = 0.1 * r;
      ctx.fillStyle = '#ffd77a';
      ctx.fillRect(x - (5 + r * 4) * s, groundY - (30 + r * 3) * s, (10 + r * 8) * s, (9 + r * 6) * s);
    }
    ctx.globalAlpha = 1;
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
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffd77a';
      ctx.fillRect(x - 3, 152, 8, 8);
      ctx.globalAlpha = 1;
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
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffd77a';
    ctx.fillRect(150, 146, 40, 30);
    ctx.globalAlpha = 1;
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
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff9a3a';
    ctx.fillRect(140, 132, 44, 34);
    ctx.globalAlpha = 1;
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
