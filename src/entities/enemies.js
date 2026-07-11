// Semesta enemies — 8 species with distinct AI:
// melee (slime, nibbit, armorbug, treant, golem), ranged (fungling, wisp), charge (boarling).
// Visual direction: big glossy pixel eyes & rounded silhouettes — cute-critter
// (Pokemon/Pokopia) energy, not scary blocks.
import * as THREE from 'three';
import { WATER_LEVEL, BLOCK_H } from '../world/terrain.js';
import { makeCritterFaceTexture, toTexture } from '../gfx/textures.js';
import { rollDrops } from '../systems/items.js';

// Aggro ranges are deliberately modest — monsters shouldn't dogpile players
// who are just exploring; you mostly fight what you walk up to.
export const ENEMY_TYPES = {
  slime: {
    name: 'Slime', hp: 14, dmg: 4, speed: 1.5, xp: 8, aggro: 4.0, attackRange: 1.0,
    attackCd: 1.5, weight: 0.34, behavior: 'melee',
  },
  nibbit: {
    name: 'Nibbit', hp: 9, dmg: 3, speed: 2.7, xp: 7, aggro: 3.4, attackRange: 0.9,
    attackCd: 1.2, weight: 0.14, behavior: 'melee',
  },
  armorbug: {
    name: 'Armorbug', hp: 34, dmg: 8, speed: 1.0, xp: 18, aggro: 3.2, attackRange: 1.1,
    attackCd: 1.8, weight: 0.1, behavior: 'melee', water: true,
  },
  fungling: {
    name: 'Fungling', hp: 18, dmg: 6, speed: 1.2, xp: 14, aggro: 5.5, attackRange: 6.0,
    attackCd: 2.5, weight: 0.14, behavior: 'ranged', keepDist: 4.5,
  },
  boarling: {
    name: 'Boarling', hp: 26, dmg: 9, speed: 1.8, xp: 16, aggro: 5.0, attackRange: 1.2,
    attackCd: 1.6, weight: 0.13, behavior: 'charge',
  },
  wisp: {
    name: 'Wisp', hp: 15, dmg: 7, speed: 1.9, xp: 20, aggro: 6.0, attackRange: 6.5,
    attackCd: 2.1, weight: 0, behavior: 'ranged', keepDist: 5, nightOnly: true, floats: true,
  },
  treant: {
    name: 'Treant', hp: 65, dmg: 13, speed: 0.75, xp: 32, aggro: 4.0, attackRange: 1.4,
    attackCd: 2.1, weight: 0.08, behavior: 'melee',
  },
  golem: {
    name: 'Golem', hp: 160, dmg: 20, speed: 0.6, xp: 90, aggro: 5.0, attackRange: 1.7,
    attackCd: 2.6, weight: 0.03, behavior: 'melee', minDist: 38, boss: true,
  },
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.65),
    lam('#6de0a0', { transparent: true, opacity: 0.82 }));
  body.position.y = 0.28;
  body.castShadow = true;
  // rounded top blob
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.46),
    lam('#8aeab8', { transparent: true, opacity: 0.8 }));
  top.position.y = 0.6;
  const drip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12),
    lam('#8aeab8', { transparent: true, opacity: 0.9 }));
  drip.position.set(0.1, 0.72, 0);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28),
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.44), feathers);
  body.position.y = 0.32;
  body.castShadow = true;
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.08), featherLight);
  belly.position.set(0, 0.26, 0.2);
  // big head sitting right on the body
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.34), feathers);
  head.position.set(0, 0.6, 0.06);
  const face = facePlane('nibbit', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, mouth: 'none' }, 0.4, 0.3);
  face.position.set(0, 0.62, 0.24);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), lam('#f0a83d'));
  beak.position.set(0, 0.55, 0.3);
  // tuft feather on top
  const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.07), featherLight);
  tuft.position.set(0, 0.8, 0.02);
  tuft.rotation.z = 0.2;
  // wing nubs
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.28), featherLight);
  wingL.position.set(-0.25, 0.36, 0);
  const wingR = wingL.clone(); wingR.position.x = 0.25;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.06), lam('#e8a33d'));
  legs.position.y = 0.07;
  g.add(body, belly, head, face, beak, tuft, wingL, wingR, legs);
  g.userData.body = body;
  g.userData.wings = [wingL, wingR];
  return g;
}

