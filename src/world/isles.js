// The archipelago dressing. terrain.js raises the islands out of the sea; this
// module puts things ON them, plus the marina on the mainland coast where the
// watercraft are moored.
//
// Islands are deliberately tropical — mainland decor (pines, sakura, snow trees)
// skips island cells so the two biomes never bleed into each other. Every island
// has one silhouette you can recognise from the water, because "which island is
// that?" should be answerable at a glance.
import * as THREE from 'three';
import { WATER_Y, WATER_LEVEL } from './terrain.js';
import { getQuality } from '../gfx/quality.js';
import { disposeObject } from '../util/dispose.js';
import { boxMesh, cylMesh, sphereMesh, sharedMat } from '../gfx/meshcache.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';

// every part here is static prop geometry, so it all shares from the cache —
// the only exceptions are the lantern shades, which pulse their own emissive
const mat = (c, opts = {}) => sharedMat(c, opts);
const box = (w, h, d, c, opts) => boxMesh(w, h, d, c, opts);
const cyl = (rt, rb, h, c, seg = 7) => cylMesh(rt, rb, h, c, seg);

// ---------------------------------------------------------------------------
// a palm: leaning trunk built from stacked segments + a fan of drooping fronds
// and a cluster of coconuts. The lean is what makes it read as a palm and not
// a lollipop on a stick.
// ---------------------------------------------------------------------------
function buildPalm(rng) {
  const g = new THREE.Group();
  const H = 2.6 + rng() * 1.5;
  const lean = (rng() - 0.5) * 0.55;
  const segs = 4;
  const trunkC = ['#8a6a44', '#7a5c3c'][rng() < 0.5 ? 0 : 1];
  let px = 0, pz = 0;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const seg = cyl(0.11 - t * 0.03, 0.14 - t * 0.03, H / segs + 0.03, i % 2 ? trunkC : '#96754d');
    // the trunk curves: each ring drifts further along the lean
    px += Math.sin(lean) * (H / segs) * (0.25 + t * 0.5);
    pz += Math.cos(lean) * 0.02 * t;
    seg.position.set(px, (i + 0.5) * (H / segs), pz);
    seg.rotation.z = -lean * (0.3 + t * 0.7);
    g.add(seg);
  }
  const crown = new THREE.Group();
  crown.position.set(px, H, pz);
  g.add(crown);

  const fronds = 5;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng() * 0.3;
    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    crown.add(pivot);
    // each frond is 3 tapering blades that droop harder toward the tip
    const L = 1.15 + rng() * 0.4;
    // two tapering blades per frond instead of three: the droop still reads and
    // it cuts a third of the palm's mesh count
    for (let s = 0; s < 2; s++) {
      const st = s / 2;
      const blade = box(L / 2 + 0.05, 0.045, 0.42 - st * 0.14, s === 0 ? '#5aa845' : '#468c36');
      blade.position.set(L / 2 * (s + 0.5), -st * st * 0.62 - 0.02, 0);
      blade.rotation.z = -0.2 - st * 1.0;
      pivot.add(blade);
    }
    pivot.userData.phase = rng() * Math.PI * 2;
  }
  // coconuts tucked under the crown
  const nuts = Math.floor(rng() * 3);
  for (let i = 0; i < nuts; i++) {
    const n = sphereMesh(0.1, '#6b4a2c', 6, 5);
    const a = rng() * Math.PI * 2;
    n.position.set(Math.cos(a) * 0.17, -0.13, Math.sin(a) * 0.17);
    crown.add(n);
  }
  g.userData.crown = crown;
  return g;
}

