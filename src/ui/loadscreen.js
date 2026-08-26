// The cinematic loading screen.
//
// Two jobs. First, it has to be worth looking at: five hand-written pixel
// VIGNETTES of places you're about to visit — dawn over the village, a lantern-lit
// night, snowfall in the winter biome, the sea at sunset, the festival bonfire —
// one picked at random each boot so the wait is never the same twice. Everything
// is drawn procedurally into a 320x180 canvas and upscaled with pixelated
// smoothing, so it is real pixel art and costs almost nothing.
//
// Second, it has to be HONEST. The bar is driven by the actual build stages in
// main.js (terrain, forest, villagers, sea, shaders), not a timer, and the boot
// deliberately warms the expensive caches — every item icon, every shader — while
// the picture is still up. That is the whole point: pay it here, once, instead of
// hitching the first time someone opens their bag or swings at a slime.
const W = 320, H = 180;

// ---------------------------------------------------------------------------
// tips rotate while you wait; they double as a soft tutorial
// ---------------------------------------------------------------------------
const TIPS = [
  'Rest camps and your own home heal you fast — and monsters keep out.',
  'Wade into the sea and you will start swimming. Watch your breath.',
  'The marina keeps a dinghy for you. The jetski key is at Pip\'s Shop.',
  'Islands out at sea hide their own scenery — and their own quiet.',
  'Press T to teleport home once you have built a house.',
  'Fish sell well. Cooked meals sell better.',
  'Every 5th level hands you a cosmetic you do not own yet.',
  'Tap the world map (N) to drop a waypoint flag.',
  'Elites wear a spinning gold ring. They hit hard and drop harder.',
  'Graphics too heavy? The gear panel on the title screen goes down to LOW.',
  'Check in daily (J) — day 30 hands over a mount.',
  'The winter biome sits in the north-west. The sea is in the south-east.',
];

const VIGNETTES = ['dawn', 'night', 'winter', 'sea', 'festival'];

