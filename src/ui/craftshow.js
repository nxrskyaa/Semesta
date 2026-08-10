// THE WORKBENCH SHOW — cooking and forging as things you WATCH, not as a click.
//
// Both used to be a button that swapped items in your bag and played a 60ms
// blip. Everything else in this game has a process you can see: fishing has a
// float and a bite, gacha has a capsule machine that rattles, a level-up throws
// gold rays across the screen. Cooking three fish into a dinner was the one
// place where the most interesting thing on screen was a number changing.
//
// So both are now short staged scenes, painted on a 112x80 canvas and upscaled
// with `image-rendering: pixelated` like every other texture in Semesta:
//
//   COOK   fire lights → each ingredient falls into the pot and stains the broth
//          → it bubbles and a spoon goes round → the lid lifts on the dish
//   FORGE  the billet heats white in the coals → three hammer strikes with real
//          sparks, the metal cooling toward orange between them → a quench that
//          hisses out a wall of steam → the finished piece
//
// Two rules the drawing follows, both learned the hard way elsewhere in this
// codebase: glows are radial gradients and never rectangles (a square halo is
// the one thing that instantly breaks the illusion of light), and nothing
// animates on a single shared sine — the flames, the bubbles and the steam all
// run on their own phases so the scene never pulses as one object.
//
// The ingredient icons dropped into the pot are the REAL item icons, pulled
// from the same generator the bag uses. Watching your actual two Green Herbs go
// in is what makes the pot feel like your pot.
import { makeItemIconCanvas } from '../gfx/textures.js';
import { ITEMS, RARITY } from '../systems/items.js';

const W = 112, H = 80, SCALE = 4;

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };

/** A shaded block: base fill, light top-left edge, dark bottom-right. */
function block(ctx, x, y, w, h, base, hi, lo) {
  px(ctx, x, y, w, h, base);
  if (hi) { px(ctx, x, y, w, 1, hi); px(ctx, x, y, 1, h, hi); }
  if (lo) { px(ctx, x, y + h - 1, w, 1, lo); px(ctx, x + w - 1, y, 1, h, lo); }
}

/**
 * A soft round glow. ALWAYS this, never a fillRect — a square patch of light is
 * the single fastest way to make a lit scene look like a mistake.
 */
function glow(ctx, x, y, r, colour, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Mix two #rrggbb strings. */
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/**
 * The average colour of an item's icon, ignoring transparent pixels and the
 * near-black outline every icon is drawn with.
 *
 * This is what the broth turns into. Hard-coding a colour per recipe would mean
 * a new dish silently cooks up grey, and asking ITEMS for a `color` it does not
 * have would mean the same — reading the icon means the pot always ends up the
 * colour of the thing coming out of it, for every recipe that will ever exist.
 */
const dishColourCache = new Map();
function dishColour(id) {
  if (dishColourCache.has(id)) return dishColourCache.get(id);
  let out = '#c8853a';
  try {
    const c = makeItemIconCanvas(id);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 140) continue;
      if (d[i] + d[i + 1] + d[i + 2] < 110) continue;      // outline
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n) {
      out = `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}`;
    }
  } catch { /* a tainted or missing canvas just keeps the default */ }
  dishColourCache.set(id, out);
  return out;
}

// ---------------------------------------------------------------- backdrop
// Painted once and blitted, because it never changes and it is the only part of
// the scene with a gradient in it.
let backCache = null;
function backdrop() {
  if (backCache) return backCache;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // wall: two bands of dark warm stone with a course line between them
  px(ctx, 0, 0, W, H, '#1b1712');
  for (let y = 0; y < 64; y += 8) px(ctx, 0, y, W, 1, '#221d16');
  for (let x = 0; x < W; x += 16) px(ctx, x, 0, 1, 64, '#201b15');
  // floor
  px(ctx, 0, 64, W, H - 64, '#2a2118');
  px(ctx, 0, 64, W, 1, '#3a2f22');
  for (let x = 6; x < W; x += 13) px(ctx, x, 65, 1, H - 65, '#241c14');
  backCache = c;
  return c;
}