/** A little sun-bleached torii on a rock, the island answer to the shrine. */
function buildTorii() {
  const g = new THREE.Group();
  const C = '#d8543c', D = '#b8402c';
  for (const sx of [-0.6, 0.6]) {
    const leg = cyl(0.09, 0.11, 2.0, C);
    leg.position.set(sx, 1.0, 0);
    g.add(leg);
  }
  const lintel = box(1.75, 0.13, 0.2, D);
  lintel.position.y = 1.72; g.add(lintel);
  const top = box(2.1, 0.12, 0.28, C);
  top.position.y = 1.98; g.add(top);
  const cap = box(2.25, 0.08, 0.36, D);
  cap.position.y = 2.07; g.add(cap);
  const post = box(0.12, 0.3, 0.14, D);
  post.position.y = 1.85; g.add(post);
  return g;
}

/** Half a hull sticking out of the sand — the wreck island's landmark. */
function buildWreck(rng) {
  const g = new THREE.Group();
  const hull = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const rib = box(0.14, 1.5 - i * 0.13, 1.5 - i * 0.16, i % 2 ? '#6e5334' : '#7d5f3c');
    rib.position.set(-0.9 + i * 0.36, (1.5 - i * 0.13) / 2 - 0.35, 0);
    rib.rotation.x = 0.1 * (i % 2 ? 1 : -1);
    hull.add(rib);
  }
  hull.rotation.z = -0.34;
  hull.rotation.y = rng() * 0.6;
  g.add(hull);
  // a snapped mast leaning out of the deck
  const mast = cyl(0.07, 0.09, 2.2, '#5f4728');
  mast.position.set(0.1, 1.0, 0.1);
  mast.rotation.z = 0.5;
  g.add(mast);
  // tattered sail
  const sail = box(0.06, 0.9, 0.8, '#e3dcc4', { transparent: true, opacity: 0.85 });
  sail.position.set(0.6, 1.3, 0.15);
  sail.rotation.z = 0.5;
  g.add(sail);
  return g;
}

/** Coral / rock spires for the reef island. */
function buildCoral(rng) {
  const g = new THREE.Group();
  const cols = ['#e8768f', '#d9569a', '#f0a05a', '#7fd8c8'];
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const h = 0.5 + rng() * 0.9;
    const c = cols[Math.floor(rng() * cols.length)];
    const arm = cyl(0.06, 0.13, h, c, 6);
    const a = rng() * Math.PI * 2, r = rng() * 0.4;
    arm.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    arm.rotation.z = (rng() - 0.5) * 0.7;
    arm.rotation.x = (rng() - 0.5) * 0.7;
    g.add(arm);
    const tip = sphereMesh(0.09, c, 6, 5);
    tip.position.copy(arm.position).y += h / 2;
    g.add(tip);
  }
  return g;
}

/** A moored paper lantern on a bamboo pole — night navigation for the cays. */
function buildBeacon() {
  const g = new THREE.Group();
  const pole = cyl(0.05, 0.06, 2.4, '#9a8f5c');
  pole.position.y = 1.2; g.add(pole);
  const arm = box(0.5, 0.06, 0.06, '#9a8f5c');
  arm.position.set(0.2, 2.3, 0); g.add(arm);
  // its own material: the shade pulses its emissive, so it must not be shared
  const lantern = new THREE.Mesh(
    cylMesh(0.16, 0.16, 0.34, '#ffdca0', 8).geometry,
    sharedMat('#ffdca0', { unique: true, emissive: '#ffb85c' }),
  );
  lantern.position.set(0.4, 2.05, 0);
  lantern.material.emissiveIntensity = 0.6;
  g.add(lantern);
  const cap = cyl(0.04, 0.18, 0.07, '#c46a3a', 8);
  cap.position.set(0.4, 2.25, 0); g.add(cap);
  g.userData.lantern = lantern;
  g.userData.swing = lantern;
  return g;
}

