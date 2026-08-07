// THE AUTHORITATIVE WORLD.
//
// Everything here is the single source of truth for things that must look the
// same to everybody: the clock, the weather, where the monsters are, and the
// world boss. Clients no longer decide any of it — they render what they are
// told and predict only their own movement.
//
// What is deliberately NOT here: the map. Semesta generates its terrain, decor
// and landmarks from fixed seeds, so every client already builds a byte-identical
// world from the code alone. The server never sends a single tile. That is worth
// stating plainly because it is why this can run on a small VPS at all.
//
// Nor is player inventory: progression stays client-side and syncs to Supabase.
// That means a determined player can cheat their own gold, and this file is
// where you would move it if that ever mattered. For a co-op world where nobody
// competes for a ranking, trusting the client here buys a very large amount of
// simplicity.

import { INTEREST_RADIUS } from './protocol.js';

// --- world constants, mirrored from the client -----------------------------
const WORLD_SIZE = 160;          // cells per side, from src/world/terrain.js
const HALF = WORLD_SIZE / 2;
const DAY_SPEED = 2.4;           // in-game minutes per real second
const BOSS_INTERVAL = 180;       // seconds
const MAX_ENEMIES = 90;          // across the whole map, not per player

// Enemy archetypes. Only what the SERVER needs: how they move and how much
// damage they can take. Everything about how they LOOK stays on the client,
// keyed by `t`.
const TYPES = {
  slime:    { hp: 26,  speed: 1.5, aggro: 8,  dmg: 6,  xp: 12 },
  bunbun:   { hp: 20,  speed: 2.4, aggro: 7,  dmg: 5,  xp: 10 },
  boar:     { hp: 46,  speed: 2.2, aggro: 10, dmg: 11, xp: 22 },
  bat:      { hp: 24,  speed: 2.8, aggro: 9,  dmg: 7,  xp: 16 },
  wisp:     { hp: 30,  speed: 1.8, aggro: 11, dmg: 9,  xp: 20 },
  golem:    { hp: 90,  speed: 1.0, aggro: 9,  dmg: 16, xp: 40 },
  treant:   { hp: 74,  speed: 1.2, aggro: 10, dmg: 14, xp: 34 },
  embercub: { hp: 40,  speed: 2.5, aggro: 10, dmg: 12, xp: 26 },
  frostling:{ hp: 38,  speed: 2.3, aggro: 10, dmg: 11, xp: 25 },
  sparkit:  { hp: 28,  speed: 3.0, aggro: 8,  dmg: 8,  xp: 18 },
  mossback: { hp: 110, speed: 0.9, aggro: 8,  dmg: 15, xp: 44 },
  thornling:{ hp: 34,  speed: 1.6, aggro: 9,  dmg: 10, xp: 22 },
};
const TYPE_IDS = Object.keys(TYPES);

const BOSSES = {
  king_slime:    { hp: 520,  dmg: 22, speed: 1.2 },
  elder_treant:  { hp: 650,  dmg: 26, speed: 0.9 },
  stone_colossus:{ hp: 800,  dmg: 30, speed: 0.75 },
  frost_monarch: { hp: 720,  dmg: 28, speed: 1.35 },
  tide_warden:   { hp: 900,  dmg: 32, speed: 0.9 },
  ember_tyrant:  { hp: 1050, dmg: 36, speed: 1.5 },
};
const BOSS_IDS = Object.keys(BOSSES);

/** Sanctuaries: nothing spawns inside, nothing hunts you inside. Mirrors the
 *  client's `inSafeZone`. The village is at the world origin. */
const SAFE = [{ x: 0, z: 0, r: 13 }];

