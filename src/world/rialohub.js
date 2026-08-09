// THE RIALO HUB.
//
// A built island out at the far corner of the ocean, big enough that arriving
// on it feels like arriving somewhere rather than stepping onto another rock.
// It is where the Rialo Temple Play cast lives — thirty-five of them, from the
// character sheet, repainted procedurally like everything else in this game.
//
// The layout is a RING, not a grid: one raised circular plaza with the Rialo
// monument at the centre, a colonnade around it, and the cast spread across
// four terraces at increasing radius. That shape does two things a grid cannot
// — every NPC is visible from the middle so nobody is hidden behind a building,
// and walking outward is a natural way to meet them all without a checklist.
//
// The palette is deliberately NOT Anavela's. Anavela is cream paving and warm
// gold; the Hub is deep blue-black stone with mint and cyan inlay, because a
// place that belongs to a different world should not look like more of yours.

import * as THREE from 'three';
import { boxMesh, cylMesh, sphereMesh } from '../gfx/meshcache.js';
import { RIALO_NPCS, RIALO_PALETTE as PAL } from './rialoroster.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';
import { paintRialoMark } from './landmarks.js';

const TAU = Math.PI * 2;

/** Deterministic, like everything else that decides where a thing goes. */
function seeded(seed) {
  let g = seed;
  return () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
}

/** A Temple agent, in Semesta's chibi idiom.
 *
 *  The sheet gives every one of them a `color` and an `accent`; those become
 *  the shirt and the trim, so the cast reads as the same people even though not
 *  one pixel of the original art is used. Bodies are shared geometry through
 *  the mesh cache — thirty-five fresh rigs would be thirty-five material sets. */
function buildAgent(def, rnd) {
  const g = new THREE.Group();
  const SKIN = ['#f2c69a', '#e0a878', '#b97d4e', '#8a5a34'][Math.floor(rnd() * 4)];
  const HAIR = ['#2a2118', '#6e4a2a', '#c9a15a', '#d94f38', '#7a86d1'][Math.floor(rnd() * 5)];

  const legs = [];
  for (const sx of [-1, 1]) {
    const l = boxMesh(0.17, 0.34, 0.18, '#2c3a44');
    l.position.set(sx * 0.11, 0.17, 0);
    g.add(l);
    legs.push(l);
  }
  const body = boxMesh(0.46, 0.44, 0.28, def.color);
  body.position.y = 0.56;
  g.add(body);
  // the accent shows as a sash, so both sheet colours are actually on screen
  const sash = boxMesh(0.48, 0.1, 0.3, def.accent);
  sash.position.y = 0.5;
  g.add(sash);

  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 0.29, 0.74, 0);
    const limb = boxMesh(0.13, 0.34, 0.15, def.color);
    limb.position.y = -0.17;
    a.add(limb);
    const hand = boxMesh(0.13, 0.1, 0.15, SKIN);
    hand.position.y = -0.37;
    a.add(hand);
    g.add(a);
    arms.push(a);
  }

  // CHIBI: the head is nearly as wide as the body, per the art direction
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.06;
  g.add(headPivot);
  const head = boxMesh(0.44, 0.42, 0.4, SKIN);
  headPivot.add(head);
  const hair = boxMesh(0.47, 0.16, 0.43, HAIR);
  hair.position.y = 0.19;
  headPivot.add(hair);
  // a face, from the shared critter-face painter every other NPC uses
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.4),
    new THREE.MeshBasicMaterial({
      map: makeCritterFaceTexture({ eye: '#20241c', mouth: 'smile' }),
      transparent: true,
    }));
  face.position.set(0, 0, 0.201);
  headPivot.add(face);

  g.userData = { legs, arms, headPivot, phase: rnd() * TAU };
  return g;
}

/** The plaza floor: concentric rings of wedges with the grout showing. */
function buildFloor(R) {
  const g = new THREE.Group();
  const courses = 4;
  for (let c = 0; c < courses; c++) {
    const r0 = (R * 0.16) + (R * 0.78) * (c / courses);
    const r1 = (R * 0.16) + (R * 0.78) * ((c + 1) / courses) - 0.22;
    const n = 18 + c * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU + (c % 2 ? 0.03 : 0);
      const a1 = ((i + 0.86) / n) * TAU + (c % 2 ? 0.03 : 0);
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      shape.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
      shape.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      shape.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
      shape.closePath();
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(c % 2 ? PAL.paving : '#222c40') }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.06;
      g.add(m);
    }
  }
  // the mint inlay ring that gives the place its signature
  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.15, R * 0.175, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.inlay), side: THREE.DoubleSide }));
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.075;
  g.add(inlay);
  return g;
}

