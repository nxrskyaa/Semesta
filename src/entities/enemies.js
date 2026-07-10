// Musuh Semesta — 8 jenis dengan AI berbeda:
// melee (slime, nibbit, armorbug, treant, golem), ranged (fungling, wisp), charge (boarling).
import * as THREE from 'three';
import { WATER_LEVEL, BLOCK_H } from '../world/terrain.js';
import { makeSlimeFaceTexture, toTexture } from '../gfx/textures.js';
import { rollDrops } from '../systems/items.js';

export const ENEMY_TYPES = {
  slime: {
    name: 'Slime', hp: 14, dmg: 4, speed: 1.5, xp: 8, aggro: 5.5, attackRange: 1.0,
    attackCd: 1.3, weight: 0.34, behavior: 'melee',
  },
  nibbit: {
    name: 'Nibbit', hp: 9, dmg: 3, speed: 2.7, xp: 7, aggro: 4.5, attackRange: 0.9,
    attackCd: 1.0, weight: 0.14, behavior: 'melee',
  },
  armorbug: {
    name: 'Armorbug', hp: 34, dmg: 8, speed: 1.0, xp: 18, aggro: 4.0, attackRange: 1.1,
    attackCd: 1.6, weight: 0.1, behavior: 'melee', water: true,
  },
  fungling: {
    name: 'Fungling', hp: 18, dmg: 6, speed: 1.2, xp: 14, aggro: 7.5, attackRange: 6.5,
    attackCd: 2.2, weight: 0.14, behavior: 'ranged', keepDist: 4.5,
  },
  boarling: {
    name: 'Boarling', hp: 26, dmg: 9, speed: 1.8, xp: 16, aggro: 6.5, attackRange: 1.2,
    attackCd: 1.4, weight: 0.13, behavior: 'charge',
  },
  wisp: {
    name: 'Wisp', hp: 15, dmg: 7, speed: 1.9, xp: 20, aggro: 8.0, attackRange: 7.0,
    attackCd: 1.9, weight: 0, behavior: 'ranged', keepDist: 5, nightOnly: true, floats: true,
  },
  treant: {
    name: 'Treant', hp: 65, dmg: 13, speed: 0.75, xp: 32, aggro: 5.0, attackRange: 1.4,
    attackCd: 1.9, weight: 0.08, behavior: 'melee',
  },
  golem: {
    name: 'Golem', hp: 160, dmg: 20, speed: 0.6, xp: 90, aggro: 6.0, attackRange: 1.7,
    attackCd: 2.4, weight: 0.03, behavior: 'melee', minDist: 38, boss: true,
  },
};

// ---------------------------------------------------------------------------
// pembuat mesh per tipe
// ---------------------------------------------------------------------------
let slimeFaceTex = null;

function lam(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...opts });
}

function buildSlimeMesh() {
  if (!slimeFaceTex) slimeFaceTex = makeSlimeFaceTexture();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.65),
    lam('#63d996', { transparent: true, opacity: 0.78 }));
  body.position.y = 0.28;
  body.castShadow = true;
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3),
    lam('#3aa86b', { transparent: true, opacity: 0.85 }));
  inner.position.y = 0.22;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46),
    new THREE.MeshBasicMaterial({ map: slimeFaceTex, transparent: true }));
  face.position.set(0, 0.3, 0.34);
  g.add(body, inner, face);
  g.userData.body = body;
  return g;
}

function buildNibbitMesh() {
  const g = new THREE.Group();
  const feathers = lam('#8fa8ba');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.42), feathers);
  body.position.y = 0.3;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.22), feathers);
  head.position.set(0, 0.52, 0.18);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.16), lam('#e8a33d'));
  beak.position.set(0, 0.5, 0.36);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045),
    new THREE.MeshBasicMaterial({ color: 0x14161a }));
  eyeL.position.set(-0.09, 0.55, 0.27);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.09;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), lam('#b8762a'));
  legs.position.y = 0.08;
  g.add(body, head, beak, eyeL, eyeR, legs);
  g.userData.body = body;
  return g;
}

function buildArmorbugMesh() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 1.0), lam('#6e5136'));
  shell.position.y = 0.34;
  shell.castShadow = true;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.7), lam('#87683f'));
  ridge.position.y = 0.58;
  const headM = lam('#544027');
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.3), headM);
  head.position.set(0, 0.26, 0.6);
  const pincerL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.3), headM);
  pincerL.position.set(-0.16, 0.22, 0.8);
  const pincerR = pincerL.clone(); pincerR.position.x = 0.16;
  for (let i = 0; i < 3; i++) {
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), headM);
    legL.position.set(-0.5, 0.14, -0.25 + i * 0.3);
    const legR = legL.clone(); legR.position.x = 0.5;
    g.add(legL, legR);
  }
  g.add(shell, ridge, head, pincerL, pincerR);
  g.userData.body = shell;
  return g;
}

function buildFunglingMesh() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), lam('#d8cfa8'));
  stem.position.y = 0.25;
  stem.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.72), lam('#9a5a7a'));
  cap.position.y = 0.58;
  cap.castShadow = true;
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.44), lam('#c98aa8'));
  capTop.position.y = 0.78;
  for (const [dx, dz] of [[-0.2, 0.2], [0.22, -0.1], [0, 0.28]]) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xe8dcc8 }));
    dot.position.set(dx, 0.74, dz);
    g.add(dot);
  }
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x2a1a22 }));
  eyeL.position.set(-0.08, 0.3, 0.16);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.08;
  g.add(stem, cap, capTop, eyeL, eyeR);
  g.userData.body = cap;
  return g;
}

