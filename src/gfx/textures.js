// All of Semesta's pixel art is generated here (16px canvas, nearest-neighbor).
// Palette is locked for a consistent cozy 2.5D look: lush spring greens,
// warm earth, clear turquoise water (Stardew-inspired, NOT minecraft-y).
import * as THREE from 'three';
import { mulberry32 } from '../util/noise.js';
import { ITEMS } from '../systems/items.js';

export const PALETTE = {
  grass: ['#6aa84f', '#74b258', '#5f9a46', '#7fbd62'],
  grassBright: '#a4d96a',
  moss: '#568a42',
  dirt: ['#9a7355', '#a67d5e', '#8a654a'],
  dirtDark: '#6a4d38',
  path: ['#c2a26a', '#cdad78', '#b3925c'],
  stone: ['#8d9294', '#9aa0a2', '#7d8284'],
  stoneDark: '#646a6c',
  bark: '#5a4432',
  barkLight: '#6e5540',
  leaf: '#3e7d47',
  leafDark: '#336a3c',
  leafLight: '#4f9857',
  water: '#41a0c8',
  waterDeep: '#2f7fa6',
  foam: '#d8f0f4',
  torchWood: '#5a4432',
  flame: ['#ffdd55', '#ffaa33', '#ff7722'],
  flowers: ['#f0e05a', '#e87a9a', '#8a9ae8', '#f0f0f0', '#f0a04a'],
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(cnv, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(cnv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// Draw a sprite from a string map; legend: char -> color ('.' = transparent)
export function drawMap(ctx, map, legend, ox = 0, oy = 0) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = legend[ch];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function noisyFill(ctx, x0, y0, w, h, colors, rng, speckle = 0.35) {
  ctx.fillStyle = colors[0];
  ctx.fillRect(x0, y0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rng() < speckle) {
        ctx.fillStyle = colors[1 + Math.floor(rng() * (colors.length - 1))];
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
  }
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * (1 + amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * (1 + amt)));
  const b = Math.max(0, Math.min(255, (n & 255) * (1 + amt)));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ---------------------------------------------------------------------------
// TERRAIN BLOCK ATLAS — 4x4 tile grid @16px
// ---------------------------------------------------------------------------
export const TILE = {
  GRASS_A: 0, GRASS_B: 1, GRASS_C: 2, PATH: 3,
  DIRT: 4, STONE: 5, GRASS_SIDE: 6, DIRT_SIDE: 7,
  STONE_SIDE: 8, PATH_SIDE: 9, MOSS: 10, SHORE: 11,
  FLOWER_A: 12, FLOWER_B: 13, PATH_EDGE: 14, SNOW: 15,
  PLAZA: 16,
};
const ATLAS_GRID = 5, TILE_PX = 16;

export function makeTerrainAtlas() {
  const rng = mulberry32(1337);
  const c = canvas(ATLAS_GRID * TILE_PX, ATLAS_GRID * TILE_PX);
  const ctx = c.getContext('2d');

  const at = (i) => [(i % ATLAS_GRID) * TILE_PX, Math.floor(i / ATLAS_GRID) * TILE_PX];

  // 3 grass variants — calm base with sparse blade details (flat Stardew read)
  for (const [ti, base] of [[TILE.GRASS_A, 0], [TILE.GRASS_B, 1], [TILE.GRASS_C, 2]]) {
    const [x, y] = at(ti);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.grass[base], PALETTE.grass[(base + 1) % 4], PALETTE.grass[(base + 2) % 4]], rng, 0.22);
    for (let i = 0; i < 4; i++) { // little 2px blades
      ctx.fillStyle = PALETTE.grassBright;
      const gx = x + Math.floor(rng() * 15), gy = y + 1 + Math.floor(rng() * 14);
      ctx.fillRect(gx, gy, 1, 2);
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = PALETTE.moss;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 1, 1);
    }
  }
  { // footpath — calm warm sand, sparse pebbles (Stardew-ish, not noisy)
    const [x, y] = at(TILE.PATH);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.path[0], PALETTE.path[1], PALETTE.path[2]], rng, 0.22);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? PALETTE.stone[1] : PALETTE.path[2];
      ctx.fillRect(x + 1 + Math.floor(rng() * 13), y + 1 + Math.floor(rng() * 13), 2, 1);
    }
  }
  { // path edge — sandy middle melting into grass fringe (soft border ring)
    const [x, y] = at(TILE.PATH_EDGE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.path[0], PALETTE.path[1], PALETTE.path[2]], rng, 0.2);
    // grass creeping in from the rim
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = PALETTE.grass[Math.floor(rng() * 3)];
      const edge = Math.floor(rng() * 4);
      const t = Math.floor(rng() * 16);
      const d = rng() < 0.55 ? 0 : 1;
      if (edge === 0) ctx.fillRect(x + t, y + d, 1, 1 + Math.floor(rng() * 2));
      else if (edge === 1) ctx.fillRect(x + t, y + 15 - d, 1, 1);
      else if (edge === 2) ctx.fillRect(x + d, y + t, 1 + Math.floor(rng() * 2), 1);
      else ctx.fillRect(x + 15 - d, y + t, 1, 1);
    }
    // rounded corner nibbles
    for (const [cx2, cy2] of [[0, 0], [15, 0], [0, 15], [15, 15]]) {
      ctx.fillStyle = PALETTE.grass[0];
      ctx.fillRect(x + cx2, y + cy2, 1, 1);
    }
  }
  { const [x, y] = at(TILE.DIRT);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[0], ...PALETTE.dirt, PALETTE.dirtDark], rng, 0.4); }
  { const [x, y] = at(TILE.STONE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.stone[0], ...PALETTE.stone, PALETTE.stoneDark], rng, 0.35);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x + 3, y + 5, 6, 1); ctx.fillRect(x + 9, y + 11, 5, 1); }
  { // grass side: dirt + green lip on top
    const [x, y] = at(TILE.GRASS_SIDE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[2], ...PALETTE.dirt, PALETTE.dirtDark], rng, 0.4);
    noisyFill(ctx, x, y, 16, 3, [PALETTE.grass[0], ...PALETTE.grass], rng, 0.5);
    for (let i = 0; i < 8; i++) { // hanging grass
      const gx = Math.floor(rng() * 16);
      ctx.fillStyle = PALETTE.moss;
      ctx.fillRect(x + gx, y + 3, 1, 1 + Math.floor(rng() * 2));
    }
  }
  { const [x, y] = at(TILE.DIRT_SIDE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[2], PALETTE.dirtDark, PALETTE.dirt[0]], rng, 0.45); }
  { const [x, y] = at(TILE.STONE_SIDE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.stone[2], ...PALETTE.stone, PALETTE.stoneDark], rng, 0.4);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x, y + 7, 16, 1); }
  { const [x, y] = at(TILE.PATH_SIDE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[2], ...PALETTE.dirt, PALETTE.dirtDark], rng, 0.4);
    noisyFill(ctx, x, y, 16, 2, [PALETTE.path[2], PALETTE.path[0]], rng, 0.5); }
  { const [x, y] = at(TILE.MOSS);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.moss, PALETTE.grass[2], PALETTE.leafDark, PALETTE.grass[0]], rng, 0.5); }
  { // wet shore edge
    const [x, y] = at(TILE.SHORE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirtDark, PALETTE.dirt[2], '#5c4436'], rng, 0.4); }
  { // fresh snow — soft white with pale blue shading and sparkles
    const [x, y] = at(TILE.SNOW);
    noisyFill(ctx, x, y, 16, 16, ['#eef4f8', '#e2ecf4', '#f6fafc'], rng, 0.2);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#cddeee';
      ctx.fillRect(x + Math.floor(rng() * 15), y + Math.floor(rng() * 15), 2, 1);
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 1, 1);
    }
  }
  { // town plaza — warm terracotta pavers with dark grout (cozy scalloped read)
    const [x, y] = at(TILE.PLAZA);
    ctx.fillStyle = '#6a4438';
    ctx.fillRect(x, y, 16, 16);
    const pavers = ['#b06a52', '#bd7860', '#a35c48'];
    for (let r = 0; r < 4; r++) {
      const ox = (r % 2) * 2;
      for (let q = 0; q < 5; q++) {
        const px = q * 4 + ox - 2;
        const w = Math.min(3, 16 - Math.max(0, px)) - (px < 0 ? -px : 0);
        if (w <= 0) continue;
        const sx2 = x + Math.max(0, px);
        ctx.fillStyle = pavers[(r + q) % 3];
        ctx.fillRect(sx2, y + r * 4, Math.min(w, 3), 3);
        ctx.fillStyle = 'rgba(255,232,205,0.28)';
        ctx.fillRect(sx2, y + r * 4, Math.min(w, 3), 1);
      }
    }
  }
  // flowery grass variants
  for (const [ti, seedOff] of [[TILE.FLOWER_A, 0], [TILE.FLOWER_B, 3]]) {
    const [x, y] = at(ti);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.grass[1], ...PALETTE.grass, PALETTE.moss], rng, 0.5);
    for (let i = 0; i < 3; i++) {
      const fx = 2 + Math.floor(rng() * 12), fy = 2 + Math.floor(rng() * 12);
      const col = PALETTE.flowers[(i + seedOff) % PALETTE.flowers.length];
      ctx.fillStyle = col;
      ctx.fillRect(x + fx - 1, y + fy, 1, 1); ctx.fillRect(x + fx + 1, y + fy, 1, 1);
      ctx.fillRect(x + fx, y + fy - 1, 1, 1); ctx.fillRect(x + fx, y + fy + 1, 1, 1);
      ctx.fillStyle = '#f5e88a';
      ctx.fillRect(x + fx, y + fy, 1, 1);
    }
  }

  const texture = toTexture(c);
  const uv = (i) => {
    const [x, y] = at(i);
    return {
      u0: x / c.width, v0: 1 - (y + TILE_PX) / c.height,
      u1: (x + TILE_PX) / c.width, v1: 1 - y / c.height,
    };
  };
  return { texture, uv };
}