// small deterministic RNG so a vignette's layout is stable for its whole run
function rngFrom(seed) {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// ---------------------------------------------------------------------------
// scene painters. Each returns a draw(ctx, t) closure. They share a language:
// a sky gradient, layered silhouette ridges, one focal element, one particle
// system. Same grammar, five different moods.
// ---------------------------------------------------------------------------
function ridge(ctx, rnd, baseY, amp, color, step = 8, off = 0) {
  ctx.fillStyle = color;
  // one extra span each side so a drifting ridge never shows its ends
  const n = Math.ceil(W / step) + 3;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(baseY + (rnd() - 0.5) * amp);
  const span = (n - 1) * step;
  const shift = ((off % span) + span) % span;
  ctx.beginPath();
  ctx.moveTo(-step, H);
  for (let i = 0; i < n; i++) ctx.lineTo(Math.round(i * step - shift) - step, Math.round(pts[i]));
  ctx.lineTo(W + step, H);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// THE NEAR FIELD.
//
// Every scene here used to be a sky gradient over a low ridge with props a few
// pixels tall, and that is exactly why they read as flat: there were only two
// planes and BOTH were far away. Nothing was close to you, so nothing had any
// scale to be judged against, and the top half of every frame was an empty
// wash.
//
// A dark shape CROPPED BY THE FRAME is what tells the eye something is near --
// cropping is the whole trick, because a thing that runs off the edge must be
// closer than the edge. And the moment there is a near plane, the ridge behind
// it becomes middle distance for free, without a pixel being moved.
//
// Everything below is PRECOMPUTED from the painter's seeded rnd and then only
// read in the draw closure. Calling rnd() per frame would redraw a different
// clump of grass sixty times a second, which does not read as wind; it reads as
// static.
// ---------------------------------------------------------------------------

/**
 * Blades along the bottom edge, in CLUMPS.
 *
 * Evenly spaced blades of random height read as a brush -- a solid hedge ruled
 * across the frame. Grass grows in tufts with gaps between them, and each tuft
 * is tall in the middle and short at its edges, so the silhouette has a rhythm
 * instead of a flat top. Every blade keeps its own phase: the row must never
 * pulse as one object.
 */
function makeGrass(rnd, hMin, hMax) {
  const out = [];
  let x = -6;
  while (x < W + 6) {
    const clump = 3 + Math.floor(rnd() * 6);
    const peak = hMin + rnd() * (hMax - hMin);
    for (let i = 0; i < clump && x < W + 6; i++) {
      out.push({
        x: x + rnd() * 1.6,
        h: Math.max(3, peak * (0.42 + Math.sin((i / clump) * Math.PI) * 0.64) + rnd() * 3),
        ph: rnd() * 6.28,
        sp: 0.7 + rnd() * 0.8,
      });
      x += 1.5 + rnd() * 2.2;
    }
    x += 1 + rnd() * 5;                      // the gap between tufts
  }
  return out;
}

function drawGrass(ctx, t, blades, color, base = H + 1) {
  ctx.fillStyle = color;
  for (const b of blades) {
    const lean = Math.sin(t * b.sp + b.ph) * (b.h * 0.18);
    for (let y = 0; y < b.h; y++) {
      // a blade tapers because each step up is drawn one pixel narrower
      const w = y > b.h * 0.72 ? 1 : (y > b.h * 0.4 ? 2 : 3);
      ctx.fillRect(Math.round(b.x + (lean * y) / b.h), Math.round(base - y), w, 1);
    }
  }
}

/**
 * A branch reaching in from a top corner. `side` -1 enters left, +1 enters right.
 *
 * Two things make this read as a branch rather than as a caterpillar, and the
 * first version had neither: it must TAPER (thick where it leaves the trunk,
 * fine at the tip) and it must BEND DOWNWARD as it reaches, because a limb
 * carrying its own weight does. Even spacing and equal blob radii are what
 * produced a string of beads.
 */
function makeBough(rnd, side, nodes = 6, spread = 1) {
  const out = [];
  let x = side < 0 ? -10 : W + 10;
  let y = -8;
  let drop = 2;
  const w0 = 5.5 + rnd() * 2;
  for (let i = 0; i < nodes; i++) {
    const k = i / Math.max(1, nodes - 1);
    x += -side * (13 + rnd() * 17) * spread;
    drop += 1.5 + rnd() * 2.4;                       // the bend accumulates
    y += drop;
    const r = (11 - k * 4.5) + rnd() * 5;
    out.push({
      x, y, r, ph: rnd() * 6.28, sp: 0.6 + rnd() * 0.6,
      w: Math.max(0.9, w0 * (1 - k * 0.84)),
      // a cluster of three unequal blobs, never one circle
      blobs: Array.from({ length: 3 }, () => ({
        dx: (rnd() - 0.5) * r * 1.6,
        dy: (rnd() - 0.5) * r * 1.1,
        r: r * (0.48 + rnd() * 0.58),
      })),
    });
  }
  return { nodes: out, sx: side < 0 ? -10 : W + 10, side, w0 };
}

function drawBough(ctx, t, b, bark, leaf, leafHi) {
  // a cantilever sways more the further it reaches, so the tip moves most
  const sway = (n, i) => Math.sin(t * n.sp + n.ph) * (0.8 + i * 0.85);
  const pts = [{ x: b.sx, y: -8, w: b.w0 }];
  b.nodes.forEach((n, i) => pts.push({ x: n.x + sway(n, i), y: n.y, w: n.w }));
  ctx.fillStyle = bark;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const dx = c.x - a.x, dy = c.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * a.w, a.y + ny * a.w);
    ctx.lineTo(c.x + nx * c.w, c.y + ny * c.w);
    ctx.lineTo(c.x - nx * c.w, c.y - ny * c.w);
    ctx.lineTo(a.x - nx * a.w, a.y - ny * a.w);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < b.nodes.length; i++) {
    const n = b.nodes[i];
    const dx = sway(n, i);
    ctx.fillStyle = leaf;
    for (const o of n.blobs) {
      ctx.beginPath(); ctx.arc(n.x + dx + o.dx, n.y + o.dy, o.r, 0, 6.283); ctx.fill();
    }
    if (leafHi) {
      // snow (or a lit edge) sits ON TOP of a clump -- a full bright circle is
      // what turned the winter branch into a string of white beads
      ctx.fillStyle = leafHi;
      for (const o of n.blobs) {
        ctx.beginPath();
        ctx.arc(n.x + dx + o.dx, n.y + o.dy - o.r * 0.38, o.r * 0.78, Math.PI, 0);
        ctx.fill();
      }
    }
  }
}

/** A soft radial pool. Never a fillRect -- a square halo kills the illusion of light. */
function glow(ctx, x, y, r, inner, outer = 'rgba(0,0,0,0)') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function hut(ctx, x, y, s, wall, roof) {
  ctx.fillStyle = wall;
  ctx.fillRect(x - 5 * s, y - 7 * s, 10 * s, 7 * s);
  ctx.fillStyle = roof;
  for (let i = 0; i < 5 * s; i++) {
    ctx.fillRect(x - 6 * s + i, y - 7 * s - i, 12 * s - i * 2, 1);
  }
}

