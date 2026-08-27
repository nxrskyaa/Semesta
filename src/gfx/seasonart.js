// SEASON BANNERS — the painted headline for each GamePass season.
//
// The pass panel opened on a gradient rectangle with the season's name written
// on it. That is a label, not a banner: a season is the thing the whole panel is
// selling, and it was being announced by a coloured box. Every other headline
// surface in this game is painted pixel art -- the loading screen's five
// vignettes, the capsule machine, the Chronicle Card -- and the one screen that
// exists to make somebody want something was the exception.
//
// So each of the four seasons gets a scene, painted on a 240x84 canvas and
// upscaled `pixelated` like everything else here. They follow the loading
// screen's grammar because it works: a sky gradient, layered silhouette ridges,
// ONE focal element, one particle system -- plus the thing that pass taught,
// which is that a near-field shape cropped by the frame is what gives a small
// picture any depth at all.
//
// Deterministic: same season, same picture, on every machine and every open.
const W = 240, H = 84;

function rng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A jagged silhouette band. `off` slides it, so two ranges can differ. */
function ridge(ctx, rnd, baseY, amp, color, step = 12, off = 0) {
  ctx.fillStyle = color;
  const n = Math.ceil(W / step) + 3;
  const pts = Array.from({ length: n }, () => baseY + (rnd() - 0.5) * amp);
  ctx.beginPath();
  ctx.moveTo(-step, H);
  for (let i = 0; i < n; i++) ctx.lineTo(i * step - off - step, Math.round(pts[i]));
  ctx.lineTo(W + step, H);
  ctx.closePath();
  ctx.fill();
}

/** A soft radial pool. Never a fillRect — a square halo is not light. */
function glow(ctx, x, y, r, inner) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
}

/** One of Anavela's stone lanterns, the most recognisable object in the game. */
function lantern(ctx, x, y, s, lit) {
  ctx.fillStyle = '#20293a';
  ctx.fillRect(x - 5 * s, y - 3 * s, 10 * s, 3 * s);
  ctx.fillRect(x - 2 * s, y - 14 * s, 4 * s, 11 * s);
  ctx.fillRect(x - 5 * s, y - 17 * s, 10 * s, 3 * s);
  if (lit) {
    glow(ctx, x, y - 22 * s, 22 * s, 'rgba(255,200,110,0.5)');
    ctx.fillStyle = '#ffe2a0';
  } else ctx.fillStyle = '#4a5568';
  ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 8 * s);
  ctx.fillStyle = '#20293a';
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 8 * s + i * s, y - 27 * s - i * s, 16 * s - i * 2 * s, s);
}