// ---------------------------------------------------------------------------
// DECOR TEXTURES
// ---------------------------------------------------------------------------
export function makeBarkTexture() {
  const rng = mulberry32(77);
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  noisyFill(ctx, 0, 0, 16, 16, [PALETTE.bark, PALETTE.barkLight, '#4a3626'], rng, 0.4);
  ctx.fillStyle = '#42311f';
  ctx.fillRect(4, 0, 1, 16); ctx.fillRect(11, 0, 1, 16);
  return toTexture(c, { repeat: true });
}

export function makeLeafTexture() {
  const rng = mulberry32(88);
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  noisyFill(ctx, 0, 0, 16, 16, [PALETTE.leaf, PALETTE.leafDark, PALETTE.leafLight, PALETTE.leafDark], rng, 0.55);
  // occasional bright leaf sparkle
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#66b06a';
    ctx.fillRect(Math.floor(rng() * 16), Math.floor(rng() * 16), 1, 1);
  }
  return toTexture(c, { repeat: true });
}

export function makeGrassTuftTexture() {
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  drawMap(ctx, [
    '................',
    '......G.........',
    '..g...G....g....',
    '..g..gG....g..G.',
    '.gG..gg...gg..G.',
    '.gG.ggg...gg.gG.',
    '.ggg.gg..ggg.gg.',
    '..gg.ggg.gg.ggg.',
    '..ggggggggggggg.',
    '...ggggggggggg..',
  ], { g: PALETTE.grassBright, G: PALETTE.moss }, 0, 6);
  return toTexture(c);
}

export function makeFlowerTexture(color) {
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  drawMap(ctx, [
    '................',
    '.....ff..ff.....',
    '....ffFFFFff....',
    '.....fFyyFf.....',
    '....ffFFFFff....',
    '.....ff..ff.....',
    '.......ss.......',
    '.......ss.......',
    '....gg.ss.......',
    '.....ggss.......',
    '.......ss.......',
  ], { f: color, F: shade(color, 0.25), y: '#f5e88a', s: '#4f9857', g: '#66b06a' }, 0, 3);
  return toTexture(c);
}

export function makeFlameTexture(frame = 0) {
  const c = canvas(8, 12);
  const ctx = c.getContext('2d');
  const maps = [
    ['...yy...', '..yyyy..', '..yooy..', '.yooooy.', '.yorroy.', '..oro...'],
    ['...yy...', '..yyy...', '.yyooy..', '.yoooy..', '.yorry..', '...ro...'],
  ];
  drawMap(ctx, maps[frame % 2], { y: PALETTE.flame[0], o: PALETTE.flame[1], r: PALETTE.flame[2] }, 0, 3);
  return toTexture(c);
}

