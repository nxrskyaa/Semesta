// Ambient wildlife — the difference between a world that is decorated and one
// that is alive is whether anything REACTS to you. Scenery you walk past is set
// dressing; a rabbit that freezes, stares, then bolts is a world.
//
// Three families, each with its own domain so no region is dead:
//   LAND    bunnies + deer that graze, glance around, and flee when you close in
//   SEA     turtles paddling the swell, fish that leap and belly-flop
//   AIR     seagulls circling the islands, crows that erupt out of the treeline
//
// Everything is quality-scaled (WORLD DETAIL) and disposed properly.
import * as THREE from 'three';
import { WATER_Y, WATER_LEVEL } from './terrain.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';
import { getQuality } from '../gfx/quality.js';
import { disposeObject } from '../util/dispose.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c) });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));

// one shared face texture per palette so 40 critters aren't 40 canvases
const faceCache = new Map();
function faceMat(key, opts) {
  if (!faceCache.has(key)) {
    const t = makeCritterFaceTexture(opts);
    faceCache.set(key, new THREE.MeshLambertMaterial({ map: t, transparent: true }));
  }
  return faceCache.get(key);
}

// ---------------------------------------------------------------------------
// LAND: a chibi bunny — big head, long ears that flick, a puff tail
// ---------------------------------------------------------------------------
function buildBunny(fur) {
  const g = new THREE.Group();
  const body = box(0.3, 0.22, 0.42, fur);
  body.position.y = 0.16; g.add(body);
  const head = box(0.32, 0.3, 0.3, fur);
  head.position.set(0, 0.42, 0.16); g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), faceMat('bunny', { eye: '#2a2a2a', blush: true }));
  face.position.set(0, 0.42, 0.32); g.add(face);
  const ears = new THREE.Group();
  for (const sx of [-0.08, 0.08]) {
    const ear = box(0.08, 0.26, 0.05, fur);
    ear.position.set(sx, 0.7, 0.12);
    ears.add(ear);
  }
  g.add(ears);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat('#fdf8ec'));
  tail.position.set(0, 0.2, -0.24); g.add(tail);
  const legs = new THREE.Group();
  for (const sx of [-0.1, 0.1]) {
    const leg = box(0.09, 0.12, 0.16, fur);
    leg.position.set(sx, 0.06, -0.1);
    legs.add(leg);
  }
  g.add(legs);
  g.userData = { ears, legs, head };
  return g;
}

/** A slender deer: taller, calmer, with a nodding head and a flicking tail. */
function buildDeer(fur) {
  const g = new THREE.Group();
  const body = box(0.36, 0.36, 0.72, fur);
  body.position.y = 0.56; g.add(body);
  const neck = box(0.2, 0.34, 0.2, fur);
  neck.position.set(0, 0.82, 0.3); g.add(neck);
  const head = box(0.26, 0.24, 0.34, fur);
  head.position.set(0, 1.0, 0.42); g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.24), faceMat('deer', { eye: '#20180f' }));
  face.position.set(0, 1.0, 0.6); g.add(face);
  // little antlers
  for (const sx of [-0.08, 0.08]) {
    const a = box(0.04, 0.2, 0.04, '#8a6a44');
    a.position.set(sx, 1.2, 0.4); a.rotation.z = sx * 2; g.add(a);
    const b = box(0.04, 0.12, 0.04, '#8a6a44');
    b.position.set(sx * 1.7, 1.3, 0.4); b.rotation.z = sx * 3; g.add(b);
  }
  const legs = new THREE.Group();
  for (const sx of [-0.13, 0.13]) {
    for (const sz of [-0.24, 0.24]) {
      const leg = box(0.07, 0.4, 0.07, fur);
      leg.position.set(sx, 0.2, sz);
      legs.add(leg);
    }
  }
  g.add(legs);
  const tail = box(0.1, 0.14, 0.06, '#fdf8ec');
  tail.position.set(0, 0.66, -0.38); g.add(tail);
  g.userData = { legs, head, tail };
  return g;
}

// ---------------------------------------------------------------------------
// SEA: a turtle whose shell rides the surface and whose flippers row
// ---------------------------------------------------------------------------
function buildTurtle() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#4f8a5c'));
  shell.scale.set(1, 0.6, 1.25);
  g.add(shell);
  // shell plates so it isn't a smooth blob
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = box(0.14, 0.05, 0.14, '#3f7049');
    p.position.set(Math.cos(a) * 0.24, 0.2, Math.sin(a) * 0.3);
    g.add(p);
  }
  const head = box(0.18, 0.15, 0.2, '#7fb87f');
  head.position.set(0, 0.08, 0.55); g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.14), faceMat('turtle', { eye: '#1a1a1a', blush: true }));
  face.position.set(0, 0.09, 0.66); g.add(face);
  const flippers = new THREE.Group();
  for (const sx of [-1, 1]) {
    const f = box(0.3, 0.06, 0.16, '#7fb87f');
    f.position.set(sx * 0.42, 0.02, 0.2);
    f.userData.side = sx;
    flippers.add(f);
  }
  g.add(flippers);
  g.userData = { flippers };
  return g;
}

