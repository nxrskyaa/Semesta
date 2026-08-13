// THE HOLLOW, BUILT.
//
// A dungeon floor is one sealed hall: a slab, four walls, a door you came in by
// and a stair you open by killing everything. That is the whole geometry, and
// keeping it that simple is what lets the floor be about the FIGHT rather than
// about finding your way.
//
// ---------------------------------------------------------------------------
// THE ONE IDEA THAT MADE THIS BUILDABLE
//
// Everything in Semesta asks the same object where the ground is. The player's
// gravity, its walk collision, its swim check; every monster's footing; the
// wildlife, the boats, the decor. All of it is `terrain.surfaceY(x, z)` and
// `terrain.walkable(x, z, y)` on one shared instance.
//
// So the dungeon does NOT build a second world engine, and it does not swap a
// reference that a dozen modules captured at construction time and would go on
// holding. It installs an OVERRIDE on the terrain object itself: while a run is
// active, those few methods answer for the hall instead of for Anavela, and
// every system in the game follows without knowing a dungeon exists. Take the
// override off and the overworld is exactly as it was — nothing was mutated,
// nothing has to be rebuilt, and the hero is standing where they left.
//
// The hall is built at DUNGEON_Y, five hundred units above the map. Not for
// tidiness: it means the overworld's monsters, pickups, boats and NPCs are all
// hundreds of units away, so every existing distance check — aggro, interest,
// interaction, the light culler — excludes them for free. There is no "disable
// the overworld" pass to write, and therefore none to get wrong.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { boxMesh, cylMesh, sphereMesh, sharedMat, sharedBox } from '../gfx/meshcache.js';
import { bakeStatic } from '../gfx/bake.js';
import { THEMES } from '../systems/dungeon.js';

/** Far above Anavela. Nothing down there can reach up here, or vice versa. */
export const DUNGEON_Y = 500;
/** Half-width of a hall's floor slab, in world units. */
const HALF = 17;
/** A warden's room is tighter — nowhere to kite, which is the point of it. */
const HALF_WARDEN = 13;
/** A great boss needs room to use its area attacks and for you to leave them. */
const HALF_GREAT = 22;
const WALL_H = 9;

export function halfFor(kind) {
  return kind === 'warden' ? HALF_WARDEN : kind === 'great' ? HALF_GREAT : HALF;
}

// ---------------------------------------------------------------------------
// GEOMETRY
// ---------------------------------------------------------------------------

/** A flagged floor slab: real courses, not one flat plane. */
function buildFloor(g, half, t) {
  const step = 2.4;
  const n = Math.ceil((half * 2) / step);
  // the grout shows through the gaps, same trick the plaza uses
  const grout = boxMesh(half * 2 + 1.2, 0.3, half * 2 + 1.2, t.wall);
  grout.position.y = -0.18;
  grout.receiveShadow = true;
  g.add(grout);
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const x = -half + step * (ix + 0.5), z = -half + step * (iz + 0.5);
      if (Math.abs(x) > half - 0.2 || Math.abs(z) > half - 0.2) continue;
      // two alternating tones so the floor reads as laid rather than painted
      const dark = (ix + iz) % 2 === 0;
      const f = boxMesh(step - 0.22, 0.22, step - 0.22, dark ? t.floor : shade(t.floor, 1.12));
      f.position.set(x, -0.02, z);
      f.receiveShadow = true;
      g.add(f);
    }
  }
}

function shade(hex, mul) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(mul);
  return `#${c.getHexString()}`;
}

