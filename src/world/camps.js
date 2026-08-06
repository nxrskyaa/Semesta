// Rest camps — cozy waypoints scattered across the wilds: a crackling
// campfire (cook here!), a little tent and a log bench. Camps are SAFE ZONES:
// monsters keep out, and resting near the fire heals you quickly.
import * as THREE from 'three';
import { bakeStatic } from '../gfx/bake.js';
import { WATER_LEVEL } from './terrain.js';
import { sharedMat, sharedBox, sharedCyl } from '../gfx/meshcache.js';

const CAMP_COUNT = 6;
export const CAMP_SAFE_R = 7;     // monsters won't enter this radius
export const CAMP_HEAL_R = 3.5;   // fast healing this close to the fire

// Static prop colours are SHARED — a built world was carrying ~2,465 distinct
// materials, which is why the LOW preset barely helped. Nothing in this file
// mutates a material at runtime, so one material per colour is safe here.
function lam(color) { return sharedMat(color); }

function buildCamp() {
  const g = new THREE.Group();

  // campfire: stone ring, logs, flame
  const fire = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const stone = new THREE.Mesh(sharedBox(0.16, 0.12, 0.14), lam('#8d9294'));
    stone.position.set(Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4);
    stone.rotation.y = a;
    fire.add(stone);
  }
  for (const r of [0.6, -0.5]) {
    const log = new THREE.Mesh(sharedCyl(0.06, 0.06, 0.5, 5), lam('#6a4a30'));
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
  const clothA = new THREE.Mesh(sharedBox(1.3, 0.06, 1.1), lam('#c8a06a'));
  clothA.rotation.z = 0.85;
  clothA.position.set(-0.42, 0.55, 0);
  const clothB = new THREE.Mesh(sharedBox(1.3, 0.06, 1.1), lam('#b8905a'));
  clothB.rotation.z = -0.85;
  clothB.position.set(0.42, 0.55, 0);
  const ridge = new THREE.Mesh(sharedCyl(0.04, 0.04, 1.2, 5), lam('#6a4a30'));
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = 0.98;
  tent.add(clothA, clothB, ridge);
  tent.position.set(-1.8, 0, -0.6);
  tent.rotation.y = 0.6;
  g.add(tent);

  // log bench
  const bench = new THREE.Mesh(sharedCyl(0.14, 0.14, 1.1, 6), lam('#8a6a48'));
  bench.rotation.z = Math.PI / 2;
  bench.position.set(1.2, 0.14, 0.7);
  bench.rotation.y = -0.5;
  g.add(bench);

  // waystone lantern so camps are visible from afar
  const post = new THREE.Mesh(sharedCyl(0.05, 0.07, 1.7, 5), lam('#4a3a2c'));
  post.position.set(1.6, 0.85, -1.0);
  const lamp = new THREE.Mesh(sharedBox(0.18, 0.22, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x9adcf0 }));
  lamp.position.set(1.6, 1.75, -1.0);
  g.add(post, lamp);

  return g;
}

