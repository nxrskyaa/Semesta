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
import { createSpider } from './world/spider.js';
import { createRialoHub } from './world/rialohub.js';
// The one image asset outside logoasset's two branding files. The project rule
// is that art is procedural, and it holds for everything the game GENERATES —
// this is a supplied promotional banner hung on a board in the world, which is
// closer to the logo than to a texture, and it was asked for by name.
import rialoBannerUrl from '../logoasset/rialohub-banner.png';
import { createLandmarks } from './world/landmarks.js';
import { createIsles } from './world/isles.js';
import { buildHorizon } from './world/horizon.js';
import { buildWind } from './world/wind.js';
import { createNetClient, serverConfigured } from './net/client.js';
import { createRemotePlayers } from './net/remote.js';
import { createChat } from './ui/chat.js';
import { createWildlife } from './world/wildlife.js';
import { createWatercraft, CRAFT_DEFS } from './systems/watercraft.js';
import { setupLighting } from './gfx/lighting.js';
import { createParticles } from './gfx/particles.js';
import { makeTerrainAtlas } from './gfx/textures.js';
import { createPlayer } from './entities/player.js';
import { createEnemyManager, WORLD_BOSSES } from './entities/enemies.js';
import { BAND_SPECIES } from './entities/dungeonfoes.js';
import { createNPCs, makeQuestMark, NPC_DEFS } from './entities/npcs.js';
import { createPickups } from './entities/pickups.js';
import { createProjectiles } from './entities/projectiles.js';
import { createDamageNumbers, resolveMeleeHit } from './systems/combat.js';
import { createLeveling, MAX_LEVEL } from './systems/level.js';
import { createInventory } from './systems/inventory.js';
import { createForge, forgeMultiplier } from './systems/forge.js';
import { createSkillSystem, SKILLS, MAX_SKILL_LEVEL } from './systems/skills.js';
import { createClassTree, LOADOUT_SIZE } from './systems/classtree.js';
import { createStats } from './systems/stats.js';
import { showStats } from './ui/statspanel.js';
import { showAwakening, showSkillTree } from './ui/awaken.js';
import { createSummons } from './systems/summons.js';
import { skillIconUrl } from './gfx/textures.js';
import { createQuests } from './systems/quests.js';
import { createPets, PET_DEFS } from './systems/pets.js';
import { createMounts, MOUNT_DEFS } from './systems/mounts.js';
import { createFishing } from './systems/fishing.js';
import { createFarming, PLOT_PRICE } from './systems/farming.js';
import { createHousing, HOUSE_SAFE_R, HOUSE_HEAL_R } from './systems/housing.js';
import { createIndex } from './systems/index.js';
import { createDungeon } from './systems/dungeon.js';
import { createDungeonWorld, buildHollowGate, DUNGEON_Y } from './world/dungeonworld.js';
import { showDungeonGate, hollowLockedText } from './ui/dungeonpanel.js';
import { playDescent } from './ui/descent.js';
import { createFriends } from './systems/friends.js';
import { CLASSES, defaultCharacter, AWAKEN_LEVEL, ADVANCED_CLASSES } from './systems/classes.js';
import { ITEMS, RARITY, RARITY_ORDER, GACHA_WEAPONS, DUNGEON_WEAPONS } from './systems/items.js';
import { createWardrobe, cosmeticsBySlot } from './systems/cosmetics.js';
import { createAudio } from './audio/audio.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { showOpening, logoUrl } from './ui/menu.js';
import { pickLanguage, t } from './ui/lang.js';
import { showCharacterSelect } from './ui/charselect.js';
import {
  activeSlot, setActiveSlot, activeKey, listSlots, loadSlot, saveSlot, deleteSlot,
} from './systems/profiles.js';
import { showPrologue } from './ui/prologue.js';
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
  cloudConfigured, syncSlotsFromCloud, writeLocal, startCloudAutosave, currentUser,
  deleteCloudSave, deleteCloudSlot } from './net/auth.js';
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
  // Only enough to know whether the menu should offer CONTINUE. The cloud
  // reconcile deliberately does NOT run here: it used to, and since it writes
  // through `writeLocal` it could drop somebody else's hero into whichever slot
  // happened to be active from last session. It runs once the player has told
  // us which slot they mean.
  let saved = loadSlot(activeSlot());

  /**
   * Bring the signed-in account's heroes onto this device.
   *
   * THIS HAS TO HAPPEN BEFORE THE MENU IS DRAWN. It used to run only after
   * CONTINUE was pressed, and CONTINUE is drawn from localStorage — so on a
   * phone that had never run the game there was no button to press and the
   * cloud save could not be reached at all. The player's only way in was NEW
   * ADVENTURE, and that fresh hero was then uploaded over the one on their PC.
   */
  async function syncAccount() {
    if (!cloudConfigured()) return;
    try {
      await Promise.race([
        syncSlotsFromCloud(askWhichSave),
        // never let a slow network hold the menu hostage
        new Promise((r) => setTimeout(r, 6000)),
      ]);
      saved = loadSlot(activeSlot());
    } catch (e) { console.warn('[semesta] cloud sync skipped:', e.message); }
    // handed back so the menu can redraw CONTINUE around a hero that has just
    // arrived from another device
    return saved;
  }
  const audio = createAudio();

  // The shipped PNG has a solid white background, so it has to be keyed out
  // before it goes anywhere on screen. cleanImage caches, so the menu and the
  // load screen share one decode.
  const cleanLogo = await cleanImage(logoUrl);

  // If a session is already live (returning player, or the redirect just landed)
  // the heroes are fetched before the menu paints, so CONTINUE is offered for a
  // hero made on another device.
  await syncAccount();

  // opening: loading splash -> main menu (New / Continue / About)
  // `syncAccount` is handed over too: signing in AT the menu has to bring the
  // heroes down right then, without a reload.
  const { action } = await showOpening(saved, syncAccount);
  // SOLO IS THE DEFAULT. Only the PLAY ONLINE door connects to the server —
  // having one configured must not drag a player who picked CONTINUE into a
  // world with strangers in it.
  const online = action === 'online';

  // RE-READ THE SAVE. `saved` was captured before the menu opened, and DELETE
  // PROFILE happens inside the menu — so continuing (or going online, which
  // also carries your hero in) was resurrecting the exact profile that had just
  // been deleted. The menu can destroy it, so it has to be re-read at the point
  // of use rather than trusted from before.
  saved = loadSlot(activeSlot());
  audio.start(); // menu click = first gesture, safe for autoplay
  audio.setMood('menu'); // dreamy title/creation track — the world flips it to day/night
  audio.sfx('ui');

  let config, continued;
  // THE SELECT SCREEN. CONTINUE and PLAY ONLINE both go through it, because
  // with three slots "continue" is no longer a single obvious thing — it is a
  // question about which of your heroes you meant. NEW ADVENTURE skips it only
  // when every slot is empty; otherwise a new hero still has to be told where
  // to live, or making one would silently overwrite another.
  const anySaved = listSlots().some((x) => !x.empty);
  let pickedNew = action === 'new';

  if (anySaved) {
    for (;;) {
      const pick = await showCharacterSelect();
      if (pick.action === 'back') {
        // straight back to the opening; simplest honest answer is a reload
        location.reload();
        return;
      }
      if (pick.action === 'delete') {
        deleteSlot(pick.slot);
        // The cloud copy goes with it, or the next sync brings it straight back.
        // Slot-aware on purpose: this used to call deleteCloudSave() for slot 0,
        // which was right when the row held one save and became "delete all
        // three heroes" once it held a bundle.
        await deleteCloudSlot(pick.slot).catch(() => {});
        continue;                      // repaint the picker
      }
      setActiveSlot(pick.slot);
      pickedNew = pick.action === 'new';
      break;
    }
  } else {
    setActiveSlot(0);
    pickedNew = true;
  }

  // The account was already synced before the menu painted, so the slot on disk
  // is the right one by now.
  saved = loadSlot(activeSlot());

  if (!pickedNew && saved) {
    config = { ...defaultCharacter(), ...saved.character };
    continued = true;
  } else {
    const res = await showCharacterCreation(null); // fresh hero
    config = res.config;
    continued = false;
    saved = null;                      // a new hero never inherits the old save
  }

  // A NEW HERO GETS THE STORY. Language first, because the prologue is the
  // first long thing the game asks anybody to read, and it is only asked once
  // per browser. Continuing an existing character skips both — nobody wants
  // the origin story again on their fourth session.
  if (!continued) {
    bootEl.style.display = 'none';
    await pickLanguage();
    // The title waltz is major and gentle; the prologue is about forty-one
    // people who did not come back. Swap to the slow minor set for the story
    // AND for the world build that follows it, so the mood carries through
    // instead of snapping back to cheerful over the loading bar.
    audio.setMood('story');
    await showPrologue();
  }

  // hand over to the cinematic loader: a different pixel vignette every boot
  bootEl.style.display = 'none';
  loadScreen = createLoadScreen({ logoSrc: cleanLogo });
  document.body.appendChild(loadScreen.el);
  await frame();
  // A FROZEN PROGRESS BAR IS NOT AN ERROR MESSAGE.
  //
  // `init()` was awaited bare, so anything that threw during the world build
  // rejected the promise and left the loading screen sitting on whatever
  // percentage it had reached — most often 74%, the last mark before a long
  // uninstrumented stretch. The player saw a number that never moved, no error,
  // and no way out but clearing site data, which they have no reason to guess.
  try {
    await init(config, continued ? saved : null, audio, online);
  } catch (err) {
    console.error('[semesta] world build failed:', err);
    showBootFailure(err, !!continued);
  }
}

/**
 * The world could not be built. Say so, name the fault, and offer the two
 * things that actually help: try again, or start clean.
 *
 * "Start clean" is deliberately explicit about what it deletes — a button that
 * silently wipes a character is worse than the freeze it is fixing.
 */
function showBootFailure(err, hadSave) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:999;display:flex;align-items:center;
    justify-content:center;background:rgba(6,8,6,0.94);font-family:var(--font-body,monospace);
    color:#e2dfc8;padding:24px;text-align:center;`;
  el.innerHTML = `<div style="max-width:520px">
    <div style="font-family:var(--font-display,monospace);font-size:15px;letter-spacing:4px;
      color:#e8a35d;margin-bottom:14px">THE WORLD DID NOT FINISH BUILDING</div>
    <p style="font-size:12px;line-height:1.8;color:#b9c4ad">
      Something went wrong part way through the load. Your save is still on this
      device — this is very often fixed by simply trying again.</p>
    <pre style="font-size:10px;text-align:left;white-space:pre-wrap;color:#8d9a80;
      background:#12160f;padding:10px;max-height:120px;overflow:auto;margin:12px 0">${
  String(err && (err.stack || err.message) || err).slice(0, 600)}</pre>
    <button id="bf-retry" style="font:inherit;font-size:12px;letter-spacing:2px;padding:10px 18px;
      margin:4px;cursor:pointer;background:#d8b866;color:#12160f;border:0">↻ TRY AGAIN</button>
    ${hadSave ? `<button id="bf-fresh" style="font:inherit;font-size:11px;letter-spacing:1px;
      padding:10px 16px;margin:4px;cursor:pointer;background:#2a231b;color:#c8b494;
      border:1px solid #5a4a34">START A FRESH WORLD (keeps your character)</button>` : ''}
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#bf-retry').addEventListener('click', () => location.reload());
  el.querySelector('#bf-fresh')?.addEventListener('click', () => {
    // drop only the volatile world state, never the character or their items
    try {
      const raw = localStorage.getItem(activeKey());
      if (raw) {
        const blob = JSON.parse(raw);
        delete blob.pos; delete blob.quests; delete blob.farm; delete blob.houses;
        localStorage.setItem(activeKey(), JSON.stringify(blob));
      }
    } catch { /* if even that fails, the reload below still gets them to the menu */ }
    location.reload();
  });
}

