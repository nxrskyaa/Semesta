// WIND.
//
// A world where every blade of grass is welded still reads as a diorama, however
// much is in it. Wind is the cheapest life you can add: one global vector that
// slowly changes direction and strength, and a scatter of things carried on it.
//
// Two parts:
//  1. A SHARED STATE anything can read — `wind.dir`, `wind.strength`, and
//     `sway(phase)` for a value already in the right rhythm. Trees, banners,
//     lanterns and crops all lean off the same source, so the whole world moves
//     TOGETHER rather than each prop wobbling on its own private sine. That
//     coherence is the difference between "windy" and "everything is jittering".
//  2. DRIFTING MOTES — leaves by day, pollen at dusk, snow-dust in the winter
//     reach — instanced into one mesh and recycled, so the cost is one draw call
//     whatever the budget.

import * as THREE from 'three';
import { getQuality } from '../gfx/quality.js';

const TAU = Math.PI * 2;

export function buildWind(scene, terrain) {
  const QL = getQuality();
  // motes are pure decoration, so they scale straight off the FX budget and
  // vanish entirely at the bottom of it
  const COUNT = Math.round(70 * (QL.weatherScale ?? 1));

  const state = {
    dir: Math.random() * TAU,     // where it is blowing TO
    target: 0,
    strength: 0.55,               // 0..1
    targetStrength: 0.55,
    gust: 0,                      // short-lived surge on top
    t: 0,
  };
  state.target = state.dir;

  // --- the motes -----------------------------------------------------------
  let mesh = null;
  const motes = [];
  if (COUNT > 0) {
    // one flat quad, drawn double-sided: a leaf on edge should disappear
    const geo = new THREE.PlaneGeometry(0.18, 0.12);
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85,
    });
    mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    // per-mote colour: dry leaf, green leaf, pale seed
    const COLS = ['#b98a4c', '#8aa85c', '#d8c894', '#c46a3a'];
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      motes.push({
        x: 0, y: 0, z: 0, a: Math.random() * TAU, spin: (Math.random() - 0.5) * 3,
        bob: Math.random() * TAU, life: Math.random(), scale: 0.6 + Math.random() * 0.8,
      });
      mesh.setColorAt(i, col.set(COLS[i % COLS.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const v = new THREE.Vector3(), sc = new THREE.Vector3();
  const eul = new THREE.Euler();

  /** Respawn a mote upwind of the viewer so it drifts across the view. */
  function reseed(mo, cx, cz) {
    const back = state.dir + Math.PI;
    const spread = (Math.random() - 0.5) * 26;
    const d = 14 + Math.random() * 10;
    mo.x = cx + Math.sin(back) * d + Math.cos(back) * spread;
    mo.z = cz + Math.cos(back) * d - Math.sin(back) * spread;
    mo.y = terrain.surfaceY(mo.x, mo.z) + 0.4 + Math.random() * 2.6;
    mo.life = 0;
  }

  /**
   * A sway value in the wind's own rhythm, for anything that leans.
   * @param phase per-object offset so a whole treeline does not move in lockstep
   */
  function sway(phase = 0) {
    return Math.sin(state.t * 1.1 + phase) * (0.35 + state.strength * 0.65)
      + Math.sin(state.t * 2.7 + phase * 1.7) * 0.25 * state.strength
      + state.gust * 0.8;
  }

  function update(dt, viewer) {
    state.t += dt;
    // the wind WANDERS: a new heading and strength every so often, eased into,
    // so it never snaps and never sits perfectly still
    if (Math.random() < dt * 0.06) {
      state.target = state.dir + (Math.random() - 0.5) * 1.6;
      state.targetStrength = 0.25 + Math.random() * 0.7;
    }
    state.dir += (state.target - state.dir) * Math.min(1, dt * 0.35);
    state.strength += (state.targetStrength - state.strength) * Math.min(1, dt * 0.2);
    // gusts: rare, sharp, and they decay
    if (Math.random() < dt * 0.11) state.gust = 0.35 + Math.random() * 0.5;
    state.gust *= Math.pow(0.25, dt);

    if (!mesh || !viewer) return;
    const sx = Math.sin(state.dir), sz = Math.cos(state.dir);
    const speed = 1.6 + state.strength * 3.4 + state.gust * 5;
    for (let i = 0; i < motes.length; i++) {
      const mo = motes[i];
      mo.life += dt / 9;
      if (mo.life >= 1 || Math.hypot(mo.x - viewer.x, mo.z - viewer.z) > 34) {
        reseed(mo, viewer.x, viewer.z);
      }
      mo.x += sx * speed * dt;
      mo.z += sz * speed * dt;
      mo.bob += dt * (1.4 + state.strength);
      // leaves do not travel in a straight line: they rise, stall and tumble
      mo.y += Math.sin(mo.bob) * dt * 0.9 - dt * 0.25;
      const ground = terrain.surfaceY(mo.x, mo.z);
      if (mo.y < ground + 0.15) mo.y = ground + 0.15 + Math.random() * 0.4;
      mo.a += mo.spin * dt * (0.6 + state.strength);
      // fade in and out at the ends of the life so nothing pops
      const fade = Math.min(1, mo.life * 6, (1 - mo.life) * 6);
      eul.set(mo.a, mo.a * 0.7, mo.a * 1.3);
      q.setFromEuler(eul);
      const s2 = mo.scale * fade;
      m4.compose(v.set(mo.x, mo.y, mo.z), q, sc.set(s2, s2, s2));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    if (!mesh) return;
    mesh.geometry.dispose();
    mesh.material.dispose();
    scene.remove(mesh);
  }

  return { state, sway, update, dispose };
}
