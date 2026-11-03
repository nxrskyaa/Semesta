// FISH MODELS — the real animal, not its bag icon.
//
// A catch used to fly out of the water as a spinning 16px sprite, so a Golden
// Koi and a Mossy Minnow came up as the same flat square in different colours.
// Each species now has a body: a LATHED hull (round in section, then squeezed
// sideways, because fish are laterally compressed — a round fish reads as a
// sausage), a forked tail on its own pivot so it can beat, dorsal and side
// fins, and big glossy eyes per the art direction.
//
// The colours are read off the species' OWN icon (the average of its lit
// pixels), so a fish added to ITEMS later gets a body that matches its icon
// without anybody writing a colour table. A handful of species have a shape
// that is the whole point of them — the eel is long, the puffer is round, the
// ray is a flat wing, the kraken has arms — and those are named in SHAPE_OF.
import * as THREE from 'three';
import { makeItemIconCanvas } from './textures.js';
import { SHARED } from './meshcache.js';

const SHAPE_OF = {
  fish_eel: 'long', fish_pike: 'long', fish_leviathan: 'serpent',
  fish_pufferfish: 'round', fish_sunfish: 'tall',
  fish_rayfin: 'flat', fish_kraken: 'kraken',
};
// species that carry their own light (they are caught at night, mostly)
const GLOW = { fish_lantern: 0xffd47a, fish_moonscale: 0xcfe4ff, fish_ghostcarp: 0xbfeeff,
  fish_aurorafish: 0x9cffd8, fish_leviathan: 0x7fe0ff, fish_kraken: 0xd08cff, fish_emberfin: 0xff9a4a };

const colourCache = new Map();
/** Average of an icon's lit, non-outline pixels. */
export function fishColour(id) {
  if (colourCache.has(id)) return colourCache.get(id);
  let col = new THREE.Color(0x8fb8c8);
  try {
    const c = makeItemIconCanvas(id);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      if (lum < 46 || lum > 238) continue;          // outline and glint
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n) col = new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
  } catch { /* icon painter unavailable: keep the default */ }
  colourCache.set(id, col);
  return col;
}

// --- shared geometry, built once per shape --------------------------------
const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) {
    const g = make();
    g[SHARED] = true;
    geoCache.set(key, g);
  }
  return geoCache.get(key);
}

/** A lathed body along +Z, nose at +len/2. `prof` maps 0..1 (tail..nose) to radius. */
function bodyGeo(key, len, prof) {
  return cached(`body:${key}`, () => {
    const pts = [];
    const N = 11;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(new THREE.Vector2(Math.max(0.001, prof(t)), (t - 0.5) * len));
    }
    const g = new THREE.LatheGeometry(pts, 10);
    g.rotateX(Math.PI / 2);         // lathe axis Y -> Z (nose forward)
    g.rotateX(Math.PI);             // keep the nose at +Z
    g.computeVertexNormals();
    return g;
  });
}