async function init(character, saved, audio, online = false) {
  setBoot(0.04, 'Opening the canvas…'); await frame();
  const cls = CLASSES[character.cls];

  // --- renderer & scene (sized by the GRAPHICS settings) ---
  let qual = getQuality();
  const renderer = new THREE.WebGLRenderer({
    // Everything lands in the composer's own targets, so MSAA on the default
    // framebuffer is memory bandwidth spent on a buffer nothing samples.
    antialias: false,
    // ASK FOR THE DISCRETE GPU. Without this hint a laptop with switchable
    // graphics runs WebGL on the integrated chip — which is the machine most
    // players are on, and the one where the difference is largest. It costs
    // nothing to ask and the browser still decides.
    powerPreference: 'high-performance',
  });
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
    // HALF RESOLUTION, and this is the cheapest large win in the renderer.
    //
    // UnrealBloomPass is not one pass: it is five downsamples and five
    // upsamples plus a composite, every one of them a full-screen draw. At the
    // backing-store size that is eleven full-frame passes of fill on top of the
    // scene itself. Bloom is a WIDE, SOFT blur by construction — its whole job
    // is to throw light around — so the half-res chain is visually almost
    // indistinguishable and costs a QUARTER of the fragments.
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
      0.52,   // strength
      0.85,   // radius — softer, wider halo
      0.72,   // threshold: flames, sparks and sun glitter, not lit walls
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  const usePost = () => composer && qual.bloom;

  // ==========================================================================
  // ADAPTIVE RESOLUTION — measure, then shed pixels.
  //
  // The graphics preset picks a render scale ONCE, at boot, from
  // `hardwareConcurrency` and `deviceMemory`. Those tell you how many cores a
  // machine has; they tell you nothing about its GPU, its thermal state, what
  // else it is running, or how heavy the part of the world you happen to be
  // standing in is. A fixed guess is either too low (you paid for sharpness you
  // did not need) or too high (it drops frames and never recovers), and there
  // is no third outcome.
  //
  // So the frame budget is MEASURED and the backing store follows it. Render
  // scale is quadratic on fill rate, which makes it by far the strongest lever
  // available: dropping from 1.0 to 0.8 removes 36% of every fragment in the
  // frame, shadow maps and bloom included.
  //
  // Three things keep it from becoming a wobble you can see:
  //   · it reads the MEDIAN of a second of frames, not the last one, so a
  //     single hitch — a chest opening, a boss spawning — never moves it;
  //   · it steps by 0.1 and waits a full second between steps;
  //   · it only ever climbs back to the preset's own scale, never past it, so
  //     ULTRA still looks like ULTRA on a machine that can hold it.
  // ==========================================================================
  const adaptive = {
    scale: 1,                 // multiplier ON TOP of the preset's render scale
    min: 0.55,
    samples: [],
    cooldown: 0,
    enabled: true,
  };

  function applyPixelRatio() {
    const base = Math.min(window.devicePixelRatio, 1.75) * qual.renderScale;
    renderer.setPixelRatio(base * adaptive.scale);
  }

  function tickAdaptive(dt, frameMs) {
    if (!adaptive.enabled) return;
    adaptive.samples.push(frameMs);
    adaptive.cooldown -= dt;
    if (adaptive.samples.length < 45 || adaptive.cooldown > 0) return;
    // the median, so one bad frame cannot move the resolution
    const sorted = adaptive.samples.slice().sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    adaptive.samples.length = 0;

    const before = adaptive.scale;
    // 20ms ~ 50fps: below that we are losing frames and sharpness is the first
    // thing worth trading. 13ms ~ 75fps: comfortably clear, take some back.
    if (med > 20) adaptive.scale = Math.max(adaptive.min, adaptive.scale - 0.1);
    else if (med < 13) adaptive.scale = Math.min(1, adaptive.scale + 0.1);

    if (adaptive.scale !== before) {
      adaptive.cooldown = 1.0;
      applyPixelRatio();
      composer?.setSize(innerWidth, innerHeight);
    }
  }

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
  // THE HOMESTEAD. One plot, on the one island that allows building — the
  // scattered mainland parcels are gone. It is placed off `terrain.islands`,
  // which exists before any of the decorators run, so nothing else has to know.
  const housing = createHousing(scene, terrain, decor.blocked, particles, terrain.islands);
  // keep the plot free of clipping scenery too (covers houses loaded from save)
  for (const l of housing.lands) decor.clearArea(l.x, l.z, 4.6);

  // SPIDER, the basecamp cat. Not a villager and not wildlife — she is the one
  // creature that answers being touched instead of being fought or farmed.
  const spider = createSpider(scene, terrain, {
    centre: { x: terrain.spawn.x, z: terrain.spawn.z }, radius: 11,
  });

  // THE RIALO HUB — the built island out in the ocean, and the Temple Play cast
  // who live on it. Nothing else in the world knows about it: it is its own
  // module, on its own island record, and if the island is missing it simply
  // does not exist rather than throwing.
  const hubIsland = terrain.islands.find((i) => i.kind === 'hub');
  // The banner texture is loaded async; the board is built either way and the
  // artwork appears when it arrives, so a slow decode never blocks the world.
  const bannerTex = new THREE.TextureLoader().load(rialoBannerUrl);
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  const rialoHub = hubIsland
    ? createRialoHub(scene, terrain, hubIsland, { bannerTexture: bannerTex })
    : null;
  if (rialoHub) {
    // the plaza is paved, so nothing should be growing through it
    decor.clearArea(rialoHub.centre.x, rialoHub.centre.z, 17);
    // and the structures are SOLID — the monument plinth and the banner dais go
    // into the same blocked-cell set every other building uses, so the hero
    // cannot end up standing inside the stonework or under the board.
    let solidCells = 0;
    for (const c of rialoHub.solids) {
      const [cx0, cz0] = terrain.cellOf(c.x, c.z);
      const rc = Math.ceil(c.r);
      for (let dz = -rc; dz <= rc; dz++) {
        for (let dx = -rc; dx <= rc; dx++) {
          if (dx * dx + dz * dz > c.r * c.r) continue;
          decor.blocked.add(`${cx0 + dx},${cz0 + dz}`);
          solidCells++;
        }
      }
    }
    console.info(`[semesta] Rialo Hub: ${solidCells} cells marked solid`);
  }

  // CHIPCHIP GOES TO THE DOCK. npcs.js is built before the landmarks, so it
  // cannot know where the fishing docks ended up; it seats her at a lakeside
  // guess and this walks her over to the real thing. She sits just off the
  // decking so she never blocks the fishing spot itself.
  {
    const chip = npcs.npcs.find((n) => n.def.id === 'chipchip');
    const dock = landmarks.docks?.[0];
    if (chip && dock) {
      // Spiral out from the DOCK itself for the nearest dry, walkable, unblocked
      // cell. Handing a rough guess to landNear put her ten units up the beach,
      // which is not "by the fishing spot", it is "somewhere near the lake".
      let best = null;
      for (let r = 1.6; r <= 5 && !best; r += 0.4) {
        for (let k = 0; k < 16 && !best; k++) {
          const a = (k / 16) * Math.PI * 2;
          const x = dock.x + Math.cos(a) * r, z = dock.z + Math.sin(a) * r;
          const [ix, iz] = terrain.cellOf(x, z);
          if (decor.blocked.has(`${ix},${iz}`)) continue;
          const y = terrain.surfaceY(x, z);
          if (y <= 0.65 || !terrain.walkable(x, z, y)) continue;   // must be dry land
          best = { x, z, y };
        }
      }
      if (best) {
        chip.mesh.position.set(best.x, best.y, best.z);
        chip.home = { x: best.x, z: best.z };
        // HER SCHEDULE HAS TO MOVE TOO. Setting only the position put her at the
        // dock for about four seconds and then the activity system walked her
        // back to the offset in SCHEDULES — measured 19 units away. Stations
        // accept an absolute point, which is exactly what this is.
        chip.stations = [{ abs: { x: best.x, z: best.z }, act: 'sit' }];
        chip.stationIdx = 0;
        chip.mode = 'do';
        chip.mesh.rotation.y = Math.atan2(dock.x - best.x, dock.z - best.z); // face the water
        decor.clearArea(best.x, best.z, 1.8);
        const [cx2, cz2] = terrain.cellOf(best.x, best.z);
        decor.blocked.add(`${cx2},${cz2}`);          // she is solid, like any villager
      }
    }
  }

  // A tree inside a wall is one you can see and never reach, so it can never be
  // chopped — and gathering nodes are scattered BEFORE the landmarks and houses
  // are placed, so some of them end up under whatever got built there. Sweep
  // the finished footprints and take those nodes back out.
  const culled = gathering.cullInside([
    ...landmarks.foots,
    ...camps.camps.map((c) => ({ x: c.x, z: c.z, r: 4.2 })),
    ...housing.lands.map((l) => ({ x: l.x, z: l.z, r: 4.6 })),
    { x: terrain.spawn.x, z: terrain.spawn.z, r: 12.5 },
  ]);
  if (culled) console.info(`[semesta] removed ${culled} gathering nodes buried in structures`);

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
  //
  // THE SEA ONLY. The lake docks used to get a post as well, on the theory that
  // it made the dinghy useful on fresh water. It does not: a lake is its radius
  // plus five, so calling a boat in puts you a second and a half from the far
  // bank, and the entire experience of it is running aground. A launch post is
  // a promise of somewhere to go, and a lake has nowhere. Boats live at sea.
  for (const st of isles.launches || []) watercraft.addStation(st);

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

  // true only while a dungeon run is live; see inSafeZone below
  let inHollow = false;

  function inSafeZone(x, z) {
    // THERE ARE NO SANCTUARIES IN THE HOLLOW, and forgetting that made the
    // whole dungeon a walking tour.
    //
    // Anavela's zones are tested in x/z only, because the overworld is one
    // surface. The Hollow is stacked five hundred units ABOVE that surface, so
    // a hall centred on (0,0) — which is where they are built — sat squarely
    // inside the village's own 13-unit sanctuary at (0.5, 0.5). Every monster
    // down there was therefore treated as standing in the basecamp: repelled at
    // the boundary, dropping aggro, wandering off. Measured before this line:
    // the hero stood still in the middle of a full hall for five seconds and
    // took ZERO damage while all four monsters went from aggro to wander.
    //
    // Testing the run rather than the coordinates closes it wherever a hall is
    // built, instead of relying on a hall never overlapping a camp or a house.
    // Read off a plain flag, NOT off `dungeon`: this function is called during
    // the world build (the first monsters are spawned there) and `dungeon` is
    // declared hundreds of lines later, so naming it here would read a const in
    // its temporal dead zone and stop the loading bar dead. That has now
    // happened SEVEN times in this file.
    if (inHollow) return null;
    for (const c of calmZones) {
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return c;
    }
    const dv = (x - terrain.spawn.x) ** 2 + (z - terrain.spawn.z) ** 2;
    if (dv < VILLAGE_SAFE_R * VILLAGE_SAFE_R) return { x: terrain.spawn.x, z: terrain.spawn.z, r: VILLAGE_SAFE_R };
    for (const c of camps.camps) {
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < CAMP_SAFE_R * CAMP_SAFE_R) return { x: c.x, z: c.z, r: CAMP_SAFE_R };
    }
    // your own island: the homestead is a sanctuary once it is standing
    {
      const h = housing.home;
      if (h && h.tier > 0 && (x - h.x) ** 2 + (z - h.z) ** 2 < HOUSE_SAFE_R * HOUSE_SAFE_R) {
        return { x: h.x, z: h.z, r: HOUSE_SAFE_R };
      }
    }
    // THE RIALO HUB IS A HUB. It is a place you sail to in order to stand
    // around reading a banner and talking to two people — a Lv1 hero was being
    // swarmed the moment they stepped off the boat, which makes the whole
    // island unvisitable for exactly the players it is there to welcome.
    if (hubIsland) {
      const R = hubIsland.r + 4;
      if ((x - hubIsland.x) ** 2 + (z - hubIsland.z) ** 2 < R * R) {
        return { x: hubIsland.x, z: hubIsland.z, r: R };
      }
    }
    return null;
  }
  setBoot(0.74, 'Waking the villagers…'); await frame();

  // --- systems & entities ---
  // Declared HERE, at the top of init: pushQuestTracker() is a hoisted function
  // that runs during world build, and a `let` read before its declaration
  // throws rather than reading undefined. This is the third time that has bitten
  // in this file, so it lives with the other early state now.
  let questTargets = [];     // rows last handed to the tracker, for click-to-mark
  let questTrackT = 0;       // countdown to the next distance refresh
  // the running cook/forge job, so the loop can throw steam or sparks off the
  // hero while the workbench scene plays. Declared up here with the rest of the
  // early state for the same reason questTargets is.
  let workFx = null;
  // THE CLASS TREE AND THE LOADOUT, hoisted for the fifth time this file has
  // been bitten by the same thing. `skillsApi` is built long before the tree is
  // and reads both from a getter; optional chaining does NOT save you from a
  // temporal dead zone, and neither does `typeof` on a `let` — both throw.
  let classTree = null;
  let skillIds = [];
  // subsystems whose saved state could not be restored, reported once the world
  // is up rather than swallowed
  const bootWarnings = [];

  const leveling = createLeveling();

  // THE BUILD. Three points a level across four attributes, no respec.
  // Declared HERE, next to levelling, because applyLevelStats() folds the
  // Vitality and Focus bonuses into the HP and stamina pools and runs long
  // before the class tree is built.
  const stats = createStats();
  stats.load(saved?.stats);
  stats.syncLevel(saved?.level || 1);   // catch up a save made before this existed

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

  // LOAD SAVE — one bad blob must never take the boot down.
  //
  // Every `X.load()` here used to run bare, in the un-instrumented stretch
  // between the 74% and 84% marks. So if any of them threw — an item id from a
  // different build, a half-written blob, a cloud copy from another version —
  // the whole `init()` promise rejected, the progress bar froze at 74%, and the
  // player sat looking at a number forever with nothing in the console they
  // would ever see. That is the worst failure mode this game has, and it is one
  // try/catch away from being a line of text instead.
  //
  // Each subsystem now loads in isolation. A corrupt quest log costs you your
  // quest log, not your character.
  function loadPart(label, fn) {
    try { fn(); } catch (e) {
      console.warn(`[semesta] could not restore ${label}:`, e);
      bootWarnings.push(label);
    }
  }
  if (saved) {
    leveling.state.level = saved.level || 1;
    leveling.state.xp = saved.xp || 0;
    loadPart('inventory', () => inventory.load(saved.inventory));
    loadPart('quests', () => quests.load(saved.quests));
    loadPart('farm', () => farming.load(saved.farm));
    loadPart('house', () => housing.load(saved.houses));
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

  setBoot(0.78, 'Unpacking your bag…'); await frame();

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
      // a boss area is still an attack: it does not land on someone fishing
      const inside = d < r && !defenceless();

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
      // NOBODY DIES WITH A FISHING ROD IN THEIR HANDS.
      //
      // The guard used to sit on each attacker, at the moment it decided to
      // swing. That covers a monster standing in front of you and misses the
      // one that already fired: an arrow checks `peaceful` when it LEAVES the
      // bow and then flies for a second, so casting a line the instant before
      // it lands took the full hit. Ranged species were the ones killing people
      // because they never had to close the distance first.
      //
      // The receiving end is the only place that can be complete. Every route —
      // melee, an arrow in flight, a charge impact, a boss area — arrives here,
      // so one test covers all of them and any route added later.
      if (defenceless()) return;
      // FAIR TRADE. If a summon is standing between the monster and you, it
      // eats the hit instead. Without this the Summoner's army was scenery the
      // enemies walked straight through, which is why the summons never died.
      const shield = summons.nearestTo(e.mesh.position, 2.2);
      if (shield) {
        summons.damage(shield, dmg);
        dmgNums.spawn(
          shield.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), dmg, 'player-hit');
        return;
      }
      // AN ORIGIN HAS NOTHING. No skills, no burst, no escape, no heal — that
      // is deliberate, but the monster damage was still tuned for a class that
      // started with three abilities. The first ten levels get a real cushion
      // that fades out completely by the time the Grand Master awakens you, so
      // learning to fight is survivable and the difficulty curve still exists.
      //
      // Lv1 takes 45% damage, Lv10 takes 100%. Nothing after that is touched.
      // Lv1 takes 30% damage, easing to full by the awakening. The old curve
      // started at 45% and a brand new Origin — no skills, no burst, no heal —
      // was still being two-shot by a Boarling, which is where people quit.
      const lv = leveling.state.level;
      const grace = lv >= AWAKEN_LEVEL ? 1 : 0.30 + 0.70 * ((lv - 1) / (AWAKEN_LEVEL - 1));
      const taken = player.takeDamage(Math.max(1, Math.round(dmg * grace)));
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
    // reads a plain flag, not `dungeon`, for the TDZ reason above
    ambientPaused: () => inHollow,
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
    // A LIVE GETTER, and it reads what you have LEARNED.
    //
    // This was `cls.skills` — the class definition's starting list, captured
    // once, here, before the world had even been built. After the class rework
    // that is wrong twice over: an Origin's list is empty, so the panel drew a
    // header and nothing else; and an awakened hero's list was a snapshot of
    // what the class ships with, which ignores everything they went on to learn
    // in the tree. Either way the points had nowhere to go, and a player could
    // sit on eighteen of them with no way to spend a single one.
    //
    // Levelling applies to any skill you KNOW, not only the three currently on
    // the bar — swapping your loadout should never hide a skill you paid for.
    get skillIds() {
      const learned = Object.keys(classTree?.state?.learned || {}).filter((id) => SKILLS[id]);
      if (learned.length) return learned;
      // pre-awakening, or an old save with no tree data: fall back to the bar
      return skillIds.filter((id) => SKILLS[id]);
    },
    SKILLS, MAX_SKILL_LEVEL,
    iconUrl: skillIconUrl,
    // the levelling panel links straight through to the tree, so the two are
    // reachable from each other instead of being two unrelated screens
    openTree: () => openSkillTree(),
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
  // COOKING, DERIVED FROM THE FISH.
  //
  // There used to be exactly three recipes against fourteen species, and now
  // twenty-six — so most of what you caught could never be cooked and the pot
  // was a decoration. Every fish now has a dish, generated from its own rarity:
  // the fish is the ingredient, the herb cost and the heal scale with how hard
  // it was to catch, and a new species added to ITEMS becomes cookable with no
  // second registration.
  const COOK_TIERS = {
    common: { herbs: 0, heal: 18, sell: 12, prefix: 'Grilled' },
    uncommon: { herbs: 1, heal: 30, sell: 26, prefix: 'Seasoned' },
    rare: { herbs: 1, heal: 48, sell: 55, prefix: 'Skewered' },
    epic: { herbs: 2, heal: 75, sell: 120, prefix: 'Feast of' },
    legendary: { herbs: 2, heal: 120, sell: 280, prefix: 'Grand' },
    mythic: { herbs: 3, heal: 200, sell: 760, prefix: 'Legendary' },
  };
  // the three hand-written dishes keep their nicer names and their own tuning;
  // everything else is generated
  const HAND_WRITTEN = {
    fish_minnow: 'grilled_minnow', fish_perch: 'perch_dinner', fish_koi: 'koi_feast',
  };
  const COOK_RECIPES = [];
  for (const [fid, fd] of Object.entries(ITEMS)) {
    if (!fd.fish) continue;
    const t = COOK_TIERS[fd.rarity] || COOK_TIERS.common;
    const outId = HAND_WRITTEN[fid] || `dish_${fid.replace(/^fish_/, '')}`;
    // register the dish itself, so the bag, the shop and the Index all know it.
    // `consumable` is the flag the bag's EAT path reads — `food` would look
    // right and do nothing.
    if (!ITEMS[outId]) {
      ITEMS[outId] = {
        name: `${t.prefix} ${fd.name}`,
        consumable: true, heal: t.heal, sell: t.sell, rarity: fd.rarity,
        cookedFrom: fid,
      };
    }
    const cost = { [fid]: 1 };
    if (t.herbs) cost.green_herb = t.herbs;
    COOK_RECIPES.push({ out: outId, cost });
  }
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
    /**
     * Start a pot. Takes the ingredients NOW and rolls the portions NOW — the
     * cooking scene needs to know how many came out so it can say so — but hands
     * back a `finish()` the caller calls when the lid actually comes off.
     *
     * Splitting it is what lets the animation be the transaction rather than a
     * replay of one already settled: your herbs leave the bag as they drop into
     * the broth, and dinner lands when it is cooked.
     */
    begin(out) {
      const r = COOK_RECIPES.find((x) => x.out === out);
      if (!r) return null;
      for (const [id, n] of Object.entries(r.cost)) {
        if (inventory.count(id) < n) return null;
      }
      for (const [id, n] of Object.entries(r.cost)) inventory.remove(id, n);
      // COOKING SKILL. Big Pot is the one that changes the loop: the same
      // ingredients sometimes make two portions, which is what turns cooking
      // from a chore into something worth levelling.
      const portions = Math.random() < skilltree.bonus('cooking', 'doubleCook') ? 2 : 1;
      return {
        cost: r.cost,
        portions,
        finish() {
          inventory.add(out, portions);
          particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#ffb055', 8, 2);
          hud.toast(out, portions);
          if (portions > 1) hud.toastText('The pot stretched to two.');
          skilltree.gain('cooking', portions > 1 ? 'uncommon' : 'common');
          dailies?.event('cook'); gamepass?.event('cook');
        },
      };
    },
  };
  // THE ESTATE. There is no land to buy any more: one homestead on Lanternhome,
  // and three tiers of the same house on top of it. The panel asks these
  // questions; housing.js owns the world objects and never touches the bag.
  const estate = {
    tiers: housing.HOUSE_TIERS,
    home: () => housing.home,
    tier: () => housing.tier(),
    next: () => housing.nextTier(),
    isleName: () => housing.home?.isleName || 'Lanternhome',
    /** Are we standing on the plot? The panel refuses to build from anywhere else. */
    onSite: () => !!housing.nearest(player.state.pos, 6),
    /** What is still missing for the next rung — drives the panel's red text. */
    missing() {
      const d = housing.nextTier();
      if (!d) return null;
      const out = [];
      for (const [id, n] of Object.entries(d.cost)) {
        const have = inventory.count(id);
        if (have < n) out.push({ id, have, need: n });
      }
      if (d.coins && inventory.state.coins < d.coins) {
        out.push({ id: 'coin', have: inventory.state.coins, need: d.coins });
      }
      return out;
    },
    build() {
      const d = housing.nextTier();
      if (!d) return;
      if (!this.onSite()) {
        audio.sfx('deny');
        hud.toastText(`Sail to ${this.isleName()} and stand on the plot to build.`);
        return;
      }
      if (this.missing().length) { audio.sfx('deny'); return; }
      for (const [id, n] of Object.entries(d.cost)) inventory.remove(id, n);
      if (d.coins) inventory.spendCoins(d.coins);
      const built = housing.build();
      if (!built) return;
      const h = housing.home;
      decor.clearArea?.(h.x, h.z, 4.6);   // no palm clipping the roof
      quests.event('build');
      // the house is a solid building — nudge the player out to the door side so
      // they aren't trapped inside the freshly-blocked footprint
      moveToClearSpot(h.x, h.z, 3.4);
      audio.sfx('quest_done');
      addShake(0.3);
      hud.banner(`${built.name.toUpperCase()}!`);
    },
  };

  // relocate the player to the nearest walkable, unblocked cell outside a
  // building footprint (prefers the +z "door" side)
  /**
   * States in which the hero genuinely cannot fight back — rod in hand, mid
   * conversation, hands in a cooking pot. Not the same as "a panel is open":
   * checking your bag is not a promise to stand still, and monsters carry on
   * hitting you for it on purpose.
   */
  function defenceless() {
    return !!player.state.busy || !!fishing.state.afk || dialog.isOpen();
  }

  /**
   * THE LAST LINE AGAINST BEING STRANDED.
   *
   * Outside the terrain grid every height query answers MAX_H — the world wall
   * — so a hero who ends up out there is standing inside solid rock with no
   * ground, no way to walk back and nothing on screen but the inside of the
   * geometry. A boat driven into the boundary did it; anything that moves the
   * player by coordinates could do it again.
   *
   * Rather than chase each cause, the loop simply refuses to let the state
   * exist: one cheap bounds test a frame, and anyone outside is put back on the
   * nearest real shore. It costs two comparisons and closes the whole class.
   */
  function rescueIfOutOfWorld() {
    const p = player.state.pos;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) {
      p.set(terrain.spawn.x, terrain.surfaceY(terrain.spawn.x, terrain.spawn.z), terrain.spawn.z);
      return;
    }
    const [ix, iz] = terrain.cellOf(p.x, p.z);
    if (terrain.inBounds(ix, iz)) return;
    if (watercraft.state.active) watercraft.leave(player, true);
    const shore = terrain.nearestShore(p.x, p.z);
    p.set(shore.x, terrain.surfaceY(shore.x, shore.z), shore.z);
    player.state.vy = 0;
    player.state.grounded = true;
    hud.toastText('The tide carried you back to shore.');
  }

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
  // TWO DESTINATIONS, because they are wanted at different moments: the
  // basecamp is where the shops, the forge and the gacha are, and your house is
  // where your land and your crops are. Collapsing them into one button meant
  // that once you owned a house you could never fast-travel to town again.
  const tele = { channel: 0, cd: 0, dest: 'home' };
  function teleportHome(dest = 'home') {
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
    // set AFTER the guards: a rejected press must not repoint a channel that is
    // already running toward somewhere else
    tele.dest = dest;
    tele.channel = 1.6;
    audio.sfx('teleport');
    hud.toastText(`Channeling teleport to ${
      dest === 'village' ? 'the basecamp' : 'your home'}... stand still!`);
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
    // asking for town always means town; asking for home falls back to town if
    // there is no house yet, which is the only sensible thing to do
    const home = tele.dest === 'home' && housing.hasHome() ? housing.home : null;
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
    hud.banner(home ? 'WELCOME HOME' : 'BACK TO THE BASECAMP');
  }

  // --- Master NXR's gacha v2: six-tier rarity ladder with soft pity ---
  // Weighted tiers -> a prize from that tier's pool. Unique prizes (cosmetics,
  // charms, whistles) never dupe: owned ones refund coins per rarity instead.
  const GACHA_WEIGHTS = [
    ['common', 40], ['uncommon', 26], ['rare', 16.5],
    ['epic', 10], ['legendary', 5.5], ['mythic', 2],
  ];
  // THE PRIZE POOLS.
  //
  // The whole SEASON ONE: LANTERNS set — seventeen pieces, every one of them
  // already defined in items.js and already given a real mesh in cosmetics.js —
  // was missing from here, which meant not one of them could be obtained by any
  // means. Built, paid for in code, and unreachable. They are in now, sorted by
  // their own declared rarity.
  //
  // The top two tiers were also thin in a way you feel: one legendary pet, one
  // mythic pet, and a single choice of each accessory slot. A mythic pull that
  // can only ever be one of six things stops being a surprise the second time.
  const GACHA_POOLS = {
    common: [
      { bundle: 'forge_stone', count: 3 }, { bundle: 'tonic', count: 2 },
      { bundle: 'seed_berry', count: 3 }, { bundle: 'iron_ore', count: 2 },
      'hat_straw', 'hat_leaf', 'back_pack',
      'hat_bucket', 'back_scroll',
    ],
    uncommon: [
      { bundle: 'forge_stone', count: 6 }, { bundle: 'hardwood', count: 5 },
      'hat_bandana', 'hat_miner', 'hat_chef', 'back_sprout', 'back_shell', 'trail_leaf',
      'hat_flower', 'back_reef', 'trail_bubble',
    ],
    rare: [
      'hat_wizard', 'hat_catears', 'hat_pirate', 'back_bubble', 'back_balloon',
      'trail_petal', 'trail_frost', { petCharm: true },
      'hat_fox', 'hat_starcap', 'back_cloakfeather', 'trail_ink',
    ],
    epic: [
      'hat_viking', 'hat_pumpkin', 'back_butterfly', 'back_koi', 'trail_ember',
      'mount_trotter', 'mount_clucky', 'mount_shellsworth', 'mount_pebble',
      'hat_lantern', 'hat_horns', 'back_lanterns', 'trail_lantern',
      { gweapon: 'epic' },
    ],
    legendary: [
      'charm_glimmer', 'charm_nox', 'charm_emberling', 'charm_tideling',
      'hat_crown', 'hat_kitsune', 'back_phoenix', 'trail_star',
      'hat_antlers', 'back_frost',
      'mount_nimbus', 'mount_blossom', { gweapon: 'legendary' },
    ],
    mythic: [
      'charm_seraphi', 'charm_zephyr', 'charm_verdant',
      'mount_aurora', 'hat_halo', 'back_prism', 'trail_rainbow',
      'hat_moon', 'trail_aurora',
      { gweapon: 'mythic' },
    ],
  };
  /**
   * The exotic weapon of `tier` that suits whoever you are RIGHT NOW.
   *
   * Two bugs lived in the two places that used to do this by hand. The lookup
   * read `cls.weaponType` — the class captured at world build, which is Origin
   * for everybody, so it always resolved to a sword. And `GACHA_WEAPONS` only
   * has sword/bow/staff/dagger, so an axe Warrior or a Summoner resolved to
   * `undefined`: the PRIZES catalogue crashed on `ITEMS[undefined].name`, and
   * the roll silently `continue`d past it — meaning two of the seven classes
   * could never pull an exclusive weapon at all, in any tier, ever.
   *
   * The gamepass already had the right answer and kept it to itself. One helper
   * now, used by all three callers.
   */
  function exoticFor(tier) { return familyFor(GACHA_WEAPONS[tier]); }

  /**
   * Resolve a weapon FAMILY to the piece matching whatever the hero is.
   *
   * Shared by the gacha, the gamepass and the Hollow. Three reward systems
   * quietly disagreeing about what a Fighter gets is exactly the kind of bug
   * that only shows up in somebody's screenshot.
   */
  function familyFor(fam) {
    if (!fam) return null;
    const wt = CLASSES[character.cls]?.weaponType || 'sword';
    // axe/cannon/fist have no exotic family of their own yet, so each borrows
    // the closest silhouette rather than granting nothing at all
    const key = fam[wt] ? wt
      : wt === 'axe' ? 'sword'
        : wt === 'cannon' ? 'staff'
          : wt === 'fist' ? 'dagger'      // both are short, fast and paired
            : 'sword';
    return fam[key] || null;
  }

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
            const wid = exoticFor(entry.gweapon);
            if (!wid) return { iconId: 'forge_stone', name: 'Exclusive Weapon', kind: 'WEAPON' };
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
          const wid = exoticFor(entry.gweapon);
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
  loadPart('dailies', () => dailies.load(saved?.dailies));

  // --- THE INDEX: the collection log, and the thing a capped hero plays for ---
  const index = createIndex({
    grant(r) {
      if (r.coins) inventory.addCoins(r.coins);
      if (r.item) inventory.add(r.item, r.count || 1);
      hud.banner(r.label.toUpperCase());
      audio.sfx('reveal_legendary');
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ffd23e', 30);
      addShake(0.26);
    },
    // First sighting only. It is a toast rather than a banner on purpose: this
    // fires on every new monster you meet, and a full-screen card for a Slime
    // would be exhausting inside five minutes.
    onDiscover: (cat, entry, p) => {
      hud.toastText(`${cat.glyph} INDEX — ${entry.name} logged (${p.have}/${p.total} ${cat.name.toLowerCase()})`);
      audio.sfx('pickup');
    },
  });
  loadPart('index', () => index.load(saved?.index));

  // --- FRIENDS: people you met in a shared world and chose to remember ---
  const friends = createFriends({ onChange: () => panels?.refresh?.() });
  loadPart('friends', () => friends.load(saved?.friends));

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
      // A weapon reward is a TIER, not an item: it resolves to the one that
      // matches whatever you are, so a Summoner is never handed a bow. Axe and
      // cannon have no exotic family of their own yet, so they borrow the
      // closest silhouette rather than granting nothing at all.
      if (r.weaponTier) {
        const wid = exoticFor(r.weaponTier);
        if (wid) inventory.add(wid, 1);
      }
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

  // ==========================================================================
  // THE HOLLOW
  //
  // The dungeon is a place, a run, and a reward table, and they are three
  // separate modules on purpose: `dungeon` knows the rules and nothing about
  // THREE, `dungeonWorld` builds halls and knows nothing about rewards, and
  // the glue lives here — the same split as dailies, gamepass and the Index.
  // ==========================================================================
  // THE GATE, in the plaza. It sits on the fourth avenue behind the shrine —
  // the Hollow is under the shrine in the fiction, so it should be found by
  // walking behind it rather than by opening a menu. `decor.clearArea` keeps
  // scenery off it, the same call every other structure gets.
  const hollowGate = (() => {
    const a = Math.PI * 0.75;                       // between two avenues
    const x = terrain.spawn.x + Math.cos(a) * 10.5;
    const z = terrain.spawn.z + Math.sin(a) * 10.5;
    decor.clearArea?.(x, z, 3.0);
    const g = buildHollowGate(terrain.surfaceY(x, z));
    g.position.set(x, terrain.surfaceY(x, z), z);
    g.rotation.y = -a + Math.PI / 2;
    scene.add(g);
    return { x, z, mesh: g };
  })();

  const dungeon = createDungeon();
  dungeon.load(saved?.dungeon);
  // The hero is explicitly KEPT: they are in the scene from world-build time, so
  // the snapshot would otherwise hide the player along with the village.
  const dungeonWorld = createDungeonWorld(scene, terrain, { keep: [player.state.group] });
  // where the hero was standing in Anavela, so leaving puts them back
  let hollowReturn = null;


  /** Everything a floor pays, granted through the one path items already take. */
  function grantDungeon(list) {
    for (const r of list) {
      if (r.kind === 'coins') inventory.addCoins(Math.round(r.amount * coinMult()));
      else if (r.kind === 'xp') leveling.addXp(r.amount);
      else if (r.kind === 'item') inventory.add(r.id, r.amount || 1);
    }
  }

  /**
   * A boss prize. `WEAPON:family` resolves to the piece matching YOUR class,
   * the same contract the gamepass and gacha already use — nobody is handed a
   * bow for beating a lord as a Summoner.
   */
  function grantPrize(id) {
    if (!id) return null;
    if (id.startsWith('WEAPON:')) {
      // exactly the rule exoticFor already applies to gacha and gamepass
      // weapons, so the three reward systems can never disagree about what a
      // Fighter or a Summoner should be handed
      const wid = familyFor(DUNGEON_WEAPONS[id.slice(7)]);
      if (wid) { inventory.add(wid, 1); return wid; }
      return null;
    }
    inventory.add(id, 1);
    return id;
  }

  /** Retire every monster that is not part of a dungeon floor. */
  function clearSurfaceFoes() {
    for (let i = enemyMgr.enemies.length - 1; i >= 0; i--) {
      const e = enemyMgr.enemies[i];
      if (e.dungeon) continue;
      e.hp = 0; e.dead = true;
      e.mesh.visible = false;
      if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
      enemyMgr.enemies.splice(i, 1);
    }
  }

  /** Stock the current floor from its plan. Nothing here is random rabble. */
  function populateFloor(plan) {
    enemyMgr.clearDungeonFoes();
    const band = BAND_SPECIES[plan.theme] || BAND_SPECIES.stone;
    const mult = { hpMult: plan.hpMult, dmgMult: plan.dmgMult, xpMult: plan.xpMult };
    for (let i = 0; i < plan.count; i++) {
      const at = dungeonWorld.spawnPoint();
      const type = band[i % band.length];
      // a rare elite in the rabble keeps a hall from being a metronome
      enemyMgr.spawnAt(type, at.x, at.y, at.z, plan.level,
        { ...mult, elite: Math.random() < 0.1 });
    }
    for (let i = 0; i < plan.guards; i++) {
      const at = dungeonWorld.spawnPoint();
      enemyMgr.spawnAt(band[i % band.length], at.x, at.y, at.z, plan.level, mult);
    }
    if (plan.boss) {
      // dead centre, so it is the first thing you see when the door shuts.
      // Its own multipliers, not the rabble's — see the note in planFloor.
      enemyMgr.spawnAt(null, 0, DUNGEON_Y, -2, plan.level, {
        boss: plan.boss,
        hpMult: plan.bossHpMult, dmgMult: plan.bossDmgMult, xpMult: plan.bossXpMult,
      });
      const b = WORLD_BOSSES[plan.boss];
      hud.banner?.(`${b.name} — ${b.title}`);
      audio.sfx('boss_spawn');
    }
  }

  const KIND_WORD = { hall: 'HALL', warden: 'WARDEN', great: 'LORD' };

  async function enterHollow(difficulty, floor) {
    hollowReturn = player.state.pos.clone();
    // AUTO-BATTLE IS REFUSED DOWN HERE, and this is where it is switched off
    // rather than merely ignored: the Hollow is the one place in the game that
    // is meant to be played, and a run you watched is not a run you cleared.
    if (autoBattle) { autoBattle = false; hud.setAuto?.(false); }
    if (watercraft.state.active) watercraft.leave(player, true);
    inHollow = true;
    document.body.classList.add('inhollow');
    // EVERY surface monster goes before the door shuts. They were spawned around
    // Anavela and seated on Anavela's ground; leaving them alive means they are
    // still in the enemy list, still updated, and still walking at a hero who is
    // now five hundred units up. The wilds refill on their own once you are back.
    clearSurfaceFoes();
    const run = dungeon.begin(difficulty, floor);
    const theme = dungeon.THEMES[run.plan.theme];
    audio.sfx('teleport');
    // THE WORLD CHANGES BEHIND THE CURTAIN. The descent calls back at its
    // darkest frame, so the hero is never seen being moved and Anavela never
    // blinks out in front of you — the transition IS the travel.
    await playDescent({
      theme, label: theme.name,
      sub: `FLOOR ${floor} · ${KIND_WORD[run.plan.kind]} · ${dungeon.DIFFICULTIES[difficulty].tag}`,
      onMid: () => {
        const at = dungeonWorld.enter(run.plan);
        player.state.pos.set(at.x, at.y, at.z);
        player.state.vy = 0;
        player.state.grounded = true;
        populateFloor(run.plan);
        audio.setMood('hollow');
      },
    });
    return run;
  }

  function leaveHollow(died = false) {
    if (!dungeon.state.active) return;
    inHollow = false;
    document.body.classList.remove('inhollow');
    enemyMgr.clearDungeonFoes();
    clearSurfaceFoes();     // and nothing the Hollow spawned comes up with you
    dungeonWorld.leave();
    dungeon.leave(died);
    const back = hollowReturn || terrain.spawn;
    player.state.pos.set(back.x, terrain.surfaceY(back.x, back.z), back.z);
    player.state.vy = 0;
    player.state.grounded = true;
    hollowReturn = null;
    audio.sfx('teleport');
    hud.toastText(died
      ? 'The Hollow spat you back out. What you found, you kept.'
      : 'You climb back into the daylight.');
  }

  /**
   * Watch the floor. When the last thing in it dies the stair unseals and the
   * floor pays — checked here rather than on the kill, because a boss that
   * splits or summons is not finished the moment its own health hits zero.
   */
  let hollowClearT = 0;
  function hollowTick(dt) {
    const run = dungeon.state.active;
    if (!run) return;
    if (player.state.dead) { leaveHollow(true); return; }
    hollowClearT -= dt;
    if (hollowClearT > 0) return;
    hollowClearT = 0.35;
    const alive = enemyMgr.enemies.filter((e) => e.dungeon && !e.dead).length;
    hud.setHollow({
      floor: run.floor, of: dungeon.MAX_FLOOR, left: alive,
      theme: dungeon.THEMES[run.plan.theme], kind: run.plan.kind,
      difficulty: dungeon.DIFFICULTIES[run.difficulty],
    });
    if (alive > 0 || run.cleared) return;

    // --- the floor is clear ---
    dungeon.markCleared();
    dungeonWorld.openStair();
    grantDungeon(dungeon.floorReward(run.plan));
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ffd23e', 22);

    if (run.plan.boss) {
      const firstClear = !dungeon.bossBeaten(run.difficulty, run.plan.boss);
      // OWNED HAS TO ASK BOTH HALVES OF THE BAG. `count()` only reads
      // `materials`; weapons live in a separate SET, so a count-only check
      // reports every weapon you own as missing. It happens not to matter today
      // because the band pools hold cosmetics — but that is luck, not design,
      // and the Index lost a whole category to exactly this once already.
      const { drops } = dungeon.bossDrops(run.plan, {
        firstClear,
        owned: (id) => inventory.state.weapons.has(id) || inventory.count(id) > 0,
      });
      dungeon.markBossBeaten(run.difficulty, run.plan.boss);
      const got = drops.map(grantPrize).filter(Boolean);
      if (got.length) {
        audio.sfx('reveal_mythic');
        addShake(0.35);
        hud.banner?.(got.map((id) => ITEMS[id]?.name || id).join('  ·  '));
      }
    }
    audio.sfx('levelup_big');
    hud.toastText(run.floor >= dungeon.MAX_FLOOR
      ? 'The bottom of the Hollow. There is nothing below this.'
      : 'The stair unseals. Take it, or climb out with what you have.');
  }

  /** Down one floor. Same run, so what you are carrying comes with you. */
  async function descendHollow() {
    const plan = dungeon.descend();
    if (!plan) { leaveHollow(false); return; }
    const theme = dungeon.THEMES[plan.theme];
    audio.sfx('teleport');
    await playDescent({
      theme, label: theme.name,
      sub: `FLOOR ${plan.floor} · ${KIND_WORD[plan.kind]} · ${dungeon.DIFFICULTIES[plan.difficulty].tag}`,
      dur: 1700,                       // shorter between floors: you know the way now
      onMid: () => {
        const at = dungeonWorld.enter(plan);
        dungeonWorld.retheme(plan);    // the band changes on the way down
        player.state.pos.set(at.x, at.y, at.z);
        player.state.vy = 0;
        populateFloor(plan);
      },
    });
  }

  /** The gate in Anavela: asks, then sends you down. */
  async function openHollowGate() {
    const lv = leveling.state.level;
    if (!dungeon.unlocked(lv)) {
      hud.toastText(hollowLockedText(lv, dungeon.UNLOCK_LEVEL));
      audio.sfx('deny');
      return;
    }
    player.state.busy = true;
    const pick = await showDungeonGate(dungeon, lv);
    player.state.busy = false;
    if (pick) enterHollow(pick.difficulty, pick.floor);
  }


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
    inventory, forge, character, audio, pets, isTouch: touch,
    // a FUNCTION, so the crafting list follows the class through the awakening
    weaponType: () => CLASSES[character.cls]?.weaponType || 'sword',
    economy, cooking, estate, gacha, wardrobe: wardrobeApi, dailies, gamepass,
    skilltree, index,
    // the panel asks for rows; main owns the live player list it needs
    friendsApi: {
      rows: () => friends.rows(net?.state.players),
      remove: (id) => { friends.remove(id); save(); },
      count: () => friends.count(),
    },
    // THE WORK HAPPENS IN THE WORLD TOO. The scene in the modal is the close-up;
    // these put the hero into a stirring or hammering pose behind it and throw
    // the matching FX off them, so closing the panel afterwards does not feel
    // like walking out of a cutscene into an unrelated world.
    onWorkStart: (kind) => {
      player.state.busy = true;
      player.setWorkPose?.(true, kind);
      workFx = { kind, t: 0 };
      audio.sfx('ui');
    },
    onWorkEnd: (kind, out) => {
      player.state.busy = false;
      player.setWorkPose?.(false);
      workFx = null;
      const at = player.state.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
      if (kind === 'cook') {
        particles.fountain(at, '#ffd8a0', 14);
      } else {
        particles.burst(at, '#ffd23e', 16, 3);
        particles.shockwave?.(player.state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#ffb055', 2.2, 0.4);
        addShake(0.18);
      }
    },
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
    // VITALITY and FOCUS are flat additions on top of the class curve
    player.state.maxHp = cls.baseHp + (lv - 1) * cls.hpPerLevel + stats.bonusHp();
    player.state.maxStamina = cls.baseStam + (lv - 1) * cls.stamPerLevel + stats.bonusStamina();
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
    const pts = stats.syncLevel(lv);
    if (pts) hud.toastText(`+${pts} stat points — open STATS (Z) to spend them.`);
    // THE ONE NUDGE. Fired once, and it points rather than pulls: the ritual
    // itself needs a walk to the Grand Master, so nobody is dragged into a
    // permanent choice by a level-up they earned in the middle of a fight.
    if (lv >= AWAKEN_LEVEL && character.cls === 'origin' && !awakenNudged) {
      awakenNudged = true;
      setTimeout(() => {
        hud.banner('THE CALLING');
        hud.toastText('Elder Maple has something to say to you. It is time to choose a path.');
        audio.sfx('quest_accept');
        refreshMarkers();   // put the ! back over the Elder immediately
      }, 2200);
    }
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
    logBagToIndex();
  });

  /**
   * THE BAG IS THE SOURCE OF TRUTH for everything you can hold.
   *
   * Sprinkling `index.see(...)` through every grant site — fishing, chests,
   * gacha, quests, the gamepass, dailies, level rewards, the shop — would mean
   * eight places to forget. Reading the bag on every change catches all of them
   * at once, including a reward path somebody adds next year. `see()` is a no-op
   * once a thing is logged, so this is cheap.
   */
  function logBagToIndex() {
    if (!index) return;
    // `state.materials` is a MAP, and it is not called `items` — reading
    // `Object.keys(state.items)` gave an empty list forever, so nothing a player
    // owned was ever logged and the whole Index sat at zero while the bag filled
    // up. Caught by pulling five cosmetics and watching the counter stay at 0/45.
    for (const id of inventory.state.materials.keys()) {
      if (inventory.count(id) <= 0) continue;
      const d = ITEMS[id];
      if (!d) continue;
      if (d.fish) index.see('fish', id);
      if (d.cosmetic) index.see('cosmetics', id);
      // charms and whistles are the ITEM; the index logs the creature it summons
      const pet = Object.entries(PET_DEFS).find(([, p]) => p.charm === id);
      if (pet) index.see('pets', pet[0]);
      const mnt = Object.entries(MOUNT_DEFS).find(([, m]) => m.item === id);
      if (mnt) index.see('mounts', mnt[0]);
    }
    // weapons live in their own set, not as stacked items
    for (const id of inventory.state.weapons || []) index.see('weapons', id);
  }
  player.state.equipWeapon(inventory.state.equipped);

  // --- input ---
  const input = { keys: new Set(), mouse: { x: innerWidth / 2, y: innerHeight / 2 }, joy: { active: false, x: 0, y: 0 } };

  // --- camera (with shake) ---
