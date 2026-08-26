// Semesta enemies — 8 species with distinct AI:
// melee (slime, nibbit, armorbug, treant, golem), ranged (fungling, wisp), charge (boarling).
// Visual direction: big glossy pixel eyes & rounded silhouettes — cute-critter
// (Pokemon/Pokopia) energy, not scary blocks.
import * as THREE from 'three';
import { WATER_LEVEL, BLOCK_H } from '../world/terrain.js';
import { makeCritterFaceTexture, toTexture } from '../gfx/textures.js';
import { rollDrops } from '../systems/items.js';
import { disposeObject } from '../util/dispose.js';
// Geometry is SHARED — every monster spawn used to allocate ~72 fresh
// geometries, and the GPU buffer uploads on the frame they first appear are a
// measured 7.2ms spike. Materials stay per-enemy: they flash white on a hit.
import { sharedBox, sharedCyl, sharedSphere } from '../gfx/meshcache.js';

// Aggro ranges are deliberately modest — monsters shouldn't dogpile players
// who are just exploring; you mostly fight what you walk up to.
import { DUNGEON_TYPES, DUNGEON_BUILDERS, DUNGEON_BOSSES } from './dungeonfoes.js';

export const ENEMY_TYPES = {
  slime: {
    name: 'Slime', hp: 14, dmg: 4, speed: 1.5, xp: 8, aggro: 4.0, attackRange: 1.0,
    attackCd: 1.5, weight: 0.22, behavior: 'melee',
  },
  nibbit: {
    name: 'Nibbit', hp: 9, dmg: 3, speed: 2.7, xp: 7, aggro: 3.4, attackRange: 0.9,
    attackCd: 1.2, weight: 0.11, behavior: 'melee',
  },
  armorbug: {
    name: 'Armorbug', hp: 34, dmg: 8, speed: 1.0, xp: 18, aggro: 3.2, attackRange: 1.1,
    attackCd: 1.8, weight: 0.08, behavior: 'melee', water: true,
  },
  fungling: {
    name: 'Fungling', hp: 18, dmg: 6, speed: 1.2, xp: 14, aggro: 5.5, attackRange: 6.0,
    attackCd: 2.5, weight: 0.11, behavior: 'ranged', keepDist: 4.5,
  },
  boarling: {
    name: 'Boarling', hp: 26, dmg: 9, speed: 1.8, xp: 16, aggro: 5.0, attackRange: 1.2,
    attackCd: 1.6, weight: 0.10, behavior: 'charge',
  },
  wisp: {
    name: 'Wisp', hp: 15, dmg: 7, speed: 1.9, xp: 20, aggro: 6.0, attackRange: 6.5,
    attackCd: 2.1, weight: 0, behavior: 'ranged', keepDist: 5, nightOnly: true, floats: true,
  },
  treant: {
    name: 'Treant', hp: 65, dmg: 13, speed: 0.75, xp: 32, aggro: 4.0, attackRange: 1.4,
    attackCd: 2.1, weight: 0.07, behavior: 'melee',
  },
  golem: {
    name: 'Golem', hp: 160, dmg: 20, speed: 0.6, xp: 90, aggro: 5.0, attackRange: 1.7,
    attackCd: 2.6, weight: 0.03, behavior: 'melee', minDist: 38, boss: true,
  },
  // --- newer species: biome & time-of-day exclusives for variety ---
  frostling: { // winter-biome fox cub that spits frost shards
    name: 'Frostling', hp: 22, dmg: 7, speed: 1.6, xp: 24, aggro: 5.5, attackRange: 6.0,
    attackCd: 2.2, weight: 0, behavior: 'ranged', keepDist: 4.5, snowOnly: true,
  },
  sparkit: { // zippy static-charged squirrel — fast, fragile, darts around
    name: 'Sparkit', hp: 12, dmg: 5, speed: 3.3, xp: 13, aggro: 4.5, attackRange: 0.9,
    attackCd: 1.0, weight: 0.07, behavior: 'melee',
  },
  puffowl: { // round night owl that drifts above the grass and swoops
    name: 'Puffowl', hp: 17, dmg: 8, speed: 2.3, xp: 25, aggro: 5.5, attackRange: 1.1,
    attackCd: 1.7, weight: 0, behavior: 'melee', nightOnly: true, floats: true,
  },
  embercub: { // toasty little fire-fox cub — quick pounces, warm cheeks
    name: 'Embercub', hp: 19, dmg: 7, speed: 2.5, xp: 18, aggro: 4.5, attackRange: 1.0,
    attackCd: 1.3, weight: 0.06, behavior: 'melee',
  },
  thornling: { // grumpy walking cactus that flicks needles from afar
    name: 'Thornling', hp: 24, dmg: 7, speed: 0.9, xp: 20, aggro: 5.5, attackRange: 6.5,
    attackCd: 2.4, weight: 0.05, behavior: 'ranged', keepDist: 5,
  },
  mossback: { // ancient moss-covered shell-beast: slow, stubborn, very tanky
    name: 'Mossback', hp: 55, dmg: 11, speed: 0.65, xp: 30, aggro: 3.5, attackRange: 1.3,
    attackCd: 2.2, weight: 0.05, behavior: 'melee',
  },
  // THE HOLLOW'S OWN. Merged in rather than kept in a separate table so that
  // every system that already walks ENEMY_TYPES -- the Index catalogue, the
  // loading-screen prewarm, level scaling, disposal -- sees them for free and
  // cannot forget one. They all carry `weight: 0` and `dungeonOnly`, so the
  // overworld spawner can never roll one however it is called.
  ...DUNGEON_TYPES,
};

// ---------------------------------------------------------------------------
// mesh builders
// ---------------------------------------------------------------------------
const faceTexCache = new Map();
function critterFace(key, opts) {
  if (!faceTexCache.has(key)) faceTexCache.set(key, makeCritterFaceTexture(opts));
  return faceTexCache.get(key);
}

function lam(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...opts });
}

function facePlane(key, opts, w = 0.6, h = 0.45) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: critterFace(key, opts), transparent: true }));
  return mesh;
}

function buildSlimeMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(sharedBox(0.7, 0.55, 0.65),
    lam('#6de0a0', { transparent: true, opacity: 0.82 }));
  body.position.y = 0.28;
  body.castShadow = true;
  // rounded top blob
  const top = new THREE.Mesh(sharedBox(0.5, 0.16, 0.46),
    lam('#8aeab8', { transparent: true, opacity: 0.8 }));
  top.position.y = 0.6;
  const drip = new THREE.Mesh(sharedBox(0.12, 0.12, 0.12),
    lam('#8aeab8', { transparent: true, opacity: 0.9 }));
  drip.position.set(0.1, 0.72, 0);
  const inner = new THREE.Mesh(sharedBox(0.28, 0.22, 0.28),
    lam('#3aa86b', { transparent: true, opacity: 0.85 }));
  inner.position.y = 0.2;
  const face = facePlane('slime', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 2, mouth: 'open', cheeks: 'rgba(240,130,140,0.75)' }, 0.62, 0.46);
  face.position.set(0, 0.3, 0.34);
  g.add(body, top, drip, inner, face);
  g.userData.body = body;
  return g;
}

function buildNibbitMesh() {
  const g = new THREE.Group();
  const feathers = lam('#a8c4d4');
  const featherLight = lam('#c8dce8');
  // round chick body
  const body = new THREE.Mesh(sharedBox(0.42, 0.4, 0.44), feathers);
  body.position.y = 0.32;
  body.castShadow = true;
  const belly = new THREE.Mesh(sharedBox(0.34, 0.26, 0.08), featherLight);
  belly.position.set(0, 0.26, 0.2);
  // big head sitting right on the body
  const head = new THREE.Mesh(sharedBox(0.38, 0.32, 0.34), feathers);
  head.position.set(0, 0.6, 0.06);
  const face = facePlane('nibbit', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, mouth: 'none' }, 0.4, 0.3);
  face.position.set(0, 0.62, 0.24);
  const beak = new THREE.Mesh(sharedBox(0.1, 0.08, 0.14), lam('#f0a83d'));
  beak.position.set(0, 0.55, 0.3);
  // tuft feather on top
  const tuft = new THREE.Mesh(sharedBox(0.07, 0.14, 0.07), featherLight);
  tuft.position.set(0, 0.8, 0.02);
  tuft.rotation.z = 0.2;
  // wing nubs
  const wingL = new THREE.Mesh(sharedBox(0.08, 0.22, 0.28), featherLight);
  wingL.position.set(-0.25, 0.36, 0);
  const wingR = wingL.clone(); wingR.position.x = 0.25;
  const legs = new THREE.Mesh(sharedBox(0.16, 0.14, 0.06), lam('#e8a33d'));
  legs.position.y = 0.07;
  g.add(body, belly, head, face, beak, tuft, wingL, wingR, legs);
  g.userData.body = body;
  g.userData.wings = [wingL, wingR];
  return g;
}

