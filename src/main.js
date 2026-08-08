// SEMESTA — voxel action RPG 2.5D.
// Flow: Character Creation -> build the world -> game loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Terrain, buildTerrainMesh } from './world/terrain.js';
import { buildDecor } from './world/decor.js';
import { buildWater } from './world/water.js';
import { createChests } from './world/chests.js';
import { createWeather } from './world/weather.js';
import { createCamps, CAMP_SAFE_R, CAMP_HEAL_R } from './world/camps.js';
import { createGathering } from './world/gather.js';
import { createLandmarks } from './world/landmarks.js';
import { createIsles } from './world/isles.js';
import { buildHorizon } from './world/horizon.js';
import { buildWind } from './world/wind.js';
import { createWildlife } from './world/wildlife.js';
import { createWatercraft, CRAFT_DEFS } from './systems/watercraft.js';
import { setupLighting } from './gfx/lighting.js';
import { createParticles } from './gfx/particles.js';
import { makeTerrainAtlas } from './gfx/textures.js';
import { createPlayer } from './entities/player.js';
import { createEnemyManager, WORLD_BOSSES } from './entities/enemies.js';
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
import { ITEMS, RARITY, RARITY_ORDER, GACHA_WEAPONS } from './systems/items.js';
import { createWardrobe, cosmeticsBySlot } from './systems/cosmetics.js';
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
import { getQuality, onQualityChange, buildSnapshot } from './gfx/quality.js';
import { createGfxPanel } from './ui/gfxpanel.js';
import { createDailies } from './systems/dailies.js';
import { createGamePass, PASS_PRICES } from './systems/gamepass.js';
import { createSkillTree, SKILLS as SKILL_DEFS } from './systems/skilltree.js';
import {
  cloudConfigured, reconcile, writeLocal, startCloudAutosave, currentUser,
} from './net/auth.js';
import { createStory } from './systems/story.js';
import { createLoadScreen } from './ui/loadscreen.js';
import { itemIconUrl } from './gfx/textures.js';

const SAVE_KEY = 'semesta.save.v3';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Both saves exist and were written within minutes of each other, so neither is
 * obviously the one the player wants. Ask rather than guess: silently throwing
 * away somebody's afternoon is the worst thing a sync can do, and it is the one
 * mistake they can never undo.
 */
