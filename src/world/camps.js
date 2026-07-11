// Rest camps — cozy waypoints scattered across the wilds: a crackling
// campfire (cook here!), a little tent and a log bench. Camps are SAFE ZONES:
// monsters keep out, and resting near the fire heals you quickly.
import * as THREE from 'three';
import { WATER_LEVEL } from './terrain.js';

const CAMP_COUNT = 4;
export const CAMP_SAFE_R = 7;     // monsters won't enter this radius
export const CAMP_HEAL_R = 3.5;   // fast healing this close to the fire

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

function buildCamp() {
  const g = new THREE.Group();

  // campfire: stone ring, logs, flame
  const fire = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), lam('#8d9294'));
    stone.position.set(Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4);
    stone.rotation.y = a;
    fire.add(stone);
  }
  for (const r of [0.6, -0.5]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), lam('#6a4a30'));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = r;
    log.position.y = 0.1;
    fire.add(log);
  }
  const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
    new THREE.MeshBasicMaterial({ color: 0xffaa33 }));
  flame.position.y = 0.26;
  const flameCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0),
    new THREE.MeshBasicMaterial({ color: 0xffdd55 }));
  flameCore.position.y = 0.3;
  const light = new THREE.PointLight(0xffaa44, 3.2, 8, 1.8);
  light.position.y = 0.6;
  fire.add(flame, flameCore, light);
  g.add(fire);
  g.userData.flame = flame;
  g.userData.flameCore = flameCore;
  g.userData.light = light;

  // tent: two leaning panels + cross poles
  const tent = new THREE.Group();
  const clothA = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.1), lam('#c8a06a'));
  clothA.rotation.z = 0.85;
  clothA.position.set(-0.42, 0.55, 0);
  const clothB = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.1), lam('#b8905a'));
  clothB.rotation.z = -0.85;
  clothB.position.set(0.42, 0.55, 0);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), lam('#6a4a30'));
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = 0.98;
  tent.add(clothA, clothB, ridge);
  tent.position.set(-1.8, 0, -0.6);
  tent.rotation.y = 0.6;
  g.add(tent);

  // log bench
  const bench = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 6), lam('#8a6a48'));
  bench.rotation.z = Math.PI / 2;
  bench.position.set(1.2, 0.14, 0.7);
  bench.rotation.y = -0.5;
  g.add(bench);

  // waystone lantern so camps are visible from afar
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.7, 5), lam('#4a3a2c'));
  post.position.set(1.6, 0.85, -1.0);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x9adcf0 }));
  lamp.position.set(1.6, 1.75, -1.0);
  g.add(post, lamp);

  return g;
}

export function createCamps(scene, terrain, decorBlocked, particles) {
  const camps = [];
  const S2 = terrain.size / 2;

  // spread camps across quadrants, away from the village
  const targets = [
    [-S2 * 0.55, -S2 * 0.5], [S2 * 0.55, -S2 * 0.45],
    [-S2 * 0.5, S2 * 0.55], [S2 * 0.5, S2 * 0.5],
  ];
  for (let c = 0; c < CAMP_COUNT; c++) {
    let placed = false;
    for (let tries = 0; tries < 80 && !placed; tries++) {
      const x = targets[c][0] + (Math.random() - 0.5) * 18;
      const z = targets[c][1] + (Math.random() - 0.5) * 18;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 8) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      const y = terrain.surfaceY(x, z);
      const mesh = buildCamp();
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(mesh);
      // block only the fire ring cell so the camp stays walkable
      decorBlocked.add(`${ix},${iz}`);
      camps.push({ x, z, y, mesh, anim: Math.random() * 10 });
      placed = true;
    }
  }

  function update(dt, playerPos, time) {
    for (const c of camps) {
      c.anim += dt;
      const u = c.mesh.userData;
      const s = 1 + Math.sin(c.anim * 11) * 0.18;
      u.flame.scale.set(s, 1.15 + Math.sin(c.anim * 8) * 0.22, s);
      u.flameCore.scale.setScalar(1 + Math.sin(c.anim * 13) * 0.2);
      u.light.intensity = 3.2 + Math.sin(c.anim * 9 + c.x) * 0.6;
      // ember sparks
      if (c.mesh.position.distanceToSquared(playerPos) < 30 * 30 && Math.random() < dt * 2.5) {
        particles.burst(new THREE.Vector3(c.x, c.y + 0.35, c.z), '#ffb055', 1, 0.7, -0.8, 0.8);
      }
    }
  }

  // nearest campfire within radius (for cooking / resting prompt)
  function nearestFire(pos, radius) {
    let best = null, bd = radius * radius;
    for (const c of camps) {
      const d = (c.x - pos.x) ** 2 + (c.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  return { camps, update, nearestFire };
}