function buildArmorbugMesh() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(sharedBox(0.8, 0.42, 1.0), lam('#5a8a8a'));
  shell.position.y = 0.34;
  shell.castShadow = true;
  const ridge = new THREE.Mesh(sharedBox(0.5, 0.18, 0.7), lam('#78b0a8'));
  ridge.position.y = 0.58;
  // shell spots
  for (const [dx, dz] of [[-0.2, -0.2], [0.22, 0.1], [0, 0.32], [-0.15, 0.15]]) {
    const dot = new THREE.Mesh(sharedBox(0.1, 0.04, 0.1), lam('#c8e0d8'));
    dot.position.set(dx, 0.56, dz);
    g.add(dot);
  }
  const headM = lam('#8a6a4a');
  const head = new THREE.Mesh(sharedBox(0.42, 0.3, 0.3), headM);
  head.position.set(0, 0.28, 0.6);
  const face = facePlane('armorbug', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile' }, 0.42, 0.3);
  face.position.set(0, 0.3, 0.76);
  const pincerL = new THREE.Mesh(sharedBox(0.1, 0.1, 0.24), headM);
  pincerL.position.set(-0.16, 0.2, 0.8);
  const pincerR = pincerL.clone(); pincerR.position.x = 0.16;
  for (let i = 0; i < 3; i++) {
    const legL = new THREE.Mesh(sharedBox(0.3, 0.09, 0.09), headM);
    legL.position.set(-0.5, 0.14, -0.25 + i * 0.3);
    const legR = legL.clone(); legR.position.x = 0.5;
    g.add(legL, legR);
  }
  g.add(shell, ridge, head, face, pincerL, pincerR);
  g.userData.body = shell;
  return g;
}

function buildFunglingMesh() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(sharedBox(0.34, 0.42, 0.32), lam('#ead8b0'));
  stem.position.y = 0.24;
  stem.castShadow = true;
  const cap = new THREE.Mesh(sharedBox(0.74, 0.28, 0.74), lam('#c86a8a'));
  cap.position.y = 0.56;
  cap.castShadow = true;
  const capTop = new THREE.Mesh(sharedBox(0.46, 0.18, 0.46), lam('#e090ac'));
  capTop.position.y = 0.76;
  for (const [dx, dz] of [[-0.2, 0.2], [0.22, -0.1], [0, 0.28], [-0.24, -0.18]]) {
    const dot = new THREE.Mesh(sharedBox(0.12, 0.05, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xf5ecd8 }));
    dot.position.set(dx, 0.72, dz);
    g.add(dot);
  }
  const face = facePlane('fungling', { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'open', cheeks: 'rgba(230,140,150,0.7)' }, 0.36, 0.28);
  face.position.set(0, 0.28, 0.17);
  g.add(stem, cap, capTop, face);
  g.userData.body = cap;
  return g;
}

function buildBoarlingMesh() {
  const g = new THREE.Group();
  const fur = lam('#8a5f40');
  const furDark = lam('#6a4630');
  const body = new THREE.Mesh(sharedBox(0.55, 0.45, 0.8), fur);
  body.position.y = 0.4;
  body.castShadow = true;
  const mane = new THREE.Mesh(sharedBox(0.32, 0.16, 0.55), furDark);
  mane.position.set(0, 0.66, -0.05);
  // big cute head
  const head = new THREE.Mesh(sharedBox(0.46, 0.4, 0.32), fur);
  head.position.set(0, 0.44, 0.5);
  const face = facePlane('boarling', { eyeW: 3, eyeH: 4, gap: 6, eyeY: 1, mouth: 'none', angry: true }, 0.46, 0.34);
  face.position.set(0, 0.5, 0.67);
  const snout = new THREE.Mesh(sharedBox(0.22, 0.14, 0.1), lam('#d89aa0'));
  snout.position.set(0, 0.36, 0.68);
  const nostrils = new THREE.Mesh(sharedBox(0.14, 0.05, 0.02), lam('#a86a70'));
  nostrils.position.set(0, 0.36, 0.74);
  // floppy ears
  const earL = new THREE.Mesh(sharedBox(0.12, 0.14, 0.06), furDark);
  earL.position.set(-0.2, 0.66, 0.42); earL.rotation.z = 0.4;
  const earR = earL.clone(); earR.position.x = 0.2; earR.rotation.z = -0.4;
  const tuskL = new THREE.Mesh(sharedBox(0.05, 0.12, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xf0e8d0 }));
  tuskL.position.set(-0.14, 0.3, 0.64);
  const tuskR = tuskL.clone(); tuskR.position.x = 0.14;
  for (const [dx, dz] of [[-0.18, 0.26], [0.18, 0.26], [-0.18, -0.26], [0.18, -0.26]]) {
    const leg = new THREE.Mesh(sharedBox(0.14, 0.3, 0.14), furDark);
    leg.position.set(dx, 0.15, dz);
    g.add(leg);
  }
  // curly tail nub
  const tail = new THREE.Mesh(sharedBox(0.08, 0.08, 0.08), furDark);
  tail.position.set(0, 0.5, -0.44);
  g.add(body, mane, head, face, snout, nostrils, earL, earR, tuskL, tuskR, tail);
  g.userData.body = body;
  return g;
}

function buildWispMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(sharedBox(0.22, 0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xd8f4ff }));
  core.position.y = 0.5;
  const shell = new THREE.Mesh(sharedBox(0.44, 0.44, 0.44),
    lam('#7ab8d8', { transparent: true, opacity: 0.45 }));
  shell.position.y = 0.5;
  const face = facePlane('wisp', { eyeW: 2, eyeH: 4, gap: 4, eyeY: 3, eye: '#3a6a8a', mouth: 'none' }, 0.34, 0.26);
  face.position.set(0, 0.5, 0.24);
  // little flame wisps orbiting
  const flameL = new THREE.Mesh(sharedBox(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xaee0f0, transparent: true, opacity: 0.8 }));
  flameL.position.set(-0.35, 0.6, 0);
  const flameR = flameL.clone(); flameR.position.set(0.35, 0.42, 0);
  const light = new THREE.PointLight(0x9adcf0, 2.4, 5, 1.8);
  light.position.y = 0.5;
  g.add(core, shell, face, flameL, flameR, light);
  g.userData.body = shell;
  g.userData.spinning = shell;
  return g;
}

function buildTreantMesh() {
  const g = new THREE.Group();
  const barkMat = lam('#5a4432');
  const trunk = new THREE.Mesh(sharedBox(0.6, 1.0, 0.55), barkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  const crown = new THREE.Mesh(sharedBox(0.9, 0.4, 0.85), lam('#3e7d47'));
  crown.position.y = 1.4;
  crown.castShadow = true;
  const crownTop = new THREE.Mesh(sharedBox(0.6, 0.24, 0.55), lam('#4f9857'));
  crownTop.position.y = 1.68;
  const face = facePlane('treant', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, eye: '#d8e858', mouth: 'open', mouthColor: '#2a2018', angry: true }, 0.5, 0.4);
  face.position.set(0, 0.9, 0.29);
  const armL = new THREE.Mesh(sharedBox(0.16, 0.7, 0.16), barkMat);
  armL.position.set(-0.44, 0.75, 0);
  const armR = armL.clone(); armR.position.x = 0.44;
  // leafy hands
  const leafL = new THREE.Mesh(sharedBox(0.2, 0.14, 0.2), lam('#4f9857'));
  leafL.position.set(-0.44, 0.36, 0);
  const leafR = leafL.clone(); leafR.position.x = 0.44;
  const legL = new THREE.Mesh(sharedBox(0.2, 0.4, 0.2), barkMat);
  legL.position.set(-0.16, 0.2, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  g.add(trunk, crown, crownTop, face, armL, armR, leafL, leafR, legL, legR);
  g.userData.body = trunk;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

function buildGolemMesh() {
  const g = new THREE.Group();
  const stone = lam('#8d9294');
  const stoneDark = lam('#646a6c');
  const torso = new THREE.Mesh(sharedBox(1.1, 1.0, 0.7), stone);
  torso.position.y = 1.0;
  torso.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.5, 0.4, 0.45), stoneDark);
  head.position.y = 1.7;
  const core = new THREE.Mesh(sharedBox(0.24, 0.24, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xf0a848 }));
  core.position.set(0, 1.1, 0.36);
  const face = facePlane('golem', { eyeW: 4, eyeH: 3, gap: 3, eyeY: 3, eye: '#ffc860', mouth: 'none' }, 0.44, 0.32);
  face.position.set(0, 1.72, 0.24);
  const armL = new THREE.Mesh(sharedBox(0.34, 1.1, 0.34), stoneDark);
  armL.position.set(-0.78, 0.95, 0);
  armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.78;
  const legL = new THREE.Mesh(sharedBox(0.36, 0.55, 0.4), stoneDark);
  legL.position.set(-0.3, 0.28, 0);
  const legR = legL.clone(); legR.position.x = 0.3;
  const moss = new THREE.Mesh(sharedBox(0.7, 0.14, 0.5), lam('#568a42'));
  moss.position.set(0.1, 1.55, -0.1);
  g.add(torso, head, core, face, armL, armR, legL, legR, moss);
  g.userData.body = torso;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

