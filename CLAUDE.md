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

- `src/main.js` — bootstrap: Character Creation → build world → game loop; wires the interact system (F key / mobile ★ button: talk / open chest / fish), auto-aim, camera shake, save v3 (localStorage)
- `src/systems/classes.js` — 4 classes (Knight/Archer/Mage/Assassin): base stats, weapon type, 3 skills each + all customization constants (8 skins, 8 hair styles, 10 hair colors, 6 eye colors, 4 outfit styles, capes)
- `src/systems/items.js` — items, per-class weapons (4 tiers), fish, pet charms, drop tables for 8 enemy types
- `src/systems/skills.js` — 12 skills with cooldowns & juicy FX (shockwaves, light flashes, screen shake)
- `src/systems/quests.js` — quest chain + repeatable grind quests (kill/fish/chest/forge/deliver/talk objectives), tracker lines, save/load
- `src/systems/pets.js` — 5 collectible pet companions (charms from chests), follower AI, passive perks
- `src/systems/fishing.js` — shore fishing minigame (cast → wait → "!" → strike), 3 fish rarities
- `src/systems/forge.js`, `crafting.js`, `level.js`, `inventory.js` — +1..+9 weapon forging, class-filtered crafting, XP/levels, inventory+hotbar
- `src/entities/player.js` — `buildCharacterMesh()` (chibi rig, full customization incl. outfit styles & capes) + player runtime (camera-relative movement, roll, shield, per-weapon attack anims with lunge)
- `src/entities/enemies.js` — 8 enemies (Slime, Nibbit, Armorbug, Fungling, Boarling, Wisp [night only], Treant, Golem [mini-boss]) with cute critter-face styling, melee/ranged/charge AI
- `src/entities/npcs.js` — Riverbrook village: animal villagers (bear/cat/badger/rabbit/bird) with dialog, voxel huts, quest markers
- `src/entities/projectiles.js`, `pickups.js` — arrows/bolts/knives (pierce & AoE), world drops with player magnet
- `src/world/terrain.js`, `decor.js`, `water.js` — deterministic fBm heightmap, voxel mesh, flower meadows, trees/rocks/bushes/torches, lakes (water is NOT walkable)
- `src/world/chests.js` — sparkling treasure chests scattered on the map (materials, tonics, pet charms), respawn elsewhere after looting
- `src/world/weather.js` — rain showers (streak particles, splashes) that dim lighting & drive the audio rain loop
- `src/gfx/textures.js` — ALL pixel art generators (palette locked in `PALETTE`; `makeCritterFaceTexture` for enemy/NPC/pet faces)
- `src/gfx/lighting.js`, `particles.js` — full day-cycle grading (golden dawn/bright noon/orange dusk/blue night, morning mist) + in-game clock; particles incl. shockwave rings & pooled light flashes
- `src/audio/audio.js` — generative music (day/night/combat) + ~45 SFX + rain loop, all WebAudio
- `src/ui/charcreate.js` — MMO-style 3-column creation screen with live 3D preview, stat bars, randomize dice
- `src/ui/hud.js`, `panels.js`, `dialog.js`, `mobile.js` — HUD (plate, skill bar, minimap, quest tracker, interact prompt), Bag/Craft/Forge/Pets/Guide panels, NPC dialog with quest offer/turn-in, compact touch controls (dynamic joystick + action cluster + contextual ★ button)

## Current status

All core features verified end-to-end in-browser: character creation, 4 classes with unique weapons & skills, 8 enemies, leveling, crafting, forging, quest chain + repeatables, fishing, treasure chests, pet companions, village NPCs with dialog, rain weather, day-night cycle with dawn/dusk grading, full HUD, mobile controls, generative audio, save game (localStorage, key `semesta.save.v3`).

## Next roadmap (not started)

- **Multiplayer** — position/combat sync between players (likely WebSocket/WebRTC + a light server)
- **Connect wallet** — Web3 auth, possibly on-chain progress/inventory

## Conventions

- All in-game text & code comments are in English
- Never add image/audio asset files — everything stays procedural (canvas/WebAudio) per the original design
- Color palette is locked in `PALETTE` (src/gfx/textures.js) — keep the cozy 2.5D voxel style consistent
- `window.__semesta` exposes the live systems for automated verification