/** Four walls with pilasters, a cornice, and no way out but the doors. */
function buildWalls(g, half, t) {
  const L = half * 2 + 1.2;
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2;
    const w = boxMesh(L, WALL_H, 1.2, t.wall);
    w.position.set(Math.sin(a) * (half + 0.6), WALL_H / 2, Math.cos(a) * (half + 0.6));
    w.rotation.y = a;
    w.receiveShadow = true;
    g.add(w);
    // a cornice band so the wall has a top edge instead of just stopping
    const c = boxMesh(L, 0.5, 1.6, t.trim);
    c.position.set(Math.sin(a) * (half + 0.6), WALL_H - 0.25, Math.cos(a) * (half + 0.6));
    c.rotation.y = a;
    g.add(c);
    // pilasters break the run of the wall up
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;                       // leave the middle for a door
      const p = boxMesh(1.1, WALL_H - 0.6, 0.5, t.trim);
      const off = (i / 2.4) * half;
      p.position.set(
        Math.sin(a) * (half + 0.1) + Math.cos(a) * off,
        (WALL_H - 0.6) / 2,
        Math.cos(a) * (half + 0.1) - Math.sin(a) * off);
      p.rotation.y = a;
      g.add(p);
    }
  }
  // A CEILING. Without one the hall is an open-air pit with the sky over it,
  // and it stops reading as underground the moment the camera tilts up.
  const ceil = boxMesh(L, 0.8, L, shade(t.wall, 0.6));
  ceil.position.y = WALL_H + 0.4;
  g.add(ceil);
}

/** A brazier: bowl, coals and a real flame that flickers on its own phase. */
function buildBrazier(t, seed) {
  const b = new THREE.Group();
  const post = cylMesh(0.26, 0.34, 1.5, t.trim, 8);
  post.position.y = 0.75;
  b.add(post);
  const bowl = cylMesh(0.72, 0.44, 0.44, shade(t.trim, 0.8), 10);
  bowl.position.y = 1.65;
  b.add(bowl);
  const flame = new THREE.Group();
  flame.position.y = 1.9;
  // three tongues at different heights and phases — one blob reads as a bulb
  for (let i = 0; i < 3; i++) {
    const f = cylMesh(0.02, 0.2 - i * 0.05, 0.5 + i * 0.22, i === 0 ? '#fff2c0' : t.accent, 6,
      { unique: true, opacity: 0.9 });
    f.material.transparent = true;
    f.material.blending = THREE.AdditiveBlending;
    f.material.depthWrite = false;
    f.position.y = 0.25 + i * 0.1;
    f.userData.phase = seed * 2.1 + i * 1.7;
    flame.add(f);
  }
  flame.userData.dynamic = true;
  b.add(flame);
  const light = new THREE.PointLight(t.light, 1.5, 16, 2);
  light.position.y = 2.1;
  b.add(light);
  b.userData = { flame, light, seed };
  return b;
}

/** The stair down. Sealed until the hall is clear — that IS the floor's lock. */
function buildStair(t) {
  const g = new THREE.Group();
  const frame = boxMesh(4.4, 5.2, 0.9, t.trim);
  frame.position.y = 2.6;
  g.add(frame);
  const mouth = boxMesh(3.0, 3.9, 1.2, '#08060a');
  mouth.position.set(0, 2.1, 0.05);
  g.add(mouth);
  // the seal: a slab of stone with the band's glyph cut into it, which lifts
  const seal = boxMesh(3.0, 3.9, 0.5, shade(t.wall, 1.35), { unique: true });
  seal.position.set(0, 2.1, 0.35);
  seal.userData.dynamic = true;
  g.add(seal);
  const rune = cylMesh(0.9, 0.9, 0.12, t.accent, 6, { unique: true });
  rune.material.transparent = true;
  rune.material.blending = THREE.AdditiveBlending;
  rune.material.depthWrite = false;
  rune.rotation.x = Math.PI / 2;
  rune.position.set(0, 2.1, 0.66);
  rune.userData.dynamic = true;
  g.add(rune);
  // the light behind it, which only burns once the way is open
  const glow = new THREE.PointLight(t.accent, 0, 12, 2);
  glow.position.set(0, 2.2, 1.2);
  g.add(glow);
  g.userData = { seal, rune, glow, open: false, t: 0 };
  return g;
}