/** The monument at the centre: a stepped plinth carrying the Rialo mark on a
 *  lit pane, so it is the first thing you see from the water at night. */
function buildMonument() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = 3.4 - i * 0.7;
    const step = cylMesh(s, s, 0.34, i ? '#1b2333' : '#232d42', 10);
    step.position.y = 0.17 + i * 0.34;
    g.add(step);
  }
  const pillar = cylMesh(0.5, 0.62, 4.2, PAL.structure, 8);
  pillar.position.y = 3.2;
  g.add(pillar);
  for (const y of [1.6, 3.0, 4.4]) {
    const band = cylMesh(0.56, 0.56, 0.12, PAL.inlay, 8);
    band.position.y = y;
    g.add(band);
  }
  // the mark itself, painted on a canvas exactly as the banner does
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(0, 0, 256, 256);
  paintRialoMark(ctx, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  for (const rot of [0, Math.PI]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    pane.position.set(Math.sin(rot) * 0.001, 5.4, Math.cos(rot) * 0.34 || -0.34);
    pane.rotation.y = rot;
    g.add(pane);
  }
  const finial = sphereMesh(0.42, PAL.glow);
  finial.position.y = 7.1;
  finial.material = finial.material.clone();
  finial.material.emissive = new THREE.Color(PAL.glow);
  finial.material.emissiveIntensity = 1.4;
  g.add(finial);
  g.userData.finial = finial;

  const light = new THREE.PointLight(0x78ecff, 1.4, 26, 2);
  light.position.y = 6.4;
  g.add(light);
  return g;
}

