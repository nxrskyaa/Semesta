// Watercraft: the way you actually cross the sea.
//
// Odyvion (the sibling project this borrows its sea from) uses sailing ships —
// slow, stately, wind-driven. Semesta is a chibi action RPG, so the sea here is
// a playground instead: a JETSKI that skips and throws spray, and a little
// DINGHY for a calmer ride. Both are moored at the marina pier and board with
// the interact button.
//
// Rules that make it feel right:
//   - water only. Nose into the shore and the rider steps off onto the sand.
//   - the craft LEANS into turns and PORPOISES over the swell; a boat that just
//     slides flat across a plane reads as a bug.
//   - a foam wake behind, a bow spray in front, and a widening V of ripples.
import * as THREE from 'three';
import { WATER_Y } from '../world/terrain.js';
import { disposeObject } from '../util/dispose.js';
import { boxMesh, cylMesh, sharedMat } from '../gfx/meshcache.js';

const box = (w, h, d, c, opts) => boxMesh(w, h, d, c, opts);
const cyl = (rt, rb, h, c, seg = 8) => cylMesh(rt, rb, h, c, seg);

export const CRAFT_DEFS = {
  jetski: {
    name: 'Wavedash Jetski',
    item: 'craft_jetski',
    speed: 12.5,        // roughly 3x a swim, and faster than any land mount
    turn: 2.9,
    lean: 0.55,         // how hard it banks
    porpoise: 0.09,     // vertical bounce over the swell
    spray: 1,
    seatH: 0.52,
    blurb: 'Skips across the swell and throws a rooster tail of spray.',
  },
  dinghy: {
    name: 'Bobbin Dinghy',
    item: 'craft_dinghy',
    speed: 7.6,
    turn: 1.9,
    lean: 0.22,
    porpoise: 0.05,
    spray: 0.45,
    seatH: 0.34,
    blurb: 'A cozy little rowboat with a lantern on the bow.',
  },
};

// ---------------------------------------------------------------------------
// meshes
// ---------------------------------------------------------------------------
function buildJetski() {
  const g = new THREE.Group();
  const HULL = '#e8574a', TRIM = '#ffe27a', DARK = '#a83a30';

  // hull: three stacked slabs narrowing to a pointed nose, so the silhouette
  // has an actual prow instead of being a brick
  const belly = box(1.9, 0.22, 0.72, DARK);
  belly.position.y = 0.1; g.add(belly);
  const body = box(2.0, 0.26, 0.8, HULL);
  body.position.y = 0.3; g.add(body);
  const deck = box(1.5, 0.16, 0.66, HULL);
  deck.position.set(-0.1, 0.48, 0); g.add(deck);

  // pointed nose: two wedges
  const nose1 = box(0.42, 0.2, 0.5, HULL);
  nose1.position.set(1.12, 0.34, 0); nose1.rotation.z = -0.16; g.add(nose1);
  const nose2 = box(0.3, 0.14, 0.28, TRIM);
  nose2.position.set(1.34, 0.42, 0); nose2.rotation.z = -0.3; g.add(nose2);

  // racing stripe down each flank
  for (const sz of [-0.41, 0.41]) {
    const stripe = box(1.7, 0.07, 0.03, TRIM);
    stripe.position.set(-0.05, 0.33, sz); g.add(stripe);
  }

  // seat + backrest
  const seat = box(0.72, 0.16, 0.52, '#3a2f28');
  seat.position.set(-0.22, 0.62, 0); g.add(seat);
  const rest = box(0.14, 0.28, 0.5, '#3a2f28');
  rest.position.set(-0.6, 0.72, 0); g.add(rest);

  // handlebars: a column with a crossbar and two grips, angled back to the rider
  const col = box(0.16, 0.4, 0.24, DARK);
  col.position.set(0.42, 0.66, 0); col.rotation.z = 0.2; g.add(col);
  const bar = cyl(0.045, 0.045, 0.86, '#2c2c2c');
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.34, 0.88, 0); g.add(bar);
  for (const sz of [-0.4, 0.4]) {
    const grip = cyl(0.06, 0.06, 0.18, '#1c1c1c');
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0.34, 0.88, sz); g.add(grip);
  }
  const dash = box(0.2, 0.12, 0.3, '#2c2c2c');
  dash.position.set(0.46, 0.86, 0); dash.rotation.z = 0.35; g.add(dash);

  // jet nozzle at the stern — this is where the wake comes from
  const nozzle = cyl(0.11, 0.14, 0.22, '#6a6a6a');
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-1.02, 0.24, 0); g.add(nozzle);

  g.userData.exhaust = new THREE.Vector3(-1.15, 0.15, 0);
  g.userData.bow = new THREE.Vector3(1.3, 0.12, 0);
  return g;
}

