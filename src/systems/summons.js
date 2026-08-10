// SUMMONS — the Summoner's little army.
//
// Three kinds, and they are deliberately different to look at from across a
// field, because a summoner who has three things out needs to read at a glance
// which is which: a squat mossy BEAST that runs in and bites, a boxy walking
// BOT that stomps, and a static TURRET that never moves and never stops firing.
//
// They are timed AND killable. The first pass made them timed only, on the
// theory that a summon which can die turns a fight into babysitting — but that
// gave the Summoner a permanent wall of bodies that nothing in the game could
// answer, and the honest name for that is not a class, it is a bug. Monsters
// hit them now, and the cap is small, so the decision is *where* you put them
// rather than how many you can stack.
//
// They also have a leash: nothing wanders more than LEASH metres from its
// owner, so a beast cannot drag half the map back to you.
//
// Everything here routes through the shared mesh cache, because a Legion cast
// puts six bodies on screen in one frame and six fresh material sets is exactly
// the sort of thing that hitches.

import * as THREE from 'three';
import { boxMesh, cylMesh, sphereMesh } from '../gfx/meshcache.js';
import { disposeObject } from '../util/dispose.js';

// THEY STAY WITH YOU.
//
// The first version let a beast run 16 units off and hunt anything within 13 —
// which in practice meant a Summoner stood still, spammed the button, and a
// pack of them cleared the map on their own. That is not a class, it is an
// autoplayer. They are bodyguards now: they hold a tight formation on their
// owner and only engage what has already come close to YOU.
const LEASH = 5.5;         // how far a summon may stray from its owner
const SEEK = 6.5;          // and it only looks for trouble this near to them

/** A squat four-legged rock-beast. Reads as "mine" at a glance: mossy green. */
function buildBeast() {
  const g = new THREE.Group();
  const body = boxMesh(0.72, 0.5, 0.95, '#5f7a4a');
  body.position.y = 0.46;
  g.add(body);
  const back = boxMesh(0.62, 0.16, 0.8, '#7fa85a');   // mossy shell
  back.position.y = 0.74;
  g.add(back);
  const head = boxMesh(0.5, 0.42, 0.42, '#6b8a52');
  head.position.set(0, 0.62, 0.6);
  g.add(head);
  for (const sx of [-1, 1]) {
    const eye = sphereMesh(0.09, '#ffffff');
    eye.position.set(sx * 0.14, 0.68, 0.82);
    g.add(eye);
    const pup = sphereMesh(0.05, '#20301c');
    pup.position.set(sx * 0.15, 0.68, 0.87);
    g.add(pup);
  }
  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = boxMesh(0.2, 0.34, 0.2, '#46603a');
    l.position.set(sx * 0.26, 0.19, sz * 0.32);
    g.add(l);
    legs.push(l);
  }
  g.userData.legs = legs;
  return g;
}

/** A boxy little war robot. Grey plate, one glowing eye slit, stubby cannon. */
function buildBot() {
  const g = new THREE.Group();
  const torso = boxMesh(0.7, 0.72, 0.5, '#8f97a2');
  torso.position.y = 0.86;
  g.add(torso);
  const plate = boxMesh(0.76, 0.22, 0.54, '#6c7480');
  plate.position.y = 1.06;
  g.add(plate);
  const head = boxMesh(0.42, 0.3, 0.38, '#a8b0ba');
  head.position.y = 1.36;
  g.add(head);
  const slit = boxMesh(0.34, 0.08, 0.04, '#6ec8d8');
  slit.position.set(0, 1.38, 0.2);
  slit.material = slit.material.clone();          // it pulses; it owns this one
  slit.material.emissive = new THREE.Color('#6ec8d8');
  slit.material.emissiveIntensity = 1.4;
  g.add(slit);
  g.userData.slit = slit;
  const arm = cylMesh(0.12, 0.12, 0.6, '#5f6772');
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0.44, 0.94, 0.22);
  g.add(arm);
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = boxMesh(0.24, 0.5, 0.28, '#6c7480');
    l.position.set(sx * 0.2, 0.25, 0);
    g.add(l);
    legs.push(l);
  }
  g.userData.legs = legs;
  return g;
}