export function makeWaterNoiseTexture() {
  const rng = mulberry32(555);
  const c = canvas(64, 64);
  const ctx = c.getContext('2d');
  noisyFill(ctx, 0, 0, 64, 64, [PALETTE.water, PALETTE.waterDeep, '#54b0d4', PALETTE.water], rng, 0.4);
  for (let i = 0; i < 30; i++) { // sparkle
    ctx.fillStyle = 'rgba(225,245,250,0.55)';
    ctx.fillRect(Math.floor(rng() * 62), Math.floor(rng() * 63), 2, 1);
  }
  return toTexture(c, { repeat: true });
}

// ---------------------------------------------------------------------------
// CHARACTER FACE — 16x16, big expressive pixel eyes (Stardew-ish, not blocky)
// ---------------------------------------------------------------------------
export function makePlayerFaceTexture(skin, hair, eyeColor, female = false, bald = false, accessory = 0) {
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  const px = (x, y, w = 1, h = 1, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

  // base skin
  px(0, 0, 16, 16, skin);
  // subtle cheek/jaw shading
  px(0, 13, 16, 3, shade(skin, -0.08));

  // hair fringe (top of face texture) unless bald
  if (!bald) {
    px(0, 0, 16, 3, hair);
    px(0, 3, 3, 2, hair); px(13, 3, 3, 2, hair);
    // zig-zag fringe
    px(4, 3, 2, 1, hair); px(7, 3, 2, 2, hair); px(11, 3, 1, 1, hair);
    px(3, 4, 1, 1, shade(hair, -0.2)); px(12, 4, 1, 1, shade(hair, -0.2));
  } else {
    px(0, 0, 16, 2, shade(skin, 0.06));
  }

  // brows
  const brow = bald ? shade(skin, -0.35) : shade(hair, -0.25);
  px(3, 6, 3, 1, brow); px(10, 6, 3, 1, brow);

  // eyes — 3 wide x 4 tall, dark lash line, colored iris, white highlight
  const drawEye = (ex) => {
    px(ex, 7, 3, 1, '#2b2620');            // lash line
    px(ex, 8, 3, 2, eyeColor);             // iris
    px(ex, 10, 3, 1, shade(eyeColor, -0.4)); // lower iris shadow
    px(ex, 8, 1, 1, '#ffffff');            // highlight
    if (female) { px(ex - 1, 7, 1, 1, '#2b2620'); px(ex + 3, 7, 1, 1, '#2b2620'); } // lashes
  };
  drawEye(3); drawEye(10);

  // tiny nose shade
  px(8, 11, 1, 1, shade(skin, -0.18));

  // mouth — soft smile
  px(6, 13, 1, 1, shade(skin, -0.3));
  px(7, 13, 2, 1, shade(skin, -0.35));
  px(9, 13, 1, 1, shade(skin, -0.3));

  // blush
  if (female) { px(1, 11, 2, 1, 'rgba(232,120,120,0.55)'); px(13, 11, 2, 1, 'rgba(232,120,120,0.55)'); }

  // face accessories: 1 freckles, 2 blush, 3 scar, 4 glasses, 5 eyepatch
  if (accessory === 1) {
    for (const [fx, fy] of [[2, 11], [4, 12], [12, 12], [14, 11], [7, 11]]) px(fx, fy, 1, 1, shade(skin, -0.25));
  } else if (accessory === 2) {
    px(1, 11, 3, 2, 'rgba(238,120,120,0.6)'); px(12, 11, 3, 2, 'rgba(238,120,120,0.6)');
  } else if (accessory === 3) {
    px(11, 5, 1, 1, '#a05a4a'); px(12, 6, 1, 3, '#a05a4a'); px(11, 9, 1, 2, '#a05a4a');
  } else if (accessory === 4) {
    px(2, 7, 5, 1, '#3a3630'); px(9, 7, 5, 1, '#3a3630');
    px(2, 7, 1, 4, '#3a3630'); px(6, 7, 1, 4, '#3a3630'); px(9, 7, 1, 4, '#3a3630'); px(13, 7, 1, 4, '#3a3630');
    px(2, 10, 5, 1, '#3a3630'); px(9, 10, 5, 1, '#3a3630'); px(7, 8, 2, 1, '#3a3630');
  } else if (accessory === 5) {
    px(9, 6, 5, 1, '#2a2620'); px(9, 7, 5, 4, '#2a2620'); px(0, 5, 10, 1, '#2a2620');
  } else if (accessory === 6) {           // round specs: thin gold rims
    px(2, 7, 4, 1, '#c8a03a'); px(10, 7, 4, 1, '#c8a03a');
    px(2, 10, 4, 1, '#c8a03a'); px(10, 10, 4, 1, '#c8a03a');
    px(1, 8, 1, 2, '#c8a03a'); px(6, 8, 1, 2, '#c8a03a');
    px(9, 8, 1, 2, '#c8a03a'); px(14, 8, 1, 2, '#c8a03a');
    px(7, 8, 2, 1, '#c8a03a');
  } else if (accessory === 7) {           // monocle: one lens on a chain
    px(9, 6, 5, 1, '#c8a03a'); px(9, 11, 5, 1, '#c8a03a');
    px(8, 7, 1, 4, '#c8a03a'); px(14, 7, 1, 4, '#c8a03a');
    px(14, 12, 1, 1, '#c8a03a'); px(13, 13, 1, 1, '#c8a03a');
  } else if (accessory === 8) {           // warpaint: a band across the eyes
    px(0, 7, 16, 1, 'rgba(200,60,50,0.75)');
    px(0, 8, 16, 1, 'rgba(200,60,50,0.4)');
    px(3, 12, 2, 1, 'rgba(200,60,50,0.6)'); px(11, 12, 2, 1, 'rgba(200,60,50,0.6)');
  } else if (accessory === 9) {           // beauty mark
    px(11, 11, 1, 1, '#4a3428');
  } else if (accessory === 10) {          // bandage across the cheek
    px(9, 10, 5, 2, '#f0ece0');
    px(10, 10, 1, 2, '#d8d2c2'); px(12, 10, 1, 2, '#d8d2c2');
  } else if (accessory === 11) {          // tired eyes: shadows underneath
    px(2, 11, 4, 1, 'rgba(90,70,110,0.45)'); px(10, 11, 4, 1, 'rgba(90,70,110,0.45)');
  } else if (accessory === 12) {          // a small star under one eye
    px(11, 11, 1, 1, '#ffd23e'); px(10, 12, 3, 1, '#ffd23e'); px(11, 13, 1, 1, '#ffd23e');
  } else if (accessory === 13) {          // whiskers
    px(0, 9, 3, 1, shade(skin, -0.35)); px(0, 11, 3, 1, shade(skin, -0.35));
    px(13, 9, 3, 1, shade(skin, -0.35)); px(13, 11, 3, 1, shade(skin, -0.35));
  }

  return toTexture(c);
}

// ---------------------------------------------------------------------------
// CRITTER FACE — big glossy eyes for enemies & pets (Pokemon/Pokopia vibe).
// Drawn on a transparent 16x12 canvas, used as a plane overlay on the body.
// ---------------------------------------------------------------------------
export function makeCritterFaceTexture(opts = {}) {
  const {
    eyeW = 3, eyeH = 4, gap = 6, eyeY = 2,
    eye = '#26221e', mouth = 'smile', mouthColor = '#26221e',
    cheeks = null, angry = false,
  } = opts;
  const c = canvas(16, 12);
  const ctx = c.getContext('2d');
  const px = (x, y, w = 1, h = 1, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

  const exL = 8 - Math.floor(gap / 2) - eyeW;
  const exR = 8 + Math.ceil(gap / 2);
  for (const ex of [exL, exR]) {
    px(ex, eyeY, eyeW, eyeH, eye);
    px(ex, eyeY, Math.max(1, eyeW - 2), Math.max(1, Math.floor(eyeH / 2) - 1) || 1, '#ffffff'); // big highlight
    px(ex + eyeW - 1, eyeY + eyeH - 2, 1, 1, 'rgba(255,255,255,0.7)'); // lower shine
    if (angry) px(ex - 1 + (ex === exR ? 0 : 0), eyeY - 1, eyeW + 1, 1, eye);
  }
  const my = eyeY + eyeH + 1;
  if (mouth === 'smile') {
    px(6, my, 1, 1, mouthColor); px(7, my + 1, 2, 1, mouthColor); px(9, my, 1, 1, mouthColor);
  } else if (mouth === 'open') {
    px(7, my, 2, 2, mouthColor);
    px(7, my + 1, 2, 1, '#c86a6a');
  } else if (mouth === 'fang') {
    px(6, my, 4, 1, mouthColor);
    px(6, my + 1, 1, 1, '#ffffff'); px(9, my + 1, 1, 1, '#ffffff');
  } else if (mouth === 'w') { // cat mouth
    px(6, my, 1, 1, mouthColor); px(8, my, 1, 1, mouthColor);
    px(7, my + 1, 1, 1, mouthColor); px(9, my + 1, 1, 1, mouthColor);
  }
  if (cheeks) {
    px(exL - 2, eyeY + eyeH - 1, 2, 1, cheeks);
    px(exR + eyeW, eyeY + eyeH - 1, 2, 1, cheeks);
  }
  return toTexture(c);
}

// ---------------------------------------------------------------------------
// ITEM ICONS 16x16 — used by HUD (dataURL) & 3D drops (texture)
// ---------------------------------------------------------------------------
const ICON_MAPS = {
  slime_gel: {
    map: [
      '................',
      '................',
      '.....gggg.......',
      '...gggggggg.....',
      '..gGGggggggg....',
      '..gGgggggggg....',
      '.ggggggggggggg..',
      '.ggggggggggggg..',
      '.gggggggggggggg.',
      '..gggggggggggg..',
      '...gggggggggg...',
      '................',
    ],
    legend: { g: '#5fd08a', G: '#a9f0c3' },
  },
  chitin_shell: {
    map: [
      '................',
      '.....bbbbb......',
      '...bbBBBBBbb....',
      '..bBBbBBbBBb....',
      '..bBBbBBbBBbb...',
      '.bBBBbBBbBBBb...',
      '.bBBBbBBbBBBb...',
      '.bbBBbBBbBBbb...',
      '..bbBBBBBBbb....',
      '...bbbbbbbb.....',
      '................',
    ],
    legend: { b: '#4a3526', B: '#7a5c3d' },
  },
  small_bone: {
    map: [
      '................',
      '..ww............',
      '.wWWw...........',
      '.wWWww..........',
      '..wwWWw.........',
      '....wWWw........',
      '.....wWWw.......',
      '......wWWww.....',
      '.......wwWWw....',
      '........wWWWw...',
      '.........wWw....',
      '..........w.....',
    ],
    legend: { w: '#c9c2ae', W: '#efe9d6' },
  },
  feather: {
    map: [
      '................',
      '..........ff....',
      '.........fFFf...',
      '........fFFFf...',
      '.......fFFFf....',
      '......fFFFf.....',
      '.....fFFFf......',
      '....fFFf........',
      '...fFf..........',
      '..ff............',
      '.f..............',
    ],
    legend: { f: '#7f95a8', F: '#c3d4e2' },
  },
  nibbit_beak: {
    map: [
      '................',
      '................',
      '....oo..........',
      '....oOoo........',
      '.....oOOoo......',
      '......oOOOoo....',
      '.......oOOOOo...',
      '........ooooo...',
      '................',
    ],
    legend: { o: '#b8762a', O: '#e8a33d' },
  },
  green_herb: {
    map: [
      '................',
      '....g...g.......',
      '...gGg.gGg......',
      '...gGggggGg.....',
      '....gGgGg.......',
      '.....ggg....g...',
      '.....gg....gGg..',
      '.....gg...gGg...',
      '.....gg..gg.....',
      '.....gggg.......',
      '......gg........',
    ],
    legend: { g: '#3f7d3a', G: '#6fbf55' },
  },
  wheat_seed: {
    map: [
      '................',
      '......y.........',
      '.....yYy...y....',
      '.....yYy..yYy...',
      '......y...yYy...',
      '....y......y....',
      '...yYy..y.......',
      '...yYy.yYy......',
      '....y..yYy......',
      '........y.......',
    ],
    legend: { y: '#a8862f', Y: '#e0c05a' },
  },
  hardwood: {
    map: [
      '................',
      '..bbbbbbbbbbb...',
      '.bBBBbbBBBBBbb..',
      '.bBBbbbbBBBBbb..',
      '.bbbBBBbbbbbbb..',
      '.bBBBBBbbBBBbb..',
      '.bBBbbbbbBBBbb..',
      '..bbbbbbbbbbb...',
      '................',
    ],
    legend: { b: '#4d3a28', B: '#6e5438' },
  },
  tonic: {
    map: [
      '................',
      '......ww........',
      '......ww........',
      '.....gggg.......',
      '....gGGGGg......',
      '...gGrrrrGg.....',
      '...gGrRRrGg.....',
      '...gGrrrrGg.....',
      '....gGGGGg......',
      '.....gggg.......',
      '................',
    ],
    legend: { w: '#c9c2ae', g: '#8fb8c9', G: '#b8d8e5', r: '#c94f4f', R: '#e87a7a' },
  },
  spore_sac: {
    map: [
      '................',
      '.....mmmm.......',
      '...mmMMMMmm.....',
      '..mMMmMMmMMm....',
      '..mmMMMMMMmm....',
      '...mmmmmmmm.....',
      '.....ssss.......',
      '.....ssss.......',
      '....ssssss......',
      '................',
    ],
    legend: { m: '#9a5a7a', M: '#c98aa8', s: '#d8cfa8' },
  },
  boar_tusk: {
    map: [
      '................',
      '..w.............',
      '..ww............',
      '...wWw..........',
      '...wWWw.........',
      '....wWWww.......',
      '.....wWWWww.....',
      '......wwWWWww...',
      '........wwWWw...',
      '..........ww....',
      '................',
    ],
    legend: { w: '#c9bfa0', W: '#f0e8d0' },
  },
  wisp_essence: {
    map: [
      '................',
      '.......e........',
      '.....eeEee......',
      '....eEEEEEe.....',
      '....eEEWEEe.....',
      '...eEEWWWEEe....',
      '....eEEWEEe.....',
      '....eEEEEEe.....',
      '.....eeEee......',
      '.......e........',
      '................',
    ],
    legend: { e: '#7ab8d8', E: '#aee0f0', W: '#ffffff' },
  },
  frost_shard: {
    map: [
      '................',
      '.......w........',
      '......wWi.......',
      '.....wWWii......',
      '.....wWWii......',
      '....wWWWiii.....',
      '....wWWiiii.....',
      '.....wWiii......',
      '......wii.......',
      '.......i........',
      '................',
    ],
    legend: { w: '#ffffff', W: '#dff4ff', i: '#9ecfe8' },
  },
  static_fluff: {
    map: [
      '................',
      '.....ffFf.......',
      '....fFFFFf......',
      '...fFFyFFFf.....',
      '...fFyyYFFf.....',
      '...fFFYyFFf.....',
      '....fFFyFf......',
      '.....ffFf.......',
      '................',
    ],
    legend: { f: '#d0a840', F: '#f0d060', y: '#fff2a0', Y: '#ffffff' },
  },
  soft_plume: {
    map: [
      '................',
      '.........p......',
      '.......pPP......',
      '......pPPp......',
      '.....pPPPp......',
      '....pPPPp.......',
      '....pPPp........',
      '...dPPp.........',
      '...dd...........',
      '................',
    ],
    legend: { p: '#8a7aa8', P: '#b8a8cc', d: '#6a5a88' },
  },
  golem_core: {
    map: [
      '................',
      '....ssssss......',
      '...sSSSSSSs.....',
      '..sSSooOOSSs....',
      '..sSoOOOOoSs....',
      '..sSoOOOOoSs....',
      '..sSSooOOSSs....',
      '...sSSSSSSs.....',
      '....ssssss......',
      '................',
    ],
    legend: { s: '#575c58', S: '#7b807c', o: '#c97a2e', O: '#f0a848' },
  },
  forge_stone: {
    map: [
      '................',
      '.....ffff.......',
      '...ffFFFFff.....',
      '..fFFoOOoFFf....',
      '..fFFOooOFFf....',
      '..fFFoOOoFFf....',
      '...ffFFFFff.....',
      '.....ffff.......',
      '................',
    ],
    legend: { f: '#4a4a52', F: '#6a6a72', o: '#e8742e', O: '#ffb055' },
  },
  fish_minnow: {
    map: [
      '................',
      '................',
      '......bbbb......',
      '..b..bBBBBb.....',
      '..bb bBeBBBb....',
      '..bbbBBBBBBb....',
      '..bbbBBBBBb.....',
      '..b..bBBBb......',
      '......bbb.......',
      '................',
    ],
    legend: { b: '#5a8a6a', B: '#8ab89a', e: '#26221e' },
  },
  fish_perch: {
    map: [
      '................',
      '................',
      '......oooo......',
      '..o..oOOOOo.....',
      '..oo oOeOOOo....',
      '..oooOOOOOOo....',
      '..oooOOOOOo.....',
      '..o..oOOOo......',
      '......ooo.......',
      '................',
    ],
    legend: { o: '#c87840', O: '#f0a868', e: '#26221e' },
  },
  iron_ore: {
    map: [
      '................',
      '.....ssss.......',
      '...ssSSSSss.....',
      '..sSSiiSSSSs....',
      '..sSiISSiiSs....',
      '..sSSSiISSSs....',
      '..sSiiSSSiSs....',
      '...ssSSSSss.....',
      '.....ssss.......',
      '................',
    ],
    legend: { s: '#4a4e52', S: '#6a6e72', i: '#a8b8c8', I: '#d8e4ec' },
  },
  crop_wheat: {
    map: [
      '................',
      '....y..Y..y.....',
      '...yYy.yY.yYy...',
      '...yYy.Yy.yYy...',
      '....Y..yY..Y....',
      '....y..Y...y....',
      '.....s.s..s.....',
      '.....s.s.s......',
      '......sss.......',
      '.......s........',
      '......sss.......',
    ],
    legend: { y: '#d8b23a', Y: '#f0d05a', s: '#a8862f' },
  },
  crop_berry: {
    map: [
      '................',
      '......gg........',
      '.....gGg........',
      '....rr.gg.rr....',
      '...rRRr..rRRr...',
      '...rRrr..rRrr...',
      '....rr.rr.rr....',
      '......rRRr......',
      '......rRrr......',
      '.......rr.......',
      '................',
    ],
    legend: { r: '#c83a4a', R: '#f06a7a', g: '#4f9857', G: '#6fbf55' },
  },
  crop_pumpkin: {
    map: [
      '................',
      '.......ss.......',
      '......sgs.......',
      '....ooOOoo......',
      '..ooOOOOOOoo....',
      '..oOOoOOoOOo....',
      '..oOOoOOoOOo....',
      '..ooOOOOOOoo....',
      '...ooooooo......',
      '................',
    ],
    legend: { o: '#c86a2a', O: '#f0923a', s: '#6a4a30', g: '#4f9857' },
  },
  grilled_minnow: {
    map: [
      '................',
      '..w.............',
      '...w....bbbb....',
      '....w..bBBBBb...',
      '.....wbBeBBBb...',
      '.....wBBBBBb....',
      '....w..bBBb.....',
      '...w....bb......',
      '................',
    ],
    legend: { b: '#8a5a3a', B: '#c8863a', e: '#26221e', w: '#8a6a48' },
  },
  perch_dinner: {
    map: [
      '................',
      '....pppppppp....',
      '..pPPPPPPPPPPp..',
      '.pPooOOooGGgPp..',
      '.pPoOOOOoGggPp..',
      '..pPPPPPPPPPPp..',
      '....pppppppp....',
      '................',
    ],
    legend: { p: '#c9c2ae', P: '#efe9d6', o: '#c8863a', O: '#f0a868', G: '#6fbf55', g: '#4f9857' },
  },
  koi_feast: {
    map: [
      '................',
      '......yy.yy.....',
      '...bbbbbbbbbb...',
      '..bBgGGoOOgGBb..',
      '..bBGgOOOoGgBb..',
      '..bBBBBBBBBBBb..',
      '...bbbbbbbbbb...',
      '.....bbbbbb.....',
      '................',
    ],
    legend: { b: '#8a5a3a', B: '#b0794a', o: '#f0c05a', O: '#f5d88a', G: '#6fbf55', g: '#4f9857', y: '#ffe27a' },
  },
  fish_koi: {
    map: [
      '................',
      '................',
      '......gggg......',
      '..g..gGGGGg.....',
      '..gg gGeGGWg....',
      '..gggGGWWGGg....',
      '..gggGGGGGg.....',
      '..g..gGGGg......',
      '......ggg.......',
      '................',
    ],
    legend: { g: '#d8a028', G: '#f5c84a', W: '#ffffff', e: '#26221e' },
  },
};

// FISH ICONS, generated. Every fish shares one silhouette and differs by palette
// and by a couple of accent pixels, so writing fourteen 16x16 maps by hand would
// be fourteen chances to typo the same picture. The shape below is the minnow's;
// `fin` adds a dorsal ridge and `spot` a flank marking, which is enough to tell
// a snapper from a trout at icon size.
const FISH_BODY = [
  '................',
  '................',
  '......bbbb......',
  '..b..bBBBBb.....',
  '..bb bBeBBBb....',
  '..bbbBBBBBBb....',
  '..bbbBBBBBb.....',
  '..b..bBBBb......',
  '......bbb.......',
  '................',
];
const FISH_LOOKS = {
  fish_bitterling: ['#6a7a9a', '#a8b8d0'],
  fish_sardine:    ['#8a94a0', '#d0d8e0'],
  fish_mackerel:   ['#2f5a7a', '#7fb0c8', 'fin'],
  fish_catfish:    ['#4a4030', '#8a7a58', 'fin'],
  fish_snapper:    ['#a8322f', '#e8746a', 'spot'],
  fish_trout:      ['#5a6a3a', '#9fbc72', 'spot'],
  fish_icefin:     ['#4a86a8', '#c8ecf8', 'fin'],
  fish_lantern:    ['#2a2438', '#6a5a9a', 'spot'],
  fish_sunfish:    ['#b06a10', '#ffd23e', 'fin'],
  fish_ghostcarp:  ['#5a6a78', '#dfeaf2', 'spot'],
  fish_leviathan:  ['#2a1a3a', '#9a6ad0', 'fin'],
};
for (const [id, [dark, light, extra]] of Object.entries(FISH_LOOKS)) {
  const map = FISH_BODY.slice();
  if (extra === 'fin') {
    // a dorsal ridge along the back
    map[2] = '.....fbbbbf.....';
  } else if (extra === 'spot') {
    // a darker marking on the flank
    map[5] = '..bbbBBfBBBb....';
  }
  ICON_MAPS[id] = { map, legend: { b: dark, B: light, f: dark, e: '#26221e' } };
}


export const CHARM_COLORS = {
  charm_moku: '#7ac86a',
  charm_piko: '#f0d05a',
  charm_bubbles: '#7ab8e8',
  charm_cinder: '#f08a5a',
  charm_luma: '#c8a8f0',
  charm_tuff: '#a8a29a',
  charm_flap: '#8a7ab8',
  charm_hopps: '#8ac86a',
  charm_wooly: '#f0eae0',
  charm_koko: '#f0c05a',
  charm_glimmer: '#a8d8f0',
  charm_nox: '#6a4a8a',
  charm_seraphi: '#f0d8a0',
  charm_emberling: '#f06a3a',
  charm_tideling: '#5ac8d8',
  charm_zephyr: '#c8d8f8',
  charm_verdant: '#6ad88a',
};

export const MOUNT_ICON_COLORS = {
  mount_sprig: '#8ac86a',
  mount_trotter: '#b0704a',
  mount_clucky: '#f0e8d0',
  mount_shellsworth: '#6aa86a',
  mount_nimbus: '#b8d0f0',
  mount_blossom: '#f0a8c8',
  mount_aurora: '#8ae0d8',
  mount_pebble: '#9a9a92',
};

const SEED_COLORS = {
  seed_wheat: '#f0d05a',
  seed_berry: '#f06a7a',
  seed_pumpkin: '#f0923a',
};

function paintSeedIcon(ctx, id) {
  const col = SEED_COLORS[id] || '#f0d05a';
  const px = (x, y, w = 1, h = 1, cc) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  // little seed pouch with colored seeds spilling out
  px(4, 5, 8, 8, '#a8805a');
  px(5, 6, 6, 6, '#c8a06a');
  px(5, 4, 6, 2, '#8a6a48');
  px(7, 2, 2, 2, '#6a4a30'); // tie
  for (const [sx, sy] of [[6, 8], [9, 9], [7, 10], [12, 12], [3, 13], [13, 8]]) {
    px(sx, sy, 2, 1, col);
    px(sx, sy - 1, 1, 1, col);
  }
}

function paintCoinIcon(ctx) {
  const px = (x, y, w = 1, h = 1, cc) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  px(4, 3, 8, 10, '#c8963a');
  px(3, 4, 10, 8, '#c8963a');
  px(5, 4, 6, 8, '#f0c455');
  px(4, 5, 8, 6, '#f0c455');
  px(6, 5, 2, 2, '#ffe9a8');
  px(7, 6, 2, 4, '#c8963a'); // "c" mark
  px(6, 7, 1, 2, '#a87a2a');
}

// wardrobe cosmetic icons — glyph per slot, tinted by the item's rarity color
function paintCosmeticIcon(ctx, id) {
  const def = ITEMS[id];
  const rar = def?.rarity || 'common';
  const rc = ({
    common: '#b8c4b0', uncommon: '#6fc25e', rare: '#5aa8e8',
    epic: '#b06ae8', legendary: '#f0c455', mythic: '#f05a9a',
  })[rar];
  const px = (x, y, w = 1, h = 1, cc) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  if (def.cosmetic === 'hat') {
    // wide brim + dome + rarity band
    px(2, 10, 12, 2, shade(rc, -0.35));
    px(3, 9, 10, 1, rc);
    px(5, 4, 6, 6, rc);
    px(6, 3, 4, 1, rc);
    px(5, 8, 6, 2, shade(rc, -0.3));
    px(6, 5, 2, 2, '#ffffff');
  } else if (def.cosmetic === 'back') {
    // twin wings
    for (const [ox, flip] of [[1, 1], [9, -1]]) {
      px(ox + (flip > 0 ? 0 : 2), 4, 4, 6, rc);
      px(ox + (flip > 0 ? 1 : 1), 3, 3, 1, rc);
      px(ox + (flip > 0 ? 0 : 3), 10, 3, 2, shade(rc, -0.3));
    }
    px(7, 5, 2, 6, shade(rc, -0.45));
    px(2, 5, 1, 1, '#ffffff'); px(12, 5, 1, 1, '#ffffff');
  } else { // trail
    for (const [sx, sy, s2] of [[3, 11, 2], [6, 8, 2], [9, 5, 3], [12, 2, 2]]) {
      px(sx, sy, s2, s2, rc);
      px(sx, sy, 1, 1, '#ffffff');
    }
    px(2, 13, 3, 1, shade(rc, -0.3));
  }
}

function paintWhistleIcon(ctx, id) {
  const col = MOUNT_ICON_COLORS[id] || '#b0704a';
  const px = (x, y, w = 1, h = 1, cc = col) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  // little horn-whistle with a colored band
  px(3, 8, 8, 3, '#c8a03a');
  px(10, 6, 4, 6, '#d8b866');
  px(3, 7, 3, 1, '#8a744a'); px(3, 11, 3, 1, '#8a744a');
  px(5, 8, 3, 3, col); // band = mount color
  px(1, 8, 2, 3, '#8a744a');
  px(11, 7, 2, 1, '#fff8');
}

function paintCharmIcon(ctx, id) {
  const col = CHARM_COLORS[id] || '#c8a8f0';
  const px = (x, y, w = 1, h = 1, cc = col) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  // little medallion with a paw print
  px(4, 3, 8, 10, shade(col, -0.4));
  px(5, 4, 6, 8, col);
  px(6, 5, 2, 1, '#ffffff');
  // paw
  px(7, 8, 2, 2, shade(col, -0.55));
  px(6, 7, 1, 1, shade(col, -0.55)); px(9, 7, 1, 1, shade(col, -0.55)); px(7, 6, 2, 1, shade(col, -0.55));
  // chain loop
  px(7, 1, 2, 2, '#c8b060');
}

const WEAPON_MAPS = {
  wooden_sword: {
    map: [
      '................',
      '..........ww....',
      '.........wWWw...',
      '........wWWw....',
      '.......wWWw.....',
      '......wWWw......',
      '.....wWWw.......',
      '..h.wWWw........',
      '...hhWw.........',
      '...hhh..........',
      '..hh.hh.........',
      '.hh...h.........',
    ],
    legend: { w: '#8a6b42', W: '#b08c58', h: '#5a4630' },
  },
  feather_dagger: {
    map: [
      '................',
      '...........ss...',
      '..........sSSs..',
      '.........sSSs...',
      '........sSSs....',
      '.......sSSs.....',
      '..f...sSSs......',
      '...ffhSs........',
      '...hhh..........',
      '..fh.hh.........',
      '................',
    ],
    legend: { s: '#9fb4c4', S: '#d5e4ee', h: '#5a4630', f: '#7f95a8' },
  },
  bone_blade: {
    map: [
      '................',
      '..........ww....',
      '.........wWWw...',
      '........wWWWw...',
      '.......wWWWw....',
      '......wWWWw.....',
      '.....wWWWw......',
      '..h.wWWw........',
      '...hhWw.........',
      '...hhh..........',
      '..hh.hh.........',
      '.hh...h.........',
    ],
    legend: { w: '#b5ad95', W: '#efe9d6', h: '#6e5438' },
  },
  chitin_edge: {
    map: [
      '................',
      '..........cc....',
      '.........cCCc...',
      '........cCCCc...',
      '.......cCCCc....',
      '......cCCCc.....',
      '.....cCCCc......',
      '..h.cCCc........',
      '...hhCc.........',
      '...hhh..........',
      '..hh.hh.........',
      '.hh...h.........',
    ],
    legend: { c: '#5c4630', C: '#96703f', h: '#3d2f20' },
  },
  treant_cleaver: {
    map: [
      '................',
      '.........dddd...',
      '........dDDDDd..',
      '.......dDDDDd...',
      '......dDDDDDd...',
      '.....dDDDDDd....',
      '....dDDDDDd.....',
      '...dDDDDd.......',
      '..hdDDd.........',
      '..hhh...........',
      '.hh.hh..........',
      'hh...h..........',
    ],
    legend: { d: '#3e5e46', D: '#5f8a63', h: '#4d3a28' },
  },
};

// procedural painter for bow/staff/dagger weapon icons (colors from def.blade)
function paintWeaponIcon(ctx, wdef) {
  const [dark, light] = wdef.blade;
  if (wdef.type === 'bow') {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const x = 3 + Math.round(Math.sin(t * Math.PI) * 4);
      const y = 2 + Math.round(t * 11);
      ctx.fillStyle = i % 2 ? dark : light;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#d8d8c8';
    for (let y = 3; y <= 13; y++) ctx.fillRect(3, y, 1, 1); // string
    ctx.fillStyle = light;
    for (let i = 0; i < 7; i++) ctx.fillRect(5 + i, 8, 1, 1); // arrow
    ctx.fillStyle = '#e8e8d8';
    ctx.fillRect(12, 7, 1, 1); ctx.fillRect(12, 9, 1, 1); ctx.fillRect(13, 8, 1, 1);
  } else if (wdef.type === 'staff') {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 3 ? dark : '#5a4630';
      ctx.fillRect(3 + i, 13 - i, 2, 2);
    }
    ctx.fillStyle = light;
    ctx.fillRect(11, 2, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 3, 1, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(10, 3, 1, 2); ctx.fillRect(14, 3, 1, 2); ctx.fillRect(12, 1, 1, 1); ctx.fillRect(12, 5, 1, 1);
  } else if (wdef.type === 'dagger') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = light;
      ctx.fillRect(4 + i, 3 + i, 2, 1);
      ctx.fillRect(11 - i, 3 + i, 1, 1);
      ctx.fillStyle = dark;
      ctx.fillRect(4 + i, 4 + i, 1, 1);
    }
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(9, 9, 2, 2); ctx.fillRect(4, 9, 2, 2);
    ctx.fillRect(10, 11, 2, 2); ctx.fillRect(3, 11, 2, 2);
  }
}

