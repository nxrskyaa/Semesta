# Semesta

Voxel action RPG 2.5D in the browser. three.js + Vite, vanilla JS ES modules. All pixel art (textures, sprites, icons) is generated procedurally via 16px canvas — no image files. Music & SFX are fully synthesized with WebAudio — no audio files.

Art direction: cozy Stardew-Valley-ish palette (lush greens, warm earth, turquoise water), chibi big-head characters (NOT minecraft proportions), cute-critter enemies/NPCs/pets with big glossy pixel eyes (Pokemon / Pokopia / Animal Crossing energy).

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Structure

- `src/main.js` — bootstrap: Character Creation → build world → game loop; wires the interact system (F key / mobile ★ button: talk / open chest / fish), auto-aim (re-acquires nearest enemy on every strike/release), jump (Space), mounts (M), world boss scheduler (every 180s), camera shake, save v3 (localStorage)
- `src/systems/classes.js` — 4 classes (Knight/Archer/Mage/Assassin): base stats, weapon type, 3 skills each + all customization constants (8 skins, 12 hair styles incl. `BALD_STYLE`, 10 hair colors, 6 eye colors, 6 face accessories, 4 outfit styles, capes)
- `src/systems/items.js` — items, per-class weapons (4 tiers), fish, 10 pet charms, 4 mount whistles, drop tables for 8 enemy types
- `src/systems/skills.js` — 12 skills with cooldowns & juicy FX (shockwaves, light flashes, screen shake)
- `src/systems/quests.js` — quest chain + mount quests (simple deliveries → world boss hunts) + repeatable grind quests (kill/kill_any/fish/chest/forge/deliver/talk objectives; `worldboss` kill target), tracker lines, save/load
- `src/systems/pets.js` — 10 collectible pet companions (charms from chests / world bosses / quests), follower AI, passive perks (speed/dmg/regen/atkSpeed/xp/armor/crit/stamRegen/magnet/fish)
- `src/systems/mounts.js` — 4 rideable mounts (Trotter/Clucky/Shellsworth/Nimbus) from villager quests; mesh attaches under the player, gallop anim, speed/jump multipliers
- `src/systems/fishing.js` — shore fishing minigame (cast → wait → "!" → strike) with full visual kit: rod in hand, sagging line, bobber ripples, catch arcs to the player
- `src/systems/forge.js`, `crafting.js`, `level.js`, `inventory.js` — +1..+9 weapon forging, class-filtered crafting, XP/levels, inventory+hotbar
- `src/entities/player.js` — `buildCharacterMesh()` (chibi rig, detailed tiered weapons w/ rune glows, 4 outfit cuts w/ trims, capes) + runtime (camera-relative movement, jump physics w/ land squash, roll, shield, mount seat pose, fluid per-weapon attack anims — assassin cross-slash combo; swing trail arc renders IN FRONT via `flashTrail`)
- `src/entities/enemies.js` — 8 enemies with cute critter-face styling, melee/ranged/charge AI + `WORLD_BOSSES` (King Slime/Elder Treant/Stone Colossus): giant scaled variants on a timer, `spawnWorldBoss()`, despawn after 150s
- `src/entities/npcs.js` — Riverbrook village: 5 huts, well, market stall, forge corner (anvil+furnace glow), fenced garden, lamps, clutter; animal villagers walk activity schedules (hammering w/ sparks, fishing, garden tending, shopkeeping, patrols), greet the player, quest markers
- `src/entities/projectiles.js`, `pickups.js` — arrows/bolts/knives (pierce & AoE), world drops with player magnet (magnet multiplier param)
- `src/world/terrain.js`, `decor.js`, `water.js` — SMOOTH heightfield terrain (bilinear corner grid, faceted low-poly shading, steep faces read as dirt/stone — deliberately NOT blocky), flattened village pocket; rounded icosahedron tree canopies & rocks, flower meadows, bushes, torches, butterflies (day) & fireflies (night); lakes are NOT walkable
- `src/world/chests.js` — sparkling treasure chests (materials, tonics, pet charms), respawn elsewhere after looting
- `src/world/weather.js` — rain showers (streak particles, splashes) that dim lighting & drive the audio rain loop
- `src/gfx/textures.js` — ALL pixel art generators (palette locked in `PALETTE`; `makeCritterFaceTexture` for enemy/NPC/pet/mount faces; charm & whistle icon painters)
- `src/gfx/lighting.js`, `particles.js` — full day-cycle grading (golden dawn/bright noon/orange dusk/blue night, morning mist) + in-game clock; particles incl. shockwave rings & pooled light flashes
- `src/audio/audio.js` — generative music (day/night/combat) + ~50 SFX (incl. jump/roar/mount) + rain loop, all WebAudio
- `src/ui/charcreate.js` — MMO-style 3-column creation screen with live 3D preview, stat bars, face accessories, randomize dice
- `src/ui/hud.js`, `panels.js`, `dialog.js`, `mobile.js`, `minimap.js` — cohesive UI theme (design tokens in index.html `:root`: parchment/gold on deep forest, cut-corner `--cut` clip-path panels, ◆ accents); HUD (plate, skill bar, minimap w/ pulsing gold world-boss marker, quest tracker, interact prompt), Bag/Craft/Forge/Companions(pets+mounts)/Guide panels, NPC dialog with quest offer/turn-in, compact touch controls (dynamic joystick + action cluster + jump + contextual ★ button)

## Current status

All core features verified end-to-end in-browser: character creation, 4 classes, 8 enemies + 3 world bosses on a 3-minute timer, jump, 4 mounts, 10 pets, leveling, crafting, forging, quest chain + mount quests + repeatables, fishing with full visuals, treasure chests, village with NPC activity schedules, rain weather, day-night cycle, smooth non-blocky terrain, full themed HUD, mobile controls, generative audio, save game (localStorage, key `semesta.save.v3`).

## Next roadmap (not started)

- **Multiplayer** — position/combat sync between players (likely WebSocket/WebRTC + a light server)
- **Connect wallet** — Web3 auth, possibly on-chain progress/inventory

## Conventions

- All in-game text & code comments are in English
- Never add image/audio asset files — everything stays procedural (canvas/WebAudio) per the original design
- Color palette is locked in `PALETTE` (src/gfx/textures.js) — keep the cozy 2.5D voxel style consistent
- `window.__semesta` exposes the live systems for automated verification