const PAINTERS = {
  // 01 — the order's road, and the job the whole game is about
  lantern_road(rnd) {
    return (ctx) => {
      sky(ctx, [[0, '#141d33'], [0.55, '#26314d'], [1, '#3a4460']]);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,255,240,${0.25 + rnd() * 0.6})`;
        ctx.fillRect((rnd() * W) | 0, (rnd() * 46) | 0, 1, 1);
      }
      ridge(ctx, rng(11), 54, 14, '#1b2438', 18);
      ridge(ctx, rng(29), 66, 8, '#131a2b', 14);
      // the road recedes: lanterns get smaller and closer together
      lantern(ctx, 196, 84, 0.5, true);
      lantern(ctx, 150, 78, 0.36, true);
      lantern(ctx, 118, 74, 0.26, true);
      lantern(ctx, 98, 71, 0.19, false);
      // NEAR FIELD: grass cropped by the bottom edge
      ctx.fillStyle = '#0b1220';
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, h = 3 + rnd() * 9;
        for (let y = 0; y < h; y++) ctx.fillRect(x | 0, H - y, y > h * 0.6 ? 1 : 2, 1);
      }
    };
  },
  // 02 — the sea at dusk, with something burning on the far shore
  tide_ember(rnd) {
    return (ctx) => {
      sky(ctx, [[0, '#3b2350'], [0.42, '#8c4a55'], [0.72, '#e08a4c'], [1, '#f5b866']]);
      glow(ctx, 172, 56, 40, 'rgba(255,214,140,0.55)');
      ctx.fillStyle = '#ffe6b0';
      ctx.beginPath(); ctx.arc(172, 56, 11, 0, 6.283); ctx.fill();
      ridge(ctx, rng(41), 52, 10, '#5c2f45', 20);
      // the sea: banded, brightest under the sun
      for (let y = 58; y < H; y++) {
        const t = (y - 58) / (H - 58);
        ctx.fillStyle = `rgb(${30 + t * 20},${52 + t * 26},${78 + t * 30})`;
        ctx.fillRect(0, y, W, 1);
        if ((y % 2) === 0) {
          // widens as it comes toward you, and each band is jittered so it
          // glitters rather than marching in step
          const spread = 3 + (y - 58) * 1.5;
          const w = spread * (0.55 + ((y * 13) % 7) / 12);
          ctx.fillStyle = `rgba(255,214,150,${0.34 * (1 - t * 0.55)})`;
          ctx.fillRect(172 - w / 2 + (((y * 11) % 9) - 4), y, w, 1);
        }
      }
      // NEAR FIELD: a mooring post and its rope, cropped by the frame
      ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(22, 62); ctx.quadraticCurveTo(46, 78, 68, 66); ctx.stroke();
      ctx.fillStyle = '#241628';
      ctx.fillRect(18, 60, 9, H - 60);
      ctx.fillRect(64, 64, 7, H - 64);
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(25, 62, 2, H - 62);
    };
  },
  // 03 — the winter reach: aurora, frost conifers, snow
  long_frost(rnd) {
    return (ctx) => {
      sky(ctx, [[0, '#101a2e'], [0.5, '#24405e'], [1, '#6f9ab8']]);
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = ['rgba(120,240,200,0.16)', 'rgba(150,190,255,0.14)', 'rgba(200,150,255,0.12)'][b];
        ctx.beginPath();
        ctx.moveTo(0, 16 + b * 9);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 16 + b * 9 + Math.sin(x * 0.045 + b * 1.7) * 7);
        for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, 30 + b * 9 + Math.sin(x * 0.05 + b) * 6);
        ctx.closePath(); ctx.fill();
      }
      ridge(ctx, rng(61), 56, 10, '#2c4560', 18);
      ridge(ctx, rng(83), 68, 6, '#cfe4f0', 12);
      // frost conifers, smaller toward the back
      // A CONE, not a stack of blobs. Each course is narrower AND higher than
      // the one below by a clear margin, and the tree is tall enough relative
      // to its width to read as a conifer at 240 pixels across.
      const tree = (x, y, s, c) => {
        ctx.fillStyle = '#33455a';
        ctx.fillRect(x - s * 0.6, y - s * 2.4, s * 1.2, s * 2.4);
        ctx.fillStyle = c;
        for (let i = 0; i < 5; i++) {
          const w = s * (6.2 - i * 1.15);
          const yy = y - s * (2.2 + i * 2.0);
          ctx.fillRect(x - w / 2, yy - s * 1.5, w, s * 1.6);
        }
        ctx.fillRect(x - s * 0.4, y - s * 12.4, s * 0.8, s * 1.4);   // the spire
      };
      tree(36, 78, 2.6, '#eaf5fa'); tree(212, 76, 2.2, '#e0eef7');
      tree(92, 72, 1.5, '#d2e5f0'); tree(158, 71, 1.3, '#c9deec');
      // a drift banked against the bottom edge, and snowfall over everything
      ctx.fillStyle = '#f2fbff';
      ctx.beginPath(); ctx.moveTo(-2, H);
      for (let x = -2; x <= W + 2; x += 10) ctx.lineTo(x, H - 5 - Math.sin(x * 0.06) * 3);
      ctx.lineTo(W + 2, H); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.5})`;
        ctx.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1, 1);
      }
    };
  },
  // 04 — Hollowtide: the dungeon's own season, the one that is not cosy
  hollowtide(rnd) {
    return (ctx) => {
      sky(ctx, [[0, '#0a0710'], [0.6, '#1e0f18'], [1, '#3a1512']]);
      glow(ctx, 120, 88, 74, 'rgba(255,110,50,0.34)');
      // the arch: the thing you walk into, dead centre, mostly unlit
      ctx.fillStyle = '#140d14';
      ctx.fillRect(92, 26, 56, H - 26);
      ctx.fillStyle = '#2a1a22';
      ctx.fillRect(96, 30, 48, H - 30);
      ctx.fillStyle = '#050308';
      ctx.beginPath();
      ctx.moveTo(106, H); ctx.lineTo(106, 52);
      ctx.quadraticCurveTo(120, 34, 134, 52); ctx.lineTo(134, H);
      ctx.closePath(); ctx.fill();
      // embers rising out of it
      for (let i = 0; i < 26; i++) {
        const y = 20 + rnd() * 60;
        ctx.fillStyle = `rgba(255,${130 + ((y * 3) | 0) % 90},60,${0.35 + rnd() * 0.5})`;
        ctx.fillRect((108 + rnd() * 24) | 0, y | 0, 1, 1);
      }
      ridge(ctx, rng(97), 62, 12, '#160c14', 16);
      // two braziers in the near field, cropped low
      for (const bx of [30, 210]) {
        glow(ctx, bx, 62, 26, 'rgba(255,140,60,0.42)');
        ctx.fillStyle = '#1a1016';
        ctx.fillRect(bx - 7, 66, 14, H - 66);
        ctx.fillStyle = '#ff9040';
        ctx.fillRect(bx - 5, 58, 10, 8);
        ctx.fillStyle = '#ffd9a0';
        ctx.fillRect(bx - 2, 55, 4, 6);
      }
    };
  },
};

const ORDER = ['lantern_road', 'tide_ember', 'long_frost', 'hollowtide'];
const cache = new Map();

/**
 * A painted banner for season `index` (0-3), as a data URL.
 * Cached: the panel re-renders on every claim and this must not repaint.
 */
export function seasonBannerUrl(index) {
  const key = ORDER[((index % ORDER.length) + ORDER.length) % ORDER.length];
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  PAINTERS[key](rng(key.length * 7919 + 17))(ctx);
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}

export const SEASON_ART_ORDER = ORDER;
