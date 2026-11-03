// THE TITLE SCENE — the painted panorama behind the main menu.
//
// The old title was a bright daytime sky with clip-art clouds and floating
// islands drifting across it: pleasant, and nothing to do with this game. The
// story here is about LANTERNS — an order that kept a world's lights burning,
// the lights going out, and you relighting them — so the title shows exactly
// that: Anavela at nightfall from a cliff above it, the village lit on its
// hill, the sea under a big moon, the Rialo Hub's beacon turning out on the
// water, and sky lanterns rising out of the town. Your hero stands at the edge
// looking at it, with Spider beside them.
//
// It is PIXEL ART, painted procedurally at low resolution and upscaled
// `pixelated` like every other picture in the game. The canvas is sized to the
// viewport's aspect (fixed height, width follows) so a phone and a desktop
// both get a composed frame instead of a 16:9 picture cropped to a sliver.
//
// The camera is parallax: five layers at different depths slide against each
// other on a slow drift plus a little mouse follow, and the intro TILTS DOWN
// from the sky by moving the near layers further than the far ones. The static
// parts of each layer are painted once into an offscreen canvas; only the
// lights, the water, the lanterns and the hero's cape are drawn per frame.
//
// rAF only DRAWS. A slow interval repaints when rAF has been quiet (a hidden
// tab), the same rule as the loading screen and the prologue.

const H = 225;
const PAD = 48;                  // spare width each layer carries for parallax

function rng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function glow(ctx, x, y, r, inner) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function layerCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** A silhouette band from a list of points, filled down to the bottom. */
function band(ctx, pts, color, bottom) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], bottom);
  for (const [x, y] of pts) ctx.lineTo(Math.round(x), Math.round(y));
  ctx.lineTo(pts[pts.length - 1][0], bottom);
  ctx.closePath();
  ctx.fill();
}