function buildArmorbugMesh() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 1.0), lam('#5a8a8a'));
  shell.position.y = 0.34;
  shell.castShadow = true;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.7), lam('#78b0a8'));
  ridge.position.y = 0.58;
  // shell spots
  for (const [dx, dz] of [[-0.2, -0.2], [0.22, 0.1], [0, 0.32], [-0.15, 0.15]]) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.1), lam('#c8e0d8'));
    dot.position.set(dx, 0.56, dz);
    g.add(dot);
  }
  const headM = lam('#8a6a4a');
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.3), headM);
  head.position.set(0, 0.28, 0.6);
  const face = facePlane('armorbug', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile' }, 0.42, 0.3);
  face.position.set(0, 0.3, 0.76);
  const pincerL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), headM);
  pincerL.position.set(-0.16, 0.2, 0.8);
  const pincerR = pincerL.clone(); pincerR.position.x = 0.16;
  for (let i = 0; i < 3; i++) {
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.09), headM);
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
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.32), lam('#ead8b0'));
  stem.position.y = 0.24;
  stem.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.28, 0.74), lam('#c86a8a'));
  cap.position.y = 0.56;
  cap.castShadow = true;
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.46), lam('#e090ac'));
  capTop.position.y = 0.76;
  for (const [dx, dz] of [[-0.2, 0.2], [0.22, -0.1], [0, 0.28], [-0.24, -0.18]]) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.12),
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.8), fur);
  body.position.y = 0.4;
  body.castShadow = true;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.55), furDark);
  mane.position.set(0, 0.66, -0.05);
  // big cute head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.32), fur);
  head.position.set(0, 0.44, 0.5);
  const face = facePlane('boarling', { eyeW: 3, eyeH: 4, gap: 6, eyeY: 1, mouth: 'none', angry: true }, 0.46, 0.34);
  face.position.set(0, 0.5, 0.67);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.1), lam('#d89aa0'));
  snout.position.set(0, 0.36, 0.68);
  const nostrils = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), lam('#a86a70'));
  nostrils.position.set(0, 0.36, 0.74);
  // floppy ears
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), furDark);
  earL.position.set(-0.2, 0.66, 0.42); earL.rotation.z = 0.4;
  const earR = earL.clone(); earR.position.x = 0.2; earR.rotation.z = -0.4;
  const tuskL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xf0e8d0 }));
  tuskL.position.set(-0.14, 0.3, 0.64);
  const tuskR = tuskL.clone(); tuskR.position.x = 0.14;
  for (const [dx, dz] of [[-0.18, 0.26], [0.18, 0.26], [-0.18, -0.26], [0.18, -0.26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), furDark);
    leg.position.set(dx, 0.15, dz);
    g.add(leg);
  }
  // curly tail nub
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), furDark);
  tail.position.set(0, 0.5, -0.44);
  g.add(body, mane, head, face, snout, nostrils, earL, earR, tuskL, tuskR, tail);
  g.userData.body = body;
  return g;
}

function buildWispMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xd8f4ff }));
  core.position.y = 0.5;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44),
    lam('#7ab8d8', { transparent: true, opacity: 0.45 }));
  shell.position.y = 0.5;
  const face = facePlane('wisp', { eyeW: 2, eyeH: 4, gap: 4, eyeY: 3, eye: '#3a6a8a', mouth: 'none' }, 0.34, 0.26);
  face.position.set(0, 0.5, 0.24);
  // little flame wisps orbiting
  const flameL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1),
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
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.55), barkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.85), lam('#3e7d47'));
  crown.position.y = 1.4;
  crown.castShadow = true;
  const crownTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.55), lam('#4f9857'));
  crownTop.position.y = 1.68;
  const face = facePlane('treant', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, eye: '#d8e858', mouth: 'open', mouthColor: '#2a2018', angry: true }, 0.5, 0.4);
  face.position.set(0, 0.9, 0.29);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), barkMat);
  armL.position.set(-0.44, 0.75, 0);
  const armR = armL.clone(); armR.position.x = 0.44;
  // leafy hands
  const leafL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), lam('#4f9857'));
  leafL.position.set(-0.44, 0.36, 0);
  const leafR = leafL.clone(); leafR.position.x = 0.44;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), barkMat);
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
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.7), stone);
  torso.position.y = 1.0;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), stoneDark);
  head.position.y = 1.7;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xf0a848 }));
  core.position.set(0, 1.1, 0.36);
  const face = facePlane('golem', { eyeW: 4, eyeH: 3, gap: 3, eyeY: 3, eye: '#ffc860', mouth: 'none' }, 0.44, 0.32);
  face.position.set(0, 1.72, 0.24);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.34), stoneDark);
  armL.position.set(-0.78, 0.95, 0);
  armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.78;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.4), stoneDark);
  legL.position.set(-0.3, 0.28, 0);
  const legR = legL.clone(); legR.position.x = 0.3;
  const moss = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), lam('#568a42'));
  moss.position.set(0.1, 1.55, -0.1);
  g.add(torso, head, core, face, armL, armR, legL, legR, moss);
  g.userData.body = torso;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