function buildFrostlingMesh() {
  const g = new THREE.Group();
  const fur = lam('#cfe6f2');
  const furDeep = lam('#a8ccdf');
  const body = new THREE.Mesh(sharedBox(0.44, 0.36, 0.56), fur);
  body.position.y = 0.3;
  body.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.4, 0.34, 0.32), fur);
  head.position.set(0, 0.58, 0.2);
  const face = facePlane('frostling', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, eye: '#5aa8e8', mouth: 'w', cheeks: 'rgba(150,200,240,0.6)' }, 0.38, 0.28);
  face.position.set(0, 0.6, 0.37);
  // crystal ears + icy tail tip
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.9 });
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), crystalMat);
    ear.position.set(sx * 0.13, 0.82, 0.16);
    g.add(ear);
  }
  const tail = new THREE.Mesh(sharedBox(0.12, 0.12, 0.3), furDeep);
  tail.position.set(0, 0.4, -0.36); tail.rotation.x = -0.5;
  const tailTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), crystalMat);
  tailTip.position.set(0, 0.52, -0.48);
  const legs = new THREE.Mesh(sharedBox(0.36, 0.14, 0.44), furDeep);
  legs.position.y = 0.1;
  g.add(body, head, face, tail, tailTip, legs);
  g.userData.body = body;
  return g;
}

function buildSparkitMesh() {
  const g = new THREE.Group();
  const fur = lam('#f0d060');
  const furDark = lam('#d0a840');
  const body = new THREE.Mesh(sharedBox(0.36, 0.32, 0.42), fur);
  body.position.y = 0.26;
  body.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.34, 0.3, 0.28), fur);
  head.position.set(0, 0.52, 0.14);
  const face = facePlane('sparkit', { eyeW: 3, eyeH: 5, gap: 4, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,160,90,0.8)' }, 0.32, 0.24);
  face.position.set(0, 0.54, 0.29);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(sharedBox(0.08, 0.14, 0.05), furDark);
    ear.position.set(sx * 0.11, 0.72, 0.1);
    g.add(ear);
  }
  // zigzag lightning tail
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
  const tail = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(sharedBox(0.07, 0.16, 0.07), boltMat);
    seg.position.set((i % 2 ? 0.08 : -0.08), 0.1 + i * 0.13, 0);
    tail.add(seg);
  }
  tail.position.set(0, 0.3, -0.26);
  const legs = new THREE.Mesh(sharedBox(0.3, 0.12, 0.34), furDark);
  legs.position.y = 0.08;
  g.add(body, head, face, tail, legs);
  g.userData.body = body;
  g.userData.tail = tail;
  return g;
}

function buildPuffowlMesh() {
  const g = new THREE.Group();
  const feather = lam('#8a7aa8');
  const featherLight = lam('#b8a8cc');
  const body = new THREE.Mesh(sharedBox(0.5, 0.52, 0.44), feather);
  body.position.y = 0.42;
  body.castShadow = true;
  const belly = new THREE.Mesh(sharedBox(0.4, 0.34, 0.06), featherLight);
  belly.position.set(0, 0.36, 0.23);
  const face = facePlane('puffowl', { eyeW: 5, eyeH: 5, gap: 3, eyeY: 2, eye: '#ffd24a', mouth: 'none' }, 0.44, 0.32);
  face.position.set(0, 0.56, 0.24);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), lam('#e8a33d'));
  beak.position.set(0, 0.48, 0.27); beak.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), feather);
    tuft.position.set(sx * 0.16, 0.74, 0.08);
    tuft.rotation.z = -sx * 0.3;
    g.add(tuft);
    const wing = new THREE.Mesh(sharedBox(0.09, 0.34, 0.3), featherLight);
    wing.position.set(sx * 0.3, 0.44, -0.02);
    g.add(wing);
    g.userData.wings = g.userData.wings || [];
    g.userData.wings.push(wing);
  }
  const feet = new THREE.Mesh(sharedBox(0.2, 0.08, 0.12), lam('#e8a33d'));
  feet.position.y = 0.14;
  g.add(body, belly, face, beak, feet);
  g.userData.body = body;
  return g;
}

function buildEmbercubMesh() {
  const g = new THREE.Group();
  const fur = lam('#e8935a');
  const furDeep = lam('#c46a3a');
  const body = new THREE.Mesh(sharedBox(0.44, 0.36, 0.54), fur);
  body.position.y = 0.3;
  body.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.4, 0.34, 0.32), fur);
  head.position.set(0, 0.58, 0.18);
  const face = facePlane('embercub', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, mouth: 'open', cheeks: 'rgba(255,140,80,0.85)' }, 0.38, 0.28);
  face.position.set(0, 0.6, 0.35);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), furDeep);
    ear.position.set(sx * 0.13, 0.82, 0.14);
    g.add(ear);
  }
  // little flame tail
  const tail = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0),
    new THREE.MeshBasicMaterial({ color: 0xffa844 }));
  tail.position.set(0, 0.46, -0.36);
  const tailCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0),
    new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  tailCore.position.set(0, 0.5, -0.38);
  const legs = new THREE.Mesh(sharedBox(0.36, 0.14, 0.42), furDeep);
  legs.position.y = 0.1;
  const glow = new THREE.PointLight(0xff9a44, 0.6, 2.5, 2);
  glow.position.set(0, 0.5, -0.35);
  g.add(body, head, face, tail, tailCore, legs, glow);
  g.userData.body = body;
  g.userData.flame = tail;
  return g;
}

function buildThornlingMesh() {
  const g = new THREE.Group();
  const green = lam('#5a9a58');
  const greenDeep = lam('#3f7a42');
  const body = new THREE.Mesh(sharedBox(0.42, 0.62, 0.38), green);
  body.position.y = 0.42;
  body.castShadow = true;
  const face = facePlane('thornling', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'w' }, 0.36, 0.28);
  face.position.set(0, 0.52, 0.2);
  for (const [sx, sy] of [[-1, 0.36], [1, 0.5]]) {
    const arm = new THREE.Mesh(sharedBox(0.13, 0.3, 0.13), greenDeep);
    arm.position.set(sx * 0.3, sy, 0);
    arm.rotation.z = -sx * 0.5;
    g.add(arm);
  }
  // needles
  for (let i = 0; i < 8; i++) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), lam('#e8e8d0'));
    n.position.set((Math.sin(i * 2.4) * 0.2), 0.25 + (i % 4) * 0.14, (Math.cos(i * 2.4) * 0.17));
    n.rotation.z = Math.sin(i) * 1.2;
    g.add(n);
  }
  const flower = new THREE.Mesh(sharedBox(0.14, 0.08, 0.14), lam('#f0a8c8'));
  flower.position.y = 0.78;
  const pot = new THREE.Mesh(sharedBox(0.34, 0.14, 0.3), lam('#a8654a'));
  pot.position.y = 0.07;
  g.add(body, face, flower, pot);
  g.userData.body = body;
  return g;
}

function buildMossbackMesh() {
  const g = new THREE.Group();
  const skin = lam('#8a9a6a');
  const body = new THREE.Mesh(sharedBox(0.6, 0.3, 0.72), skin);
  body.position.y = 0.26;
  body.castShadow = true;
  // mossy dome shell
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), lam('#5a7a4a'));
  shell.position.y = 0.46;
  shell.scale.set(1, 0.6, 1.15);
  shell.castShadow = true;
  for (const [dx, dz] of [[-0.15, 0.1], [0.18, -0.05], [0, -0.25]]) {
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), lam('#6fa05a'));
    tuft.position.set(dx, 0.66, dz);
    tuft.scale.y = 0.6;
    g.add(tuft);
  }
  const sprout = new THREE.Mesh(sharedBox(0.05, 0.14, 0.05), lam('#4f9857'));
  sprout.position.y = 0.78;
  const leaf = new THREE.Mesh(sharedBox(0.14, 0.04, 0.08), lam('#7ac866'));
  leaf.position.set(0.05, 0.86, 0);
  const head = new THREE.Mesh(sharedBox(0.3, 0.26, 0.26), skin);
  head.position.set(0, 0.36, 0.5);
  const face = facePlane('mossback', { eyeW: 3, eyeH: 3, gap: 4, eyeY: 3, mouth: 'smile' }, 0.28, 0.22);
  face.position.set(0, 0.38, 0.64);
  const legs = new THREE.Mesh(sharedBox(0.5, 0.14, 0.6), lam('#6a7a52'));
  legs.position.y = 0.1;
  g.add(body, shell, sprout, leaf, head, face, legs);
  g.userData.body = body;
  return g;
}

const BUILDERS = {
  slime: buildSlimeMesh, nibbit: buildNibbitMesh, armorbug: buildArmorbugMesh,
  fungling: buildFunglingMesh, boarling: buildBoarlingMesh, wisp: buildWispMesh,
  treant: buildTreantMesh, golem: buildGolemMesh,
  frostling: buildFrostlingMesh, sparkit: buildSparkitMesh, puffowl: buildPuffowlMesh,
  embercub: buildEmbercubMesh, thornling: buildThornlingMesh, mossback: buildMossbackMesh,
  // The Hollow's own. Merged rather than listed separately so every existing
  // path -- spawning, the prewarm, disposal, the Index -- picks them up without
  // a single `if (dungeon)` anywhere.
  ...DUNGEON_BUILDERS,
};

