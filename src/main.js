// SEMESTA — voxel action RPG 2.5D.
// Flow: Character Creation -> build the world -> game loop.
import * as THREE from 'three';
import { Terrain, buildTerrainMesh } from './world/terrain.js';
import { buildDecor } from './world/decor.js';
import { buildWater } from './world/water.js';
import { createChests } from './world/chests.js';
import { createWeather } from './world/weather.js';
import { setupLighting } from './gfx/lighting.js';
import { createParticles } from './gfx/particles.js';
import { makeTerrainAtlas } from './gfx/textures.js';
import { createPlayer } from './entities/player.js';
import { createEnemyManager } from './entities/enemies.js';
import { createNPCs, makeQuestMark, NPC_DEFS } from './entities/npcs.js';
import { createPickups } from './entities/pickups.js';
import { createProjectiles } from './entities/projectiles.js';
import { createDamageNumbers, resolveMeleeHit } from './systems/combat.js';
import { createLeveling } from './systems/level.js';
import { createInventory } from './systems/inventory.js';
import { createForge, forgeMultiplier } from './systems/forge.js';
import { createSkillSystem } from './systems/skills.js';
import { createQuests } from './systems/quests.js';
import { createPets, PET_DEFS } from './systems/pets.js';
import { createFishing } from './systems/fishing.js';
import { CLASSES } from './systems/classes.js';
import { ITEMS } from './systems/items.js';
import { createAudio } from './audio/audio.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { createHUD } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPanels } from './ui/panels.js';
import { createDialog } from './ui/dialog.js';
import { createTouchControls, isTouchDevice } from './ui/mobile.js';

const SAVE_KEY = 'semesta.save.v3';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const bootEl = document.getElementById('boot');
const bootBar = document.getElementById('boot-bar');
const setBoot = (p) => { if (bootBar) bootBar.style.width = `${Math.round(p * 100)}%`; };
// rAF doesn't fire in hidden tabs — fall back to a timer so the game still
// boots and simulates in the background (throttled).
const schedule = (fn) => {
  if (document.visibilityState === 'hidden') setTimeout(() => fn(performance.now()), 50);
  else requestAnimationFrame(fn);
};
const frame = () => new Promise((r) => schedule(r));