function buildDinghy() {
  const g = new THREE.Group();
  const WOOD = '#a8804c', DARK = '#84633a', TRIM = '#e8dcc0';

  // a shallow open boat: floor + four walls, the bow wall angled in
  const floor = box(2.1, 0.14, 0.9, DARK);
  floor.position.y = 0.14; g.add(floor);
  for (const sz of [-0.48, 0.48]) {
    const side = box(2.1, 0.34, 0.1, WOOD);
    side.position.set(0, 0.34, sz); g.add(side);
    const rail = box(2.15, 0.06, 0.16, TRIM);
    rail.position.set(0, 0.52, sz); g.add(rail);
  }
  const stern = box(0.1, 0.34, 0.96, WOOD);
  stern.position.set(-1.05, 0.34, 0); g.add(stern);
  const bowA = box(0.5, 0.32, 0.7, WOOD);
  bowA.position.set(1.02, 0.34, 0); bowA.rotation.z = 0.12; g.add(bowA);
  const bowTip = box(0.34, 0.2, 0.34, WOOD);
  bowTip.position.set(1.32, 0.36, 0); bowTip.rotation.z = 0.24; g.add(bowTip);

  // bench + oars resting in their locks
  const bench = box(0.44, 0.1, 0.86, TRIM);
  bench.position.set(-0.2, 0.5, 0); g.add(bench);
  for (const sz of [-0.55, 0.55]) {
    const oar = cyl(0.035, 0.04, 1.5, '#8a6a44');
    oar.rotation.z = Math.PI / 2;
    oar.rotation.y = sz > 0 ? 0.4 : -0.4;
    oar.position.set(-0.1, 0.56, sz); g.add(oar);
    const blade = box(0.34, 0.03, 0.14, '#96754d');
    blade.position.set(-0.1 - Math.cos(0.4) * 0.8, 0.5, sz + (sz > 0 ? 0.32 : -0.32));
    g.add(blade);
  }

  // a lantern on the bow: this is the cozy option, it should glow at night
  const post = cyl(0.04, 0.045, 0.42, '#6e5334');
  post.position.set(0.98, 0.7, 0); g.add(post);
  // own material: the bow lamp animates its emissive
  const lamp = new THREE.Mesh(
    cylMesh(0.13, 0.13, 0.24, '#ffdca0', 8).geometry,
    sharedMat('#ffdca0', { unique: true, emissive: '#ffb85c' }),
  );
  lamp.position.set(0.98, 1.0, 0);
  lamp.material.emissiveIntensity = 0.7;
  g.add(lamp);
  const lampCap = cyl(0.03, 0.15, 0.06, '#c46a3a', 8);
  lampCap.position.set(0.98, 1.15, 0); g.add(lampCap);

  g.userData.lamp = lamp;
  g.userData.exhaust = new THREE.Vector3(-1.15, 0.1, 0);
  g.userData.bow = new THREE.Vector3(1.35, 0.1, 0);
  return g;
}

const BUILD = { jetski: buildJetski, dinghy: buildDinghy };

/**
 * @param hooks.onBoard/onLeave  toast + sfx hooks
 * @param hooks.owns(itemId)     does the player own this craft's key?
 */