/** A driftwood pier over the water: the marina, and every island's landing. */
function buildPier(len, dir) {
  const g = new THREE.Group();
  const planks = Math.max(3, Math.round(len / 0.9));
  for (let i = 0; i < planks; i++) {
    const deck = box(0.95, 0.1, 1.5, i % 2 ? '#8a6a44' : '#96754d');
    deck.position.set(i * 0.95 + 0.5, 0, 0);
    g.add(deck);
    if (i % 2 === 0) {
      for (const sz of [-0.55, 0.55]) {
        const post = cyl(0.06, 0.07, 1.1, '#6e5334');
        post.position.set(i * 0.95 + 0.5, -0.55, sz);
        g.add(post);
      }
    }
  }
  // a rope rail on one side so the pier reads as walkable
  for (let i = 0; i <= planks; i += 2) {
    const p = cyl(0.045, 0.05, 0.55, '#7d5f3c');
    p.position.set(i * 0.95, 0.32, -0.68);
    g.add(p);
  }
  const rope = box(planks * 0.95, 0.04, 0.04, '#c8b088');
  rope.position.set(planks * 0.475, 0.55, -0.68);
  g.add(rope);
  g.rotation.y = dir;
  return g;
}


// ---------------------------------------------------------------------------
// ISLAND LIFE. Scenery alone made the archipelago feel like a diorama, so every
// island gets residents with something to do: a sunbather on a towel, a critter
// digging in the sand, a coconut-stack merchant, a beach-ball rally. Same chibi
// language as the mainland villagers so they read as the same world.
// ---------------------------------------------------------------------------
function buildIslander(fur, belly) {
  const g = new THREE.Group();
  const body = box(0.34, 0.3, 0.28, belly);
  body.position.y = 0.16; g.add(body);
  const head = box(0.44, 0.4, 0.4, fur);
  head.position.y = 0.56; g.add(head);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.4),
    new THREE.MeshLambertMaterial({ map: islandFace(), transparent: true }),
  );
  face.position.set(0, 0.56, 0.21); g.add(face);
  const ears = new THREE.Group();
  for (const sx of [-0.16, 0.16]) {
    const ear = box(0.12, 0.14, 0.08, fur);
    ear.position.set(sx, 0.8, 0);
    ears.add(ear);
  }
  g.add(ears);
  const arms = [];
  for (const sx of [-0.23, 0.23]) {
    const arm = box(0.09, 0.24, 0.09, fur);
    arm.position.set(sx, 0.2, 0);
    g.add(arm);
    arms.push(arm);
  }
  g.userData = { head, arms, ears };
  return g;
}

let _islandFace = null;
function islandFace() {
  if (!_islandFace) _islandFace = makeCritterFaceTexture({ eye: '#2a2a2a', blush: true, mouth: 'smile' });
  return _islandFace;
}

/** A striped beach towel with a critter flat out on it. */
function buildSunbather(rng) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const strip = box(0.9, 0.03, 0.19, i % 2 ? '#f0e6d2' : '#e8768f');
    strip.position.set(0, 0.02, -0.38 + i * 0.19);
    g.add(strip);
  }
  const c = buildIslander('#e8c88a', '#f4e2bc');
  c.rotation.x = -Math.PI / 2 + 0.1;      // lying on their back
  c.position.y = 0.24;
  g.add(c);
  // a tiny drink with a straw
  const cup = cyl(0.07, 0.06, 0.14, '#ffd27a', 7);
  cup.position.set(0.62, 0.09, 0.2); g.add(cup);
  const straw = cyl(0.012, 0.012, 0.2, '#e8574a', 5);
  straw.position.set(0.64, 0.2, 0.2); straw.rotation.z = 0.4; g.add(straw);
  g.userData.critter = c;
  g.userData.kind = 'sun';
  return g;
}

/** A critter shovelling sand, with a growing pile and a bucket. */
function buildDigger(rng) {
  const g = new THREE.Group();
  const c = buildIslander('#b8865c', '#e0c49a');
  g.add(c);
  const pile = new THREE.Mesh(sharedSphereGeo(), mat('#e8d8b0'));
  pile.scale.set(0.42, 0.2, 0.42);
  pile.position.set(0.42, 0.02, 0.18); g.add(pile);
  const bucket = cyl(0.11, 0.09, 0.16, '#5ec8e8', 8);
  bucket.position.set(-0.42, 0.08, 0.14); g.add(bucket);
  g.userData.critter = c;
  g.userData.kind = 'dig';
  return g;
}