/** Build the whole scene for a canvas `W` wide. Returns draw(ctx, t, cam). */
function buildScene(W) {
  const rnd = rng(1207);
  const LW = W + PAD * 2;
  const horizon = Math.round(H * 0.6);
  // composition, in fractions of the VISIBLE width so it recomposes per aspect
  const moonX = Math.round(PAD + W * 0.72), moonY = Math.round(H * 0.2);
  const shoreX = PAD + W * 0.56;            // land gives way to sea here
  const hubX = PAD + W * 0.84;
  // on a wide frame the menu owns the left third, so the hero stands just
  // right of it; on a portrait phone the list is at the bottom and they centre
  const heroX = PAD + W * (W < 200 ? 0.5 : 0.47);

  // ---- 0. sky (painted once; the stars twinkle per frame) ----------------
  const [sky, sc] = layerCanvas(LW, H);
  const g = sc.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1028');
  g.addColorStop(0.32, '#1c2752');
  g.addColorStop(0.5, '#3d3a6e');
  g.addColorStop(0.6, '#a5607a');
  g.addColorStop(0.64, '#e3966c');
  g.addColorStop(1, '#2a1c34');
  sc.fillStyle = g;
  sc.fillRect(0, 0, LW, H);
  glow(sc, moonX, horizon, W * 0.55, 'rgba(255,170,120,0.22)');
  // a long thin cloud bank, lit from below by the last of the sun
  for (let i = 0; i < 5; i++) {
    const cy = Math.round(H * (0.4 + i * 0.03));
    const cx = rnd() * LW, cw = 60 + rnd() * 120;
    sc.fillStyle = `rgba(${150 + i * 18},${90 + i * 10},${130 - i * 6},0.28)`;
    sc.fillRect(Math.round(cx - cw / 2), cy, Math.round(cw), 2);
    sc.fillRect(Math.round(cx - cw / 3), cy - 1, Math.round(cw * 0.6), 1);
  }
  const stars = [];
  for (let i = 0; i < Math.round(LW / 4); i++) {
    stars.push({ x: Math.round(rnd() * LW), y: Math.round(rnd() * H * 0.5),
      a: 0.25 + rnd() * 0.7, ph: rnd() * 6.28, sp: 0.6 + rnd() * 2.2, big: rnd() < 0.08 });
  }

  // ---- 1. far ridges (snowy, cold, almost sky) ----------------------------
  const [far, fc] = layerCanvas(LW, H);
  const ridgePts = (base, amp, step, seed) => {
    const r = rng(seed), pts = [];
    for (let x = -step; x <= LW + step; x += step) pts.push([x, base - r() * amp]);
    return pts;
  };
  const r1 = ridgePts(horizon - 6, 34, 22, 31);
  band(fc, r1, '#3b4170', H);
  // snow on the peaks: the top few pixels of every column above a line
  fc.globalCompositeOperation = 'source-atop';
  fc.fillStyle = 'rgba(220,226,255,0.55)';
  for (const [x, y] of r1) if (y < horizon - 26) fc.fillRect(Math.round(x) - 5, Math.round(y), 10, 3);
  fc.globalCompositeOperation = 'source-over';
  band(fc, ridgePts(horizon - 2, 18, 14, 47), '#2c3058', H);

  // ---- 2. the sea and the far island (the Hub) ----------------------------
  const [sea, ssc] = layerCanvas(LW, H);
  for (let y = horizon; y < H; y++) {
    const t = (y - horizon) / (H - horizon);
    ssc.fillStyle = `rgb(${Math.round(30 + 20 * (1 - t))},${Math.round(34 + 22 * (1 - t))},${Math.round(70 + 30 * (1 - t))})`;
    ssc.fillRect(0, y, LW, 1);
  }
  // the Hub: a low rounded island, two palms, the colonnade and the spire
  ssc.fillStyle = '#1a1c36';
  for (let dx = -24; dx <= 24; dx++) {
    const hgt = Math.round(5 * Math.sqrt(Math.max(0, 1 - (dx / 24) ** 2)));
    ssc.fillRect(Math.round(hubX + dx), horizon + 1 - hgt, 1, hgt + 1);
  }
  for (let i = -3; i <= 3; i++) if (i) ssc.fillRect(Math.round(hubX + i * 4), horizon - 8, 1, 4);
  ssc.fillRect(Math.round(hubX - 13), horizon - 9, 27, 1);
  ssc.fillRect(Math.round(hubX - 2), horizon - 17, 4, 12);
  ssc.fillRect(Math.round(hubX - 1), horizon - 21, 2, 4);
  for (const [px, lean] of [[-19, -1], [17, 1]]) {
    const bx = Math.round(hubX + px);
    for (let k = 0; k < 9; k++) ssc.fillRect(bx + Math.round((k / 9) * lean * 3), horizon - 3 - k, 1, 1);
    const tx = bx + lean * 3, ty = horizon - 12;
    ssc.fillRect(tx - 4, ty, 9, 1); ssc.fillRect(tx - 3, ty - 1, 7, 1);
    ssc.fillRect(tx - 5, ty + 1, 2, 1); ssc.fillRect(tx + 4, ty + 1, 2, 1);
  }

  // ---- 3. the village hill -------------------------------------------------
  const [mid, mc] = layerCanvas(LW, H);
  const hillPts = [];
  for (let x = -10; x <= LW + 10; x += 6) {
    const u = (x - PAD) / W;
    // a rise on the left, the village plateau, then the slope down to the shore
    let y = horizon - 4 - Math.sin(Math.min(1, Math.max(0, u / 0.6)) * Math.PI) * 30;
    if (x > shoreX) y = horizon + (x - shoreX) * 0.6;
    hillPts.push([x, y + Math.sin(x * 0.21) * 1.5]);
  }
  band(mc, hillPts, '#1d1b33', H);
  const hillY = (x) => {
    for (let i = 1; i < hillPts.length; i++) {
      if (hillPts[i][0] >= x) {
        const [x0, y0] = hillPts[i - 1], [x1, y1] = hillPts[i];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
      }
    }
    return horizon;
  };
  // huts along the plateau, each with a lit window
  const windows = [], lamps = [];
  const v0 = PAD + W * 0.12, v1 = PAD + W * 0.5;
  for (let x = v0; x < v1; x += 9 + rnd() * 7) {
    const base = Math.round(hillY(x)) + 1;
    const w = 7 + Math.round(rnd() * 4), h = 5 + Math.round(rnd() * 3);
    mc.fillStyle = '#15132a';
    mc.fillRect(Math.round(x), base - h, w, h);
    // roof: stepped triangle
    for (let i = 0; i < 4; i++) mc.fillRect(Math.round(x) - 1 + i, base - h - 1 - i, w + 2 - i * 2, 1);
    windows.push({ x: Math.round(x + w / 2 - 1), y: base - h + 2, ph: rnd() * 6.28 });
    if (rnd() < 0.5) lamps.push({ x: Math.round(x + w + 2), y: base - 5, ph: rnd() * 6.28 });
  }
  // the shrine's tall spire in the middle of the town
  const shrineX = Math.round(PAD + W * 0.3);
  const sy = Math.round(hillY(shrineX));
  mc.fillStyle = '#15132a';
  mc.fillRect(shrineX - 3, sy - 16, 6, 16);
  mc.fillRect(shrineX - 5, sy - 18, 10, 2);
  mc.fillRect(shrineX - 1, sy - 24, 2, 6);
  const shrineLight = { x: shrineX, y: sy - 25 };
  // a windmill on the rise to the left, blades drawn per frame
  const millX = Math.round(PAD + W * 0.06), millY = Math.round(hillY(PAD + W * 0.06));
  mc.fillRect(millX - 2, millY - 14, 4, 14);
  mc.fillRect(millX - 3, millY - 15, 6, 2);

  // ---- 4. the near cliff, the hero and the cat ------------------------------
  const [near, nc] = layerCanvas(LW, H);
  const ledge = [];
  for (let x = -10; x <= LW + 10; x += 4) {
    const u = (x - heroX) / W;
    // the ledge rises where the hero stands and falls away on both sides
    const y = H - 22 - Math.max(0, 1 - Math.abs(u) * 2.2) * 22 + Math.sin(x * 0.37) * 1.2
      + (u > 0.35 ? (u - 0.35) * 90 : 0);
    ledge.push([x, Math.min(H + 2, y)]);
  }
  band(nc, ledge, '#0a0a16', H);
  const ledgeY = (x) => {
    for (let i = 1; i < ledge.length; i++) {
      if (ledge[i][0] >= x) {
        const [x0, y0] = ledge[i - 1], [x1, y1] = ledge[i];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
      }
    }
    return H;
  };
  // a moon-rim along the top of the ledge
  nc.fillStyle = 'rgba(160,150,220,0.35)';
  for (const [x, y] of ledge) nc.fillRect(Math.round(x), Math.round(y), 4, 1);
  // a stone lantern on the left, cropped by the frame edge
  const ltX = Math.round(PAD + W * 0.06), ltY = Math.round(ledgeY(ltX));
  nc.fillStyle = '#07070f';
  nc.fillRect(ltX - 6, ltY - 4, 12, 4);
  nc.fillRect(ltX - 2, ltY - 22, 4, 18);
  nc.fillRect(ltX - 6, ltY - 25, 12, 3);
  for (let i = 0; i < 5; i++) nc.fillRect(ltX - 9 + i, ltY - 35 - i, 18 - i * 2, 1);
  const lanternPane = { x: ltX - 4, y: ltY - 33 };
  // grass tufts along the ledge, precomputed and swayed per frame
  const grass = [];
  for (let x = -6; x < LW + 6; x += 2 + rnd() * 3) {
    if (rnd() < 0.35) continue;
    grass.push({ x, base: Math.round(ledgeY(x)) + 1, h: 2 + rnd() * 5, ph: rnd() * 6.28 });
  }
  const heroY = Math.round(ledgeY(heroX));
  const catX = heroX + 9, catY = Math.round(ledgeY(heroX + 9));

  // ---- particles ----------------------------------------------------------
  // sky lanterns: born in the village, drift up and toward the sea, fade high
  const lanterns = Array.from({ length: 22 }, (_, i) => ({
    seed: i, x0: v0 + rnd() * (v1 - v0), born: rnd() * 30, life: 22 + rnd() * 14,
    drift: 0.25 + rnd() * 0.5, sway: rnd() * 6.28, size: rnd() < 0.25 ? 2 : 1,
  }));
  const flies = Array.from({ length: 16 }, () => ({
    x: rnd() * LW, y: H - 40 + rnd() * 30, ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.5,
  }));

  /**
   * @param cam { x, y } pixel offsets; x is the horizontal drift, y the intro
   *   tilt (positive = looking further up the sky).
   */
  function draw(ctx, t, cam) {
    const ox = (depth) => Math.round(-PAD - cam.x * depth);
    const oy = (depth) => Math.round(cam.y * depth);

    // sky + stars
    ctx.drawImage(sky, ox(0.05), 0);
    const sx = ox(0.05);
    for (const s of stars) {
      const a = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
      ctx.fillStyle = `rgba(255,250,235,${a.toFixed(3)})`;
      ctx.fillRect(s.x + sx, s.y, 1, 1);
      if (s.big && a > 0.6) {
        ctx.fillStyle = `rgba(255,250,235,${(a * 0.4).toFixed(3)})`;
        ctx.fillRect(s.x + sx - 1, s.y, 3, 1);
        ctx.fillRect(s.x + sx, s.y - 1, 1, 3);
      }
    }
    // a shooting star every ~9 seconds
    const st = (t % 9) / 9;
    if (st < 0.09) {
      const k = st / 0.09;
      const x0 = sx + LW * 0.25, y0 = H * 0.08;
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = `rgba(255,255,255,${((1 - i / 10) * (1 - k)).toFixed(3)})`;
        ctx.fillRect(Math.round(x0 + k * 90 - i * 2), Math.round(y0 + k * 34 - i * 0.75), 1, 1);
      }
    }
    // the moon, breathing very slightly
    const mx = moonX + ox(0.08), my = moonY + oy(0.08);
    glow(ctx, mx, my, 30 + Math.sin(t * 0.7) * 2, 'rgba(255,240,210,0.32)');
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(210,190,160,0.5)';
    ctx.fillRect(mx - 4, my - 3, 3, 2); ctx.fillRect(mx + 3, my + 2, 2, 2); ctx.fillRect(mx - 1, my + 4, 2, 1);

    ctx.drawImage(far, ox(0.15), oy(0.15));
    // the sea + moon path + the Hub's turning beacon
    const so = ox(0.3), soy = oy(0.3);
    ctx.drawImage(sea, so, soy);
    for (let y = horizon + 1; y < H; y += 2) {
      const k = (y - horizon) / (H - horizon);
      const w = 4 + k * 26 * (0.6 + 0.4 * Math.sin(t * 1.3 + y * 0.9));
      ctx.fillStyle = `rgba(255,236,200,${(0.45 * (1 - k * 0.5)).toFixed(3)})`;
      ctx.fillRect(Math.round(mx - w / 2 + Math.sin(t * 0.9 + y) * 2), y + soy, Math.round(w), 1);
    }
    const bx = Math.round(hubX + so), by = horizon - 21 + soy;
    const beam = (t * 0.6) % (Math.PI * 2);
    const bl = 70 * Math.abs(Math.cos(beam));
    ctx.fillStyle = 'rgba(140,240,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.sign(Math.cos(beam)) * bl, by - 6);
    ctx.lineTo(bx + Math.sign(Math.cos(beam)) * bl, by + 4);
    ctx.closePath(); ctx.fill();
    glow(ctx, bx, by, 6, 'rgba(140,240,255,0.9)');

    // the village
    const mo = ox(0.5), moy = oy(0.5);
    ctx.drawImage(mid, mo, moy);
    for (const w of windows) {
      const a = 0.75 + 0.25 * Math.sin(t * 2.3 + w.ph);
      glow(ctx, w.x + mo + 1, w.y + moy + 1, 4, `rgba(255,190,110,${(0.35 * a).toFixed(3)})`);
      ctx.fillStyle = `rgba(255,214,140,${a.toFixed(3)})`;
      ctx.fillRect(w.x + mo, w.y + moy, 2, 2);
    }
    for (const l of lamps) {
      const a = 0.7 + 0.3 * Math.sin(t * 5.1 + l.ph) * Math.sin(t * 3.3 + l.ph * 2);
      glow(ctx, l.x + mo, l.y + moy, 6, `rgba(255,170,90,${(0.45 * a).toFixed(3)})`);
      ctx.fillStyle = '#ffd38a';
      ctx.fillRect(l.x + mo, l.y + moy, 1, 2);
    }
    glow(ctx, shrineLight.x + mo, shrineLight.y + moy, 9, 'rgba(120,236,200,0.55)');
    ctx.fillStyle = '#c9fff0';
    ctx.fillRect(shrineLight.x + mo - 1, shrineLight.y + moy - 1, 2, 2);
    // windmill blades
    const ang = t * 0.5;
    ctx.fillStyle = '#15132a';
    for (let i = 0; i < 4; i++) {
      const a = ang + (i * Math.PI) / 2;
      for (let r = 2; r < 11; r++) {
        ctx.fillRect(Math.round(millX + mo + Math.cos(a) * r), Math.round(millY - 14 + moy + Math.sin(a) * r), 2, 1);
      }
    }

    // sky lanterns, in front of the hill and behind the cliff
    for (const L of lanterns) {
      const age = ((t + L.born) % L.life) / L.life;
      const x = L.x0 + mo + age * 90 * L.drift + Math.sin(t * 0.8 + L.sway) * 2;
      const y = horizon - 4 + moy - age * (horizon + 10);
      const a = Math.min(1, age * 8) * (1 - Math.max(0, age - 0.7) / 0.3);
      if (a <= 0) continue;
      glow(ctx, x, y, 4 + L.size * 2, `rgba(255,160,70,${(0.4 * a).toFixed(3)})`);
      ctx.fillStyle = `rgba(255,214,140,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(x), Math.round(y), L.size + 1, L.size + 2);
    }

    // the near cliff
    const no = ox(1), noy = oy(1);
    ctx.drawImage(near, no, noy);
    // the stone lantern's lit pane — flicker on two rhythms so it reads as fire
    const fl = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 4.1 + 1);
    glow(ctx, lanternPane.x + 4 + no, lanternPane.y + 3 + noy, 22, `rgba(255,170,80,${(0.35 * fl).toFixed(3)})`);
    ctx.fillStyle = `rgba(255,220,150,${fl.toFixed(3)})`;
    ctx.fillRect(lanternPane.x + no, lanternPane.y + noy, 8, 6);
    // grass
    ctx.fillStyle = '#0a0a16';
    for (const b of grass) {
      const lean = Math.sin(t * 1.4 + b.ph) * b.h * 0.25;
      for (let y = 0; y < b.h; y++) {
        ctx.fillRect(Math.round(b.x + no + (lean * y) / b.h), b.base + noy - y, y < b.h * 0.5 ? 2 : 1, 1);
      }
    }
    // THE HERO, back to us, looking out. Chibi: the head is as wide as the body.
    const hx = Math.round(heroX + no), hy = heroY + noy;
    const ink = '#05050c', rim = 'rgba(190,180,255,0.6)';
    // cape, fluttering toward the sea on the breeze
    const flap = Math.sin(t * 2.1) * 1.5 + Math.sin(t * 3.7) * 0.8;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 12);
    ctx.lineTo(hx + 4, hy - 12);
    ctx.lineTo(hx + 8 + flap, hy - 2);
    ctx.lineTo(hx + 1 + flap * 0.5, hy - 1);
    ctx.lineTo(hx - 4, hy - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(hx - 3, hy - 13, 6, 9);        // body
    ctx.fillRect(hx - 3, hy - 4, 2, 4);          // legs
    ctx.fillRect(hx + 1, hy - 4, 2, 4);
    ctx.beginPath(); ctx.arc(hx, hy - 18, 5.5, 0, Math.PI * 2); ctx.fill();   // head
    ctx.fillRect(hx + 4, hy - 13, 1, 9);         // the sword on their back
    ctx.fillRect(hx + 3, hy - 14, 3, 1);
    ctx.fillStyle = rim;                          // moonlight down the right edge
    ctx.fillRect(hx + 5, hy - 20, 1, 4);
    ctx.fillRect(hx + 3, hy - 12, 1, 7);
    // SPIDER, sitting, tail curling
    const cx = Math.round(catX + no), cy = catY + noy;
    ctx.fillStyle = ink;
    ctx.fillRect(cx - 2, cy - 4, 5, 4);
    ctx.fillRect(cx - 2, cy - 7, 4, 3);
    ctx.fillRect(cx - 2, cy - 8, 1, 1); ctx.fillRect(cx + 1, cy - 8, 1, 1);  // ears
    const tail = Math.sin(t * 1.6) * 1.5;
    ctx.fillRect(cx + 3, cy - 2, 2, 1);
    ctx.fillRect(Math.round(cx + 5 + tail * 0.3), cy - 4, 1, 2);
    ctx.fillRect(Math.round(cx + 4 + tail), cy - 5, 1, 1);
    ctx.fillStyle = rim;
    ctx.fillRect(cx + 1, cy - 7, 1, 3);

    // fireflies in the near field
    for (const f of flies) {
      const x = f.x + no + Math.sin(t * f.sp + f.ph) * 12;
      const y = f.y + noy + Math.sin(t * f.sp * 1.7 + f.ph) * 6;
      const a = 0.5 + 0.5 * Math.sin(t * 2.6 + f.ph * 3);
      glow(ctx, x, y, 3, `rgba(200,255,140,${(0.5 * a).toFixed(3)})`);
      ctx.fillStyle = `rgba(230,255,180,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  return draw;
}

/**
 * Mount the scene into `canvas`. Returns { setIntro(k), stop() }.
 * `setIntro(k)` takes 0..1 — 0 is looking up at the sky, 1 is the settled view.
 */
export function createTitleScene(canvas) {
  const ctx = canvas.getContext('2d');
  let draw = null, W = 0;
  function resize() {
    // a portrait phone is cropped at the sides by object-fit rather than squeezed
    // into a 100-pixel-wide strip, so the scene keeps its proportions
    const aspect = Math.max(0.7, Math.min(2.6, innerWidth / Math.max(1, innerHeight)));
    const w = Math.round(H * aspect);
    if (w === W && draw) return;
    W = w;
    canvas.width = W; canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    draw = buildScene(W);
  }
  resize();
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); };
  addEventListener('resize', onResize);

  // a little mouse follow, eased, so the parallax answers the pointer
  let mx = 0, mxs = 0;
  const onMove = (e) => { mx = (e.clientX / Math.max(1, innerWidth) - 0.5) * 2; };
  addEventListener('pointermove', onMove);

  let intro = 0;
  const t0 = performance.now();
  let raf = 0, alive = true, last = 0;
  function paint() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    mxs += (mx - mxs) * Math.min(1, dt * 2.5);
    const e = 1 - Math.pow(1 - intro, 3);
    draw(ctx, t, { x: Math.sin(t * 0.06) * 14 + mxs * 10, y: (1 - e) * 90 });
  }
  function loop() {
    if (!alive) return;
    paint();
    raf = requestAnimationFrame(loop);
  }
  loop();
  const keep = setInterval(() => { if (alive && performance.now() - last > 250) paint(); }, 120);

  return {
    setIntro(k) { intro = Math.max(0, Math.min(1, k)); },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      clearInterval(keep);
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onMove);
    },
  };
}
