// Semua pixel art Semesta di-generate di sini (canvas 16px, nearest-neighbor).
// Palette dikunci supaya style 2.5D konsisten: hutan redup, hijau sage, tanah mauve.
import * as THREE from 'three';
import { mulberry32 } from '../util/noise.js';
import { ITEMS } from '../systems/items.js';

export const PALETTE = {
  grass: ['#5b7850', '#63815a', '#557248', '#6d8a5e'],
  grassBright: '#7fa065',
  moss: '#4c6a44',
  dirt: ['#7d635b', '#87695f', '#735a52'],
  dirtDark: '#54423c',
  path: ['#8a6f62', '#94786a', '#816759'],
  stone: ['#7b807c', '#878c87', '#6f7470'],
  stoneDark: '#575c58',
  bark: '#3d3129',
  barkLight: '#4d3f33',
  leaf: '#33513c',
  leafDark: '#294232',
  leafLight: '#40634a',
  water: '#3f7fae',
  waterDeep: '#2e628c',
  foam: '#cfe6ee',
  torchWood: '#4a3a2a',
  flame: ['#ffdd55', '#ffaa33', '#ff7722'],
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

// Gambar sprite dari peta string; legend: char -> warna ('.' = transparan)
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

// ---------------------------------------------------------------------------
// ATLAS BLOK TERRAIN — grid 4x4 tile @16px
// ---------------------------------------------------------------------------
export const TILE = {
  GRASS_A: 0, GRASS_B: 1, GRASS_C: 2, PATH: 3,
  DIRT: 4, STONE: 5, GRASS_SIDE: 6, DIRT_SIDE: 7,
  STONE_SIDE: 8, PATH_SIDE: 9, MOSS: 10, SHORE: 11,
};
const ATLAS_GRID = 4, TILE_PX = 16;

export function makeTerrainAtlas() {
  const rng = mulberry32(1337);
  const c = canvas(ATLAS_GRID * TILE_PX, ATLAS_GRID * TILE_PX);
  const ctx = c.getContext('2d');

  const at = (i) => [(i % ATLAS_GRID) * TILE_PX, Math.floor(i / ATLAS_GRID) * TILE_PX];

  // rumput 3 variasi
  for (const [ti, base] of [[TILE.GRASS_A, 0], [TILE.GRASS_B, 1], [TILE.GRASS_C, 2]]) {
    const [x, y] = at(ti);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.grass[base], ...PALETTE.grass, PALETTE.moss], rng, 0.5);
    // helai rumput terang acak
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = PALETTE.grassBright;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 1, 1);
    }
  }
  { // jalan setapak
    const [x, y] = at(TILE.PATH);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.path[0], ...PALETTE.path, PALETTE.dirtDark], rng, 0.45);
    for (let i = 0; i < 5; i++) { // kerikil
      ctx.fillStyle = PALETTE.stone[1];
      ctx.fillRect(x + Math.floor(rng() * 15), y + Math.floor(rng() * 15), 2, 1);
    }
  }
  { const [x, y] = at(TILE.DIRT);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[0], ...PALETTE.dirt, PALETTE.dirtDark], rng, 0.4); }
  { const [x, y] = at(TILE.STONE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.stone[0], ...PALETTE.stone, PALETTE.stoneDark], rng, 0.35);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x + 3, y + 5, 6, 1); ctx.fillRect(x + 9, y + 11, 5, 1); }
  { // sisi rumput: tanah + bibir hijau di atas
    const [x, y] = at(TILE.GRASS_SIDE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirt[2], ...PALETTE.dirt, PALETTE.dirtDark], rng, 0.4);
    noisyFill(ctx, x, y, 16, 3, [PALETTE.grass[0], ...PALETTE.grass], rng, 0.5);
    for (let i = 0; i < 8; i++) { // rumput menjuntai
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
  { // tepi pantai basah
    const [x, y] = at(TILE.SHORE);
    noisyFill(ctx, x, y, 16, 16, [PALETTE.dirtDark, PALETTE.dirt[2], '#463830'], rng, 0.4); }

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
// TEKSTUR DEKOR
// ---------------------------------------------------------------------------
export function makeBarkTexture() {
  const rng = mulberry32(77);
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  noisyFill(ctx, 0, 0, 16, 16, [PALETTE.bark, PALETTE.barkLight, '#332821'], rng, 0.4);
  ctx.fillStyle = '#2b221b';
  ctx.fillRect(4, 0, 1, 16); ctx.fillRect(11, 0, 1, 16);
  return toTexture(c, { repeat: true });
}

export function makeLeafTexture() {
  const rng = mulberry32(88);
  const c = canvas(16, 16);
  const ctx = c.getContext('2d');
  noisyFill(ctx, 0, 0, 16, 16, [PALETTE.leaf, PALETTE.leafDark, PALETTE.leafLight, PALETTE.leafDark], rng, 0.55);
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
  noisyFill(ctx, 0, 0, 64, 64, [PALETTE.water, PALETTE.waterDeep, '#4a8cba', PALETTE.water], rng, 0.4);
  for (let i = 0; i < 30; i++) { // kilau
    ctx.fillStyle = 'rgba(210,235,245,0.5)';
    ctx.fillRect(Math.floor(rng() * 62), Math.floor(rng() * 63), 2, 1);
  }
  return toTexture(c, { repeat: true });
}

// ---------------------------------------------------------------------------
// KARAKTER
// ---------------------------------------------------------------------------
export function makePlayerFaceTexture(skin = '#e8b98a', hair = '#3a2a20', female = false, bald = false) {
  const c = canvas(8, 8);
  const ctx = c.getContext('2d');
  const mouth = shade(skin, -0.18);
  const h = bald ? skin : hair;
  const map = female ? [
    'hhhhhhhh',
    'hshhhhsh',
    'hssssssh',
    'ssssssss',
    'sLssssLs',
    'ssssssss',
    'ssmmmmss',
    'ssssssss',
  ] : [
    'hhhhhhhh',
    'hhhhhhhh',
    'hsssssih',
    'ssssssss',
    'sEssssEs',
    'ssssssss',
    'ssmmmmss',
    'ssssssss',
  ];
  drawMap(ctx, map, { h, s: skin, E: '#2b2b33', L: '#33222e', m: mouth, i: h });
  return toTexture(c);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * (1 + amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * (1 + amt)));
  const b = Math.max(0, Math.min(255, (n & 255) * (1 + amt)));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function makeSlimeFaceTexture() {
  const c = canvas(16, 12);
  const ctx = c.getContext('2d');
  drawMap(ctx, [
    '................',
    '...E........E...',
    '...EE.......EE..',
    '................',
    '......m..m......',
    '......mmmm......',
  ], { E: '#173326', m: '#1d4030' }, 0, 3);
  return toTexture(c);
}

// ---------------------------------------------------------------------------
// IKON ITEM 16x16 — dipakai HUD (dataURL) & drop 3D (texture)
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
};

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