function buildBoarlingMesh() {
  const g = new THREE.Group();
  const fur = lam('#6b4a32');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.85), fur);
  body.position.y = 0.4;
  body.castShadow = true;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.6), lam('#4d3220'));
  mane.position.set(0, 0.66, -0.05);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.3), fur);
  head.position.set(0, 0.42, 0.52);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.12), lam('#8a6a4a'));
  snout.position.set(0, 0.36, 0.7);
  const tuskL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xf0e8d0 }));
  tuskL.position.set(-0.12, 0.32, 0.66);
  const tuskR = tuskL.clone(); tuskR.position.x = 0.12;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xff4433 }));
  eyeL.position.set(-0.12, 0.5, 0.68);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.12;
  for (const [dx, dz] of [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), lam('#4d3220'));
    leg.position.set(dx, 0.16, dz);
    g.add(leg);
  }
  g.add(body, mane, head, snout, tuskL, tuskR, eyeL, eyeR);
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
  const light = new THREE.PointLight(0x9adcf0, 2.4, 5, 1.8);
  light.position.y = 0.5;
  g.add(core, shell, light);
  g.userData.body = shell;
  g.userData.spinning = shell;
  return g;
}

function buildTreantMesh() {
  const g = new THREE.Group();
  const barkMat = lam('#4d3a28');
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.55), barkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.85), lam('#33513c'));
  crown.position.y = 1.4;
  crown.castShadow = true;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xd8e858 }));
  eyeL.position.set(-0.14, 0.92, 0.29);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.14;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), barkMat);
  armL.position.set(-0.44, 0.75, 0);
  const armR = armL.clone(); armR.position.x = 0.44;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), barkMat);
  legL.position.set(-0.16, 0.2, 0);
  const legR = legL.clone(); legR.position.x = 0.16;
  g.add(trunk, crown, eyeL, eyeR, armL, armR, legL, legR);
  g.userData.body = trunk;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

function buildGolemMesh() {
  const g = new THREE.Group();
  const stone = lam('#6f7470');
  const stoneDark = lam('#575c58');
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.7), stone);
  torso.position.y = 1.0;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), stoneDark);
  head.position.y = 1.7;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xf0a848 }));
  core.position.set(0, 1.1, 0.36);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffc860 }));
  eye.position.set(0, 1.72, 0.24);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.34), stoneDark);
  armL.position.set(-0.78, 0.95, 0);
  armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.78;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.4), stoneDark);
  legL.position.set(-0.3, 0.28, 0);
  const legR = legL.clone(); legR.position.x = 0.3;
  const moss = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), lam('#4c6a44'));
  moss.position.set(0.1, 1.55, -0.1);
  g.add(torso, head, core, eye, armL, armR, legL, legR, moss);
  g.userData.body = torso;
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

const BUILDERS = {
  slime: buildSlimeMesh, nibbit: buildNibbitMesh, armorbug: buildArmorbugMesh,
  fungling: buildFunglingMesh, boarling: buildBoarlingMesh, wisp: buildWispMesh,
  treant: buildTreantMesh, golem: buildGolemMesh,
};

// ---------------------------------------------------------------------------
// nameplate (sprite canvas): nama + level + bar HP
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
// manajer musuh
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
      const dist = 13 + Math.random() * 30;
      const x = playerPos.x + Math.cos(ang) * dist;
      const z = playerPos.z + Math.sin(ang) * dist;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (decorBlocked.has(`${ix},${iz}`)) continue;

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
      e.type === 'slime' ? '#63d996' : '#d1372c', 8, 2.2);
    if (e.hp <= 0) {
      e.dead = true;
      hooks?.sfx?.('death_' + (e.type === 'slime' ? 'squish' : e.type === 'nibbit' || e.type === 'wisp' ? 'chirp' : 'thud'));
      particles.burst(e.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
        e.type === 'slime' ? '#63d996' : e.type === 'wisp' ? '#9adcf0' : '#8a6f52', 18, 3.2);
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

      if (distP > 60 || (e.def.nightOnly && !isNight)) {
        if (e.def.nightOnly && !isNight) {
          particles.burst(p.clone().add(new THREE.Vector3(0, 0.5, 0)), '#9adcf0', 10, 2);
        }
        e.dead = true; scene.remove(e.mesh); continue;
      }

      e.anim += dt;
      e.attackCd -= dt;

      // stun / freeze menghentikan AI
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

      // --- animasi per tipe ---
      if (e.type === 'slime') {
        const s = 1 + Math.sin(e.anim * 6) * 0.12;
        e.mesh.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      } else if (e.type === 'nibbit') {
        e.mesh.position.y += Math.max(0, Math.sin(e.anim * 9)) * 0.06;
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
    // jaga jarak
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
        color: e.type === 'wisp' ? '#9adcf0' : '#c98aa8',
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
      // sedang menyeruduk
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
      e.mesh.position.x += (Math.random() - 0.5) * 0.02; // getar
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
    if (h <= WATER_LEVEL - 1 && !e.def.water && !e.def.floats) { e.dir += 1.7; e.chargeT = 0; return; }
    const ny = terrain.surfaceY(nx, nz);
    if (ny - p.y > BLOCK_H * 1.6) { e.dir += 1.7; e.chargeT = 0; return; }
    p.x = nx; p.z = nz;
    if (!e.def.floats) p.y += (ny - p.y) * Math.min(1, dt * 10);
  }

  return { enemies, update, damage, spawnOne };
}