export function createWorld({ onBossSpawn, onToast } = {}) {
  const state = {
    tick: 0,
    time: 8 * 60,          // in-game minutes; 8am
    weather: 'clear',      // clear | rain
    weatherT: 120,
    enemies: new Map(),    // id -> entity
    boss: null,
    bossTimer: BOSS_INTERVAL,
    nextId: 1,
    farm: new Map(),       // plot index -> { seed, stage, t, owner }
  };

  const isSafe = (x, z) =>
    SAFE.some((s) => (x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r);

  // ---------------------------------------------------------------------
  // SPAWNING
  //
  // The client used to spawn monsters in a ring around ITSELF. On a shared map
  // that would give every player their own private pack standing in the same
  // field, so spawning is global here: a fixed population spread over the whole
  // world, topped up wherever players actually are.
  // ---------------------------------------------------------------------
  function spawnNear(players) {
    if (state.enemies.size >= MAX_ENEMIES) return;
    const arr = [...players.values()];
    if (!arr.length) return;
    const anchor = arr[Math.floor(Math.random() * arr.length)];
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 26;
      const x = anchor.x + Math.cos(a) * d;
      const z = anchor.z + Math.sin(a) * d;
      if (Math.abs(x) > HALF - 4 || Math.abs(z) > HALF - 4) continue;
      if (isSafe(x, z)) continue;
      // never right on top of anybody
      if (arr.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 14 * 14)) continue;

      const t = TYPE_IDS[Math.floor(Math.random() * TYPE_IDS.length)];
      const def = TYPES[t];
      // level rises with distance from the village and with the strongest
      // player present, so the wilds never fall behind the group
      const distTier = Math.min(4, Math.floor(Math.hypot(x, z) / 22));
      const topLevel = arr.reduce((m, p) => Math.max(m, p.level || 1), 1);
      const lv = Math.max(1, distTier + Math.floor(topLevel / 5));
      const elite = Math.random() < 0.08 && lv > 1;
      const hpMax = Math.round(def.hp * (1 + lv * 0.45) * (elite ? 2.6 : 1));
      const id = state.nextId++;
      state.enemies.set(id, {
        id, t, x, y: 0, z, f: a, lv, elite,
        hp: hpMax, hpMax,
        dmg: Math.round(def.dmg * (1 + lv * 0.3) * (elite ? 1.5 : 1)),
        speed: def.speed, aggro: def.aggro, xp: def.xp,
        target: null, wanderT: 0, atkCd: 0,
      });
      return;
    }
  }

  function spawnBoss(players) {
    const arr = [...players.values()];
    if (!arr.length) return;
    const anchor = arr[Math.floor(Math.random() * arr.length)];
    const kind = BOSS_IDS[Math.floor(Math.random() * BOSS_IDS.length)];
    const def = BOSSES[kind];
    for (let tries = 0; tries < 30; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = 24 + Math.random() * 14;
      const x = anchor.x + Math.cos(a) * d;
      const z = anchor.z + Math.sin(a) * d;
      if (Math.abs(x) > HALF - 6 || Math.abs(z) > HALF - 6) continue;
      if (isSafe(x, z) || Math.hypot(x, z) < 26) continue;
      state.boss = {
        id: state.nextId++, kind, x, y: 0, z, f: 0,
        hp: def.hp, hpMax: def.hp, dmg: def.dmg, speed: def.speed,
        phase: 0, life: 150, target: null,
        // who has hit it, so the kill can be credited to everyone who helped
        contributors: new Set(),
      };
      onBossSpawn?.(state.boss);
      return;
    }
  }

  // ---------------------------------------------------------------------
  // TICK
  // ---------------------------------------------------------------------
  function update(dt, players) {
    state.tick++;

    // --- clock. One clock for the whole world: it must be the same night for
    // everyone, or half the players see lanterns lit and half do not.
    state.time = (state.time + dt * DAY_SPEED) % 1440;

    // --- weather, on its own slow schedule
    state.weatherT -= dt;
    if (state.weatherT <= 0) {
      const wasRain = state.weather === 'rain';
      state.weather = wasRain ? 'clear' : (Math.random() < 0.35 ? 'rain' : 'clear');
      state.weatherT = state.weather === 'rain' ? 60 + Math.random() * 60
        : 150 + Math.random() * 180;
    }

    // --- population top-up
    if (players.size && Math.random() < dt * 1.4) spawnNear(players);

    // --- enemies
    const arr = [...players.values()];
    for (const [id, e] of state.enemies) {
      // despawn anything nobody is anywhere near — the world does not need to
      // simulate a wolf in an empty forest
      const nearest = closestPlayer(arr, e.x, e.z);
      if (!nearest || nearest.d > 90) { state.enemies.delete(id); continue; }

      e.atkCd = Math.max(0, e.atkCd - dt);
      const p = nearest.p;
      // A swimmer, someone busy, or someone in a sanctuary is not a target.
      const reachable = !p.swimming && !p.busy && !isSafe(p.x, p.z);
      if (reachable && nearest.d < e.aggro) e.target = p.id;
      else if (e.target && (!reachable || nearest.d > e.aggro * 1.8)) e.target = null;

      if (e.target) {
        const dx = p.x - e.x, dz = p.z - e.z;
        const d = Math.hypot(dx, dz) || 1;
        e.f = Math.atan2(dx, dz);
        if (d > 1.8) {
          e.x += (dx / d) * e.speed * dt;
          e.z += (dz / d) * e.speed * dt;
        } else if (e.atkCd <= 0) {
          e.atkCd = 1.6;
          e.hit = { target: p.id, dmg: e.dmg };   // drained by the caller
        }
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 3; e.f = Math.random() * Math.PI * 2; }
        e.x += Math.sin(e.f) * e.speed * 0.35 * dt;
        e.z += Math.cos(e.f) * e.speed * 0.35 * dt;
      }
      // hard-clamp out of sanctuaries and off the map edge
      for (const s of SAFE) {
        const dx = e.x - s.x, dz = e.z - s.z;
        const d = Math.hypot(dx, dz);
        if (d < s.r) { e.x = s.x + (dx / (d || 1)) * s.r; e.z = s.z + (dz / (d || 1)) * s.r; }
      }
      e.x = Math.max(-HALF + 2, Math.min(HALF - 2, e.x));
      e.z = Math.max(-HALF + 2, Math.min(HALF - 2, e.z));
    }

    // --- world boss
    if (state.boss) {
      const b = state.boss;
      b.life -= dt;
      if (b.life <= 0 || b.hp <= 0) {
        state.boss = null;
        state.bossTimer = BOSS_INTERVAL;
      } else {
        const nearest = closestPlayer(arr, b.x, b.z);
        if (nearest && nearest.d < 24) {
          const dx = nearest.p.x - b.x, dz = nearest.p.z - b.z;
          const d = Math.hypot(dx, dz) || 1;
          b.f = Math.atan2(dx, dz);
          if (d > 2.6) { b.x += (dx / d) * b.speed * dt; b.z += (dz / d) * b.speed * dt; }
        }
        // phase escalates as it loses health — the client plays the FX
        const frac = b.hp / b.hpMax;
        b.phase = frac > 0.6 ? 0 : frac > 0.3 ? 1 : 2;
      }
    } else if (players.size) {
      state.bossTimer -= dt;
      if (state.bossTimer <= 0) { state.bossTimer = BOSS_INTERVAL; spawnBoss(players); }
    }

    // --- crops grow on the server so a field looks the same to everyone
    for (const plot of state.farm.values()) {
      if (plot.seed && plot.stage < 2) {
        plot.t += dt;
        if (plot.t > 45) { plot.t = 0; plot.stage++; }
      }
    }
  }

  function closestPlayer(arr, x, z) {
    let best = null, bd = Infinity;
    for (const p of arr) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { p: best, d: bd } : null;
  }

  /** Apply damage from a player. Returns the entity if it died. */
  function damage(entityId, amount, byPlayerId) {
    const e = state.enemies.get(entityId);
    if (e) {
      e.hp -= amount;
      if (e.hp <= 0) { state.enemies.delete(entityId); return { kind: 'enemy', e }; }
      return { kind: 'enemy', e, alive: true };
    }
    if (state.boss && state.boss.id === entityId) {
      const b = state.boss;
      b.hp -= amount;
      b.contributors.add(byPlayerId);
      if (b.hp <= 0) {
        const dead = b;
        state.boss = null;
        state.bossTimer = BOSS_INTERVAL;
        return { kind: 'boss', e: dead };
      }
      return { kind: 'boss', e: b, alive: true };
    }
    return null;
  }

  /** Only what this player can see. Interest management is what keeps the
   *  bandwidth flat as the world fills up. */
  function snapshotFor(p) {
    const out = [];
    const r2 = INTEREST_RADIUS * INTEREST_RADIUS;
    for (const e of state.enemies.values()) {
      if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 > r2) continue;
      out.push([e.id, e.t, +e.x.toFixed(2), +e.z.toFixed(2), +e.f.toFixed(2),
        e.hp, e.hpMax, e.lv, e.elite ? 1 : 0]);
    }
    return out;
  }

  const clock = () => ({ time: Math.round(state.time), weather: state.weather, tick: state.tick });

  return { state, update, damage, snapshotFor, clock, isSafe, TYPES, BOSSES };
}