// ------------------------------------------------------------------- props
/**
 * A cauldron: bulging body, a rolled rim, two ring handles and three feet.
 *
 * The first pass painted the whole body in one flat iron and it read as a dark
 * blob — a black pot on a dark wall with nothing to catch an edge on. Cast iron
 * is only legible because of what it REFLECTS, so this shades it three ways: a
 * cool highlight down the left where the room is, a warm rim-light along the
 * bottom where the fire is, and a genuine dark core between them.
 */
function paintPot(ctx, cx, topY) {
  const IRON = '#4c4952', IRON_HI = '#726e79', IRON_LO = '#2a2830', FIRE_LIT = '#7a5138';
  // feet first, so the body covers their tops
  for (const dx of [-14, 0, 14]) block(ctx, cx + dx - 2, topY + 24, 4, 4, IRON_LO, IRON, '#17161a');
  // body: rows that bulge out and pull back in
  const rows = [22, 23, 24, 24, 23, 22, 20, 17, 13];
  rows.forEach((hw, i) => {
    const y = topY + 3 + i * 2.6;
    const k = i / (rows.length - 1);
    // the lower the row, the more of the fire it catches
    px(ctx, cx - hw, y, hw * 2, 3, mix(IRON, FIRE_LIT, k * 0.55));
    px(ctx, cx - hw, y, 2, 3, IRON_LO);
    px(ctx, cx + hw - 2, y, 2, 3, IRON_LO);
  });
  // the belly highlight, the thing that makes it read as round rather than flat
  px(ctx, cx - 19, topY + 7, 2, 10, IRON_HI);
  px(ctx, cx - 17, topY + 17, 2, 5, IRON_HI);
  px(ctx, cx - 20, topY + 10, 1, 5, '#8b8791');
  // warm bounce along the very bottom of the belly
  px(ctx, cx - 12, topY + 24, 24, 1, '#a5673c');
  // rolled rim
  block(ctx, cx - 24, topY, 48, 4, IRON_HI, '#8f8b96', IRON_LO);
  // ring handles
  for (const s of [-1, 1]) {
    px(ctx, cx + s * 25, topY + 1, 2, 7, IRON_LO);
    px(ctx, cx + s * 26, topY + 6, 3, 2, IRON_LO);
  }
}

/** Fire under the pot: three tongues on three different rhythms. */
function paintFire(ctx, cx, baseY, t, strength) {
  if (strength <= 0.01) return;
  const tongues = [
    { dx: -11, h: 12, sp: 7.1, w: 5 },
    { dx: 0, h: 17, sp: 5.3, w: 6 },
    { dx: 11, h: 13, sp: 8.7, w: 5 },
  ];
  glow(ctx, cx, baseY - 3, 34 * strength, 'rgba(255,150,50,0.5)', strength);
  for (const f of tongues) {
    const lick = 0.72 + Math.sin(t * f.sp + f.dx) * 0.28;
    const h = f.h * strength * lick;
    for (let i = 0; i < h; i++) {
      const k = i / Math.max(1, h);                 // 0 at the base, 1 at the tip
      const w = Math.max(1, Math.round(f.w * (1 - k * 0.85)));
      const col = k < 0.35 ? '#fff2b0' : k < 0.7 ? '#ffb03a' : '#e8542a';
      px(ctx, cx + f.dx - w / 2 + Math.sin(t * f.sp * 0.6 + i * 0.5) * k * 2, baseY - i, w, 1, col);
    }
  }
  // embers in the pit
  for (let i = 0; i < 7; i++) {
    const a = i * 1.7 + t * 0.4;
    px(ctx, cx - 16 + i * 5, baseY + 1 + (i % 2), 2, 1, i % 2 ? '#ff8a3a' : '#c8401c');
  }
}

/** An anvil: horn, face, waist and a splayed base, on a chopping block. */
function paintAnvil(ctx, cx, faceY) {
  const M = '#4a4750', M_HI = '#6e6b76', M_LO = '#2c2a31';
  // stump
  block(ctx, cx - 13, faceY + 15, 26, 12, '#6b4a2c', '#8a6238', '#402b19');
  for (let x = 0; x < 26; x += 5) px(ctx, cx - 13 + x, faceY + 15, 1, 12, '#5a3e25');
  // base
  block(ctx, cx - 15, faceY + 11, 30, 4, M, M_HI, M_LO);
  // waist
  block(ctx, cx - 6, faceY + 5, 12, 6, M_LO, M, '#1e1c22');
  // body + face
  block(ctx, cx - 16, faceY, 32, 5, M, M_HI, M_LO);
  px(ctx, cx - 16, faceY, 32, 1, '#807d88');            // the polished face
  // horn, tapering left
  for (let i = 0; i < 9; i++) {
    const h = 5 - Math.round(i * 0.45);
    px(ctx, cx - 16 - i, faceY + Math.round(i * 0.2), 1, h, i > 5 ? M_LO : M);
  }
  // heel step on the right
  px(ctx, cx + 16, faceY + 1, 3, 3, M_LO);
}

