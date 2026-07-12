// Scattered world landmarks — a windmill, a little shrine and a ruined tower —
// to make the wilds feel lived-in beyond the village. Purely scenic (blocked
// footprints); the windmill's sails turn.
import * as THREE from 'three';
import { WATER_LEVEL } from './terrain.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

function buildWindmill() {
  const g = new THREE.Group();
  const stone = lam('#d8c8a8'), wood = lam('#7a5638'), roof = lam('#8a4638');
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 3.2, 10), stone);
  tower.position.y = 1.6; tower.castShadow = true;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.9, 10), roof);
  cap.position.y = 3.55;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.1), wood);
  door.position.set(0, 0.45, 0.95);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.1), lam('#8ac4d8'));
  win.position.set(0, 2.1, 0.85);
  // sail hub + 4 blades (spins)
  const sails = new THREE.Group();
  sails.position.set(0, 2.9, 1.0);
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), wood);
  sails.add(hub);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i * Math.PI / 2;
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.06), wood);
    spar.position.y = 0.8;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.2, 0.03), lam('#f0e8d0'));
    cloth.position.set(0.22, 0.85, 0.04);
    arm.add(spar, cloth);
    sails.add(arm);
  }
  g.add(tower, cap, door, win, sails);
  g.userData.sails = sails;
  return g;
}

function buildShrine() {
  const g = new THREE.Group();
  const stone = lam('#b8b0a0'), red = lam('#c04a3a'), gold = lam('#e8c45a');
  // torii-style gate
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.0, 8), red);
    post.position.set(sx * 0.9, 1.0, 0); post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.24), red);
  beam.position.y = 2.05;
  const beam2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.3), lam('#8a3428'));
  beam2.position.y = 2.3;
  // altar with a glowing gem
  const altar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), stone);
  altar.position.set(0, 0.25, -0.9); altar.castShadow = true;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), lam('#5ad0f0'));
  gem.position.set(0, 0.75, -0.9);
  const glow = new THREE.PointLight(0x6ad8f0, 1.6, 5, 2);
  glow.position.set(0, 0.9, -0.9);
  // stone lanterns
  for (const sx of [-1, 1]) {
    const lan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), stone);
    lan.position.set(sx * 1.3, 0.25, -0.9);
    const lanTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3), gold);
    lanTop.position.set(sx * 1.3, 0.55, -0.9);
    g.add(lan, lanTop);
  }
  g.add(beam, beam2, altar, gem, glow);
  g.userData.gem = gem;
  return g;
}

function buildRuinTower() {
  const g = new THREE.Group();
  const stone = lam('#9aa0a2'), moss = lam('#5c8a4a');
  // broken cylindrical tower (jagged top via stacked shrinking rings)
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const r = 0.9 - i * 0.06;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.06, 0.6, 9), stone);
    seg.position.y = y + 0.3;
    // knock a couple of top segments partly off for a ruined look
    if (i >= 3) seg.rotation.z = (Math.random() - 0.5) * 0.12;
    seg.castShadow = true;
    g.add(seg);
    y += 0.6;
  }
  // broken merlons
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.4) continue;
    const a = (i / 5) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), stone);
    m.position.set(Math.cos(a) * 0.6, y + 0.1, Math.sin(a) * 0.6);
    g.add(m);
  }
  // moss & vines
  for (let i = 0; i < 5; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6 + Math.random() * 0.5, 0.06), moss);
    const a = Math.random() * Math.PI * 2;
    v.position.set(Math.cos(a) * 0.85, 0.6 + Math.random() * 1.2, Math.sin(a) * 0.85);
    g.add(v);
  }
  const rubble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), stone);
  rubble.position.set(1.1, 0.15, 0.4); rubble.scale.set(1.2, 0.5, 1);
  g.add(rubble);
  return g;
}

export function createLandmarks(scene, terrain, decorBlocked) {
  const S2 = terrain.size / 2;
  const built = [];

  function place(mesh, tx, tz, blockR = 1) {
    for (let tries = 0; tries < 80; tries++) {
      const x = tx + (Math.random() - 0.5) * 12;
      const z = tz + (Math.random() - 0.5) * 12;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 9) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      const y = terrain.surfaceY(x, z);
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(mesh);
      for (let dz = -blockR; dz <= blockR; dz++) {
        for (let dx = -blockR; dx <= blockR; dx++) decorBlocked.add(`${ix + dx},${iz + dz}`);
      }
      return true;
    }
    return false;
  }

  const windmill = buildWindmill();
  if (place(windmill, S2 * 0.5, -S2 * 0.15)) built.push(windmill);
  const shrine = buildShrine();
  if (place(shrine, -S2 * 0.45, S2 * 0.2)) built.push(shrine);
  const tower = buildRuinTower();
  if (place(tower, S2 * 0.15, S2 * 0.5)) built.push(tower);

  function update(dt, time) {
    if (windmill.userData.sails) windmill.userData.sails.rotation.z += dt * 0.5;
    if (shrine.userData.gem) {
      shrine.userData.gem.rotation.y += dt * 1.2;
      shrine.userData.gem.position.y = 0.75 + Math.sin(time * 1.5) * 0.06;
    }
  }

  return { built, update };
}
