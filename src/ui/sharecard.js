// THE CHRONICLE CARD — a share image the player actually wants to post.
//
// The point is engagement, so the card has to survive being seen at thumbnail
// size in a timeline full of other images. Three rules follow from that, and
// every decision below is one of them:
//
//   1. THE HERO IS THE SUBJECT. Their character, rendered in 3D from the same
//      rig the game uses, with their real gear and cosmetics on it — not an
//      avatar, not a logo. A card that could belong to anybody gets no clicks.
//   2. ONE NUMBER READS FROM ACROSS THE ROOM. The level, huge. The rest is
//      supporting detail you only see if you stopped to look.
//   3. IT MUST NOT LOOK LIKE A SCREENSHOT. A cropped screenshot is what
//      everybody already posts. This is a printed card: framed, laid out,
//      with a palette of its own.
//
// The whole thing is drawn to a canvas — no HTML-to-image library, no server —
// and the 3D portrait is composited in from an offscreen WebGLRenderer. That
// keeps it inside the project's no-asset-files rule and means the download is
// a real PNG the player owns rather than a link that can rot.
import * as THREE from 'three';
import { buildCharacterMesh } from '../entities/player.js';
import { buildCosmetic } from '../systems/cosmetics.js';
import { ITEMS, RARITY } from '../systems/items.js';
import { CLASSES } from '../systems/classes.js';

export const CARD_W = 1200;
export const CARD_H = 675;          // 16:9 — the aspect X renders largest

/**
 * THE THEMES.
 *
 * Four, and they are not recolours of one design: each has its own ground,
 * its own light and its own accent, so a timeline with several of them in it
 * looks like a set rather than a template. The names are the game's own
 * places, which is the other half of why somebody posts one.
 */
export const CARD_THEMES = {
  lantern: {
    name: 'THE LANTERN ROAD',
    sky: ['#0b1026', '#16264a', '#2b4a63'],
    accent: '#f0c455', accent2: '#ffe9a8', ink: '#e8f0ff', dim: '#8fa8b8',
    ground: '#1b2f3c', mood: 'night',
  },
  dawn: {
    name: 'ANAVELA AT DAWN',
    sky: ['#2a1e3a', '#7a4a52', '#e8a06a'],
    accent: '#ffd08a', accent2: '#fff2d8', ink: '#fff4e6', dim: '#c2a08a',
    ground: '#3a2a30', mood: 'warm',
  },
  hollow: {
    name: 'OUT OF THE HOLLOW',
    sky: ['#07060c', '#1a1024', '#3a1c2c'],
    accent: '#ff6b5e', accent2: '#ffb08a', ink: '#f4e8f0', dim: '#9a7a88',
    ground: '#140c18', mood: 'dark',
  },
  frost: {
    name: 'THE LONG FROST',
    sky: ['#0a1826', '#1d3a52', '#5a86a0'],
    accent: '#a8d8ff', accent2: '#e8f6ff', ink: '#eaf4ff', dim: '#8aa8bc',
    ground: '#1a2c3a', mood: 'cold',
  },
};

// --------------------------------------------------------------------------
// 3D PORTRAIT
//
// Its own renderer, created once and reused. A second WebGL context is a real
// cost, so it is built on first use and never on load — most sessions never
// open this panel at all.
// --------------------------------------------------------------------------
let pr = null;
function portraitRenderer() {
  if (pr) return pr;
  const canvas = document.createElement('canvas');
  canvas.width = 560; canvas.height = 620;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 30);
  cam.position.set(0, 1.02, 3.15);
  cam.lookAt(0, 0.72, 0);
  // A three-point rig, because a character lit from one side is a silhouette
  // with a bright edge and reads as unfinished at any size.
  scene.add(new THREE.HemisphereLight(0xdce8f4, 0x2a3038, 1.15));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.1); key.position.set(2.4, 3.2, 2.8);
  const fill = new THREE.DirectionalLight(0x9ab8d8, 0.7); fill.position.set(-2.6, 1.2, 1.4);
  const rim = new THREE.DirectionalLight(0xffd08a, 1.5); rim.position.set(-1.2, 2.2, -2.6);
  scene.add(key, fill, rim);
  pr = { canvas, renderer, scene, cam, key, fill, rim, rig: null, extras: [] };
  return pr;
}