/** A stall of stacked coconuts with a vendor behind it. */
function buildCocoStall(rng) {
  const g = new THREE.Group();
  const top = box(1.15, 0.09, 0.55, '#a8804c');
  top.position.y = 0.62; g.add(top);
  for (const sx of [-0.5, 0.5]) {
    const leg = box(0.09, 0.62, 0.09, '#84633a');
    leg.position.set(sx, 0.31, 0); g.add(leg);
  }
  // striped awning
  for (let i = 0; i < 5; i++) {
    const strip = box(0.24, 0.05, 0.62, i % 2 ? '#f4efe0' : '#5aa845');
    strip.position.set(-0.48 + i * 0.24, 1.08, 0.06);
    strip.rotation.x = -0.22;
    g.add(strip);
  }
  for (const sx of [-0.5, 0.5]) {
    const post = box(0.06, 0.5, 0.06, '#84633a');
    post.position.set(sx, 0.86, 0.1); g.add(post);
  }
  // a pyramid of coconuts
  const rows = [[-0.3, 0], [0, 0], [0.3, 0], [-0.15, 1], [0.15, 1], [0, 2]];
  for (const [ox, row] of rows) {
    const nut = new THREE.Mesh(sharedSphereGeo(), mat('#6b4a2c'));
    nut.scale.setScalar(0.13);
    nut.position.set(ox, 0.72 + row * 0.2, 0);
    g.add(nut);
  }
  const v = buildIslander('#8a7a6a', '#cfc0aa');
  v.position.set(0, 0, -0.5);
  g.add(v);
  g.userData.critter = v;
  g.userData.kind = 'stall';
  return g;
}

/** Two critters knocking a beach ball back and forth. */
function buildBeachBall() {
  const g = new THREE.Group();
  const a = buildIslander('#e8a35d', '#f4d8b4');
  const b = buildIslander('#8fd6e8', '#d4f0f8');
  a.position.set(-1.5, 0, 0);
  b.position.set(1.5, 0, 0);
  a.rotation.y = Math.PI / 2; b.rotation.y = -Math.PI / 2;
  g.add(a, b);
  const ball = new THREE.Mesh(sharedSphereGeo(), mat('#f4efe0'));
  ball.scale.setScalar(0.22);
  ball.position.set(0, 0.6, 0);
  g.add(ball);
  // colour wedges so it reads as a beach ball, not a pearl
  for (let i = 0; i < 4; i++) {
    const w = box(0.06, 0.2, 0.2, ['#e8574a', '#5ec8e8', '#ffd23e', '#5aa845'][i]);
    w.position.set(Math.cos(i * 1.57) * 0.16, 0.6, Math.sin(i * 1.57) * 0.16);
    w.rotation.y = i * 1.57;
    g.add(w);
  }
  g.userData = { kind: 'ball', a, b, ball, t: 0, dur: 1.1, from: -1, };
  return g;
}

let _sphereGeo = null;
function sharedSphereGeo() {
  if (!_sphereGeo) _sphereGeo = new THREE.SphereGeometry(1, 8, 6);
  return _sphereGeo;
}