/** A leaping fish: a body + tail that arcs out of the water and splashes back. */
function buildFish(c) {
  const g = new THREE.Group();
  const body = box(0.34, 0.2, 0.14, c);
  g.add(body);
  const tailPivot = new THREE.Group();
  tailPivot.position.x = -0.19;
  const tail = box(0.14, 0.2, 0.04, c);
  tail.position.x = -0.06;
  tailPivot.add(tail);
  g.add(tailPivot);
  const fin = box(0.1, 0.1, 0.03, c);
  fin.position.set(0.02, 0.14, 0); g.add(fin);
  const eye = box(0.04, 0.04, 0.03, '#141414');
  eye.position.set(0.14, 0.05, 0.08); g.add(eye);
  g.userData = { tailPivot };
  return g;
}

// ---------------------------------------------------------------------------
// AIR: a gull whose wings beat and glide
// ---------------------------------------------------------------------------
function buildBird(c, wingC) {
  const g = new THREE.Group();
  const body = box(0.22, 0.14, 0.12, c);
  g.add(body);
  const head = box(0.12, 0.11, 0.11, c);
  head.position.set(0.15, 0.06, 0); g.add(head);
  const beak = box(0.08, 0.04, 0.04, '#e8a35d');
  beak.position.set(0.24, 0.04, 0); g.add(beak);
  const wings = new THREE.Group();
  for (const sz of [-1, 1]) {
    const w = box(0.16, 0.03, 0.34, wingC);
    w.position.set(0, 0.05, sz * 0.2);
    w.userData.side = sz;
    wings.add(w);
  }
  g.add(wings);
  const tail = box(0.12, 0.03, 0.14, wingC);
  tail.position.set(-0.15, 0.03, 0); g.add(tail);
  g.userData = { wings };
  return g;
}

const BUNNY_FURS = ['#e8dcc8', '#b89a78', '#8a7a6a', '#d8c0a8'];
const DEER_FURS = ['#b8865c', '#a8764c', '#c89a6c'];
const FISH_COLS = ['#8fd6e8', '#e8b45d', '#c8e8f0', '#e88f9a'];