/** A tripod gun. Never moves, so it gets the most detail per triangle. */
function buildTurret() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cylMesh(0.06, 0.06, 0.62, '#5f6772');
    leg.position.set(Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2);
    leg.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    g.add(leg);
  }
  const base = cylMesh(0.3, 0.34, 0.18, '#6c7480');
  base.position.y = 0.66;
  g.add(base);
  const dome = sphereMesh(0.26, '#8f97a2');
  dome.position.y = 0.8;
  g.add(dome);
  const barrel = cylMesh(0.09, 0.11, 0.72, '#4c545e');
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.84, 0.36);
  g.add(barrel);
  const eye = sphereMesh(0.1, '#6ec8d8');
  eye.material = eye.material.clone();
  eye.material.emissive = new THREE.Color('#6ec8d8');
  eye.material.emissiveIntensity = 1.6;
  eye.position.set(0, 0.96, 0.1);
  g.add(eye);
  g.userData.head = dome;
  g.userData.barrel = barrel;
  g.userData.eye = eye;
  return g;
}

const BUILD = { beast: buildBeast, bot: buildBot, turret: buildTurret };

const STATS = {
  //  `life` is seconds, `hp` is how much punishment it takes, and `dmg` is a
  //  multiplier on the caster's own hit. The turret is the most fragile because
  //  it cannot move out of the way of anything.
  beast:  { life: 20, hp: 40, dmg: 0.55, rate: 0.9, speed: 5.6, reach: 1.5, scale: 1.0 },
  bot:    { life: 22, hp: 70, dmg: 1.05, rate: 1.5, speed: 3.6, reach: 1.8, scale: 1.0 },
  turret: { life: 18, hp: 26, dmg: 0.45, rate: 0.7, speed: 0,   reach: 12,  scale: 1.0 },
};

/**
 * deps: { scene, terrain, enemyMgr, projectiles, particles, dmgNums, audio,
 *         hitEnemy(e, mult) }
 */