// --- world bosses: giant variants that appear on a timer ---
/**
 * WORLD BOSSES.
 *
 * Three scaled-up normal monsters that all walked at you and hit you was not
 * three bosses, it was one boss in three costumes. Each one now carries a
 * `phases` script — timed patterns it cycles through — so the fight has a shape:
 * something to dodge, a window to punish, and a tell that says which is coming.
 *
 * `phases[]` entries: { at } fraction of max HP it triggers below, `every`
 * seconds between casts, `move` the pattern id, `tell` seconds of windup, and
 * `color` for the telegraph ring. main.js reads `boss.cast` and plays the FX.
 */
export const WORLD_BOSSES = {
  king_slime: {
    name: 'King Slime', base: 'slime', scale: 2.8,
    hp: 520, dmg: 22, xp: 420, speed: 1.2, attackRange: 2.2, attackCd: 1.8, aggro: 14,
    crown: true, title: 'the Ever-Splitting',
    phases: [
      { at: 1.0, every: 6.5, move: 'slam', tell: 0.9, color: '#7fd06a', r: 5.5 },
      { at: 0.6, every: 5.0, move: 'split', tell: 1.2, color: '#a8e07a' },
      { at: 0.3, every: 4.0, move: 'bounce', tell: 0.7, color: '#ffe27a', r: 7 },
    ],
  },
  elder_treant: {
    name: 'Elder Treant', base: 'treant', scale: 2.0,
    hp: 650, dmg: 26, xp: 500, speed: 0.9, attackRange: 2.6, attackCd: 2.0, aggro: 14,
    title: 'Root of the Long Grass',
    phases: [
      { at: 1.0, every: 7.0, move: 'roots', tell: 1.1, color: '#6a4a30', r: 6 },
      { at: 0.55, every: 5.5, move: 'thorns', tell: 0.8, color: '#8ad86e' },
      { at: 0.25, every: 6.0, move: 'heal', tell: 1.4, color: '#b6e08a' },
    ],
  },
  stone_colossus: {
    name: 'Stone Colossus', base: 'golem', scale: 1.7,
    hp: 800, dmg: 30, xp: 620, speed: 0.75, attackRange: 2.8, attackCd: 2.4, aggro: 14,
    title: 'the Unmoved',
    phases: [
      { at: 1.0, every: 6.0, move: 'quake', tell: 1.0, color: '#c8b48a', r: 7 },
      { at: 0.5, every: 5.0, move: 'boulders', tell: 1.0, color: '#8d9294' },
      { at: 0.25, every: 7.0, move: 'harden', tell: 1.2, color: '#e8dcc0' },
    ],
  },
  // --- three NEW bosses, one per biome, so the timer is not the same fight ---
  frost_monarch: {
    name: 'Frost Monarch', base: 'frostling', scale: 2.6,
    hp: 720, dmg: 28, xp: 560, speed: 1.35, attackRange: 2.4, attackCd: 1.6, aggro: 15,
    crown: true, title: 'Winter Unending', biome: 'snow',
    phases: [
      { at: 1.0, every: 5.5, move: 'blizzard', tell: 1.0, color: '#c8ecf8', r: 8 },
      { at: 0.6, every: 4.5, move: 'shards', tell: 0.7, color: '#a8d8f0' },
      { at: 0.3, every: 6.5, move: 'freeze', tell: 1.3, color: '#eafaff', r: 5 },
    ],
  },
  tide_warden: {
    name: 'Tide Warden', base: 'mossback', scale: 2.4,
    hp: 900, dmg: 32, xp: 700, speed: 0.9, attackRange: 3.0, attackCd: 2.2, aggro: 15,
    title: 'Keeper of the Drowned Road', biome: 'coast',
    phases: [
      { at: 1.0, every: 6.0, move: 'wave', tell: 1.1, color: '#5aa8e8', r: 8 },
      { at: 0.55, every: 5.0, move: 'whirl', tell: 0.9, color: '#7fd0f0', r: 6 },
      { at: 0.25, every: 7.0, move: 'summon', tell: 1.4, color: '#dff6ff' },
    ],
  },
  ember_tyrant: {
    name: 'Ember Tyrant', base: 'embercub', scale: 2.7,
    hp: 1050, dmg: 36, xp: 880, speed: 1.5, attackRange: 2.6, attackCd: 1.5, aggro: 16,
    crown: true, title: 'the Last Kindling', minLevel: 15,
    phases: [
      { at: 1.0, every: 5.0, move: 'firewall', tell: 0.9, color: '#ff8a3c', r: 7 },
      { at: 0.6, every: 4.0, move: 'comet', tell: 1.0, color: '#ffd23e', r: 4 },
      { at: 0.28, every: 3.4, move: 'inferno', tell: 1.3, color: '#ff5a2c', r: 9 },
    ],
  },
  // The Hollow's wardens and lords. Same shape, same `phases` script, so the
  // boss handler in main.js needs nothing added for them.
  ...DUNGEON_BOSSES,
};
const BOSS_LIFETIME = 150; // seconds before it wanders away

// ---------------------------------------------------------------------------
// nameplate (canvas sprite): name + level + HP bar
// ---------------------------------------------------------------------------
// Nameplates are RECYCLED. Building one allocates a canvas, a CanvasTexture and
// a SpriteMaterial, and the texture upload lands on the frame the monster first
// appears — a spawn hitch you can feel. A retired plate goes back in the pool
// and the next spawn just repaints its canvas, so after the pool warms up a
// spawn allocates nothing at all.
const platePool = [];

function makeNameplate(name, level, boss = false) {
  const reused = platePool.pop();
  if (reused) {
    reused.name = name;
    reused.level = level;
    reused.boss = boss;
    reused.sprite.scale.set(boss ? 2.2 : 1.7, boss ? 0.62 : 0.48, 1);
    reused.sprite.visible = true;
    redrawNameplate(reused, 1);
    return reused;
  }
  const c = document.createElement('canvas');
  c.width = 128; c.height = 36;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
  sprite.scale.set(boss ? 2.2 : 1.7, boss ? 0.62 : 0.48, 1);
  const state = { c, sprite, name, level, boss };
  redrawNameplate(state, 1);
  sprite.material.map = toTexture(c);
  return state;
}

/** Hand a dead monster's plate back so the next spawn can reuse it. */
function recycleNameplate(np) {
  if (!np || platePool.length >= 24) return false;
  np.sprite.visible = false;
  np.sprite.parent?.remove(np.sprite);
  platePool.push(np);
  return true;
}