export function createWildlife(scene, terrain, particles) {
  const QL = getQuality();
  const group = new THREE.Group();
  scene.add(group);

  const S = terrain.size;
  const rndState = { s: 4477 };
  const rnd = () => { rndState.s = (rndState.s * 1103515245 + 12345) & 0x7fffffff; return rndState.s / 0x7fffffff; };

  const land = [], sea = [], fish = [], birds = [];

  const landCell = (tries = 60) => {
    for (let i = 0; i < tries; i++) {
      const x = (rnd() - 0.5) * (S - 16), z = (rnd() - 0.5) * (S - 16);
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz) || terrain.heightCell(ix, iz) <= WATER_LEVEL) continue;
      if (Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z) < 14) continue;  // not in town
      return { x, z };
    }
    return null;
  };
  const seaCell = (tries = 80) => {
    for (let i = 0; i < tries; i++) {
      const x = (rnd() - 0.5) * (S - 10), z = (rnd() - 0.5) * (S - 10);
      if (!terrain.inOcean(x, z)) continue;
      if (!terrain.deepWater(x, z)) continue;
      return { x, z };
    }
    return null;
  };

  // --- populate, budgeted by WORLD DETAIL --------------------------------
  const D = QL.decorScale;
  const N_BUNNY = Math.round(14 * D);
  const N_DEER = Math.round(6 * D);
  const N_TURTLE = Math.round(8 * D);
  const N_FISH = Math.round(10 * D);
  const N_GULL = Math.round(9 * D);

  for (let i = 0; i < N_BUNNY; i++) {
    const c = landCell(); if (!c) continue;
    const m = buildBunny(BUNNY_FURS[Math.floor(rnd() * BUNNY_FURS.length)]);
    m.position.set(c.x, terrain.surfaceY(c.x, c.z), c.z);
    m.rotation.y = rnd() * Math.PI * 2;
    group.add(m);
    land.push({ m, kind: 'bunny', home: { ...c }, t: rnd() * 10, hop: 0, flee: 0, dir: rnd() * 6.28, look: 0 });
  }
  for (let i = 0; i < N_DEER; i++) {
    const c = landCell(); if (!c) continue;
    const m = buildDeer(DEER_FURS[Math.floor(rnd() * DEER_FURS.length)]);
    m.position.set(c.x, terrain.surfaceY(c.x, c.z), c.z);
    m.rotation.y = rnd() * Math.PI * 2;
    group.add(m);
    land.push({ m, kind: 'deer', home: { ...c }, t: rnd() * 10, hop: 0, flee: 0, dir: rnd() * 6.28, look: 0 });
  }
  for (let i = 0; i < N_TURTLE; i++) {
    const c = seaCell(); if (!c) continue;
    const m = buildTurtle();
    m.position.set(c.x, WATER_Y - 0.1, c.z);
    m.rotation.y = rnd() * Math.PI * 2;
    group.add(m);
    sea.push({ m, dir: rnd() * 6.28, t: rnd() * 10, turn: 0 });
  }
  for (let i = 0; i < N_FISH; i++) {
    const c = seaCell() || { x: 0, z: 0 };
    const m = buildFish(FISH_COLS[Math.floor(rnd() * FISH_COLS.length)]);
    m.visible = false;
    group.add(m);
    fish.push({ m, x: c.x, z: c.z, t: rnd() * 8, wait: 1 + rnd() * 7, air: 0, dir: rnd() * 6.28 });
  }
  for (let i = 0; i < N_GULL; i++) {
    // gulls circle the islands; if there is no sea they circle a lake instead
    const isl = terrain.islands?.[i % Math.max(1, terrain.islands.length)];
    const cx = isl ? isl.x : 0, cz = isl ? isl.z : 0;
    const m = buildBird('#f4f2e4', '#c8d0d8');
    group.add(m);
    birds.push({ m, cx, cz, r: 6 + rnd() * 9, a: rnd() * 6.28, sp: 0.32 + rnd() * 0.3, y: 6 + rnd() * 5, beat: rnd() * 6 });
  }

  function update(dt, playerPos, time) {
    // --- LAND: graze, glance, flee ---
    for (const a of land) {
      a.t += dt;
      const dx = a.m.position.x - playerPos.x, dz = a.m.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      const startle = a.kind === 'bunny' ? 6.5 : 9;
      if (dist < startle) {
        // spotted: bolt directly away, then keep running for a beat
        if (a.flee <= 0) a.dir = Math.atan2(dx, dz);
        a.flee = Math.max(a.flee, 1.6);
      }
      if (a.flee > 0) a.flee -= dt;

      const running = a.flee > 0;
      const speed = running ? (a.kind === 'bunny' ? 6.4 : 7.2) : (Math.sin(a.t * 0.3) > 0.7 ? 1.1 : 0);
      if (speed > 0) {
        if (!running && Math.random() < dt * 0.4) a.dir += (Math.random() - 0.5) * 1.6;
        const nx = a.m.position.x + Math.sin(a.dir) * speed * dt;
        const nz = a.m.position.z + Math.cos(a.dir) * speed * dt;
        const [ix, iz] = terrain.cellOf(nx, nz);
        // never run into water or off the map — turn instead
        if (terrain.inBounds(ix, iz) && terrain.heightCell(ix, iz) > WATER_LEVEL
            && Math.hypot(nx - a.home.x, nz - a.home.z) < 34) {
          a.m.position.x = nx; a.m.position.z = nz;
        } else a.dir += 2.2;
        a.m.position.y = terrain.surfaceY(a.m.position.x, a.m.position.z);
        a.m.rotation.y = a.dir + Math.PI;
      }

      if (a.kind === 'bunny') {
        // hopping: a bunny doesn't walk, it bounds. Legs tuck at the apex.
        if (speed > 0) {
          a.hop += dt * (running ? 11 : 5);
          const arc = Math.abs(Math.sin(a.hop));
          a.m.position.y += arc * (running ? 0.34 : 0.14);
          a.m.userData.legs.rotation.x = -arc * 0.8;
          a.m.userData.ears.rotation.x = -arc * 0.35;
        } else {
          // idle: nibble, then flick an ear and glance around
          a.m.userData.legs.rotation.x = 0;
          a.m.userData.ears.rotation.x = Math.sin(a.t * 7) > 0.93 ? -0.5 : 0;
          a.m.userData.head.rotation.x = Math.sin(a.t * 2.4) * 0.18 - 0.1;   // nibbling grass
          a.look += dt;
          if (a.look > 3.5) { a.m.rotation.y += (Math.random() - 0.5) * 1.4; a.look = 0; }
        }
      } else {
        if (speed > 0) {
          a.hop += dt * (running ? 9 : 3.4);
          const sw = Math.sin(a.hop);
          a.m.userData.legs.children.forEach((l, i) => { l.rotation.x = sw * (i % 2 ? 0.5 : -0.5); });
          a.m.position.y += Math.abs(sw) * (running ? 0.16 : 0.04);
          a.m.userData.tail.rotation.x = sw * 0.4;
        } else {
          // grazing: head dips to the grass, comes up to check for danger
          const graze = (Math.sin(a.t * 0.55) + 1) / 2;
          a.m.userData.head.rotation.x = graze * 0.85;
          a.m.userData.legs.children.forEach((l) => { l.rotation.x = 0; });
          a.m.userData.tail.rotation.x = Math.sin(a.t * 6) > 0.9 ? 0.6 : 0;
        }
      }
    }

    // --- SEA: turtles row along the swell ---
    for (const s of sea) {
      s.t += dt;
      if (Math.random() < dt * 0.3) s.turn = (Math.random() - 0.5) * 0.9;
      s.dir += s.turn * dt;
      const sp = 1.5;
      const nx = s.m.position.x + Math.sin(s.dir) * sp * dt;
      const nz = s.m.position.z + Math.cos(s.dir) * sp * dt;
      if (terrain.deepWater(nx, nz)) { s.m.position.x = nx; s.m.position.z = nz; }
      else s.dir += 2.4;                          // bounced off the reef
      s.m.rotation.y = s.dir;
      // the shell rides the swell, flippers row in opposition
      s.m.position.y = WATER_Y - 0.12 + Math.sin(s.t * 1.5) * 0.06;
      s.m.rotation.z = Math.sin(s.t * 1.2) * 0.09;
      s.m.userData.flippers.children.forEach((f) => {
        f.rotation.y = Math.sin(s.t * 3.2) * 0.55 * f.userData.side;
        f.rotation.z = Math.cos(s.t * 3.2) * 0.3;
      });
    }

    // --- SEA: fish break the surface, arc, and belly-flop back ---
    for (const f of fish) {
      if (f.air > 0) {
        f.air -= dt;
        const p = 1 - f.air / 1.1;                // 0 -> 1 across the jump
        const arc = Math.sin(p * Math.PI);
        f.m.position.set(
          f.x + Math.sin(f.dir) * p * 2.6,
          WATER_Y + arc * 1.5,
          f.z + Math.cos(f.dir) * p * 2.6,
        );
        f.m.rotation.y = f.dir + Math.PI / 2;
        f.m.rotation.z = (0.5 - p) * 1.8;         // nose up, then down
        f.m.userData.tailPivot.rotation.y = Math.sin(p * 22) * 0.6;
        if (f.air <= 0) {
          f.m.visible = false;
          particles?.burst(f.m.position.clone().setY(WATER_Y), '#eafcff', 6, 2, 3.5, 0.4);
          particles?.ring?.(f.m.position.clone().setY(WATER_Y + 0.02), '#f2feff', 1.1, 0.35);
        }
      } else {
        f.wait -= dt;
        if (f.wait <= 0) {
          const c = seaCell(20);
          if (c) { f.x = c.x; f.z = c.z; }
          f.dir = Math.random() * 6.28;
          f.air = 1.1;
          f.wait = 4 + Math.random() * 9;
          f.m.visible = true;
          particles?.burst(new THREE.Vector3(f.x, WATER_Y, f.z), '#eafcff', 4, 1.6, 3, 0.35);
        }
      }
    }

    // --- AIR: gulls circle, beating then gliding ---
    for (const b of birds) {
      b.a += b.sp * dt;
      b.beat += dt * 5.5;
      b.m.position.set(
        b.cx + Math.cos(b.a) * b.r,
        b.y + Math.sin(b.a * 2.2) * 0.7,
        b.cz + Math.sin(b.a) * b.r,
      );
      b.m.rotation.y = -b.a + Math.PI / 2;
      b.m.rotation.z = 0.28;                      // banked into the circle
      // beat for a while, then hold the wings out and glide
      const gliding = Math.sin(b.a * 0.7) > 0.4;
      const flap = gliding ? 0.05 : Math.sin(b.beat) * 0.7;
      b.m.userData.wings.children.forEach((w) => { w.rotation.x = flap * w.userData.side; });
    }
  }

  function dispose() {
    disposeObject(group, false);   // face textures are shared & cached
    scene.remove(group);
  }

  return { group, update, dispose, count: land.length + sea.length + fish.length + birds.length };
}