/** One colonnade post with a lamp on top. */
function buildPost() {
  const g = new THREE.Group();
  const base = boxMesh(0.62, 0.22, 0.62, '#1b2333');
  base.position.y = 0.11;
  g.add(base);
  const shaft = cylMesh(0.17, 0.2, 2.5, PAL.structure, 8);
  shaft.position.y = 1.35;
  g.add(shaft);
  const cap = boxMesh(0.5, 0.16, 0.5, '#232d42');
  cap.position.y = 2.68;
  g.add(cap);
  const lamp = sphereMesh(0.22, PAL.glow);
  lamp.material = lamp.material.clone();
  lamp.material.emissive = new THREE.Color(PAL.glow);
  lamp.material.emissiveIntensity = 1.2;
  lamp.position.y = 3.0;
  g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

/**
 * @param island the record from terrain.islands with { x, z, r }
 */
export function createRialoHub(scene, terrain, island, opts = {}) {
  const rnd = seeded(880417);
  const root = new THREE.Group();
  const cx = island.x, cz = island.z;
  const baseY = terrain.surfaceY(cx, cz);
  root.position.set(cx, baseY, cz);
  scene.add(root);

  const R = 15;   // the built plaza, comfortably inside the island's 22

  root.add(buildFloor(R));
  const monument = buildMonument();
  root.add(monument);

  // the colonnade: posts on the plaza edge, evenly spaced
  const posts = [];
  const POSTS = 16;
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * TAU;
    const p = buildPost();
    p.position.set(Math.cos(a) * (R * 0.92), 0, Math.sin(a) * (R * 0.92));
    root.add(p);
    posts.push(p);
  }

  // ---- the cast -----------------------------------------------------------
  //
  // Four terraces at increasing radius, filled in roster order, with the angle
  // stepped by the golden ratio so consecutive entries never end up standing on
  // top of each other in a neat and obviously generated line.
  const agents = [];
  const RINGS = [5.2, 8.0, 10.8, 13.4];
  const GOLDEN = TAU * 0.618034;
  let angle = 0;
  RIALO_NPCS.forEach((def, i) => {
    const ring = RINGS[i % RINGS.length];
    angle += GOLDEN;
    const jitter = (rnd() - 0.5) * 1.4;
    const rr = ring + jitter;
    const x = Math.cos(angle) * rr;
    const z = Math.sin(angle) * rr;

    const mesh = buildAgent(def, rnd);
    mesh.position.set(x, 0.08, z);
    // everyone faces the monument — the whole point of a ring layout
    mesh.rotation.y = Math.atan2(-x, -z);
    root.add(mesh);

    agents.push({
      def, mesh,
      home: { x, z },
      // `activity` and `persona` come straight from the Temple sheet
      activity: def.activity,
      persona: def.persona,
      t: rnd() * 4,
      dir: rnd() * TAU,
      dialogIdx: 0,
      // world-space position, for the interact check
      wx: cx + x, wz: cz + z,
    });
  });

  const state = { time: 0 };

  function update(dt, playerPos, night = 0) {
    state.time += dt;

    // distance gate: the Hub is a long way from everything, so when nobody is
    // on it none of this needs to run at all
    const far = playerPos
      ? Math.hypot(playerPos.x - cx, playerPos.z - cz) > island.r + 45
      : true;

    monument.userData.finial.material.emissiveIntensity =
      1.1 + Math.sin(state.time * 1.6) * 0.35;
    for (const p of posts) {
      p.userData.lamp.material.emissiveIntensity = 0.5 + night * 1.2;
    }
    if (far) return;

    for (const a of agents) {
      a.t -= dt;
      const P = a.mesh.userData;
      const ph = state.time * 2 + P.phase;

      // wander/stroll actually move; the rest are performed in place. A crowd
      // where everybody paces looks like a queue, so most of the sheet's
      // personas are homebodies and they stay put.
      let moving = false;
      if ((a.activity === 'wander' || a.activity === 'stroll') && a.persona !== 'homebody') {
        if (a.t <= 0) { a.t = 2 + rnd() * 3; a.dir += (rnd() - 0.5) * 2.4; }
        const range = a.persona === 'pacer' ? 2.2 : 3.6;
        const nx = a.mesh.position.x + Math.sin(a.dir) * 0.7 * dt;
        const nz = a.mesh.position.z + Math.cos(a.dir) * 0.7 * dt;
        if (Math.hypot(nx - a.home.x, nz - a.home.z) < range) {
          a.mesh.position.x = nx;
          a.mesh.position.z = nz;
          a.mesh.rotation.y = a.dir;
          a.wx = cx + nx; a.wz = cz + nz;
          moving = true;
        } else {
          a.dir += 2.2;
        }
      }

      if (moving) {
        P.legs[0].rotation.x = Math.sin(ph * 2.2) * 0.5;
        P.legs[1].rotation.x = -Math.sin(ph * 2.2) * 0.5;
        P.arms[0].rotation.x = -Math.sin(ph * 2.2) * 0.4;
        P.arms[1].rotation.x = Math.sin(ph * 2.2) * 0.4;
      } else if (a.activity === 'dance') {
        a.mesh.position.y = 0.08 + Math.abs(Math.sin(ph * 1.6)) * 0.16;
        a.mesh.rotation.y += dt * 1.4;
        P.arms[0].rotation.z = 0.9 + Math.sin(ph * 3) * 0.5;
        P.arms[1].rotation.z = -0.9 - Math.sin(ph * 3) * 0.5;
      } else if (a.activity === 'meditate') {
        a.mesh.position.y = 0.08 + Math.sin(ph * 0.5) * 0.05;
        P.arms[0].rotation.x = -0.5;
        P.arms[1].rotation.x = -0.5;
        P.headPivot.rotation.x = 0.2;
      } else if (a.activity === 'tend' || a.activity === 'gather') {
        // bending to the ground and straightening again
        const w = (Math.sin(ph * 0.8) + 1) / 2;
        P.headPivot.rotation.x = 0.35 * w;
        P.arms[0].rotation.x = -1.1 * w;
        P.arms[1].rotation.x = -1.1 * w;
      } else if (a.activity === 'sit') {
        a.mesh.position.y = -0.16;
        P.legs[0].rotation.x = -1.4;
        P.legs[1].rotation.x = -1.4;
      } else {
        // idle: breathe, and glance around now and then
        a.mesh.position.y = 0.08 + Math.sin(ph * 0.6) * 0.02;
        P.headPivot.rotation.y = Math.sin(ph * 0.35) * 0.4;
        for (const l of P.legs) l.rotation.x *= 0.9;
        for (const m of P.arms) { m.rotation.x *= 0.9; m.rotation.z *= 0.9; }
      }
    }
  }

  /** The nearest agent within `r`, for the interact prompt. */
  function nearest(pos, r = 2.4) {
    let best = null, bd = r * r;
    for (const a of agents) {
      const dx = a.wx - pos.x, dz = a.wz - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  return {
    root, agents, update, nearest,
    centre: { x: cx, z: cz }, radius: island.r,
    count: agents.length,
  };
}
