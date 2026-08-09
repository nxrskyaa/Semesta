// Treasure chests scattered around the world. Open one for materials,
// forge stones, tonics — and sometimes a pet charm. Opened chests
// respawn elsewhere after a while.
import * as THREE from 'three';
import { WATER_LEVEL } from './terrain.js';

const CHEST_COUNT = 16;
const RESPAWN_S = 200;

const PET_CHARMS = [
  'charm_moku', 'charm_piko', 'charm_bubbles', 'charm_cinder', 'charm_luma',
  'charm_tuff', 'charm_flap', 'charm_hopps', 'charm_wooly', 'charm_koko',
];

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

function buildChestMesh() {
  const g = new THREE.Group();
  const wood = lam('#8a5f38');
  const woodDark = lam('#6a4628');
  const gold = lam('#d8a83a');

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.44), wood);
  base.position.y = 0.17;
  base.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.46), gold);
  band.position.y = 0.3;

  // lid pivots at the back edge
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.34, -0.22);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.44), woodDark);
  lid.position.set(0, 0.08, 0.22);
  lid.castShadow = true;
  const lidBand = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.46), gold);
  lidBand.position.set(0, 0.08, 0.22);
  lidPivot.add(lid, lidBand);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), gold);
  lock.position.set(0, 0.32, 0.23);

  g.add(base, band, lidPivot, lock);
  g.userData.lid = lidPivot;
  return g;
}

export function createChests(scene, terrain, decorBlocked, particles) {
  // Seeded for the same reason gathering is — chests are placed before the
  // landmarks and read the same shared blocked set.
  const KR = (() => { let g = 777001; return () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; }; })();

  const chests = [];

  function findSpot() {
    for (let tries = 0; tries < 60; tries++) {
      const ix = 8 + Math.floor(KR() * (terrain.size - 16));
      const iz = 8 + Math.floor(KR() * (terrain.size - 16));
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 9) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      const x = ix - terrain.size / 2 + 0.5, z = iz - terrain.size / 2 + 0.5;
      if (Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z) < 10) continue;
      return { x, z, y: terrain.surfaceY(x, z) };
    }
    return null;
  }

  function spawnChest() {
    const spot = findSpot();
    if (!spot) return;
    const mesh = buildChestMesh();
    mesh.position.set(spot.x, spot.y, spot.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    chests.push({
      mesh, opened: false, respawnT: 0, sparkleT: Math.random() * 2, lidT: 0,
    });
  }

  for (let i = 0; i < CHEST_COUNT; i++) spawnChest();

  // loot roll — ownedPets lets us bias charms toward ones you don't have yet
  function rollLoot(ownedPets = new Set()) {
    const out = [];
    const r = Math.random;
    if (r() < 0.75) out.push({ id: 'forge_stone', count: 1 + Math.floor(r() * 2) });
    if (r() < 0.5) out.push({ id: 'tonic', count: 1 + Math.floor(r() * 2) });
    const mats = ['slime_gel', 'feather', 'small_bone', 'green_herb', 'hardwood', 'chitin_shell'];
    if (r() < 0.85) out.push({ id: mats[Math.floor(r() * mats.length)], count: 1 + Math.floor(r() * 3) });
    // pet charm: decent chance, prefers uncollected pets
    if (r() < 0.3) {
      const missing = PET_CHARMS.filter((c) => !ownedPets.has(c.replace('charm_', '')));
      const pool = missing.length ? missing : PET_CHARMS;
      out.push({ id: pool[Math.floor(r() * pool.length)], count: 1 });
    }
    if (out.length === 0) out.push({ id: 'forge_stone', count: 1 });
    return out;
  }

  function open(chest, ownedPets) {
    if (chest.opened) return null;
    chest.opened = true;
    chest.respawnT = RESPAWN_S;
    chest.lidT = 0.001;
    particles.fountain(chest.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffd23e', 18);
    particles.flash?.(chest.mesh.position, '#ffd23e', 5, 0.4);
    return rollLoot(ownedPets);
  }

  function update(dt, playerPos) {
    for (const c of chests) {
      if (c.opened) {
        // lid swing open animation
        if (c.lidT > 0 && c.lidT < 0.5) {
          c.lidT += dt;
          c.mesh.userData.lid.rotation.x = -Math.min(1, c.lidT / 0.35) * 1.9;
        }
        c.respawnT -= dt;
        if (c.respawnT <= 0) {
          scene.remove(c.mesh);
          const i = chests.indexOf(c);
          chests.splice(i, 1);
          spawnChest();
        }
        continue;
      }
      // idle sparkle so chests are spottable
      c.sparkleT -= dt;
      if (c.sparkleT <= 0 && c.mesh.position.distanceToSquared(playerPos) < 35 * 35) {
        c.sparkleT = 0.8 + Math.random() * 1.4;
        particles.burst(
          c.mesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5)),
          '#ffe27a', 1, 0.3, -0.6, 0.7,
        );
      }
    }
  }

  // nearest unopened chest within radius (for the interact system)
  function nearest(pos, radius) {
    let best = null, bd = radius * radius;
    for (const c of chests) {
      if (c.opened) continue;
      const d = (c.mesh.position.x - pos.x) ** 2 + (c.mesh.position.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  return { chests, update, open, nearest };
}