/** The way back to Anavela. Always open — nobody is locked in. */
function buildExit(t) {
  const g = new THREE.Group();
  const arch = boxMesh(4.0, 4.8, 0.8, t.trim);
  arch.position.y = 2.4;
  g.add(arch);
  const swirl = cylMesh(1.3, 1.3, 0.14, '#8fd8ff', 12, { unique: true });
  swirl.material.transparent = true;
  swirl.material.opacity = 0.75;
  swirl.material.blending = THREE.AdditiveBlending;
  swirl.material.depthWrite = false;
  swirl.rotation.x = Math.PI / 2;
  swirl.position.set(0, 2.1, 0.5);
  swirl.userData.dynamic = true;
  g.add(swirl);
  const light = new THREE.PointLight('#8fd8ff', 1.1, 12, 2);
  light.position.set(0, 2.2, 1.0);
  g.add(light);
  g.userData = { swirl, light };
  return g;
}

/** Band-specific dressing, so the three depths are not one room recoloured. */
function dressHall(g, half, theme, t, rnd) {
  if (theme === 'stone') {
    // fallen Lanternkeeper masonry and dead lampposts
    for (let i = 0; i < 7; i++) {
      const r = boxMesh(0.8 + rnd() * 1.4, 0.5 + rnd() * 0.9, 0.8 + rnd() * 1.2, shade(t.wall, 1.2));
      r.position.set((rnd() - 0.5) * half * 1.7, 0.3, (rnd() - 0.5) * half * 1.7);
      r.rotation.y = rnd() * 3.14;
      g.add(r);
    }
    for (let i = 0; i < 3; i++) {
      const p = cylMesh(0.14, 0.18, 2.6, shade(t.trim, 0.7), 6);
      p.position.set((rnd() - 0.5) * half * 1.5, 1.3, (rnd() - 0.5) * half * 1.5);
      p.rotation.z = (rnd() - 0.5) * 0.5;          // leaning, snapped, dead
      g.add(p);
    }
  } else if (theme === 'frost') {
    // ice columns from floor to ceiling, and rime on the ground
    for (let i = 0; i < 6; i++) {
      const h = 3 + rnd() * 5;
      const col = cylMesh(0.28 + rnd() * 0.3, 0.5 + rnd() * 0.4, h, '#bfe8ff', 6,
        { unique: true, opacity: 0.55 });
      col.material.transparent = true;
      col.position.set((rnd() - 0.5) * half * 1.7, h / 2, (rnd() - 0.5) * half * 1.7);
      g.add(col);
    }
    for (let i = 0; i < 9; i++) {
      const s = sphereMesh(0.3 + rnd() * 0.5, '#dff2ff', 6, 4);
      s.scale.y = 0.3;
      s.position.set((rnd() - 0.5) * half * 1.8, 0.1, (rnd() - 0.5) * half * 1.8);
      g.add(s);
    }
  } else {
    // cracked black rock with molten seams glowing up through it
    for (let i = 0; i < 8; i++) {
      const seam = boxMesh(0.5 + rnd() * 3.5, 0.06, 0.35, '#ff8a3c', { unique: true });
      seam.material.transparent = true;
      seam.material.opacity = 0.85;
      seam.material.blending = THREE.AdditiveBlending;
      seam.material.depthWrite = false;
      seam.position.set((rnd() - 0.5) * half * 1.8, 0.14, (rnd() - 0.5) * half * 1.8);
      seam.rotation.y = rnd() * 3.14;
      g.add(seam);
    }
    for (let i = 0; i < 6; i++) {
      const r = boxMesh(1 + rnd() * 1.6, 0.7 + rnd() * 1.4, 1 + rnd() * 1.4, '#2a1a16');
      r.position.set((rnd() - 0.5) * half * 1.7, 0.4, (rnd() - 0.5) * half * 1.7);
      r.rotation.y = rnd() * 3.14;
      g.add(r);
    }
  }
}

// ---------------------------------------------------------------------------
// THE HALL
// ---------------------------------------------------------------------------