const BUILDERS = {
  slime: buildSlimeMesh, nibbit: buildNibbitMesh, armorbug: buildArmorbugMesh,
  fungling: buildFunglingMesh, boarling: buildBoarlingMesh, wisp: buildWispMesh,
  treant: buildTreantMesh, golem: buildGolemMesh,
};

// --- world bosses: giant variants that appear on a timer ---
export const WORLD_BOSSES = {
  king_slime: {
    name: 'King Slime', base: 'slime', scale: 2.8,
    hp: 520, dmg: 22, xp: 420, speed: 1.2, attackRange: 2.2, attackCd: 1.8, aggro: 14,
    crown: true,
  },
  elder_treant: {
    name: 'Elder Treant', base: 'treant', scale: 2.0,
    hp: 650, dmg: 26, xp: 500, speed: 0.9, attackRange: 2.6, attackCd: 2.0, aggro: 14,
  },
  stone_colossus: {
    name: 'Stone Colossus', base: 'golem', scale: 1.7,
    hp: 800, dmg: 30, xp: 620, speed: 0.75, attackRange: 2.8, attackCd: 2.4, aggro: 14,
  },
};
const BOSS_LIFETIME = 150; // seconds before it wanders away

// ---------------------------------------------------------------------------
// nameplate (canvas sprite): name + level + HP bar
// ---------------------------------------------------------------------------
function makeNameplate(name, level, boss = false) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 36;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
  sprite.scale.set(boss ? 2.2 : 1.7, boss ? 0.62 : 0.48, 1);
  const state = { c, sprite, name, level, boss };
  redrawNameplate(state, 1);
  sprite.material.map = toTexture(c);
  return state;
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
  ctx.fillRect(14, 20, Math.max(0, Math.round(100 * hpFrac)), 7);
  if (np.sprite.material.map) np.sprite.material.map.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// enemy manager
// ---------------------------------------------------------------------------
const MAX_ENEMIES = 38;

