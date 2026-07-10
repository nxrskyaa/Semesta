// SEMESTA — voxel action RPG 2.5D.
// Alur: Character Creation -> bangun dunia -> game loop.
import * as THREE from 'three';
import { Terrain, buildTerrainMesh } from './world/terrain.js';
import { buildDecor } from './world/decor.js';
import { buildWater } from './world/water.js';
import { setupLighting } from './gfx/lighting.js';
import { createParticles } from './gfx/particles.js';
import { makeTerrainAtlas } from './gfx/textures.js';
import { createPlayer } from './entities/player.js';
import { createEnemyManager } from './entities/enemies.js';
import { createPickups } from './entities/pickups.js';
import { createProjectiles } from './entities/projectiles.js';
import { createDamageNumbers, resolveMeleeHit } from './systems/combat.js';
import { createLeveling } from './systems/level.js';
import { createInventory } from './systems/inventory.js';
import { createForge, forgeMultiplier } from './systems/forge.js';
import { createSkillSystem } from './systems/skills.js';
import { CLASSES } from './systems/classes.js';
import { ITEMS } from './systems/items.js';
import { createAudio } from './audio/audio.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { createHUD } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPanels } from './ui/panels.js';
import { createTouchControls, isTouchDevice } from './ui/mobile.js';

const SAVE_KEY = 'semesta.save.v2';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const bootEl = document.getElementById('boot');
const bootBar = document.getElementById('boot-bar');
const setBoot = (p) => { if (bootBar) bootBar.style.width = `${Math.round(p * 100)}%`; };
const frame = () => new Promise((r) => requestAnimationFrame(r));

async function main() {
  // layar create character dulu (boot screen disembunyikan sementara)
  bootEl.style.display = 'none';
  const saved = loadSave();
  const audio = createAudio();
  const { config, continued } = await showCharacterCreation(saved);
  audio.start(); // klik tombol = gesture pertama, aman untuk autoplay
  audio.sfx('ui');

  bootEl.style.display = '';
  await init(config, continued ? saved : null, audio);
}