// painter prosedural untuk senjata bow/staff/dagger (warna dari def.blade)
function paintWeaponIcon(ctx, wdef) {
  const [dark, light] = wdef.blade;
  if (wdef.type === 'bow') {
    // busur: lengkung + tali + panah
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const x = 3 + Math.round(Math.sin(t * Math.PI) * 4);
      const y = 2 + Math.round(t * 11);
      ctx.fillStyle = i % 2 ? dark : light;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#d8d8c8';
    for (let y = 3; y <= 13; y++) ctx.fillRect(3, y, 1, 1); // tali
    ctx.fillStyle = light;
    for (let i = 0; i < 7; i++) ctx.fillRect(5 + i, 8, 1, 1); // panah
    ctx.fillStyle = '#e8e8d8';
    ctx.fillRect(12, 7, 1, 1); ctx.fillRect(12, 9, 1, 1); ctx.fillRect(13, 8, 1, 1);
  } else if (wdef.type === 'staff') {
    // tongkat diagonal + orb bercahaya
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
    // dua belati menyilang
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
  } else if (ITEMS[id]?.weapon) {
    paintWeaponIcon(ctx, ITEMS[id]);
  } else {
    ctx.fillStyle = '#c05cd0'; ctx.fillRect(4, 4, 8, 8); // item tak dikenal
  }
  iconCache.set(id, c);
  return c;
}

// --- ikon skill: bentuk sederhana bergaya pixel ---
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

// Tekstur bilah pedang untuk model 3D di tangan player
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
