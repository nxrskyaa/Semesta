// THE CAPSULE MACHINE, painted rather than assembled from CSS boxes.
//
// The gacha panel used to be a rounded div for the dome, a div with a "◈" glyph
// for the body and a "✦" for the crank. Everything else in Semesta is procedural
// pixel art, so next to the item icons that read as a placeholder — flat, and
// obviously not part of the same game.
//
// This paints a proper chunky gachapon on a small canvas and lets CSS upscale it
// with image-rendering: pixelated, exactly like every other texture here. The
// machine is painted ONCE; the parts that move (capsules, crank, chute light)
// are separate small canvases layered over it, so animating costs nothing.

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/** A shaded pixel block: base fill, light top-left edge, dark bottom-right. */
function block(ctx, x, y, w, h, base, hi, lo) {
  px(ctx, x, y, w, h, base);
  if (hi) { px(ctx, x, y, w, 1, hi); px(ctx, x, y, 1, h, hi); }
  if (lo) { px(ctx, x, y + h - 1, w, 1, lo); px(ctx, x + w - 1, y, 1, h, lo); }
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

const OUTLINE = '#241a10';
const BODY = '#c0453f';
const BODY_HI = '#e0645a';
const BODY_LO = '#8d2b28';
const METAL = '#c9b58a';
const METAL_HI = '#e8dcbb';
const METAL_LO = '#8f7c56';
const GLASS = '#bfe6f2';
const GLASS_HI = '#eafaff';

/**
 * The machine itself, 48x64 pixels: domed glass head on a red body with a
 * marquee, a coin slot, a crank boss and a prize chute. The dome is left EMPTY —
 * capsules are drawn separately so they can jiggle.
 */
export function paintMachine(ctx) {
  ctx.clearRect(0, 0, 48, 64);

  // --- glass dome (a stepped pixel arc, not a border-radius) ---------------
  const domeRows = [
    [14, 20], [10, 28], [7, 34], [5, 38], [4, 40], [3, 42], [3, 42], [2, 44],
    [2, 44], [2, 44], [2, 44], [2, 44], [2, 44], [2, 44], [2, 44], [2, 44],
    [2, 44], [2, 44], [2, 44], [2, 44], [2, 44], [2, 44],
  ];
  domeRows.forEach(([x, w], i) => {
    const y = 2 + i;
    px(ctx, x - 1, y, w + 2, 1, OUTLINE);
    px(ctx, x, y, w, 1, GLASS);
  });
  // a soft highlight sweeping down the left of the glass, the pixel-art way of
  // saying "this is a curved transparent surface"
  px(ctx, 7, 6, 2, 2, GLASS_HI);
  px(ctx, 6, 8, 2, 8, GLASS_HI);
  px(ctx, 5, 16, 2, 6, GLASS_HI);
  // the rim the dome sits in
  block(ctx, 1, 24, 46, 3, METAL, METAL_HI, METAL_LO);
  px(ctx, 0, 24, 1, 3, OUTLINE); px(ctx, 47, 24, 1, 3, OUTLINE);

  // --- body ----------------------------------------------------------------
  px(ctx, 2, 27, 44, 34, OUTLINE);
  block(ctx, 3, 28, 42, 32, BODY, BODY_HI, BODY_LO);
  // marquee plate
  block(ctx, 7, 30, 34, 7, '#3c2f1c', '#54432a', '#241a10');
  px(ctx, 9, 32, 30, 3, '#ffd23e');
  for (let i = 0; i < 6; i++) px(ctx, 10 + i * 5, 32, 2, 3, '#ffefa8');   // "lettering"
  // coin slot + return
  block(ctx, 8, 40, 11, 6, METAL, METAL_HI, METAL_LO);
  px(ctx, 10, 42, 7, 2, OUTLINE);
  // crank boss (the handle itself is drawn separately so it can spin)
  block(ctx, 26, 39, 12, 12, METAL, METAL_HI, METAL_LO);
  px(ctx, 30, 43, 4, 4, '#6c5c3c');
  // prize chute
  px(ctx, 12, 50, 24, 10, OUTLINE);
  block(ctx, 13, 51, 22, 8, '#2b2118', '#3d2f22', '#181008');
  px(ctx, 14, 51, 20, 1, '#4a3a28');   // lip catching the light
  // feet
  px(ctx, 4, 61, 8, 3, OUTLINE);
  px(ctx, 36, 61, 8, 3, OUTLINE);
}

/** One capsule, 10x10, two-tone with a highlight and a seam. */
export function paintCapsule(ctx, top, bot) {
  ctx.clearRect(0, 0, 10, 10);
  const rows = [[3, 4], [2, 6], [1, 8], [1, 8], [1, 8], [1, 8], [1, 8], [2, 6], [3, 4]];
  rows.forEach(([x, w], i) => {
    const y = i;
    px(ctx, x - 1, y, w + 2, 1, OUTLINE);
    px(ctx, x, y, w, 1, i < 4 ? top : bot);
  });
  px(ctx, 3, 1, 2, 1, '#ffffff');       // gloss
  px(ctx, 2, 2, 1, 2, '#ffffff');
  px(ctx, 1, 4, 8, 1, 'rgba(0,0,0,0.35)'); // seam between the halves
}

/** The crank handle, 16x16, drawn around its own centre so CSS can rotate it. */
export function paintCrank(ctx) {
  ctx.clearRect(0, 0, 16, 16);
  block(ctx, 7, 2, 2, 12, METAL, METAL_HI, METAL_LO);
  block(ctx, 4, 1, 8, 3, METAL, METAL_HI, METAL_LO);
  px(ctx, 3, 0, 10, 1, OUTLINE); px(ctx, 3, 4, 10, 1, OUTLINE);
  block(ctx, 5, 11, 6, 4, '#8d2b28', '#c0453f', '#5c1a18');
  px(ctx, 4, 10, 8, 1, OUTLINE); px(ctx, 4, 15, 8, 1, OUTLINE);
}

/** A cracked-open capsule, for the reveal: two halves flung apart. */
export function paintCapsuleHalf(ctx, color, top) {
  ctx.clearRect(0, 0, 10, 6);
  const rows = top ? [[3, 4], [2, 6], [1, 8], [1, 8], [1, 8]] : [[1, 8], [1, 8], [1, 8], [2, 6], [3, 4]];
  rows.forEach(([x, w], i) => {
    px(ctx, x - 1, i, w + 2, 1, OUTLINE);
    px(ctx, x, i, w, 1, color);
  });
  if (top) { px(ctx, 3, 1, 2, 1, '#ffffff'); px(ctx, 2, 2, 1, 2, '#ffffff'); }
}

const cache = new Map();
function url(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const { c, ctx } = canvas(w, h);
  draw(ctx);
  const u = c.toDataURL();
  cache.set(key, u);
  return u;
}

export const machineUrl = () => url('machine', 48, 64, paintMachine);
export const crankUrl = () => url('crank', 16, 16, paintCrank);
export const capsuleUrl = (top, bot) =>
  url(`cap:${top}:${bot}`, 10, 10, (ctx) => paintCapsule(ctx, top, bot));
export const capsuleHalfUrl = (color, top) =>
  url(`half:${color}:${top}`, 10, 6, (ctx) => paintCapsuleHalf(ctx, color, top));

/** The capsule colours rattling in the dome — deliberately candy-bright. */
export const CAPSULE_COLORS = [
  ['#ff8fb0', '#f2f2ea'], ['#7fd0f0', '#f2f2ea'], ['#ffd23e', '#f2f2ea'],
  ['#a8e07a', '#f2f2ea'], ['#c79bf0', '#f2f2ea'], ['#ffa45c', '#f2f2ea'],
];