/** A blacksmith's hammer, pivoting about its handle end. */
function paintHammer(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // haft
  px(ctx, -1, 0, 3, 26, '#8a6238');
  px(ctx, -1, 0, 1, 26, '#a67b47');
  // head
  block(ctx, -7, -7, 14, 8, '#54515b', '#7a7782', '#2f2d35');
  px(ctx, -7, -7, 3, 8, '#6e6b76');
  px(ctx, 4, -6, 3, 6, '#3a3841');
  ctx.restore();
}

/** The coal forge: a brick hearth whose bed brightens as it is worked. */
function paintForge(ctx, x, y, heat, t) {
  block(ctx, x, y, 30, 22, '#5a4030', '#75543e', '#39271c');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) px(ctx, x + 2 + c * 9, y + 2 + r * 7, 8, 6, r % 2 ? '#63462f' : '#57402f');
  }
  // the coal bed
  const bed = mix('#3a2018', '#ffd06a', heat);
  px(ctx, x + 4, y + 6, 22, 8, bed);
  for (let i = 0; i < 9; i++) {
    const f = 0.5 + Math.sin(t * 6 + i * 1.3) * 0.5;
    px(ctx, x + 5 + i * 2.3, y + 7 + (i % 3), 2, 2, mix('#7a2a12', '#fff0b0', heat * f));
  }
  glow(ctx, x + 15, y + 10, 22 * heat, 'rgba(255,140,40,0.55)', heat);
  // chimney hood
  px(ctx, x - 1, y - 4, 32, 4, '#3f3a34');
}

// ------------------------------------------------------------- the element
const CSS = `
.cshow {
  position: fixed; inset: 0; z-index: 70; display: flex;
  align-items: center; justify-content: center; flex-direction: column; gap: 14px;
  background: rgba(6,8,6,0.82); backdrop-filter: blur(2px);
  animation: cshow-in 0.18s ease-out;
}
@keyframes cshow-in { from { opacity: 0; } }
.cshow .frame {
  position: relative; padding: 10px;
  background: #14110d; box-shadow: var(--pix-frame, 0 0 0 2px #46523c);
}
.cshow canvas {
  display: block; image-rendering: pixelated;
  width: ${W * SCALE}px; height: ${H * SCALE}px; max-width: 88vw; height: auto;
}
.cshow .stage {
  font-family: var(--font-display, monospace); font-size: 11px; letter-spacing: 3px;
  color: var(--gold, #d8b866); text-align: center; min-height: 14px;
}
.cshow .bar {
  display: flex; gap: 2px; width: ${W * SCALE}px; max-width: 88vw;
}
.cshow .bar i {
  flex: 1; height: 7px; background: #2b2f26;
  box-shadow: inset 0 0 0 1px #1a1d17;
}
.cshow .bar i.on { background: var(--gold, #d8b866); }
.cshow .hint { font-size: 9px; letter-spacing: 2px; color: #7d8a70; }
.cshow .out {
  display: flex; align-items: center; gap: 10px; padding: 8px 16px;
  background: #14110d; box-shadow: var(--pix-frame, 0 0 0 2px #46523c);
  animation: cshow-pop 0.3s cubic-bezier(0.2, 1.6, 0.4, 1);
}
@keyframes cshow-pop { from { transform: scale(0.6) translateY(14px); opacity: 0; } }
.cshow .out img { width: 40px; height: 40px; image-rendering: pixelated; }
.cshow .out b { font-size: 13px; }
.cshow .out small { display: block; font-size: 9px; letter-spacing: 1px; color: #9aa890; }
@media (max-width: 560px) {
  .cshow .stage { font-size: 9px; letter-spacing: 2px; }
}
`;

/**
 * @param audio the game's audio module — the show plays its own SFX so callers
 *   do not have to know what a bellows sounds like.
 */
