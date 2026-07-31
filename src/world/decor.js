// World decor: lush rounded 3D trees (Pokopia/Animal-Crossing style — rounded
// deciduous canopies + layered pine firs, NOT flat sprites or blocky voxels),
// faceted rocks, grass tufts, flowers, bushes, torches — plus living ambience:
// butterflies by day, fireflies by night. All instanced for cheap draw calls.
import * as THREE from 'three';
import { mulberry32, fbm2 } from '../util/noise.js';
import { WATER_LEVEL } from './terrain.js';
import {
  makeGrassTuftTexture, makeFlowerTexture,
  toTexture, PALETTE,
} from '../gfx/textures.js';
import { getQuality } from '../gfx/quality.js';

const SEED = 4242;

function canvasTex(draw, w = 8, h = 8) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  return toTexture(c);
}

export function buildDecor(terrain, scene) {
  // NOTE: `q` further down is a THREE.Quaternion — the quality object is QL.
  const QL = getQuality();
  // WORLD DETAIL scales how much scenery we instance at all — this is the
  // single biggest lever on a weak GPU after render scale.
  const DS = QL.decorScale;
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
      // the archipelago is tropical — pines and sakura would look wrong there,
      // so islands are dressed by src/world/isles.js instead
      if (terrain.island[i] === 1) continue;
      const nx = ix / S, nz = iz / S;
      const wx = ix - S / 2 + 0.5, wz = iz - S / 2 + 0.5;
      const y = terrain.surfaceY(wx, wz);

      const forest = fbm2(nx * 6, nz * 6, SEED, 3);
      const r = rng();

      // keep the village clearing open
      const dSpawn = Math.hypot(wx - terrain.spawn.x, wz - terrain.spawn.z);

      // trees are spaced generously (4.4) so canopies never overlap into an
      // ugly tangled mass; ~40% are pink SAKURA, the rest bright rounded green
      if (forest > 0.48 && r < 0.032 * DS && dSpawn > 9 && !nearTree(trees, wx, wz, 4.4)) {
        trees.push({
          x: wx, y, z: wz,
          s: 0.9 + rng() * 0.35, seed: rng(), sakura: rng() < 0.42,
          snowy: terrain.snow[i] === 1,
        });
        blocked.add(`${ix},${iz}`);
        continue;
      }
      if (r > 1 - 0.015 * DS && t !== 3) {
        rocks.push({ x: wx, y, z: wz, s: 0.35 + rng() * 0.55, rot: rng() * Math.PI, seed: rng() });
        if (rng() < 0.4) blocked.add(`${ix},${iz}`);
        continue;
      }
      if ((t === 0 || t === 4) && r > 0.4 && r < 0.4 + 0.28 * DS) {
        tufts.push({ x: wx + (rng() - 0.5) * 0.5, y, z: wz + (rng() - 0.5) * 0.5, s: 0.5 + rng() * 0.5 });
      }
      if ((t === 6 && r < 0.8 * DS) || (t === 0 && r > 1 - 0.06 * DS)) {
        flowers.push({
          x: wx + (rng() - 0.5) * 0.6, y, z: wz + (rng() - 0.5) * 0.6,
          s: 0.4 + rng() * 0.35, c: Math.floor(rng() * PALETTE.flowers.length),
        });
        // meadow tiles often get a second bloom for lush clusters
        if (t === 6 && rng() < 0.45) {
          flowers.push({
            x: wx + (rng() - 0.5) * 0.7, y, z: wz + (rng() - 0.5) * 0.7,
            s: 0.35 + rng() * 0.3, c: Math.floor(rng() * PALETTE.flowers.length),
          });
        }
      }
      if (t === 0 && r > 0.68 && r < 0.695 && dSpawn > 6) {
        bushes.push({ x: wx, y, z: wz, s: 0.4 + rng() * 0.35, seed: rng() });
      }
    }
  }

  // Japanese stone lanterns (tōrō): along the paths AND spread across the whole
  // map on a jittered grid so no region is pitch-black at night
  const nearLantern = (x, z, minD) => {
    for (const tc of torches) {
      if ((tc.x - x) ** 2 + (tc.z - z) ** 2 < minD * minD) return true;
    }
    return false;
  };
  // generous spacing: lanterns are calm accents, never a fence of lights
  const LANTERN_MIN_D = 14;
  let pathCount = 0;
  for (let iz = 2; iz < S - 2; iz++) {
    for (let ix = 2; ix < S - 2; ix++) {
      const i = terrain.idx(ix, iz);
      if (terrain.type[i] !== 1) continue;
      pathCount++;
      if (pathCount % 16 !== 0) continue;
      const wx = ix - S / 2 + 0.5 + (rng() - 0.5) * 0.4;
      const wz = iz - S / 2 + 0.5 + (rng() - 0.5) * 0.4;
      if (nearLantern(wx, wz, LANTERN_MIN_D)) continue;
      torches.push({ x: wx, y: terrain.surfaceY(wx, wz), z: wz });
    }
  }
  // grid coverage: roughly one lantern per 18-cell region of open land
  for (let gz = 5; gz < S - 5; gz += 18) {
    for (let gx = 5; gx < S - 5; gx += 18) {
      const ix = gx + Math.floor(rng() * 9) - 4;
      const iz = gz + Math.floor(rng() * 9) - 4;
      const i = terrain.idx(ix, iz);
      const h = terrain.height[i];
      if (h <= WATER_LEVEL || terrain.type[i] === 1) continue;
      if (blocked.has(`${ix},${iz}`)) continue;
      const wx = ix - S / 2 + 0.5, wz = iz - S / 2 + 0.5;
      const dSpawn = Math.hypot(wx - terrain.spawn.x, wz - terrain.spawn.z);
      if (dSpawn < 10) continue; // the village has its own lamps
      if (nearLantern(wx, wz, LANTERN_MIN_D)) continue;
      torches.push({ x: wx, y: terrain.surfaceY(wx, wz), z: wz });
    }
  }

  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const YUP = new THREE.Vector3(0, 1, 0);

  // hoisted refs so clearArea() can remove props that clip buildings later
  let treeTrunk = null, treeCanopy = null, treeAcc = null, treeBPT = 6, rockMesh = null, bushMesh = null;
  const treeAccMap = [];

  // --- trees: full, organic rounded crowns (a cluster of overlapping leaf
  // blobs, not two stacked balls) — cheerful green or pink SAKURA, per-tree
  // instance colors. Reads as lush foliage, still cheap (all instanced).
  if (trees.length) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // white base + per-instance setColorAt (instanceColor) — NOT vertexColors,
    // which would look for a missing geometry color attribute and render black
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const setInst = (mesh, i, px, py, pz, sx, sy, sz, ry, col) => {
      q.setFromAxisAngle(YUP, ry);
      m.compose(v.set(px, py, pz), q, sc.set(sx, sy, sz));
      mesh.setMatrixAt(i, m);
      if (col) mesh.setColorAt(i, col);
    };
    const C = (hex) => new THREE.Color(hex);
    const shade = (col, f) => col.clone().multiplyScalar(f);
    const GREEN = { base: '#6fc25e', hi: '#8ad86e', trunk: '#7a5638', accent: '#e8474e' };
    const PINK = { base: '#f2a6cc', hi: '#fbcfe4', trunk: '#8a6a5c', accent: '#ffffff' };
    // winter-biome trees: frosted white-blue crowns on dark cold trunks
    const FROST = { base: '#dceef4', hi: '#ffffff', trunk: '#5a4a48', accent: '#a8d8f0' };

    // canopy blob layout (offset x,y,z, scale, colorRole) around the crown centre
    const BLOBS = [
      [0, 0.58, 0, 1.15, 'base'],
      [0.66, 0.40, 0.22, 0.82, 'dark'],
      [-0.58, 0.44, -0.30, 0.84, 'base'],
      [0.22, 0.40, -0.64, 0.78, 'dark'],
      [-0.30, 0.50, 0.60, 0.80, 'base'],
      [0.06, 1.02, -0.06, 0.74, 'hi'],
    ];
    const BPT = BLOBS.length;
    treeBPT = BPT;

    const tGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 6);
    const trunk = new THREE.InstancedMesh(tGeo, trunkMat, trees.length);
    trunk.castShadow = true; trunk.receiveShadow = true;
    const canopy = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), leafMat, trees.length * BPT);
    canopy.castShadow = true;
    const accented = trees.filter((t) => t.seed > 0.5);
    const acc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 5, 4), leafMat, Math.max(1, accented.length * 3));
    let ai = 0, ci = 0;

    trees.forEach((tr, ti) => {
      const P = tr.snowy ? FROST : tr.sakura ? PINK : GREEN;
      const base = C(P.base), hi = C(P.hi), dark = shade(base, 0.8);
      const s = tr.s, th = 0.85 * s, ry = tr.seed * 6.28;
      setInst(trunk, ti, tr.x, tr.y + th * 0.5, tr.z, s, th, s, ry, C(P.trunk));
      const cy = tr.y + th * 0.95;
      for (const [ox, oy, oz, bs, role] of BLOBS) {
        const col = role === 'hi' ? hi : role === 'dark' ? dark : base;
        setInst(canopy, ci++, tr.x + ox * s, cy + oy * s, tr.z + oz * s, bs * s * 1.02, bs * s * 0.92, bs * s * 1.02, ry + ox, col);
      }
      if (tr.seed > 0.5) {
        const acol = C(P.accent);
        treeAccMap[ti] = { start: ai, count: 3 };
        for (let k = 0; k < 3; k++) {
          const a = tr.seed * 20 + k * 2.1;
          setInst(acc, ai++, tr.x + Math.cos(a) * 0.95 * s, cy + 0.5 * s + (k - 1) * 0.3 * s, tr.z + Math.sin(a) * 0.95 * s, 1, 1, 1, 0, acol);
        }
      }
    });
    while (ai < accented.length * 3) setInst(acc, ai++, 0, -999, 0, 1, 1, 1, 0, C('#ffffff'));
    [trunk, canopy, acc].forEach((mesh) => { if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
    group.add(trunk, canopy);
    if (accented.length) group.add(acc);
    treeTrunk = trunk; treeCanopy = canopy; treeAcc = acc;
  }

  // --- rocks: faceted lumps ---
  if (rocks.length) {
    const rockGeo = new THREE.IcosahedronGeometry(0.62, 0);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
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
    bushMesh = new THREE.InstancedMesh(bGeo, bMat, bushes.length);
    bushMesh.castShadow = true;
    const bushColors = ['#4a8a50', '#3e7d47'].map((c) => new THREE.Color(c));
    bushes.forEach((b, i) => {
      q.setFromAxisAngle(YUP, b.seed * 9);
      m.compose(v.set(b.x, b.y + b.s * 0.3, b.z), q, sc.set(b.s * 1.3, b.s * 0.8, b.s * 1.2));
      bushMesh.setMatrixAt(i, m);
      bushMesh.setColorAt(i, bushColors[Math.floor(b.seed * 2)]);
    });
    if (bushMesh.instanceColor) bushMesh.instanceColor.needsUpdate = true;
    group.add(bushMesh);
  }

  // --- Japanese stone lanterns (ishidōrō): stone base + pillar + light box
  // under a pyramid cap. Calm warm paper glow — nothing like the camp torches.
  const glowTex = canvasTex((ctx) => {
    const g2 = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g2.addColorStop(0, 'rgba(255,214,150,0.8)');
    g2.addColorStop(0.45, 'rgba(255,190,110,0.35)');
    g2.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, 32, 32);
  }, 32, 32);
  const N_LAN = Math.max(1, torches.length);
  const stoneMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#84887e') });
  const stoneDark = new THREE.MeshLambertMaterial({ color: new THREE.Color('#5e625a') });
  // elegant kasuga-dōrō proportions: wide base slab, slender pillar, collar,
  // stone light box with a warm paper pane, broad overhanging roof, round cap
  const baseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.1, 0.46), stoneDark, N_LAN);
  const base2Mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), stoneMat, N_LAN);
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), stoneMat, N_LAN);
  postMesh.castShadow = true;
  const collarMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), stoneDark, N_LAN);
  const houseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), stoneMat, N_LAN);
  houseMesh.castShadow = true;
  // warm paper pane peeking out of the light box
  // the paper pane is the SOURCE: it must be the brightest surface on the
  // lantern so the eye locks onto the structure rather than the halo round it
  const paneMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.2, 0.22),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe8ba') }), N_LAN);
  const roofMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.36, 0.22, 4), stoneDark, N_LAN);
  roofMesh.castShadow = true;
  const capMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 5), stoneMat, N_LAN);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.1,
  });
  const glowSprites = [];
  // the flame core: a tight, almost-white sprite that flickers fast
  const coreTex = canvasTex((ctx) => {
    const g3 = ctx.createRadialGradient(16, 20, 1, 16, 16, 13);
    g3.addColorStop(0, 'rgba(255,250,220,1)');
    g3.addColorStop(0.4, 'rgba(255,196,90,0.85)');
    g3.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g3; ctx.fillRect(0, 0, 32, 32);
  }, 32, 32);
  const coreMat = new THREE.SpriteMaterial({
    map: coreTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  });
  const coreSprites = [];
  // the ground pool: a radial falloff disc, additive so it brightens whatever
  // it lies on instead of painting a flat orange circle
  const poolGeo = new THREE.CircleGeometry(3.0, 20);
  const poolTex = canvasTex((ctx) => {
    const g4 = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    // a long soft falloff — a hard-edged disc reads as a painted circle on the
    // grass, which is the other half of the "it's just an orange ring" problem
    g4.addColorStop(0, 'rgba(255,214,150,0.55)');
    g4.addColorStop(0.25, 'rgba(255,186,105,0.3)');
    g4.addColorStop(0.55, 'rgba(255,158,78,0.11)');
    g4.addColorStop(0.8, 'rgba(255,146,66,0.03)');
    g4.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g4; ctx.fillRect(0, 0, 64, 64);
  }, 64, 64);
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const poolDiscs = [];
  const qRoof = new THREE.Quaternion().setFromAxisAngle(YUP, Math.PI / 4);
  torches.forEach((tc, i) => {
    q.identity();
    m.compose(v.set(tc.x, tc.y + 0.05, tc.z), q, sc.set(1, 1, 1));
    baseMesh.setMatrixAt(i, m);
    m.compose(v.set(tc.x, tc.y + 0.13, tc.z), q, sc.set(1, 1, 1));
    base2Mesh.setMatrixAt(i, m);
    m.compose(v.set(tc.x, tc.y + 0.46, tc.z), q, sc.set(1, 1, 1));
    postMesh.setMatrixAt(i, m);
    m.compose(v.set(tc.x, tc.y + 0.79, tc.z), q, sc.set(1, 1, 1));
    collarMesh.setMatrixAt(i, m);
    m.compose(v.set(tc.x, tc.y + 0.95, tc.z), q, sc.set(1, 1, 1));
    houseMesh.setMatrixAt(i, m);
    paneMesh.setMatrixAt(i, m);
    m.compose(v.set(tc.x, tc.y + 1.17, tc.z), qRoof, sc.set(1, 1, 1));
    roofMesh.setMatrixAt(i, m);
    q.identity();
    m.compose(v.set(tc.x, tc.y + 1.3, tc.z), q, sc.set(1, 1, 1));
    capMesh.setMatrixAt(i, m);
    const glow = new THREE.Sprite(glowMat.clone());
    // The halo must be SMALLER than the lantern's roof, or it swallows the
    // whole structure and you just see a yellow circle floating in the dark.
    glow.scale.set(0.62, 0.62, 1);
    glow.position.set(tc.x, tc.y + 0.97, tc.z);
    group.add(glow);
    glowSprites.push(glow);
    // a small HOT core inside the box. It is what bloom latches onto, so the
    // lantern reads as a flame rather than a yellow cube with a halo.
    const core = new THREE.Sprite(coreMat.clone());
    core.scale.set(0.2, 0.26, 1);    // the flame lives INSIDE the light box
    core.position.set(tc.x, tc.y + 0.95, tc.z);
    group.add(core);
    coreSprites.push(core);
    // A POOL OF LIGHT ON THE GROUND. Only the nearest handful of lanterns get a
    // real PointLight — that budget is what keeps the framerate up — so every
    // other lamp was a glowing box with nothing lit beneath it, which reads as
    // "an orange thing", not a lamp. This disc costs nothing and gives all of
    // them the spill a lamp is supposed to cast.
    const pool = new THREE.Mesh(poolGeo, poolMat.clone());
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(tc.x, tc.y + 0.07, tc.z);
    group.add(pool);
    poolDiscs.push(pool);
  });
  if (torches.length) group.add(baseMesh, base2Mesh, postMesh, collarMesh, houseMesh, paneMesh, roofMesh, capMesh);

  // lantern light pool: the N nearest lanterns cast soft warm light at night
  const LIGHTS = QL.lanternLights;
  const lights = [];
  for (let i = 0; i < LIGHTS; i++) {
    const L = new THREE.PointLight(0xffc27a, 0, 9, 1.8);
    group.add(L);
    lights.push(L);
  }

  // --- butterflies (day) ---
  const BFLY = Math.round(22 * QL.critterScale);
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

  // --- fireflies (night): soft glowing motes drifting over the meadows and
  // gathering around the stone lanterns — the night should feel enchanted
  const FFLY = Math.round(110 * QL.fireflyScale);
  const ffTex = canvasTex((ctx) => {
    const g2 = ctx.createRadialGradient(8, 8, 0.5, 8, 8, 7.5);
    g2.addColorStop(0, 'rgba(240,255,190,1)');
    g2.addColorStop(0.35, 'rgba(216,240,140,0.7)');
    g2.addColorStop(1, 'rgba(180,220,90,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, 16, 16);
  }, 16, 16);
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(FFLY * 3);
  const ffData = [];
  for (let i = 0; i < FFLY; i++) {
    // ~1/3 of them dance around lanterns, the rest roam the grass
    let spot;
    if (torches.length && i % 3 === 0) {
      const tc = torches[Math.floor(rng() * torches.length)];
      spot = { x: tc.x + (rng() - 0.5) * 2.5, y: tc.y + 0.6, z: tc.z + (rng() - 0.5) * 2.5 };
    } else {
      const t = tufts.length ? tufts[Math.floor(rng() * tufts.length)] : { x: 0, y: 3, z: 0 };
      spot = { x: t.x, y: t.y + 0.5, z: t.z };
    }
    ffData.push({ x: spot.x, y: spot.y, z: spot.z, t: rng() * 10, s: 0.5 + rng() });
    ffPos[i * 3] = spot.x; ffPos[i * 3 + 1] = spot.y; ffPos[i * 3 + 2] = spot.z;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xf0ffc0, size: 0.3, map: ffTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const fireflies = new THREE.Points(ffGeo, ffMat);
  fireflies.frustumCulled = false;
  group.add(fireflies);

  scene.add(group);

  function update(dt, playerPos, time, isNight = false) {
    // assign the light pool to the nearest lanterns — calm warm light, only a
    // gentle candle waver (no harsh flicker), and unlit by day
    const sorted = torches
      .map((tc) => ({ tc, d: (tc.x - playerPos.x) ** 2 + (tc.z - playerPos.z) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LIGHTS);
    lights.forEach((L, i) => {
      if (i < sorted.length && sorted[i].d < 42 * 42 && isNight) {
        const tc = sorted[i].tc;
        L.position.set(tc.x, tc.y + 1.0, tc.z);
        L.intensity = 4.2 + Math.sin(time * 3.2 + tc.x * 2.1) * 0.35;
      } else {
        L.intensity = 0;
      }
    });
    // soft paper glow — visible at night, nearly invisible by day
    const glowBase = isNight ? 0.42 : 0.04;
    for (const glow of glowSprites) {
      glow.material.opacity = glowBase + Math.sin(time * 2.6 + glow.position.x * 1.7) * (isNight ? 0.035 : 0.008);
    }
    // the core flickers faster and harder than the halo — that difference in
    // rhythm is what makes it read as fire instead of a pulsing bulb
    // The flame flickers in BRIGHTNESS. Scaling a glow sprite up and down is
    // what made these read as expanding/contracting circles instead of lamps —
    // a flame's light varies in intensity, not in radius.
    for (const core of coreSprites) {
      const ph = time * 9 + core.position.x * 3.1 + core.position.z;
      const flick = 0.78 + Math.sin(ph) * 0.13 + Math.sin(ph * 2.7) * 0.09;
      core.material.opacity = (isNight ? 0.9 : 0.1) * flick;
    }
    // the ground pool breathes with the same flame rhythm
    for (let i = 0; i < poolDiscs.length; i++) {
      const d = poolDiscs[i];
      const ph = time * 9 + d.position.x * 3.1 + d.position.z;
      const flick = 0.85 + Math.sin(ph) * 0.1 + Math.sin(ph * 2.7) * 0.05;
      d.visible = isNight;
      d.material.opacity = isNight ? 0.62 * flick : 0;
    }

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

    // fireflies drift in lazy loops & twinkle at night
    const ffTarget = isNight ? 0.85 + Math.sin(time * 2.1) * 0.12 : 0;
    ffMat.opacity += (ffTarget - ffMat.opacity) * Math.min(1, dt * 1.5);
    if (ffMat.opacity > 0.02) {
      for (let i = 0; i < FFLY; i++) {
        const f = ffData[i];
        f.t += dt * f.s;
        ffPos[i * 3] = f.x + Math.sin(f.t * 0.7) * 1.1 + Math.sin(f.t * 1.9) * 0.2;
        ffPos[i * 3 + 1] = f.y + 0.3 + Math.sin(f.t * 1.3) * 0.35;
        ffPos[i * 3 + 2] = f.z + Math.cos(f.t * 0.55) * 1.1 + Math.cos(f.t * 2.3) * 0.2;
      }
      ffGeo.attributes.position.needsUpdate = true;
    }
  }

  // remove trees / rocks / bushes whose footprint overlaps a building so nothing
  // clips through houses, camps, shrines, etc. Also frees their blocked cells.
  const GONE = new THREE.Matrix4().makeTranslation(0, -9999, 0);
  function clearArea(x, z, r) {
    const r2 = r * r;
    let td = false, rd = false, bd = false;
    if (treeTrunk) {
      trees.forEach((tr, ti) => {
        if ((tr.x - x) ** 2 + (tr.z - z) ** 2 > r2) return;
        treeTrunk.setMatrixAt(ti, GONE);
        for (let k = 0; k < treeBPT; k++) treeCanopy.setMatrixAt(ti * treeBPT + k, GONE);
        const am = treeAccMap[ti];
        if (am && treeAcc) for (let k = 0; k < am.count; k++) treeAcc.setMatrixAt(am.start + k, GONE);
        const [ix, iz] = terrain.cellOf(tr.x, tr.z);
        blocked.delete(`${ix},${iz}`);
        td = true;
      });
    }
    if (rockMesh) rocks.forEach((rk, i) => {
      if ((rk.x - x) ** 2 + (rk.z - z) ** 2 > r2) return;
      rockMesh.setMatrixAt(i, GONE);
      const [ix, iz] = terrain.cellOf(rk.x, rk.z); blocked.delete(`${ix},${iz}`);
      rd = true;
    });
    if (bushMesh) bushes.forEach((b, i) => {
      if ((b.x - x) ** 2 + (b.z - z) ** 2 > r2) return;
      bushMesh.setMatrixAt(i, GONE); bd = true;
    });
    if (td) { treeTrunk.instanceMatrix.needsUpdate = true; treeCanopy.instanceMatrix.needsUpdate = true; if (treeAcc) treeAcc.instanceMatrix.needsUpdate = true; }
    if (rd) rockMesh.instanceMatrix.needsUpdate = true;
    if (bd) bushMesh.instanceMatrix.needsUpdate = true;
  }

  return { group, blocked, torches, trees, update, clearArea };
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