async function main() {
  // character creation first (boot screen hidden meanwhile)
  bootEl.style.display = 'none';
  const saved = loadSave();
  const audio = createAudio();
  const { config, continued } = await showCharacterCreation(saved);
  audio.start(); // button click = first gesture, safe for autoplay
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
  scene.background = new THREE.Color('#9ed4e8');
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 220);

  setBoot(0.15); await frame();

  // --- world ---
  const terrain = new Terrain();
  setBoot(0.35); await frame();
  scene.add(buildTerrainMesh(terrain, makeTerrainAtlas()));
  setBoot(0.5); await frame();
  const decor = buildDecor(terrain, scene);
  setBoot(0.62); await frame();
  const water = buildWater(terrain, scene);
  const lighting = setupLighting(scene);
  const particles = createParticles(scene);
  const weather = createWeather(scene, terrain, particles);
  const npcs = createNPCs(scene, terrain, decor.blocked);
  const chests = createChests(scene, terrain, decor.blocked, particles);
  setBoot(0.78); await frame();

  // --- systems & entities ---
  const leveling = createLeveling();
  const inventory = createInventory(cls.startWeapon);
  const forge = createForge(inventory);
  const quests = createQuests({ inventory, leveling });
  const player = createPlayer(terrain, decor.blocked, character, particles);
  scene.add(player.state.group);
  const projectiles = createProjectiles(scene, terrain);
  const pickups = createPickups(scene, terrain);
  const pets = createPets(scene, terrain, particles);
  const touch = isTouchDevice();

  // load save
  if (saved) {
    leveling.state.level = saved.level || 1;
    leveling.state.xp = saved.xp || 0;
    inventory.load(saved.inventory);
    quests.load(saved.quests);
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
        addShake(0.25);
        audio.sfx('hurt');
      }
      if (player.state.dead) {
        fishing.cancel();
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
  const dialog = createDialog(audio);
  const panels = createPanels(hudRoot, {
    inventory, forge, character, weaponType: cls.weaponType, audio, pets, isTouch: touch,
    onCraft(recipe) {
      hud.banner(`${ITEMS[recipe.out].name.toUpperCase()} CRAFTED!`);
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffd23e', 16);
      if (ITEMS[recipe.out].weapon) inventory.equip(recipe.out);
    },
    onForged(res, weapon) {
      if (res.success) {
        hud.banner(`${weapon.name.toUpperCase()} +${res.plus}!`);
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffd23e', 20);
        quests.event('forge');
      } else {
        hud.banner('FORGE FAILED...');
      }
    },
    onSummonPet: summonPet,
  });

  // --- pets: summon + passive perk ---
  function summonPet(petId) {
    // clear the old perk buff
    player.state.buffs = player.state.buffs.filter((b) => b.id !== 'petperk');
    if (!petId) { pets.dismiss(); return; }
    if (inventory.count(PET_DEFS[petId].charm) <= 0) return;
    pets.summon(petId, player.state.pos);
    const perk = PET_DEFS[petId].perk;
    if (perk.key !== 'xp') {
      player.addBuff({ id: 'petperk', t: 1e9, [perk.key]: perk.value });
    }
    hud.toastText(`${PET_DEFS[petId].name} joins you! ${perk.label}`);
  }
  function xpMult() {
    const petId = pets.state.active;
    return petId && PET_DEFS[petId].perk.key === 'xp' ? 1 + PET_DEFS[petId].perk.value : 1;
  }
  if (saved?.pet && PET_DEFS[saved.pet] && inventory.count(PET_DEFS[saved.pet].charm) > 0) {
    summonPet(saved.pet);
  }

  // --- stats from level & class ---
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

  // --- camera (with shake) ---
  const cam = { yaw: Math.PI * 0.25, dist: 17, pitch: 0.98, shake: 0 };
  function addShake(amt) { cam.shake = Math.min(0.8, cam.shake + amt); }
  function updateCamera(dt) {
    if (input.keys.has('KeyQ')) cam.yaw += dt * 1.8;
    if (input.keys.has('KeyE')) cam.yaw -= dt * 1.8;
    const p = player.state.pos;
    const cx = p.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cz = p.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cy = p.y + Math.sin(cam.pitch) * cam.dist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 7));
    if (cam.shake > 0.005) {
      camera.position.x += (Math.random() - 0.5) * cam.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * cam.shake * 0.4;
      cam.shake *= Math.max(0, 1 - dt * 7);
    }
    camera.lookAt(p.x, p.y + 0.6, p.z);
  }
  updateCamera(10);

  // --- aiming: auto-aim at the nearest enemy; cursor / facing as fallback ---
  const ray = new THREE.Raycaster();
  const AUTO_AIM_R = 13;
  function nearestEnemy(radius = AUTO_AIM_R) {
    let nearest = null, best = radius * radius;
    for (const e of enemyMgr.enemies) {
      if (e.dead) continue;
      const d = (e.mesh.position.x - player.state.pos.x) ** 2 + (e.mesh.position.z - player.state.pos.z) ** 2;
      if (d < best) { best = d; nearest = e; }
    }
    return nearest;
  }
  function cursorPoint() {
    if (touch) return null;
    const ndc = new THREE.Vector2(
      (input.mouse.x / innerWidth) * 2 - 1,
      -(input.mouse.y / innerHeight) * 2 + 1
    );
    ray.setFromCamera(ndc, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -player.state.pos.y);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }
  function aimPoint() {
    const e = nearestEnemy();
    if (e) return e.mesh.position.clone();
    const c = cursorPoint();
    if (c) return c;
    const f = player.state.facing;
    return player.state.pos.clone().add(new THREE.Vector3(Math.sin(f) * 5, 0, Math.cos(f) * 5));
  }

  // --- damage & kills ---
  function totalMult() {
    return leveling.dmgMult() * (1 + (player.state.dmgBonusBuff || 0));
  }
  function forgeMult() { return forgeMultiplier(inventory.equippedPlus()); }

  function onKill(e, drops) {
    const xp = Math.round(e.xp * xpMult());
    leveling.addXp(xp);
    dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0)), `+${xp} XP`, 'xp');
    for (const d of drops) pickups.spawn(d.id, d.count, e.mesh.position);
    quests.event('kill', { type: e.type });
  }

  function dealHit(e, mult = 1) {
    const def = inventory.equippedDef();
    const crit = player.consumeCritBuff() || Math.random() < 0.12;
    const dmg = Math.max(1, Math.round(def.dmg * totalMult() * forgeMult() * mult * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2)));
    dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), dmg, crit ? 'crit' : '');
    if (crit) { audio.sfx('crit'); addShake(0.18); }
    else addShake(0.07);
    enemyMgr.damage(e, dmg, player.state.pos, onKill);
  }

  // --- basic attack per weapon type (auto-aims at the nearest enemy) ---
  function doAttack() {
    if (panels.anyOpen() || dialog.isOpen() || player.state.dead) return;
    if (player.state.busy) { doInteract(); return; } // busy fishing -> attack acts as strike
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
            // small area pop
            particles.burst(pos.clone(), def.blade[1], 12, 3, 3);
            particles.shockwave(pos, def.blade[1], def.aoe + 0.5, 0.3);
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
    if (panels.anyOpen() || dialog.isOpen()) return;
    fishing.cancel();
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
    aimPoint, onKill, shake: addShake,
    weaponDef: () => inventory.equippedDef(),
    forgeMult,
  });
  const skillIds = cls.skills;

  function castSkill(id) {
    if (panels.anyOpen() || dialog.isOpen() || player.state.dead) return;
    player.state.dmgMult = totalMult();
    skillSys.cast(id);
  }

  // --- fishing ---
  const fishing = createFishing({
    scene, terrain, player, particles, audio,
    hooks: {
      onCatch(fishId, xp) {
        inventory.add(fishId, 1);
        hud.toast(fishId, 1);
        hud.banner(`CAUGHT: ${ITEMS[fishId].name.toUpperCase()}!`);
        const gained = Math.round(xp * xpMult());
        leveling.addXp(gained);
        dmgNums.spawn(player.state.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), `+${gained} XP`, 'xp');
        quests.event('fish');
      },
      onMiss(msg) { hud.toastText(msg); },
    },
  });

  // --- quest markers above NPC heads ---
  function refreshMarkers() {
    for (const n of npcs.npcs) {
      if (n.questMark) { n.mesh.remove(n.questMark); n.questMark = null; }
      const active = quests.activeFor(n.def.id);
      if (active && quests.isComplete(active.id)) {
        n.questMark = makeQuestMark('?', '#ffd23e');
      } else if (active) {
        n.questMark = makeQuestMark('?', '#b8c4b0');
      } else if (quests.availableFor(n.def.id)) {
        n.questMark = makeQuestMark('!', '#ffd23e');
      }
      if (n.questMark) n.mesh.add(n.questMark);
    }
  }
  const giverNames = Object.fromEntries(NPC_DEFS.map((d) => [d.id, d.name]));
  quests.onChange(() => {
    refreshMarkers();
    hud.updateQuests(quests.trackerLines().map((l) => ({ ...l, giverName: giverNames[l.giver] })));
  });
  refreshMarkers();
  hud.updateQuests(quests.trackerLines().map((l) => ({ ...l, giverName: giverNames[l.giver] })));

  // --- NPC dialog / quest flow ---
  function openDialog(npc) {
    const def = npc.def;
    player.state.busy = true;
    audio.sfx('talk');
    quests.event('talk', { target: def.id });

    const close = () => { player.state.busy = false; };
    const active = quests.activeFor(def.id);
    if (active && quests.isComplete(active.id)) {
      dialog.show({
        name: def.name, role: def.role, mode: 'turnin', quest: active, text: active.done,
        onTurnIn() {
          const reward = quests.turnIn(active.id);
          audio.sfx('quest_done');
          hud.banner('QUEST COMPLETE!');
          if (reward) {
            particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffd23e', 22);
            for (const it of reward.items || []) hud.toast(it.id, it.count);
          }
        },
        onClose: close,
      });
      return;
    }
    if (active) {
      dialog.show({
        name: def.name, role: def.role, mode: 'progress', quest: active,
        progress: quests.progress(active.id),
        text: def.dialog[npc.dialogIdx++ % def.dialog.length],
        onClose: close,
      });
      return;
    }
    const offer = quests.availableFor(def.id);
    if (offer) {
      dialog.show({
        name: def.name, role: def.role, mode: 'offer', quest: offer, text: offer.offer,
        onAccept() {
          quests.accept(offer.id);
          audio.sfx('quest_accept');
          hud.banner('QUEST ACCEPTED');
        },
        onClose: close,
      });
      return;
    }
    dialog.show({
      name: def.name, role: def.role,
      text: def.dialog[npc.dialogIdx++ % def.dialog.length],
      onClose: close,
    });
  }

  // --- interact system: one context-sensitive action (F / mobile ★ button) ---
  function currentInteraction() {
    if (player.state.dead || panels.anyOpen() || dialog.isOpen()) return null;
    if (fishing.state.phase === 'bite') return { label: 'Reel in!', run: () => fishing.strike() };
    if (fishing.state.phase === 'waiting') return { label: 'Wait for it...', run: () => fishing.strike() };
    const npc = npcs.nearest(player.state.pos, 2.3);
    if (npc) return { label: `Talk to ${npc.def.name}`, run: () => openDialog(npc) };
    const chest = chests.nearest(player.state.pos, 2.1);
    if (chest) {
      return {
        label: 'Open chest',
        run: () => {
          const loot = chests.open(chest, ownedPetSet());
          if (!loot) return;
          audio.sfx('chest');
          addShake(0.12);
          for (const d of loot) pickups.spawn(d.id, d.count, chest.mesh.position);
          quests.event('chest');
        },
      };
    }
    if (fishing.canFish()) return { label: 'Fish', run: () => fishing.cast() };
    return null;
  }
  function ownedPetSet() {
    const owned = new Set();
    for (const [id, def] of Object.entries(PET_DEFS)) {
      if (inventory.count(def.charm) > 0) owned.add(id);
    }
    return owned;
  }
  function doInteract() {
    const it = currentInteraction();
    if (it) it.run();
  }

  // --- keyboard/mouse ---
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    if (e.code === 'Tab') { e.preventDefault(); audio.sfx('ui'); panels.toggle('inv'); }
    if (e.code === 'KeyC') { audio.sfx('ui'); panels.toggle('cra'); }
    if (e.code === 'KeyV') { audio.sfx('ui'); panels.toggle('forge'); }
    if (e.code === 'KeyP') { audio.sfx('ui'); panels.toggle('pets'); }
    if (e.code === 'KeyH') { audio.sfx('ui'); panels.toggle('help'); }
    if (e.code === 'KeyF') doInteract();
    if (e.code === 'Escape') { panels.closeAll(); dialog.hide(); fishing.cancel(); }
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

  // --- touch controls ---
  let touchUI = null;
  if (touch) {
    document.body.classList.add('touch');
    touchUI = createTouchControls(input, skillIds, {
      onAttack: doAttack,
      onRoll: doRoll,
      onPotion: usePotion,
      onSkill: castSkill,
      onInteract: doInteract,
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
        quests: quests.serialize(),
        pet: pets.state.active,
        pos: [player.state.pos.x, player.state.pos.y, player.state.pos.z],
      }));
    } catch { /* storage full/blocked: ignore */ }
  }
  setInterval(save, 8000);
  window.addEventListener('beforeunload', save);

  // debug/testing handle (used by automated verification)
  window.__semesta = {
    player, enemyMgr, inventory, leveling, terrain, cam, camera, skillSys, forge,
    projectiles, character, quests, pets, chests, weather, fishing, npcs, lighting,
  };

  setBoot(1); await frame();
  bootEl.classList.add('hidden');
  setTimeout(() => bootEl.remove(), 800);
  hud.banner(`WELCOME TO RIVERBROOK, ${character.name.toUpperCase()}`);
  if (!saved) {
    setTimeout(() => hud.toastText('Villagers with a "!" have quests for you. Press H for the guide.'), 2600);
  }

  // --- game loop ---
  let last = performance.now(), time = 0, hudT = 0, thunderT = 20;
  function loop(now) {
    schedule(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    player.state.dmgMult = totalMult();
    player.update(dt, input, cam.yaw);

    // moving cancels an in-progress fishing session
    if (fishing.state.phase !== 'idle' && (input.joy.active ||
        input.keys.has('KeyW') || input.keys.has('KeyA') || input.keys.has('KeyS') || input.keys.has('KeyD'))) {
      fishing.cancel();
    }

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
    weather.update(dt, player.state.pos, time);
    lighting.state.weatherDim = weather.state.intensity;
    lighting.update(dt, player.state.pos);
    particles.update(dt);
    dmgNums.update(dt);
    skillSys.update(dt);
    npcs.update(dt, player.state.pos, time);
    chests.update(dt, player.state.pos);
    pets.update(dt, player.state, time);
    fishing.update(dt, time);
    updateCamera(dt);

    // occasional distant thunder while raining
    if (weather.state.intensity > 0.5) {
      thunderT -= dt;
      if (thunderT <= 0) {
        thunderT = 18 + Math.random() * 30;
        audio.sfx('thunder');
      }
    }

    // combat music intensity = nearby aggro'd enemies
    let aggroN = 0;
    for (const e of enemyMgr.enemies) {
      if (!e.dead && e.state === 'aggro') aggroN++;
    }
    audio.setCombat(Math.min(1, aggroN / 3));
    audio.setMood(isNight);
    audio.setRain(weather.state.intensity);

    hud.updateVitals(player, leveling, dt);
    hud.updateSkills(skillSys);
    hudT += dt;
    if (hudT > 0.2) {
      hudT = 0;
      hud.setWeather(weather.state.intensity > 0.4);
      hud.setClock(lighting.clockText(), isNight);
      minimap.update(player.state.pos, player.state.facing, enemyMgr.enemies);
      touchUI?.update(skillSys, inventory.count('tonic'));
      // interact prompt
      const it = currentInteraction();
      hud.setPrompt(it ? { key: 'F', label: it.label } : null);
      touchUI?.setPrompt(it ? { label: it.label } : null);
    }

    renderer.render(scene, camera);
  }
  schedule(loop);
}

main().catch((err) => {
  console.error(err);
  const el = document.querySelector('#boot .sub');
  if (el) {
    document.getElementById('boot').style.display = '';
    el.textContent = 'FAILED TO LOAD: ' + err.message;
    el.style.color = '#e87a6a';
  }
});
