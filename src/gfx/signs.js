// SIGNBOARDS.
//
// A newcomer walking into the plaza saw three identical daises with a prop on
// each and no way to know which one was the shop, the forge or the capsule
// machine. Every building that does something now carries a painted board.
//
// The lettering is a 5x7 bitmap font defined here rather than canvas fillText,
// for two reasons: the webfonts may not have loaded when the world builds, and a
// real bitmap font upscales to crisp blocks instead of the smeared antialiasing
// you get from shrinking a vector face down to eight pixels.

// Each glyph is 5 columns x 7 rows, read as strings of '#' and '.'.
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

const GW = 5, GH = 7, GAP = 1;

/** Width in pixels of a string at scale 1. */
export function textWidth(str) {
  return str.length * (GW + GAP) - GAP;
}

/** Stamp a string onto a context at (x, y) in pixel units of the given scale. */
export function drawText(ctx, str, x, y, scale, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const raw of str.toUpperCase()) {
    const glyph = FONT[raw] || FONT[' '];
    for (let r = 0; r < GH; r++) {
      const row = glyph[r];
      for (let c = 0; c < GW; c++) {
        if (row[c] !== '#') continue;
        ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
      }
    }
    cx += (GW + GAP) * scale;
  }
}

/**
 * A painted wooden signboard.
 *
 * @param label   the word carved into it, e.g. 'FORGE'
 * @param glyph   a single decorative mark drawn beside the word (a tiny pixel
 *                pictogram — no emoji, they render differently everywhere)
 * @param accent  the plank's trim colour, matched to its station
 */
export function makeSignTexture(label, glyph = 'anvil', accent = '#c8a03a') {
  const scale = 3;
  const pad = 10;
  const iconW = 26;
  const w = pad * 2 + iconW + 6 + textWidth(label) * scale;
  const h = 46;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // planks: three horizontal boards with the seams showing
  const woods = ['#8a6640', '#7d5b39', '#916c45'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = woods[i];
    ctx.fillRect(0, Math.round((i * h) / 3), w, Math.ceil(h / 3));
  }
  // grain
  ctx.fillStyle = 'rgba(60,40,24,0.22)';
  for (let i = 0; i < 26; i++) {
    const gy = Math.floor(Math.random() * h);
    ctx.fillRect(Math.floor(Math.random() * w), gy, 4 + Math.floor(Math.random() * 20), 1);
  }
  // seams + border
  ctx.fillStyle = '#5a3f26';
  ctx.fillRect(0, Math.round(h / 3) - 1, w, 1);
  ctx.fillRect(0, Math.round((2 * h) / 3) - 1, w, 1);
  ctx.fillStyle = '#3d2a19';
  ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, h - 2, w, 2);
  ctx.fillRect(0, 0, 2, h); ctx.fillRect(w - 2, 0, 2, h);
  ctx.fillStyle = accent;
  ctx.fillRect(2, 2, w - 4, 1); ctx.fillRect(2, h - 3, w - 4, 1);

  drawGlyph(ctx, glyph, pad, (h - iconW) / 2, iconW, accent);

  const tx = pad + iconW + 6;
  const ty = Math.round((h - GH * scale) / 2);
  // carved: a dark cut with a light highlight under it
  drawText(ctx, label, tx, ty + 1, scale, 'rgba(0,0,0,0.45)');
  drawText(ctx, label, tx, ty, scale, '#f6ecd2');
  return c;
}

/** Tiny pixel pictograms — a picture reads faster than a word from a distance. */
function drawGlyph(ctx, kind, x, y, s, accent) {
  const px = (a, b, w2, h2, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w2, h2); };
  const u = s / 13;               // the glyphs are drawn on a 13x13 grid
  const P = (a, b, w2, h2, col) => px(Math.round(a * u), Math.round(b * u), Math.max(1, Math.round(w2 * u)), Math.max(1, Math.round(h2 * u)), col);
  if (kind === 'anvil') {
    P(2, 8, 9, 3, '#8d9294'); P(4, 5, 5, 3, '#b6bcbe');
    P(1, 5, 3, 2, '#b6bcbe'); P(9, 5, 3, 2, '#b6bcbe');
    P(4, 11, 5, 2, '#5a4a38');
    P(6, 1, 2, 4, accent);      // a spark above it
  } else if (kind === 'coin') {
    P(2, 2, 9, 9, accent); P(3, 3, 7, 7, '#ffe27a');
    P(5, 4, 3, 5, '#a8791c'); P(4, 5, 5, 3, '#a8791c');
  } else if (kind === 'capsule') {
    P(3, 2, 7, 5, '#ff8fb0'); P(3, 7, 7, 5, '#f2f2ea');
    P(2, 6, 9, 1, '#3d2a19'); P(4, 3, 2, 1, '#ffffff');
  } else if (kind === 'sprout') {
    P(6, 5, 1, 7, '#5e8a3c');
    P(2, 4, 4, 2, '#7fc44f'); P(7, 3, 4, 2, '#7fc44f');
    P(3, 12, 7, 1, '#6a4a30');
  } else if (kind === 'fish') {
    P(2, 5, 7, 4, '#5aa8e8'); P(9, 4, 3, 6, '#3f86c4');
    P(3, 6, 1, 1, '#ffffff');
  } else if (kind === 'home') {
    P(2, 6, 9, 6, '#c8b090'); P(1, 4, 11, 2, '#a85a48');
    P(5, 8, 3, 4, '#6a4a30');
  } else {
    P(3, 3, 7, 7, accent);
  }
}