export function createEnemyManager(terrain, decorBlocked, scene, particles, projectiles, hooks) {
  const enemies = [];
  // hooks: { onPlayerHit(enemy, dmg), sfx(name) }

  function levelFor(x, z) {
    const d = Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z);
    return 1 + Math.floor(d / 26);
  }

  function pickType(rng, nearWater, distFromSpawn, isNight) {
    if (isNight && rng() < 0.28) return 'wisp';
    if (nearWater && rng() < 0.4) return 'armorbug';
    let r = rng(), acc = 0;
    for (const [id, def] of Object.entries(ENEMY_TYPES)) {
      if (def.nightOnly) continue;
      if (def.minDist && distFromSpawn < def.minDist) continue;
      acc += def.weight;
      if (r <= acc) return id;
    }
    return 'slime';
  }

  function spawnOne(playerPos, isNight = false) {
    for (let tries = 0; tries < 24; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 17 + Math.random() * 28; // never right on top of the player
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
      const type = pickType(Math.random, nearWater, distFromSpawn, isNight);
      const def = ENEMY_TYPES[type];
      if (h <= WATER_LEVEL && !def.water) continue;
      if (h <= WATER_LEVEL - 1) continue;

      const level = Math.max(1, levelFor(x, z) + (def.boss ? 2 : 0));
      const mesh = BUILDERS[type]();
      const hpMax = Math.round(def.hp * (1 + (level - 1) * 0.35));
      const np = makeNameplate(def.name, level, def.boss);
      np.sprite.position.y = type === 'treant' ? 2.1 : (type === 'golem' ? 2.4 : 1.15);
      np.sprite.visible = false;
      mesh.add(np.sprite);
      mesh.position.set(x, terrain.surfaceY(x, z), z);
      scene.add(mesh);

      enemies.push({
        type, def, level, mesh, np,
        hp: hpMax, hpMax,
        dmg: Math.round(def.dmg * (1 + (level - 1) * 0.3)),
        xp: Math.round(def.xp * (1 + (level - 1) * 0.4)),
        state: 'wander', wanderT: 0, dir: Math.random() * Math.PI * 2,
        attackCd: 0, hurtFlash: 0, anim: Math.random() * 10,
        knock: new THREE.Vector2(0, 0),
        stunT: 0, frozenT: 0,
        chargeT: 0, windupT: 0, chargeDir: new THREE.Vector2(), chargeHit: false, // boarling
        dead: false,
      });
      return;
    }
  }

  // spawn a world boss at a random spot 20-32 away from the player
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

      const mesh = BUILDERS[kind.base]();
      mesh.scale.setScalar(kind.scale);
      if (kind.crown) { // gold crown for the King Slime
        const gold = new THREE.MeshLambertMaterial({ color: new THREE.Color('#e8c24a') });
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.4), gold);
        band.position.y = 0.66;
        mesh.add(band);
        for (let k = 0; k < 4; k++) {
          const spike = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.07), gold);
          spike.position.set(-0.14 + k * 0.095, 0.75, 0.14);
          mesh.add(spike);
        }
      }
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
      onKill(e, drops);
      scene.remove(e.mesh);
    }
  }

  function update(dt, playerState, time, isNight) {
    const playerPos = playerState.pos;
    const aliveCount = enemies.filter((e) => !e.dead).length;
    if (aliveCount < MAX_ENEMIES && Math.random() < dt * 2.5) {
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
          e.dead = true; e.expired = true; scene.remove(e.mesh); continue;
        }
      } else if (distP > 60 || (e.def.nightOnly && !isNight)) {
        if (e.def.nightOnly && !isNight) {
          particles.burst(p.clone().add(new THREE.Vector3(0, 0.5, 0)), '#9adcf0', 10, 2);
        }
        e.dead = true; scene.remove(e.mesh); continue;
      }

      e.anim += dt;
      e.attackCd -= dt;

      // sanctuaries (village / camps / player homes): monsters turn tail and
      // shuffle back out — no fighting inside the safe radius
      const zone = hooks.inSafeZone?.(p.x, p.z);
      if (zone && !e.isWorldBoss) {
        const dx = p.x - zone.x, dz = p.z - zone.z;
        const l = Math.hypot(dx, dz) || 1;
        e.state = 'wander';
        e.mesh.rotation.y = Math.atan2(dx, dz);
        moveEnemy(e, (dx / l) * e.def.speed * 1.7, (dz / l) * e.def.speed * 1.7, dt);
        applyKnock(e, dt);
        continue;
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

      // --- AI per behavior ---
      if (e.state === 'wander') {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = 1.5 + Math.random() * 3; e.dir = Math.random() * Math.PI * 2; }
        if (distP < e.def.aggro) e.state = 'aggro';
        moveEnemy(e, Math.cos(e.dir) * e.def.speed * 0.5, Math.sin(e.dir) * e.def.speed * 0.5, dt);
      } else if (e.def.behavior === 'ranged') {
        rangedAI(e, playerState, distP, dt);
      } else if (e.def.behavior === 'charge') {
        chargeAI(e, playerState, distP, dt);
      } else {
        meleeAI(e, playerState, distP, dt);
      }

      applyKnock(e, dt);

      // --- per-species animation ---
      if (e.type === 'slime') {
        const s = 1 + Math.sin(e.anim * 6) * 0.12;
        e.mesh.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      } else if (e.type === 'nibbit') {
        e.mesh.position.y += Math.max(0, Math.sin(e.anim * 9)) * 0.06;
        if (e.mesh.userData.wings) {
          const flap = Math.max(0, Math.sin(e.anim * 9)) * 0.7;
          e.mesh.userData.wings[0].rotation.z = flap;
          e.mesh.userData.wings[1].rotation.z = -flap;
        }
      } else if (e.type === 'wisp') {
        e.mesh.position.y = terrain.surfaceY(p.x, p.z) + 0.7 + Math.sin(e.anim * 2.3) * 0.22;
        if (e.mesh.userData.spinning) e.mesh.userData.spinning.rotation.y += dt * 1.8;
      } else if (e.type === 'treant' || e.type === 'golem') {
        const sw = Math.sin(e.anim * (e.type === 'golem' ? 1.4 : 2.2)) * 0.3;
        if (e.mesh.userData.armL) {
          e.mesh.userData.armL.rotation.x = sw;
          e.mesh.userData.armR.rotation.x = -sw;
        }
      } else if (e.type === 'boarling' && e.chargeT > 0) {
        e.mesh.position.y += Math.abs(Math.sin(e.anim * 22)) * 0.03;
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
    if (distP > e.def.aggro * 2.6) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    if (distP > e.def.attackRange * 0.85) {
      moveEnemy(e, (dx / l) * e.def.speed, (dz / l) * e.def.speed, dt);
    }
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP < e.def.attackRange && e.attackCd <= 0) {
      e.attackCd = e.def.attackCd;
      hooks.onPlayerHit(e, e.dmg);
    }
    e.np.sprite.visible = true;
  }

  function rangedAI(e, playerState, distP, dt) {
    const p = e.mesh.position;
    const playerPos = playerState.pos;
    if (distP > e.def.aggro * 2.2) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    // keep distance
    if (distP < e.def.keepDist - 1) moveEnemy(e, (-dx / l) * e.def.speed, (-dz / l) * e.def.speed, dt);
    else if (distP > e.def.keepDist + 2) moveEnemy(e, (dx / l) * e.def.speed, (dz / l) * e.def.speed, dt);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP < e.def.attackRange && e.attackCd <= 0) {
      e.attackCd = e.def.attackCd;
      const from = p.clone().add(new THREE.Vector3(0, e.type === 'wisp' ? 0.5 : 0.6, 0));
      const target = playerPos.clone().add(new THREE.Vector3(0, 0.6, 0));
      const dir = target.sub(from).normalize();
      hooks.sfx?.(e.type === 'wisp' ? 'wisp_shot' : 'spit');
      projectiles.spawn({
        pos: from, dir, speed: e.type === 'wisp' ? 9 : 7.5, range: e.def.attackRange + 3, radius: 0.35,
        kind: e.type === 'wisp' ? 'orb' : 'arrow',
        color: e.type === 'wisp' ? '#9adcf0' : '#e090ac',
        scale: e.type === 'wisp' ? 0.8 : 1.2,
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
      if (!e.chargeHit && distP < 1.1) {
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
    if (distP > e.def.aggro * 2.4) { e.state = 'wander'; e.np.sprite.visible = e.hp < e.hpMax; return; }
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (distP > 2.2 && distP < 7 && e.attackCd <= 0) {
      e.attackCd = e.def.attackCd + 1.6;
      e.windupT = 0.55;
    } else if (distP < e.def.attackRange && e.attackCd <= 0) {
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

  function moveEnemy(e, vx, vz, dt) {
    const p = e.mesh.position;
    const nx = p.x + vx * dt, nz = p.z + vz * dt;
    const [ix, iz] = terrain.cellOf(nx, nz);
    if (!terrain.inBounds(ix, iz) || decorBlocked.has(`${ix},${iz}`)) { e.dir += 1.7; e.chargeT = 0; return; }
    const h = terrain.heightCell(ix, iz);
    if (h <= WATER_LEVEL && !e.def.water && !e.def.floats) { e.dir += 1.7; e.chargeT = 0; return; }
    const ny = terrain.surfaceY(nx, nz);
    if (ny - p.y > BLOCK_H * 1.6) { e.dir += 1.7; e.chargeT = 0; return; }
    p.x = nx; p.z = nz;
    if (!e.def.floats) p.y += (ny - p.y) * Math.min(1, dt * 10);
  }

  return { enemies, update, damage, spawnOne, spawnWorldBoss };
}