/** Build the hero exactly as the world builds them, then pose for the camera. */
function renderPortrait({ appearance, weaponId, cosmetics, theme, turn = 0.62 }) {
  const p = portraitRenderer();
  if (p.rig) { p.scene.remove(p.rig.group); p.rig = null; }
  for (const e of p.extras) e.parent?.remove(e);
  p.extras = [];

  const rig = buildCharacterMesh(appearance);
  if (weaponId) { try { rig.setWeapon(weaponId); } catch { /* unknown id: bare hands */ } }
  // a three-quarter turn, not face-on: face-on is a passport photo
  rig.group.rotation.y = turn;
  rig.group.position.y = -0.06;
  p.scene.add(rig.group);
  p.rig = rig;

  for (const [slot, id] of Object.entries(cosmetics || {})) {
    if (!id || slot === 'trail') continue;
    let c = null;
    try { c = buildCosmetic(id); } catch { c = null; }
    if (!c?.mesh) continue;
    if (slot === 'hat') { c.mesh.position.y = 0.26; rig.parts.head.add(c.mesh); }
    else { c.mesh.position.set(0, 0.05, -0.16); rig.parts.body.add(c.mesh); }
    p.extras.push(c.mesh);
  }

  // tint the rim to the theme so the portrait belongs to the card it sits on
  p.rim.color.set(theme.accent);
  p.renderer.render(p.scene, p.cam);
  return p.canvas;
}

// --------------------------------------------------------------------------
// CANVAS HELPERS — the card is painted, so it needs a small drawing kit
// --------------------------------------------------------------------------
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A deterministic RNG so the same hero always gets the same starfield. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}

