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

// A romantic garden: torches arranged in a heart, glowing at night.
function buildHeartTorches() {
  const g = new THREE.Group();
  const flames = [];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    // heart curve, laid flat on the x-z plane and scaled down
    const hx = 16 * Math.sin(t) ** 3;
    const hz = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const x = hx * 0.16, z = hz * 0.16;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 5), lam('#3a2e26'));
    pole.position.set(x, 0.35, z);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.1, 6), lam('#5a4632'));
    bowl.position.set(x, 0.72, z);
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0),
      new THREE.MeshBasicMaterial({ color: 0xff9a3a }));
    flame.position.set(x, 0.86, z);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
    core.position.set(x, 0.88, z);
    g.add(pole, bowl, flame, core);
    flames.push(flame, core);
  }
  // a couple of soft rose lights to bathe the heart at night
  const l1 = new THREE.PointLight(0xff8a5a, 3, 9, 1.6); l1.position.set(0, 1.2, 0.5);
  const l2 = new THREE.PointLight(0xffb060, 2.4, 8, 1.6); l2.position.set(0, 1.2, -1.2);
  g.add(l1, l2);
  // a little plaque/sign
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), lam('#6a4a30'));
  post.position.set(0, 0.35, 2.4);
  const heart = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.06), lam('#e85a7a'));
  heart.position.set(0, 0.8, 2.4); heart.rotation.z = Math.PI / 4;
  g.add(post, heart);
  g.userData.flames = flames;
  return g;
}

// A cozy Japanese-style schoolhouse — cream walls, hip roof, rows of windows,
// a clock, an entrance porch and a flagpole.
function buildSchool() {
  const g = new THREE.Group();
  const wall = lam('#ede4d2'), wallLow = lam('#d8cdb8'), beam = lam('#7a5a44');
  const roof = lam('#9a5648'), roofDark = lam('#7a4438'), win = lam('#8fc8dc'), gold = lam('#d8a83a');
  const W = 6.4, D = 3.2, H = 2.2;
  // two floors
  const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallLow);
  lower.position.y = H / 2; lower.castShadow = true; lower.receiveShadow = true;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, H, D - 0.1), wall);
  upper.position.y = H + H / 2; upper.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, 0.16, D + 0.05), beam);
  band.position.y = H;
  g.add(lower, upper, band);
  // corner beams
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, H * 2, 0.16), beam);
    b.position.set(dx * (W / 2 - 0.08), H, dz * (D / 2 - 0.08));
    g.add(b);
  }
  // hip roof (stacked slabs)
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6 - i * 0.7, 0.28, D + 0.6 - i * 0.5), i % 2 ? roofDark : roof);
    r.position.y = 2 * H + 0.14 + i * 0.26; r.castShadow = true;
    g.add(r);
  }
  // window rows on both floors (front)
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 5; i++) {
      const wm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), win);
      wm.position.set(-W / 2 + 0.9 + i * 1.15, 0.7 + f * H, D / 2 + 0.02);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.05), beam);
      frame.position.set(wm.position.x, wm.position.y, D / 2 - 0.01);
      g.add(frame, wm);
    }
  }
  // entrance porch + double doors
  const porch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.9), roofDark);
  porch.position.set(0, 1.15, D / 2 + 0.45);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), beam);
    post.position.set(sx * 0.6, 0.55, D / 2 + 0.8); g.add(post);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.1), beam);
  door.position.set(0, 0.55, D / 2 + 0.05);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.12), win);
  doorGlass.position.set(0, 0.62, D / 2 + 0.06);
  g.add(porch, door, doorGlass);
  // round clock high on the front gable
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 12), lam('#f4f0e4'));
  clock.rotation.x = Math.PI / 2; clock.position.set(0, 2 * H + 0.3, D / 2 + 0.02);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 14), gold);
  rim.position.set(0, 2 * H + 0.3, D / 2 + 0.03);
  const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), beam);
  hand1.position.set(0, 2 * H + 0.36, D / 2 + 0.08);
  const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), beam);
  hand2.position.set(0.06, 2 * H + 0.3, D / 2 + 0.08);
  g.add(clock, rim, hand1, hand2);
  // flagpole with a little flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), lam('#9aa0a2'));
  pole.position.set(-W / 2 - 0.8, 1.3, D / 2 - 0.5);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.03), lam('#e05a6a'));
  flag.position.set(-W / 2 - 0.55, 2.4, D / 2 - 0.5);
  g.add(pole, flag);
  g.userData.clockHand = hand2;
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
  const school = buildSchool();
  if (place(school, -S2 * 0.2, -S2 * 0.42, 2)) built.push(school);
  const heart = buildHeartTorches();
  if (place(heart, S2 * 0.38, S2 * 0.22, 2)) built.push(heart);

  function update(dt, time) {
    if (windmill.userData.sails) windmill.userData.sails.rotation.z += dt * 0.5;
    if (shrine.userData.gem) {
      shrine.userData.gem.rotation.y += dt * 1.2;
      shrine.userData.gem.position.y = 0.75 + Math.sin(time * 1.5) * 0.06;
    }
    if (heart.userData.flames) {
      for (let i = 0; i < heart.userData.flames.length; i++) {
        const f = heart.userData.flames[i];
        f.scale.setScalar(1 + Math.sin(time * 8 + i * 1.3) * 0.22);
      }
    }
    if (school.userData.clockHand) school.userData.clockHand.rotation.z = -time * 0.2;
  }

  return { built, update, heart };
}
