// SEMESTA — voxel action RPG 2.5D.
// Flow: Character Creation -> build the world -> game loop.
import * as THREE from 'three';
import { Terrain, buildTerrainMesh } from './world/terrain.js';
import { buildDecor } from './world/decor.js';
import { buildWater } from './world/water.js';
import { createChests } from './world/chests.js';
import { createWeather } from './world/weather.js';
import { createCamps, CAMP_SAFE_R, CAMP_HEAL_R } from './world/camps.js';
import { createGathering } from './world/gather.js';
import { createLandmarks } from './world/landmarks.js';
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
import { createSkillSystem, SKILLS, MAX_SKILL_LEVEL } from './systems/skills.js';
import { skillIconUrl } from './gfx/textures.js';
import { createQuests } from './systems/quests.js';
import { createPets, PET_DEFS } from './systems/pets.js';
import { createMounts, MOUNT_DEFS } from './systems/mounts.js';
import { createFishing } from './systems/fishing.js';
import { createFarming, PLOT_PRICE } from './systems/farming.js';
import { createHousing, LAND_PRICE, HOUSE_SAFE_R, HOUSE_HEAL_R } from './systems/housing.js';
import { CLASSES, defaultCharacter } from './systems/classes.js';
import { ITEMS } from './systems/items.js';
import { createAudio } from './audio/audio.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { showOpening, logoUrl } from './ui/menu.js';
import { cleanImage } from './gfx/logo.js';
import { createHUD } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createWorldMap } from './ui/worldmap.js';
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
  bootEl.style.display = 'none';
  const saved = loadSave();
  const audio = createAudio();

  // the world-building boot screen shows the real logo art (background keyed out)
  const bootH1 = document.querySelector('#boot h1');
  if (bootH1) {
    const cleanLogo = await cleanImage(logoUrl);
    bootH1.outerHTML =
      `<img src="${cleanLogo}" alt="SEMESTA" style="width:min(420px,80vw);image-rendering:pixelated;filter:drop-shadow(0 6px 18px #000a)">`;
  }

  // opening: loading splash -> main menu (New / Continue / About)
  const { action } = await showOpening(saved);
  audio.start(); // menu click = first gesture, safe for autoplay
  audio.sfx('ui');

  let config, continued;
  if (action === 'continue' && saved) {
    config = { ...defaultCharacter(), ...saved.character };
    continued = true;
  } else {
    const res = await showCharacterCreation(null); // fresh hero
    config = res.config;
    continued = false;
  }

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
  const npcs = createNPCs(scene, terrain, decor.blocked, particles);
  const chests = createChests(scene, terrain, decor.blocked, particles);
  const camps = createCamps(scene, terrain, decor.blocked, particles);
  const gathering = createGathering(scene, terrain, decor.blocked, particles);
  const landmarks = createLandmarks(scene, terrain, decor.blocked);
  const farming = createFarming(scene, terrain, decor.blocked, particles);
  const housing = createHousing(scene, terrain, decor.blocked, particles);

  // --- safe zones: the village, rest camps and your homes repel monsters ---
  const VILLAGE_SAFE_R = 13;
  function inSafeZone(x, z) {
    const dv = (x - terrain.spawn.x) ** 2 + (z - terrain.spawn.z) ** 2;
    if (dv < VILLAGE_SAFE_R * VILLAGE_SAFE_R) return { x: terrain.spawn.x, z: terrain.spawn.z, r: VILLAGE_SAFE_R };
    for (const c of camps.camps) {
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < CAMP_SAFE_R * CAMP_SAFE_R) return { x: c.x, z: c.z, r: CAMP_SAFE_R };
    }
    for (const l of housing.lands) {
      if (l.built && (x - l.x) ** 2 + (z - l.z) ** 2 < HOUSE_SAFE_R * HOUSE_SAFE_R) return { x: l.x, z: l.z, r: HOUSE_SAFE_R };
    }
    return null;
  }
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
  const mounts = createMounts(particles);
  const touch = isTouchDevice();

  // load save
  if (saved) {
    leveling.state.level = saved.level || 1;
    leveling.state.xp = saved.xp || 0;
    inventory.load(saved.inventory);
    quests.load(saved.quests);
    farming.load(saved.farm);
    housing.load(saved.houses);
    if (saved.pos) {
      player.state.pos.set(saved.pos[0], saved.pos[1], saved.pos[2]);
    }
  } else {
    // starter kit: a faithful mount, a couple of seeds and pocket change
    inventory.add('mount_sprig', 1);
    inventory.add('seed_wheat', 2);
    inventory.addCoins(15);
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
    inSafeZone,
  });
  for (let i = 0; i < 14; i++) enemyMgr.spawnOne(player.state.pos);

  // --- UI ---
  const hudRoot = document.getElementById('hud');
  const hud = createHUD(hudRoot, { inventory, character, forge, audio });
  const dmgNums = createDamageNumbers(hudRoot, camera);
  const minimap = createMinimap(hud.els.minimapCanvas, terrain, decor);
  const dialog = createDialog(audio);

  // --- skill leveling: 1 point per character level, spent in the K panel ---
  let skillPoints = saved?.skillPoints ?? 0;
  const skillsApi = {
    skillIds: cls.skills,
    SKILLS, MAX_SKILL_LEVEL,
    iconUrl: skillIconUrl,
    skillSys: null, // filled right after createSkillSystem below
    getPoints: () => skillPoints,
    spendPoint: (id) => {
      if (skillPoints <= 0 || !skillsApi.skillSys?.upgrade(id)) return false;
      skillPoints--;
      hud.banner(`${SKILLS[id].name.toUpperCase()} Lv${skillsApi.skillSys.levelOf(id)}!`);
      return true;
    },
  };

  // --- economy / cooking / estate APIs for the panels ---
  const COOK_RECIPES = [
    { out: 'grilled_minnow', cost: { fish_minnow: 1 } },
    { out: 'perch_dinner', cost: { fish_perch: 1, green_herb: 1 } },
    { out: 'koi_feast', cost: { fish_koi: 1, green_herb: 2 } },
  ];
  const economy = {
    eat(id) {
      const food = inventory.useConsumable(id);
      if (!food) { audio.sfx('deny'); return; }
      player.state.hp = Math.min(player.state.maxHp, player.state.hp + food.heal);
      dmgNums.spawn(player.state.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), `+${food.heal}`, 'heal');
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#7dff8a', 10);
      audio.sfx('potion');
    },
    goods() {
      const plotPrice = farming.nextPlotPrice();
      return [
        { id: 'seed_wheat', name: 'Wheat Seeds', desc: 'Grows fast. Honest work.', price: ITEMS.seed_wheat.buy },
        { id: 'seed_berry', name: 'Berry Seeds', desc: 'Sweet profit in ~90 seconds.', price: ITEMS.seed_berry.buy },
        { id: 'seed_pumpkin', name: 'Pumpkin Seeds', desc: 'Slow, plump, premium.', price: ITEMS.seed_pumpkin.buy },
        { id: 'tonic', name: 'Health Tonic', desc: 'Restores 40 HP.', price: 15 },
        { id: 'plot', name: 'Extra Farm Plot', desc: 'Expand your field by one plot.', icon: 'crop_wheat', price: plotPrice ?? PLOT_PRICE, soldout: plotPrice === null },
      ];
    },
    buy(id) {
      const good = this.goods().find((g) => g.id === id);
      if (!good || good.soldout || !inventory.spendCoins(good.price)) { audio.sfx('deny'); return; }
      if (id === 'plot') farming.buyNextPlot();
      else inventory.add(id, 1);
      audio.sfx('craft');
      hud.toastText(`Bought ${good.name}!`);
    },
    sell(id, n) {
      const have = inventory.count(id);
      const count = Math.min(have, n === Infinity ? have : n);
      const price = ITEMS[id]?.sell || 0;
      if (count <= 0 || !price) return;
      inventory.remove(id, count);
      inventory.addCoins(price * count);
      audio.sfx('pickup');
    },
  };
  const cooking = {
    recipes: () => COOK_RECIPES,
    cook(out) {
      const r = COOK_RECIPES.find((x) => x.out === out);
      if (!r) return;
      for (const [id, n] of Object.entries(r.cost)) {
        if (inventory.count(id) < n) { audio.sfx('deny'); return; }
      }
      for (const [id, n] of Object.entries(r.cost)) inventory.remove(id, n);
      inventory.add(out, 1);
      audio.sfx('craft');
      particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffb055', 8, 2);
      hud.toast(out, 1);
    },
  };
  const estate = {
    landPrice: LAND_PRICE,
    designs: housing.HOUSE_DESIGNS,
    currentLand: () => housing.nearest(player.state.pos, 4),
    buyLand() {
      const land = this.currentLand();
      if (!land || land.owned || !inventory.spendCoins(LAND_PRICE)) { audio.sfx('deny'); return; }
      housing.buyLand(land);
      audio.sfx('quest_done');
      hud.banner('LAND PURCHASED!');
    },
    build(designId) {
      const land = this.currentLand();
      const d = housing.HOUSE_DESIGNS[designId];
      if (!land || !land.owned || land.built || !d) return;
      for (const [id, n] of Object.entries(d.cost)) {
        if (inventory.count(id) < n) { audio.sfx('deny'); return; }
      }
      if (d.coins && inventory.state.coins < d.coins) { audio.sfx('deny'); return; }
      for (const [id, n] of Object.entries(d.cost)) inventory.remove(id, n);
      if (d.coins) inventory.spendCoins(d.coins);
      housing.build(land, designId);
      quests.event('build');
      audio.sfx('quest_done');
      addShake(0.3);
      hud.banner(`${d.name.toUpperCase()} BUILT!`);
    },
  };

  // --- Master NXR's gacha: coins in, wonders out ---
  const gacha = {
    price: 100,
    roll() {
      if (!inventory.spendCoins(this.price)) return null;
      const r = Math.random();
      if (r < 0.60) { // common: supply bundle
        const bundles = [
          { id: 'forge_stone', count: 3 }, { id: 'tonic', count: 2 },
          { id: 'seed_berry', count: 3 }, { id: 'iron_ore', count: 2 },
          { id: 'seed_pumpkin', count: 2 },
        ];
        const b = bundles[Math.floor(Math.random() * bundles.length)];
        inventory.add(b.id, b.count);
        return { rarity: 'common', iconId: b.id, name: `${ITEMS[b.id].name} x${b.count}` };
      }
      if (r < 0.85) { // rare: pet charm (dupes impossible — refunds instead)
        const charms = Object.values(PET_DEFS).map((d) => d.charm);
        const missing = charms.filter((c) => inventory.count(c) === 0);
        if (!missing.length) {
          inventory.addCoins(60);
          return { rarity: 'rare', iconId: 'coin', name: '+60 coins', note: 'Every pet collected — refunded!' };
        }
        const c = missing[Math.floor(Math.random() * missing.length)];
        inventory.add(c, 1);
        return { rarity: 'rare', iconId: c, name: ITEMS[c].name, note: 'New pet unlocked! Summon with [P]' };
      }
      if (r < 0.97) { // epic: mount whistle
        const pool = ['mount_trotter', 'mount_clucky', 'mount_shellsworth'].filter((m) => inventory.count(m) === 0);
        if (!pool.length) {
          inventory.addCoins(90);
          return { rarity: 'epic', iconId: 'coin', name: '+90 coins', note: 'Duplicate mount — refunded!' };
        }
        const mnt = pool[Math.floor(Math.random() * pool.length)];
        inventory.add(mnt, 1);
        return { rarity: 'epic', iconId: mnt, name: ITEMS[mnt].name, note: 'New mount! Ride with [M]' };
      }
      // legendary: Nimbus or the gacha-exclusive Blossom
      const pool = ['mount_nimbus', 'mount_blossom'].filter((m) => inventory.count(m) === 0);
      if (!pool.length) {
        inventory.addCoins(250);
        return { rarity: 'legendary', iconId: 'coin', name: '+250 coins', note: 'Every legend collected — refunded!' };
      }
      const mnt = pool[Math.floor(Math.random() * pool.length)];
      inventory.add(mnt, 1);
      addShake(0.3);
      return { rarity: 'legendary', iconId: mnt, name: ITEMS[mnt].name, note: '✨ LEGENDARY MOUNT ✨' };
    },
  };

  const panels = createPanels(hudRoot, {
    inventory, forge, character, weaponType: cls.weaponType, audio, pets, isTouch: touch,
    economy, cooking, estate, gacha,
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
    onSummonMount: (id) => summonMount(id),
    mountsRef: () => mounts,
    skillsApi,
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

  // --- mounts: summon / dismiss (M key or Companions panel) ---
  function summonMount(mountId) {
    if (!mountId) { mounts.dismiss(player); return; }
    if (inventory.count(MOUNT_DEFS[mountId].item) <= 0) return;
    mounts.summon(mountId, player);
    audio.sfx('mount');
    hud.toastText(`Riding ${MOUNT_DEFS[mountId].name}!`);
  }
  function dismountIfRiding() {
    if (mounts.state.active) mounts.dismiss(player);
  }
  function toggleMount() {
    if (mounts.state.active) { dismountIfRiding(); return; }
    // ride the best owned mount (last defined = most advanced)
    const owned = Object.keys(MOUNT_DEFS).filter((id) => inventory.count(MOUNT_DEFS[id].item) > 0);
    if (owned.length) summonMount(owned[owned.length - 1]);
    else hud.toastText('No mount yet — villagers offer mount quests!');
  }
  function xpMult() {
    const petId = pets.state.active;
    return petId && PET_DEFS[petId].perk.key === 'xp' ? 1 + PET_DEFS[petId].perk.value : 1;
  }
  if (saved?.pet && PET_DEFS[saved.pet] && inventory.count(PET_DEFS[saved.pet].charm) > 0) {
    summonPet(saved.pet);
  }
  if (saved?.mount && MOUNT_DEFS[saved.mount] && inventory.count(MOUNT_DEFS[saved.mount].item) > 0) {
    summonMount(saved.mount);
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
    skillPoints++;
    hud.banner(`LEVEL ${lv}!`);
    hud.toastText('+1 Skill Point — press K to upgrade a skill');
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
    if (e.isWorldBoss) {
      // bonus haul: forge stones + a charm you don't own yet if possible
      drops = [...drops, { id: 'forge_stone', count: 4 + Math.floor(Math.random() * 4) }];
      const missing = Object.values(PET_DEFS).map((d) => d.charm).filter((c) => inventory.count(c) === 0);
      const pool = missing.length ? missing : Object.values(PET_DEFS).map((d) => d.charm);
      drops.push({ id: pool[Math.floor(Math.random() * pool.length)], count: 1 });
      hud.banner(`⚔ ${e.bossName.toUpperCase()} DEFEATED! ⚔`);
      audio.sfx('quest_done');
      addShake(0.5);
      bossState.killed = true;
    }
    for (const d of drops) pickups.spawn(d.id, d.count, e.mesh.position);
    quests.event('kill', { type: e.type, worldBoss: !!e.isWorldBoss });
  }

  function dealHit(e, mult = 1) {
    const def = inventory.equippedDef();
    const crit = player.consumeCritBuff() || Math.random() < 0.12 + player.buffVal('crit');
    const dmg = Math.max(1, Math.round(def.dmg * totalMult() * forgeMult() * mult * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2)));
    dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), dmg, crit ? 'crit' : '');
    if (crit) { audio.sfx('crit'); addShake(0.18); }
    else addShake(0.07);
    enemyMgr.damage(e, dmg, player.state.pos, onKill);
  }

  // --- basic attack per weapon type (auto-aims at the nearest enemy) ---
  function autoFace() {
    const target = aimPoint();
    if (target) {
      const dx = target.x - player.state.pos.x, dz = target.z - player.state.pos.z;
      if (dx * dx + dz * dz > 0.04) player.state.facing = Math.atan2(dx, dz);
    }
  }
  function doAttack() {
    if (panels.anyOpen() || dialog.isOpen() || player.state.dead) return;
    if (player.state.busy) { doInteract(); return; } // busy fishing -> attack acts as strike
    dismountIfRiding();
    const def = inventory.equippedDef();
    if (!def?.weapon) return;
    if (!player.tryAttack(def)) return;

    autoFace();

    const dur = player.state.attackDur * 1000;
    const p = player.state;

    if (def.type === 'bow') {
      audio.sfx('swing_bow');
      setTimeout(() => {
        if (p.dead) return;
        autoFace(); // re-acquire the nearest enemy at release
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
        autoFace();
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
        autoFace(); // track the target through both stabs
        const hits = resolveMeleeHit(p, def, enemyMgr.enemies, 1);
        for (const h of hits) dealHit(h.enemy, 1);
      };
      setTimeout(stab, dur * 0.25);
      setTimeout(stab, dur * 0.7);
    } else {
      audio.sfx('swing');
      setTimeout(() => {
        if (p.dead) return;
        autoFace();
        const hits = resolveMeleeHit(p, def, enemyMgr.enemies, 1);
        for (const h of hits) dealHit(h.enemy, 1);
      }, dur * 0.45);
    }
  }

  function doRoll() {
    if (panels.anyOpen() || dialog.isOpen()) return;
    fishing.cancel();
    dismountIfRiding();
    if (player.tryRoll(input, cam.yaw)) audio.sfx('roll');
  }

  function doJump() {
    if (panels.anyOpen() || dialog.isOpen()) return;
    if (player.tryJump()) audio.sfx('jump');
  }

  // --- AFK auto-battle: hands-free grinding. Approaches the nearest enemy,
  // auto-attacks, auto-casts ready skills, and sips a tonic when low. ---
  let autoBattle = false;
  let autoSkillT = 0;
  function toggleAutoBattle() {
    autoBattle = !autoBattle;
    dismountIfRiding();
    hud.setAuto?.(autoBattle);
    hud.toastText(autoBattle ? 'Auto-Battle ON — grinding hands-free. Press B to stop.' : 'Auto-Battle off.');
    audio.sfx('ui');
  }
  function autoBattleTick(dt) {
    if (!autoBattle || player.state.dead || player.state.busy || panels.anyOpen() || dialog.isOpen() || fishing.state.afk) return;
    const e = nearestEnemy(26); // roam a bit to find prey
    if (!e) return;
    const dx = e.mesh.position.x - player.state.pos.x, dz = e.mesh.position.z - player.state.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    player.state.facing = Math.atan2(dx, dz);
    const def = inventory.equippedDef();
    const reach = (def.type === 'bow' || def.type === 'staff') ? (def.range - 2) : (def.range || 2) + 0.2;
    // walk into range for melee / kite distance for ranged
    if (dist > reach) {
      const sp = cls.speed * 0.85 * dt;
      const nx = player.state.pos.x + (dx / dist) * sp, nz = player.state.pos.z + (dz / dist) * sp;
      if (terrain.walkable(nx, nz, player.state.pos.y)) {
        player.state.pos.x = nx; player.state.pos.z = nz;
        player.state.pos.y += (terrain.surfaceY(nx, nz) - player.state.pos.y) * Math.min(1, dt * 14);
      }
    }
    if (dist <= (def.range || 2) + 1.5) doAttack();
    // rotate through ready skills
    autoSkillT -= dt;
    if (autoSkillT <= 0) {
      autoSkillT = 2.2;
      for (const sid of skillIds) { if (skillSys.ready(sid) && player.state.stamina > 20) { castSkill(sid); break; } }
    }
    // survival: sip a tonic when badly hurt
    if (player.state.hp < player.state.maxHp * 0.3 && inventory.count('tonic') > 0) usePotion();
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
  skillsApi.skillSys = skillSys;
  skillSys.load(saved?.skills);
  const skillIds = cls.skills;

  function castSkill(id) {
    if (panels.anyOpen() || dialog.isOpen() || player.state.dead) return;
    dismountIfRiding();
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
      // Pip runs the village shop; Master NXR spins the wonder capsules
      extra: def.id === 'merchant'
        ? { label: '◆ OPEN SHOP', onClick: () => { close(); panels.toggle('shop'); } }
        : def.id === 'nxr'
          ? { label: '🎰 WONDER CAPSULES', onClick: () => { close(); panels.toggle('gacha'); } }
          : null,
      onClose: close,
    });
  }

  // --- gathering: chop birches / mine ore nodes with your weapon ---
  function gatherHit(node) {
    player.playSwing(0.9);
    audio.sfx(node.kind === 'birch' ? 'swing' : 'forge_hit');
    addShake(0.08);
    setTimeout(() => {
      const drops = gathering.hit(node);
      if (drops === null) return;
      audio.sfx('hit');
      for (const d of drops) pickups.spawn(d.id, d.count, node.mesh.position);
      if (drops.length) audio.sfx(node.kind === 'birch' ? 'death_thud' : 'forge_ok');
    }, 180);
  }

  // seed priority when planting: whichever you own, cheapest first
  function seedToPlant() {
    for (const id of ['seed_wheat', 'seed_berry', 'seed_pumpkin']) {
      if (inventory.count(id) > 0) return id;
    }
    return null;
  }

  // --- interact system: one context-sensitive action (F / mobile ★ button) ---
  function currentInteraction() {
    if (player.state.dead || panels.anyOpen() || dialog.isOpen()) return null;
    if (fishing.state.afk) return { label: 'Stop AFK fishing', run: () => fishing.cancel() };
    if (fishing.state.phase === 'bite') return { label: 'Reel in!', run: () => fishing.strike() };
    if (fishing.state.phase === 'waiting') return { label: 'Wait for it...', run: () => fishing.strike() };

    // quest-giving NPCs take priority when you're near them (so you never
    // miss a quest); ambient chatter is a fallback near the bottom
    const npc = npcs.nearest(player.state.pos, 2.3);
    if (npc && npc.questMark) return { label: `Talk to ${npc.def.name}`, run: () => openDialog(npc) };

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

    // farm plots: harvest ready crops / plant seeds
    const plot = farming.nearest(player.state.pos, 1.9);
    if (plot) {
      if (plot.owned && plot.seed && plot.stage >= 2) {
        return {
          label: 'Harvest',
          run: () => {
            const crop = farming.harvest(plot);
            if (crop) { pickups.spawn(crop.id, crop.count, new THREE.Vector3(plot.x, plot.y, plot.z)); audio.sfx('catch'); }
          },
        };
      }
      if (plot.owned && !plot.seed) {
        const seed = seedToPlant();
        if (seed) {
          return {
            label: `Plant ${ITEMS[seed].name}`,
            run: () => {
              if (farming.plant(plot, seed)) { inventory.remove(seed, 1); audio.sfx('ui'); }
            },
          };
        }
      }
    }

    // your estates: buy land / open the build menu
    const land = housing.nearest(player.state.pos, 3.5);
    if (land && !land.built) {
      return {
        label: land.owned ? 'Build your house' : `Land for sale (${LAND_PRICE}c)`,
        run: () => { audio.sfx('ui'); panels.toggle('estate'); },
      };
    }

    // gathering nodes
    const node = gathering.nearest(player.state.pos, 2.2);
    if (node) {
      return {
        label: node.kind === 'birch' ? `Chop birch (${node.hits})` : `Mine ore (${node.hits})`,
        run: () => gatherHit(node),
      };
    }

    // camp rangers: talk for a full heal
    const ranger = camps.nearestRanger(player.state.pos, 2.4);
    if (ranger && player.state.hp < player.state.maxHp) {
      return {
        label: 'Rest with Ranger (full heal)',
        run: () => {
          player.state.hp = player.state.maxHp;
          player.state.sinceHurt = 999;
          audio.sfx('potion');
          particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#7dff8a', 16);
          hud.toastText(camps.rangerLine(ranger));
        },
      };
    }

    // village landmarks you can walk right up to (no chasing wandering NPCs):
    // Pip's market stall = shop, the capsule machine = gacha, the anvil = forge
    const near = (spot, r = 2.6) => spot && ((spot.x - player.state.pos.x) ** 2 + (spot.z - player.state.pos.z) ** 2 < r * r);
    if (near(npcs.stallSpot)) return { label: 'Shop — buy & sell', run: () => { audio.sfx('ui'); panels.toggle('shop'); } };
    if (near(npcs.gachaSpot)) return { label: 'Wonder Capsules (gacha)', run: () => { audio.sfx('ui'); panels.toggle('gacha'); } };
    if (near(npcs.forgeSpot)) return { label: 'Forge your weapon', run: () => { audio.sfx('ui'); panels.toggle('forge'); } };

    // campfires: cook the catch of the day
    const fire = camps.nearestFire(player.state.pos, 2.6)
      || (((npcs.cookfire.x - player.state.pos.x) ** 2 + (npcs.cookfire.z - player.state.pos.z) ** 2 < 2.6 * 2.6) ? npcs.cookfire : null);
    if (fire) return { label: 'Cook', run: () => { audio.sfx('ui'); panels.toggle('cook'); } };

    if (fishing.canFish()) {
      return { label: touch ? 'Fish  (💤 = AFK)' : 'Fish  ·  G = AFK mode', afk: true, run: () => fishing.cast() };
    }
    // ambient villagers (Nyanya, Barong, etc.) — chat as the lowest-priority action
    if (npc) return { label: `Talk to ${npc.def.name}`, run: () => openDialog(npc) };
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
    if (e.code === 'KeyK') { audio.sfx('ui'); panels.toggle('skills'); }
    if (e.code === 'KeyH') { audio.sfx('ui'); panels.toggle('help'); }
    if (e.code === 'KeyF') doInteract();
    if (e.code === 'Space') { e.preventDefault(); doJump(); }
    if (e.code === 'KeyM') toggleMount();
    if (e.code === 'KeyN') toggleWorldMap();
    if (e.code === 'KeyG') { // AFK fishing toggle
      if (fishing.toggleAfk()) hud.toastText('AFK fishing on — common fish only. Move to stop.');
    }
    if (e.code === 'KeyB') toggleAutoBattle(); // AFK auto-battle grinding
    if (e.code === 'Escape') { panels.closeAll(); dialog.hide(); fishing.cancel(); worldmap.hide(); }
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

  // --- world map overlay (N / tap the minimap) ---
  const worldmap = createWorldMap({ minimap, terrain });
  function toggleWorldMap() {
    audio.sfx('ui');
    worldmap.toggle({ player, npcs, camps, lands: housing, enemies: enemyMgr.enemies, quests });
  }
  hud.els.minimapCanvas.style.pointerEvents = 'auto';
  hud.els.minimapCanvas.style.cursor = 'pointer';
  hud.els.minimapCanvas.addEventListener('click', toggleWorldMap);

  hud.bind({
    onSkill: castSkill,
    onPotion: usePotion,
    onMenu: (which) => {
      if (which === 'auto') { toggleAutoBattle(); return; }
      audio.sfx('ui'); panels.toggle(which);
    },
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
      onJump: doJump,
      onPotion: usePotion,
      onSkill: castSkill,
      onInteract: doInteract,
      onAfkFish: () => {
        if (fishing.toggleAfk()) hud.toastText('AFK fishing on — common fish only. Move to stop.');
      },
      onCloseMenu: () => { audio.sfx('ui'); panels.closeAll(); dialog.hide(); worldmap.hide(); fishing.cancel(); },
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
        skills: skillSys.serialize(),
        skillPoints,
        farm: farming.serialize(),
        houses: housing.serialize(),
        pet: pets.state.active,
        mount: mounts.state.active,
        pos: [player.state.pos.x, player.state.pos.y, player.state.pos.z],
      }));
    } catch { /* storage full/blocked: ignore */ }
  }
  setInterval(save, 8000);
  window.addEventListener('beforeunload', save);

  // debug/testing handle (used by automated verification)
  window.__semesta = {
    player, enemyMgr, inventory, leveling, terrain, cam, camera, skillSys, forge,
    projectiles, character, quests, pets, mounts, chests, weather, fishing, npcs, lighting,
    camps, gathering, farming, housing, economy, cooking, estate, gacha, worldmap,
    summonMount, summonPet, inSafeZone,
  };

  setBoot(1); await frame();
  bootEl.classList.add('hidden');
  setTimeout(() => bootEl.remove(), 800);
  hud.banner(`WELCOME TO RIVERBROOK, ${character.name.toUpperCase()}`);
  if (!saved) {
    const hintKey = touch ? 'the ★ button' : 'F';
    setTimeout(() => hud.toastText('Villagers with a "!" have quests for you. Press H anytime for the full guide.'), 2600);
    setTimeout(() => hud.toastText(`Talk to Pip at the market stall to buy & sell (${hintKey}).`), 6200);
    setTimeout(() => hud.toastText(`Master NXR the koala runs the gacha capsule machine — try your luck!`), 9800);
    setTimeout(() => hud.toastText(`${touch ? 'Tap the minimap' : 'Press N'} for the world map: village, camps & land.`), 13400);
    setTimeout(() => hud.toastText(`Mine glowing-orange ore rocks & chop birch trees (${hintKey} ×3) for building materials.`), 17000);
  }

  // --- world boss scheduler: one rises every 3 minutes ---
  const bossState = { timer: 180, current: null, killed: false };
  const BOSS_KINDS = ['king_slime', 'elder_treant', 'stone_colossus'];
  function tickWorldBoss(dt) {
    const alive = bossState.current && !bossState.current.dead;
    if (!alive && bossState.current) {
      // it either died (banner handled in onKill) or wandered off
      if (!bossState.killed && bossState.current.expired) {
        hud.toastText('The world boss has left...');
      }
      bossState.current = null;
    }
    if (alive) return;
    bossState.timer -= dt;
    if (bossState.timer <= 0) {
      bossState.timer = 180;
      const kind = BOSS_KINDS[Math.floor(Math.random() * BOSS_KINDS.length)];
      const boss = enemyMgr.spawnWorldBoss(player.state.pos, kind);
      if (boss) {
        bossState.current = boss;
        bossState.killed = false;
        hud.banner(`⚠ WORLD BOSS: ${boss.bossName.toUpperCase()} HAS RISEN! ⚠`);
        hud.toastText('Follow the gold marker on the minimap!');
        audio.sfx('roar');
        addShake(0.45);
      }
    }
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
    autoBattleTick(dt);

    // moving cancels an in-progress fishing session
    if (fishing.state.phase !== 'idle' && (input.joy.active ||
        input.keys.has('KeyW') || input.keys.has('KeyA') || input.keys.has('KeyS') || input.keys.has('KeyD'))) {
      fishing.cancel();
    }

    const hr = lighting.state.minutes / 60;
    const isNight = hr >= 19.5 || hr < 5.5;

    tickWorldBoss(dt);
    enemyMgr.update(dt, player.state, time, isNight);
    projectiles.update(dt, enemyMgr.enemies, player.state, particles);
    pickups.update(dt, player.state.pos, (id, count) => {
      inventory.add(id, count);
      hud.toast(id, count);
      audio.sfx('pickup');
    }, 1 + player.buffVal('magnet'));
    decor.update(dt, player.state.pos, time, isNight);
    water.update(dt, time);
    weather.update(dt, player.state.pos, time);
    lighting.state.weatherDim = weather.state.intensity;
    lighting.update(dt, player.state.pos);
    particles.update(dt);
    dmgNums.update(dt);
    skillSys.update(dt);
    npcs.update(dt, player.state.pos, time);
    chests.update(dt, player.state.pos);
    camps.update(dt, player.state.pos, time);
    gathering.update(dt);
    landmarks.update(dt, time);
    farming.update(dt);
    pets.update(dt, player.state, time);
    mounts.update(dt, player, terrain);
    fishing.update(dt, time);
    updateCamera(dt);

    // resting: campfires and your own homes heal quickly
    if (!player.state.dead && player.state.hp < player.state.maxHp) {
      let resting = false;
      const fire = camps.nearestFire(player.state.pos, CAMP_HEAL_R);
      if (fire) resting = true;
      if (!resting) {
        for (const l of housing.lands) {
          if (l.built && (l.x - player.state.pos.x) ** 2 + (l.z - player.state.pos.z) ** 2 < HOUSE_HEAL_R * HOUSE_HEAL_R) {
            resting = true; break;
          }
        }
      }
      if (resting) {
        player.state.hp = Math.min(player.state.maxHp, player.state.hp + player.state.maxHp * 0.06 * dt);
        if (Math.random() < dt * 1.2) {
          particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#7dff8a', 2);
        }
      }
    }

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
      minimap.update(player.state.pos, player.state.facing, enemyMgr.enemies, { lands: housing.lands });
      touchUI?.update(skillSys, inventory.count('tonic'));
      // interact prompt
      const it = currentInteraction();
      hud.setPrompt(it ? { key: 'F', label: it.label } : null);
      touchUI?.setPrompt(it ? { label: it.label, afk: it.afk } : null);
      // mobile ESC-replacement close button while any panel/dialog/map is open
      touchUI?.setMenuOpen(panels.anyOpen() || dialog.isOpen() || worldmap.isOpen());
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