function paintDawn(rnd) {
  const clouds = Array.from({ length: 7 }, () => ({
    x: rnd() * W, y: 20 + rnd() * 45, w: 22 + rnd() * 34, sp: 1.6 + rnd() * 2.4,
  }));
  const birds = Array.from({ length: 5 }, () => ({ x: rnd() * W, y: 34 + rnd() * 30, sp: 7 + rnd() * 5 }));
  const huts = [[92, 150, 1.5], [126, 154, 1.2], [66, 155, 1.1], [152, 149, 1.35]];
  const bough = makeBough(rnd, -1, 6);
  const grass = makeGrass(rnd, 10, 26);
  return (ctx, t) => {
    sky(ctx, [[0, '#f8c98a'], [0.35, '#ffdcae'], [0.62, '#c9e2c0'], [1, '#a8cf9c']]);
    // sun climbing behind the hills
    const sy = 118 - Math.min(52, t * 5);
    ctx.fillStyle = '#fff1c0';
    ctx.beginPath(); ctx.arc(232, sy, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,176,0.28)';
    ctx.beginPath(); ctx.arc(232, sy, 30, 0, Math.PI * 2); ctx.fill();
    for (const c of clouds) {
      const x = (c.x + t * c.sp) % (W + 60) - 30;
      ctx.fillStyle = 'rgba(255,252,240,0.72)';
      ctx.fillRect(x, c.y, c.w, 4);
      ctx.fillRect(x + 6, c.y - 4, c.w - 14, 4);
    }
    for (const b of birds) {
      const x = (b.x + t * b.sp) % (W + 30) - 15;
      const flap = Math.sin(t * 8 + b.x) > 0 ? 1 : -1;
      ctx.fillStyle = '#5a6a52';
      ctx.fillRect(x, b.y, 2, 1);
      ctx.fillRect(x - 2, b.y - flap, 2, 1);
      ctx.fillRect(x + 2, b.y - flap, 2, 1);
    }
    ridge(ctx, rngFrom(11), 132, 16, '#7fa46e', 16);
    ridge(ctx, rngFrom(23), 150, 10, '#5e8a52', 12);
    for (const [x, y, s] of huts) hut(ctx, x, y, s, '#d8c49a', '#b4604a');
    ridge(ctx, rngFrom(37), 168, 6, '#436b3c', 10);
    // chimney smoke off the biggest hut
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.5 + i / 6) % 1;
      ctx.fillStyle = `rgba(230,230,220,${0.4 * (1 - p)})`;
      ctx.fillRect(94 + Math.sin(p * 6 + i) * 4, 142 - p * 34, 3, 3);
    }
    // NEAR FIELD: a leafy bough overhead and a meadow you are standing in
    drawBough(ctx, t, bough, '#2f3a24', '#35502c', '#41613a');
    drawGrass(ctx, t, grass, '#24401f');
  };
}

