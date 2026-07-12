# Semesta

Voxel action RPG 2.5D in the browser. three.js + Vite, vanilla JS ES modules. All pixel art (textures, sprites, icons) is generated procedurally via 16px canvas. Music & SFX are fully synthesized with WebAudio — no audio files. ONLY exception: `logoasset/semesta.png` (logo) & `logoasset/nxrmascott.png` (creator mascot), imported as Vite assets by `src/ui/menu.js`.

Art direction: cozy Stardew-Valley-ish palette (lush greens, warm earth, turquoise water), chibi big-head characters (NOT minecraft proportions), cute-critter enemies/NPCs/pets with big glossy pixel eyes (Pokemon / Pokopia / Animal Crossing energy).

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Structure

- `src/main.js` — bootstrap: Opening (menu.js) → Character Creation → build world → game loop; wires the interact system (F key / mobile ★: talk / shop / gacha / forge / chest / harvest / plant / build / chop / mine / cook / fish — landmarks beat wandering NPCs, quest-givers beat landmarks), auto-aim, jump (Space), mounts (M), world map (N), AFK fishing (G), **AFK Auto-Battle (B / ⚔AUTO button** — seeks nearest enemy within 26, approaches, auto-attacks, auto-casts ready skills, auto-sips tonic), world boss scheduler (180s), safe zones (village/camps/homes — `inSafeZone`), economy/cooking/estate/gacha APIs, out-of-combat auto-heal, save v3
- `src/ui/menu.js` — opening loading splash (pixel sky: clouds/floating islands/snowy peaks/light beams + logo) → main menu (New / Continue / About w/ mascot & x.com/nxrskyaa link); exports logoUrl/mascotUrl
- `src/ui/worldmap.js` — fullscreen world map overlay (N / tap minimap): village ⌂, camps ▲, land ◎, quest !, boss ◆, player arrow
- `src/world/camps.js` — 4 rest camps (campfire+tent+bench) each with a Ranger fox-NPC (talk → full heal): safe zones, fast heal, cooking stations
- `src/world/gather.js` — gatherable nodes: pale banded BIRCH trees (chop → hardwood) & glowing-vein ORE boulders (mine → iron ore/forge stones), 3 hits, respawn
- `src/systems/farming.js` — 8 farm plots by the village (2 free, buy more): plant seeds → 3 growth stages → harvest crops to sell
- `src/systems/housing.js` — 4 land parcels (250c) + 3 house designs (Cabin/Cottage/Villa) built from hardwood+iron ore+coins; homes are safe zones that heal
- `src/systems/classes.js` — 7 classes (Knight/Archer/Mage/Assassin/Berserker/Hunter/Priest): base stats, weapon type (reuse sword/bow/staff/dagger so they share crafting trees & attack anims), 3 skills each + all customization constants (8 skins, 12 hair styles incl. `BALD_STYLE`, 10 hair colors, 6 eye colors, 6 face accessories, 4 outfit styles, capes)
- `src/systems/items.js` — items w/ buy/sell coin prices, per-class weapons (4 tiers), fish, seeds/crops, cooked foods, 10 pet charms, 6 mount whistles, drop tables for 8 enemy types
- `src/systems/skills.js` — 21 skills with cooldowns & juicy FX (shockwaves, light flashes, screen shake); Berserker (rage/cleave/leapslam), Hunter (volley/snipe/beasttrap), Priest (heal/smite/bless) + skill leveling (Lv1-5: +22% power, -6% cooldown, longer buffs per level; 1 skill point per character level, spent in the K panel)
- `src/systems/quests.js` — quest chain + mount quests (simple deliveries → world boss hunts) + repeatable grind quests (kill/kill_any/fish/chest/forge/deliver/talk objectives; `worldboss` kill target), tracker lines, save/load
- `src/systems/pets.js` — 10 collectible pet companions (charms from chests / world bosses / quests), follower AI, passive perks (speed/dmg/regen/atkSpeed/xp/armor/crit/stamRegen/magnet/fish)
- `src/systems/mounts.js` — 6 rideable mounts: Sprig (starter, free), Trotter (cute caramel tusk-pony, clean chibi box style)/Clucky/Shellsworth/Nimbus (quests), Blossom (gacha-exclusive, petal trail); mesh attaches under the player, gallop anim, speed/jump multipliers
- `src/systems/fishing.js` — shore fishing minigame (cast → wait → "!" → strike) with full visual kit: rod in hand (bends on bite), sagging line, bobber ripples, circling fish shadow, catch arcs to the player; AFK mode (G) auto-fishes with heavily nerfed rarity
- `src/systems/forge.js`, `crafting.js`, `level.js`, `inventory.js` — +1..+9 weapon forging, class-filtered crafting, XP/levels, inventory+hotbar
- `src/entities/player.js` — `buildCharacterMesh()` (chibi rig, detailed tiered weapons w/ rune glows, 4 outfit cuts w/ trims, capes) + runtime (camera-relative movement, jump physics w/ land squash, roll, shield, mount seat pose, fluid per-weapon attack anims — assassin cross-slash combo; swing trail arc renders IN FRONT via `flashTrail`)
- `src/entities/enemies.js` — 8 enemies with cute critter-face styling, melee/ranged/charge AI (aggro ranges deliberately modest — exploring shouldn't trigger dogpiles) + `WORLD_BOSSES` (King Slime/Elder Treant/Stone Colossus): giant scaled variants on a timer, `spawnWorldBoss()`, despawn after 150s
- `src/entities/npcs.js` — Riverbrook village: 5 huts, well, market stall, forge corner, fenced garden, flower beds, lamps, community campfire, gacha capsule machine; 12 villagers: 5 quest-givers + Master NXR (koala Gacha Master ≈ creator mascot) + ambient (squirrel kid, turtle grandpa, duck, dog, **Nyanya** the pink cat-girl, **Barong** the Balinese guardian lion — ornate red/gold/white mask, mane, fangs, crown). NPCs walk activity schedules (stationary ones use `headBaseY`; Barong stands guard at the entrance). The **market stall / gacha machine / anvil are directly interactable landmarks** (walk up + F) so you never have to chase a wandering shopkeeper. IMPORTANT: village props must never block the 3x3 cells around terrain.spawn (force-cleared at end of build)
- `src/world/landmarks.js` — scattered scenic structures in the wilds (spinning windmill, Balinese-style shrine w/ glowing gem, ruined mossy tower) to make the world feel lived-in
- `src/entities/projectiles.js`, `pickups.js` — arrows/bolts/knives (pierce & AoE), world drops with player magnet (magnet multiplier param)
- `src/world/terrain.js`, `decor.js`, `water.js` — SMOOTH heightfield terrain (bilinear corner grid, faceted low-poly shading, calm Stardew-ish tiles, soft path-edge fringe tiles — deliberately NOT blocky), flattened village pocket; scenery trees are LUSH ROUNDED 3D canopies (trunk + 2 stacked rounded tiers) — bright cheerful GREEN or pink SAKURA (each ~half), with fruit/blossom accents, spaced 4.4 apart so canopies never overlap; per-tree tint via `setColorAt`/instanceColor (NEVER `vertexColors` — that renders instanced meshes black); faceted rocks, dense flower meadows, bushes, torches, butterflies (day) & fireflies (night); water is a subdivided plane rippling in a soft double-sine swell; lakes are NOT walkable
- `src/world/chests.js` — sparkling treasure chests (materials, tonics, pet charms), respawn elsewhere after looting
- `src/world/weather.js` — rain showers (streak particles, splashes) that dim lighting & drive the audio rain loop
- `src/gfx/textures.js` — ALL pixel art generators (palette locked in `PALETTE`; `makeCritterFaceTexture` for enemy/NPC/pet/mount faces; charm & whistle icon painters)
- `src/gfx/lighting.js`, `particles.js` — full day-cycle grading (golden dawn/bright noon/orange dusk/blue night, morning mist) + in-game clock; particles incl. shockwave rings & pooled light flashes
- `src/audio/audio.js` — generative music (day/night/combat) + ~50 SFX (incl. jump/roar/mount) + rain loop, all WebAudio
- `src/ui/charcreate.js` — MMO-style 3-column creation screen with live 3D preview, stat bars, face accessories, randomize dice
- `src/ui/hud.js`, `panels.js`, `dialog.js`, `mobile.js`, `minimap.js` — cohesive UI theme (design tokens in index.html `:root`: parchment/gold on deep forest, cut-corner `--cut` clip-path panels, ◆ accents); HUD (plate, skill bar, minimap w/ pulsing gold world-boss marker, quest tracker, interact prompt), Bag/Craft/Forge/Companions(pets+mounts)/Guide panels, NPC dialog with quest offer/turn-in, compact touch controls (dynamic joystick + action cluster + jump + contextual ★ button)

## Current status

All core features verified end-to-end in-browser: opening menu (New/Continue/About), character creation, 4 classes, 8 enemies + 3 world bosses on a 3-minute timer, jump, 6 mounts (starter Sprig free), 10 pets, skill leveling (K), leveling, crafting, forging, cooking, quest chain + repeatables, fishing (manual + AFK) with full visuals, treasure chests, coin economy (Pip's shop buy/sell), farming (seeds→harvest→sell), housing (land + 3 designs), gacha (Master NXR's Wonder Capsules), gathering (birch/ore nodes), safe zones w/ fast-heal resting, out-of-combat auto-heal, world map (N), village with 10 NPCs & activity schedules, rain weather, day-night cycle, smooth non-blocky terrain + pixel-art imposter trees, full themed HUD, mobile controls (incl. AFK 💤 button), generative audio, save game (localStorage, key `semesta.save.v3`).

## Next roadmap (not started)

- **Multiplayer** — position/combat sync between players (likely WebSocket/WebRTC + a light server)
- **Connect wallet** — Web3 auth, possibly on-chain progress/inventory

## Conventions

- All in-game text & code comments are in English
- Never add image/audio asset files — everything stays procedural (canvas/WebAudio) per the original design. The ONLY exceptions are the two branding images in `logoasset/` (logo + creator mascot)
- Color palette is locked in `PALETTE` (src/gfx/textures.js) — keep the cozy 2.5D voxel style consistent
- `window.__semesta` exposes the live systems for automated verification