// a cozy little fox-ranger critter that sits by the fire
function buildRanger() {
  const g = new THREE.Group();
  const fur = lam('#d98a54');
  const furLight = lam('#f0d0a8');
  const cloak = lam('#3a6a4a');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), cloak);
  body.position.y = 0.24; body.scale.set(1, 1.1, 1);
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), fur);
  head.position.y = 0.5;
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 6), furLight);
  snout.position.set(0, -0.02, 0.2); snout.rotation.x = Math.PI / 2;
  head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), lam('#2a2620'));
  nose.position.set(0, -0.02, 0.28); head.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 5), fur);
    ear.position.set(sx * 0.11, 0.18, 0); ear.rotation.z = sx * 0.2;
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), lam('#2a2620'));
    eye.position.set(sx * 0.08, 0.02, 0.17); head.add(eye);
  }
  // ranger hat brim
  const hat = new THREE.Mesh(sharedCyl(0.02, 0.16, 0.02, 8), lam('#5a4432'));
  hat.position.y = 0.66; head.add(hat);
  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 8), lam('#6a5038'));
  hatTop.position.y = 0.73; head.add(hatTop);
  // bushy tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), fur);
  tail.position.set(0, 0.22, -0.22); tail.scale.set(0.8, 0.8, 1.2);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), furLight);
  tailTip.position.set(0, 0.28, -0.34);
  g.add(body, head, tail, tailTip);

  // floating name tag
  const c = document.createElement('canvas');
  c.width = 128; c.height = 24;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,12,10,0.55)';
  const tw = ctx.measureText('Ranger').width + 12;
  ctx.fillRect(64 - tw / 2, 3, tw, 17);
  ctx.fillStyle = '#a8e0b0'; ctx.fillText('Ranger', 64, 16);
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  tag.scale.set(1.3, 0.24, 1); tag.position.y = 0.98;
  g.add(tag);
  g.userData.head = head;
  return g;
}

export function createCamps(scene, terrain, decorBlocked, particles) {
  const camps = [];
  const S2 = terrain.size / 2;

  // spread camps across quadrants + the sparse mid-edges, away from the village
  const targets = [
    [-S2 * 0.55, -S2 * 0.5], [S2 * 0.55, -S2 * 0.45],
    [-S2 * 0.5, S2 * 0.55], [S2 * 0.5, S2 * 0.5],
    [0, -S2 * 0.6], [-S2 * 0.65, 0],
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
      const camp = { x, z, y, mesh, anim: Math.random() * 10, ranger: null };
      // every camp has a friendly Ranger who heals passing adventurers
      const ranger = buildRanger();
      ranger.position.set(x + 1.4, y, z + 0.9);
      ranger.rotation.y = Math.atan2(-1.4, -0.9);
      scene.add(ranger);
      camp.ranger = { mesh: ranger, x: x + 1.4, z: z + 0.9, anim: Math.random() * 10, lineIdx: 0 };
      camps.push(camp);
      placed = true;
    }
  }

  const RANGER_LINES = [
    'Rest easy — no monsters set foot in a Ranger camp.',
    'Patched you right up! Off you go, hero.',
    'A warm fire and a full heart. Come back any time.',
    'The wilds are calmer near the fire. Breathe.',
  ];

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
      // ranger faces the player when near & gently bobs
      if (c.ranger) {
        c.ranger.anim += dt;
        const dP = Math.hypot(c.ranger.x - playerPos.x, c.ranger.z - playerPos.z);
        if (dP < 4) c.ranger.mesh.rotation.y = Math.atan2(playerPos.x - c.ranger.x, playerPos.z - c.ranger.z);
        if (c.ranger.mesh.userData.head) c.ranger.mesh.userData.head.position.y = 0.5 + Math.sin(c.ranger.anim * 2.2) * 0.02;
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

  // nearest ranger within radius (talk -> full heal)
  function nearestRanger(pos, radius) {
    let best = null, bd = radius * radius;
    for (const c of camps) {
      if (!c.ranger) continue;
      const d = (c.ranger.x - pos.x) ** 2 + (c.ranger.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = c.ranger; }
    }
    return best;
  }
  function rangerLine(ranger) {
    const line = RANGER_LINES[ranger.lineIdx % RANGER_LINES.length];
    ranger.lineIdx++;
    return line;
  }

  // Bake each camp: the tent, bench, log ring and stones never move. Only the
  // campfire flame is posed per frame, so it is marked and left alone.
  for (const c of camps) {
    const u = c.mesh.userData;
    if (u.flame) u.flame.userData.dynamic = true;
    if (u.flameCore) u.flameCore.userData.dynamic = true;
    bakeStatic(c.mesh);
  }

  return { camps, update, nearestFire, nearestRanger, rangerLine };
}