export function createSummons(deps) {
  const list = [];
  // A SMALL CEILING. Eight was chosen when they could not die; with monsters
  // able to answer them, five is a squad rather than a barricade.
  const MAX = 5;

  function spawn(kind, pos, opts = {}) {
    const st = STATS[kind];
    if (!st) return null;
    // oldest first, so the thing you just paid a cooldown for is never the one
    // that gets culled
    while (list.length >= MAX) retire(list[0]);

    const mesh = BUILD[kind]();
    const s = (opts.scale || 1) * st.scale;
    mesh.scale.setScalar(s);
    mesh.position.copy(pos);
    mesh.position.y = deps.terrain.surfaceY(pos.x, pos.z);
    deps.scene.add(mesh);
    deps.particles.fountain(mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      kind === 'beast' ? '#8ad86e' : '#6ec8d8', 18);
    deps.particles.shockwave(mesh.position, '#6ec8d8', 1.8, 0.3);

    const s2 = {
      kind, mesh, life: st.life * (opts.lifeMult || 1), cd: 0,
      hp: st.hp, hpMax: st.hp, hurtT: 0,
      dmg: st.dmg * (opts.dmgMult || 1), phase: Math.random() * 6.28,
      bob: 0,
    };
    list.push(s2);
    return s2;
  }

  function retire(s) {
    const i = list.indexOf(s);
    if (i >= 0) list.splice(i, 1);
    deps.particles.burst(s.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), '#6ec8d8', 12, 2);
    deps.scene.remove(s.mesh);
    disposeObject(s.mesh, false);
  }

  /**
   * A monster hit one of them. Returns true if it died, so the caller can spend
   * its attack on something that is still standing.
   */
  function damage(s, amount) {
    if (!s || s.hp <= 0) return false;
    s.hp -= amount;
    s.hurtT = 0.18;
    deps.particles.burst(
      s.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ff8a7a', 6, 2.2);
    if (s.hp <= 0) {
      deps.particles.burst(
        s.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), '#6ec8d8', 18, 3.4);
      deps.audio.sfx?.('hit');
      retire(s);
      return true;
    }
    return false;
  }

  /** The nearest living summon to a point — what an enemy targets. */
  function nearestTo(pos, r = 3) {
    let best = null, bd = r * r;
    for (const s of list) {
      if (s.hp <= 0) continue;
      const dx = s.mesh.position.x - pos.x, dz = s.mesh.position.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function nearestEnemy(from, r) {
    let best = null, bd = r * r;
    for (const e of deps.enemyMgr.enemies) {
      if (e.dead) continue;
      const dx = e.mesh.position.x - from.x, dz = e.mesh.position.z - from.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  const state = { time: 0 };

  function update(dt, ownerPos) {
    state.time += dt;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      s.life -= dt;
      if (s.life <= 0 || s.hp <= 0) { retire(s); continue; }
      if (s.cd > 0) s.cd -= dt;
      // a brief lift when struck, so being hit is visible without a health bar
      if (s.hurtT > 0) {
        s.hurtT -= dt;
        s.mesh.scale.setScalar((s.kind === 'turret' ? 1 : 1) * (1 + s.hurtT * 0.5));
      }

      const st = STATS[s.kind];
      const p = s.mesh.position;
      const target = nearestEnemy(p, SEEK);

      if (s.kind === 'turret') {
        // never moves; tracks and fires — but only at things that have come to
        // the owner, so a dropped turret cannot farm a hillside by itself
        const nearOwner = target
          && Math.hypot(target.mesh.position.x - ownerPos.x, target.mesh.position.z - ownerPos.z) < SEEK + 3;
        if (target && nearOwner) {
          const a = Math.atan2(target.mesh.position.x - p.x, target.mesh.position.z - p.z);
          s.mesh.rotation.y = a;
          if (s.cd <= 0) {
            s.cd = st.rate;
            deps.projectiles.spawn({
              pos: p.clone().add(new THREE.Vector3(0, 0.86, 0)),
              dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
              speed: 26, range: SEEK, radius: 0.5,
              kind: 'bolt', color: '#6ec8d8', trail: '#6ec8d8',
              onHitEnemy: (e) => deps.hitEnemy(e, s.dmg),
            });
            deps.particles.flash(p.clone().add(new THREE.Vector3(0, 0.9, 0)), '#6ec8d8', 2.4, 0.12);
          }
        }
        const eye = s.mesh.userData.eye;
        if (eye) eye.material.emissiveIntensity = 1.2 + Math.sin(performance.now() * 0.006 + s.phase) * 0.5;
        // fade out in its last second rather than blinking away
        continue;
      }

      // FORMATION FIRST, target second. Each walker owns a slot around its
      // owner and returns to it; it will only break off for something that is
      // both near the owner and near itself, so a summon can never wander off
      // and start a fight you did not pick.
      const slot = (i / Math.max(1, list.length)) * Math.PI * 2 + state.time * 0.35;
      const homeX = ownerPos.x + Math.cos(slot) * 2.1;
      const homeZ = ownerPos.z + Math.sin(slot) * 2.1;
      let goX = homeX, goZ = homeZ, chasing = false;
      const fromOwner = target
        ? Math.hypot(target.mesh.position.x - ownerPos.x, target.mesh.position.z - ownerPos.z)
        : 99;
      if (target && fromOwner < SEEK) {
        goX = target.mesh.position.x; goZ = target.mesh.position.z; chasing = true;
      }
      // hard leash: never further from the owner than LEASH, whatever it wants
      if (Math.hypot(goX - ownerPos.x, goZ - ownerPos.z) > LEASH) {
        const dx0 = goX - ownerPos.x, dz0 = goZ - ownerPos.z;
        const l0 = Math.hypot(dx0, dz0) || 1;
        goX = ownerPos.x + (dx0 / l0) * LEASH;
        goZ = ownerPos.z + (dz0 / l0) * LEASH;
      }
      const dx = goX - p.x, dz = goZ - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const stopAt = chasing ? st.reach : 0.6;
      let moving = false;
      if (d > stopAt) {
        const v = st.speed * dt;
        p.x += (dx / d) * v;
        p.z += (dz / d) * v;
        s.mesh.rotation.y = Math.atan2(dx, dz);   // +Z-forward mesh
        moving = true;
      }
      p.y = deps.terrain.surfaceY(p.x, p.z);

      // legs: a two-beat trot while moving, still when not
      s.phase += dt * (moving ? 11 : 1.5);
      const legs = s.mesh.userData.legs || [];
      legs.forEach((l, k) => {
        l.rotation.x = moving ? Math.sin(s.phase + (k % 2 ? Math.PI : 0)) * 0.55 : 0;
      });
      if (s.kind === 'bot') {
        const slit = s.mesh.userData.slit;
        if (slit) slit.material.emissiveIntensity = 1.1 + Math.sin(performance.now() * 0.005) * 0.4;
      }

      if (chasing && d <= stopAt && s.cd <= 0) {
        s.cd = st.rate;
        deps.hitEnemy(target, s.dmg);
        deps.particles.burst(
          target.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
          s.kind === 'bot' ? '#c8ccd4' : '#8ad86e', 8, 2.4);
        if (s.kind === 'bot') deps.particles.shockwave(p.clone(), '#c8ccd4', 1.4, 0.22);
      }
    }
  }

  function clear() { for (let i = list.length - 1; i >= 0; i--) retire(list[i]); }

  /** Repair Field mends the owner AND everything it owns — so summons need a
   *  way to be topped up, which for a timed summon means more TIME. */
  function extendAll(secs) { for (const s of list) s.life += secs; }

  return { spawn, update, clear, extendAll, damage, nearestTo, list, count: () => list.length };
}
