// OTHER PLAYERS.
//
// Builds and animates a body for everyone else in the world, reusing the exact
// same `buildCharacterMesh` the hero uses — so another player's hat, cape,
// outfit and hair are the ones they actually chose, not a generic stand-in.
// Seeing yourself reflected in other people is most of what makes a world feel
// shared, and it costs nothing extra because the builder already exists.
//
// The one hard problem here is that positions arrive 8 times a second and the
// screen redraws 60. Snapping to each packet is exactly what makes networked
// characters look like they are teleporting, so every remote body eases toward
// its target and derives its own walk animation from how fast it is actually
// moving — no animation state has to be sent at all.

import * as THREE from 'three';
import { buildCharacterMesh } from '../entities/player.js';
import { PET_BUILDERS } from '../systems/pets.js';
import { MOUNT_BUILDERS, MOUNT_DEFS } from '../systems/mounts.js';
import { disposeObject } from '../util/dispose.js';

const NAME_W = 256, NAME_H = 64;
const BUB_W = 320, BUB_H = 96;
const BUBBLE_SECS = 5.5;

/** A speech bubble. Same trick as the nameplate: paint a canvas, hang it as a
 *  sprite. Chat that only exists in a log in the corner reads as a chat room
 *  with a game behind it — over the head, it reads as somebody talking. */
function makeBubble(text) {
  const c = document.createElement('canvas');
  c.width = BUB_W; c.height = BUB_H;
  const ctx = c.getContext('2d');
  ctx.font = '26px "Pixelify Sans", system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // wrap to at most three lines, then hard-truncate — a paragraph over
  // somebody's head would be a wall, and the tail has to stay attached to it
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > BUB_W - 34 && line) { lines.push(line); line = w; }
    else line = t;
    if (lines.length === 3) break;
  }
  if (line && lines.length < 3) lines.push(line);
  if (!lines.length) lines.push('…');

  const lh = 30;
  const w = Math.min(BUB_W - 8, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 30);
  const h = lines.length * lh + 18;
  const x = (BUB_W - w) / 2, y = 2;

  ctx.fillStyle = 'rgba(12,18,12,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(216,184,102,0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  // the little tail, so it points at whoever said it
  ctx.fillStyle = 'rgba(12,18,12,0.9)';
  ctx.beginPath();
  ctx.moveTo(BUB_W / 2 - 9, y + h - 1);
  ctx.lineTo(BUB_W / 2 + 9, y + h - 1);
  ctx.lineTo(BUB_W / 2, y + h + 13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#eaf2df';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, BUB_W / 2, y + 16 + i * lh));

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false,
  }));
  spr.scale.set(3.0, 0.9, 1);
  spr.renderOrder = 21;
  return spr;
}

/** A floating name + level plate. Canvas, like the enemy nameplates. */
function makePlate(name, lv) {
  const c = document.createElement('canvas');
  c.width = NAME_W; c.height = NAME_H;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 30px "Pixelify Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(name, NAME_W / 2, 34);
  ctx.fillStyle = '#eaf2df';
  ctx.fillText(name, NAME_W / 2, 34);
  ctx.font = 'bold 20px "Pixelify Sans", system-ui, sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeText(`Lv ${lv}`, NAME_W / 2, 58);
  ctx.fillStyle = '#ffe27a';
  ctx.fillText(`Lv ${lv}`, NAME_W / 2, 58);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false,
  }));
  spr.scale.set(2.2, 0.55, 1);
  spr.renderOrder = 20;
  return spr;
}