function paintNight(rnd) {
  const stars = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * 110, p: rnd() * 6 }));
  const nightGrass = makeGrass(rnd, 9, 24);
  const flies = Array.from({ length: 34 }, () => ({
    x: rnd() * W, y: 90 + rnd() * 80, a: rnd() * 6, r: 4 + rnd() * 12, sp: 0.5 + rnd(),
  }));
  const lanterns = [[48, 152], [110, 158], [176, 150], [248, 156], [290, 162]];
  return (ctx, t) => {
    sky(ctx, [[0, '#131f3e'], [0.45, '#1d3357'], [0.8, '#2b4a62'], [1, '#2f5a54']]);
    for (const s of stars) {
      const tw = 0.45 + Math.abs(Math.sin(t * 1.6 + s.p)) * 0.55;
      ctx.fillStyle = `rgba(255,255,235,${tw})`;
      ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
    }
    // moon
    ctx.fillStyle = '#f4f2dc';
    ctx.beginPath(); ctx.arc(258, 40, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,214,236,0.35)';
    ctx.beginPath(); ctx.arc(253, 36, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(263, 46, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(244,242,220,0.16)';
    ctx.beginPath(); ctx.arc(258, 40, 27, 0, Math.PI * 2); ctx.fill();
    ridge(ctx, rngFrom(41), 128, 18, '#16283c', 18);
    ridge(ctx, rngFrom(53), 148, 11, '#122334', 12);
    // stone lanterns, each with a warm pool of light
    for (const [x, y] of lanterns) {
      const pulse = 0.75 + Math.sin(t * 2.4 + x) * 0.2;
      ctx.fillStyle = `rgba(255,184,92,${0.14 * pulse})`;
      ctx.beginPath(); ctx.arc(x, y - 12, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a3340';
      ctx.fillRect(x - 4, y - 6, 8, 6);
      ctx.fillRect(x - 2, y - 12, 4, 6);
      ctx.fillStyle = `rgba(255,206,124,${pulse})`;
      ctx.fillRect(x - 3, y - 17, 6, 5);
      ctx.fillStyle = '#2a3340';
      ctx.fillRect(x - 6, y - 20, 12, 3);
    }
    for (const f of flies) {
      const a = f.a + t * f.sp;
      const x = f.x + Math.cos(a) * f.r, y = f.y + Math.sin(a * 1.3) * f.r * 0.5;
      const g = 0.35 + Math.abs(Math.sin(t * 3 + f.a)) * 0.65;
      ctx.fillStyle = `rgba(198,255,142,${g})`;
      ctx.fillRect(x | 0, y | 0, 2, 2);
      ctx.fillStyle = `rgba(198,255,142,${g * 0.25})`;
      ctx.fillRect((x | 0) - 1, (y | 0) - 1, 4, 4);
    }
    ridge(ctx, rngFrom(67), 172, 6, '#0d1a26', 10);

    // NEAR FIELD: one of Anavela's stone lanterns, close enough to read, with
    // the pool of light it actually casts. Built from the same parts the world
    // ones are -- base, pillar, lit PANE, wide roof -- because that silhouette
    // is the single most recognisable object in the game.
    const lx = 254, ly = 176;
    const flick = 0.72 + Math.abs(Math.sin(t * 6.1)) * 0.16 + Math.sin(t * 13.3) * 0.06;
    glow(ctx, lx + 1, ly - 34, 62, `rgba(255,206,120,${0.15 * flick})`);
    ctx.fillStyle = '#101c26';
    ctx.fillRect(lx - 11, ly - 8, 22, 10);            // two-step base
    ctx.fillRect(lx - 8, ly - 14, 16, 7);
    ctx.fillRect(lx - 4, ly - 40, 8, 27);             // pillar
    ctx.fillRect(lx - 10, ly - 45, 20, 6);            // collar
    // the lit pane: this is what bloom would catch, so it is the brightest thing
    glow(ctx, lx, ly - 54, 20, `rgba(255,196,104,${0.5 * flick})`);
    ctx.fillStyle = `rgba(255,226,158,${0.86 * flick})`;
    ctx.fillRect(lx - 8, ly - 62, 16, 16);
    ctx.fillStyle = '#101c26';
    ctx.fillRect(lx - 9, ly - 63, 18, 2);
    for (let i = 0; i < 9; i++) {                     // broad overhanging roof
      ctx.fillRect(lx - 15 + i, ly - 64 - i, 30 - i * 2, 1);
    }
    ctx.fillRect(lx - 2, ly - 76, 4, 4);              // finial
    drawGrass(ctx, t, nightGrass, '#0a1420');
  };
}

function paintWinter(rnd) {
  const snowBough = makeBough(rnd, 1, 6, 1.15);   // reaches well into frame
  const flakes = Array.from({ length: 90 }, () => ({
    x: rnd() * W, y: rnd() * H, sp: 6 + rnd() * 14, dr: rnd() * 6, s: rnd() < 0.3 ? 2 : 1,
  }));
  const trees = Array.from({ length: 16 }, () => ({ x: rnd() * W, y: 128 + rnd() * 34, s: 0.6 + rnd() * 0.9 }));
  return (ctx, t) => {
    sky(ctx, [[0, '#1e2f4c'], [0.4, '#4a6a8e'], [0.75, '#9dc0d4'], [1, '#d8e8f0']]);
    // aurora: three drifting bands
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = ['rgba(126,232,196,0.16)', 'rgba(150,190,255,0.13)', 'rgba(200,150,240,0.1)'][b];
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        ctx.lineTo(x, 28 + b * 14 + Math.sin(x * 0.03 + t * 0.6 + b) * 12);
      }
      for (let x = W; x >= 0; x -= 8) {
        ctx.lineTo(x, 44 + b * 14 + Math.sin(x * 0.03 + t * 0.6 + b) * 12);
      }
      ctx.closePath(); ctx.fill();
    }
    ridge(ctx, rngFrom(83), 126, 20, '#8fb2c8', 20);
    ridge(ctx, rngFrom(97), 148, 12, '#c4dce8', 14);
    // frost conifers
    for (const tr of trees) {
      const s = tr.s;
      ctx.fillStyle = '#6a7f92';
      ctx.fillRect(tr.x, tr.y, 2 * s, 8 * s);
      for (let l = 0; l < 3; l++) {
        const w = (12 - l * 3) * s;
        ctx.fillStyle = ['#a8cbd8', '#bcdae4', '#d6ecf2'][l];
        ctx.fillRect(tr.x - w / 2 + s, tr.y - (l + 1) * 6 * s, w, 6 * s);
      }
    }
    ridge(ctx, rngFrom(103), 172, 5, '#eaf4f8', 10);
    // NEAR FIELD, drawn BEFORE the snowfall so the flakes fall in front of it
    // as well as behind -- that is what puts the branch inside the weather
    // rather than behind a curtain of it.
    drawBough(ctx, t, snowBough, '#1b2733', '#22323f', '#dceaf2');
    for (const f of flakes) {
      const y = (f.y + t * f.sp) % (H + 8);
      const x = f.x + Math.sin(t * 1.1 + f.dr) * 8;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x % W | 0, y | 0, f.s, f.s);
    }
    // a drift banked up against the bottom edge, so the ground has a near lip
    ctx.fillStyle = '#f4fbff';
    ctx.beginPath();
    ctx.moveTo(-4, H + 2);
    for (let x = -4; x <= W + 4; x += 10) {
      ctx.lineTo(x, H - 8 - Math.sin(x * 0.045) * 5 - Math.sin(x * 0.11) * 2.5);
    }
    ctx.lineTo(W + 4, H + 2);
    ctx.closePath(); ctx.fill();
  };
}

