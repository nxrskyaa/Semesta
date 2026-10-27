// THE CHRONICLE GATE — the door from Anavela into Semesta City.
//
// Semesta City is the other world of the Semesta Chronicle, a separate game at
// its own address. A link in a menu would technically do the job and would say
// nothing about it: a second world is a PLACE, so the way to it is a place too,
// standing on the Builder Hub where the people who make these worlds hang out.
//
// The gate is built to be readable from the water as you sail in: a standing
// ring on a stepped dais, a vortex turning inside it, rune stones orbiting the
// rim and motes being drawn in toward the middle. The motion is all one idea —
// things falling INTO the ring — so it reads as a doorway rather than a
// decoration that happens to glow. It also WAKES as you approach: the spin, the
// light and the inflow ease up over a second as you walk in, and ease back down
// when you leave, so the gate seems to notice you.
//
// Everything is procedural (canvas textures, primitives), per the house rule.
// The static stonework is a separate group from the animated parts so the
// Hub's `bakeStatic` can merge it; every moving part lives under `fx`, which is
// marked dynamic.

import * as THREE from 'three';
import { sharedMat, sharedCyl, sharedBox, sharedTorus } from '../gfx/meshcache.js';
import { drawText, textWidth } from '../gfx/signs.js';

export const CHRONICLE_URL = 'https://semestacity.vercel.app/';

const TAU = Math.PI * 2;
const RING_R = 1.95;          // centreline of the stone ring
const RING_Y = 2.72;          // ring centre above the dais base
const DISC_R = 1.7;           // the vortex, just inside the inner trim

const C = {
  stone: '#b9a684',
  stoneDark: '#8f7e60',
  trim: '#e8dcc0',
  mint: '#57e39f',
  glow: '#78ecff',
  violet: '#9a7cff',
};