export function createRemotePlayers(scene, terrain) {
  const bodies = new Map();     // id -> { group, parts, plate, walkPhase }
  // your OWN bubble. You have to see what you said land in the world, or the
  // world only looks like it is talking to you and never back.
  const self = { group: null, bubble: null, t: 0 };

  function add(p) {
    if (bodies.has(p.id)) return;
    let built;
    try {
      built = buildCharacterMesh({
        cls: p.cls || 'knight',
        gender: p.appearance?.gender || 'male',
        skin: p.appearance?.skin ?? 1,
        hairStyle: p.appearance?.hairStyle ?? 0,
        hairColor: p.appearance?.hairColor ?? 0,
        eyes: p.appearance?.eyes ?? 0,
        accessory: p.appearance?.accessory ?? 0,
        outfitStyle: p.appearance?.outfitStyle ?? 0,
        outfit: p.appearance?.outfit ?? 0,
        cape: p.appearance?.cape ?? -1,
      });
    } catch (e) {
      // Another client's appearance must never be able to break OUR game.
      console.warn('[net] could not build a remote body, using a default:', e.message);
      built = buildCharacterMesh({ cls: 'knight' });
    }
    const group = built.group || built;
    const plate = makePlate(p.name || 'Wanderer', p.lv || 1);
    plate.position.y = 2.0;
    group.add(plate);
    group.position.set(p.x || 0, p.y || 0, p.z || 0);
    scene.add(group);
    const b = {
      group, rig: built, parts: built.parts, vis: built.vis, plate,
      walkPhase: Math.random() * 6.28, lastX: p.x || 0, lastZ: p.z || 0, speed: 0,
      // combat + gear. Ids rather than a version counter — see applyGear.
      atk: 0, wasAtk: false,
      weaponId: undefined, pet: null, petId: null, petPhase: 0,
      mount: null, mountId: null, mountPhase: 0, seatH: 0,
      fishing: false,
      bubble: null, bubbleT: 0,
    };
    bodies.set(p.id, b);
    applyGear(b, p);
  }

  /** Put the right sword in their hand and the right creature at their heel.
   *  Both are looked up in OUR item/pet tables, so an id we do not know simply
   *  draws nothing — a remote client cannot make us build something strange. */
  function applyGear(b, p) {
    // COMPARE THE ACTUAL IDS, not a version counter.
    //
    // The gate used to be `b.gearV === (p.gearV || 0)`, and nothing on the wire
    // ever sets gearV — so it was 0 === 0 forever and the whole function bailed
    // on the second call. Whatever weapon somebody happened to be holding when
    // you first saw them is what you kept seeing, for the rest of the session.
    // That is most of "I cannot tell what my friend is carrying".
    const wantWeapon = p.weapon || null;
    const wantPet = p.pet || null;
    const wantMount = p.mount || null;
    if (b.weaponId === wantWeapon && b.petId === wantPet && b.mountId === wantMount) return;

    if (b.weaponId !== wantWeapon) {
      b.weaponId = wantWeapon;
      if (b.rig?.setWeapon) {
        try { b.rig.setWeapon(wantWeapon); } catch { /* unknown id: keep bare hands */ }
      }
    }

    if (wantPet !== b.petId) {
      if (b.pet) { scene.remove(b.pet); disposeObject(b.pet, false); b.pet = null; }
      b.petId = wantPet;
      const make = wantPet && PET_BUILDERS[wantPet];
      if (make) {
        try {
          b.pet = make();
          // parented to the SCENE, not to its owner: a pet rigidly bolted behind
          // a body turns with it like a trailer, and the whole charm of a pet is
          // that it trots to catch up
          b.pet.position.copy(b.group.position);
          scene.add(b.pet);
        } catch { b.pet = null; }
      }
    }

    // THE MOUNT WAS NEVER HANDLED AT ALL. It was on the wire, the protocol
    // carried it in both directions, and this function simply did not read it —
    // so everyone rode invisible animals and appeared to be gliding.
    if (wantMount !== b.mountId) {
      if (b.mount) { b.group.remove(b.mount); disposeObject(b.mount, false); b.mount = null; }
      b.mountId = wantMount;
      const def = wantMount && MOUNT_DEFS[wantMount];
      const build = def && MOUNT_BUILDERS[wantMount];
      if (build) {
        try {
          b.mount = build();
          b.mount.position.y = 0;
          b.group.add(b.mount);
          b.seatH = def.seatH || 0.6;      // lifts the rider onto its back
        } catch { b.mount = null; }
      } else {
        b.seatH = 0;
      }
    }
  }

  function bindSelf(group) { self.group = group; }

  /** You said something. Same bubble, over your own head. */
  function sayLocal(text) {
    if (!self.group) return;
    if (self.bubble) {
      self.group.remove(self.bubble);
      self.bubble.material.map?.dispose();
      self.bubble.material.dispose();
    }
    self.bubble = makeBubble(text);
    self.bubble.position.y = 2.85;
    self.group.add(self.bubble);
    self.t = BUBBLE_SECS;
  }

  /** Somebody said something — float it over their head. */
  function say(id, text) {
    const b = bodies.get(id);
    if (!b) return;
    if (b.bubble) {
      b.group.remove(b.bubble);
      b.bubble.material.map?.dispose();
      b.bubble.material.dispose();
    }
    b.bubble = makeBubble(text);
    b.bubble.position.y = 2.85;
    b.group.add(b.bubble);
    b.bubbleT = BUBBLE_SECS;
  }

  function remove(id) {
    const b = bodies.get(id);
    if (!b) return;
    scene.remove(b.group);
    // the plate owns a canvas texture nobody else shares, so it must go
    b.plate.material.map?.dispose();
    b.plate.material.dispose();
    if (b.bubble) {
      b.bubble.material.map?.dispose();
      b.bubble.material.dispose();
    }
    if (b.pet) { scene.remove(b.pet); disposeObject(b.pet, false); }
    disposeObject(b.group, false);
    bodies.delete(id);
  }

  function clear() { for (const id of [...bodies.keys()]) remove(id); }

  /**
   * @param netPlayers the client's `state.players` map, carrying tx/ty/tz targets
   */
  function update(dt, netPlayers, viewer) {
    if (self.bubble) {
      self.t -= dt;
      if (self.t <= 0) {
        self.group.remove(self.bubble);
        self.bubble.material.map?.dispose();
        self.bubble.material.dispose();
        self.bubble = null;
      } else {
        self.bubble.material.opacity = Math.min(1, self.t / 0.8);
      }
    }

    // reconcile: build anyone new, drop anyone gone
    for (const [id, p] of netPlayers) if (!bodies.has(id)) add({ id, ...p });
    for (const id of [...bodies.keys()]) if (!netPlayers.has(id)) remove(id);

    for (const [id, b] of bodies) {
      const p = netPlayers.get(id);
      if (!p) continue;
      applyGear(b, p);
      const g = b.group;
      const px = g.position.x, pz = g.position.z;

      // EASE toward the target rather than snapping to it. The rate is high
      // enough to stay honest about where someone is and low enough that a
      // dropped packet reads as a slight glide instead of a stutter.
      const k = Math.min(1, dt * 12);
      g.position.x += ((p.tx ?? p.x) - g.position.x) * k;
      g.position.z += ((p.tz ?? p.z) - g.position.z) * k;
      // Y follows the LOCAL terrain, not the wire: every client has the same
      // heightfield, so sending it would be wasted bytes, and reading it here
      // means remote players never sink into a hill during a lag spike.
      const groundY = terrain.surfaceY(g.position.x, g.position.z);
      const wantY = Math.max(groundY, (p.ty ?? p.y ?? groundY));
      g.position.y += (wantY - g.position.y) * Math.min(1, dt * 10);

      // facing: shortest way round, so nobody spins 350 degrees the wrong way
      const tf = p.tf ?? p.f ?? 0;
      let df = tf - g.rotation.y;
      while (df > Math.PI) df -= Math.PI * 2;
      while (df < -Math.PI) df += Math.PI * 2;
      g.rotation.y += df * Math.min(1, dt * 10);

      // ANIMATION FROM MOVEMENT. Derived from how far the body actually moved,
      // so no animation state ever has to cross the wire and a remote walk can
      // never disagree with a remote position.
      const moved = Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 0.0001);
      b.speed += (moved - b.speed) * Math.min(1, dt * 8);

      // ATTACKING. The wire carries a one-word action, and a swing is far
      // shorter than the gap between packets — so the packet does not drive the
      // pose, it TRIGGERS a swing that then plays out locally at full framerate.
      // Reading the flag directly would give a three-frame twitch.
      const isAtk = p.a === 'atk';
      if (isAtk && !b.wasAtk) b.atk = 0.42;
      b.wasAtk = isAtk;
      if (b.atk > 0) b.atk = Math.max(0, b.atk - dt);
      b.fishing = !!p.b && !isAtk;      // `b` on the wire is "busy": fishing or talking

      // RIDING. The mount is parented to the body group, so it follows position
      // and facing for free; the rider just has to sit ON it rather than inside
      // it, and their legs have to stop walking in mid-air.
      const riding = !!b.mount;
      if (b.vis) {
        const lift = riding ? (b.seatH || 0.6) : 0;
        b.vis.position.y += (lift - b.vis.position.y) * Math.min(1, dt * 8);
      }
      if (b.mount) {
        // gallop, driven by how fast the body is actually moving
        b.mountPhase = (b.mountPhase || 0) + dt * (3 + b.speed * 1.6);
        b.mount.position.y = Math.abs(Math.sin(b.mountPhase)) * 0.06;
        const legs = b.mount.userData?.legs;
        if (legs) {
          const sw = Math.sin(b.mountPhase * 2);
          legs.forEach((l, i) => { l.rotation.x = sw * (i % 2 ? -0.5 : 0.5); });
        }
      }

      const parts = b.parts;
      if (parts && b.fishing) {
        // FISHING, so other people can see what you are doing rather than
        // watching you stand perfectly still at the water's edge.
        parts.armR.rotation.x = -1.15;
        parts.armR.rotation.z = -0.2;
        parts.armL.rotation.x = -1.0;
        parts.armL.rotation.z = 0.36;
        parts.legL.rotation.x = 0.1; parts.legR.rotation.x = -0.08;
        if (parts.body) parts.body.rotation.y *= 0.8;
      } else if (parts && riding) {
        // seated: knees up, hands forward on the reins
        parts.legL.rotation.x = 1.3; parts.legR.rotation.x = 1.3;
        parts.legL.rotation.z = 0.2; parts.legR.rotation.z = -0.2;
        if (b.atk <= 0) {
          parts.armL.rotation.x = -1.1; parts.armR.rotation.x = -1.1;
        }
      } else if (parts) {
        if (b.atk > 0) {
          // wind up, then whip through: t runs 0 -> 1 across the swing
          const t = 1 - b.atk / 0.42;
          const swing = t < 0.3
            ? -1.5 * (t / 0.3)                       // arm back
            : -1.5 + 3.4 * ((t - 0.3) / 0.7) ** 0.6; // and down through the arc
          parts.armR.rotation.x = swing;
          parts.armL.rotation.x = -swing * 0.25;
          // the shoulders lead the hands, which is what stops it reading as a
          // waving arm bolted to a still body
          if (parts.body) parts.body.rotation.y = Math.sin(t * Math.PI) * 0.42;
          parts.legL.rotation.x *= 0.8; parts.legR.rotation.x *= 0.8;
        } else if (b.speed > 0.4) {
          if (parts.body) parts.body.rotation.y *= 0.8;
          b.walkPhase += dt * (4 + b.speed * 1.4);
          const sw = Math.sin(b.walkPhase);
          parts.legL.rotation.x = sw * 0.7;
          parts.legR.rotation.x = -sw * 0.7;
          parts.armL.rotation.x = -sw * 0.5;
          parts.armR.rotation.x = sw * 0.5;
        } else {
          if (parts.body) parts.body.rotation.y *= 0.8;
          const idle = Math.sin(performance.now() * 0.002 + b.walkPhase) * 0.03;
          parts.legL.rotation.x *= 0.85; parts.legR.rotation.x *= 0.85;
          parts.armL.rotation.x = idle; parts.armR.rotation.x = -idle;
        }
      }

      // THE PET, trotting to catch up. Same springy chase the local pet uses:
      // it aims for a spot behind its owner's shoulder and bobs while moving.
      if (b.pet) {
        const behind = -g.rotation.y;
        const tx = g.position.x - Math.sin(g.rotation.y) * 1.0 - Math.cos(g.rotation.y) * 0.6;
        const tz = g.position.z - Math.cos(g.rotation.y) * 1.0 + Math.sin(g.rotation.y) * 0.6;
        const dx = tx - b.pet.position.x, dz = tz - b.pet.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const k = Math.min(1, dt * 4.2);
          b.pet.position.x += dx * k;
          b.pet.position.z += dz * k;
          b.pet.rotation.y = Math.atan2(dx, dz);   // +Z-forward, per the convention
          b.petPhase += dt * (5 + d * 2);
        }
        b.pet.position.y = terrain.surfaceY(b.pet.position.x, b.pet.position.z)
          + Math.abs(Math.sin(b.petPhase)) * (d > 0.3 ? 0.16 : 0.03);
        void behind;
      }

      // the bubble expires on its own and fades on the way out
      if (b.bubble) {
        b.bubbleT -= dt;
        if (b.bubbleT <= 0) {
          g.remove(b.bubble);
          b.bubble.material.map?.dispose();
          b.bubble.material.dispose();
          b.bubble = null;
        } else {
          b.bubble.material.opacity = Math.min(1, b.bubbleT / 0.8);
        }
      }

      // the plate fades out with distance rather than cluttering the horizon
      if (viewer) {
        const d = Math.hypot(g.position.x - viewer.x, g.position.z - viewer.z);
        b.plate.visible = d < 42;
        b.plate.material.opacity = Math.max(0, Math.min(1, (42 - d) / 12));
      }
    }
  }

  return { update, clear, remove, say, sayLocal, bindSelf, count: () => bodies.size, bodies };
}