export function createWatercraft(scene, terrain, particles, hooks = {}) {
  const state = {
    active: null,        // craft id while riding
    heading: 0,          // world yaw of the craft
    speed: 0,            // current forward speed
    lean: 0,
    bob: 0,
    moored: {},          // id -> { mesh, x, z, dir }
  };
  const group = new THREE.Group();
  scene.add(group);

  let ridden = null;     // the mesh currently under the player

  /** Park a craft on the water at (x, z), facing `dir`. */
  function moor(id, x, z, dir = 0) {
    const mesh = BUILD[id]();
    mesh.position.set(x, WATER_Y, z);
    mesh.rotation.y = dir;
    group.add(mesh);
    state.moored[id] = { mesh, x, z, dir, id };
    return state.moored[id];
  }

  /** The nearest moored craft within `r`, or null. Drives the interact prompt. */
  function nearest(pos, r = 2.6) {
    let best = null, bd = r * r;
    for (const m of Object.values(state.moored)) {
      if (state.active === m.id) continue;
      const d = (m.mesh.position.x - pos.x) ** 2 + (m.mesh.position.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  function board(id, player) {
    const m = state.moored[id];
    if (!m || state.active) return false;
    if (hooks.owns && !hooks.owns(CRAFT_DEFS[id].item)) {
      hooks.onDenied?.(CRAFT_DEFS[id]);
      return false;
    }
    state.active = id;
    state.heading = m.mesh.rotation.y;
    state.speed = 0;
    state.lean = 0;
    ridden = m.mesh;
    // the craft rides under the hero; the player group carries it so the camera
    // and every other system keep treating the player as the thing that moves
    player.state.group.add(ridden);
    ridden.position.set(0, -CRAFT_DEFS[id].seatH, 0);
    ridden.rotation.set(0, 0, 0);
    player.state.craft = { id, ...CRAFT_DEFS[id] };
    // sit the hero ON it: knees up, hands forward on the bars
    player.setCraftPose?.(true);
    // drop the hero onto the waterline
    player.state.pos.y = WATER_Y + CRAFT_DEFS[id].seatH;
    player.state.vy = 0;
    player.state.grounded = true;
    particles?.burst(player.state.pos.clone().setY(WATER_Y), '#dff6ff', 14, 3, 4, 0.5);
    hooks.onBoard?.(CRAFT_DEFS[id]);
    return true;
  }

  function leave(player) {
    if (!state.active) return;
    const id = state.active;
    const m = state.moored[id];
    // step off onto the nearest dry cell, and re-moor the craft where we stopped
    const shore = terrain.nearestShore(player.state.pos.x, player.state.pos.z);
    player.state.group.remove(ridden);
    group.add(ridden);
    const px = player.state.pos.x, pz = player.state.pos.z;
    ridden.position.set(px, WATER_Y, pz);
    ridden.rotation.set(0, state.heading, 0);
    m.x = px; m.z = pz; m.dir = state.heading;
    ridden = null;
    state.active = null;
    player.state.craft = null;
    player.setCraftPose?.(false);
    player.state.pos.set(shore.x, terrain.surfaceY(shore.x, shore.z), shore.z);
    player.state.grounded = true;
    particles?.burst(new THREE.Vector3(px, WATER_Y, pz), '#dff6ff', 10, 2.4, 4, 0.45);
    hooks.onLeave?.(CRAFT_DEFS[id]);
  }

  /**
   * Drive the craft. Called from the game loop INSTEAD of normal player
   * movement while `state.active` is set.
   * @param mv normalised {x, z} camera-relative move vector, or null
   */
  function drive(dt, player, mv, time) {
    if (!state.active) return;
    const def = CRAFT_DEFS[state.active];

    // steering: the craft turns toward the stick direction rather than snapping,
    // which is what gives it weight
    let throttle = 0;
    if (mv) {
      const want = Math.atan2(mv.x, mv.z);
      let diff = want - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-1, Math.min(1, diff / 0.9));
      state.heading += turn * def.turn * dt;
      throttle = 1;
      state.lean += (-turn * def.lean - state.lean) * Math.min(1, dt * 6);
    } else {
      state.lean += (0 - state.lean) * Math.min(1, dt * 4);
    }
    // throttle up fast, coast down slow — a jetski does not stop dead
    const target = throttle * def.speed;
    const accel = throttle ? 5.5 : 2.4;
    state.speed += (target - state.speed) * Math.min(1, dt * accel);

    const nx = player.state.pos.x + Math.sin(state.heading) * state.speed * dt;
    const nz = player.state.pos.z + Math.cos(state.heading) * state.speed * dt;
    const [ix, iz] = terrain.cellOf(nx, nz);
    if (terrain.inBounds(ix, iz) && terrain.swimmable(nx, nz)) {
      player.state.pos.x = nx;
      player.state.pos.z = nz;
    } else {
      // nosed into the beach: bleed the speed off and spray, then the rider can
      // step off with the interact button
      if (state.speed > 4) {
        particles?.burst(player.state.pos.clone().setY(WATER_Y + 0.1), '#eafcff', 8, 2.6, 5, 0.5);
        hooks.onBeach?.();
      }
      state.speed *= 0.25;
    }
    player.state.facing = state.heading;

    // porpoise over the swell + bank into the turn
    state.bob += dt * (2.5 + state.speed * 0.35);
    const rise = Math.sin(state.bob) * def.porpoise * (0.4 + state.speed / def.speed);
    player.state.pos.y = WATER_Y + def.seatH + rise;
    if (ridden) {
      ridden.rotation.z = state.lean;
      ridden.rotation.x = -Math.sin(state.bob * 0.7) * 0.05 - state.speed / def.speed * 0.07;
    }

    // WAKE: foam behind the nozzle, spray off the bow at speed, and a ripple
    // ring dropped periodically so the trail persists on the surface
    const fast = state.speed / def.speed;
    if (fast > 0.12) {
      const back = new THREE.Vector3(
        player.state.pos.x - Math.sin(state.heading) * 1.2,
        WATER_Y + 0.04,
        player.state.pos.z - Math.cos(state.heading) * 1.2,
      );
      if (Math.random() < dt * 40 * fast * def.spray) {
        particles?.burst(back, '#f2feff', 2, 1.5 + fast * 2.5, 3.5, 0.45);
      }
      if (fast > 0.55 && Math.random() < dt * 7) {
        particles?.ring?.(back.clone(), '#eafcff', 1.1 + fast, 0.35);
      }
      if (fast > 0.4 && Math.random() < dt * 18 * def.spray) {
        const bow = new THREE.Vector3(
          player.state.pos.x + Math.sin(state.heading) * 1.3,
          WATER_Y + 0.1,
          player.state.pos.z + Math.cos(state.heading) * 1.3,
        );
        particles?.burst(bow, '#ffffff', 1, 2.2, 4.5, 0.35);
      }
    }
    if (ridden?.userData.lamp) {
      ridden.userData.lamp.material.emissiveIntensity = 0.55 + Math.sin(time * 4) * 0.15;
    }
  }

  /** Idle bob for the moored craft, so the marina isn't a car park. */
  function update(dt, time) {
    for (const m of Object.values(state.moored)) {
      if (state.active === m.id) continue;
      m.mesh.position.y = WATER_Y + Math.sin(time * 1.4 + m.x) * 0.05;
      m.mesh.rotation.z = Math.sin(time * 1.1 + m.z) * 0.05;
      m.mesh.rotation.x = Math.cos(time * 0.9 + m.x) * 0.035;
      if (m.mesh.userData.lamp) {
        m.mesh.userData.lamp.material.emissiveIntensity = 0.5 + Math.sin(time * 2.2) * 0.2;
      }
    }
  }

  function dispose() {
    disposeObject(group, true);
    scene.remove(group);
  }

  return { state, moor, nearest, board, leave, drive, update, dispose, CRAFT_DEFS };
}