const iconCache = new Map();
export function makeItemIconCanvas(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const def = ICON_MAPS[id] || WEAPON_MAPS[id];
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  if (def) {
    drawMap(ctx, def.map, def.legend, 0, Math.floor((16 - def.map.length) / 2));
  } else if (id.startsWith('charm_')) {
    paintCharmIcon(ctx, id);
  } else if (id.startsWith('mount_')) {
    paintWhistleIcon(ctx, id);
  } else if (ITEMS[id]?.cosmetic) {
    paintCosmeticIcon(ctx, id);
  } else if (id.startsWith('seed_')) {
    paintSeedIcon(ctx, id);
  } else if (id === 'coin') {
    paintCoinIcon(ctx);
  } else if (ITEMS[id]?.weapon) {
    paintWeaponIcon(ctx, ITEMS[id]);
  } else {
    ctx.fillStyle = '#c05cd0'; ctx.fillRect(4, 4, 8, 8); // unknown item
  }
  iconCache.set(id, c);
  return c;
}

// --- skill icons: simple pixel-styled shapes ---
const skillIconCache = new Map();
export function skillIconUrl(id, icon) {
  if (skillIconCache.has(id)) return skillIconCache.get(id);
  const c = canvas(20, 20);
  const ctx = c.getContext('2d');
  const col = icon.color;
  const lite = '#ffffff';
  ctx.fillStyle = col;
  const px = (x, y, w = 1, h = 1, cc = col) => { ctx.fillStyle = cc; ctx.fillRect(x, y, w, h); };
  switch (icon.shape) {
    case 'burst':
      px(8, 3, 4, 14); px(3, 8, 14, 4); px(5, 5, 2, 2); px(13, 5, 2, 2); px(5, 13, 2, 2); px(13, 13, 2, 2);
      px(9, 8, 2, 4, lite);
      break;
    case 'spiral':
      for (let i = 0; i < 14; i++) {
        const a = i * 0.55, r = 2 + i * 0.42;
        px(Math.round(10 + Math.cos(a) * r) - 1, Math.round(10 + Math.sin(a) * r) - 1, 2, 2, i % 3 ? col : lite);
      }
      break;
    case 'shout':
      px(4, 7, 4, 6); px(8, 5, 2, 10); px(11, 7, 1, 6, lite); px(13, 5, 1, 10); px(15, 3, 1, 14);
      break;
    case 'arrow':
      for (let i = 0; i < 11; i++) px(4 + i, 14 - i, 2, 1);
      px(12, 3, 4, 2); px(14, 3, 2, 4); px(4, 15, 3, 1, lite);
      break;
    case 'fan':
      for (const dy of [-3, 0, 3]) for (let i = 0; i < 9; i++) px(5 + i, 10 + Math.round(dy * i / 9) - 1, 1, 1);
      px(14, 6, 2, 2, lite); px(14, 9, 2, 2, lite); px(14, 12, 2, 2, lite);
      break;
    case 'wind':
      for (const [yy, len] of [[5, 10], [10, 13], [15, 8]]) {
        for (let i = 0; i < len; i++) px(3 + i, yy, 1, 1, i > len - 4 ? lite : col);
      }
      break;
    case 'orb':
      px(6, 4, 8, 12); px(4, 6, 12, 8); px(7, 6, 3, 3, lite);
      px(14, 2, 2, 2, '#ffdd55'); px(3, 15, 2, 2, '#ffdd55');
      break;
    case 'star':
      px(9, 2, 2, 16); px(2, 9, 16, 2);
      for (let i = 0; i < 5; i++) { px(5 + i, 5 + i); px(14 - i, 5 + i); px(5 + i, 14 - i); px(14 - i, 14 - i); }
      px(9, 9, 2, 2, lite);
      break;
    case 'blink':
      px(4, 3, 5, 2); px(6, 5, 4, 3); px(8, 8, 4, 3, lite); px(10, 11, 4, 3); px(12, 14, 5, 2);
      break;
    case 'slash':
      for (let i = 0; i < 12; i++) px(4 + i, 15 - i, 2, 1, i % 4 === 0 ? lite : col);
      px(3, 16, 2, 2); px(15, 3, 3, 2);
      break;
    case 'knives':
      for (let a = 0; a < 8; a++) {
        const dx = Math.round(Math.cos(a * Math.PI / 4) * 6), dy = Math.round(Math.sin(a * Math.PI / 4) * 6);
        px(9 + dx, 9 + dy, 2, 2, a % 2 ? col : lite);
      }
      px(9, 9, 2, 2, lite);
      break;
    case 'shadow':
      px(6, 3, 8, 10); px(4, 6, 12, 8, '#22222e'); px(7, 6, 2, 3, lite); px(12, 6, 2, 3, lite);
      break;
    default:
      px(4, 4, 12, 12);
  }
  const url = c.toDataURL();
  skillIconCache.set(id, url);
  return url;
}

const iconUrlCache = new Map();
export function itemIconUrl(id) {
  if (!iconUrlCache.has(id)) iconUrlCache.set(id, makeItemIconCanvas(id).toDataURL());
  return iconUrlCache.get(id);
}

export function itemIconTexture(id) {
  return toTexture(makeItemIconCanvas(id));
}

// Blade texture for the 3D weapon model in the player's hand
export function makeBladeTexture(colors) {
  const rng = mulberry32(9);
  const c = canvas(8, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 8, 24);
  ctx.fillStyle = colors[1]; ctx.fillRect(2, 0, 3, 22);
  ctx.fillStyle = colors[1]; ctx.fillRect(3, 22, 2, 2);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(3, Math.floor(rng() * 22), 1, 2);
  }
  return toTexture(c);
}