function hashName(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Layered stepped ridges — the same silhouette language as the loading art. */
function paintRidges(c, theme, seed, baseY) {
  const r = rng(seed);
  const bands = [
    { y: baseY - 74, amp: 60, step: 38, col: theme.sky[2], alpha: 0.55 },
    { y: baseY - 40, amp: 46, step: 30, col: theme.ground, alpha: 0.8 },
    { y: baseY - 12, amp: 30, step: 24, col: theme.ground, alpha: 1 },
  ];
  for (const b of bands) {
    c.globalAlpha = b.alpha;
    c.fillStyle = b.col;
    c.beginPath();
    c.moveTo(0, CARD_H);
    let y = b.y;
    for (let x = 0; x <= CARD_W + b.step; x += b.step) {
      y += (r() - 0.5) * b.amp * 0.5;
      y = Math.max(b.y - b.amp, Math.min(b.y + b.amp * 0.4, y));
      c.lineTo(x, y);
    }
    c.lineTo(CARD_W, CARD_H);
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 1;
}

// --------------------------------------------------------------------------
// THE CARD
// --------------------------------------------------------------------------
/**
 * @param stats  { name, cls, level, kills, deepestFloor, difficulty, playHours,
 *                 indexFound, indexTotal, bosses, message }
 * @returns HTMLCanvasElement  1200x675, ready to download or draw into a preview
 */
export function drawChronicleCard(stats, opts = {}) {
  const theme = CARD_THEMES[opts.theme] || CARD_THEMES.lantern;
  const cv = opts.canvas || document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const c = cv.getContext('2d');
  const seed = hashName((stats.name || 'Adventurer') + (opts.theme || 'lantern'));
  const r = rng(seed);

  // ---- sky ---------------------------------------------------------------
  const g = c.createLinearGradient(0, 0, 0, CARD_H);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(0.55, theme.sky[1]);
  g.addColorStop(1, theme.sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, CARD_W, CARD_H);

  // ---- stars / embers, seeded so a hero's card never reshuffles ----------
  for (let i = 0; i < 120; i++) {
    const x = r() * CARD_W, y = r() * CARD_H * 0.7;
    const s = r() < 0.85 ? 2 : 3;
    c.globalAlpha = 0.2 + r() * 0.7;
    c.fillStyle = theme.mood === 'dark' ? theme.accent : '#e8f0ff';
    c.fillRect(x | 0, y | 0, s, s);
  }
  c.globalAlpha = 1;

  // ---- a light source ---------------------------------------------------
  // UPPER LEFT, behind the hero. It used to sit at CARD_W-210, which is exactly
  // where the name is written, so every card had a moon printed through its own
  // title. Behind the portrait it also gives the character a rim to read against.
  const lx = 250, ly = 128;
  const halo = c.createRadialGradient(lx, ly, 0, lx, ly, 170);
  halo.addColorStop(0, theme.accent2 + '55');
  halo.addColorStop(1, theme.accent2 + '00');
  c.fillStyle = halo; c.beginPath(); c.arc(lx, ly, 170, 0, Math.PI * 2); c.fill();
  if (theme.mood !== 'dark') {
    c.fillStyle = '#dce8f4'; c.beginPath(); c.arc(lx, ly, 44, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b8cadc';
    c.beginPath(); c.arc(lx - 16, ly - 12, 10, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(lx + 14, ly + 14, 7, 0, Math.PI * 2); c.fill();
  }

  // ridges sit on a real horizon line, a little above the middle. Passing
  // CARD_H put all three bands inside the bottom 90px, where the ground haze
  // then covered them -- the card had no landscape in it at all.
  paintRidges(c, theme, seed, CARD_H - 210);

  // ---- ground haze so the hero is standing IN the scene, not on it ------
  const haze = c.createLinearGradient(0, CARD_H - 260, 0, CARD_H);
  haze.addColorStop(0, theme.ground + '00');
  haze.addColorStop(1, theme.ground + 'ee');
  c.fillStyle = haze; c.fillRect(0, CARD_H - 260, CARD_W, 260);

  // ---- the 3D portrait ---------------------------------------------------
  let portrait = null;
  try {
    portrait = renderPortrait({
      appearance: stats.appearance,
      weaponId: stats.weaponId,
      cosmetics: stats.cosmetics,
      theme,
    });
  } catch { portrait = null; }

  const px = 74, pw = 452, ph = 500, py = CARD_H - ph - 62;
  if (portrait) {
    // a pool of light under the feet — without it the hero floats
    const pool = c.createRadialGradient(px + pw / 2, py + ph - 26, 6, px + pw / 2, py + ph - 26, 190);
    pool.addColorStop(0, theme.accent + '4a');
    pool.addColorStop(1, theme.accent + '00');
    c.fillStyle = pool;
    c.beginPath(); c.ellipse(px + pw / 2, py + ph - 26, 190, 46, 0, 0, Math.PI * 2); c.fill();
    c.drawImage(portrait, px, py, pw, ph);
  }

  // ---- name, then level: stacked, so neither can push the other off ------
  // The first layout put the name on the same line as a 132px level number and
  // let it run: "Adventurer" reached x=1290 on a 1200px card and was cut in half
  // by the edge. Nothing here is drawn without being measured first.
  const cls = CLASSES[stats.cls];
  const colX = 566;                       // left edge of the text column
  const colR = CARD_W - 84;               // hard right margin
  const colW = colR - colX;
  c.textAlign = 'left';

  // NAME -- shrink to fit rather than clip. A long name is the player's choice.
  const nm = (stats.name || 'Adventurer').slice(0, 18);
  let nameSize = 54;
  for (;;) {
    c.font = '700 ' + nameSize + 'px "Silkscreen", Consolas, monospace';
    if (c.measureText(nm).width <= colW || nameSize <= 22) break;
    nameSize -= 2;
  }
  c.fillStyle = '#00000077';
  c.fillText(nm, colX + 3, 131);
  c.fillStyle = theme.ink;
  c.fillText(nm, colX, 128);

  // LEVEL -- still the one number that reads at thumbnail size
  const lvY = 236;
  c.font = '600 19px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.dim;
  c.fillText('LEVEL', colX, lvY - 84);
  const lvTxt = String(stats.level ?? 1);
  c.font = '700 106px "Silkscreen", Consolas, monospace';
  c.fillStyle = '#00000066';
  c.fillText(lvTxt, colX + 4, lvY + 4);
  const lg = c.createLinearGradient(colX, lvY - 78, colX, lvY + 8);
  lg.addColorStop(0, theme.accent2);
  lg.addColorStop(1, theme.accent);
  c.fillStyle = lg;
  c.fillText(lvTxt, colX, lvY);

  // CLASS -- beside the level, reading up its right-hand side
  const clsX = colX + c.measureText(lvTxt).width + 24;
  c.font = '700 26px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.accent;
  c.fillText((cls?.name || 'Origin').toUpperCase(), clsX, lvY - 34);
  c.font = '500 15px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.dim;
  c.fillText('OF ANAVELA', clsX, lvY - 8);

  // ---- the stat strip ----------------------------------------------------
  const rows = [
    ['MONSTERS FELLED', (stats.kills ?? 0).toLocaleString()],
    ['DEEPEST FLOOR', stats.deepestFloor ? `${stats.deepestFloor} / 30  ${(stats.difficulty || '').toUpperCase()}` : 'not yet descended'],
    ['BOSSES DOWNED', String(stats.bosses ?? 0)],
    ['INDEX', `${stats.indexFound ?? 0} / ${stats.indexTotal ?? 200}`],
  ];
  let sy = lvY + 62;
  for (const [k, v] of rows) {
    c.font = '500 16px "Silkscreen", Consolas, monospace';
    c.fillStyle = theme.dim;
    c.fillText(k, colX, sy);
    const labelW = c.measureText(k).width;
    // the value is right-aligned to the same margin as everything else, and
    // shrinks if a long one ("18 / 30 MEDIUM") would reach back to the label
    let vs = 24;
    for (;;) {
      c.font = '700 ' + vs + 'px "Silkscreen", Consolas, monospace';
      if (c.measureText(v).width < colW - labelW - 28 || vs <= 13) break;
      vs -= 1;
    }
    c.fillStyle = theme.ink;
    c.textAlign = 'right';
    c.fillText(v, colR, sy + 1);
    c.textAlign = 'left';
    c.strokeStyle = theme.ink + '1e';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(colX, sy + 14.5); c.lineTo(colR, sy + 14.5); c.stroke();
    sy += 46;
  }

  // ---- the player's own line --------------------------------------------
  if (stats.message) {
    const msg = String(stats.message).slice(0, 64);
    const quoted = '“' + msg + '”';
    let ms = 22;
    for (;;) {
      c.font = 'italic ' + ms + 'px Georgia, serif';
      if (c.measureText(quoted).width <= colW || ms <= 12) break;
      ms -= 1;
    }
    c.fillStyle = theme.accent2;
    c.fillText(quoted, colX, sy + 14);
  }

  // ---- frame + footer ----------------------------------------------------
  c.strokeStyle = theme.accent + '99'; c.lineWidth = 3;
  roundRect(c, 14, 14, CARD_W - 28, CARD_H - 28, 6); c.stroke();
  c.strokeStyle = theme.accent + '33'; c.lineWidth = 1;
  roundRect(c, 24, 24, CARD_W - 48, CARD_H - 48, 4); c.stroke();

  c.font = '600 18px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.accent;
  c.textAlign = 'left';
  c.fillText('SEMESTA', 84, CARD_H - 38);
  c.font = '500 14px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.dim;
  c.fillText(theme.name, 84, CARD_H - 18);
  c.textAlign = 'right';
  c.fillText('semesta-gray.vercel.app', colR, CARD_H - 18);
  c.font = '600 16px "Silkscreen", Consolas, monospace';
  c.fillStyle = theme.ink;
  c.fillText('ANAVELA UNIVERSE', colR, CARD_H - 38);
  c.textAlign = 'left';

  return cv;
}

/** The line that goes in the tweet. Kept short so the card is the content. */
export function shareText(stats) {
  const bits = [`Lv ${stats.level ?? 1} ${(CLASSES[stats.cls]?.name || 'Origin')}`];
  if (stats.kills) bits.push(`${stats.kills.toLocaleString()} monsters felled`);
  if (stats.deepestFloor) bits.push(`Hollow floor ${stats.deepestFloor}`);
  return `${stats.name || 'My hero'} — ${bits.join(' · ')} in #Semesta ☀️\n\nPlay free: https://semesta-gray.vercel.app/`;
}