export function createIsles(scene, terrain, decorBlocked) {
  const group = new THREE.Group();
  const QL = getQuality();
  const rngState = { s: 913 };
  const rng = () => {
    rngState.s = (rngState.s * 1103515245 + 12345) & 0x7fffffff;
    return rngState.s / 0x7fffffff;
  };

  const palms = [];      // { group, crown }
  const beacons = [];
  const lights = [];
  const folks = [];      // island residents with something to do

  const surf = (x, z) => terrain.surfaceY(x, z);
  const dry = (x, z) => {
    const [ix, iz] = terrain.cellOf(x, z);
    return terrain.inBounds(ix, iz) && terrain.heightCell(ix, iz) > WATER_LEVEL
      && terrain.surfaceY(x, z) >= WATER_Y;
  };

  /** Scatter n props over an island, skipping wet cells and the landing pier. */
  function scatter(isl, n, make, blockChance = 0) {
    let placed = 0;
    for (let tries = 0; tries < n * 14 && placed < n; tries++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (isl.r * 0.62);
      const x = isl.x + Math.cos(a) * r, z = isl.z + Math.sin(a) * r;
      if (!dry(x, z)) continue;
      const o = make();
      o.position.set(x, surf(x, z) - 0.05, z);
      group.add(o);
      placed++;
      if (rng() < blockChance) {
        const [ix, iz] = terrain.cellOf(x, z);
        decorBlocked.add(`${ix},${iz}`);
      }
      if (o.userData.crown) palms.push(o);
      if (o.userData.swing) beacons.push(o);
    }
    return placed;
  }

  // --- dress every island by kind -------------------------------------------
  const DETAIL = QL.decorScale;
  for (const isl of terrain.islands) {
    const big = isl.r >= 7;
    if (isl.kind === 'palm') {
      scatter(isl, Math.max(3, Math.round((big ? 9 : 6) * DETAIL)), () => buildPalm(rng), 0.55);
      scatter(isl, Math.round(4 * DETAIL), () => buildCoral(rng));
    } else if (isl.kind === 'shrine') {
      const t = buildTorii();
      t.position.set(isl.x, surf(isl.x, isl.z) - 0.05, isl.z);
      t.rotation.y = Math.atan2(-isl.x, -isl.z);   // gate faces the mainland
      group.add(t);
      scatter(isl, Math.round(3 * DETAIL), () => buildPalm(rng), 0.5);
      scatter(isl, 2, () => buildBeacon());
    } else if (isl.kind === 'wreck') {
      const w = buildWreck(rng);
      w.position.set(isl.x, surf(isl.x, isl.z) - 0.05, isl.z);
      group.add(w);
      scatter(isl, Math.round(2 * DETAIL), () => buildPalm(rng), 0.5);
    } else if (isl.kind === 'lantern') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const x = isl.x + Math.cos(a) * isl.r * 0.42, z = isl.z + Math.sin(a) * isl.r * 0.42;
        if (!dry(x, z)) continue;
        const b = buildBeacon();
        b.position.set(x, surf(x, z) - 0.05, z);
        b.rotation.y = a;
        group.add(b);
        beacons.push(b);
      }
      scatter(isl, Math.round(2 * DETAIL), () => buildPalm(rng), 0.5);
    } else {
      scatter(isl, Math.round(6 * DETAIL), () => buildCoral(rng));
      scatter(isl, 1, () => buildPalm(rng), 0.5);
    }

    // RESIDENTS: every island gets someone doing something, so arriving
    // somewhere never feels like arriving at an empty postcard. The bigger the
    // island the more it can hold.
    const cast = big
      ? [buildCocoStall, buildSunbather, buildDigger, buildBeachBall]
      : [buildSunbather, buildDigger];
    for (const make of cast) {
      let placed = false;
      for (let tries = 0; tries < 30 && !placed; tries++) {
        const a = rng() * Math.PI * 2;
        const r = 0.3 * isl.r + rng() * isl.r * 0.4;
        const x = isl.x + Math.cos(a) * r, z = isl.z + Math.sin(a) * r;
        if (!dry(x, z)) continue;
        // the beach-ball rally needs room on both sides
        if (make === buildBeachBall && !(dry(x - 1.6, z) && dry(x + 1.6, z))) continue;
        const o = make(rng);
        o.position.set(x, surf(x, z) - 0.02, z);
        o.rotation.y = Math.atan2(isl.x - x, isl.z - z) + (rng() - 0.5);
        group.add(o);
        folks.push({ o, seed: rng() * 10 });
        placed = true;
      }
    }

    // a landing pier on the side facing the mainland, so arriving by jetski has
    // somewhere to tie up instead of beaching in the sand
    const toward = Math.atan2(-isl.z, -isl.x);
    for (let step = isl.r * 0.55; step < isl.r * 1.9; step += 0.5) {
      const x = isl.x + Math.cos(toward) * step, z = isl.z + Math.sin(toward) * step;
      if (dry(x, z)) continue;
      const pier = buildPier(2.6, toward + Math.PI);
      pier.position.set(x, WATER_Y + 0.3, z);
      group.add(pier);
      isl.pier = { x: x + Math.cos(toward) * 1.6, z: z + Math.sin(toward) * 1.6 };
      break;
    }
  }

  // lantern point-lights, budgeted by the WORLD DETAIL knob (they are the same
  // kind of cost as the mainland tōrō lights)
  const LIGHT_BUDGET = Math.min(beacons.length, Math.round(QL.lanternLights * 0.4));
  for (let i = 0; i < LIGHT_BUDGET; i++) {
    const l = new THREE.PointLight(0xffb85c, 0, 7.5, 2);
    const b = beacons[Math.floor((i / LIGHT_BUDGET) * beacons.length)];
    b.getWorldPosition(l.position);
    l.position.y += 2.0;
    group.add(l);
    lights.push(l);
  }

  scene.add(group);

  // --- the MARINA: a longer pier on the mainland shore nearest the village ---
  // This is where watercraft are moored, so it has to be findable: it sits on
  // the closest bit of ocean coast to spawn, pointing out to sea.
  let marina = null;
  {
    const S = terrain.size;
    let best = null, bestD = Infinity;
    for (let iz = 2; iz < S - 2; iz++) {
      for (let ix = 2; ix < S - 2; ix++) {
        if (!terrain.isOceanCell(ix, iz)) continue;
        const wx = ix - S / 2 + 0.5, wz = iz - S / 2 + 0.5;
        // a coast cell: water with dry land next door
        let coast = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (terrain.heightCell(ix + dx, iz + dz) > WATER_LEVEL) { coast = true; break; }
        }
        if (!coast) continue;
        const d = (wx - terrain.spawn.x) ** 2 + (wz - terrain.spawn.z) ** 2;
        if (d < bestD) { bestD = d; best = { wx, wz, ix, iz }; }
      }
    }
    if (best) {
      const shore = terrain.nearestShore(best.wx, best.wz);
      const out = Math.atan2(best.wz - shore.z, best.wx - shore.x);   // land -> sea
      // A mooring has to FLOAT. Walk out from the sand until there is real
      // depth under a hull — the sea floor drops fast, so this is usually two
      // or three units, but guessing a fixed offset left craft sitting in the
      // shallows where they instantly ground out and could not be driven.
      let berth = 3.4;
      for (let d = 1.5; d <= 14; d += 0.5) {
        const x = shore.x + Math.cos(out) * d, z = shore.z + Math.sin(out) * d;
        if (WATER_Y - terrain.surfaceY(x, z) > 0.55 && terrain.swimmable(x, z)) { berth = d; break; }
      }
      const pier = buildPier(Math.max(3, berth - 0.8), out);
      pier.position.set(shore.x + Math.cos(out) * 0.6, WATER_Y + 0.3, shore.z + Math.sin(out) * 0.6);
      group.add(pier);
      const b = buildBeacon();
      b.position.set(shore.x, surf(shore.x, shore.z) - 0.05, shore.z);
      group.add(b);
      beacons.push(b);
      marina = {
        x: shore.x + Math.cos(out) * berth,
        z: shore.z + Math.sin(out) * berth,
        landX: shore.x, landZ: shore.z, dir: out, berth,
      };
    }
  }

  // Same rule as landmarks: a palm on the far reef does not need its fronds
  // posed while you are standing in the village.
  const NEAR2 = 80 * 80;

  function update(dt, time, isNight, viewer) {
    const vx = viewer ? viewer.x : 0, vz = viewer ? viewer.z : 0;
    const near = (o) => (o.position.x - vx) ** 2 + (o.position.z - vz) ** 2 < NEAR2;
    // palm fronds sway; the whole crown rocks a touch behind them
    for (const p of palms) {
      if (!near(p)) continue;
      const c = p.userData.crown;
      c.rotation.z = Math.sin(time * 0.9 + c.position.x) * 0.045;
      for (const f of c.children) {
        if (f.userData.phase === undefined) continue;
        f.rotation.x = Math.sin(time * 1.5 + f.userData.phase) * 0.09;
      }
    }
    for (const b of beacons) {
      if (!near(b)) continue;
      b.userData.swing.rotation.z = Math.sin(time * 1.2 + b.position.x) * 0.13;
    }
    // island residents get on with their day
    for (const f of folks) {
      if (!near(f.o)) continue;
      const u = f.o.userData;
      const t2 = time + f.seed;
      if (u.kind === 'sun') {
        // breathing, with the occasional lazy stretch of one arm
        const c = u.critter;
        c.position.y = 0.24 + Math.sin(t2 * 1.1) * 0.012;
        const stretch = Math.sin(t2 * 0.32) > 0.94 ? 1 : 0;
        c.userData.arms[0].rotation.x = -stretch * 1.6;
        c.userData.head.rotation.z = Math.sin(t2 * 0.5) * 0.08;
      } else if (u.kind === 'dig') {
        // shovelling: bend down, scoop, swing the sand onto the pile
        const c = u.critter;
        const dig = Math.sin(t2 * 3.2);
        c.rotation.x = 0.35 + dig * 0.28;
        c.userData.arms.forEach((a, i) => { a.rotation.x = -0.9 + dig * 1.1 - i * 0.15; });
        c.userData.ears.rotation.z = Math.sin(t2 * 3.2 + 0.6) * 0.18;
      } else if (u.kind === 'stall') {
        // vendor rocks on their heels and waves when someone is near
        const c = u.critter;
        c.position.y = Math.abs(Math.sin(t2 * 1.6)) * 0.035;
        const wave = Math.sin(t2 * 5);
        c.userData.arms[1].rotation.z = -0.5 - wave * 0.7;
        c.userData.head.rotation.y = Math.sin(t2 * 0.7) * 0.35;
      } else if (u.kind === 'ball') {
        // a rally: the ball arcs across, the receiver hops to meet it
        u.t += dt;
        const w = Math.min(1, u.t / u.dur);
        const from = u.from < 0 ? u.a : u.b;
        const to = u.from < 0 ? u.b : u.a;
        u.ball.position.set(
          from.position.x + (to.position.x - from.position.x) * w,
          0.6 + Math.sin(w * Math.PI) * 0.95,
          from.position.z + (to.position.z - from.position.z) * w,
        );
        u.ball.rotation.y += dt * 5;
        u.ball.rotation.x += dt * 3;
        to.position.y = Math.max(0, Math.sin(w * Math.PI * 2)) * 0.12 * w;
        // both keep their arms up, ready
        for (const critter of [u.a, u.b]) {
          critter.userData.arms[0].rotation.x = -2.1;
          critter.userData.arms[1].rotation.x = -2.1;
        }
        if (u.t >= u.dur) { u.t = 0; u.from = -u.from; u.dur = 0.9 + Math.random() * 0.5; }
      }
    }
    for (const l of lights) {
      l.intensity = isNight ? 1.05 + Math.sin(time * 3 + l.position.x) * 0.12 : 0;
    }
  }

  function dispose() {
    disposeObject(group, true);
    scene.remove(group);
  }

  return { group, update, dispose, marina, islands: terrain.islands };
}