/** A spiral, painted once. Two of these turning against each other is the vortex. */
function swirlTexture(armCol, coreCol, arms, twist, seed) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2;
  // a soft base so the disc is never a hole in the world
  const base = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  base.addColorStop(0, coreCol);
  base.addColorStop(0.45, 'rgba(60,90,200,0.35)');
  base.addColorStop(0.92, 'rgba(40,30,90,0.18)');
  base.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  // spiral arms, drawn as many short fading dabs along a log spiral
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  ctx.globalCompositeOperation = 'lighter';
  for (let a = 0; a < arms; a++) {
    const off = (a / arms) * TAU;
    for (let i = 0; i < 160; i++) {
      const t = i / 160;
      const r = 6 + t * (cx - 10);
      const ang = off + t * twist + (rnd() - 0.5) * 0.08;
      const x = cx + Math.cos(ang) * r, y = cx + Math.sin(ang) * r;
      const w = 2 + t * 9;
      const alpha = Math.sin(t * Math.PI) * 0.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w);
      g.addColorStop(0, armCol.replace('A', alpha.toFixed(3)));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, w, 0, TAU); ctx.fill();
    }
  }
  // a scatter of tiny bright points so it glitters while it turns
  for (let i = 0; i < 70; i++) {
    const r = rnd() * cx * 0.9, a = rnd() * TAU;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`;
    ctx.fillRect(cx + Math.cos(a) * r, cx + Math.sin(a) * r, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft round dot, for the motes and the core. Never a square: a square halo is not light. */
function dotTexture(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, 'rgba(160,230,255,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** The floating name over the ring, in the same bitmap face as every signboard. */
function titleTexture() {
  const top = 'SEMESTA CITY', sub = 'A SEMESTA CHRONICLE WORLD';
  const sTop = 4, sSub = 2;
  const w = Math.max(textWidth(top) * sTop, textWidth(sub) * sSub) + 24;
  const h = 7 * sTop + 7 * sSub + 26;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tx = (w - textWidth(top) * sTop) / 2;
  const sx = (w - textWidth(sub) * sSub) / 2;
  // a dark cut under the letters keeps them legible over a bright sky
  drawText(ctx, top, tx + 2, 8 + 2, sTop, 'rgba(10,20,40,0.75)');
  drawText(ctx, top, tx, 8, sTop, '#eafcff');
  ctx.fillStyle = C.glow;
  ctx.fillRect(sx, 8 + 7 * sTop + 5, textWidth(sub) * sSub, 1);
  drawText(ctx, sub, sx + 1, 8 + 7 * sTop + 10 + 1, sSub, 'rgba(10,20,40,0.75)');
  drawText(ctx, sub, sx, 8 + 7 * sTop + 10, sSub, '#9ff0ff');
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

function lam(color, opts) { return sharedMat(color, opts); }

/**
 * Build the gate. The returned group's origin is the dais centre at floor level;
 * the ring faces local -Z (rotate the group to aim it).
 */
export function buildChronicleGate() {
  const root = new THREE.Group();
  root.name = 'chronicleGate';
  const stoneworks = new THREE.Group();
  root.add(stoneworks);
  const fx = new THREE.Group();
  fx.userData.dynamic = true;
  root.add(fx);

  // ---- the dais: two octagonal steps with a lit inlay ring ----------------
  const step1 = new THREE.Mesh(sharedCyl(2.9, 3.05, 0.24, 8), lam(C.stoneDark));
  step1.position.y = 0.12;
  step1.rotation.y = Math.PI / 8;
  step1.receiveShadow = true;
  stoneworks.add(step1);
  const step2 = new THREE.Mesh(sharedCyl(2.3, 2.42, 0.22, 8), lam(C.stone));
  step2.position.y = 0.35;
  step2.rotation.y = Math.PI / 8;
  step2.receiveShadow = true;
  stoneworks.add(step2);
  const cap = new THREE.Mesh(sharedCyl(2.26, 2.3, 0.04, 8), lam(C.trim));
  cap.position.y = 0.48;
  cap.rotation.y = Math.PI / 8;
  stoneworks.add(cap);
  // the inlay glows, so it is animated: its own material
  const inlayMat = new THREE.MeshLambertMaterial({ color: C.mint, emissive: C.mint, emissiveIntensity: 0.8 });
  const inlay = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.045, 4, 48), inlayMat);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.245;
  fx.add(inlay);

  // a short flight of steps up to it from the plaza side
  for (let i = 0; i < 2; i++) {
    const st = new THREE.Mesh(sharedBox(1.9 - i * 0.3, 0.12, 0.45), lam(i ? C.stone : C.stoneDark));
    st.position.set(0, 0.06 + i * 0.12, -3.15 + i * 0.36);
    stoneworks.add(st);
  }

  // ---- the ring ----------------------------------------------------------
  const ringGroup = new THREE.Group();
  ringGroup.position.y = RING_Y;
  stoneworks.add(ringGroup);
  const ring = new THREE.Mesh(sharedTorus(RING_R, 0.26, 10, 48), lam(C.stone));
  ring.castShadow = true;
  ringGroup.add(ring);
  // an outer lip in the darker stone, so the ring reads as cut and not cast
  const lip = new THREE.Mesh(sharedTorus(RING_R + 0.24, 0.07, 6, 48), lam(C.stoneDark));
  ringGroup.add(lip);
  // keystones round the rim — a ring of voussoirs is what makes it a gate
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + Math.PI / 2;
    if (Math.sin(a) < -0.86) continue;          // the bottom sits in the feet
    const big = i === 0;
    const k = new THREE.Mesh(sharedBox(big ? 0.46 : 0.3, big ? 0.62 : 0.44, 0.66), lam(big ? C.trim : C.stoneDark));
    k.position.set(Math.cos(a) * (RING_R + 0.12), Math.sin(a) * (RING_R + 0.12), 0);
    k.rotation.z = a - Math.PI / 2;
    ringGroup.add(k);
  }
  // the feet the ring stands in
  for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(sharedBox(0.9, 0.72, 0.95), lam(C.stoneDark));
    foot.position.set(sx * 1.32, 0.5 + 0.36, 0);
    foot.castShadow = true;
    stoneworks.add(foot);
    const footCap = new THREE.Mesh(sharedBox(1.0, 0.1, 1.05), lam(C.trim));
    footCap.position.set(sx * 1.32, 0.5 + 0.77, 0);
    stoneworks.add(footCap);
  }

  // inner trim: gold, glowing, breathing — animated, so it lives in fx
  const trimMat = new THREE.MeshLambertMaterial({ color: '#f2d27a', emissive: '#ffcf6a', emissiveIntensity: 0.6 });
  const trim = new THREE.Mesh(new THREE.TorusGeometry(DISC_R + 0.04, 0.06, 6, 56), trimMat);
  trim.position.y = RING_Y;
  fx.add(trim);
  // the crown gem on the keystone
  const gemMat = new THREE.MeshLambertMaterial({ color: C.glow, emissive: C.glow, emissiveIntensity: 1.2 });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), gemMat);
  gem.position.set(0, RING_Y + RING_R + 0.62, 0);
  fx.add(gem);

  // ---- the vortex ----------------------------------------------------------
  const additive = (map, opacity) => new THREE.MeshBasicMaterial({
    map, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const discGeo = new THREE.CircleGeometry(DISC_R, 48);
  // the back plate: a deep, mostly opaque blue so the ring holds SOMETHING and
  // you do not see the colonnade through a doorway into another world
  const backMat = new THREE.MeshBasicMaterial({
    color: '#16224a', transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false,
  });
  const back = new THREE.Mesh(discGeo, backMat);
  back.position.y = RING_Y;
  back.renderOrder = 1;
  fx.add(back);
  const swirlA = new THREE.Mesh(discGeo, additive(
    swirlTexture('rgba(120,236,255,A)', 'rgba(220,250,255,0.95)', 3, 5.2, 71), 0.95));
  swirlA.position.set(0, RING_Y, 0.02);
  swirlA.renderOrder = 2;
  fx.add(swirlA);
  const swirlB = new THREE.Mesh(discGeo, additive(
    swirlTexture('rgba(170,130,255,A)', 'rgba(200,180,255,0.6)', 2, -4.0, 173), 0.75));
  swirlB.position.set(0, RING_Y, -0.02);
  swirlB.renderOrder = 2;
  fx.add(swirlB);
  const dot = dotTexture();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dot, color: '#dffaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  core.position.y = RING_Y;
  core.scale.setScalar(1.6);
  core.renderOrder = 3;
  fx.add(core);

  // ---- the orbiting rune stones -------------------------------------------
  const runePivot = new THREE.Group();
  runePivot.position.y = RING_Y;
  fx.add(runePivot);
  const runeMat = new THREE.MeshLambertMaterial({ color: C.mint, emissive: C.mint, emissiveIntensity: 1.0 });
  const runeGeo = new THREE.OctahedronGeometry(0.11, 0);
  const runes = [];
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(runeGeo, runeMat);
    r.userData.a = (i / 8) * TAU;
    r.userData.ph = i * 1.37;
    runePivot.add(r);
    runes.push(r);
  }

  // ---- the inflow: motes spiralling into the middle ------------------------
  const N = 64;
  const pos = new Float32Array(N * 3);
  const motes = [];
  for (let i = 0; i < N; i++) {
    motes.push({
      a: (i / N) * TAU * 3.1, r: 0.3 + ((i * 0.618) % 1) * 2.4,
      sp: 0.45 + ((i * 0.381) % 1) * 0.5, side: i % 2 ? 1 : -1,
    });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    map: dot, size: 0.2, color: '#b8f6ff', transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.position.y = RING_Y;
  points.frustumCulled = false;
  points.renderOrder = 3;
  fx.add(points);

  // ---- light on the ground -------------------------------------------------
  const poolMat = new THREE.MeshBasicMaterial({
    map: dotTexture('rgba(150,240,255,0.9)'), transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.51, -0.6);
  fx.add(pool);
  const light = new THREE.PointLight('#7fe8ff', 1.4, 11, 1.6);
  light.position.set(0, RING_Y, -0.9);
  fx.add(light);

  // ---- the name, floating over it -------------------------------------------
  const { tex: tTex, aspect } = titleTexture();
  const title = new THREE.Sprite(new THREE.SpriteMaterial({ map: tTex, transparent: true, depthWrite: false }));
  const th = 1.05;
  title.scale.set(th * aspect, th, 1);
  title.position.y = RING_Y + RING_R + 1.4;
  title.renderOrder = 4;
  fx.add(title);

  // ---- animation -----------------------------------------------------------
  const st = { t: 0, wake: 0, surge: 0 };

  /** `dist` — the hero's distance from the gate (Infinity if unknown). */
  function update(dt, dist = Infinity, night = 0) {
    if (dist > 90) return;                  // nobody can see it from there
    st.t += dt;
    // ease toward awake within 8u, back to idle outside it — never a snap
    const target = dist < 8 ? 1 : 0;
    st.wake += (target - st.wake) * Math.min(1, dt * 1.6);
    st.surge = Math.max(0, st.surge - dt * 0.9);
    const w = st.wake, s = st.surge;
    const t = st.t;

    const spin = 0.35 + w * 1.25 + s * 4;
    swirlA.rotation.z -= dt * spin;
    swirlB.rotation.z += dt * spin * 0.62;
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.9);
    swirlA.material.opacity = 0.7 + w * 0.25 + s * 0.3;
    swirlB.material.opacity = 0.45 + w * 0.3;
    core.scale.setScalar(1.25 + w * 0.6 + breathe * 0.25 + s * 2.2);
    core.material.opacity = 0.55 + w * 0.35 + s * 0.4;

    trimMat.emissiveIntensity = 0.45 + w * 0.6 + breathe * 0.25 + night * 0.4;
    inlayMat.emissiveIntensity = 0.35 + w * 0.9 + night * 0.5
      + 0.25 * Math.sin(t * 2.4 + 1.1);
    gemMat.emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 3.1) + w * 0.6;
    gem.rotation.y += dt * 1.4;
    gem.position.y = RING_Y + RING_R + 0.62 + Math.sin(t * 1.7) * 0.05;
    light.intensity = 1.0 + w * 1.6 + night * 0.9 + breathe * 0.3 + s * 3;
    poolMat.opacity = 0.32 + w * 0.3 + night * 0.15 + s * 0.4;

    runePivot.rotation.z += dt * (0.25 + w * 0.6);
    for (const r of runes) {
      const rr = RING_R + 0.62 + Math.sin(t * 1.3 + r.userData.ph) * 0.08;
      r.position.set(Math.cos(r.userData.a) * rr, Math.sin(r.userData.a) * rr,
        Math.sin(t * 0.9 + r.userData.ph) * 0.12);
      r.rotation.y += dt * 2;
    }
    runeMat.emissiveIntensity = 0.7 + w * 0.8;

    // motes: angle advances faster as they near the middle (a whirlpool, not a
    // carousel), radius shrinks, and each one respawns on the rim when it lands
    const inflow = 0.35 + w * 1.1 + s * 3;
    for (let i = 0; i < N; i++) {
      const m = motes[i];
      m.r -= dt * m.sp * inflow;
      m.a += dt * (0.6 + 1.6 / (0.4 + m.r)) * (0.5 + w);
      if (m.r < 0.08) { m.r = 2.2 + ((i * 0.73 + t) % 1) * 0.7; m.a = (i * 2.4 + t) % TAU; }
      const depth = Math.min(1, m.r / 2.4);
      pos[i * 3] = Math.cos(m.a) * m.r;
      pos[i * 3 + 1] = Math.sin(m.a) * m.r;
      pos[i * 3 + 2] = m.side * depth * 0.9;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.opacity = 0.45 + w * 0.5;

    title.position.y = RING_Y + RING_R + 1.4 + Math.sin(t * 1.2) * 0.08;
    title.material.opacity = 0.75 + w * 0.25;
  }

  /** A pulse of energy — the gate reacting when somebody steps through. */
  function surge() { st.surge = 1.4; }

  return { root, update, surge, ringY: RING_Y };
}