// THE CAMERA CAN LOOK UP NOW.
//
// `pitch` was a constant 0.98 radians — 56 degrees down — and nothing ever
// changed it. That is fine for walking around, and hopeless the moment there is
// something tall to look at: the Rialo banner's top edge was simply off the top
// of the screen no matter how far back you stood, because backing up on a fixed
// down-angle just adds more ground.
//
// The range is clamped rather than free. Past ~0.42 the horizon climbs into the
// middle of the frame and the game stops reading as 2.5D; past ~1.30 you are
// looking at the top of your own head.
const CAM_PITCH_MIN = 0.42;    // ~24 degrees: nearly level, good for tall things
const CAM_PITCH_MAX = 1.30;    // ~75 degrees: almost straight down
const CAM_PITCH_DEFAULT = 0.98;

  const cam = { yaw: Math.PI * 0.25, dist: 17, pitch: CAM_PITCH_DEFAULT, shake: 0, tiltHeld: 0 };
  function addShake(amt) { cam.shake = Math.min(0.8, cam.shake + amt); }
  function updateCamera(dt) {
    const p = player.state.pos;
    if (input.keys.has('KeyQ')) cam.yaw += dt * 1.8;
    if (input.keys.has('KeyE')) cam.yaw -= dt * 1.8;
    // arrow up tilts the view UP (a smaller pitch is a more level camera)
    let manualTilt = false;
    if (input.keys.has('ArrowUp')) { cam.pitch -= dt * 1.1; manualTilt = true; }
    if (input.keys.has('ArrowDown')) { cam.pitch += dt * 1.1; manualTilt = true; }
    if (manualTilt) cam.tiltHeld = 4;              // leave them alone for a bit
    if (cam.tiltHeld > 0) cam.tiltHeld -= dt;

    // THE CAMERA LIFTS ITSELF IN FRONT OF THE BANNER.
    //
    // Measured: a 12x6.75 upright board 14 units away is entirely above the top
    // of the frame at the default 56-degree down-angle, and no amount of backing
    // up or tilting the board itself changes that — the camera is simply aimed
    // at the ground. It fits from about 0.55 downward, so standing in front of
    // the sign eases the view there and walking away eases it back. Touching the
    // tilt keys suspends this for four seconds, because a camera that argues
    // with you is worse than one that never helps.
    if (rialoHub?.banner && cam.tiltHeld <= 0) {
      const b = rialoHub.banner;
      const bx = rialoHub.centre.x + b.position.x;
      const bz = rialoHub.centre.z + b.position.z;
      const near = Math.hypot(p.x - bx, p.z - bz) < 22;
      const want = near ? 0.52 : CAM_PITCH_DEFAULT;
      cam.pitch += (want - cam.pitch) * Math.min(1, dt * 1.6);
    }
    cam.pitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, cam.pitch));
    const cx = p.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cz = p.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
    const cy = p.y + Math.sin(cam.pitch) * cam.dist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 7));
    if (cam.shake > 0.005) {
      camera.position.x += (Math.random() - 0.5) * cam.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * cam.shake * 0.4;
      cam.shake *= Math.max(0, 1 - dt * 7);
    }
    // THE LOOK-AT RISES WITH THE TILT.
    //
    // Tilting up is useless on its own: the camera still aimed at the player's
    // feet, so a tall sign stayed above the top of the frame no matter what the
    // pitch was. Raising the target as the pitch flattens is what actually puts
    // the sky — and anything standing in it — into view.
    const tiltLift = (CAM_PITCH_DEFAULT - cam.pitch) * 7.5;
    camera.lookAt(p.x, p.y + 0.6 + Math.max(0, tiltLift), p.z);
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
    // MIGHT lands here, so it applies to weapons, skills and summons alike —
    // one multiplier, one place, no stat that quietly misses half the game.
    return leveling.dmgMult() * (1 + (player.state.dmgBonusBuff || 0)) * stats.dmgMult();
  }
  function forgeMult() { return forgeMultiplier(inventory.equippedPlus()); }

  function onKill(e, drops) {
    // INDEX: killing it is what logs it. Seeing one across a field is not
    // "collecting" it, and a log that filled itself from the spawner would be
    // complete before you had fought anything.
    if (e.isWorldBoss) index?.see('bosses', e.bossKind || e.type);
    else index?.see('monsters', e.type || e.def?.id);
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
      when: (lighting.state.minutes / 60 >= 19.5 || lighting.state.minutes / 60 < 5.5) ? 'night' : 'day',
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
    } else if (def.type === 'cannon') {
      // THE ONLY BASIC ATTACK WITH AN AREA. That is the Summoner's whole
      // identity in one line: slow, telegraphed, and it does not matter much
      // which of the six things in front of you it actually hits.
      audio.sfx('swing_staff');
      setTimeout(() => {
        if (p.dead) return;
        autoFace();
        glowFx?.();
        // muzzle flash, because a shell that appears from nowhere reads as a
        // bug rather than as a shot
        const muzzle = p.pos.clone().add(new THREE.Vector3(
          Math.sin(p.facing) * 0.9, 0.8, Math.cos(p.facing) * 0.9));
        particles.burst(muzzle, '#ffb055', 10, 3.4, 2);
        particles.flash(muzzle, '#ffd9a0', 4, 0.16);
        addShake(0.18);
        // Siege Mode makes every shell bigger — the buff carries `splash`.
        const siege = p.buffs?.find((b) => b.id === 'siegemode');
        const aoe = (def.aoe || 1.8) * (siege ? 1.35 : 1);
        projectiles.spawn({
          pos: muzzle,
          dir: new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)),
          speed: def.projSpeed, range: def.range, radius: 0.6,
          kind: 'orb', color: '#ffb055', trail: '#ff8a4a',
          onHitEnemy: (e, pos) => {
            particles.burst(pos.clone(), '#ff8a4a', 22, 4.5, 3);
            particles.burst(pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffdd88', 10, 3);
            particles.shockwave(pos, '#ff9944', aoe + 0.7, 0.34);
            audio.sfx('explosion');
            addShake(0.22);
            for (const en of enemyMgr.enemies) {
              if (en.dead) continue;
              const d = Math.hypot(en.mesh.position.x - pos.x, en.mesh.position.z - pos.z);
              if (d <= aoe) dealHit(en, 1);
            }
          },
        });
      }, dur * 0.45);
    } else if (def.type === 'fist') {
      // THREE BEATS, matching the three the animation plays: jab, cross, knee.
      // The timings are the animation's, not evenly spaced — the jab lands
      // early and light, the cross has the pause of a turning hip in front of
      // it, and the knee arrives last and hits hardest.
      audio.sfx('swing');
      const beat = (mult, shake) => () => {
        if (p.dead) return;
        autoFace();
        glowFx?.();
        const hits = resolveMeleeHit(p, def, enemyMgr.enemies, 1);
        for (const h of hits) dealHit(h.enemy, mult);
        if (hits.length && shake) { audio.sfx('bash'); addShake(shake); }
      };
      setTimeout(beat(0.85, 0), dur * 0.16);       // jab
      setTimeout(beat(1.0, 0), dur * 0.44);        // cross
      setTimeout(beat(1.35, 0.16), dur * 0.78);    // knee — the payoff
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
  // AUTO-BATTLE is an END-GAME convenience, not a way to skip the game.
  //
  // It is off by default and stays locked until the level cap, because handing
  // a new player a button that plays for them is handing them a reason never to
  // learn the combat — and the combat is the game. At 30 there is nothing left
  // to learn and grinding materials is a chore worth automating.
  // Lv10, not the level cap. Gating it at 30 meant nobody reached it — and the
  // people who most want a hands-free grind are the ones part-way up, not the
  // ones already finished. It lands with the awakening, which is the moment the
  // game stops being a tutorial anyway.
  const AUTO_UNLOCK_LEVEL = AWAKEN_LEVEL;
  let autoBattle = false;
  // the locked target. Re-picking the nearest enemy every frame made it
  // oscillate between two equidistant monsters and commit to neither.
  let autoTarget = null;

  function autoUnlocked() { return leveling.state.level >= AUTO_UNLOCK_LEVEL; }

  /**
   * Back to the main menu, and (if signed in) sign out on the way.
   *
   * SAVES FIRST, always. Leaving is a deliberate act and losing the last few
   * minutes because of it would be unforgivable; a reload is the honest way to
   * tear down a world this size, because half-disposing three thousand meshes
   * by hand is exactly how you end up leaking one.
   */
  async function leaveToMenu() {
    save();
    hud.toastText('Saving and returning to the menu…');
    try { await cloud?.flush?.(); } catch { /* offline is fine */ }
    net?.disconnect?.();
    setTimeout(() => location.reload(), 450);
  }

  function toggleAutoBattle() {
    if (!autoBattle && !autoUnlocked()) {
      audio.sfx('deny');
      hud.toastText(`Auto-Battle unlocks at Lv${AUTO_UNLOCK_LEVEL}. You are Lv${leveling.state.level}.`);
      return;
    }
    autoBattle = !autoBattle;
    autoTarget = null;              // a fresh start picks a fresh target
    dismountIfRiding();
    hud.setAuto?.(autoBattle);
    if (autoBattle) {
      // A mode that plays for you MUST say so somewhere you cannot miss, or the
      // first time it triggers you think the game has taken the controls off you.
      hud.banner('AUTO BATTLE ACTIVATED');
      hud.toastText('Auto-Battle ON — press B or the ⚔ button to stop.');
    } else {
      hud.toastText('Auto-Battle stopped.');
    }
    audio.sfx('ui');
  }
  /**
   * AUTO-BATTLE, rewritten.
   *
   * The old one had four faults and they compounded into "my Assassin runs
   * around teleporting and never kills anything":
   *
   *  1. IT NEVER GOT CLOSE ENOUGH. It stopped walking at `range + 0.2` and then
   *     swung at anything within `range + 1.5` — so it attacked from OUTSIDE the
   *     distance `resolveMeleeHit` actually accepts (`d <= range`, no slack).
   *     Every swing missed, the monster kept hitting back, and a melee hero
   *     stood there dying to something it was visibly attacking.
   *  2. IT WALKED AT THE WRONG SPEED. `cls.speed` is the class captured at world
   *     build — Origin, for everybody — so an awakened class chased at the
   *     starting speed and ignored mounts, pets and Agility entirely. A monster
   *     that walks away is then genuinely uncatchable.
   *  3. IT RE-PICKED THE NEAREST ENEMY EVERY FRAME. Two monsters at similar
   *     distances made it oscillate between them and commit to neither.
   *  4. IT AUTO-CAST SKILLS. That is where the teleporting came from — the
   *     Assassin's blink firing on a 2.2s rotation mid-fight, throwing it across
   *     the field away from the thing it was killing. Auto-battle is for
   *     grinding materials, not for playing the class; skills are yours.
   */
  function autoBattleTick(dt) {
    if (!autoBattle) return;
    // NOT IN THE HOLLOW. Switched off rather than paused, so it cannot quietly
    // resume when the next floor loads.
    if (dungeon.state.active) { autoBattle = false; hud.setAuto?.(false); return; }

    // DYING STOPS IT. It used to keep running while you lay dead: the tick
    // returned early on `dead`, but the flag stayed on, so the moment you
    // respawned in the village the hero turned round and marched back out to
    // whatever had just killed them. Auto-battle is a thing you switch on, and
    // dying is the game telling you it did not work.
    if (player.state.dead) {
      if (autoBattle) {
        autoBattle = false;
        autoTarget = null;
        hud.setAuto?.(false);
        hud.toastText('Auto-Battle stopped — you were killed.');
      }
      return;
    }

    // A PANEL IS NOT A PAUSE. Opening the bag or the skill tree used to stop
    // auto-battle dead while the monsters carried on hitting you — you came
    // back to a corpse for the crime of checking your inventory. The world does
    // not pause here (it cannot; it is shared), so the hero keeps defending
    // themselves. Fishing and conversations still stand it down, because those
    // are things you chose to be defenceless for.
    if (player.state.busy || dialog.isOpen() || fishing.state.afk) return;

    // ---- TARGET LOCK. Keep the current one until it dies or runs too far.
    if (autoTarget && (autoTarget.dead
      || Math.hypot(autoTarget.mesh.position.x - player.state.pos.x,
        autoTarget.mesh.position.z - player.state.pos.z) > 30)) {
      autoTarget = null;
    }
    if (!autoTarget) autoTarget = nearestEnemy(26);
    const e = autoTarget;
    if (!e) return;

    const dx = e.mesh.position.x - player.state.pos.x, dz = e.mesh.position.z - player.state.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    player.state.facing = Math.atan2(dx, dz);

    const def = inventory.equippedDef();
    const ranged = def.type === 'bow' || def.type === 'staff' || def.type === 'cannon';
    const range = def.range || 2;

    // WHERE TO STAND, per weapon. Melee closes to well inside its own reach so
    // that a target drifting during the swing's wind-up is still there when the
    // hit resolves; ranged holds a distance it can actually keep a target at.
    const standAt = ranged ? Math.min(range - 2, 7.5) : range * 0.55;
    // and only swing once genuinely inside the reach the hit test uses
    const swingAt = ranged ? range - 0.5 : range * 0.85;

    if (dist > standAt) {
      // the hero's REAL speed, the same one walking uses
      const sp = (CLASSES[character.cls]?.speed || cls.speed)
        * (1 + player.buffVal('speed')) * (player.state.mount?.speedMult || 1)
        * stats.moveMult() * 0.95 * dt;
      const nx = player.state.pos.x + (dx / dist) * sp, nz = player.state.pos.z + (dz / dist) * sp;
      if (terrain.walkable(nx, nz, player.state.pos.y)) {
        player.state.pos.x = nx; player.state.pos.z = nz;
        player.state.pos.y += (terrain.surfaceY(nx, nz) - player.state.pos.y) * Math.min(1, dt * 14);
        player.state.isMoving = true;
      } else {
        // blocked head-on: slide along the obstacle instead of grinding into it
        const side = Math.atan2(dx, dz) + Math.PI / 2;
        const sx = player.state.pos.x + Math.sin(side) * sp;
        const sz = player.state.pos.z + Math.cos(side) * sp;
        if (terrain.walkable(sx, sz, player.state.pos.y)) {
          player.state.pos.x = sx; player.state.pos.z = sz;
        }
      }
    }

    if (dist <= swingAt) doAttack();

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
  // The Summoner's army. Built before the skill system because the summoner
  // skills hand it work, and it needs a way to deal damage that goes through
  // the same crit/forge/level maths every other source does — hence hitEnemy
  // being passed in rather than reimplemented.
  const summons = createSummons({
    scene, terrain, enemyMgr, projectiles, particles, dmgNums, audio,
    hitEnemy: (e, mult) => {
      const w = inventory.equippedDef();
      const base = w.dmg * totalMult() * mult * forgeMult();
      const crit = Math.random() < 0.1;
      const dmg = Math.max(1, Math.round(base * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2)));
      dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)), dmg, crit ? 'crit' : '');
      enemyMgr.damage(e, dmg, player.state.pos, onKill);
    },
  });

  const skillSys = createSkillSystem({
    player, enemyMgr, projectiles, particles, dmgNums, audio, terrain,
    aimPoint, onKill, shake: addShake,
    weaponDef: () => inventory.equippedDef(),
    forgeMult, summons,
  });
  setBoot(0.80, 'Remembering what you learned…'); await frame();
  skillsApi.skillSys = skillSys;
  loadPart('skills', () => skillSys.load(saved?.skills));

  // Backfill the Index from whatever is already in the bag. A hero who has been
  // playing since before the Index existed should open it and find their fish,
  // their pets and their whole weapon line already logged — an empty log on a
  // Lv30 character would read as broken, and it would be.
  logBagToIndex();

  // THE LOADOUT, not the class's fixed list.
  //
  // `cls.skills` is now only a suggestion for what a freshly awakened class
  // starts with — what is actually on the bar is whatever the player learned
  // and slotted. An Origin has an EMPTY bar, deliberately: the first ten levels
  // are swing, roll and read the tell, and handing out three abilities up front
  // is exactly what makes those levels feel like a tutorial to skip.
  // Declared HERE, not next to createTouchControls: refreshLoadout runs as soon
  // as the HUD exists, which is before the touch controls are built, and a
  // `let` read ahead of its declaration throws instead of reading undefined.
  let touchUI = null;

  classTree = createClassTree();
  loadPart('skill tree', () => classTree.load(saved?.classTree));
  skillIds = classTree.activeSkills();

  function refreshLoadout() {
    skillIds = classTree.activeSkills();
    hud.setSkills?.(skillIds);
    touchUI?.setSkills?.(skillIds);
  }

  // ================= THE AWAKENING =================
  //
  // Fires from ONE place — talking to the Grand Master while you are an Origin
  // at or past AWAKEN_LEVEL. The level-up hook only nudges; it never opens the
  // ritual on its own, because being yanked into an irreversible choice by a
  // level-up you got mid-fight is exactly the wrong moment to be asked.
  let awakenNudged = !!saved?.awakenNudged;

  function isOrigin() { return character.cls === 'origin'; }
  function canAwaken() { return isOrigin() && leveling.state.level >= AWAKEN_LEVEL; }

  async function openAwakening() {
    if (!canAwaken()) return;
    const pick = await showAwakening();
    if (!pick) return;
    const def = CLASSES[pick.cls];
    character.cls = pick.cls;

    // A branch class swaps its weapon TYPE, not just the item — a Warrior who
    // chose the axe uses the axe line from here on.
    let weapon = def.startWeapon;
    if (pick.branch && def.branches) {
      const br = def.branches.find((b) => b.id === pick.branch);
      if (br) { weapon = br.weapon; character.branch = br.id; }
    }
    inventory.add(weapon, 1);
    inventory.equip(weapon);
    player.state.equipWeapon(weapon);

    // The tree is per class, so anything learned as something else has to go —
    // otherwise the bar carries a button the runtime has no effect for.
    classTree.resetFor(pick.cls);
    // One point per level already earned, so a player who took their time
    // getting to 10 is not punished for it.
    classTree.state.points = Math.max(classTree.state.points, leveling.state.level - 1);
    refreshLoadout();

    audio.sfx('levelup_big');
    particles.shockwave(player.state.pos.clone(), def.color, 6, 0.9);
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), def.color, 60);
    particles.runeCircle?.(player.state.pos.clone(), def.color, 7, 1.8);
    addShake(0.6);
    hud.setClassName?.(def.name);
    hud.banner(`${def.name.toUpperCase()} AWAKENED`);
    hud.toastText(`You are a ${def.name}. Open the skill tree (K) and spend your points.`);
    save();
    openSkillTree();
  }

  function openSkillTree() {
    if (isOrigin()) {
      hud.toastText(canAwaken()
        ? 'Find Grand Master Vell in the village to choose your class.'
        : `Your class awakens at Lv${AWAKEN_LEVEL}. Keep going.`);
      audio.sfx('deny');
      return;
    }
    showSkillTree(
      { cls: () => character.cls, level: () => leveling.state.level, tree: classTree },
      { onChange: () => { refreshLoadout(); save(); } },
    );
  }

  function castSkill(id) {
    if (!id) return;
    if (panels.anyOpen() || dialog.isOpen() || player.state.dead) return;
    dismountIfRiding();
    player.state.dmgMult = totalMult();
    if (skillSys.cast(id) !== false) dailies.event('skill'); gamepass.event('skill');
  }

  // --- fishing ---
  const fishing = createFishing({
    scene, terrain, player, particles, audio,
    hooks: {
      isNight: () => { const hr = lighting.state.minutes / 60; return hr >= 19.5 || hr < 5.5; },
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
          when: (lighting.state.minutes / 60 >= 19.5 || lighting.state.minutes / 60 < 5.5) ? 'night' : 'day',
        });
        gamepass.event('fish');
        skilltree.gain('fishing', rarity);
      },
      onMiss(msg) { hud.toastText(msg); },
    },
  });

  // --- MULTIPLAYER ---------------------------------------------------------
  //
  // Entirely optional. With no server configured `net` stays null and every
  // call site below short-circuits, leaving exactly the single-player game that
  // shipped before. That is not a fallback bolted on afterwards — it is why any
  // of this can go out without risking the thing that already works.
  //
  // The server owns what must look the same to everybody: where other people
  // are, the monsters, the boss, the clock, the weather. This client keeps its
  // own movement, its own inventory, and all of the rendering.
  const remote = createRemotePlayers(scene, terrain);
  const netClock = { time: null, weather: null };
  let net = null;
  let chat = null;

  if (online && serverConfigured()) {
    remote.bindSelf(player.state.group);

    // THE POPULATION COUNT. `state.players` holds everybody else the server
    // knows about — join and leave are broadcast to the whole world, not just
    // to people nearby — so this is the true total rather than who is in view.
    function refreshOnline() {
      hud.setOnline?.((net?.state.players.size || 0) + 1, !!net?.state.connected);
    }
    chat = createChat(hudRoot, (text) => net?.chat(text), {
      isBusy: () => panels.anyOpen() || dialog.isOpen() || hud.isMenuPopOpen?.(),
    });

    net = createNetClient({
      onConnect: (d) => {
        hud.toastText(`Connected — ${(d.players?.length || 0) + 1} in Anavela.`);
        audio.sfx('ui');
        refreshOnline();
      },
      onJoin: (p2) => { refreshOnline(); hud.toastText(`${p2.name} joined.`); },
      onLeave: () => refreshOnline(),
      onDisconnect: () => {
        remote.clear();
        hud.setOnline?.(1, false);
        hud.toastText('Lost the connection — retrying…');
      },
      onReconnecting: (secs) => hud.toastText(`Reconnecting in ${secs}s…`),
      onReject: (why) => hud.toastText(why),
      onChat: (m) => {
        chat.push(m, net?.state.id);
        // and over their head, which is where a shared world actually reads
        if (m.id && m.id !== net?.state.id) remote.say(m.id, m.text);
        else if (m.id && m.id === net?.state.id) remote.sayLocal(m.text);
      },
      onToast: (t) => hud.toastText(t),
      onClock: (c) => { netClock.time = c.time; netClock.weather = c.weather; },
    });

    net.connect(
      {
        name: character.name || 'Wanderer',
        cls: character.cls,
        level: leveling.state.level,
        appearance: {
          gender: character.gender, skin: character.skin,
          hairStyle: character.hairStyle, hairColor: character.hairColor,
          eyes: character.eyes, accessory: character.accessory,
          outfitStyle: character.outfitStyle, outfit: character.outfit,
          cape: character.cape,
        },
      },
      // what we tell the server about ourselves, ten times a second
      () => ({
        x: player.state.pos.x, y: player.state.pos.y, z: player.state.pos.z,
        f: player.state.facing,
        // One word, and swinging beats swimming: what other people need to read
        // off a distant body is "that one is fighting", and the remote renderer
        // treats this as a TRIGGER rather than a pose, so a swing survives the
        // gaps between packets.
        a: player.state.attackT > 0 ? 'atk'
          : player.state.swimming ? 'swim' : 'idle',
        sw: !!player.state.swimming,
        b: !!player.state.busy,
        lv: leveling.state.level,
      }),
    );
  }

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
    pushQuestTracker();
  });
  refreshMarkers();
  pushQuestTracker();

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
    const offer = quests.availableFor(def.id, leveling.state.level);
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
      text: def.id === 'grandmaster' && isOrigin() && !canAwaken()
        ? `Not yet. Come back at Lv${AWAKEN_LEVEL} — you are ${AWAKEN_LEVEL - leveling.state.level} short. `
          + 'Until then the sword is the whole lesson.'
        : def.dialog[npc.dialogIdx++ % def.dialog.length],
      // Pip runs the village shop; Master NXR spins the wonder capsules
      extra: def.id === 'merchant'
        ? { label: '◆ OPEN SHOP', onClick: () => { close(); panels.toggle('shop'); } }
        : def.id === 'nxr'
          ? { label: '🎰 WONDER CAPSULES', onClick: () => { close(); panels.toggle('gacha'); } }
          // The Grand Master offers the ritual only when it is actually
          // available. Showing a greyed-out "AWAKEN" to a Lv3 hero would just
          // be a promise they cannot act on and will have forgotten by Lv10.
          : def.id === 'grandmaster' && canAwaken()
            ? { label: '✦ AWAKEN MY CLASS', onClick: () => { close(); openAwakening(); } }
            : def.id === 'grandmaster' && !isOrigin()
              ? { label: '✦ SKILL TREE', onClick: () => { close(); openSkillTree(); } }
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
  /** Pet the cat. Also reachable by clicking or tapping her directly. */
  function petSpider() {
    const line = spider.greet();
    audio.sfx('ui');
    particles.burst(
      spider.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ff9ad8', 14, 2.4);
    hud.toastText(line);
  }

  /**
   * Turn a quest's `where` hint into a live world position.
   *
   * Deliberately the NEAREST thing of that kind rather than a fixed
   * coordinate: "defeat 3 slimes" should point at a slime that exists now, and
   * "open 2 chests" at one that has not been looted.
   */
  function resolveObjective(w) {
    if (!w) return null;
    const px = player.state.pos.x, pz = player.state.pos.z;
    const nearestOf = (arr, get) => {
      let best = null, bd = Infinity;
      for (const it of arr || []) {
        const p2 = get(it);
        if (!p2) continue;
        const d = (p2.x - px) ** 2 + (p2.z - pz) ** 2;
        if (d < bd) { bd = d; best = p2; }
      }
      return best;
    };
    if (w.kind === 'npc' || w.kind === 'landmark') {
      const want = w.kind === 'landmark' ? 'smith' : w.id;
      const n = npcs.npcs.find((x) => x.def.id === want);
      return n ? { x: n.mesh.position.x, z: n.mesh.position.z } : null;
    }
    if (w.kind === 'enemy') {
      return nearestOf(enemyMgr.enemies.filter((e) => !e.dead && (!w.id || e.def.id === w.id)),
        (e) => ({ x: e.mesh.position.x, z: e.mesh.position.z }));
    }
    if (w.kind === 'chest') {
      return nearestOf(chests.chests?.filter((c) => !c.opened),
        (c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }));
    }
    if (w.kind === 'gather') return nearestOf(gathering.nodes, (n) => ({ x: n.x, z: n.z }));
    if (w.kind === 'water') return nearestOf(landmarks.docks, (d) => ({ x: d.x, z: d.z }));
    // there is exactly one buildable plot in the world, so "go build" always
    // points at the same island — which is the whole point of moving it there
    if (w.kind === 'land') {
      const h = housing.home;
      return h ? { x: h.x, z: h.z } : null;
    }
    return null;
  }

  /** Feed the tracker rows that know WHERE the next step is. */
  function pushQuestTracker() {
    const px = player.state.pos.x, pz = player.state.pos.z;
    const lines = quests.trackerLines().map((l) => {
      const at = resolveObjective(l.where);
      const out = { ...l, giverName: giverNames[l.giver] };
      if (at) {
        out.at = at;
        out.dist = Math.hypot(at.x - px, at.z - pz);
        // 0 = north (-z), clockwise, matching the arrow glyphs in the HUD
        out.dir = (Math.atan2(at.x - px, -(at.z - pz)) * 180) / Math.PI;
      }
      return out;
    });
    questTargets = lines;
    hud.updateQuests(lines);
  }

  function gatherInteractions() {
    if (player.state.dead || panels.anyOpen() || dialog.isOpen()) return [];
    const list = [];
    const add = (kind, label, run, extra = {}) => list.push({ kind, label, run, ...extra });

    // INSIDE THE HOLLOW nothing else in the world is reachable, so the whole
    // priority list below is skipped: there is exactly the stair and the way
    // out, and letting a villager three hundred units away win the button
    // would be absurd.
    if (dungeon.state.active) {
      const st = dungeonWorld.stairSpot();
      const ex = dungeonWorld.exitSpot();
      const near = (q) => q && Math.hypot(player.state.pos.x - q.x, player.state.pos.z - q.z) < 2.6;
      const run = dungeon.state.active;
      if (near(st) && run.cleared && run.floor < dungeon.MAX_FLOOR) {
        add('stair', `Descend to floor ${run.floor + 1}`, () => descendHollow());
      }
      if (near(ex)) add('exit', 'Climb out of the Hollow', () => leaveHollow(false));
      return list;
    }

    // The gate itself, in the plaza beside the shrine.
    if (hollowGate && Math.hypot(player.state.pos.x - hollowGate.x,
                                 player.state.pos.z - hollowGate.z) < 2.6) {
      add('hollow', 'The Hollow — descend', () => { openHollowGate(); });
    }

    // Spider goes in FIRST when you are close. She is tiny and she moves, so if
    // she loses the button to a market stall three metres away you will never
    // manage to pet her at all.
    if (spider.near(player.state.pos, 2.0)) {
      add('pet', 'Pet Spider', () => petSpider());
    }

    // The Hub's cast talk about Rialo itself. Their lines come from the Temple
    // sheet verbatim, so somebody who played that recognises them.
    const hubNpc = rialoHub?.nearest(player.state.pos, 2.4);
    if (hubNpc) {
      add('talk', `Talk to ${hubNpc.def.name}`, () => {
        player.state.busy = true;
        audio.sfx('talk');
        const lines = hubNpc.def.dialogue;
        dialog.show({
          name: hubNpc.def.name,
          role: hubNpc.def.topic,
          text: lines[hubNpc.dialogIdx++ % lines.length],
          onClose: () => { player.state.busy = false; },
        });
      });
    }

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

    // the homestead: the prompt names the actual next step, so standing on your
    // own plot never says something vague like "Estate"
    const homePlot = housing.nearest(player.state.pos, 4.5);
    if (homePlot) {
      const nx = housing.nextTier();
      if (nx) {
        add('estate', homePlot.tier === 0 ? `Build the ${nx.name}` : `Upgrade to ${nx.name}`,
          () => { audio.sfx('ui'); panels.toggle('estate'); });
      }
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
    if (e.code === 'KeyK') { audio.sfx('ui'); openSkillTree(); }
    // Z for the build sheet. U is already the gamepass, and C is crafting.
    if (e.code === 'KeyZ') {
      audio.sfx('ui');
      showStats(stats, { onChange: () => { applyLevelStats(); save(); } });
    }
    if (e.code === 'KeyX') { audio.sfx('ui'); panels.toggle('index'); }
    if (e.code === 'KeyH') { audio.sfx('ui'); panels.toggle('help'); }
    if (e.code === 'KeyO') { audio.sfx('ui'); panels.toggle('ward'); }
    // Shift also rolls. The on-screen hint and the guide both said it did;
    // right-click was the only binding that actually existed.
    // SHIFT ROLLS — but only a bare Shift.
    //
    // Windows 11 remaps the PrtScn key to the Snipping Tool, which it launches
    // by synthesising Win+Shift+S. The browser sees a real ShiftLeft keydown,
    // so taking a screenshot rolled the character forward every single time.
    // A modifier key is the wrong thing to bind an action to on its own; the
    // guard is to require that no other modifier is held, and `repeat` is
    // ignored so holding Shift does not spam rolls.
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight')
      && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) doRoll();
    if (e.code === 'KeyL') { audio.sfx('ui'); panels.toggle('life'); }
    if (e.code === 'KeyJ') { audio.sfx('ui'); panels.toggle('daily'); }
    if (e.code === 'KeyU') { audio.sfx('ui'); panels.toggle('pass'); }
    if (e.code === 'KeyT') teleportHome('home');
    if (e.code === 'KeyY') teleportHome('village');
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
    if (e.code === 'Digit1' && skillIds[0]) castSkill(skillIds[0]);
    if (e.code === 'Digit2' && skillIds[1]) castSkill(skillIds[1]);
    if (e.code === 'Digit3' && skillIds[2]) castSkill(skillIds[2]);
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
  // the bar is a view of the loadout, so paint it from the loadout once both
  // the HUD and (on a phone) the touch controls exist
  refreshLoadout();
  // TOUCH THE CAT DIRECTLY. Raycast on click/tap — the brief is that she reacts
  // to being touched, and requiring the interact key for that is the wrong verb.
  {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tryTouch = (cx, cy) => {
      if (panels.anyOpen() || dialog.isOpen()) return false;
      ndc.x = (cx / window.innerWidth) * 2 - 1;
      ndc.y = -(cy / window.innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      if (!ray.intersectObject(spider.mesh, true).length) return false;
      petSpider();
      return true;
    };
    // CLICK A PLAYER. Same raycast, but against the remote bodies — walking up
    // to someone and clicking them is the natural way to ask who they are, and
    // it is the only place in a shared world where another person is a THING
    // you can point at rather than a name in a chat log.
    const tryPlayer = (cx, cy) => {
      if (!net || panels.anyOpen() || dialog.isOpen()) return false;
      if (!remote.bodies?.size) return false;
      ndc.x = (cx / window.innerWidth) * 2 - 1;
      ndc.y = -(cy / window.innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      for (const [id, b] of remote.bodies) {
        if (!b.group) continue;
        if (!ray.intersectObject(b.group, true).length) continue;
        const p = net.state.players.get(id);
        showPlayerCard({ id, name: p?.name || 'Wanderer', lv: p?.lv || 1 });
        return true;
      }
      return false;
    };

    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (tryPlayer(e.clientX, e.clientY)) return;
      tryTouch(e.clientX, e.clientY);
    });
  }

  /** The little card that opens when you click somebody. */
  function showPlayerCard(p) {
    const already = friends.isFriend(p);
    dialog.show({
      name: p.name,
      role: `Level ${p.lv}`,
      text: already
        ? `${p.name} is on your friends list. You will see when they are in the world with you.`
        : `You have met ${p.name}. Add them to your friends list to see when they are around?`,
      extra: {
        label: already ? '✕ REMOVE FRIEND' : '★ ADD FRIEND',
        onClick: () => {
          if (already) {
            friends.remove(p.id);
            audio.sfx('ui');
            hud.toastText(`${p.name} removed from your friends.`);
          } else if (friends.add(p)) {
            audio.sfx('quest_done');
            hud.toastText(`${p.name} added to your friends.`);
          } else {
            audio.sfx('deny');
          }
          save();
        },
      },
      onClose: () => {},
    });
  }

  // CLICK A QUEST TO MARK IT. The waypoint beacon already exists for map pins;
  // pointing it at a quest objective is the difference between a list of chores
  // and something a new player can follow.
  hud.els.quests?.addEventListener('click', (e) => {
    const row = e.target.closest('[data-quest]');
    if (!row) return;
    const l = questTargets.find((q) => q.id === row.dataset.quest);
    if (!l?.at) { hud.toastText('Nothing to track for that one yet.'); return; }
    worldmap.setPin?.(l.at.x, l.at.z);
    audio.sfx('ui');
    hud.toastText(`Marked: ${l.done ? `report to ${l.giverName}` : l.label}`);
  });

  hud.els.minimapCanvas.style.pointerEvents = 'auto';
  hud.els.minimapCanvas.style.cursor = 'pointer';
  hud.els.minimapCanvas.addEventListener('click', toggleWorldMap);

  hud.bind({
    onSkill: castSkill,
    onPotion: usePotion,
    onMenu: (which) => {
      if (which === 'stats') {
        showStats(stats, { onChange: () => { applyLevelStats(); save(); } });
        return;
      }
      if (which === 'tree') { audio.sfx('ui'); openSkillTree(); return; }
      if (which === 'index') { audio.sfx('ui'); panels.toggle('index'); return; }
      if (which === 'quit') { leaveToMenu(); return; }
      if (which === 'auto') { toggleAutoBattle(); return; }
      if (which === 'home') { teleportHome('home'); return; }
      if (which === 'village') { teleportHome('village'); return; }
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
      onCameraDrag: (d, dv) => {
        cam.yaw -= d;
        // vertical drag tilts. Dragging DOWN looks up, matching every camera
        // control anybody has ever used on a phone.
        if (dv) {
          cam.pitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, cam.pitch - dv));
        }
      },
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
    applyPixelRatio();   // keeps the adaptive multiplier on top of the new preset
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
        index: index.serialize(),
        friends: friends.serialize(),
        skilltree: skilltree.serialize(),
        classTree: classTree.serialize(),
        stats: stats.serialize(),
        awakenNudged,
        gamepass: gamepass.serialize(),
        dungeon: dungeon.serialize(),
        story: story.serialize(),
        pos: [player.state.pos.x, player.state.pos.y, player.state.pos.z],
        at: Date.now(),
      };
      saveSlot(activeSlot(), lastSave);
      cloud?.mark();
    } catch { /* storage full/blocked: ignore */ }
  }
  setInterval(save, 8000);
  window.addEventListener('beforeunload', save);

  // debug/testing handle (used by automated verification)
  window.__semesta = {
    // THE HOLLOW. Listed HERE and not in the enemy hooks far above, where an
    // earlier version of this put it: that object is built during the world
    // build, hundreds of lines before `dungeon` exists, so naming it there read
    // a const in its temporal dead zone and stopped the loading bar dead at 78%
    // with nothing on screen to say why. Sixth time TDZ has done this in this
    // file. Expose a thing where it EXISTS, never where it reads nicely.
    dungeon, dungeonWorld, hollowGate,
    enterHollow, leaveHollow, descendHollow, openHollowGate, populateFloor,
    dailies, gamepass, story, skilltree, index, landmarks, watercraft, isles, hud, wind,
    net, remote, chat, drinkBooster, xpMult, luckMult, gfxQuality: { getQuality, buildSnapshot }, renderer, scene,
    composer, usePost,
    player, enemyMgr, inventory, leveling, terrain, cam, camera, skillSys, forge,
    projectiles, pickups, character, quests, pets, mounts, chests, weather, fishing, npcs, lighting,
    camps, gathering, farming, housing, economy, cooking, estate, gacha, worldmap,
    wardrobe, wardrobeApi, teleportHome, tele, panels, isles, watercraft, wildlife,
    remote, get net() { return net; }, spider, rialoHub,
    openAwakening, openSkillTree, classTree, summons, character, stats, doAttack, enemyMgr, projectiles, inventory, leveling,
    get skillIds() { return skillIds; },
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
  // COLLECTED LAZILY, on the first tick.
  //
  // It used to be gathered right here at build time, which missed everything
  // created afterwards — the hero's own lamp and both boat lamps were never in
  // the pool at all, so they sat outside the cap and pushed the visible count
  // to eleven against a budget of eight. By the first frame of the game loop
  // every light in the world exists.
  let lightPool = null;
  let lightSortT = 0;
  let knownLights = -1;

  /**
   * RE-COLLECT, because the world keeps making lights.
   *
   * The pool used to be gathered exactly once — first at world-build time,
   * which missed the hero's lamp and the boat lamps, then on the first tick of
   * the game loop, which fixed those and still missed everything created
   * AFTERWARDS. And plenty is: a gacha weapon carries its own glow light, so do
   * Seraphi and the bamboo beacons, a summon brings one, a boat has two.
   *
   * A light outside the pool is never culled, so every one of them permanently
   * raised the visible count by one — and three.js rebuilds the light loop into
   * EVERY material in the scene when that count moves. Measured here, live: one
   * change to the visible light count compiled sixteen new shader programs.
   * That is a whole-scene shader rebuild in the middle of play, and it is the
   * stutter — equipping a legendary weapon or summoning a pet was enough to
   * trigger it, which is why it felt random.
   *
   * Rescanning costs one traverse a second against four thousand objects, which
   * is nothing next to what it prevents.
   */
  function collectLights() {
    lightPool = [];
    let total = 0;
    scene.traverse((o) => {
      if (!o.isPointLight) return;
      total++;
      // The hero's lamp is never culled — it is the one light whose whole job
      // is to be wherever you are.
      if (!o.userData.alwaysLit) lightPool.push({ l: o, base: o.intensity });
    });
    knownLights = total;
  }

  function tickLights(dt) {
    lightSortT -= dt;
    if (lightSortT > 0) return;
    lightSortT = 0.25;                       // 4x a second is plenty
    // Rescanned on the same beat as the sort, not on a slower one: the window
    // between a light being created and being brought under the budget is a
    // window in which the visible count is wrong, and a wrong count is a
    // whole-scene shader rebuild. A traverse of four thousand objects four
    // times a second is far cheaper than one of those.
    const before = knownLights;
    collectLights();
    if (before < 0) {
      console.info(`[semesta] light budget: ${qual.maxLights} of ${lightPool.length} cullable`);
    } else if (before !== knownLights) {
      console.info(`[semesta] point lights ${before} -> ${knownLights}, re-culling`);
    }
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
    // SORT BY "IS IT ACTUALLY BURNING", THEN BY DISTANCE.
    //
    // decor.js parks a pool of unassigned lantern lights at intensity 0, and
    // sorting on distance alone handed six of the eight slots to lights that
    // emit nothing — so at night the lanterns you were standing next to were
    // the ones culled. A dark light sorts to the back; the budget goes to the
    // ones doing work. The COUNT is still fixed, which is the part that keeps
    // the shaders from recompiling.
    for (const e of lightPool) e.off = e.l.intensity <= 0.02 ? 1 : 0;
    lightPool.sort((a, b) => (a.off - b.off) || (a.d - b.d));

    // A CONSTANT NUMBER OF VISIBLE LIGHTS. This is the whole point.
    //
    // The previous version did `if (intensity <= 0.02) visible = true` with a
    // comment claiming a dark light is free. It is not: three.js builds its
    // shader light loop from every VISIBLE light regardless of intensity, so
    // all of them were compiled in — and, far worse, as lanterns crossed that
    // 0.02 threshold at dusk and dawn the count changed, and a changed light
    // count recompiles EVERY material in the scene. That is the stutter people
    // were getting on machines with power to spare: not fill rate, shader
    // recompilation, several times a minute.
    //
    // So the count never moves. Exactly `budget` lights are visible at all
    // times — the nearest ones — and everything else is off. Programs compile
    // once and are never invalidated.
    const budget = Math.min(qual.maxLights, lightPool.length);
    for (let i = 0; i < lightPool.length; i++) lightPool[i].l.visible = i < budget;
  }

  // --- PREWARM: pay the one-off costs now, while the picture is still up, so
  // the first bag open / first swing / first night doesn't hitch ---
  setBoot(0.88, 'Forging every item icon…'); await frame();
  for (const id of Object.keys(ITEMS)) {
    try { itemIconUrl(id); } catch { /* an item without an icon painter is fine */ }
  }
  // WAKE ONE OF EVERYTHING THAT ARRIVES LATER.
  //
  // `renderer.compile` only knows about what is in the scene, and when the
  // world finishes building that is terrain, village and trees — not a single
  // monster, weapon effect or spell. So the compile below used to cover the
  // quiet parts of the game and none of the loud ones, and the first monster
  // you met, the first skill you cast and the first world boss each paid for a
  // shader compile on the frame they appeared. That is what the stutter a
  // minute into play actually was.
  //
  // Everything that will ever appear is therefore built here, compiled, and
  // thrown away again: shared geometry and compiled programs survive, the
  // meshes do not.
  setBoot(0.90, 'Waking the wilds…'); await frame();
  const undoPrewarm = enemyMgr.prewarm?.(player.state.pos) || (() => {});
  // and the effects: additive blending, sprite sheets and the rune sigils are
  // all separate programs the terrain never touches
  const fxAt = player.state.pos.clone().setY(player.state.pos.y - 400);
  try {
    particles.burst(fxAt, '#ffd23e', 8, 2);
    particles.ring?.(fxAt, '#7fd0ff', 2, 0.4);
    particles.shockwave?.(fxAt, '#ff8a3a', 3, 0.5);
    particles.flash?.(fxAt, '#ffffff', 2, 0.3);
    particles.runeCircle?.(fxAt, '#a86aff', 2.5, 0.6);
    particles.fountain?.(fxAt, '#7fd06a', 8, 2);
  } catch { /* an effect that will not fire dry is not worth failing boot for */ }

  setBoot(0.93, 'Compiling shaders…'); await frame();
  // three.js walks the whole scene graph and compiles every material's program,
  // which is the single biggest source of first-seconds stutter
  try { renderer.compile(scene, camera); } catch { /* older three: skip */ }
  renderer.render(scene, camera);
  if (usePost()) composer.render();   // compiles the bloom passes too
  undoPrewarm();
  particles.update?.(2.5);            // let the decoy effects expire and recycle
  // Anything that failed to restore is said out loud rather than swallowed —
  // a player whose quest log silently emptied deserves to know why.
  if (bootWarnings.length) {
    setTimeout(() => hud.toastText(
      `Some saved data could not be restored: ${bootWarnings.join(', ')}. Everything else loaded.`), 2500);
  }
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
    dungeonWorld.update(dt, time);
    hollowTick(dt);
    // The out-of-world rescue must not fire five hundred units up: while a run
    // is live the terrain override reports the hall as in-bounds, so this is
    // simply skipped rather than made to understand dungeons.
    if (!dungeon.state.active) rescueIfOutOfWorld();
    autoBattleTick(dt);

    // moving cancels an in-progress fishing session
    if (fishing.state.phase !== 'idle' && (input.joy.active ||
        input.keys.has('KeyW') || input.keys.has('KeyA') || input.keys.has('KeyS') || input.keys.has('KeyD'))) {
      fishing.cancel();
    }

    const hr = lighting.state.minutes / 60;
    // ONE CLOCK FOR EVERYONE. While connected the server owns the time of day
    // and we ease toward it rather than snapping — a late packet should read as
    // a slight drift, never a lurch from noon to midnight. The wrap at 1440 has
    // to be handled explicitly or crossing midnight would rewind the whole day.
    if (netClock.time !== null) {
      let d = netClock.time - lighting.state.minutes;
      if (d > 720) d -= 1440;
      if (d < -720) d += 1440;
      lighting.state.minutes = (lighting.state.minutes + d * Math.min(1, dt * 0.6) + 1440) % 1440;
    }
    const isNight = hr >= 19.5 || hr < 5.5;
    // A 0..1 ramp rather than a boolean, so boat lamps fade up through dusk
    // instead of snapping on the instant the clock crosses 19:30.
    const nightAmt = hr >= 19.5 ? Math.min(1, (hr - 19) / 1.2)
      : hr < 5.5 ? Math.min(1, (6.2 - hr) / 1.2) : 0;
    watercraft.tickLamps(nightAmt);
    // the hero carries their own light, from the same dusk ramp
    player.setNightGlow?.(nightAmt);

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

    // remote players: eased toward the targets the server sent, and animated
    // from how far they actually moved rather than from anything on the wire
    if (net) {
      net.gear({
        weapon: inventory.state.equipped,
        pet: pets.state.active,
        mount: mounts.state.active,
      });
      remote.update(dt, net.state.players, player.state.pos);
    }
    wildlife.update(dt, player.state.pos, time);
    water.update(dt, time);
    weather.update(dt, player.state.pos, time);
    lighting.state.weatherDim = weather.state.intensity;
    // ANAVELA'S SKY DOES NOT REACH THE HOLLOW. This drives the sun, the fog
    // colour and the whole day cycle every frame; left running it repainted the
    // dungeon's air back to whatever the clock said outside, once per frame.
    if (!inHollow) lighting.update(dt, player.state.pos);
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
    // THE PET FETCHES. It runs the drop down, carries it back and hands it over —
    // the same `onPickup` path a drop you walked over takes, so quests, dailies
    // and the toast all fire exactly as they would have.
    pets.update(dt, player.state, time, pickups, (id, count) => {
      inventory.add(id, count);
      hud.toast(id, count);
      audio.sfx('pickup');
    });
    mounts.update(dt, player, terrain);
    fishing.update(dt, time);
    // the tracker shows a live distance, so it has to be rebuilt as you move —
    // 3x a second, which is far below what the eye reads as stale
    questTrackT -= dt;
    if (questTrackT <= 0) { questTrackT = 0.33; pushQuestTracker(); }
    tickTeleport(dt);
    summons.update(dt, player.state.pos);
    spider.update(dt, player.state.pos);
    rialoHub?.update(dt, player.state.pos, nightAmt);
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
    // A STORY BEAT NEVER LANDS MID-FIGHT.
    //
    // The card is a full-screen overlay that blocks the joystick and waits to be
    // dismissed. Firing it the instant a condition happened to be met meant it
    // arrived while you were being hit, took the controls, and read as an
    // interruption rather than a reward. It waits for a quiet moment now: no
    // enemy hunting you inside 14 units, and three seconds since anything hurt
    // you. The condition stays met — the telling just holds.
    storyT -= dt;
    const fighting = player.state.sinceHurt < 3
      || enemyMgr.enemies.some((e) => !e.dead && e.state === 'aggro'
        && (e.mesh.position.x - player.state.pos.x) ** 2
         + (e.mesh.position.z - player.state.pos.z) ** 2 < 196);
    if (storyT <= 0 && !fighting && !panels.anyOpen() && !dialog.isOpen()) {
      storyT = 1;
      story.check({
        level: leveling.state.level,
        kills: lore.kills,
        swam: lore.swam,
        visitedIsland: lore.visitedIsland,
        hasHome: housing.hasHome(),
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
    hud.setIndexBadge?.(index.pending());
    // cosmetic movement trail (wardrobe slot 3)
    if (player.state.isMoving && !player.state.dead) {
      const tr = wardrobe.trailColor(time);
      if (tr && Math.random() < dt * tr.rate) {
        particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.25, 0)),
          tr.color, 2, 1.1, tr.rise, 0.5);
      }
    }
    // WHILE THE HERO IS WORKING. Steam off a pot rises slowly and drifts; sparks
    // off an anvil are fast, bright and land. Same emitter, deliberately opposite
    // settings, because that contrast is most of what tells the two apart from
    // across the plaza.
    if (workFx) {
      workFx.t += dt;
      const at = player.state.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
      if (workFx.kind === 'cook') {
        if (Math.random() < dt * 9) particles.burst(at, '#e8e2d2', 1, 0.35, 1.5, 1.6);
        if (Math.random() < dt * 2.2) particles.burst(at, '#ffb055', 1, 0.6, 0.8, 1.0);
      } else {
        // one bright shower on each hammer beat rather than a constant drizzle
        const beat = Math.floor(workFx.t / 0.5);
        if (beat !== workFx.lastBeat) {
          workFx.lastBeat = beat;
          particles.burst(at, '#ffd23e', 7, 3.4, 0.4, 0.5);
        }
        if (Math.random() < dt * 3) particles.burst(at, '#ff8a3a', 1, 1.2, 0.5, 0.7);
      }
    }

    updateCamera(dt);

    // resting: campfires and your own homes heal quickly
    if (!player.state.dead && player.state.hp < player.state.maxHp) {
      let resting = false;
      const fire = camps.nearestFire(player.state.pos, CAMP_HEAL_R);
      if (fire) resting = true;
      if (!resting) {
        const h = housing.home;
        if (h && h.tier > 0
          && (h.x - player.state.pos.x) ** 2 + (h.z - player.state.pos.z) ** 2 < HOUSE_HEAL_R * HOUSE_HEAL_R) {
          resting = true;
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
    // THE LOOP MUST NOT OVERWRITE THE HOLLOW. This runs every frame, so even a
    // correctly-set dungeon mood was replaced by day/night on the very next one
    // — the dungeon could never hold its own music for a single frame.
    if (!inHollow) {
      audio.setMood(
        (watercraft.state.active || player.state.swimming) && terrain.inOcean(player.state.pos.x, player.state.pos.z)
          ? 'sea' : isNight,
      );
    }
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

    // TIME THE FRAME, then let the resolution follow it. Measured around the
    // draw itself rather than the whole tick, because the draw is the part the
    // pixel ratio actually controls.
    const drawStart = performance.now();
    if (usePost()) composer.render(); else renderer.render(scene, camera);
    tickAdaptive(dt, performance.now() - drawStart);
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