function paintSea(rnd) {
  // two mooring posts and the rope between them: the near plane the sea lacked
  const posts = [{ x: 26, top: 118, w: 9 }, { x: 74, top: 128, w: 7 }];
  const bands = Array.from({ length: 12 }, (_, i) => ({
    y: 116 + i * 5.4, sp: 5 + i * 2.2, off: rnd() * W,
  }));
  const gulls = Array.from({ length: 4 }, () => ({ x: rnd() * W, y: 42 + rnd() * 26, sp: 5 + rnd() * 4 }));
  return (ctx, t) => {
    sky(ctx, [[0, '#3a4a86'], [0.3, '#9a6a9c'], [0.55, '#e8896a'], [0.72, '#f8c07a'], [1, '#2f7fb0']]);
    // low sun on the horizon with a light column on the water
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(168, 112, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.22)';
    ctx.beginPath(); ctx.arc(168, 112, 26, 0, Math.PI * 2); ctx.fill();
    // island silhouettes with palms
    const isl = [[64, 116, 22], [252, 114, 16], [206, 118, 11]];
    for (const [x, y, w] of isl) {
      ctx.fillStyle = '#2b3f52';
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x, y - w * 0.62, x + w, y);
      ctx.closePath(); ctx.fill();
      // one leaning palm per island
      ctx.fillStyle = '#243545';
      ctx.fillRect(x - 1, y - w * 0.55 - 10, 2, 11);
      for (let f = 0; f < 4; f++) {
        const a = -0.5 - f * 0.5;
        ctx.fillRect(x - 1 + Math.cos(a) * 5, y - w * 0.55 - 10 + Math.sin(a) * 3, 6, 1);
      }
    }
    // horizon glare + scrolling wave bands
    ctx.fillStyle = 'rgba(255,214,150,0.2)';
    ctx.fillRect(150, 116, 36, H - 116);
    for (const b of bands) {
      const o = (b.off + t * b.sp) % 40;
      ctx.fillStyle = `rgba(220,246,255,${0.1 + (b.y - 116) / 200})`;
      for (let x = -40; x < W + 40; x += 40) {
        ctx.fillRect(x + o, b.y, 14 + (b.y - 116) * 0.5, 2);
      }
    }
    // a jetski wake cutting across the swell
    const jx = ((t * 34) % (W + 90)) - 45;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 22; i++) {
      const w = 1 + i * 0.4;
      ctx.fillRect(jx - i * 3.2, 156 + Math.sin(t * 5) * 1.5 + i * 0.35, 2, w * 0.4);
      ctx.fillRect(jx - i * 3.2, 156 + Math.sin(t * 5) * 1.5 - i * 0.35, 2, w * 0.4);
    }
    ctx.fillStyle = '#e8574a';
    ctx.fillRect(jx, 152 + Math.sin(t * 5) * 1.5, 11, 4);
    ctx.fillRect(jx + 3, 148 + Math.sin(t * 5) * 1.5, 4, 4);
    for (const g of gulls) {
      const x = (g.x + t * g.sp) % (W + 30) - 15;
      const flap = Math.sin(t * 7 + g.x) > 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(40,50,62,0.8)';
      ctx.fillRect(x - 2, g.y - flap, 2, 1);
      ctx.fillRect(x + 1, g.y - flap, 2, 1);
    }
    // NEAR FIELD: you are standing on the jetty, not floating above the water.
    // The posts are cropped by the bottom edge and the rope hangs in a real
    // catenary between them, sagging on the swell.
    ctx.strokeStyle = '#1a2430';
    ctx.lineWidth = 2;
    const sagT = Math.sin(t * 0.9) * 2;
    ctx.beginPath();
    ctx.moveTo(posts[0].x + posts[0].w / 2, posts[0].top + 6);
    ctx.quadraticCurveTo((posts[0].x + posts[1].x) / 2 + 4,
      posts[0].top + 30 + sagT, posts[1].x + posts[1].w / 2, posts[1].top + 5);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const q of posts) {
      ctx.fillStyle = '#22303e';
      ctx.fillRect(q.x, q.top, q.w, H - q.top + 2);
      ctx.fillStyle = '#33475a';                       // lit edge, sun side
      ctx.fillRect(q.x + q.w - 2, q.top + 2, 2, H - q.top);
      ctx.fillStyle = '#141d27';                       // capped top
      ctx.fillRect(q.x - 1, q.top - 2, q.w + 2, 3);
    }
    // and the deck boards running off the bottom of the frame
    ctx.fillStyle = '#1a2430';
    ctx.fillRect(0, H - 9, W, 9);
    ctx.fillStyle = '#243243';
    for (let x = -6; x < W; x += 17) ctx.fillRect(x + 2, H - 9, 13, 3);
  };
}

