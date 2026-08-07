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
import { disposeObject } from '../util/dispose.js';

const NAME_W = 256, NAME_H = 64;

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
    bodies.set(p.id, {
      group, parts: built.parts, plate,
      walkPhase: Math.random() * 6.28, lastX: p.x || 0, lastZ: p.z || 0, speed: 0,
    });
  }

  function remove(id) {
    const b = bodies.get(id);
    if (!b) return;
    scene.remove(b.group);
    // the plate owns a canvas texture nobody else shares, so it must go
    b.plate.material.map?.dispose();
    b.plate.material.dispose();
    disposeObject(b.group, false);
    bodies.delete(id);
  }

  function clear() { for (const id of [...bodies.keys()]) remove(id); }

  /**
   * @param netPlayers the client's `state.players` map, carrying tx/ty/tz targets
   */
  function update(dt, netPlayers, viewer) {
    // reconcile: build anyone new, drop anyone gone
    for (const [id, p] of netPlayers) if (!bodies.has(id)) add({ id, ...p });
    for (const id of [...bodies.keys()]) if (!netPlayers.has(id)) remove(id);

    for (const [id, b] of bodies) {
      const p = netPlayers.get(id);
      if (!p) continue;
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
      const parts = b.parts;
      if (parts) {
        if (b.speed > 0.4) {
          b.walkPhase += dt * (4 + b.speed * 1.4);
          const sw = Math.sin(b.walkPhase);
          parts.legL.rotation.x = sw * 0.7;
          parts.legR.rotation.x = -sw * 0.7;
          parts.armL.rotation.x = -sw * 0.5;
          parts.armR.rotation.x = sw * 0.5;
        } else {
          const idle = Math.sin(performance.now() * 0.002 + b.walkPhase) * 0.03;
          parts.legL.rotation.x *= 0.85; parts.legR.rotation.x *= 0.85;
          parts.armL.rotation.x = idle; parts.armR.rotation.x = -idle;
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

  return { update, clear, remove, count: () => bodies.size, bodies };
}