function redrawNameplate(np, hpFrac) {
  const ctx = np.c.getContext('2d');
  ctx.clearRect(0, 0, 128, 36);
  ctx.fillStyle = 'rgba(10,12,10,0.7)';
  ctx.fillRect(10, 2, 108, 30);
  if (np.boss) { ctx.strokeStyle = '#c9a13d'; ctx.lineWidth = 2; ctx.strokeRect(11, 3, 106, 28); }
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = np.boss ? '#ffd88a' : '#e8e8dc';
  ctx.textAlign = 'center';
  ctx.fillText(np.name, 70, 15);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#c9c9b8';
  ctx.fillText(String(np.level), 14, 15);
  ctx.fillStyle = '#3a1512';
  ctx.fillRect(14, 20, 100, 7);
  ctx.fillStyle = np.boss ? '#e8a33d' : '#d1372c';
  // clamped at BOTH ends: the track is 100px inside a 108px plate, so an
  // over-full bar drew straight off the edge of the nameplate
  ctx.fillRect(14, 20, Math.round(100 * Math.max(0, Math.min(1, hpFrac))), 7);
  if (np.sprite.material.map) np.sprite.material.map.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// enemy manager
// ---------------------------------------------------------------------------
const MAX_ENEMIES = 38;

export function createEnemyManager(terrain, decorBlocked, scene, particles, projectiles, hooks) {
  const enemies = [];
  // hooks: { onPlayerHit(enemy, dmg), sfx(name) }

  // free every GPU resource a dead/despawned enemy owns (its nameplate canvas
  // texture is per-enemy, so that map goes too; face textures stay cached)
  function retire(e) {
    scene.remove(e.mesh);
    // hand the plate back to the pool instead of throwing its texture away —
    // only dispose it if the pool is already full
    if (!recycleNameplate(e.np)) e.np?.sprite?.material?.map?.dispose();
    // geometry is shared now, so only the per-enemy MATERIALS are ours to free
    disposeObject(e.mesh);
  }

  function levelFor(x, z) {
    const d = Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z);
    return 1 + Math.floor(d / 26);
  }

  function pickType(rng, nearWater, distFromSpawn, isNight, snowy) {
    if (snowy && rng() < 0.5) return 'frostling'; // the winter biome is theirs
    if (isNight && rng() < 0.24) return 'wisp';
    if (isNight && rng() < 0.24) return 'puffowl';
    if (nearWater && rng() < 0.4) return 'armorbug';
    let r = rng(), acc = 0;
    for (const [id, def] of Object.entries(ENEMY_TYPES)) {
      if (def.nightOnly || def.snowOnly) continue;
      if (def.minDist && distFromSpawn < def.minDist) continue;
      acc += def.weight;
      if (r <= acc) return id;
    }
    return 'slime';
  }

  function spawnOne(playerPos, isNight = false, forceKind = null) {
    for (let tries = 0; tries < 24; tries++) {
      const ang = Math.random() * Math.PI * 2;
      // a boss SUMMONING adds are the exception to "never right on top of you":
      // spawning its minions 17 units away would defeat the point of the move
      const dist = forceKind ? 2.2 + Math.random() * 2.5 : 17 + Math.random() * 28;
      const x = playerPos.x + Math.cos(ang) * dist;
      const z = playerPos.z + Math.sin(ang) * dist;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      if (hooks.inSafeZone?.(x, z)) continue; // never spawn inside sanctuaries

      let nearWater = false;
      for (let dz = -2; dz <= 2 && !nearWater; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (terrain.isWaterCell(ix + dx, iz + dz)) { nearWater = true; break; }
        }
      }
      const distFromSpawn = Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z);
      const snowy = terrain.isSnowCell?.(ix, iz) || false;
      const type = forceKind && ENEMY_TYPES[forceKind]
        ? forceKind
        : pickType(Math.random, nearWater, distFromSpawn, isNight, snowy);
      const def = ENEMY_TYPES[type];
      if (h <= WATER_LEVEL && !def.water) continue;
      if (h <= WATER_LEVEL - 1) continue;

      // monsters grow with the hero: +1 tier for every 5 player levels, on
      // top of the distance-based tier — the wilds never fall behind you
      const heroBonus = Math.floor((hooks.getPlayerLevel?.() || 1) / 5);
      const level = Math.max(1, levelFor(x, z) + heroBonus + (def.boss ? 2 : 0));
      const mesh = BUILDERS[type]();
      attachVis(mesh);
      // ELITE variant: rarer, bigger, gilded aura ring — much tougher, pays more
      const elite = !def.boss && level >= 2 && Math.random() < 0.08;
      let hpMax = Math.round(def.hp * (1 + (level - 1) * 0.35));
      let dmg = Math.round(def.dmg * (1 + (level - 1) * 0.3));
      let xp = Math.round(def.xp * (1 + (level - 1) * 0.4));
      if (elite) {
        hpMax = Math.round(hpMax * 2.6); dmg = Math.round(dmg * 1.5); xp = Math.round(xp * 2.5);
        mesh.scale.setScalar(1.32);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 18),
          new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.1;
        mesh.add(ring);
        mesh.userData.eliteRing = ring;
      }
      const np = makeNameplate(elite ? `★ ${def.name}` : def.name, level, def.boss || elite);
      np.sprite.position.y = type === 'treant' ? 2.1 : (type === 'golem' ? 2.4 : 1.15);
      np.sprite.visible = false;
      mesh.add(np.sprite);
      mesh.position.set(x, terrain.surfaceY(x, z), z);
      scene.add(mesh);

      enemies.push({
        type, def, level, mesh, np, elite,
        hp: hpMax, hpMax,
        dmg, xp,
        state: 'wander', wanderT: 0, dir: Math.random() * Math.PI * 2,
        attackCd: 0, hurtFlash: 0, anim: Math.random() * 10,
        swing: 0, swingPending: false, recoil: 0,
        knock: new THREE.Vector2(0, 0),
        stunT: 0, frozenT: 0,
        chargeT: 0, windupT: 0, chargeDir: new THREE.Vector2(), chargeHit: false, // boarling
        dead: false,
      });
      return;
    }
  }

  /**
   * PUT ONE EXACTLY HERE, at exactly this level.
   *
   * `spawnOne` is the OVERWORLD's spawner and every line of it is about the
   * overworld: it picks a random ring 17-45 units out, rejects water, rejects
   * blocked decor cells, and derives a level from how far the spot is from the
   * village. None of that means anything in a sealed hall seventeen units
   * across, five hundred units above the map — and the decor-blocked test in
   * particular would have consulted cell 0,0 for every dungeon spawn, because
   * the terrain override answers `cellOf` with a constant.
   *
   * A dungeon floor is a composed encounter, not a wilderness: the plan says
   * what stands where and at what level, so this places it and asks nothing.
   *
   * @param opts.boss   a WORLD_BOSSES id, which brings its scale, phases and title
   * @param opts.hpMult / dmgMult / xpMult  the difficulty multipliers
   */
  function spawnAt(type, x, y, z, level, opts = {}) {
    const boss = opts.boss ? WORLD_BOSSES[opts.boss] : null;
    const def = boss
      ? { ...ENEMY_TYPES[boss.base], ...boss, boss: true }
      : ENEMY_TYPES[type];
    if (!def) return null;
    const meshType = boss ? boss.base : type;
    const mesh = BUILDERS[meshType]?.();
    if (!mesh) return null;
    attachVis(mesh);

    // THE CALLER'S MULTIPLIER IS THE WHOLE MULTIPLIER.
    //
    // Deliberately NOT the overworld's `1 + (level-1) * 0.3` on top: that curve
    // is tuned for the levels the wilds actually produce, roughly 1 to 10, and
    // a dungeon floor hands out 24 to 58. Applying both turned Easy floor 3
    // into something that killed a Lv25 hero in eight seconds. The floor plan
    // owns its own difficulty; `level` here is a label for the nameplate.
    let hpMax = Math.round((boss ? boss.hp : def.hp) * (opts.hpMult ?? 1));
    let dmg = Math.round((boss ? boss.dmg : def.dmg) * (opts.dmgMult ?? 1));
    let xp = Math.round((boss ? boss.xp : def.xp) * (opts.xpMult ?? 1));

    if (boss) {
      mesh.scale.setScalar(boss.scale || 2);
    } else if (opts.elite) {
      hpMax = Math.round(hpMax * 2.6); dmg = Math.round(dmg * 1.5); xp = Math.round(xp * 2.5);
      mesh.scale.setScalar(1.32);
    }

    const label = boss ? boss.name : (opts.elite ? `★ ${def.name}` : def.name);
    const np = makeNameplate(label, level, !!boss || !!opts.elite);
    np.sprite.position.y = (boss ? 1.4 * (boss.scale || 2) : 1.15);
    np.sprite.visible = !!boss;                 // a boss announces itself
    mesh.add(np.sprite);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const e = {
      type: meshType, def, level, mesh, np, elite: !!opts.elite,
      hp: hpMax, hpMax, dmg, xp,
      state: 'aggro',                            // nothing in the Hollow wanders
      wanderT: 0, dir: Math.random() * Math.PI * 2,
      attackCd: 0, hurtFlash: 0, anim: Math.random() * 10,
        swing: 0, swingPending: false, recoil: 0,
      knock: new THREE.Vector2(0, 0),
      stunT: 0, frozenT: 0,
      chargeT: 0, windupT: 0, chargeDir: new THREE.Vector2(), chargeHit: false,
      dead: false,
      dungeon: true,                             // so the run can count its own
      bossId: opts.boss || null,
      phases: boss?.phases || null, phaseT: 0, phaseI: 0,
    };
    enemies.push(e);
    return e;
  }

  /** Clear the floor: used when leaving a run, or moving to the next hall. */
  function clearDungeonFoes() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].dungeon) { retire(enemies[i]); enemies.splice(i, 1); }
    }
  }

  // spawn a world boss at a random spot 20-32 away from the player — and
  // always well clear of the village, so it never lumbers at the basecamp
  function spawnWorldBoss(playerPos, kindId) {
    const kind = WORLD_BOSSES[kindId];
    if (!kind) return null;
    for (let tries = 0; tries < 40; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 12;
      const x = playerPos.x + Math.cos(ang) * dist;
      const z = playerPos.z + Math.sin(ang) * dist;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      if (terrain.heightCell(ix, iz) <= WATER_LEVEL) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      if (hooks.inSafeZone?.(x, z)) continue;
      if (Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z) < 26) continue;

      const mesh = BUILDERS[kind.base]();
      mesh.scale.setScalar(kind.scale);
      if (kind.crown) { // gold crown for the King Slime
        const gold = new THREE.MeshLambertMaterial({ color: new THREE.Color('#e8c24a') });
        const band = new THREE.Mesh(sharedBox(0.42, 0.09, 0.4), gold);
        band.position.y = 0.66;
        mesh.add(band);
        for (let k = 0; k < 4; k++) {
          const spike = new THREE.Mesh(sharedBox(0.07, 0.12, 0.07), gold);
          spike.position.set(-0.14 + k * 0.095, 0.75, 0.14);
          mesh.add(spike);
        }
      }
      attachVis(mesh);          // after the crown, before the nameplate
      const np = makeNameplate(kind.name, '★', true);
      np.sprite.position.y = 2.6 / kind.scale + 0.6;
      np.sprite.scale.multiplyScalar(1 / kind.scale);
      np.sprite.visible = true;
      mesh.add(np.sprite);
      mesh.position.set(x, terrain.surfaceY(x, z), z);
      scene.add(mesh);

      const boss = {
        type: kind.base, def: { ...ENEMY_TYPES[kind.base], ...kind, behavior: 'melee', boss: true },
        level: '★', mesh, np,
        hp: kind.hp, hpMax: kind.hp,
        dmg: kind.dmg, xp: kind.xp,
        state: 'aggro', wanderT: 0, dir: 0,
        attackCd: 1, hurtFlash: 0, anim: 0,
        swing: 0, swingPending: false, recoil: 0,
        knock: new THREE.Vector2(0, 0),
        stunT: 0, frozenT: 0,
        chargeT: 0, windupT: 0, chargeDir: new THREE.Vector2(), chargeHit: false,
        dead: false,
        isWorldBoss: true, bossKind: kindId, bossName: kind.name, bossT: BOSS_LIFETIME,
      };
      enemies.push(boss);
      return boss;
    }
    return null;
  }

  function damage(e, amount, fromPos, onKill) {
    if (e.dead) return;
    e.hp -= amount;
    e.hurtFlash = 0.15;
    if (e.state === 'wander') e.state = 'aggro';
    redrawNameplate(e.np, Math.max(0, e.hp / e.hpMax));
    e.np.sprite.visible = true;
    const dx = e.mesh.position.x - fromPos.x, dz = e.mesh.position.z - fromPos.z;
    const l = Math.hypot(dx, dz) || 1;
    const kn = e.def.boss ? 1.5 : 6;
    e.knock.set((dx / l) * kn, (dz / l) * kn);
    hooks?.sfx?.(e.type === 'slime' ? 'hit_squish' : 'hit');
    particles.burst(e.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      e.type === 'slime' ? '#6de0a0' : '#d1372c', 8, 2.2);
    if (e.hp <= 0) {
      e.dead = true;
      hooks?.sfx?.('death_' + (e.type === 'slime' ? 'squish' : e.type === 'nibbit' || e.type === 'wisp' ? 'chirp' : 'thud'));
      particles.burst(e.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
        e.type === 'slime' ? '#6de0a0' : e.type === 'wisp' ? '#9adcf0' : '#a08a6a', 18, 3.2);
      particles.shockwave?.(e.mesh.position, e.def.boss ? '#f0a848' : '#ffffff', e.def.boss ? 4 : 1.6, 0.35);
      const drops = rollDrops(e.type);
      if (e.elite) { // elites pay out a bonus haul
        drops.push({ id: 'forge_stone', count: 2 + Math.floor(Math.random() * 2) });
        if (Math.random() < 0.5) drops.push({ id: 'tonic', count: 1 });
      }
      onKill(e, drops);
      retire(e);
    }
  }

  /**
   * HOW FAR A MONSTER WILL NOTICE YOU FROM.
   *
   * Anavela's ranges are deliberately short — walking across the map should not
   * drag a train of monsters behind you. That reasoning is right for an open
   * world and WRONG for a sealed room you have to empty to move on, and it is
   * what "the monsters are hiding" actually was.
   *
   * Measured on floor 22: seven foes spread up to 25.9 units from the hero, all
   * of them inside the room and standing on the floor — nothing clipped, nothing
   * stuck. But dungeon aggro is 6 to 9, the camera looks down from fourteen
   * units so anything past ~20 is off screen, and the minimap is hidden
   * underground on purpose. So the banner says three are left, three monsters
   * wander their own corner in the dark forever, and the player walks laps.
   *
   * `e.aggroBoost` is set by the Hollow (see hollowTick): the fewer are left and
   * the longer the floor drags, the further they hunt. Early on a floor still
   * plays like a fight you walk into; the stragglers come to you.
   */
  function aggroOf(e) {
    return e.def.aggro * (e.aggroBoost || 1);
  }

  function update(dt, playerState, time, isNight) {
    const playerPos = playerState.pos;
    const aliveCount = enemies.filter((e) => !e.dead).length;
    // THE WILDS DO NOT FOLLOW YOU UNDERGROUND.
    //
    // This spawner places a monster around the player and seats it with
    // `terrain.surfaceY`. Inside the Hollow that method is overridden to answer
    // the hall floor, so the ambient roll went on running and quietly filled the
    // dungeon with Anavela's own Slimes and Boarlings — measured at 641 stray
    // meshes in one room, which is what buried the hall under a brown carpet and
    // made a composed encounter into a pile. A dungeon floor is exactly the set
    // of monsters its plan asked for, so ambient spawning stops at the door.
    if (aliveCount < MAX_ENEMIES && !hooks.ambientPaused?.() && Math.random() < dt * 2.5) {
      spawnOne(playerPos, isNight);
    }

    for (const e of enemies) {
      if (e.dead) continue;
      const p = e.mesh.position;
      const distP = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);

      if (e.isWorldBoss) {
        e.bossT -= dt;
        if (e.bossT <= 0) { // lumbers back into the wilds
          particles.burst(p.clone().add(new THREE.Vector3(0, 0.8, 0)), '#8a8a8a', 20, 3);
          e.dead = true; e.expired = true; retire(e); continue;
        }
        // PHASE SCRIPT. Which pattern a boss is using depends on how hurt it is,
        // so a fight escalates instead of repeating one attack for two minutes.
        // Every cast is TELEGRAPHED: a ring goes down, then after `tell` seconds
        // the move lands — that gap is the whole difference between a boss you
        // dodge and a boss you stand in front of and trade with.
        const ph = e.def.phases;
        if (ph && e.state === 'aggro' && distP < 22) {
          const frac = e.hp / e.hpMax;
          // the LAST phase whose threshold we are under
          let cur = ph[0];
          for (const q of ph) if (frac <= q.at) cur = q;
          if (e.castT > 0) {
            e.castT -= dt;
            if (e.castT <= 0) {
              // the move lands
              hooks.onBossCast?.(e, e.castMove, 'fire');
              e.castMove = null;
            }
          } else {
            e.phaseT = (e.phaseT || cur.every) - dt;
            if (e.phaseT <= 0) {
              e.phaseT = cur.every;
              e.castT = cur.tell;
              e.castMove = cur;
              hooks.onBossCast?.(e, cur, 'tell');
            }
          }
        }
      } else if (distP > 60 || (e.def.nightOnly && !isNight)) {
        if (e.def.nightOnly && !isNight) {
          particles.burst(p.clone().add(new THREE.Vector3(0, 0.5, 0)), '#9adcf0', 10, 2);
        }
        e.dead = true; retire(e); continue;
      }

      e.anim += dt;
      e.attackCd -= dt;
      if (e.recoil > 0) e.recoil -= dt;

      // sanctuaries (village / camps / player homes): regular monsters can
      // NEVER be inside the safe radius. They retreat, and if they somehow end
      // up within it (knockback, chasing the player in) they're hard-clamped to
      // just outside the boundary — basecamp is truly monster-free.
      // EVERY monster respects sanctuaries — world bosses included. The
      // basecamp, camps and homes are truly safe; bosses stalk the boundary
      // instead of barging in.
      const zone = hooks.inSafeZone?.(p.x, p.z);
      if (zone) {
        const dx = p.x - zone.x, dz = p.z - zone.z;
        let l = Math.hypot(dx, dz);
        // dead-center degenerate case: pick a stable outward heading
        let nx, nz;
        if (l < 0.01) { nx = Math.sin(e.dir || 0); nz = Math.cos(e.dir || 0); l = 0.01; }
        else { nx = dx / l; nz = dz / l; }
        e.state = 'wander';
        e.dir = Math.atan2(nx, nz);
        e.mesh.rotation.y = e.dir;
        e.knock.set(0, 0); // cancel any inward knockback
        moveEnemy(e, nx * e.def.speed * 2.2, nz * e.def.speed * 2.2, dt);
        if (Math.hypot(p.x - zone.x, p.z - zone.z) < zone.r) {
          p.x = zone.x + nx * (zone.r + 0.5);
          p.z = zone.z + nz * (zone.r + 0.5);
          p.y = terrain.surfaceY(p.x, p.z);
        }
        continue;
      }

      // the player is BUSY (fishing, chatting) OR standing inside a sanctuary
      // — cozy rule: nothing hunts you. Everyone loses interest, so monsters
      // never pile up bumping against the safe-zone boundary either.
      // A SWIMMER IS UNREACHABLE. Land monsters cannot follow into the water, so
      // a pack that stays aggro'd on someone out of their depth just lines up on
      // the beach and shoots — which is exactly the "monsters attack me in the
      // water" complaint. Being off your feet drops aggro the same way a
      // sanctuary does.
      const playerSafe = hooks.inSafeZone?.(playerPos.x, playerPos.z)
        || (playerState.swimming && !e.def.water && !e.def.floats);
      if ((playerState.busy || playerSafe) && e.state === 'aggro') {
        e.state = 'wander';
        e.wanderT = 2 + Math.random() * 2;
        // Wander AWAY from whatever made them lose interest, rather than hugging
        // its wall. The point to walk away from is the SANCTUARY when there is
        // one and the player otherwise — `playerSafe` is an object for a zone
        // but a bare `true` for an unreachable swimmer, and reading `.x` off the
        // boolean produced NaN, which went straight into `e.dir`, through sin()
        // into moveEnemy, and left the monster at a NaN position it could never
        // return from: invisible, un-killable and updated forever. Swimming past
        // a pack quietly destroyed all of it.
        const away = playerSafe && typeof playerSafe === 'object' ? playerSafe : playerPos;
        e.dir = Math.atan2(p.x - away.x, p.z - away.z);
        if (!Number.isFinite(e.dir)) e.dir = Math.random() * Math.PI * 2;
        e.np.sprite.visible = e.hp < e.hpMax;
      }

      // stun / freeze halts the AI
      if (e.stunT > 0 || e.frozenT > 0) {
        e.stunT = Math.max(0, e.stunT - dt);
        e.frozenT = Math.max(0, e.frozenT - dt);
        const body = e.mesh.userData.body;
        if (body?.material?.emissive) {
          body.material.emissive.set(e.frozenT > 0 ? '#2a5a88' : (e.stunT > 0 ? '#665511' : '#000000'));
        }
        applyKnock(e, dt);
        continue;
      } else {
        const body = e.mesh.userData.body;
        if (body?.material?.emissive && e.hurtFlash <= 0) body.material.emissive.set('#000000');
      }

      // NOBODY SWINGS AT SOMEONE WHO CANNOT SWING BACK.
      //
      // Disengaging on `e.state === 'aggro'` was not enough on its own: it fixes
      // whoever is currently chasing you, but it depends on the state machine
      // never reaching an attack by any other route, and a monster that took a
      // hit re-aggros through `damage()` regardless. Fishing has no defence —
      // you cannot roll, block or move — so the guard belongs on the ATTACK, at
      // the point where damage would actually be dealt. Ranged species were the
      // loudest offenders because they never had to close the distance first.
      e.peaceful = !!(playerState.busy || playerSafe);

      // --- AI per behavior ---
      if (e.state === 'wander') {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = 1.5 + Math.random() * 3; e.dir = Math.random() * Math.PI * 2; }
        if (distP < aggroOf(e) && !playerState.busy && !playerSafe
          && !hooks.inSafeZone?.(playerPos.x, playerPos.z)) e.state = 'aggro';
        // FACE THE WAY YOU WALK. Wander never set the rotation, so a monster
        // kept whatever heading it last had while drifting off in a new one —
        // that is the sideways shuffle.
        e.mesh.rotation.y += (() => {
          let d = e.dir - e.mesh.rotation.y;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          return d * Math.min(1, dt * 6);      // turn smoothly, don't snap
        })();
        moveEnemy(e, Math.sin(e.dir) * e.def.speed * 0.5, Math.cos(e.dir) * e.def.speed * 0.5, dt);
      } else if (e.def.behavior === 'ranged') {
        rangedAI(e, playerState, distP, dt);
      } else if (e.def.behavior === 'charge') {
        chargeAI(e, playerState, distP, dt);
      } else {
        meleeAI(e, playerState, distP, dt);
      }

      applyKnock(e, dt);

      // THE SWING LANDS AT THE END OF ITS OWN ANIMATION, not at the start.
      // Resolved here rather than inside meleeAI because a player who backs off
      // mid-swing drops the creature out of that branch entirely, and a pending
      // blow that nothing ever resolves would leave it frozen mid-rear forever.
      if (e.swing > 0) {
        e.swing -= dt;
        if (e.swing <= 0) {
          // a small forgiveness margin: stepping back during the wind-up should
          // beat it, but not by a hair's breadth on one frame's worth of movement
          if (e.swingPending && !e.peaceful && e.stunT <= 0
              && distP < e.def.attackRange * 1.25) {
            hooks.onPlayerHit(e, e.dmg);
          }
          e.swingPending = false;
        }
      }

      // ================= ANIMATION =================
      // Two layers. The GAIT applies to every species and is driven by what the
      // creature is actually doing; the per-species block after it adds the one
      // flourish that makes that species itself.
      //
      // Only 9 of 20 species had any animation at all, and none of it read the
      // creature's state: a monster charging you was posed identically to one
      // asleep in a field, because every pose ran off `e.anim`, which is just a
      // clock. That is what "stiff" was.
      const vis = e.mesh.userData.vis;
      if (vis) {
        // SPEED FROM DISTANCE MOVED, not from a state flag. It costs two
        // subtractions, it is automatically right for every species and every
        // behaviour, and it stays right for ones added later -- the same reason
        // remote players derive their walk from movement rather than from
        // anything sent over the wire.
        const mx = p.x - (e.px ?? p.x), mz = p.z - (e.pz ?? p.z);
        e.px = p.x; e.pz = p.z;
        const step = Math.hypot(mx, mz);
        const inst = dt > 0 ? step / dt : 0;
        // smoothed, or one blocked frame reads as a dead stop mid-stride
        e.spd = (e.spd ?? 0) + (inst - (e.spd ?? 0)) * Math.min(1, dt * 9);
        const run = Math.min(1, e.spd / (e.def.speed || 2));

        // THE PHASE ADVANCES WITH DISTANCE, NOT WITH TIME. Tie it to the clock
        // and the feet skate whenever the creature is slowed, knocked back or
        // walking uphill; tie it to the ground and the bounce matches the
        // stride at any speed, for free.
        e.gait = (e.gait ?? Math.random() * 6.28) + step * 4.2;

        const g = e.gait;
        // a hop, a lean into the run, and a roll -- what a small four-legged
        // thing does. All scaled by `run`, so standing still is genuinely still
        // rather than jogging on the spot.
        vis.position.y = Math.abs(Math.sin(g)) * 0.085 * run;
        vis.rotation.x = -0.13 * run;
        vis.rotation.z = Math.sin(g) * 0.085 * run;
        // ...and when it is NOT moving it breathes, so idle is not a statue.
        const br = 1 + Math.sin(e.anim * 1.9) * 0.038 * (1 - run);
        const w = 1 / Math.sqrt(br);
        vis.scale.set(w, br, w);

        // THE TELL. A melee blow used to be dealt on the same frame it was
        // decided, with nothing on screen before it -- unreadable, and the main
        // reason fights felt like walking into an invisible wall. `e.swing`
        // rears the creature back and drops it through the blow; the damage is
        // resolved at the bottom of that arc, in the block below.
        if (e.swing > 0) {
          const k = 1 - e.swing / SWING_TIME;          // 0 -> 1 across the swing
          // ease back slowly, snap forward: that asymmetry is the weight
          const lean = k < 0.55 ? -(k / 0.55) * 0.42 : ((k - 0.55) / 0.45) * 0.5 - 0.42;
          vis.rotation.x += lean;
          vis.position.y += Math.sin(k * Math.PI) * 0.06;
        }
        // and a RECOIL when hit -- a colour flash alone never reads as impact
        if (e.recoil > 0) {
          const k = e.recoil / RECOIL_TIME;
          vis.rotation.x += k * 0.34;
          const sq = 1 - k * 0.16;
          vis.scale.set(vis.scale.x / sq, vis.scale.y * sq, vis.scale.z / sq);
        }
      }

      // --- per-species flourish ---
      const V = vis || e.mesh;
      if (e.type === 'slime') {
        // a slime has no legs, so the gait bob is wrong for it: it PULSES
        const sq = 1 + Math.sin(e.anim * 6) * (0.09 + 0.06 * Math.min(1, e.spd || 0));
        const w = 1 / Math.sqrt(sq);
        V.scale.set(w, sq, w);
        V.position.y = Math.max(0, Math.sin(e.anim * 6)) * 0.05;
      } else if (e.type === 'nibbit') {
        if (e.mesh.userData.wings) {
          const flap = Math.max(0, Math.sin(e.anim * 9)) * 0.7;
          e.mesh.userData.wings[0].rotation.z = flap;
          e.mesh.userData.wings[1].rotation.z = -flap;
        }
      } else if (e.type === 'wisp') {
        // floaters own their own height: the root is theirs, the pivot is not
        e.mesh.position.y = terrain.surfaceY(p.x, p.z) + 0.7 + Math.sin(e.anim * 2.3) * 0.22;
        V.position.y = 0; V.rotation.z = Math.sin(e.anim * 1.3) * 0.12;
        if (e.mesh.userData.spinning) e.mesh.userData.spinning.rotation.y += dt * 1.8;
      } else if (e.type === 'treant' || e.type === 'golem') {
        // big things swing their arms with the STRIDE, not with a clock
        const sw = Math.sin(e.gait ?? 0) * 0.34 * Math.min(1, 0.35 + (e.spd || 0));
        if (e.mesh.userData.armL) {
          e.mesh.userData.armL.rotation.x = sw;
          e.mesh.userData.armR.rotation.x = -sw;
        }
      } else if (e.type === 'boarling' && e.chargeT > 0) {
        // a charge is a flat-out gallop: low, fast, head down
        V.position.y += Math.abs(Math.sin(e.anim * 22)) * 0.05;
        V.rotation.x -= 0.2;
      } else if (e.type === 'sparkit') {
        V.position.y += Math.max(0, Math.sin(e.anim * 13)) * 0.05;
        if (e.mesh.userData.tail) e.mesh.userData.tail.rotation.y = Math.sin(e.anim * 18) * 0.4;
      } else if (e.type === 'puffowl') {
        e.mesh.position.y = terrain.surfaceY(p.x, p.z) + 0.55 + Math.sin(e.anim * 2.0) * 0.18;
        V.position.y = 0;
        if (e.mesh.userData.wings) {
          const flap = Math.sin(e.anim * 7) * 0.55;
          e.mesh.userData.wings[0].rotation.z = flap;
          e.mesh.userData.wings[1].rotation.z = -flap;
        }
      }
      if (e.type === 'embercub' && e.mesh.userData.flame) {
        e.mesh.userData.flame.scale.setScalar(1 + Math.sin(e.anim * 7) * 0.25);
      }
      // elite aura ring slowly spins & pulses
      if (e.mesh.userData.eliteRing) {
        e.mesh.userData.eliteRing.rotation.z += dt * 1.4;
        e.mesh.userData.eliteRing.material.opacity = 0.55 + Math.sin(e.anim * 3) * 0.2;
      }
      if (e.hurtFlash > 0) {
        e.hurtFlash -= dt;
        const body = e.mesh.userData.body;
        if (body?.material?.emissive) body.material.emissive.set(e.hurtFlash > 0 ? '#802020' : '#000000');
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].dead) enemies.splice(i, 1);
    }
  }

  function meleeAI(e, playerState, distP, dt) {
    const p = e.mesh.position;
    const playerPos = playerState.pos;
    if (distP > aggroOf(e) * 2.6) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    if (distP > e.def.attackRange * 0.85) {
      moveEnemy(e, (dx / l) * e.def.speed, (dz / l) * e.def.speed, dt);
    }
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP < e.def.attackRange && e.attackCd <= 0 && !e.peaceful && e.swing <= 0) {
      // decide now, LAND later -- see the resolve block in update()
      e.attackCd = e.def.attackCd;
      e.swing = SWING_TIME;
      e.swingPending = true;
    }
    e.np.sprite.visible = true;
  }

  function rangedAI(e, playerState, distP, dt) {
    const p = e.mesh.position;
    const playerPos = playerState.pos;
    if (distP > aggroOf(e) * 2.2) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    // keep distance
    if (distP < e.def.keepDist - 1) moveEnemy(e, (-dx / l) * e.def.speed, (-dz / l) * e.def.speed, dt);
    else if (distP > e.def.keepDist + 2) moveEnemy(e, (dx / l) * e.def.speed, (dz / l) * e.def.speed, dt);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP < e.def.attackRange && e.attackCd <= 0 && !e.peaceful) {
      e.attackCd = e.def.attackCd;
      const from = p.clone().add(new THREE.Vector3(0, e.type === 'wisp' ? 0.5 : 0.6, 0));
      const target = playerPos.clone().add(new THREE.Vector3(0, 0.6, 0));
      const dir = target.sub(from).normalize();
      hooks.sfx?.(e.type === 'wisp' ? 'wisp_shot' : e.type === 'frostling' ? 'icenova' : 'spit');
      projectiles.spawn({
        pos: from, dir, speed: e.type === 'wisp' ? 9 : 7.5, range: e.def.attackRange + 3, radius: 0.35,
        kind: e.type === 'wisp' || e.type === 'frostling' ? 'orb' : 'arrow',
        color: e.type === 'wisp' ? '#9adcf0' : e.type === 'frostling' ? '#dff4ff' : '#e090ac',
        scale: e.type === 'wisp' ? 0.8 : e.type === 'frostling' ? 0.7 : 1.2,
        fromEnemy: true,
        onHitPlayer: () => hooks.onPlayerHit(e, e.dmg),
      });
    }
    e.np.sprite.visible = true;
  }

  function chargeAI(e, playerState, distP, dt) {
    const p = e.mesh.position;
    const playerPos = playerState.pos;
    if (e.chargeT > 0) {
      // mid-charge
      e.chargeT -= dt;
      moveEnemy(e, e.chargeDir.x * 7.5, e.chargeDir.y * 7.5, dt);
      if (!e.chargeHit && distP < 1.1 && !e.peaceful) {
        e.chargeHit = true;
        hooks.onPlayerHit(e, Math.round(e.dmg * 1.4));
      }
      return;
    }
    if (e.windupT > 0) {
      e.windupT -= dt;
      e.mesh.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
      e.mesh.position.x += (Math.random() - 0.5) * 0.02; // shiver
      if (e.windupT <= 0) {
        const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
        const l = Math.hypot(dx, dz) || 1;
        e.chargeDir.set(dx / l, dz / l);
        e.chargeT = 0.8;
        e.chargeHit = false;
        hooks.sfx?.('boar_charge');
      }
      return;
    }
    if (distP > aggroOf(e) * 2.4) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP > 2.2 && distP < 7 && e.attackCd <= 0 && !e.peaceful) {
      e.attackCd = e.def.attackCd + 1.6;
      e.windupT = 0.55;
    } else if (distP < e.def.attackRange && e.attackCd <= 0 && !e.peaceful) {
      e.attackCd = e.def.attackCd;
      hooks.onPlayerHit(e, e.dmg);
    } else if (distP >= e.def.attackRange * 0.85) {
      moveEnemy(e, (dx / l) * e.def.speed, (dz / l) * e.def.speed, dt);
    }
    e.np.sprite.visible = true;
  }

  function applyKnock(e, dt) {
    if (e.knock.lengthSq() > 0.01) {
      moveEnemy(e, e.knock.x, e.knock.y, dt);
      e.knock.multiplyScalar(Math.max(0, 1 - dt * 8));
    }
  }

  /**
   * Give a monster a pivot to be posed on.
   *
   * `moveEnemy` writes the ROOT's y directly to follow the ground, and the old
   * animation did `mesh.position.y += hop` on that very value -- so each frame's
   * hop was folded into the height the ground-follow then eased away from, and
   * the two quietly fought each other all the way down a hill. Worse, the
   * slime's squash was applied to the root, which scaled its nameplate and its
   * elite aura ring along with it.
   *
   * Everything that poses a creature now writes to `vis`; the root is left to
   * the ground, the facing and the nameplate, which are the three things that
   * must NOT bounce.
   */
  // How long a melee creature rears back before its blow lands. Short on
  // purpose: long enough to read and to step out of, short enough that it
  // barely moves the difficulty.
  const SWING_TIME = 0.26;
  const RECOIL_TIME = 0.18;

  function attachVis(mesh) {
    const vis = new THREE.Group();
    for (const c of [...mesh.children]) vis.add(c);
    mesh.add(vis);
    mesh.userData.vis = vis;
    return vis;
  }

  function moveEnemy(e, vx, vz, dt) {
    const p = e.mesh.position;
    const nx = p.x + vx * dt, nz = p.z + vz * dt;
    const [ix, iz] = terrain.cellOf(nx, nz);
    if (!terrain.inBounds(ix, iz) || decorBlocked.has(`${ix},${iz}`)) { e.dir += 1.7; e.chargeT = 0; return; }
    // THE REAL WATERLINE, not a corner sample. heightCell is the height stored
    // at the grid cell, but the shoreline band interpolates between a land
    // corner and a water one — so a point that is genuinely under water can sit
    // in a cell whose stored height is above WATER_LEVEL, and a land monster
    // could wade straight out into the sea through that gap. swimmable() is the
    // same test the player's own movement uses.
    if (!e.def.water && !e.def.floats
        && (terrain.swimmable?.(nx, nz) || terrain.heightCell(ix, iz) <= WATER_LEVEL)) {
      e.dir += 1.7; e.chargeT = 0; return;
    }
    const ny = terrain.surfaceY(nx, nz);
    if (ny - p.y > BLOCK_H * 1.6) { e.dir += 1.7; e.chargeT = 0; return; }
    p.x = nx; p.z = nz;
    if (!e.def.floats) p.y += (ny - p.y) * Math.min(1, dt * 10);
  }

  /**
   * BUILD ONE OF EVERYTHING, ONCE, WHILE THE LOADING SCREEN IS STILL UP.
   *
   * The load screen already compiles what is IN the scene when the world
   * finishes building — which is the terrain, the village and the trees, and
   * none of the things that actually arrive later. A monster is the first new
   * material the renderer has seen since boot, so the frame it first walks into
   * view pays for a shader compile and a pile of GPU uploads, and that is the
   * hitch people feel a minute into playing. Same for the world bosses, which
   * show up once every three minutes to a guaranteed stutter.
   *
   * So: build one of every species now, let the caller compile and render them,
   * then throw the meshes away. The GEOMETRY survives in the shared cache and
   * the compiled programs survive in the renderer, which is the entire point —
   * the second Slime costs nothing, and after this the first one does not
   * either. Nameplates go back to the pool, so the first spawn allocates
   * nothing at all.
   *
   * @returns a function that removes the decoys again.
   */
  function prewarm(at) {
    const made = [];
    const kinds = [...Object.keys(ENEMY_TYPES), ...Object.keys(WORLD_BOSSES)];
    for (const type of kinds) {
      let mesh;
      try { mesh = (BUILDERS[type] || BUILDERS[WORLD_BOSSES[type]?.base])?.(); } catch { mesh = null; }
      if (!mesh) continue;
      // in front of the camera but under the world, so it is inside the frustum
      // (which is what makes the renderer bother with it) and cannot be seen
      mesh.position.set(at.x, at.y - 400, at.z);
      const np = makeNameplate(ENEMY_TYPES[type]?.name || type, 1, false);
      mesh.add(np.sprite);
      scene.add(mesh);
      made.push({ mesh, np });
    }
    return () => {
      for (const { mesh, np } of made) {
        scene.remove(mesh);
        if (!recycleNameplate(np)) np?.sprite?.material?.map?.dispose();
        disposeObject(mesh);
      }
      made.length = 0;
    };
  }

  return { enemies, update, damage, spawnOne, spawnAt, clearDungeonFoes, spawnWorldBoss, prewarm };
}