function paintFestival(rnd) {
  const festGrass = makeGrass(rnd, 8, 20);
  const festBough = makeBough(rnd, -1, 4, 0.8);
  const embers = Array.from({ length: 46 }, () => ({
    x: 150 + (rnd() - 0.5) * 60, y: rnd() * H, sp: 8 + rnd() * 16, dr: rnd() * 6,
  }));
  const dancers = [[104, 162], [126, 165], [176, 164], [198, 161]];
  const poles = [[62, 158], [238, 156], [292, 162]];
  return (ctx, t) => {
    sky(ctx, [[0, '#221338'], [0.4, '#43214a'], [0.72, '#7a3a44'], [1, '#3c2a2a']]);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % W, y = (i * 53) % 96;
      ctx.fillStyle = `rgba(255,240,210,${0.3 + Math.abs(Math.sin(t + i)) * 0.4})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ridge(ctx, rngFrom(131), 138, 14, '#2a1c2e', 18);
    // lantern poles with hanging chōchin
    for (const [x, y] of poles) {
      ctx.fillStyle = '#3a2a2a';
      ctx.fillRect(x - 1, y - 34, 2, 34);
      const sw = Math.sin(t * 1.4 + x) * 3;
      ctx.fillStyle = '#ff9a5e';
      ctx.fillRect(x - 4 + sw, y - 34, 8, 10);
      ctx.fillStyle = '#d8543c';
      ctx.fillRect(x - 5 + sw, y - 36, 10, 2);
      ctx.fillStyle = `rgba(255,154,94,${0.12 + Math.sin(t * 2 + x) * 0.04})`;
      ctx.beginPath(); ctx.arc(x + sw, y - 29, 20, 0, Math.PI * 2); ctx.fill();
    }
    // the bonfire: stacked flame tongues + a big warm pool of light
    const flick = 0.85 + Math.sin(t * 9) * 0.15;
    ctx.fillStyle = `rgba(255,150,60,${0.15 * flick})`;
    ctx.beginPath(); ctx.arc(150, 158, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3226';
    ctx.fillRect(138, 162, 24, 6);
    for (let f = 0; f < 5; f++) {
      const h = (18 - f * 3) * flick;
      ctx.fillStyle = ['#ff5a2a', '#ff8a3a', '#ffb04a', '#ffd070', '#fff0b0'][f];
      const wob = Math.sin(t * 7 + f * 1.4) * 2.5;
      ctx.fillRect(150 - (9 - f * 1.6) + wob, 162 - h, (9 - f * 1.6) * 2, h);
    }
    // chibi critters dancing around it — hop + arm wave
    for (let i = 0; i < dancers.length; i++) {
      const [x, y] = dancers[i];
      const hop = Math.abs(Math.sin(t * 4 + i * 1.3)) * 5;
      const arm = Math.sin(t * 6 + i) * 3;
      ctx.fillStyle = ['#e8a35d', '#a8e06a', '#f0a8c8', '#8fd6e8'][i % 4];
      ctx.fillRect(x - 4, y - 10 - hop, 8, 7);          // big head
      ctx.fillRect(x - 3, y - 4 - hop, 6, 5);           // body
      ctx.fillStyle = '#2a1c2e';
      ctx.fillRect(x - 3, y - 8 - hop, 1, 1);           // eyes
      ctx.fillRect(x + 2, y - 8 - hop, 1, 1);
      ctx.fillStyle = ['#e8a35d', '#a8e06a', '#f0a8c8', '#8fd6e8'][i % 4];
      ctx.fillRect(x - 6, y - 5 - hop + arm, 2, 4);     // arms
      ctx.fillRect(x + 4, y - 5 - hop - arm, 2, 4);
    }
    for (const e of embers) {
      const y = (e.y - t * e.sp + H * 4) % (H + 10);
      const x = e.x + Math.sin(t * 2 + e.dr) * 12;
      ctx.fillStyle = `rgba(255,${150 + ((y * 0.5) | 0) % 80},80,${0.3 + (y / H) * 0.5})`;
      ctx.fillRect(x | 0, y | 0, 2, 2);
    }
    ridge(ctx, rngFrom(149), 174, 5, '#1f1520', 10);
    // NEAR FIELD: a bough with a paper lantern strung under it, and grass. The
    // lantern is what makes the corner read as festival rather than as a tree.
    drawBough(ctx, t, festBough, '#241826', '#2b1f2e', null);
    const swing = Math.sin(t * 1.05) * 4;
    const cx2 = 52 + swing, cy2 = 46;
    ctx.strokeStyle = '#241826'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(52, 24); ctx.lineTo(cx2, cy2 - 9); ctx.stroke();
    glow(ctx, cx2, cy2, 34, 'rgba(255,150,90,0.30)');
    ctx.fillStyle = '#f06a3c';
    ctx.beginPath(); ctx.ellipse(cx2, cy2, 10, 12, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,150,0.55)';
    ctx.beginPath(); ctx.ellipse(cx2 - 3, cy2 - 2, 4, 6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#241826';
    ctx.fillRect(cx2 - 5, cy2 - 11, 10, 2);
    ctx.fillRect(cx2 - 5, cy2 + 9, 10, 2);
    ctx.fillRect(cx2 - 1, cy2 + 11, 2, 4);
    drawGrass(ctx, t, festGrass, '#150e18');
  };
}

const PAINTERS = { dawn: paintDawn, night: paintNight, winter: paintWinter, sea: paintSea, festival: paintFestival };
const VIGNETTE_NAME = {
  dawn: 'ANAVELA UNIVERSE · DAYBREAK',
  night: 'THE LANTERN ROAD · NIGHTFALL',
  winter: 'THE FROSTED NORTH-WEST',
  sea: 'THE SOUTHERN ARCHIPELAGO',
  festival: 'THE FESTIVAL PLAZA',
};

const CSS = `
#loadscreen {
  position: fixed; inset: 0; z-index: 120; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  background: #0a0f14; font-family: var(--font-body, inherit);
  transition: opacity 0.55s ease;
}
#loadscreen.gone { opacity: 0; pointer-events: none; }
#loadscreen { transition: opacity 0.85s ease; }
#loadscreen .scene {
  position: absolute; inset: 0; width: 100%; height: 100%;
  image-rendering: pixelated; object-fit: cover;
}
/* a scanline veil + vignette so the upscaled pixels read as a screen, not a blur */
#loadscreen .veil {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(4,8,10,0.75) 100%),
    repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 3px);
}
#loadscreen .stack {
  position: relative; z-index: 2; width: min(560px, 88vw);
  padding: 0 0 max(7vh, 42px); text-align: center;
}
#loadscreen .logo {
  width: min(330px, 62vw); image-rendering: pixelated; display: block; margin: 0 auto 4px;
  filter: drop-shadow(0 4px 0 rgba(0,0,0,0.6));
}
#loadscreen .place {
  font-family: var(--font-display, inherit); font-size: 9px; letter-spacing: 4px;
  color: #cfe0c8; text-shadow: 0 2px 0 #000; margin-bottom: 16px; opacity: 0.85;
}
#loadscreen .stage {
  font-size: 11px; letter-spacing: 2px; color: #ffe9b0; text-shadow: 0 2px 0 #000;
  min-height: 15px; margin-bottom: 7px;
}
/* segmented pixel bar — 24 chunky cells that light up left to right */
#loadscreen .bar {
  display: flex; gap: 2px; height: 14px; padding: 3px;
  background: rgba(8,12,10,0.72); box-shadow: var(--pix-frame, 0 0 0 2px #46523c);
}
#loadscreen .bar i { flex: 1; background: #1d2a20; transition: background 0.2s, box-shadow 0.2s; }
#loadscreen .bar i.on {
  background: linear-gradient(180deg, #9fe86e, #58c93f);
  box-shadow: 0 0 6px rgba(140,230,110,0.55);
}
#loadscreen .pct {
  font-family: var(--font-display, inherit); font-size: 10px; letter-spacing: 3px;
  color: #b8d89a; margin-top: 7px; text-shadow: 0 2px 0 #000;
}
#loadscreen .tip {
  font-size: 10px; line-height: 1.8; color: #a8b89a; margin-top: 14px;
  min-height: 34px; text-shadow: 0 1px 0 #000; transition: opacity 0.4s;
}
#loadscreen .tip b { color: #ffe27a; letter-spacing: 2px; display: block; font-size: 8px; margin-bottom: 3px; }
#loadscreen .rialo {
  position: absolute; bottom: 12px; left: 0; right: 0; text-align: center;
  font-family: var(--font-display, inherit); font-size: 8px; letter-spacing: 4px;
  color: #8ea084; z-index: 3; text-shadow: 0 2px 0 #000;
}
@media (max-width: 560px) {
  #loadscreen .logo { width: 68vw; }
  #loadscreen .tip { font-size: 9px; }
}
`;

/**
 * @param logoSrc  the SEMESTA wordmark (already-decoded data URL or import)
 * @param vignette force a specific scene; omit for a random one
 */
export function createLoadScreen({ logoSrc = '', vignette = null } = {}) {
  if (!document.getElementById('loadscreen-css')) {
    const st = document.createElement('style');
    st.id = 'loadscreen-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  const key = vignette || VIGNETTES[Math.floor(Math.random() * VIGNETTES.length)];
  const root = document.createElement('div');
  root.id = 'loadscreen';

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.className = 'scene';
  root.appendChild(canvas);
  root.insertAdjacentHTML('beforeend', '<div class="veil"></div>');

  const CELLS = 24;
  root.insertAdjacentHTML('beforeend', `
    <div class="stack">
      ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="SEMESTA">` : ''}
      <div class="place">${VIGNETTE_NAME[key]}</div>
      <div class="stage">Waking the world…</div>
      <div class="bar">${'<i></i>'.repeat(CELLS)}</div>
      <div class="pct">0%</div>
      <div class="tip"></div>
    </div>
    <div class="rialo">◆ BUILD FOR RIALO ◆</div>
  `);

  const ctx = canvas.getContext('2d');
  const draw = PAINTERS[key](rngFrom(key.length * 7919 + 13));
  const cells = [...root.querySelectorAll('.bar i')];
  const stageEl = root.querySelector('.stage');
  const pctEl = root.querySelector('.pct');
  const tipEl = root.querySelector('.tip');

  // tips rotate every few seconds, shuffled so two boots rarely start the same
  const order = TIPS.map((_, i) => i).sort(() => Math.random() - 0.5);
  let tipI = 0;
  function showTip() {
    tipEl.style.opacity = '0';
    setTimeout(() => {
      tipEl.innerHTML = `<b>DID YOU KNOW</b>${TIPS[order[tipI % order.length]]}`;
      tipEl.style.opacity = '1';
      tipI++;
    }, 260);
  }
  showTip();
  const tipTimer = setInterval(showTip, 3800);

  // the scene animates on its own clock so it keeps moving through long stages
  const t0 = performance.now();
  let raf = 0, alive = true, lastDraw = 0;
  function paint() {
    lastDraw = performance.now();
    draw(ctx, (lastDraw - t0) / 1000);
  }
  function loop() {
    if (!alive) return;
    paint();
    raf = requestAnimationFrame(loop);
  }
  loop();
  // rAF ONLY DRAWS. It stops dead in a background tab, and a loading screen is
  // precisely the screen people alt-tab away from -- so the scene froze mid-boot
  // and was still frozen when they came back to it. Same fault, same fix and
  // same reasoning as the prologue: a slow interval repaints whenever rAF has
  // gone quiet, so the picture keeps moving whether anyone is watching or not.
  const keepAlive = setInterval(() => {
    if (alive && performance.now() - lastDraw > 250) paint();
  }, 120);

  let shownPct = 0;
  /** Report real progress. `label` is what is actually happening right now. */
  function stage(label, pct) {
    if (label) stageEl.textContent = label;
    shownPct = Math.max(shownPct, Math.min(1, pct));
    const lit = Math.round(shownPct * CELLS);
    cells.forEach((c, i) => c.classList.toggle('on', i < lit));
    pctEl.textContent = `${Math.round(shownPct * 100)}%`;
  }

  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    clearInterval(tipTimer);
    clearInterval(keepAlive);
    root.remove();
  }

  /** Fade out and tear down. Resolves once the screen is gone. */
  function done(label = 'Ready!') {
    stage(label, 1);
    return new Promise((res) => {
      // Hold on the finished frame for a beat before fading. The scenes are
      // worth a look and the bar snapping to 100% and vanishing felt abrupt —
      // but this is still under two seconds, so it never becomes a wait.
      setTimeout(() => {
        root.classList.add('gone');
        setTimeout(() => { dispose(); res(); }, 900);
      }, 1100);
    });
  }

  return { el: root, key, stage, done, dispose };
}
