// Dekorasi dunia: pinus voxel, batu, rumput tuft, obor di sepanjang jalan.
// Semua pakai InstancedMesh biar hemat draw call.
import * as THREE from 'three';
import { mulberry32, valueNoise2, fbm2 } from '../util/noise.js';
import { BLOCK_H, WATER_LEVEL } from './terrain.js';
import {
  makeBarkTexture, makeLeafTexture, makeGrassTuftTexture, makeFlameTexture, PALETTE,
} from '../gfx/textures.js';

const SEED = 4242;

export function buildDecor(terrain, scene) {
  const S = terrain.size;
  const rng = mulberry32(SEED);
  const blocked = new Set(); // sel yang tidak bisa dilewati (batang pohon, batu besar)

  const trees = [], rocks = [], tufts = [], torches = [];

  // --- penempatan ---
  for (let iz = 2; iz < S - 2; iz++) {
    for (let ix = 2; ix < S - 2; ix++) {
      const i = terrain.idx(ix, iz);
      const h = terrain.height[i];
      const t = terrain.type[i];
      if (h <= WATER_LEVEL || t === 1) continue; // bukan di air / jalan
      const nx = ix / S, nz = iz / S;
      const y = h * BLOCK_H + BLOCK_H;
      const wx = ix - S / 2 + 0.5, wz = iz - S / 2 + 0.5;

      const forest = fbm2(nx * 6, nz * 6, SEED, 3);
      const r = rng();

      // jarak dari spawn biar area awal agak lapang
      const dSpawn = Math.hypot(wx - terrain.spawn.x, wz - terrain.spawn.z);

      if (forest > 0.42 && r < 0.055 && dSpawn > 4 && !nearTree(trees, wx, wz, 2.4)) {
        const tall = 7.5 + rng() * 5;
        trees.push({ x: wx, y, z: wz, tall, girth: 0.26 + rng() * 0.14, seed: rng() });
        blocked.add(`${ix},${iz}`);
        continue;
      }
      if (r > 0.985 && t !== 3) {
        rocks.push({ x: wx, y, z: wz, s: 0.35 + rng() * 0.5, rot: rng() * Math.PI });
        if (rng() < 0.4) blocked.add(`${ix},${iz}`);
        continue;
      }
      if ((t === 0 || t === 4) && r > 0.4 && r < 0.68) {
        tufts.push({ x: wx + (rng() - 0.5) * 0.5, y, z: wz + (rng() - 0.5) * 0.5, s: 0.5 + rng() * 0.5 });
      }
    }
  }

  // obor di tepi jalan, tiap ~9 sel jalur
  let pathCount = 0;
  for (let iz = 2; iz < S - 2; iz++) {
    for (let ix = 2; ix < S - 2; ix++) {
      const i = terrain.idx(ix, iz);
      if (terrain.type[i] !== 1) continue;
      pathCount++;
      if (pathCount % 17 !== 0) continue;
      const h = terrain.height[i];
      torches.push({
        x: ix - S / 2 + 0.5 + (rng() - 0.5) * 0.4,
        y: h * BLOCK_H + BLOCK_H,
        z: iz - S / 2 + 0.5 + (rng() - 0.5) * 0.4,
      });
    }
  }

  const group = new THREE.Group();

  // --- batang pohon ---
  const barkTex = makeBarkTexture();
  const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
  const trunkMat = new THREE.MeshLambertMaterial({ map: barkTex });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
  trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;

  // --- dedaunan: tiap pohon 3 tingkat kotak pipih ---
  const leafTex = makeLeafTexture();
  const leafGeo = new THREE.BoxGeometry(1, 1, 1);
  const leafMat = new THREE.MeshLambertMaterial({ map: leafTex });
  const tiersPerTree = 4;
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, trees.length * tiersPerTree);
  leafMesh.castShadow = true;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  trees.forEach((tr, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr.seed * Math.PI);
    m.compose(v.set(tr.x, tr.y + tr.tall / 2, tr.z), q, sc.set(tr.girth, tr.tall, tr.girth));
    trunkMesh.setMatrixAt(i, m);
    for (let k = 0; k < tiersPerTree; k++) {
      const f = k / (tiersPerTree - 1);           // 0 bawah -> 1 puncak
      const w = (2.0 - f * 1.5) * (0.75 + tr.seed * 0.35);
      const ty = tr.y + tr.tall * (0.62 + f * 0.38);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr.seed * 7 + k * 0.7);
      m.compose(v.set(tr.x, ty, tr.z), q, sc.set(w, 0.42 + (1 - f) * 0.25, w));
      leafMesh.setMatrixAt(i * tiersPerTree + k, m);
    }
  });
  group.add(trunkMesh, leafMesh);

  // --- batu ---
  if (rocks.length) {
    const rockGeo = new THREE.BoxGeometry(1, 0.7, 0.85);
    const rockMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.stone[0]) });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rockMesh.castShadow = true; rockMesh.receiveShadow = true;
    rocks.forEach((rk, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rk.rot);
      m.compose(v.set(rk.x, rk.y + rk.s * 0.3, rk.z), q, sc.set(rk.s * 1.4, rk.s, rk.s * 1.2));
      rockMesh.setMatrixAt(i, m);
    });
    group.add(rockMesh);
  }

  // --- rumput tuft: dua plane menyilang ---
  if (tufts.length) {
    const tuftTex = makeGrassTuftTexture();
    const p1 = new THREE.PlaneGeometry(1, 1);
    const p2 = new THREE.PlaneGeometry(1, 1);
    p2.rotateY(Math.PI / 2);
    const tuftGeo = mergeGeoms([p1, p2]);
    const tuftMat = new THREE.MeshLambertMaterial({
      map: tuftTex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    const tuftMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, tufts.length);
    tufts.forEach((tf, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 0.37) % Math.PI);
      m.compose(v.set(tf.x, tf.y + tf.s * 0.35, tf.z), q, sc.set(tf.s, tf.s, tf.s));
      tuftMesh.setMatrixAt(i, m);
    });
    group.add(tuftMesh);
  }

  // --- obor ---
  const flameTexA = makeFlameTexture(0), flameTexB = makeFlameTexture(1);
  const poleGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12);
  const poleMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.torchWood) });
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, Math.max(1, torches.length));
  poleMesh.castShadow = true;
  const flameMat = new THREE.SpriteMaterial({ map: flameTexA, transparent: true, depthWrite: false });
  const flames = [];
  torches.forEach((tc, i) => {
    q.identity();
    m.compose(v.set(tc.x, tc.y + 0.45, tc.z), q, sc.set(1, 1, 1));
    poleMesh.setMatrixAt(i, m);
    const spr = new THREE.Sprite(flameMat);
    spr.scale.set(0.34, 0.5, 1);
    spr.position.set(tc.x, tc.y + 1.05, tc.z);
    group.add(spr);
    flames.push(spr);
  });
  if (torches.length) group.add(poleMesh);

  // pool cahaya obor: hanya N obor terdekat yang benar-benar menyala
  const LIGHTS = 6;
  const lights = [];
  for (let i = 0; i < LIGHTS; i++) {
    const L = new THREE.PointLight(0xffaa44, 0, 7, 1.8);
    group.add(L);
    lights.push(L);
  }

  scene.add(group);

  let flick = 0, frame = 0;
  function update(dt, playerPos, time) {
    flick += dt;
    if (flick > 0.16) {
      flick = 0; frame ^= 1;
      flameMat.map = frame ? flameTexB : flameTexA;
    }
    // tugaskan lampu ke obor terdekat
    const sorted = torches
      .map((tc) => ({ tc, d: (tc.x - playerPos.x) ** 2 + (tc.z - playerPos.z) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LIGHTS);
    lights.forEach((L, i) => {
      if (i < sorted.length && sorted[i].d < 40 * 40) {
        const tc = sorted[i].tc;
        L.position.set(tc.x, tc.y + 1.15, tc.z);
        L.intensity = 4.2 + Math.sin(time * 9 + tc.x * 3.1) * 0.9;
      } else {
        L.intensity = 0;
      }
    });
  }

  return { group, blocked, torches, trees, update };
}

function nearTree(trees, x, z, minD) {
  for (let i = trees.length - 1; i >= 0 && i > trees.length - 40; i--) {
    const t = trees[i];
    if ((t.x - x) ** 2 + (t.z - z) ** 2 < minD * minD) return true;
  }
  return false;
}

function mergeGeoms(geoms) {
  // merge sederhana (posisi+normal+uv+index) tanpa dependensi BufferGeometryUtils
  let vcount = 0, icount = 0;
  for (const g of geoms) { vcount += g.attributes.position.count; icount += g.index.count; }
  const pos = new Float32Array(vcount * 3);
  const nor = new Float32Array(vcount * 3);
  const uv = new Float32Array(vcount * 2);
  const idx = new Uint16Array(icount);
  let vo = 0, io = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count;
    io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