/** A flat fin from a list of [y, z] points (x = 0), fanned from the first. */
function finGeo(key, pts) {
  return cached(`fin:${key}`, () => {
    const pos = [];
    for (let i = 1; i < pts.length - 1; i++) {
      pos.push(0, pts[0][0], pts[0][1], 0, pts[i][0], pts[i][1], 0, pts[i + 1][0], pts[i + 1][1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  });
}

const eyeGeo = () => cached('eye', () => new THREE.SphereGeometry(0.05, 8, 6));
const glintGeo = () => cached('glint', () => new THREE.SphereGeometry(0.018, 6, 4));
const EYE_MAT = new THREE.MeshBasicMaterial({ color: 0x15121a });
const GLINT_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
EYE_MAT[SHARED] = GLINT_MAT[SHARED] = true;

const PROFILES = {
  std: (t) => Math.sin(Math.pow(t, 0.8) * Math.PI) * 0.21 + (t < 0.12 ? 0.02 : 0),
  long: (t) => Math.sin(Math.pow(t, 0.55) * Math.PI) * 0.1 + 0.015,
  round: (t) => Math.sin(t * Math.PI) * 0.34,
  tall: (t) => Math.sin(Math.pow(t, 0.9) * Math.PI) * 0.36,
  flat: (t) => Math.sin(Math.pow(t, 0.7) * Math.PI) * 0.16,
  kraken: (t) => (t < 0.35 ? 0.04 + t * 0.4 : Math.sin(((t - 0.35) / 0.65) * Math.PI * 0.5 + Math.PI * 0.5) * 0.3 + 0.03),
  serpent: (t) => Math.sin(Math.pow(t, 0.5) * Math.PI) * 0.12 + 0.02,
};

const modelCache = new Map();

/**
 * One model per species, built on first use and reused — only one fish is ever
 * on the line at a time, so there is nothing to clone.
 * Returns { root, tail, fins[], len, update(time, beat) }.
 */
export function buildFishModel(id) {
  if (modelCache.has(id)) return modelCache.get(id);
  const shape = SHAPE_OF[id] || 'std';
  const base = fishColour(id);
  const hsl = {}; base.getHSL(hsl);
  // push the body colour a little more saturated: an average of a pixel-art
  // icon is always muddier than the icon reads
  const body = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.25 + 0.08), Math.min(0.62, Math.max(0.3, hsl.l)));
  const belly = body.clone().lerp(new THREE.Color(0xfff6e8), 0.6);
  const finC = body.clone().offsetHSL(0.02, 0, -0.12);
  const glow = GLOW[id];
  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({
    color: c, emissive: glow ? new THREE.Color(glow).multiplyScalar(0.28) : 0x000000, ...extra });
  const bodyMat = mat(body);
  const bellyMat = mat(belly);
  const finMat = mat(finC, { side: THREE.DoubleSide, transparent: true, opacity: 0.92 });

  const root = new THREE.Group();
  const spine = new THREE.Group();   // the part that bends when it swims
  root.add(spine);
  const prof = PROFILES[shape] || PROFILES.std;
  const len = shape === 'long' ? 1.5 : shape === 'serpent' ? 1.9 : shape === 'round' ? 0.75
    : shape === 'tall' ? 0.8 : shape === 'flat' ? 0.7 : shape === 'kraken' ? 0.8 : 1;

  const hull = new THREE.Mesh(bodyGeo(shape, len, prof), bodyMat);
  // squeeze sideways: a fish is narrow, a ray is the opposite, a puffer is round
  const wide = shape === 'flat' ? 3.2 : shape === 'round' ? 0.92 : shape === 'kraken' ? 1 : shape === 'tall' ? 0.42 : 0.55;
  const tallK = shape === 'tall' ? 1.25 : shape === 'flat' ? 0.45 : 1;
  hull.scale.set(wide, tallK, 1);
  spine.add(hull);
  // the pale belly: the same hull, slightly smaller, pushed down
  if (shape !== 'kraken') {
    const bel = new THREE.Mesh(hull.geometry, bellyMat);
    bel.scale.set(wide * 0.86, tallK * 0.72, 0.9);
    bel.position.y = -0.055 * tallK;
    spine.add(bel);
  }

  const nose = len / 2;
  // eyes: big and glossy, set forward and high
  if (shape !== 'kraken') {
    const ex = shape === 'flat' ? 0.16 : shape === 'round' ? 0.24 : shape === 'tall' ? 0.11 : 0.085;
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo(), EYE_MAT);
      e.position.set(sx * ex, 0.05 * tallK + (shape === 'flat' ? 0.04 : 0), nose - len * 0.17);
      const g = new THREE.Mesh(glintGeo(), GLINT_MAT);
      g.position.set(sx * 0.03, 0.022, 0.025);
      e.add(g);
      spine.add(e);
    }
  }

  // tail on a pivot at the root of the body, so it can beat
  const tail = new THREE.Group();
  tail.position.z = -nose + 0.04;
  spine.add(tail);
  const fins = [];
  if (shape === 'kraken') {
    // a mantle with eyes on the side and six arms trailing behind it
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo(), EYE_MAT);
      e.scale.setScalar(1.3);
      e.position.set(sx * 0.24, 0.02, -0.02);
      const g = new THREE.Mesh(glintGeo(), GLINT_MAT);
      g.position.set(sx * 0.03, 0.03, 0.03);
      e.add(g);
      spine.add(e);
    }
    const armGeo = cached('kraken-arm', () => { const g = new THREE.ConeGeometry(0.05, 0.75, 5); g.rotateX(-Math.PI / 2); g.translate(0, 0, -0.375); return g; });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const arm = new THREE.Group();
      arm.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.1, 0);
      arm.add(new THREE.Mesh(armGeo, bodyMat));
      tail.add(arm);
      fins.push(arm);
    }
  } else if (shape === 'flat') {
    const whip = new THREE.Mesh(cached('ray-tail', () => { const g = new THREE.ConeGeometry(0.025, 0.7, 4); g.rotateX(-Math.PI / 2); g.translate(0, 0, -0.35); return g; }), finMat);
    tail.add(whip);
  } else {
    const fork = shape === 'long' || shape === 'serpent'
      ? finGeo('tail-long', [[0, 0], [0.11, -0.2], [0, -0.14], [-0.11, -0.2]])
      : shape === 'tall' ? finGeo('tail-tall', [[0, 0], [0.3, -0.12], [0, -0.1], [-0.3, -0.12]])
        : finGeo('tail', [[0, 0], [0.22, -0.3], [0, -0.19], [-0.22, -0.3]]);
    tail.add(new THREE.Mesh(fork, finMat));
    // dorsal fin along the back
    const dh = (shape === 'tall' ? 0.42 : 0.2) * tallK;
    const dorsal = new THREE.Mesh(
      finGeo(`dorsal:${shape}`, [[0, len * 0.18], [dh * 0.72, len * 0.02], [dh * 0.4, -len * 0.18], [0, -len * 0.2]]), finMat);
    dorsal.position.y = prof(0.55) * tallK - 0.02;
    spine.add(dorsal);
    if (shape === 'tall') {
      const anal = dorsal.clone();
      anal.scale.y = -1;
      anal.position.y = -dorsal.position.y;
      spine.add(anal);
    }
    // side fins, swept back
    for (const sx of [-1, 1]) {
      const pec = new THREE.Group();
      pec.position.set(sx * prof(0.62) * wide * 0.9, -0.04, nose - len * 0.3);
      const fin = new THREE.Mesh(finGeo('pec', [[0, 0], [0.04, -0.16], [-0.06, -0.12]]), finMat);
      fin.rotation.z = sx * 1.1;
      pec.add(fin);
      spine.add(pec);
      fins.push(pec);
    }
    if (shape === 'round') {
      // a puffer has spines
      const spikeGeo = cached('puff-spike', () => new THREE.ConeGeometry(0.025, 0.09, 4));
      for (let i = 0; i < 14; i++) {
        const u = Math.acos(1 - 2 * ((i + 0.5) / 14)), v = i * 2.4;
        const s = new THREE.Mesh(spikeGeo, finMat);
        const n = new THREE.Vector3(Math.sin(u) * Math.cos(v) * wide, Math.cos(u), Math.sin(u) * Math.sin(v) * 0.9);
        s.position.copy(n).multiplyScalar(0.32);
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.normalize());
        spine.add(s);
      }
    }
  }
  // a lure that carries its own light
  if (id === 'fish_lantern') {
    const stalk = new THREE.Mesh(cached('lure-stalk', () => new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4)), finMat);
    stalk.position.set(0, 0.28, nose - 0.12);
    stalk.rotation.x = 0.7;
    const bulb = new THREE.Mesh(cached('lure-bulb', () => new THREE.SphereGeometry(0.05, 8, 6)),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(0, 0.38, nose + 0.0);
    spine.add(stalk, bulb);
  }

  root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  const model = {
    root, tail, fins, len, shape,
    /** beat: 0 still, 1 thrashing hard */
    update(time, beat = 0.4) {
      const f = 5 + beat * 14;
      const a = 0.22 + beat * 0.45;
      if (shape === 'kraken') {
        fins.forEach((arm, i) => {
          arm.rotation.x = Math.sin(time * (3 + beat * 6) + i) * (0.3 + beat * 0.4);
          arm.rotation.y = Math.cos(time * (2.6 + beat * 5) + i * 1.7) * 0.25;
        });
        hull.scale.z = 1 + Math.sin(time * (3 + beat * 5)) * 0.08;
        return;
      }
      if (shape === 'flat') {
        // a ray FLIES: the wing tips beat, the body barely moves
        hull.scale.y = tallK * (1 + Math.sin(time * f * 0.5) * 0.25);
        tail.rotation.y = Math.sin(time * f * 0.4) * 0.3;
        return;
      }
      tail.rotation.y = Math.sin(time * f) * a;
      spine.rotation.y = -Math.sin(time * f - 0.6) * a * 0.22;
      for (const p of fins) p.rotation.y = Math.sin(time * f * 0.7 + p.position.x) * 0.3;
    },
  };
  modelCache.set(id, model);
  return model;
}