export function createCraftShow(audio) {
  if (!document.getElementById('cshow-css')) {
    const s = document.createElement('style');
    s.id = 'cshow-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const el = document.createElement('div');
  el.className = 'cshow';
  el.style.display = 'none';
  el.innerHTML = `
    <div class="frame"><canvas width="${W}" height="${H}"></canvas></div>
    <div class="stage"></div>
    <div class="bar"></div>
    <div class="hint">HOLD ANYWHERE TO HURRY</div>
    <div class="slot"></div>`;
  document.body.appendChild(el);

  const cv = el.querySelector('canvas');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const stageEl = el.querySelector('.stage');
  const barEl = el.querySelector('.bar');
  const slotEl = el.querySelector('.slot');

  let job = null;      // the running scene, or null
  let raf = 0;
  let hurry = false;

  const down = () => { hurry = true; };
  const up = () => { hurry = false; };
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') hurry = true; });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') hurry = false; });

  // ------------------------------------------------------------ the scenes
  function drawCook(j, t) {
    const cx = W / 2, potTop = 30, fireBase = 66;
    ctx.drawImage(backdrop(), 0, 0);

    // hearth stones under the fire
    for (let i = 0; i < 7; i++) {
      block(ctx, 22 + i * 10, 62, 9, 6, '#575048', '#6d655a', '#39332c');
    }

    paintFire(ctx, cx, fireBase - 4, t, j.fire);
    paintPot(ctx, cx, potTop);
    // and the fire throws light back UP onto the pot it is under — without this
    // the flames read as a sticker behind an unlit object
    if (j.fire > 0.05) {
      glow(ctx, cx, potTop + 26, 26 * j.fire, 'rgba(255,140,50,0.30)', j.fire);
    }

    // THE BROTH. Its colour is where the ingredients went: every one that has
    // gone in pulls it a step toward the finished dish, so the pot visibly
    // becomes the thing you are cooking.
    const surfaceY = potTop + 5;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, surfaceY, 21, 5, 0, 0, Math.PI * 2);
    ctx.clip();
    px(ctx, cx - 22, surfaceY - 6, 44, 12, j.broth);
    px(ctx, cx - 22, surfaceY - 6, 44, 2, mix(j.broth, '#ffffff', 0.22));
    // bubbles: each is on its own loop, so they never surface in lockstep
    for (const b of j.bubbles) {
      const life = ((t * b.sp + b.off) % 1);
      const r = b.r * (0.5 + life * 0.5);
      const bx = cx + b.x, by = surfaceY + 3 - life * 7;
      ctx.globalAlpha = 1 - life * life;
      ctx.fillStyle = mix(j.broth, '#ffffff', 0.5);
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // the rim in front of the broth, so the liquid sits INSIDE the pot
    px(ctx, cx - 24, potTop, 48, 2, '#6d6a71');

    // THE SPOON, going round. It is drawn as an ellipse path so the handle
    // sweeps behind the far rim and in front of the near one.
    if (j.stir > 0) {
      const a = t * 3.4;
      const sx = cx + Math.cos(a) * 13, sy = surfaceY + Math.sin(a) * 4;
      const behind = Math.sin(a) < 0;
      if (!behind) {
        px(ctx, sx - 1, sy - 14, 3, 15, '#b98a52');
        px(ctx, sx - 1, sy - 14, 1, 15, '#d6a468');
        block(ctx, sx - 3, sy - 2, 6, 4, '#a87a46', '#c8985c', '#7a5730');
      }
    }

    // INGREDIENTS FALLING IN. Real item icons, dropped from above the frame.
    for (const d of j.drops) {
      if (t < d.at) continue;
      const k = (t - d.at) / 0.42;
      if (k > 1.25) continue;
      const y = -18 + ease(clamp01(k)) * (surfaceY + 16);
      const spin = k * 5;
      ctx.save();
      ctx.translate(cx + d.x, Math.min(y, surfaceY + 1));
      ctx.rotate(Math.sin(spin) * 0.5);
      ctx.globalAlpha = k > 1 ? 1 - (k - 1) * 4 : 1;
      ctx.drawImage(d.icon, -8, -8, 16, 16);
      ctx.restore();
      if (k > 0.98 && k < 1.06) {
        // the splash it makes
        for (let i = 0; i < 6; i++) {
          px(ctx, cx + d.x - 9 + i * 3, surfaceY - 2 - (i % 3), 1, 1, mix(j.broth, '#ffffff', 0.6));
        }
      }
    }

    // STEAM, rising and curling. Three ribbons on different phases.
    if (j.steam > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 * j.steam;
      for (let s = 0; s < 3; s++) {
        for (let i = 0; i < 12; i++) {
          const k = i / 12;
          const yy = surfaceY - 4 - i * 2.2 - ((t * 9 + s * 4) % 3);
          if (yy < 1) continue;
          const wob = Math.sin(t * 2 + k * 5 + s * 2.1) * (3 + k * 6);
          const r = 1 + k * 2.4;
          ctx.globalAlpha = 0.45 * j.steam * (1 - k);
          ctx.fillStyle = '#e6e2d6';
          ctx.beginPath(); ctx.arc(cx - 12 + s * 12 + wob, yy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawForge(j, t) {
    const cx = 50, faceY = 44;
    ctx.drawImage(backdrop(), 0, 0);

    // the quench trough on the left
    block(ctx, 2, 56, 26, 10, '#6b4a2c', '#8a6238', '#402b19');
    px(ctx, 4, 58, 22, 6, '#2f6a7a');
    px(ctx, 4, 58, 22, 1, '#4d97a8');

    paintForge(ctx, 80, 42, j.heat, t);
    paintAnvil(ctx, cx, faceY);

    // THE WORKPIECE. It glows white out of the coals and cools toward dull red
    // between strikes — that cooling is the whole reason a smith works fast.
    const wcol = mix('#8a3418', '#fff6d8', j.metal);
    const wx = cx - 7 + j.shape * 2, ww = 15 - j.shape * 3, wh = 4 - Math.round(j.shape * 1.4);
    if (j.metal > 0.25) glow(ctx, cx, faceY - 1, 14 * j.metal, 'rgba(255,170,60,0.75)', j.metal);
    px(ctx, wx, faceY - wh, ww, wh, wcol);
    px(ctx, wx, faceY - wh, ww, 1, mix(wcol, '#ffffff', 0.4));

    // tongs holding it, from the left
    px(ctx, 18, faceY - 3, 16, 2, '#3f3d46');
    px(ctx, 18, faceY, 16, 2, '#3f3d46');
    px(ctx, 10, faceY - 4, 9, 7, '#585560');

    // THE HAMMER. Down fast, up slow — the asymmetry is what makes it read as
    // weight rather than as a metronome.
    if (j.phase === 'strike') {
      const k = j.strikeK;
      const ang = k < 0.28
        ? -1.15 + (k / 0.28) * 1.5              // the drop
        : 0.35 - ease((k - 0.28) / 0.72) * 1.5; // the lift
      paintHammer(ctx, cx + 12, faceY - 16, ang);
    } else {
      paintHammer(ctx, cx + 12, faceY - 16, -1.15);
    }

    // SPARKS. Real ballistics: they leave the impact point fast and fall.
    for (const s of j.sparks) {
      const age = t - s.born;
      if (age < 0 || age > s.life) continue;
      const k = age / s.life;
      const sx = s.x + s.vx * age;
      const sy = s.y + s.vy * age + 60 * age * age;
      ctx.globalAlpha = 1 - k * k;
      px(ctx, sx, sy, 1, 1, k < 0.4 ? '#fff6d8' : k < 0.75 ? '#ffc65a' : '#ff7a2a');
      ctx.globalAlpha = 1;
    }

    // THE QUENCH: the piece goes into the trough and the room fills with steam.
    if (j.quench > 0) {
      const k = j.quench;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.4);
      for (let i = 0; i < 26; i++) {
        const a = i * 0.72 + t;
        const rr = 3 + k * 26 + Math.sin(a * 2) * 3;
        const yy = 60 - k * 34 - (i % 5) * 3;
        ctx.globalAlpha = 0.5 * (1 - k * 0.6) * (1 - (i % 5) / 6);
        ctx.fillStyle = '#eceadf';
        ctx.beginPath();
        ctx.arc(15 + Math.cos(a) * rr * 0.8, yy, 1.5 + k * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------- the driver
  //
  // THE JOB MUST FINISH EVEN IF NOBODY IS WATCHING. requestAnimationFrame stops
  // dead in a background tab, and the ingredients have already left your bag by
  // the time the first frame draws — so an alt-tab halfway through a pot left
  // the modal up forever, the hero stuck `busy`, and the food gone. Nothing in
  // the game could recover from it but a reload.
  //
  // So rAF only ever DRAWS. A 200ms watchdog interval keeps stepping the job
  // when rAF has gone quiet (background timers are clamped, but they still
  // fire), and every step takes its delta from the wall clock rather than from
  // a frame count, so a throttled tab finishes cooking in the same real time a
  // visible one does.
  const STALL_MS = 380;
  let watchdog = 0;

  function step(now) {
    if (!job) return;
    // The cap is 0.3s, not one frame: the watchdog ticks every 200ms and a
    // background tab clamps timers harder still, so a per-frame cap made a
    // hidden pot take four times as long as a visible one. Everything the scene
    // holds is continuous, so a large step just catches up.
    const dt = Math.min(0.3, (now - job.last) / 1000) * (hurry ? 2.6 : 1);
    job.last = now;
    job.t += dt;

    const st = job.stages[job.i];
    job.k += dt / st.dur;

    // per-stage state the painters read
    if (job.kind === 'cook') {
      job.fire = Math.min(1, job.fire + dt * (job.i === 0 ? 1.6 : 0.4));
      job.stir = job.i >= job.firstSimmer ? 1 : 0;
      job.steam = clamp01((job.i - job.firstSimmer + 1) * 0.5);
      if (job.stirT === undefined) job.stirT = 0;
      job.stirT -= dt;
      if (job.stir && job.stirT <= 0) { job.stirT = 0.85; audio?.sfx?.('cook_stir'); }
      job.bubbleT -= dt;
      if (job.steam > 0.2 && job.bubbleT <= 0) {
        job.bubbleT = 0.16 + Math.random() * 0.22;
        audio?.sfx?.('cook_bubble');
      }
    } else {
      // heat climbs in the coals and bleeds away on the anvil
      const heating = st.id === 'heat';
      job.heat = clamp01(job.heat + dt * (heating ? 1.4 : -0.25));
      job.metal = clamp01(job.metal + dt * (heating ? 1.2 : -0.55));
      if (st.id === 'strike') {
        job.phase = 'strike';
        job.strikeK = job.k;
        if (!job.struck && job.k >= 0.28) {
          job.struck = true;
          job.metal = Math.min(1, job.metal + 0.25);       // the flash of the blow
          job.shape = Math.min(1, job.shape + 0.34);
          audio?.sfx?.('forge_hit');
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI * (0.15 + Math.random() * 0.7);
            const sp = 20 + Math.random() * 46;
            job.sparks.push({
              x: 50, y: 42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              born: job.t, life: 0.35 + Math.random() * 0.4,
            });
          }
          if (job.sparks.length > 90) job.sparks.splice(0, job.sparks.length - 90);
        }
      } else {
        job.phase = st.id;
      }
      job.quench = st.id === 'quench' ? ease(clamp01(job.k)) : Math.max(0, job.quench - dt * 1.6);
    }

    // Always paint, even on a watchdog tick. It is a 112x80 canvas — cheaper
    // than the branch that would skip it — and it means the modal is showing the
    // CURRENT state the instant a backgrounded tab comes forward, instead of a
    // frozen frame from whenever rAF last ran.
    (job.kind === 'cook' ? drawCook : drawForge)(job, job.t);

    // A stage can be shorter than one throttled tick, so this walks as many as
    // the elapsed time actually covered rather than assuming one per step.
    while (job && job.k >= 1) {
      job.i += 1; job.k -= 1; job.struck = false;
      if (job.i >= job.stages.length) { finish(); return; }
      const next = job.stages[job.i];
      stageEl.textContent = next.label;
      [...barEl.children].forEach((b, n) => b.classList.toggle('on', n <= job.i));
      next.enter?.(job);
    }
  }

  function frame(now) {
    if (!job) return;
    step(now);
    if (job) raf = requestAnimationFrame(frame);
  }

  function finish() {
    const j = job;
    job = null;
    cancelAnimationFrame(raf);
    clearInterval(watchdog);
    const d = ITEMS[j.out] || {};
    const rar = RARITY[d.rarity] || null;
    stageEl.textContent = j.kind === 'cook' ? 'SERVED' : 'FINISHED';
    [...barEl.children].forEach((b) => b.classList.add('on'));
    slotEl.innerHTML = `<div class="out">
      <img src="${makeItemIconCanvas(j.out).toDataURL()}">
      <div><b style="color:${rar?.color || '#ffe8c8'}">${d.name || j.out}</b>
      <small>${j.portions > 1 ? `×${j.portions} — the pot stretched to two` : (j.note || 'ready')}</small></div>
    </div>`;
    audio?.sfx?.(j.kind === 'cook' ? 'cook_done' : 'forge_ok');
    setTimeout(() => {
      el.style.display = 'none';
      slotEl.innerHTML = '';
      hurry = false;
      j.onDone?.();
    }, 1150);
  }

  /**
   * Run a scene. Returns nothing — the reward is granted by `onDone`, which the
   * caller supplies, so this module never touches an inventory.
   *
   * @param kind 'cook' | 'forge'
   * @param out item id being produced
   * @param cost { itemId: count } — drawn falling into the pot, in order
   * @param portions how many came out (cooking's double-batch)
   * @param note one line under the result
   * @param onDone called once the result card has been shown
   */
  function run({ kind, out, cost = {}, portions = 1, note = '', onDone }) {
    if (job) return;                     // one at a time; the caller gates input
    el.style.display = 'flex';
    slotEl.innerHTML = '';

    const stages = [];
    if (kind === 'cook') {
      stages.push({ id: 'fire', dur: 0.55, label: 'LIGHTING THE FIRE' });
      const drops = [];
      let at = 0.55;
      const ids = Object.entries(cost);
      ids.forEach(([id, n]) => {
        for (let i = 0; i < n; i++) {
          drops.push({
            id, icon: makeItemIconCanvas(id),
            x: -10 + Math.random() * 20, at: at + i * 0.3,
          });
        }
        const dur = Math.max(0.5, n * 0.34);
        stages.push({
          id: 'add', dur,
          label: `ADDING ${(ITEMS[id]?.name || id).toUpperCase()}`,
          enter: (j) => {
            audio?.sfx?.('cook_drop');
            // every ingredient pulls the broth a step toward the finished dish
            j.broth = mix(j.broth, j.target, 1 / Math.max(1, ids.length));
          },
        });
        at += dur;
      });
      stages.push({ id: 'simmer', dur: 1.5, label: 'SIMMERING' });
      job = {
        kind, out, portions, note, onDone, stages, drops,
        i: 0, k: 0, t: 0, last: performance.now(),
        fire: 0, stir: 0, steam: 0, bubbleT: 0,
        broth: '#5b7f8a',
        target: dishColour(out),
        firstSimmer: stages.length - 1,
        bubbles: Array.from({ length: 9 }, () => ({
          x: -16 + Math.random() * 32, r: 0.8 + Math.random() * 1.4,
          sp: 0.5 + Math.random() * 0.7, off: Math.random(),
        })),
      };
    } else {
      stages.push({ id: 'heat', dur: 0.85, label: 'HEATING THE BILLET', enter: () => audio?.sfx?.('forge_bellows') });
      for (let i = 0; i < 3; i++) stages.push({ id: 'strike', dur: 0.5, label: `WORKING THE METAL — ${i + 1}/3` });
      stages.push({ id: 'quench', dur: 0.8, label: 'QUENCHING', enter: () => audio?.sfx?.('forge_quench') });
      job = {
        kind, out, portions, note, onDone, stages,
        i: 0, k: 0, t: 0, last: performance.now(),
        heat: 0.15, metal: 0, shape: 0, quench: 0, phase: 'heat', strikeK: 0,
        struck: false, sparks: [],
      };
    }

    barEl.innerHTML = stages.map(() => '<i></i>').join('');
    barEl.firstChild.classList.add('on');
    stageEl.textContent = stages[0].label;
    stages[0].enter?.(job);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (!job) return;
      const now = performance.now();
      if (now - job.last > STALL_MS) step(now);          // rAF has gone quiet
    }, 200);
  }

  function dispose() {
    cancelAnimationFrame(raf);
    clearInterval(watchdog);
    window.removeEventListener('pointerup', up);
    el.remove();
  }

  return { el, run, dispose, get busy() { return !!job; } };
}