async function init(character, saved, audio) {
  setBoot(0.05); await frame();
  const cls = CLASSES[character.cls];

  // --- renderer & scene ---
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('game');
  document.getElementById('app').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#48584a');
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 220);

  setBoot(0.15); await frame();

  // --- dunia ---
  const terrain = new Terrain();
  setBoot(0.35); await frame();
  scene.add(buildTerrainMesh(terrain, makeTerrainAtlas()));
  setBoot(0.55); await frame();
  const decor = buildDecor(terrain, scene);
  setBoot(0.7); await frame();
  const water = buildWater(terrain, scene);
  const lighting = setupLighting(scene);
  const particles = createParticles(scene);
  setBoot(0.82); await frame();

  // --- sistem & entitas ---
  const leveling = createLeveling();
  const inventory = createInventory(cls.startWeapon);
  const forge = createForge(inventory);
  const player = createPlayer(terrain, decor.blocked, character, particles);
  scene.add(player.state.group);
  const projectiles = createProjectiles(scene, terrain);
  const pickups = createPickups(scene, terrain);

  // muat save
  if (saved) {
    leveling.state.level = saved.level || 1;
    leveling.state.xp = saved.xp || 0;
    inventory.load(saved.inventory);
    if (saved.pos) {
      player.state.pos.set(saved.pos[0], saved.pos[1], saved.pos[2]);
    }
  }

  const enemyMgr = createEnemyManager(terrain, decor.blocked, scene, particles, projectiles, {
    onPlayerHit(e, dmg) {
      const taken = player.takeDamage(dmg);
      if (taken > 0) {
        dmgNums.spawn(player.state.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), taken, 'player-hit');
        particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ff6b5e', 7, 2);
        hud.showHurt();
        audio.sfx('hurt');
      }
      if (player.state.dead) {
        hud.showDead(true);
        audio.sfx('death_player');
      }
    },
    sfx: (n) => audio.sfx(n),
  });
  for (let i = 0; i < 14; i++) enemyMgr.spawnOne(player.state.pos);

  // --- UI ---
  const hudRoot = document.getElementById('hud');
  const hud = createHUD(hudRoot, { inventory, character, forge, audio });
  const dmgNums = createDamageNumbers(hudRoot, camera);
  const minimap = createMinimap(hud.els.minimapCanvas, terrain, decor);
  const panels = createPanels(hudRoot, {
    inventory, forge, character, weaponType: cls.weaponType, audio,
    onCraft(recipe) {
      hud.banner(`${ITEMS[recipe.out].name} DIBUAT!`);
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffd23e', 16);
      if (ITEMS[recipe.out].weapon) inventory.equip(recipe.out);
    },
    onForged(res, weapon) {
      if (res.success) {
        hud.banner(`${weapon.name} +${res.plus}!`);
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffd23e', 20);
      } else {
        hud.banner('TEMPA GAGAL...');
      }
    },
  });

  // --- stat dari level & class ---
  function applyLevelStats() {
    const lv = leveling.state.level;
    player.state.maxHp = cls.baseHp + (lv - 1) * cls.hpPerLevel;
    player.state.maxStamina = cls.baseStam + (lv - 1) * cls.stamPerLevel;
  }
  applyLevelStats();
  player.state.hp = saved?.hp ?? player.state.maxHp;
  player.state.stamina = player.state.maxStamina;

  leveling.state.onLevelUp = (lv) => {
    applyLevelStats();
    player.state.hp = player.state.maxHp;
    hud.banner(`LEVEL ${lv}!`);
    audio.sfx('levelup');
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#9fe86e', 24);
  };

  inventory.onChange(() => {
    if (inventory.state.equipped !== player.state.equipped) {
      player.state.equipWeapon(inventory.state.equipped);
    }
  });
  player.state.equipWeapon(inventory.state.equipped);

  // --- input ---
  const input = { keys: new Set(), mouse: { x: innerWidth / 2, y: innerHeight / 2 }, joy: { active: false, x: 0, y: 0 } };
  const touch = isTouchDevice();

  // --- kamera ---
  const cam = { yaw: Math.PI * 0.25, dist: 17, pitch: 0.98 };
  function updateCamera(dt) {
    if (input.keys.has('KeyQ')) cam.yaw += dt * 1.8;
    if (input.keys.has('KeyE')) cam.yaw -= dt * 1.8;
    const p = player.state.pos;
    const cx = p.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cz = p.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cy = p.y + Math.sin(cam.pitch) * cam.dist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 7));
    camera.lookAt(p.x, p.y + 0.6, p.z);
  }
  updateCamera(10);

  // titik dunia di bawah kursor (untuk aim); di mobile: musuh terdekat
  const ray = new THREE.Raycaster();
  function aimPoint() {
    if (touch) {
      let nearest = null, best = 15 * 15;
      for (const e of enemyMgr.enemies) {
        if (e.dead) continue;
        const d = (e.mesh.position.x - player.state.pos.x) ** 2 + (e.mesh.position.z - player.state.pos.z) ** 2;
        if (d < best) { best = d; nearest = e; }
      }
      if (nearest) return nearest.mesh.position.clone();
      const f = player.state.facing;
      return player.state.pos.clone().add(new THREE.Vector3(Math.sin(f) * 5, 0, Math.cos(f) * 5));
    }
    const ndc = new THREE.Vector2(
      (input.mouse.x / innerWidth) * 2 - 1,
      -(input.mouse.y / innerHeight) * 2 + 1
    );
    ray.setFromCamera(ndc, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -player.state.pos.y);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }

  // --- damage & kill ---
  function totalMult() {
    return leveling.dmgMult() * (1 + (player.state.dmgBonusBuff || 0));
  }
  function forgeMult() { return forgeMultiplier(inventory.equippedPlus()); }

  function onKill(e, drops) {
    leveling.addXp(e.xp);
    dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0)), `+${e.xp} XP`, 'xp');
    for (const d of drops) pickups.spawn(d.id, d.count, e.mesh.position);
  }

  function dealHit(e, mult = 1) {
    const def = inventory.equippedDef();
    const crit = player.consumeCritBuff() || Math.random() < 0.12;
    const dmg = Math.max(1, Math.round(def.dmg * totalMult() * forgeMult() * mult * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2)));
    dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), dmg, crit ? 'crit' : '');
    if (crit) audio.sfx('crit');
    enemyMgr.damage(e, dmg, player.state.pos, onKill);
  }

  // --- serangan dasar per tipe senjata ---
  function doAttack() {
    if (panels.anyOpen() || player.state.dead) return;
    const def = inventory.equippedDef();
    if (!def?.weapon) return;
    if (!player.tryAttack(def)) return;

    const target = aimPoint();
    if (target) {
      const dx = target.x - player.state.pos.x, dz = target.z - player.state.pos.z;
      if (dx * dx + dz * dz > 0.04) player.state.facing = Math.atan2(dx, dz);
    }

    const dur = player.state.attackDur * 1000;
    const p = player.state;

    if (def.type === 'bow') {
      audio.sfx('swing_bow');
      setTimeout(() => {
        if (p.dead) return;
        projectiles.spawn({
          pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
          dir: new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)),
          speed: def.projSpeed, range: def.range, radius: 0.55,
          kind: 'arrow', color: def.blade[1],
          onHitEnemy: (e) => dealHit(e, 1),
        });
      }, dur * 0.55);
    } else if (def.type === 'staff') {
      audio.sfx('swing_staff');
      setTimeout(() => {
        if (p.dead) return;
        projectiles.spawn({
          pos: p.pos.clone().add(new THREE.Vector3(0, 0.85, 0)),
          dir: new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)),
          speed: def.projSpeed, range: def.range, radius: 0.55,
          kind: 'orb', color: def.blade[1], trail: def.blade[1],
          onHitEnemy: (e, pos) => {
            // ledakan kecil area
            particles.burst(pos.clone(), def.blade[1], 12, 3, 3);
            audio.sfx('hit');
            for (const en of enemyMgr.enemies) {
              if (en.dead) continue;
              const d = Math.hypot(en.mesh.position.x - pos.x, en.mesh.position.z - pos.z);
              if (d <= def.aoe) dealHit(en, 1);
            }
          },
        });
      }, dur * 0.4);
    } else if (def.type === 'dagger') {
      audio.sfx('swing');
      const stab = () => {
        if (p.dead) return;
        const hits = resolveMeleeHit(p, def, enemyMgr.enemies, 1);
        for (const h of hits) dealHit(h.enemy, 1);
      };
      setTimeout(stab, dur * 0.25);
      setTimeout(stab, dur * 0.7);
    } else {
      audio.sfx('swing');
      setTimeout(() => {
        if (p.dead) return;
        const hits = resolveMeleeHit(p, def, enemyMgr.enemies, 1);
        for (const h of hits) dealHit(h.enemy, 1);
      }, dur * 0.45);
    }
  }

  function doRoll() {
    if (panels.anyOpen()) return;
    if (player.tryRoll(input, cam.yaw)) audio.sfx('roll');
  }

  function usePotion() {
    const t = inventory.usePotion();
    if (!t) { audio.sfx('deny'); return; }
    player.state.hp = Math.min(player.state.maxHp, player.state.hp + t.heal);
    dmgNums.spawn(player.state.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), `+${t.heal}`, 'heal');
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#7dff8a', 10);
    audio.sfx('potion');
  }

  // --- skill system ---
  const skillSys = createSkillSystem({
    player, enemyMgr, projectiles, particles, dmgNums, audio, terrain,
    aimPoint, onKill,
    weaponDef: () => inventory.equippedDef(),
    forgeMult,
  });
  // dmgMult total untuk skills
  const skillIds = cls.skills;

  function castSkill(id) {
    if (panels.anyOpen() || player.state.dead) return;
    player.state.dmgMult = totalMult();
    skillSys.cast(id);
  }

  // --- keyboard/mouse ---
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    if (e.code === 'Tab') { e.preventDefault(); audio.sfx('ui'); panels.toggle('inv'); }
    if (e.code === 'KeyC') { audio.sfx('ui'); panels.toggle('cra'); }
    if (e.code === 'KeyV') { audio.sfx('ui'); panels.toggle('forge'); }
    if (e.code === 'Escape') panels.closeAll();
    if (e.code === 'Digit1') castSkill(skillIds[0]);
    if (e.code === 'Digit2') castSkill(skillIds[1]);
    if (e.code === 'Digit3') castSkill(skillIds[2]);
    if (e.code === 'Digit4') usePotion();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 0) doAttack();
    if (e.button === 2) doRoll();
  });
  window.addEventListener('mousemove', (e) => {
    input.mouse.x = e.clientX; input.mouse.y = e.clientY;
  });
  renderer.domElement.addEventListener('wheel', (e) => {
    cam.dist = Math.max(9, Math.min(30, cam.dist + Math.sign(e.deltaY) * 1.6));
  }, { passive: true });

  hud.bind({
    onSkill: castSkill,
    onPotion: usePotion,
    onMenu: (which) => { audio.sfx('ui'); panels.toggle(which); },
    onRespawn: () => {
      player.respawn();
      hud.showDead(false);
    },
  });

  // --- kontrol sentuh ---
  let touchUI = null;
  if (touch) {
    document.body.classList.add('touch');
    touchUI = createTouchControls(input, skillIds, {
      onAttack: doAttack,
      onRoll: doRoll,
      onPotion: usePotion,
      onSkill: castSkill,
      onCameraDrag: (d) => { cam.yaw -= d; },
    });
  }

  // --- resize ---
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // --- save game ---
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        character,
        level: leveling.state.level,
        xp: leveling.state.xp,
        hp: player.state.hp,
        inventory: inventory.serialize(),
        pos: [player.state.pos.x, player.state.pos.y, player.state.pos.z],
      }));
    } catch { /* storage penuh/di-block: abaikan */ }
  }
  setInterval(save, 8000);
  window.addEventListener('beforeunload', save);

  // handle debug/testing (dipakai verifikasi otomatis)
  window.__semesta = {
    player, enemyMgr, inventory, leveling, terrain, cam, camera, skillSys, forge, projectiles, character,
  };

  setBoot(1); await frame();
  bootEl.classList.add('hidden');
  setTimeout(() => bootEl.remove(), 800);
  hud.banner(`SELAMAT DATANG, ${character.name.toUpperCase()}`);

  // --- game loop ---
  let last = performance.now(), time = 0, hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    player.state.dmgMult = totalMult();
    player.update(dt, input, cam.yaw);

    const hr = lighting.state.minutes / 60;
    const isNight = hr >= 19.5 || hr < 5.5;

    enemyMgr.update(dt, player.state, time, isNight);
    projectiles.update(dt, enemyMgr.enemies, player.state, particles);
    pickups.update(dt, player.state.pos, (id, count) => {
      inventory.add(id, count);
      hud.toast(id, count);
      audio.sfx('pickup');
    });
    decor.update(dt, player.state.pos, time);
    water.update(dt, time);
    lighting.update(dt, player.state.pos);
    particles.update(dt);
    dmgNums.update(dt);
    skillSys.update(dt);
    updateCamera(dt);

    // intensitas musik combat = musuh aggro di sekitar
    let aggroN = 0;
    for (const e of enemyMgr.enemies) {
      if (!e.dead && e.state === 'aggro') aggroN++;
    }
    audio.setCombat(Math.min(1, aggroN / 3));
    audio.setMood(isNight);

    hud.updateVitals(player, leveling, dt);
    hud.updateSkills(skillSys);
    hudT += dt;
    if (hudT > 0.2) {
      hudT = 0;
      hud.setClock(lighting.clockText(), isNight);
      minimap.update(player.state.pos, player.state.facing, enemyMgr.enemies);
      touchUI?.update(skillSys, inventory.count('tonic'));
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error(err);
  const el = document.querySelector('#boot .sub');
  if (el) {
    document.getElementById('boot').style.display = '';
    el.textContent = 'GAGAL MEMUAT: ' + err.message;
    el.style.color = '#e87a6a';
  }
});