/** Real-world length for a catch, in cm, and the matching world-unit scale. */
const BASE_CM = { common: 18, uncommon: 27, rare: 40, epic: 56, legendary: 84, mythic: 140 };
export function rollFishSize(id, rarity, sea, rnd = Math.random) {
  let base = BASE_CM[rarity] || 20;
  if (sea) base *= 1.25;
  const shape = SHAPE_OF[id] || 'std';
  if (shape === 'long' || shape === 'serpent') base *= 1.35;
  if (shape === 'round') base *= 0.7;
  // a long tail: most fish are ordinary, a few are whoppers
  const k = 0.68 + Math.pow(rnd(), 1.8) * 0.85;
  const cm = Math.round(base * k * 10) / 10;
  // fish weigh roughly 0.011 * L^3 grams for a typical body; puffers and
  // sunfish are fatter, eels far thinner
  const fat = shape === 'round' || shape === 'tall' ? 1.8 : shape === 'long' || shape === 'serpent' ? 0.35 : 1;
  const kg = Math.round(0.011 * cm * cm * cm * fat / 10) / 100;
  // the strength of the fight follows the size of THIS fish, not just its tier
  return { cm, kg, k };
}

/** World units for a fish of `cm` — chibi scale, so small fish still read. */
// Measured at the gameplay camera (17 units out, 56 degrees down): at the first
// scale a 40cm fish was a 0.66-unit speck — about the size of the float.
export const fishWorldLen = (cm) => Math.min(2.0, 0.5 + cm / 100 * 1.1);
