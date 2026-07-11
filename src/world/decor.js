// World decor: rounded low-poly trees (NOT blocky), faceted rocks, grass tufts,
// flowers, bushes, torches along paths — plus living ambience: butterflies by
// day, fireflies by night. All instanced for cheap draw calls.
import * as THREE from 'three';
import { mulberry32, fbm2 } from '../util/noise.js';
import { WATER_LEVEL } from './terrain.js';
import {
  makeBarkTexture, makeGrassTuftTexture, makeFlowerTexture,
  makeFlameTexture, toTexture, PALETTE,
} from '../gfx/textures.js';

const SEED = 4242;

function canvasTex(draw, w = 8, h = 8) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  return toTexture(c);
}

export function buildDecor(terrain, scene) {
  const S = terrain.size;
  const rng = mulberry32(SEED);
  const blocked = new Set(); // cells you can't walk through (trunks, big rocks)

  const trees = [], rocks = [], tufts = [], torches = [], flowers = [], bushes = [];

  // --- placement ---
  for (let iz = 2; iz < S - 2; iz++) {
    for (let ix = 2; ix < S - 2; ix++) {
      const i = terrain.idx(ix, iz);
      const h = terrain.height[i];
      const t = terrain.type[i];
      if (h <= WATER_LEVEL || t === 1) continue; // not in water / on paths
      const nx = ix / S, nz = iz / S;
      const wx = ix - S / 2 + 0.5, wz = iz - S / 2 + 0.5;
      const y = terrain.surfaceY(wx, wz);

      const forest = fbm2(nx * 6, nz * 6, SEED, 3);
      const r = rng();

      // keep the village clearing open
      const dSpawn = Math.hypot(wx - terrain.spawn.x, wz - terrain.spawn.z);

      if (forest > 0.42 && r < 0.055 && dSpawn > 9 && !nearTree(trees, wx, wz, 2.6)) {
        trees.push({
          x: wx, y, z: wz,
          tall: 3.2 + rng() * 2.4, girth: 0.2 + rng() * 0.12, seed: rng(),
        });
        blocked.add(`${ix},${iz}`);
        continue;
      }
      if (r > 0.985 && t !== 3) {
        rocks.push({ x: wx, y, z: wz, s: 0.35 + rng() * 0.55, rot: rng() * Math.PI, seed: rng() });
        if (rng() < 0.4) blocked.add(`${ix},${iz}`);
        continue;
      }
      if ((t === 0 || t === 4) && r > 0.4 && r < 0.68) {
        tufts.push({ x: wx + (rng() - 0.5) * 0.5, y, z: wz + (rng() - 0.5) * 0.5, s: 0.5 + rng() * 0.5 });
      }
      if ((t === 6 && r < 0.5) || (t === 0 && r > 0.965)) {
        flowers.push({
          x: wx + (rng() - 0.5) * 0.6, y, z: wz + (rng() - 0.5) * 0.6,
          s: 0.4 + rng() * 0.35, c: Math.floor(rng() * PALETTE.flowers.length),
        });
      }
      if (t === 0 && r > 0.68 && r < 0.695 && dSpawn > 6) {
        bushes.push({ x: wx, y, z: wz, s: 0.4 + rng() * 0.35, seed: rng() });
      }
    }
  }

  // torches along the paths, every ~17 path cells
  let pathCount = 0;
  for (let iz = 2; iz < S - 2; iz++) {
    for (let ix = 2; ix < S - 2; ix++) {
      const i = terrain.idx(ix, iz);
      if (terrain.type[i] !== 1) continue;
      pathCount++;
      if (pathCount % 17 !== 0) continue;
      const wx = ix - S / 2 + 0.5 + (rng() - 0.5) * 0.4;
      const wz = iz - S / 2 + 0.5 + (rng() - 0.5) * 0.4;
      torches.push({ x: wx, y: terrain.surfaceY(wx, wz), z: wz });
    }
  }

  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const YUP = new THREE.Vector3(0, 1, 0);

  // --- trees: tapered trunk + 2-3 rounded low-poly canopy blobs ---
  const barkTex = makeBarkTexture();
  const trunkGeo = new THREE.CylinderGeometry(0.55, 0.8, 1, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ map: barkTex });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
  trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;

  const canopyGeo = new THREE.IcosahedronGeometry(1, 0); // faceted blob
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const blobsPerTree = 3;
  const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, trees.length * blobsPerTree);
  canopyMesh.castShadow = true;
  const leafColors = ['#3e7d47', '#4a8a50', '#356e40', '#4f9857'].map((c) => new THREE.Color(c));

  trees.forEach((tr, i) => {
    q.setFromAxisAngle(YUP, tr.seed * Math.PI);
    m.compose(v.set(tr.x, tr.y + tr.tall * 0.5, tr.z), q, sc.set(tr.girth, tr.tall, tr.girth));
    trunkMesh.setMatrixAt(i, m);
    for (let k = 0; k < blobsPerTree; k++) {
      const f = k / (blobsPerTree - 1);
      const rr = (1.5 - f * 0.75) * (0.85 + tr.seed * 0.3);
      const ang = tr.seed * 9 + k * 2.2;
      const ox = Math.cos(ang) * 0.3 * (1 - f), oz = Math.sin(ang) * 0.3 * (1 - f);
      q.setFromAxisAngle(YUP, tr.seed * 7 + k * 1.3);
      m.compose(
        v.set(tr.x + ox, tr.y + tr.tall * (0.8 + f * 0.42), tr.z + oz),
        q, sc.set(rr, rr * 0.82, rr),
      );
      const bi = i * blobsPerTree + k;
      canopyMesh.setMatrixAt(bi, m);
      canopyMesh.setColorAt(bi, leafColors[(i + k) % leafColors.length]);
    }
  });
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
  group.add(trunkMesh, canopyMesh);

  // --- rocks: faceted lumps ---
  if (rocks.length) {
    const rockGeo = new THREE.IcosahedronGeometry(0.62, 0);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rockMesh.castShadow = true; rockMesh.receiveShadow = true;
    const rockColors = [PALETTE.stone[0], PALETTE.stone[1], PALETTE.stone[2]].map((c) => new THREE.Color(c));
    rocks.forEach((rk, i) => {
      q.setFromAxisAngle(YUP, rk.rot);
      m.compose(v.set(rk.x, rk.y + rk.s * 0.28, rk.z), q, sc.set(rk.s * 1.3, rk.s * 0.75, rk.s * 1.1));
      rockMesh.setMatrixAt(i, m);
      rockMesh.setColorAt(i, rockColors[Math.floor(rk.seed * 3)]);
    });
    if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
    group.add(rockMesh);
  }

  // --- grass tufts: crossed planes ---
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
      q.setFromAxisAngle(YUP, (i * 0.37) % Math.PI);
      m.compose(v.set(tf.x, tf.y + tf.s * 0.35, tf.z), q, sc.set(tf.s, tf.s, tf.s));
      tuftMesh.setMatrixAt(i, m);
    });
    group.add(tuftMesh);
  }

  // --- flowers: crossed planes, split by color ---
  if (flowers.length) {
    const byColor = new Map();
    for (const f of flowers) {
      if (!byColor.has(f.c)) byColor.set(f.c, []);
      byColor.get(f.c).push(f);
    }
    for (const [ci, list] of byColor) {
      const tex = makeFlowerTexture(PALETTE.flowers[ci]);
      const p1 = new THREE.PlaneGeometry(1, 1);
      const p2 = new THREE.PlaneGeometry(1, 1);
      p2.rotateY(Math.PI / 2);
      const fGeo = mergeGeoms([p1, p2]);
      const fMat = new THREE.MeshLambertMaterial({
        map: tex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
      });
      const fMesh = new THREE.InstancedMesh(fGeo, fMat, list.length);
      list.forEach((f, i) => {
        q.setFromAxisAngle(YUP, (i * 0.61) % Math.PI);
        m.compose(v.set(f.x, f.y + f.s * 0.4, f.z), q, sc.set(f.s, f.s, f.s));
        fMesh.setMatrixAt(i, m);
      });
      group.add(fMesh);
    }
  }

  // --- bushes: small rounded blobs ---
  if (bushes.length) {
    const bGeo = new THREE.IcosahedronGeometry(0.6, 0);
    const bMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const bMesh = new THREE.InstancedMesh(bGeo, bMat, bushes.length);
    bMesh.castShadow = true;
    const bushColors = ['#4a8a50', '#3e7d47'].map((c) => new THREE.Color(c));
    bushes.forEach((b, i) => {
      q.setFromAxisAngle(YUP, b.seed * 9);
      m.compose(v.set(b.x, b.y + b.s * 0.3, b.z), q, sc.set(b.s * 1.3, b.s * 0.8, b.s * 1.2));
      bMesh.setMatrixAt(i, m);
      bMesh.setColorAt(i, bushColors[Math.floor(b.seed * 2)]);
    });
    if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
    group.add(bMesh);
  }

  // --- torches ---
  const flameTexA = makeFlameTexture(0), flameTexB = makeFlameTexture(1);
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.9, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.torchWood) });
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, Math.max(1, torches.length));
  poleMesh.castShadow = true;
  const flameMat = new THREE.SpriteMaterial({ map: flameTexA, transparent: true, depthWrite: false });
  torches.forEach((tc, i) => {
    q.identity();
    m.compose(v.set(tc.x, tc.y + 0.45, tc.z), q, sc.set(1, 1, 1));
    poleMesh.setMatrixAt(i, m);
    const spr = new THREE.Sprite(flameMat);
    spr.scale.set(0.34, 0.5, 1);
    spr.position.set(tc.x, tc.y + 1.05, tc.z);
    group.add(spr);
  });
  if (torches.length) group.add(poleMesh);

  // torch light pool: only the N nearest torches actually glow
  const LIGHTS = 6;
  const lights = [];
  for (let i = 0; i < LIGHTS; i++) {
    const L = new THREE.PointLight(0xffaa44, 0, 7, 1.8);
    group.add(L);
    lights.push(L);
  }

  // --- butterflies (day) ---
  const BFLY = 22;
  const bflyTexs = [0, 1].map((f) => canvasTex((ctx) => {
    const col = ['#f0b8d8', '#f5e88a', '#a8c8f0'][f % 3] || '#f0b8d8';
    ctx.fillStyle = '#f0b8d8';
    if (f === 0) { // wings open
      ctx.fillRect(1, 2, 2, 3); ctx.fillRect(5, 2, 2, 3);
      ctx.fillRect(0, 1, 2, 2); ctx.fillRect(6, 1, 2, 2);
    } else { // wings up
      ctx.fillRect(2, 1, 1, 4); ctx.fillRect(5, 1, 1, 4);
    }
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(3, 2, 2, 4);
  }));
  const bflyMats = bflyTexs.map((t) => new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  const butterflies = [];
  const flowerSpots = flowers.length ? flowers : tufts;
  for (let i = 0; i < BFLY && flowerSpots.length; i++) {
    const home = flowerSpots[Math.floor(rng() * flowerSpots.length)];
    const spr = new THREE.Sprite(bflyMats[0]);
    spr.scale.set(0.22, 0.22, 1);
    spr.position.set(home.x, home.y + 0.6, home.z);
    group.add(spr);
    butterflies.push({ spr, home, t: rng() * 10, a: rng() * Math.PI * 2 });
  }

  // --- fireflies (night) ---
  const FFLY = 46;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(FFLY * 3);
  const ffData = [];
  for (let i = 0; i < FFLY; i++) {
    const spot = tufts.length ? tufts[Math.floor(rng() * tufts.length)] : { x: 0, y: 3, z: 0 };
    ffData.push({ x: spot.x, y: spot.y + 0.5, z: spot.z, t: rng() * 10 });
    ffPos[i * 3] = spot.x; ffPos[i * 3 + 1] = spot.y + 0.5; ffPos[i * 3 + 2] = spot.z;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xd8f090, size: 0.12, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const fireflies = new THREE.Points(ffGeo, ffMat);
  fireflies.frustumCulled = false;
  group.add(fireflies);

  scene.add(group);

  let flick = 0, frame = 0;
  function update(dt, playerPos, time, isNight = false) {
    flick += dt;
    if (flick > 0.16) {
      flick = 0; frame ^= 1;
      flameMat.map = frame ? flameTexB : flameTexA;
    }
    // assign the light pool to the nearest torches
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

    // butterflies flutter in the day, roost at night
    const bflyVis = !isNight;
    for (const b of butterflies) {
      b.spr.visible = bflyVis;
      if (!bflyVis) continue;
      b.t += dt;
      b.a += dt * (0.6 + Math.sin(b.t * 0.7) * 0.4);
      const rr = 0.8 + Math.sin(b.t * 0.5) * 0.5;
      b.spr.position.set(
        b.home.x + Math.cos(b.a) * rr,
        b.home.y + 0.55 + Math.sin(b.t * 2.1) * 0.2,
        b.home.z + Math.sin(b.a) * rr,
      );
      b.spr.material = bflyMats[Math.floor(b.t * 8) % 2];
    }

    // fireflies drift & pulse at night
    ffMat.opacity += ((isNight ? 0.9 : 0) - ffMat.opacity) * Math.min(1, dt * 1.5);
    if (ffMat.opacity > 0.02) {
      for (let i = 0; i < FFLY; i++) {
        const f = ffData[i];
        f.t += dt;
        ffPos[i * 3] = f.x + Math.sin(f.t * 0.7) * 0.8;
        ffPos[i * 3 + 1] = f.y + 0.3 + Math.sin(f.t * 1.3) * 0.25;
        ffPos[i * 3 + 2] = f.z + Math.cos(f.t * 0.55) * 0.8;
      }
      ffGeo.attributes.position.needsUpdate = true;
    }
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
  // minimal merge (position+normal+uv+index) without BufferGeometryUtils
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