export function createDungeonWorld(scene, terrain) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  let hall = null;             // the built floor currently in the scene
  let override = null;         // what we installed on `terrain`
  const state = { active: false, half: HALF, theme: 'stone', kind: 'hall', anim: 0 };

  /** Seeded, so the same floor looks the same every time you walk into it. */
  function rngFor(floor, diff) {
    let s = (floor * 9301 + (diff.length * 49297) + 233280) >>> 0;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  function disposeHall() {
    if (!hall) return;
    root.remove(hall);
    hall.traverse((o) => {
      if (o.isMesh) {
        // shared geometry and materials are tagged and must survive — freeing
        // them would take every other object built from the cache with them
        if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.();
        if (o.material && o.material.userData?.owned) o.material.dispose?.();
      }
    });
    hall = null;
  }

  /** Build one floor. Returns where the hero should stand. */
  function buildFloorHall(plan) {
    disposeHall();
    const t = THEMES[plan.theme] || THEMES.stone;
    const half = halfFor(plan.kind);
    const rnd = rngFor(plan.floor, plan.difficulty);
    const g = new THREE.Group();

    buildFloor(g, half, t);
    buildWalls(g, half, t);
    dressHall(g, half, plan.theme, t, rnd);

    // braziers around the room: the only light down here, and the reason the
    // walls read as stone rather than as a flat colour
    const braziers = [];
    const ring = plan.kind === 'great' ? 8 : 6;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + 0.4;
      const b = buildBrazier(t, i);
      b.position.set(Math.cos(a) * (half - 1.8), 0, Math.sin(a) * (half - 1.8));
      braziers.push(b);
      g.add(b);
    }

    const stair = buildStair(t);
    stair.position.set(0, 0, -half - 0.2);
    g.add(stair);

    const exit = buildExit(t);
    exit.position.set(0, 0, half + 0.2);
    exit.rotation.y = Math.PI;
    g.add(exit);

    // Bake the static half. The braziers' flames, the seal and the portals are
    // marked dynamic above, so only the masonry merges — a hall is ~250 little
    // boxes and every one of them would otherwise be a draw call.
    braziers.forEach((b) => { b.userData.flame.userData.dynamic = true; });
    bakeStatic(g);

    g.position.set(0, DUNGEON_Y, 0);
    root.add(g);
    hall = g;
    hall.userData = { braziers, stair, exit, half, theme: plan.theme };

    state.half = half;
    state.theme = plan.theme;
    state.kind = plan.kind;
    return { x: 0, y: DUNGEON_Y, z: half - 3.5 };   // just inside the exit arch
  }

  // -------------------------------------------------------------------------
  // THE TERRAIN OVERRIDE
  //
  // Installed on enter, removed on leave. Only the handful of methods that
  // answer "where is the ground and may I stand on it" are replaced; everything
  // else on the terrain object is untouched, so nothing that reads the world
  // grid for any other reason is disturbed.
  // -------------------------------------------------------------------------
  function installOverride() {
    if (override) return;
    const keep = {
      surfaceY: terrain.surfaceY, walkable: terrain.walkable,
      swimmable: terrain.swimmable, deepWater: terrain.deepWater,
      isWater: terrain.isWater, inOcean: terrain.inOcean, inSnow: terrain.inSnow,
      nearestShore: terrain.nearestShore, inBounds: terrain.inBounds,
      cellOf: terrain.cellOf, typeAt: terrain.typeAt,
    };
    override = keep;

    // The hall is dead flat. That is not laziness: a dungeon floor is a built
    // surface and the whole point of a boss arena is that the ground never
    // decides a fight.
    terrain.surfaceY = () => DUNGEON_Y;
    // Inside the walls, minus a body's width so you cannot clip into masonry.
    terrain.walkable = (x, z) => Math.abs(x) < state.half - 0.6 && Math.abs(z) < state.half - 0.6;
    // There is no water in the Hollow, and saying so switches off swimming, the
    // boats, the shore rescue and the weather in one line each.
    terrain.swimmable = () => false;
    terrain.deepWater = () => false;
    terrain.isWater = () => false;
    terrain.inOcean = () => false;
    terrain.inSnow = () => false;
    terrain.nearestShore = () => new THREE.Vector3(0, DUNGEON_Y, 0);
    // Everything inside the hall is in bounds; nothing outside it is. This is
    // what keeps main.js's out-of-world rescue from firing five hundred units up.
    terrain.inBounds = () => true;
    terrain.cellOf = () => [0, 0];
    terrain.typeAt = () => 3;                       // stone, for footstep sounds
  }

  function removeOverride() {
    if (!override) return;
    Object.assign(terrain, override);
    override = null;
  }

  function enter(plan) {
    const at = buildFloorHall(plan);
    installOverride();
    root.visible = true;
    state.active = true;
    return at;
  }

  function leave() {
    removeOverride();
    root.visible = false;
    state.active = false;
    disposeHall();
  }

  /** Lift the seal. Called when the last thing in the hall dies. */
  function openStair() {
    if (!hall) return null;
    hall.userData.stair.userData.open = true;
    return stairSpot();
  }

  const stairSpot = () => hall
    ? { x: 0, y: DUNGEON_Y, z: -hall.userData.half + 2.2 } : null;
  const exitSpot = () => hall
    ? { x: 0, y: DUNGEON_Y, z: hall.userData.half - 2.2 } : null;

  /** A clear spot to put a monster: on the floor, away from both doors. */
  function spawnPoint(rnd = Math.random) {
    const half = state.half;
    for (let i = 0; i < 40; i++) {
      const x = (rnd() - 0.5) * (half - 3) * 2;
      const z = (rnd() - 0.5) * (half - 3) * 2;
      // keep them off the arrival pad so nothing is standing on you when you land
      if (Math.hypot(x - 0, z - (half - 3.5)) < 6) continue;
      return { x, y: DUNGEON_Y, z };
    }
    return { x: 0, y: DUNGEON_Y, z: 0 };
  }

  function update(dt, time) {
    if (!state.active || !hall) return;
    state.anim += dt;
    const u = hall.userData;
    // flames: each tongue on its own phase and its own rhythm, so the brazier
    // never pulses as one object — the same rule the lanterns follow above
    for (const b of u.braziers) {
      const f = b.userData.flame;
      const s = b.userData.seed;
      for (const tongue of f.children) {
        const p = tongue.userData.phase;
        const k = 0.8 + Math.sin(time * 7.3 + p) * 0.16 + Math.sin(time * 17.1 + p * 2.3) * 0.08;
        tongue.scale.set(1, k, 1);
        tongue.material.opacity = 0.72 + Math.sin(time * 11 + p) * 0.2;
      }
      b.userData.light.intensity = 1.35 + Math.sin(time * 6.1 + s) * 0.22
        + Math.sin(time * 15.7 + s * 1.7) * 0.1;
    }
    // the seal: grinds upward once the hall is clear, and the rune turns
    const st = u.stair.userData;
    st.t += dt * (st.open ? 0.7 : 0);
    const lift = Math.min(1, st.t);
    st.seal.position.y = 2.1 + lift * 4.6;
    st.rune.rotation.z += dt * (st.open ? 2.2 : 0.35);
    st.rune.material.opacity = st.open ? 0.9 : 0.25 + Math.sin(time * 2) * 0.06;
    st.glow.intensity = lift * 1.6;
    // the way home turns slowly the whole time
    u.exit.userData.swirl.rotation.z -= dt * 0.9;
    u.exit.userData.swirl.material.opacity = 0.62 + Math.sin(time * 1.7) * 0.12;
  }

  function dispose() {
    removeOverride();
    disposeHall();
    scene.remove(root);
  }

  return {
    state, enter, leave, update, openStair, stairSpot, exitSpot, spawnPoint,
    dispose, DUNGEON_Y, halfFor,
    isActive: () => state.active,
  };
}