function askWhichSave(info) {
  return new Promise((resolve) => {
    const when = (t) => new Date(t).toLocaleString();
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;
      align-items:center;justify-content:center;background:rgba(6,10,14,0.88);
      font-family:'Pixelify Sans',system-ui,sans-serif;color:#e8ecd8`;
    el.innerHTML = `<div style="max-width:min(440px,90vw);padding:22px;
        background:linear-gradient(180deg,#1a1f14,#0e120b);
        box-shadow:inset 0 0 0 2px #46523c,0 14px 40px rgba(0,0,0,.6);text-align:center">
      <h3 style="margin:0 0 6px;font-size:13px;letter-spacing:3px;color:#d8b866">TWO SAVES FOUND</h3>
      <p style="font-size:10px;line-height:1.8;color:#a8b596;margin:0 0 16px">
        This device and your account both have recent progress.<br>Which one do you want to keep playing?</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button data-p="local" style="flex:1;min-width:150px;padding:10px;border:0;cursor:pointer;
          font-family:inherit;font-size:10px;color:#f4ecd4;background:linear-gradient(180deg,#3a4a2c,#25301c);
          box-shadow:0 -2px 0 #6a8a4a,0 2px 0 #141a10">THIS DEVICE<br>
          <small style="color:#9fb08c">Lv ${info.localLevel} · ${when(info.localAt)}</small></button>
        <button data-p="cloud" style="flex:1;min-width:150px;padding:10px;border:0;cursor:pointer;
          font-family:inherit;font-size:10px;color:#f4ecd4;background:linear-gradient(180deg,#2c3a4a,#1c2530);
          box-shadow:0 -2px 0 #4a7a8a,0 2px 0 #101418">MY ACCOUNT<br>
          <small style="color:#9fb08c">Lv ${info.cloudLevel} · ${when(info.cloudAt)}</small></button>
      </div>
      <p style="font-size:8px;color:#7d8a70;margin:14px 0 0">The other one is not deleted — it stays where it is.</p>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      el.remove();
      resolve(b.dataset.p);
    });
  });
}

const bootEl = document.getElementById('boot');
// The cinematic load screen replaces the plain boot bar once the menu is done
// with the splash. `setBoot` keeps the same call shape as before so every build
// stage below reads the same, it just reports a LABEL alongside the number now.
let loadScreen = null;
const setBoot = (p, label) => loadScreen?.stage(label, p);
// rAF doesn't fire in hidden tabs — fall back to a timer so the game still
// boots and simulates in the background (throttled).
const schedule = (fn) => {
  if (document.visibilityState === 'hidden') setTimeout(() => fn(performance.now()), 50);
  else requestAnimationFrame(fn);
};
const frame = () => new Promise((r) => schedule(r));

async function main() {
  bootEl.style.display = 'none';
  // CLOUD SAVE, IF THERE IS ONE.
  //
  // Local stays primary: this resolves to the local save whenever the player is
  // signed out, offline, or the project is not configured. Signing in is a way
  // to carry progress between devices, never a requirement to play — and a bad
  // night at Supabase must not be able to cost anyone their session.
  let saved = loadSave();
  if (cloudConfigured()) {
    try {
      const res = await Promise.race([
        reconcile(askWhichSave),
        // never let a slow network hold the menu hostage
        new Promise((r) => setTimeout(() => r(null), 4000)),
      ]);
      if (res?.save) {
        saved = res.save;
        if (res.from === 'cloud') writeLocal(res.save);
      }
    } catch (e) { console.warn('[semesta] cloud sync skipped:', e.message); }
  }
  const audio = createAudio();

  // The shipped PNG has a solid white background, so it has to be keyed out
  // before it goes anywhere on screen. cleanImage caches, so the menu and the
  // load screen share one decode.
  const cleanLogo = await cleanImage(logoUrl);

  // opening: loading splash -> main menu (New / Continue / About)
  const { action } = await showOpening(saved);
  audio.start(); // menu click = first gesture, safe for autoplay
  audio.setMood('menu'); // dreamy title/creation track — the world flips it to day/night
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

  // hand over to the cinematic loader: a different pixel vignette every boot
  bootEl.style.display = 'none';
  loadScreen = createLoadScreen({ logoSrc: cleanLogo });
  document.body.appendChild(loadScreen.el);
  await frame();
  await init(config, continued ? saved : null, audio);
}

async function init(character, saved, audio) {
  setBoot(0.04, 'Opening the canvas…'); await frame();
  const cls = CLASSES[character.cls];

  // --- renderer & scene (sized by the GRAPHICS settings) ---
  let qual = getQuality();
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // FILMIC GRADE. This is the single biggest reason a scene reads as "nicer":
  // ACES rolls highlights off instead of clipping them to flat white, so a
  // sunlit roof, a lantern flame and the sea glitter all keep their colour.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  // render scale is quadratic on fill rate — the single biggest perf lever
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75) * qual.renderScale);
  renderer.shadowMap.enabled = qual.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('game');
  document.getElementById('app').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9ed4e8');
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, qual.drawDistance);
  // remember which non-live choices this world was built with, so the panel can
  // honestly tag the rest "NEXT RUN"
  const builtWith = buildSnapshot();

  // POST CHAIN: a subtle bloom is what makes lanterns, torch fire, skill FX and
  // the sun glitter on the sea actually GLOW rather than just being bright
  // pixels. The mip chain is not cheap to allocate, so it is built once and
  // simply bypassed when the FX knob turns bloom off. Touch devices never build
  // it at all — UnrealBloom is too heavy for a phone whatever the preset says.
  let composer = null, bloomPass = null;
  if (!isTouchDevice()) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // Strength and threshold are tuned so FLAMES and glowing FX bloom hard
    // while lit surfaces stay crisp. A lower threshold would smear the whole
    // world; a wider radius is what gives the glow its soft falloff.
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.52,   // strength
      0.85,   // radius — softer, wider halo
      0.72,   // threshold: flames, sparks and sun glitter, not lit walls
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  const usePost = () => composer && qual.bloom;

  setBoot(0.1, 'Painting the pixel tiles…'); await frame();

  // --- world ---
  setBoot(0.14, 'Raising the terrain…'); await frame();
  const terrain = new Terrain();
  setBoot(0.28, 'Carving the coastline and the sea…'); await frame();
  scene.add(buildTerrainMesh(terrain, makeTerrainAtlas()));
  setBoot(0.42, 'Planting the forest…'); await frame();
  const decor = buildDecor(terrain, scene);
  setBoot(0.56, 'Filling the lakes and the ocean…'); await frame();
  const water = buildWater(terrain, scene);
  // distant ranges beyond the playable bound — the terrain mesh has to stop
  // somewhere, and this is what stops that line reading as the edge of a box
  const horizon = buildHorizon(scene, '#9ec49a', qual.drawDistance);
  // WIND: one shared vector everything leans off, plus drifting leaves
  const wind = buildWind();
  const lighting = setupLighting(scene);
  const particles = createParticles(scene);
  const weather = createWeather(scene, terrain, particles);
  const npcs = createNPCs(scene, terrain, decor.blocked, particles, decor.clearArea);
  const chests = createChests(scene, terrain, decor.blocked, particles);
  const camps = createCamps(scene, terrain, decor.blocked, particles);
  const gathering = createGathering(scene, terrain, decor.blocked, particles);
  // landmarks avoid the rest camps (footprint circles), and housing parcels
  // avoid BOTH — no more buildings merging into each other
  const landmarks = createLandmarks(scene, terrain, decor.blocked,
    camps.camps.map((c) => ({ x: c.x, z: c.z, r: 4.5 })));

  // scrub any scenery (trees/rocks/bushes) that would clip through structures —
  // camps, landmarks and land parcels were placed AFTER the forest grew.
  // Each footprint clears its OWN radius (+margin), so big builds like the
  // school or pool never keep a tree poking through their far corner.
  for (const c of camps.camps) decor.clearArea(c.x, c.z, 4.2);
  for (const f of landmarks.foots) decor.clearArea(f.x, f.z, f.r + 1.2);
  const farming = createFarming(scene, terrain, decor.blocked, particles);
  // the field is worked soil — no boulder or bush may be left standing in it
  for (const pl of farming.plots) decor.clearArea(pl.x, pl.z, 1.6);
  const housing = createHousing(scene, terrain, decor.blocked, particles, landmarks.foots);
  // keep land parcels free of clipping scenery too (covers houses loaded from save)
  for (const l of housing.lands) decor.clearArea(l.x, l.z, 3.8);

  // --- the archipelago: tropical island dressing + the marina pier ---
  const isles = createIsles(scene, terrain, decor.blocked);
  // ambient wildlife: things that REACT to you, so the map isn't just decorated
  const wildlife = createWildlife(scene, terrain, particles);
  const watercraft = createWatercraft(scene, terrain, particles, {
    owns: (item) => inventory.count(item) > 0,
    onBoard: (def) => {
      dailies.event('sail'); gamepass.event('sail'); audio.sfx('mount'); hud.toastText(`${def.name} — steer with the stick, [F] to step off.`); },
    onLeave: () => { audio.sfx('ui'); },
    onBeach: () => audio.sfx('hit'),
    onDenied: (def) => hud.toastText(`${def.name} is locked — buy the key at Pip's Shop.`),
  });
  if (isles.marina) {
    // both craft wait at the marina, a stride apart along the pier
    const { x, z, dir } = isles.marina;
    const off = dir + Math.PI / 2;
    // a full boat-length apart, not 1.5 — the dinghy alone is 3.4 long
    watercraft.moor('dinghy', x + Math.cos(off) * 2.6, z + Math.sin(off) * 2.6, dir);
    watercraft.moor('jetski', x - Math.cos(off) * 2.6, z - Math.sin(off) * 2.6, dir);
  }
  // LAUNCH POSTS: one at the marina and one at every island pier. Walk up and
  // call your boat in rather than swimming back across the map to fetch it.
  for (const st of isles.launches || []) watercraft.addStation(st);
  for (const d of landmarks.docks || []) {
    // the lake docks get one too, so the dinghy is useful on fresh water
    watercraft.addStation({ x: d.x, z: d.z, dir: Math.atan2(-d.x, -d.z), name: 'Lake dock' });
  }

  // --- safe zones: the village, rest camps and your homes repel monsters ---
  const VILLAGE_SAFE_R = 13;
  // CALM WATER: the lakes and the swimming pool are places you go to fish, swim
  // and stand about — having something charge you out of the reeds there is
  // exactly the wrong feeling. They are treated as sanctuaries, which the enemy
  // AI already fully respects (no spawns, repelled at the boundary, aggro'd
  // monsters disengage and wander away).
  const calmZones = [];
  for (const L of terrain.lakes) {
    calmZones.push({
      x: L.x - terrain.size / 2,
      z: L.z - terrain.size / 2,
      r: L.r + 5,
    });
  }

  function inSafeZone(x, z) {
    for (const c of calmZones) {
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return c;
    }
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
  setBoot(0.74, 'Waking the villagers…'); await frame();

  // --- systems & entities ---
  const leveling = createLeveling();
  const inventory = createInventory(cls.startWeapon);
  const forge = createForge(inventory);
  const quests = createQuests({ inventory, leveling });
  const player = createPlayer(terrain, decor.blocked, character, particles, {
    // out of breath at sea: tow the hero to the nearest beach rather than drown
    // them — the sea should be inviting, not a death trap
    onSwimExhausted: () => {
      hud.toastText('Out of breath — swimming back to shore!');
      audio.sfx('deny');
    },
  });
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
    // the world regenerates every boot (landmarks/camps land in new spots) —
    // if the saved position now sits inside a fresh structure footprint,
    // free the hero instead of leaving them stuck in a wall
    {
      const [ix, iz] = terrain.cellOf(player.state.pos.x, player.state.pos.z);
      if (decor.blocked.has(`${ix},${iz}`)
        || !terrain.walkable(player.state.pos.x, player.state.pos.z, terrain.surfaceY(player.state.pos.x, player.state.pos.z))) {
        moveToClearSpot(player.state.pos.x, player.state.pos.z, 1.2);
      }
      player.state.pos.y = terrain.surfaceY(player.state.pos.x, player.state.pos.z);
    }
  } else {
    // starter kit: a faithful mount, a couple of seeds and pocket change
    inventory.add('mount_sprig', 1);
    inventory.add('seed_wheat', 2);
    inventory.addCoins(15);
  }

  const enemyMgr = createEnemyManager(terrain, decor.blocked, scene, particles, projectiles, {
    /**
     * A world boss casting one of its phase moves.
     *
     * `stage` is 'tell' — put the telegraph on the ground and give the player
     * time to leave — or 'fire', when it actually lands. Every move reads its
     * radius and colour from the phase entry, so adding a boss is data, not
     * another branch in here.
     */
    onBossCast(e, move, stage) {
      const at = e.mesh.position.clone();
      const r = move.r || 5;
      if (stage === 'tell') {
        // the ring you have to get out of
        particles.shockwave?.(at.clone().setY(at.y + 0.06), move.color, r, move.tell);
        particles.runeCircle?.(at.clone().setY(at.y + 0.08), move.color, r * 0.9, move.tell);
        audio.sfx('boss_tell');
        return;
      }
      audio.sfx('boss_hit');
      addShake(0.5);
      particles.burst(at.clone().add(new THREE.Vector3(0, 0.8, 0)), move.color, 26, 4, 6, 0.7);
      particles.shockwave?.(at.clone().setY(at.y + 0.05), move.color, r * 1.15, 0.5);
      const d = Math.hypot(player.state.pos.x - at.x, player.state.pos.z - at.z);
      const inside = d < r;

      switch (move.move) {
        case 'split': {
          // the King Slime throws off two small slimes
          for (let i = 0; i < 2; i++) enemyMgr.spawnOne?.(at, false, 'slime');
          hud.toastText('The King Slime splits!');
          break;
        }
        case 'summon': {
          for (let i = 0; i < 3; i++) enemyMgr.spawnOne?.(at, false);
          hud.toastText('The Tide Warden calls the deep.');
          break;
        }
        case 'heal': {
          e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.08);
          particles.fountain?.(at.clone().add(new THREE.Vector3(0, 1.2, 0)), '#b6e08a', 16);
          hud.toastText('The Elder Treant draws on its roots.');
          break;
        }
        case 'harden': {
          e.shieldT = 4;                   // read by the damage path below
          hud.toastText('The Colossus sets itself.');
          break;
        }
        case 'freeze': {
          if (inside) { player.addBuff?.('slow', 2.5, 0.45); hud.toastText('Frozen solid!'); }
          break;
        }
        default: {
          // everything else is a damaging area: quake, wave, firewall, comet...
          if (inside) {
            const taken = player.takeDamage(e.def.dmg * (move.move === 'inferno' ? 1.5 : 1));
            if (taken > 0) {
              dmgNums.spawn(player.state.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), taken, 'player-hit');
              hud.showHurt();
            }
          }
        }
      }
    },
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
    getPlayerLevel: () => leveling.state.level, // monsters scale every 5 levels
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
        { id: 'potion_xp', name: 'Scholar Brew', desc: 'DOUBLE XP for 1 hour. Re-drinking extends it.', price: ITEMS.potion_xp.buy },
        { id: 'potion_luck', name: 'Lucky Charm', desc: 'DOUBLE gacha luck for 1 hour. Re-drinking extends it.', price: ITEMS.potion_luck.buy },
        { id: 'craft_dinghy', name: 'Dinghy Oars', desc: 'Unlocks the Bobbin Dinghy at the marina.', price: ITEMS.craft_dinghy.buy, soldout: inventory.count('craft_dinghy') > 0 },
        { id: 'craft_jetski', name: 'Jetski Key', desc: 'Unlocks the Wavedash Jetski at the marina.', price: ITEMS.craft_jetski.buy, soldout: inventory.count('craft_jetski') > 0 },
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
      // COOKING SKILL. Big Pot is the one that changes the loop: the same
      // ingredients sometimes make two portions, which is what turns cooking
      // from a chore into something worth levelling.
      const portions = Math.random() < skilltree.bonus('cooking', 'doubleCook') ? 2 : 1;
      inventory.add(out, portions);
      audio.sfx('craft');
      particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffb055', 8, 2);
      hud.toast(out, portions);
      if (portions > 1) hud.toastText('The pot stretched to two.');
      skilltree.gain('cooking', portions > 1 ? 'uncommon' : 'common');
      dailies?.event('cook'); gamepass?.event('cook');
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
      decor.clearArea?.(land.x, land.z, 3.2); // no trees clipping the house
      quests.event('build');
      // the house is a solid building — nudge the player out to the door side so
      // they aren't trapped inside the freshly-blocked footprint
      moveToClearSpot(land.x, land.z, 3.0);
      audio.sfx('quest_done');
      addShake(0.3);
      hud.banner(`${d.name.toUpperCase()} BUILT!`);
    },
  };

  // relocate the player to the nearest walkable, unblocked cell outside a
  // building footprint (prefers the +z "door" side)
  function moveToClearSpot(cx, cz, startR) {
    const clear = (x, z) => {
      const [ix, iz] = terrain.cellOf(x, z);
      return !decor.blocked.has(`${ix},${iz}`) && terrain.walkable(x, z, terrain.surfaceY(x, z));
    };
    // door side first, then a widening ring
    for (let r = startR; r <= startR + 5; r += 0.6) {
      const tries = [[0, 1], [0.5, 0.87], [-0.5, 0.87], [1, 0], [-1, 0], [0.5, -0.87], [-0.5, -0.87], [0, -1]];
      for (const [dx, dz] of tries) {
        const x = cx + dx * r, z = cz + dz * r;
        if (clear(x, z)) {
          player.state.pos.set(x, terrain.surfaceY(x, z), z);
          player.state.vy = 0; player.state.grounded = true;
          return;
        }
      }
    }
  }

  // --- teleport home (T): back to your house, or the village if you have none.
  // Short channel so it can't cheese combat; always lands on a CLEAR walkable
  // cell OUTSIDE any building footprint (never inside your own house).
  const tele = { channel: 0, cd: 0 };
  function teleportHome() {
    if (player.state.dead || player.state.busy) return;
    // you cannot teleport off a hull — step off first, or the craft comes with
    // you and ends up buried in the hillside at the far end
    if (watercraft.state.active) {
      hud.toastText('Step off the boat first.');
      audio.sfx('deny');
      return;
    }
    if (tele.channel > 0) { tele.channel = 0; hud.toastText('Teleport cancelled.'); return; }
    if (tele.cd > 0) { audio.sfx('deny'); hud.toastText(`Teleport recharging (${Math.ceil(tele.cd)}s)...`); return; }
    tele.channel = 1.6;
    audio.sfx('teleport');
    hud.toastText('Channeling teleport... stand still!');
  }
  function tickTeleport(dt) {
    if (tele.cd > 0) tele.cd -= dt;
    if (tele.channel <= 0) return;
    // moving or getting hit interrupts the channel
    if (player.state.isMoving || player.state.dead) { tele.channel = 0; return; }
    if (Math.random() < dt * 18) {
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#8ae0d8', 2);
    }
    tele.channel -= dt;
    if (tele.channel > 0) return;
    tele.cd = 20;
    fishing.cancel();
    dismountIfRiding();
    const home = housing.lands.find((l) => l.built);
    particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#8ae0d8', 18, 2.5);
    if (home) {
      // land beside the door — never inside the blocked footprint
      moveToClearSpot(home.x, home.z, 2.6);
    } else {
      player.state.pos.set(terrain.spawn.x, terrain.surfaceY(terrain.spawn.x, terrain.spawn.z), terrain.spawn.z);
      player.state.vy = 0; player.state.grounded = true;
    }
    audio.sfx('teleport');
    particles.shockwave(player.state.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#8ae0d8', 2.6, 0.4);
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#c8fff5', 16);
    hud.banner(home ? 'WELCOME HOME' : 'BACK TO RIVERBROOK');
  }

  // --- Master NXR's gacha v2: six-tier rarity ladder with soft pity ---
  // Weighted tiers -> a prize from that tier's pool. Unique prizes (cosmetics,
  // charms, whistles) never dupe: owned ones refund coins per rarity instead.
  const GACHA_WEIGHTS = [
    ['common', 40], ['uncommon', 26], ['rare', 16.5],
    ['epic', 10], ['legendary', 5.5], ['mythic', 2],
  ];
  const GACHA_POOLS = {
    common: [
      { bundle: 'forge_stone', count: 3 }, { bundle: 'tonic', count: 2 },
      { bundle: 'seed_berry', count: 3 }, { bundle: 'iron_ore', count: 2 },
      'hat_straw', 'hat_leaf', 'back_pack',
    ],
    uncommon: [
      { bundle: 'forge_stone', count: 6 }, { bundle: 'hardwood', count: 5 },
      'hat_bandana', 'hat_miner', 'hat_chef', 'back_sprout', 'back_shell', 'trail_leaf',
    ],
    rare: ['hat_wizard', 'hat_catears', 'hat_pirate', 'back_bubble', 'back_balloon', 'trail_petal', 'trail_frost', { petCharm: true }],
    epic: ['hat_viking', 'hat_pumpkin', 'back_butterfly', 'back_koi', 'trail_ember', 'mount_trotter', 'mount_clucky', 'mount_shellsworth', 'mount_pebble', { gweapon: 'epic' }],
    legendary: ['charm_glimmer', 'charm_nox', 'hat_crown', 'hat_kitsune', 'back_phoenix', 'trail_star', 'mount_nimbus', 'mount_blossom', { gweapon: 'legendary' }],
    mythic: ['charm_seraphi', 'mount_aurora', 'hat_halo', 'back_prism', 'trail_rainbow', { gweapon: 'mythic' }],
  };
  const gacha = {
    price: 100,
    pity: saved?.gachaPity ?? 0, // rolls since the last epic-or-better
    RARITY, RARITY_ORDER,
    odds: GACHA_WEIGHTS,
    // full prize catalogue per rarity — powers the panel's PRIZES browser
    prizeList() {
      const out = {};
      for (const [rarity, pool] of Object.entries(GACHA_POOLS)) {
        out[rarity] = pool.map((entry) => {
          if (typeof entry === 'object' && entry.bundle) {
            return { iconId: entry.bundle, name: `${ITEMS[entry.bundle].name} x${entry.count}`, kind: 'SUPPLY' };
          }
          if (typeof entry === 'object' && entry.petCharm) {
            return { iconId: 'charm_moku', name: 'Pet Charm (random)', kind: 'PET', note: 'a pet you don\'t own yet' };
          }
          if (typeof entry === 'object' && entry.gweapon) {
            const wid = GACHA_WEAPONS[entry.gweapon][cls.weaponType];
            return { iconId: wid, name: ITEMS[wid].name, kind: 'WEAPON', owned: inventory.state.weapons.has(wid) };
          }
          const d = ITEMS[entry];
          const kind = d.cosmetic ? 'COSMETIC' : d.petCharm ? 'PET' : d.mountId ? 'MOUNT' : 'ITEM';
          return { iconId: entry, name: d.name, kind, owned: inventory.count(entry) > 0 };
        });
      }
      return out;
    },
    rollRarity() {
      // soft pity: every roll past 8 without epic+ adds weight to the top tiers
      const bonus = Math.max(0, this.pity - 8) * 4;
      // LUCK multiplies the weight of everything above common — a Lucky Charm
      // does not guarantee a jackpot, it tilts the whole table
      const L = luckMult();
      const w = GACHA_WEIGHTS.map(([r, base]) =>
        [r, (base + (r === 'epic' || r === 'legendary' ? bonus : r === 'mythic' ? bonus * 0.5 : 0))
          * (r === 'common' ? 1 : L)]);
      let total = 0; for (const [, x] of w) total += x;
      let r = Math.random() * total;
      for (const [rar, x] of w) { r -= x; if (r <= 0) return rar; }
      return 'common';
    },
    roll() {
      if (!inventory.spendCoins(this.price)) return null;
      dailies.event('gacha'); gamepass.event('gacha');
      return this.rollOnce();
    },
    // 10-pull: pay for nine, get ten — one shared reveal show in the panel
    price10: 900,
    roll10() {
      if (!inventory.spendCoins(this.price10)) return null;
      dailies?.event('gacha'); gamepass?.event('gacha');
      const prizes = [];
      for (let i = 0; i < 10; i++) prizes.push(this.rollOnce());
      return prizes;
    },
    rollOnce() {
      const rarity = this.rollRarity();
      this.pity = (rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') ? 0 : this.pity + 1;

      const note = {
        cosmetic: 'New cosmetic! Equip it in the Wardrobe [O]',
        petCharm: 'New pet unlocked! Summon with [P]',
        mountId: 'New mount! Ride with [M]',
      };
      // resolve a prize from the tier pool, skipping owned uniques
      const pool = GACHA_POOLS[rarity];
      const entries = [...pool].sort(() => Math.random() - 0.5);
      for (const entry of entries) {
        if (typeof entry === 'object' && entry.bundle) {
          inventory.add(entry.bundle, entry.count);
          return { rarity, iconId: entry.bundle, name: `${ITEMS[entry.bundle].name} x${entry.count}` };
        }
        if (typeof entry === 'object' && entry.gweapon) {
          // an exclusive weapon matching your class's weapon type
          const wid = GACHA_WEAPONS[entry.gweapon][cls.weaponType];
          if (!wid || inventory.state.weapons.has(wid)) continue;
          inventory.add(wid, 1);
          if (rarity === 'legendary' || rarity === 'mythic') addShake(0.3);
          return { rarity, iconId: wid, name: ITEMS[wid].name, note: 'Exclusive weapon! Equip it in your Bag [Tab]' };
        }
        if (typeof entry === 'object' && entry.petCharm) {
          const missing = Object.values(PET_DEFS).filter((d) => !d.gachaOnly).map((d) => d.charm)
            .filter((c) => inventory.count(c) === 0);
          if (!missing.length) continue;
          const c = missing[Math.floor(Math.random() * missing.length)];
          inventory.add(c, 1);
          return { rarity, iconId: c, name: ITEMS[c].name, note: note.petCharm };
        }
        if (inventory.count(entry) > 0) continue; // unique already owned
        inventory.add(entry, 1);
        const def = ITEMS[entry];
        const kind = def.cosmetic ? 'cosmetic' : def.petCharm ? 'petCharm' : def.mountId ? 'mountId' : null;
        if (rarity === 'legendary' || rarity === 'mythic') addShake(0.3);
        return { rarity, iconId: entry, name: def.name, note: kind ? note[kind] : undefined };
      }
      // whole tier owned — refund by rarity
      const refund = RARITY[rarity].refund;
      inventory.addCoins(refund);
      return { rarity, iconId: 'coin', name: `+${refund} coins`, note: `${RARITY[rarity].name} tier complete — refunded!` };
    },
  };

  // --- wardrobe: equip cosmetics earned from gacha & level rewards ---
  const wardrobe = createWardrobe(player);
  wardrobe.load(saved?.wardrobe);
  const wardrobeApi = {
    bySlot: cosmeticsBySlot(),
    state: wardrobe.state,
    owned: (id) => inventory.count(id) > 0,
    equip: (slot, id) => {
      wardrobe.equip(slot, id);
      if (id) {
        audio.sfx('craft');
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
          RARITY[ITEMS[id]?.rarity || 'common'].color, 12);
      } else audio.sfx('ui');
    },
    // full appearance editing — the same body/hair/outfit options as character
    // creation, applied live to the hero (and persisted with the save)
    appearance: {
      config: character,
      rename(name) {
        character.name = name;
        hud.setName(name);
      },
      apply() {
        player.applyAppearance();
        // re-attach equipped cosmetics onto the fresh rig
        for (const slot of ['hat', 'back']) {
          if (wardrobe.state[slot]) wardrobe.equip(slot, wardrobe.state[slot]);
        }
        hud.refreshPortrait?.();
        audio.sfx('craft');
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.9, 0)), '#ffd23e', 10);
      },
    },
  };

  // --- retention: 30-day check-in, session play-time tiers, daily quests ---
  // one grant() speaks for all three so the dailies module never touches the bag
  const dailies = createDailies({
    grant(r) {
      if (r.coins) inventory.addCoins(r.coins);
      if (r.item) inventory.add(r.item, r.n || 1);
      if (r.cosmetic) inventory.add(r.cosmetic, 1);
      if (r.mount) inventory.add(r.mount, 1);
      audio.sfx(r.grand ? 'reveal_legendary' : r.big ? 'reveal_rare' : 'pickup');
      if (r.big || r.grand) {
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ffd23e', r.grand ? 30 : 18);
        if (r.grand) addShake(0.26);
      }
    },
    onToast: (t) => hud.toastText(t),
    onBanner: (t) => hud.banner(t),
  });
  dailies.load(saved?.dailies);

  // --- LIFE SKILLS: fishing, farming and cooking each level on their own ---
  const skilltree = createSkillTree({
    onLevel: (skill, lv) => {
      const S2 = SKILL_DEFS.find((x) => x.id === skill);
      hud.banner(`${S2.name.toUpperCase()} LEVEL ${lv}`);
      hud.toastText(`${S2.icon} ${S2.name} reached level ${lv} — a skill point is waiting.`);
      audio.sfx('levelup');
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), S2.color, 14);
    },
    onToast: (msg) => hud.toastText(msg),
  });
  skilltree.load(saved?.skilltree);

  // --- GAMEPASS: a season pass bought with gold you earned ---
  const gamepass = createGamePass({
    grant(r) {
      if (r.coins) inventory.addCoins(Math.round(r.coins * coinMult()));
      if (r.item) inventory.add(r.item, r.n || 1);
      if (r.cosmetic) inventory.add(r.cosmetic, 1);
      if (r.mount) inventory.add(r.mount, 1);
      if (r.petCharm) inventory.add(r.petCharm, 1);
      audio.sfx(r.grand ? 'reveal_mythic' : r.big ? 'reveal_epic' : 'pickup');
      if (r.big || r.grand) {
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)),
          '#ffd23e', r.grand ? 34 : 20);
        if (r.grand) addShake(0.3);
      }
    },
    onToast: (t) => hud.toastText(t),
    onBanner: (t) => hud.banner(t),
  });
  gamepass.load(saved?.gamepass);

  // --- STORY: the reason any of this is happening ---
  const story = createStory({
    grant(r) {
      if (r.coins) inventory.addCoins(r.coins);
      if (r.item) inventory.add(r.item, r.n || 1);
      if (r.cosmetic) inventory.add(r.cosmetic, 1);
      if (r.mount) inventory.add(r.mount, 1);
    },
    onChapter(ch) {
      audio.sfx(ch.reward?.grand ? 'levelup_big' : 'quest_done');
      hud.showStory?.(ch);
    },
  });
  story.load(saved?.story);
  // things the story asks about that nothing else tracks
  const lore = { kills: 0, swam: false, visitedIsland: false };
  const restedCamps = new Set();   // distinct camps rested at, for the daily
  let storyT = 0;

  const panels = createPanels(hudRoot, {
    inventory, forge, character, weaponType: cls.weaponType, audio, pets, isTouch: touch,
    economy, cooking, estate, gacha, wardrobe: wardrobeApi, dailies, gamepass,
    skilltree,
    onDrink: (id) => drinkBooster(id),
    // how long a booster has left, so the bag can say ACTIVE 42m
    onBoostActive: (id) => {
      const b = player.state.buffs.find((x) => x.id === id);
      if (!b || b.t <= 0) return null;
      const m = Math.ceil(b.t / 60);
      return m >= 1 ? `${m}m` : `${Math.ceil(b.t)}s`;
    },
    // the in-game panel already has its own header, so drop the inner title
    gfxPanelFactory: () => createGfxPanel({ builtWith, sfx: (n) => audio.sfx(n), title: false }),
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
        dailies.event('forge'); gamepass.event('forge');
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
  // XP and LUCK are the two stats the boosters and the pass move. Everything
  // multiplies together so a Scholar Brew on a premium pass with an xp pet is
  // genuinely worth drinking.
  function xpMult() {
    const petId = pets.state.active;
    const pet = petId && PET_DEFS[petId].perk.key === 'xp' ? PET_DEFS[petId].perk.value : 0;
    const potion = player.buffVal('xpBoost');       // 1 = double
    const pass = gamepass.perks().xp;
    return (1 + pet) * (1 + potion) * (1 + pass);
  }
  /** Extra gacha weight on the top tiers, from a Lucky Charm and the pass. */
  function luckMult() {
    return 1 + player.buffVal('luckBoost') + gamepass.perks().luck;
  }
  function coinMult() {
    return 1 + gamepass.perks().coin;
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

  // --- level up: golden celebration + a reward drop every level ---
  function levelRewards(lv) {
    const rewards = [];
    const coins = 15 + lv * 5;
    inventory.addCoins(coins);
    rewards.push({ icon: 'coin', label: `+${coins} coins` });
    if (lv % 3 === 0) {
      inventory.add('tonic', 2);
      rewards.push({ icon: 'tonic', label: 'Health Tonic x2' });
    }
    if (lv % 5 === 0) {
      // milestone: a cosmetic you don't own yet (common → rare)
      const pool = ['hat_straw', 'hat_leaf', 'back_pack', 'hat_bandana', 'hat_miner', 'hat_chef',
        'back_sprout', 'back_shell', 'trail_leaf', 'hat_wizard', 'hat_catears', 'hat_pirate',
        'back_bubble', 'back_balloon', 'trail_petal', 'trail_frost']
        .filter((id) => inventory.count(id) === 0);
      if (pool.length) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        inventory.add(id, 1);
        rewards.push({ icon: id, label: `${ITEMS[id].name} (wardrobe!)`, rarity: ITEMS[id].rarity });
      } else {
        inventory.add('forge_stone', 5);
        rewards.push({ icon: 'forge_stone', label: 'Forge Stone x5' });
      }
    }
    rewards.push({ icon: null, label: '+1 Skill Point [K]' });
    return rewards;
  }
  leveling.state.onLevelUp = (lv) => {
    applyLevelStats();
    player.state.hp = player.state.maxHp;
    skillPoints++;
    const rewards = levelRewards(lv);
    audio.sfx('levelup_big');
    addShake(0.28);
    // golden pillar: ring + fountain + rising sparks around the hero
    const base = player.state.pos.clone();
    particles.shockwave(base.clone().add(new THREE.Vector3(0, 0.15, 0)), '#ffd23e', 3.2, 0.5);
    particles.fountain(base.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffe27a', 30);
    particles.fountain(base.clone().add(new THREE.Vector3(0, 1.0, 0)), '#fff6c8', 18);
    setTimeout(() => {
      if (player.state.dead) return;
      particles.shockwave(player.state.pos.clone().add(new THREE.Vector3(0, 0.15, 0)), '#fff6c8', 4.2, 0.4);
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#ffd23e', 20);
    }, 320);
    hud.levelUp?.(lv, rewards) ?? hud.banner(`LEVEL ${lv}!`);
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
    // the daily board now asks for SPECIFIC prey, so a kill has to report what
    // it was, whether it was elite, and where and when it happened
    dailies.event('kill', {
      kind: e.type || e.def?.id, elite: !!e.elite,
      where: terrain.inSnow?.(e.mesh.position.x, e.mesh.position.z) ? 'snow' : 'land',
      when: (lighting.state.time / 60 >= 19.5 || lighting.state.time / 60 < 5.5) ? 'night' : 'day',
    });
    gamepass.event('kill'); lore.kills++;
    if (e.isWorldBoss) { dailies.event('boss'); gamepass.event('boss'); }
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

    // swing FX: gacha weapons erupt in their aura color (sparks + a snappy
    // ring); crafted tier-2+ weapons get a lighter burst in their blade color
    const fxColor = def.glow || (def.tier >= 2 ? def.blade[1] : null);
    const glowFx = fxColor ? () => {
      const f = p.facing;
      const at = p.pos.clone().add(new THREE.Vector3(Math.sin(f) * 0.9, 0.8, Math.cos(f) * 0.9));
      particles.burst(at, fxColor, def.glow ? 9 : 4, 2.6, 2, 0.5);
      if (def.glow) {
        particles.shockwave(new THREE.Vector3(at.x, p.pos.y + 0.15, at.z), def.glow, 1.4, 0.25);
      }
    } : null;

    if (def.type === 'bow') {
      audio.sfx('swing_bow');
      setTimeout(() => {
        if (p.dead) return;
        autoFace(); // re-acquire the nearest enemy at release
        glowFx?.();
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
        glowFx?.();
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
        glowFx?.();
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
        glowFx?.();
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

  /**
   * Drink a booster. These are separate from the health tonic: they set a
   * long-running buff rather than healing, and re-drinking EXTENDS the timer
   * instead of stacking a second copy — stacking would let someone hoard ten and
   * play the whole session at 10x.
   */
  function drinkBooster(id) {
    const def = ITEMS[id];
    if (!def?.buff) return false;
    if (inventory.count(id) <= 0) { audio.sfx('deny'); return false; }
    inventory.remove(id, 1);
    const key = def.buff === 'xp' ? 'xpBoost' : 'luckBoost';
    const existing = player.state.buffs.find((b) => b.id === id);
    const secs = def.mins * 60;
    player.addBuff({ id, t: (existing ? Math.max(0, existing.t) : 0) + secs, [key]: def.mult, icon: id });
    hud.banner(`${def.name.toUpperCase()} — 2x ${def.buff.toUpperCase()} FOR ${def.mins} MIN`);
    audio.sfx('potion');
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)),
      def.buff === 'xp' ? '#8fd6e8' : '#ffd23e', 16);
    return true;
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
    if (skillSys.cast(id) !== false) dailies.event('skill'); gamepass.event('skill');
  }

  // --- fishing ---
  const fishing = createFishing({
    scene, terrain, player, particles, audio,
    hooks: {
      isNight: () => { const hr = lighting.state.time / 60; return hr >= 19.5 || hr < 5.5; },
      skillBonus: (key) => skilltree.bonus('fishing', key),
      onCatch(fishId, xp, rarity = 'common', extra = false) {
        inventory.add(fishId, 1);
        const gained = Math.round(xp * xpMult());
        // A CATCH CARD, not a toast. "You got something" told the player
        // nothing — not the species, not whether it was worth keeping.
        if (extra) hud.toastText(`A second ${ITEMS[fishId].name} came up with it!`);
        else hud.showCatch(fishId, rarity, gained, ITEMS[fishId].sell || 0);
        leveling.addXp(gained);
        quests.event('fish');
        dailies.event('fish', {
          rarity,
          where: terrain.inOcean?.(player.state.pos.x, player.state.pos.z) ? 'sea' : 'lake',
          when: (lighting.state.time / 60 >= 19.5 || lighting.state.time / 60 < 5.5) ? 'night' : 'day',
        });
        gamepass.event('fish');
        skilltree.gain('fishing', rarity);
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
      for (const d of drops) {
        pickups.spawn(d.id, d.count, node.mesh.position);
        dailies.event('gather', d.count); gamepass.event('gather', d.count);
      }
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

  // --- interact system: gathers ALL nearby actions in priority order so the
  // HUD can offer a PRIMARY (F / ★) and a distinct SECONDARY (R / ★₂) — this
  // is what stops "Plant" and "Talk" from fighting over one button. ---
  function gatherInteractions() {
    if (player.state.dead || panels.anyOpen() || dialog.isOpen()) return [];
    const list = [];
    const add = (kind, label, run, extra = {}) => list.push({ kind, label, run, ...extra });

    // RIDING: while you're on a hull, the only thing the button does is get off
    if (watercraft.state.active) {
      const def = CRAFT_DEFS[watercraft.state.active];
      return [{ kind: 'craft', label: `Step off the ${def.name}`, run: () => watercraft.leave(player) }];
    }

    if (fishing.state.afk) return [{ kind: 'fish', label: 'Stop AFK fishing', run: () => fishing.cancel() }];
    if (fishing.state.phase === 'bite') return [{ kind: 'fish', label: 'Reel in!', run: () => fishing.strike() }];
    if (fishing.state.phase === 'waiting') return [{ kind: 'fish', label: 'Wait for it...', run: () => fishing.strike() }];

    const near = (spot, r = 3.2) => spot && ((spot.x - player.state.pos.x) ** 2 + (spot.z - player.state.pos.z) ** 2 < r * r);

    // LAUNCH POST: call your boat to the pier you are standing on. Checked
    // before the moored-craft test so that standing at a post with your boat
    // already there still offers "ride" first and "summon the other one" second.
    {
      const st = watercraft.nearestStation(player.state.pos, 3.0);
      if (st) {
        const own = watercraft.owned();
        if (!own.length) {
          add('launch', 'Boat launch — buy a key at Pip’s Shop',
            () => { audio.sfx('deny'); hud.toastText('You have no craft yet. Pip sells the dinghy oars and the jetski key.'); });
        } else {
          // offer whichever craft is NOT already sitting here
          const here = watercraft.nearest(player.state.pos, 6);
          const pick = own.find((id) => !here || here.id !== id) || own[0];
          const def = CRAFT_DEFS[pick];
          add('launch', `Launch the ${def.name}`, () => {
            const m = watercraft.summon(pick, st);
            if (m) { audio.sfx('teleport'); hud.toastText(`${def.name} is in the water.`); }
            else { audio.sfx('deny'); hud.toastText('That craft is already out here.'); }
          });
        }
      }
    }

    // village landmarks (tight radius) — highest priority so a wandering
    // villager can't hijack the stall/gacha/anvil button
    // a moored craft beats a wandering villager for the button, same as a landmark
    {
      const m = watercraft.nearest(player.state.pos, 2.8);
      if (m) {
        const def = CRAFT_DEFS[m.id];
        const owned = inventory.count(def.item) > 0;
        add('craft', owned ? `Ride the ${def.name}` : `${def.name} — key sold at Pip's Shop`,
          () => { if (owned) watercraft.board(m.id, player); else { audio.sfx('deny'); hud.toastText(`${def.name} needs its key — Pip stocks it for ${def.item === 'craft_jetski' ? ITEMS.craft_jetski.buy : '?'}c.`); } });
      }
    }

    if (near(npcs.stallSpot, 2.0)) add('shop', 'Shop — buy & sell', () => { audio.sfx('ui'); panels.toggle('shop'); });
    if (near(npcs.gachaSpot, 2.0)) add('gacha', 'Wonder Capsules (gacha)', () => { audio.sfx('ui'); panels.toggle('gacha'); });
    if (near(npcs.forgeSpot, 2.0)) add('forge', 'Forge your weapon', () => { audio.sfx('ui'); panels.toggle('forge'); });

    // farm plots FIRST-CLASS: harvest/plant get their own slot so they never
    // collide with a nearby villager's Talk button
    const plot = farming.nearest(player.state.pos, 1.9);
    if (plot && plot.owned && plot.seed && plot.stage >= 2) {
      add('farm', 'Harvest crop', () => {
        const seedId = plot.seed;
        const crop = farming.harvest(plot);
        if (crop) {
          // FARMING SKILL. Heavy Yield adds crops, Seed Saver returns the seed,
          // and Perennial occasionally leaves the plant standing and fully grown
          // — three nodes you notice rather than three hidden percentages.
          let n = crop.count;
          if (Math.random() < skilltree.bonus('farming', 'extraCrop')) n++;
          pickups.spawn(crop.id, n, new THREE.Vector3(plot.x, plot.y, plot.z));
          if (Math.random() < skilltree.bonus('farming', 'seedBack') && seedId) {
            inventory.add(seedId, 1);
            hud.toastText('The seed came back with it.');
          }
          if (Math.random() < skilltree.bonus('farming', 'regrow') && seedId) {
            farming.plant(plot, seedId);
            plot.stage = 2;                 // straight back to ripe
            hud.toastText('The plant is still standing.');
          }
          audio.sfx('catch');
          skilltree.gain('farming', n > 1 ? 'uncommon' : 'common');
          dailies.event('harvest'); gamepass.event('harvest');
        }
      });
    } else if (plot && plot.owned && !plot.seed) {
      const seed = seedToPlant();
      if (seed) add('farm', `Plant ${ITEMS[seed].name}`, () => {
        if (farming.plant(plot, seed)) { inventory.remove(seed, 1); audio.sfx('ui'); dailies.event('plant'); gamepass.event('plant'); }
      });
    }

    // quest-giving NPCs — you should never miss a quest
    const npc = npcs.nearest(player.state.pos, 2.3);
    if (npc && npc.questMark) add('talk', `Talk to ${npc.def.name}`, () => openDialog(npc));

    const chest = chests.nearest(player.state.pos, 2.1);
    if (chest) add('chest', 'Open chest', () => {
      const loot = chests.open(chest, ownedPetSet());
      if (!loot) return;
      audio.sfx('chest'); addShake(0.12);
      for (const d of loot) pickups.spawn(d.id, d.count, chest.mesh.position);
      quests.event('chest');
      dailies.event('chest'); gamepass.event('chest');
    });

    const land = housing.nearest(player.state.pos, 3.5);
    if (land && !land.built) {
      add('estate', land.owned ? 'Build your house' : `Land for sale (${LAND_PRICE}c)`,
        () => { audio.sfx('ui'); panels.toggle('estate'); });
    }

    const node = gathering.nearest(player.state.pos, 2.2);
    if (node) add('gather', node.kind === 'birch' ? `Chop birch (${node.hits})` : `Mine ore (${node.hits})`,
      () => gatherHit(node));

    const ranger = camps.nearestRanger(player.state.pos, 2.4);
    if (ranger && player.state.hp < player.state.maxHp) {
      add('heal', 'Rest with Ranger (full heal)', () => {
        // the daily asks for TWO camps, so the same fire twice must not count
        restedCamps.add(`${Math.round(ranger.x)},${Math.round(ranger.z)}`);
        if (restedCamps.size <= 6) dailies.event('camp');
        player.state.hp = player.state.maxHp; player.state.sinceHurt = 999;
        audio.sfx('potion');
        particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#7dff8a', 16);
        hud.toastText(camps.rangerLine(ranger));
      });
    }

    // looser landmark fallback (only if the tight pass didn't already add them)
    if (near(npcs.stallSpot) && !list.some((i) => i.kind === 'shop')) add('shop', 'Shop — buy & sell', () => { audio.sfx('ui'); panels.toggle('shop'); });
    if (near(npcs.gachaSpot) && !list.some((i) => i.kind === 'gacha')) add('gacha', 'Wonder Capsules (gacha)', () => { audio.sfx('ui'); panels.toggle('gacha'); });
    if (near(npcs.forgeSpot) && !list.some((i) => i.kind === 'forge')) add('forge', 'Forge your weapon', () => { audio.sfx('ui'); panels.toggle('forge'); });

    const dock = landmarks.docks?.find(
      (d) => (d.x - player.state.pos.x) ** 2 + (d.z - player.state.pos.z) ** 2 < 2.8 * 2.8);
    if (dock) add('shop', 'Fish Market — sell your catch', () => { audio.sfx('ui'); panels.toggle('shop'); });

    const fire = camps.nearestFire(player.state.pos, 2.6)
      || (((npcs.cookfire.x - player.state.pos.x) ** 2 + (npcs.cookfire.z - player.state.pos.z) ** 2 < 2.6 * 2.6) ? npcs.cookfire : null);
    if (fire) add('cook', 'Cook', () => { audio.sfx('ui'); panels.toggle('cook'); });

    if (fishing.canFish()) add('fish', touch ? 'Fish  (💤 = AFK)' : 'Fish  ·  G = AFK mode',
      () => fishing.cast(), { afk: true });

    // ambient villagers chat last
    if (npc && !npc.questMark) add('talk', `Talk to ${npc.def.name}`, () => openDialog(npc));

    return list;
  }
  // primary = list[0]; secondary = first entry of a DIFFERENT kind (so the two
  // buttons are always distinct actions, never a duplicate)
  function interactPair() {
    const list = gatherInteractions();
    const primary = list[0] || null;
    const secondary = primary ? list.find((i) => i.kind !== primary.kind) || null : null;
    return { primary, secondary };
  }
  function currentInteraction() { return gatherInteractions()[0] || null; }
  function ownedPetSet() {
    const owned = new Set();
    for (const [id, def] of Object.entries(PET_DEFS)) {
      if (inventory.count(def.charm) > 0) owned.add(id);
    }
    return owned;
  }
  function doInteract() {
    const it = interactPair().primary;
    if (it) it.run();
  }
  function doInteract2() {
    const it = interactPair().secondary;
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
    if (e.code === 'KeyO') { audio.sfx('ui'); panels.toggle('ward'); }
    // Shift also rolls. The on-screen hint and the guide both said it did;
    // right-click was the only binding that actually existed.
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') doRoll();
    if (e.code === 'KeyL') { audio.sfx('ui'); panels.toggle('life'); }
    if (e.code === 'KeyJ') { audio.sfx('ui'); panels.toggle('daily'); }
    if (e.code === 'KeyU') { audio.sfx('ui'); panels.toggle('pass'); }
    if (e.code === 'KeyT') teleportHome();
    if (e.code === 'KeyF') doInteract();
    if (e.code === 'KeyR') doInteract2(); // secondary nearby action
    if (e.code === 'Space') { e.preventDefault(); doJump(); }
    if (e.code === 'KeyM') toggleMount();
    if (e.code === 'KeyN') toggleWorldMap();
    if (e.code === 'KeyG') { // AFK fishing toggle
      if (fishing.toggleAfk()) hud.toastText('AFK fishing on — common fish only. Move to stop.');
    }
    if (e.code === 'KeyB') toggleAutoBattle(); // AFK auto-battle grinding
    if (e.code === 'Escape') { panels.closeAll(); dialog.hide(); fishing.cancel(); worldmap.hide(); hud.closeMenu?.(); }
    if (e.code === 'Digit1') castSkill(skillIds[0]);
    if (e.code === 'Digit2') castSkill(skillIds[1]);
    if (e.code === 'Digit3') castSkill(skillIds[2]);
    if (e.code === 'Digit4') usePotion();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  // ATTACK AND ROLL LISTEN ON THE WINDOW, not on the canvas.
  //
  // Bound to renderer.domElement, both were swallowed whenever the cursor
  // happened to be resting over any part of the HUD — the skill bar, the quest
  // tracker, a toast, the interact prompt. The click landed on that DOM node and
  // the game never saw it, which is exactly the reported "sometimes roll just
  // does not work, but it is fine on mobile" (mobile has its own button and
  // never goes through this path at all).
  //
  // The only things that legitimately swallow a click are real controls, so that
  // is the one case filtered out.
  const onUI = (e) => !!(e.target.closest && e.target.closest('button, input, select, textarea, a, .panel'));
  window.addEventListener('contextmenu', (e) => { if (!onUI(e)) e.preventDefault(); });
  window.addEventListener('mousedown', (e) => {
    if (onUI(e)) return;
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
    worldmap.toggle({ player, npcs, camps, lands: housing, enemies: enemyMgr.enemies, quests, docks: landmarks.docks, isles });
  }
  hud.els.minimapCanvas.style.pointerEvents = 'auto';
  hud.els.minimapCanvas.style.cursor = 'pointer';
  hud.els.minimapCanvas.addEventListener('click', toggleWorldMap);

  hud.bind({
    onSkill: castSkill,
    onPotion: usePotion,
    onMenu: (which) => {
      if (which === 'auto') { toggleAutoBattle(); return; }
      if (which === 'home') { teleportHome(); return; }
      if (which === 'map') { toggleWorldMap(); return; }
      audio.sfx('ui'); panels.toggle(which);
    },
    onRespawn: () => {
      if (watercraft.state.active) watercraft.leave(player, true);
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
      onInteract2: doInteract2,
      onAfkFish: () => {
        if (fishing.toggleAfk()) hud.toastText('AFK fishing on — common fish only. Move to stop.');
      },
      onCloseMenu: () => { audio.sfx('ui'); panels.closeAll(); dialog.hide(); worldmap.hide(); fishing.cancel(); },
      onCameraDrag: (d) => { cam.yaw -= d; },
      // pinch to zoom — same clamp as the desktop scroll wheel
      onCameraZoom: (d) => { cam.dist = Math.max(9, Math.min(30, cam.dist + d)); },
    });
  }

  // --- resize ---
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer?.setSize(innerWidth, innerHeight);
  });

  // --- GRAPHICS settings: live groups take effect immediately ---
  onQualityChange((nq) => {
    qual = nq;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75) * nq.renderScale);
    renderer.setSize(innerWidth, innerHeight);
    composer?.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = nq.shadows;
    camera.far = nq.drawDistance;
    camera.updateProjectionMatrix();
    lighting.applyQuality?.(nq);
  });

  // --- save game ---
  // The cloud copy is written on a much slower beat than the local one: saving
  // to localStorage costs nothing and happens constantly, but uploading every
  // few seconds would be pointless traffic and would burn a free tier for no
  // benefit. `mark()` just flags that something changed; the uploader batches.
  const cloud = cloudConfigured() ? startCloudAutosave(() => lastSave) : null;
  let lastSave = null;

  function save() {
    try {
      lastSave = {
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
        wardrobe: wardrobe.serialize(),
        gachaPity: gacha.pity,
        dailies: dailies.serialize(),
        skilltree: skilltree.serialize(),
        gamepass: gamepass.serialize(),
        story: story.serialize(),
        pos: [player.state.pos.x, player.state.pos.y, player.state.pos.z],
        at: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(lastSave));
      cloud?.mark();
    } catch { /* storage full/blocked: ignore */ }
  }
  setInterval(save, 8000);
  window.addEventListener('beforeunload', save);

  // debug/testing handle (used by automated verification)
  window.__semesta = {
    dailies, gamepass, story, skilltree, landmarks, watercraft, isles, hud, wind, drinkBooster, xpMult, luckMult, gfxQuality: { getQuality, buildSnapshot }, renderer, scene,
    composer, usePost,
    player, enemyMgr, inventory, leveling, terrain, cam, camera, skillSys, forge,
    projectiles, character, quests, pets, mounts, chests, weather, fishing, npcs, lighting,
    camps, gathering, farming, housing, economy, cooking, estate, gacha, worldmap,
    wardrobe, wardrobeApi, teleportHome, tele, panels, isles, watercraft, wildlife,
    summonMount, summonPet, inSafeZone,
  };

  // --- LIGHT BUDGET (dynamic, not destructive) ---
  // Every module adds its own point lights and they summed to 26+; Lambert
  // shading pays for each on every lit fragment, which is why dropping the
  // preset barely helped. The first attempt PRUNED the surplus at build time
  // and that was wrong — it killed the night, because the lanterns you were
  // walking past were the ones deleted. Instead keep every light and light only
  // the nearest `maxLights` to the player, re-sorted a few times a second. Full
  // night atmosphere wherever you actually are, bounded cost everywhere else.
  setBoot(0.84, 'Hanging the lanterns…'); await frame();
  const lightPool = [];
  scene.traverse((o) => { if (o.isPointLight) lightPool.push({ l: o, base: o.intensity }); });
  let lightSortT = 0;
  function tickLights(dt) {
    lightSortT -= dt;
    if (lightSortT > 0) return;
    lightSortT = 0.25;                       // 4x a second is plenty
    if (lightPool.length <= qual.maxLights) {
      for (const e of lightPool) e.l.visible = true;
      return;
    }
    const px = player.state.pos.x, pz = player.state.pos.z;
    const w = new THREE.Vector3();
    for (const e of lightPool) {
      e.l.getWorldPosition(w);
      e.d = (w.x - px) ** 2 + (w.z - pz) ** 2;
    }
    lightPool.sort((a, b) => a.d - b.d);
    // A light turned down to zero should not eat a budget slot. decor.js keeps
    // a pool of unassigned lantern lights parked at the origin at intensity 0,
    // and standing near spawn let six of them crowd out lamps that were
    // actually burning.
    let used = 0;
    for (let i = 0; i < lightPool.length; i++) {
      const e = lightPool[i];
      if (e.l.intensity <= 0.02) { e.l.visible = true; continue; }   // free, costs nothing
      e.l.visible = used < qual.maxLights;
      if (e.l.visible) used++;
    }
  }

  // --- PREWARM: pay the one-off costs now, while the picture is still up, so
  // the first bag open / first swing / first night doesn't hitch ---
  setBoot(0.88, 'Forging every item icon…'); await frame();
  for (const id of Object.keys(ITEMS)) {
    try { itemIconUrl(id); } catch { /* an item without an icon painter is fine */ }
  }
  setBoot(0.93, 'Compiling shaders…'); await frame();
  // three.js walks the whole scene graph and compiles every material's program,
  // which is the single biggest source of first-seconds stutter
  try { renderer.compile(scene, camera); } catch { /* older three: skip */ }
  renderer.render(scene, camera);
  if (usePost()) composer.render();   // compiles the bloom passes too
  setBoot(0.97, 'Tuning the orchestra…'); await frame();
  {
    const hrNow = lighting.state.minutes / 60;
    audio.setMood(hrNow >= 19.5 || hrNow < 5.5);
  }
  await frame();

  bootEl.remove();
  await loadScreen.done('Welcome to Anavela Universe');
  loadScreen = null;

  // DAILY GREETING: the check-in and the quest board are the reason to come
  // back, so they come to YOU on entry rather than waiting behind a menu tile.
  // Only when something is actually claimable — a popup that says "nothing for
  // you today" trains people to dismiss it without reading.
  setTimeout(() => {
    if (dailies.pending() > 0 && !panels.anyOpen() && !dialog.isOpen()) {
      audio.sfx('ui');
      panels.toggle('daily');
    }
  }, saved ? 1400 : 9000);   // a first-run player meets onboarding first
  hud.banner(`WELCOME TO ANAVELA UNIVERSE, ${character.name.toUpperCase()}`);
  if (!saved) {
    const hintKey = touch ? 'the ★ button' : 'F';
    // first-run onboarding overlay (controls + first steps) before the toasts
    hud.showOnboarding(touch);
    setTimeout(() => hud.toastText('Villagers with a "!" have quests for you. Press H anytime for the full guide.'), 2600);
    setTimeout(() => hud.toastText(`Talk to Pip at the market stall to buy & sell (${hintKey}).`), 6200);
    setTimeout(() => hud.toastText(`Master NXR the koala runs the gacha capsule machine — try your luck!`), 9800);
    setTimeout(() => hud.toastText(`${touch ? 'Tap the minimap' : 'Press N'} for the world map: village, camps & land.`), 13400);
    setTimeout(() => hud.toastText(`Mine glowing-orange ore rocks & chop birch trees (${hintKey} ×3) for building materials.`), 17000);
  }

  // --- world boss scheduler: one rises every 3 minutes ---
  const bossState = { timer: 180, current: null, killed: false };
  const BOSS_KINDS = Object.keys(WORLD_BOSSES);
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
      // WHICH BOSS depends on where you are and how strong you are: the Frost
      // Monarch only rises in the winter reach, the Tide Warden near open water,
      // and the Ember Tyrant not at all until level 15. A boss timer that always
      // rolled the same three from a flat list is why they felt interchangeable.
      const p2 = player.state.pos;
      const inSnow = !!terrain.inSnow?.(p2.x, p2.z);
      const nearSea = !!terrain.nearestShore?.(p2.x, p2.z, 30);
      const lv = leveling.state.level;
      const pool = BOSS_KINDS.filter((k) => {
        const d = WORLD_BOSSES[k];
        if (d.minLevel && lv < d.minLevel) return false;
        if (d.biome === 'snow' && !inSnow) return false;
        if (d.biome === 'coast' && !nearSea) return false;
        return true;
      });
      const kind = pool.length
        ? pool[Math.floor(Math.random() * pool.length)]
        : BOSS_KINDS[Math.floor(Math.random() * BOSS_KINDS.length)];
      const boss = enemyMgr.spawnWorldBoss(player.state.pos, kind);
      if (boss) {
        bossState.current = boss;
        bossState.killed = false;
        const title = WORLD_BOSSES[kind]?.title;
        hud.banner(`⚠ WORLD BOSS: ${boss.bossName.toUpperCase()}${title ? `, ${title.toUpperCase()}` : ''} ⚠`);
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
    // riding: watercraft owns the hull's heading, speed, height and wake
    if (watercraft.state.active) {
      watercraft.drive(dt, player, player.moveVecFor(input, cam.yaw), time);
    }
    watercraft.update(dt, time);
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
    isles.update(dt, time, isNight, player.state.pos);
    horizon.update(player.state.pos);
    wind.update(dt);
    wildlife.update(dt, player.state.pos, time);
    water.update(dt, time);
    weather.update(dt, player.state.pos, time);
    lighting.state.weatherDim = weather.state.intensity;
    lighting.update(dt, player.state.pos);
    particles.update(dt);
    dmgNums.update(dt);
    skillSys.update(dt);
    npcs.update(dt, player.state.pos, time, isNight);
    chests.update(dt, player.state.pos);
    camps.update(dt, player.state.pos, time);
    gathering.update(dt);
    // dayFrac 0 at dawn -> 1 at dusk, so garden sunflowers can track the sun
    landmarks.update(dt, time, player.state.pos,
      Math.max(0, Math.min(1, (lighting.state.minutes / 60 - 6) / 12)), wind);
    farming.update(dt);
    pets.update(dt, player.state, time);
    mounts.update(dt, player, terrain);
    fishing.update(dt, time);
    tickTeleport(dt);
    wardrobe.update(dt, time);
    // play-time milestones + badge the menu when a reward is waiting
    // wading into water dunks a land mount — it can't swim
    if (player.state.swimming && mounts.state.active) {
      mounts.dismiss(player);
      hud.toastText('Your mount waits on dry land.');
    }
    tickLights(dt);
    // STORY: checked once a second against the live game state, so chapters
    // advance by PLAYING rather than by triggering a script
    if (player.state.swimming) lore.swam = true;
    {
      const [ix, iz] = terrain.cellOf(player.state.pos.x, player.state.pos.z);
      if (terrain.isIslandCell(ix, iz)) {
        if (!lore.visitedIsland) { dailies.event('island'); gamepass.event('island'); }
        lore.visitedIsland = true;
      }
    }
    storyT -= dt;
    if (storyT <= 0) {
      storyT = 1;
      story.check({
        level: leveling.state.level,
        kills: lore.kills,
        swam: lore.swam,
        visitedIsland: lore.visitedIsland,
        hasHome: housing.lands.some((l) => l.built),
      });
    }
    // bloom leans in at night so the lanterns and fires carry the scene, and
    // backs off at noon so daylight does not turn into a smear
    if (bloomPass) {
      const hrB = lighting.state.minutes / 60;
      const dayness = Math.max(0, Math.min(1, (Math.cos(((hrB - 13) / 24) * Math.PI * 2) + 0.6) / 1.3));
      bloomPass.strength = 0.72 - dayness * 0.32;
    }
    dailies.tick(dt);
    hud.setMenuBadge?.(dailies.pending() + gamepass.pending() + skilltree.pending());
    hud.setLifeBadge?.(skilltree.pending());
    // cosmetic movement trail (wardrobe slot 3)
    if (player.state.isMoving && !player.state.dead) {
      const tr = wardrobe.trailColor(time);
      if (tr && Math.random() < dt * tr.rate) {
        particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.25, 0)),
          tr.color, 2, 1.1, tr.rise, 0.5);
      }
    }
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
    // out on open water gets its own brighter set of tracks
    audio.setMood(
      (watercraft.state.active || player.state.swimming) && terrain.inOcean(player.state.pos.x, player.state.pos.z)
        ? 'sea' : isNight,
    );
    audio.setRain(weather.state.intensity);

    hud.updateVitals(player, leveling, dt);
    hud.updateSkills(skillSys);
    hudT += dt;
    if (hudT > 0.2) {
      hudT = 0;
      hud.setWeather(weather.state.intensity > 0.4);
      hud.setClock(lighting.clockText(), isNight);
      minimap.update(player.state.pos, player.state.facing, enemyMgr.enemies,
        { lands: housing.lands, pin: worldmap.getPin() });
      // waypoint beacon: arrow + distance to the player's map mark
      const pin = worldmap.getPin();
      if (pin) {
        const dx = pin.x - player.state.pos.x, dz = pin.z - player.state.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.5) { // arrived — clear the mark with a little celebration
          worldmap.clearPin();
          hud.setBeacon(null);
          hud.toastText('You reached your mark!');
          particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ff8a5e', 12);
          audio.sfx('catch');
        } else {
          // rotate the arrow relative to the camera heading (screen-up)
          const worldAng = Math.atan2(dx, dz);
          const camAng = cam.yaw + Math.PI;
          hud.setBeacon({ angle: -(worldAng - camAng) - Math.PI / 2, dist });
        }
      } else {
        hud.setBeacon(null);
      }
      touchUI?.update(skillSys, inventory.count('tonic'));
      // interact prompts: primary (F / ★) + distinct secondary (R / ★₂)
      const { primary, secondary } = interactPair();
      hud.setPrompt(primary ? { key: 'F', label: primary.label } : null,
        secondary ? { key: 'R', label: secondary.label } : null);
      touchUI?.setPrompt(primary ? { label: primary.label, afk: primary.afk } : null,
        secondary ? { label: secondary.label } : null);
      // mobile: while ANY UI is up (panel, dialog, map, OR the ☰ popup) block
      // the joystick/camera capture zones so menu taps land on the buttons
      touchUI?.setMenuOpen(panels.anyOpen() || dialog.isOpen() || worldmap.isOpen() || hud.isMenuPopOpen());
    }

    if (usePost()) composer.render(); else renderer.render(scene, camera);
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
