// THE HOLLOW — Anavela's dungeon, and the answer to "what is there to do at Lv20".
//
// The overworld is a place you LIVE in: it is safe, it is pretty, the monsters
// are modest on purpose and you can walk away from any of them. That is right
// for Anavela and it leaves nothing to be afraid of. The Hollow is the other
// thing — a sealed place you choose to go down into, where nothing wanders off,
// nothing is scenery, and the way out is forward.
//
// It is also where the story's own logic points. The Lanternkeepers kept the
// lights burning; the lights went out and the wilds walked back in. Something
// put them out. The Hollow is under the shrine, and it is where the dark that
// took the northern road actually lives.
//
// SHAPE OF A RUN
//
//   30 floors, three difficulties, and the floor number means something:
//     · every floor is one sealed hall you must clear to open the stair
//     · every  5th floor is a WARDEN — a mini-boss, one mechanic, tight room
//     · every 10th floor is a GREAT BOSS — three phases, its own hall
//   Floors 1-10 are the Stone Halls, 11-20 the Frost Crypt, 21-30 the Ember
//   Core: the band changes the walls, the light, the music and the monsters, so
//   you can tell how deep you are by looking rather than by reading a number.
//
// WHY DIFFICULTY IS A CHOICE AND NOT A SLIDER. Easy is a real run with real
// rewards, not a tutorial — somebody who plays for an hour a week should still
// see all thirty floors and the bosses at the end of them. Hard is where the
// limited gear is, and it is genuinely nasty. The difference is what the run
// PAYS, not whether you are allowed to see it.
//
// THE MODULE NEVER TOUCHES THE INVENTORY. Rewards are described here as data
// and granted by a caller-supplied `grant()`, exactly like dailies, gamepass
// and the index. This file can be reasoned about without knowing what a bag is.

export const UNLOCK_LEVEL = 20;
export const MAX_FLOOR = 30;

/** A floor's kind, from its number alone. The whole layout follows from this. */
export function floorKind(n) {
  if (n % 10 === 0) return 'great';   // 10, 20, 30
  if (n % 5 === 0) return 'warden';   // 5, 15, 25
  return 'hall';
}

/** Which of the three bands a floor sits in. Drives art, music and monsters. */
export function floorTheme(n) {
  if (n <= 10) return 'stone';
  if (n <= 20) return 'frost';
  return 'ember';
}

export const THEMES = {
  stone: {
    name: 'The Stone Halls',
    blurb: 'Lanternkeeper masonry, and the first place the lights went out.',
    floor: '#6b5d4e', wall: '#544a3e', trim: '#a08a68', accent: '#ffc478',
    fog: '#241d18', light: '#ffb45c', glyph: '◈',
  },
  frost: {
    name: 'The Frost Crypt',
    blurb: 'Below the water table. Whatever is down here, the cold kept it.',
    floor: '#586c80', wall: '#3f4e5e', trim: '#9cc4e0', accent: '#a8e4ff',
    fog: '#18242e', light: '#8fd0ff', glyph: '❉',
  },
  ember: {
    name: 'The Ember Core',
    blurb: 'The bottom. Something down here is still burning after all this time.',
    floor: '#6b3d34', wall: '#4a2e28', trim: '#d67246', accent: '#ff8f52',
    fog: '#26120c', light: '#ff7a3c', glyph: '✸',
  },
};

// ---------------------------------------------------------------------------
// DIFFICULTY
//
// `enemyLv` is added to the floor's own level, `hp`/`dmg` multiply the monsters,
// and `loot` decides how far up the reward table a run can reach. Hard is the
// only difficulty that can pay a mythic, and that is the entire reason to play
// it — not a bigger number on the same prize.
// ---------------------------------------------------------------------------
export const DIFFICULTIES = {
  easy: {
    id: 'easy', name: 'Descent', tag: 'EASY', color: '#7fd06a',
    enemyLv: 0, hp: 0.8, dmg: 0.55, xp: 1.0, coins: 1.0,
    packs: 0.8, maxLoot: 'rare',
    blurb: 'The whole Hollow, at a pace you can learn it at. Every floor, every boss.',
  },
  medium: {
    id: 'medium', name: 'Deep Descent', tag: 'MEDIUM', color: '#ffc95c',
    enemyLv: 6, hp: 1.2, dmg: 0.95, xp: 1.7, coins: 1.6,
    packs: 1.0, maxLoot: 'epic',
    blurb: 'They hit back properly, and they do not come one at a time.',
  },
  hard: {
    id: 'hard', name: 'The Unlit', tag: 'HARD', color: '#ff6b5e',
    enemyLv: 14, hp: 1.7, dmg: 1.45, xp: 2.8, coins: 2.4,
    packs: 1.25, maxLoot: 'mythic',
    blurb: 'No mercy, no second chances, and the only place the Unlit gear drops.',
  },
};
export const DIFF_ORDER = ['easy', 'medium', 'hard'];

// ---------------------------------------------------------------------------
// FLOOR COMPOSITION
//
// How many things are in the room, and what. Deliberately NOT "spawn until the
// player is bored": a hall is a fixed set of monsters and it is cleared when
// they are dead, so the floor has an end you can see coming and a rhythm you
// can plan around. That is the whole difference between a dungeon and a field.
// ---------------------------------------------------------------------------

/** Monsters on a normal hall, before the difficulty multiplier. */
function hallPopulation(n) {
  // grows slowly and flattens: floor 1 is four, floor 29 is about eleven
  return Math.round(4 + Math.min(7, (n - 1) * 0.26));
}

/** The full plan for one floor. Everything the world builder needs. */
export function planFloor(n, diffId) {
  const d = DIFFICULTIES[diffId] || DIFFICULTIES.easy;
  const kind = floorKind(n);
  const theme = floorTheme(n);
  // A floor's own level, before difficulty. Floor 1 is around the unlock level
  // and floor 30 is well past the cap, because the cap is 30 and the last floor
  // should be something a maxed hero can still lose to.
  const level = Math.round(UNLOCK_LEVEL + n * 1.25) + d.enemyLv;
  return {
    floor: n, kind, theme, difficulty: d.id, level,
    count: kind === 'hall' ? Math.max(3, Math.round(hallPopulation(n) * d.packs)) : 0,
    // a warden brings a small guard; a great boss stands alone, because a boss
    // you cannot see through a crowd is just a crowd
    guards: kind === 'warden' ? Math.max(2, Math.round(3 * d.packs)) : 0,
    boss: kind === 'hall' ? null : bossFor(n),

    // THE HOLLOW SCALES ON ITS OWN CURVE, and it has to.
    //
    // The overworld multiplies a monster by `1 + (level-1) * 0.3` for damage,
    // which is tuned for the levels it actually produces — roughly 1 to 10. A
    // dungeon floor hands out levels of 24 to 58, and at level 24 that curve is
    // already EIGHT TIMES the base. Measured before this: a hero at Lv25 with
    // 400 HP stood still on EASY floor 3 and was dead in eight seconds. That is
    // not a difficulty, it is a wall, and it made "Easy is a real run anyone can
    // finish" a lie.
    //
    // So the floor supplies the whole multiplier and the level is only a label.
    // Health climbs faster than damage on purpose: deeper floors should take
    // longer to chew through, not delete you quicker.
    hpMult: (1 + n * 0.18) * d.hp,
    dmgMult: (1 + n * 0.10) * d.dmg,
    xpMult: (1 + n * 0.25) * d.xp,
    coinMult: d.coins,
    // A BOSS TAKES THE DIFFICULTY AND NOT THE FLOOR CURVE. Its health is
    // already written per floor in the boss table — 900 for the first warden,
    // 4,600 for the last lord — so multiplying by depth as well would have made
    // Emberheart a fifty-thousand-point health bar you hit for four minutes.
    bossHpMult: d.hp,
    bossDmgMult: d.dmg,
    bossXpMult: d.xp,
  };
}

/** Which boss stands on a boss floor. Six of them, two per band. */
export function bossFor(n) {
  const k = floorKind(n);
  if (k === 'hall') return null;
  const band = floorTheme(n);
  return k === 'warden'
    ? { stone: 'warden_lampsworn', frost: 'warden_hoarfrost', ember: 'warden_cinderjaw' }[band]
    : { stone: 'lord_unlit', frost: 'lord_glacius', ember: 'lord_emberheart' }[band];
}

// ---------------------------------------------------------------------------
// REWARDS
//
// Two separate things, and keeping them separate is what stops the run feeling
// like a slot machine:
//
//   · The FLOOR pays every time. Coins, mats, XP — it scales with depth and
//     difficulty and it is guaranteed, so a run is never wasted.
//   · The BOSS pays a PIECE. Wardens drop from their band's pool, great bosses
//     drop the good one, and it is capped by difficulty — so the mythic set is
//     something you go to Hard for, not something you might trip over on Easy.
//
// FIRST CLEAR IS DIFFERENT. Every boss hands over its signature piece the first
// time you beat it on a given difficulty, guaranteed. Nobody should beat a boss
// six times and be told the dice said no — the first kill IS the achievement,
// and after that it is a chance like anything else.
// ---------------------------------------------------------------------------

const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };

/** The signature drop of each boss — guaranteed on a first clear. */
export const BOSS_PRIZE = {
  warden_lampsworn: 'hollow_lantern',
  warden_hoarfrost: 'hat_hoarfrost',
  warden_cinderjaw:  'back_cinderwing',
  lord_unlit:       'WEAPON:unlit',      // resolved to the player's own class
  lord_glacius:     'WEAPON:glacius',
  lord_emberheart:  'WEAPON:emberheart',
};

/** Extra pieces a boss can also drop, by band. Capped by difficulty. */
export const BAND_POOL = {
  stone: ['hollow_lantern', 'hat_keeper', 'trail_emberdust'],
  frost: ['hat_hoarfrost', 'back_frostmantle', 'trail_frostmote'],
  ember: ['back_cinderwing', 'hat_embercrown', 'trail_cinder'],
};

/**
 * What clearing a floor pays. Guaranteed, so a run always moves you forward.
 * Returned as DATA — the caller grants it.
 */
export function floorReward(plan) {
  const deep = plan.floor / MAX_FLOOR;
  const out = [
    { kind: 'coins', amount: Math.round((40 + plan.floor * 14) * plan.coinMult) },
    { kind: 'xp', amount: Math.round((60 + plan.floor * 22) * plan.xpMult) },
  ];
  // forge stones get commoner with depth; the deep floors also pay hollow shards
  out.push({ kind: 'item', id: 'forge_stone', amount: 1 + (plan.floor % 3 === 0 ? 1 : 0) });
  if (plan.kind !== 'hall') out.push({ kind: 'item', id: 'hollow_shard', amount: plan.kind === 'great' ? 3 : 1 });
  if (deep > 0.5) out.push({ kind: 'item', id: 'tonic', amount: 1 });
  return out;
}

/**
 * What a boss drops. `firstClear` guarantees the signature piece.
 *
 * @param owned  (id) => boolean, so a duplicate unique can be skipped rather
 *               than handed over again — the caller knows what the bag holds.
 */
export function bossDrops(plan, { firstClear, owned, rand = Math.random }) {
  const drops = [];
  const bossId = plan.boss;
  const cap = RANK[DIFFICULTIES[plan.difficulty].maxLoot];

  if (firstClear) drops.push(BOSS_PRIZE[bossId]);

  // a second chance at something from the band, if the difficulty reaches it
  const pool = (BAND_POOL[plan.theme] || []).filter((id) => !owned?.(id));
  if (pool.length && rand() < (plan.kind === 'great' ? 0.55 : 0.3)) {
    drops.push(pool[Math.floor(rand() * pool.length)]);
  }
  return { drops, cap };
}

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

export function createDungeon() {
  const state = {
    // deepest floor CLEARED per difficulty — you may re-enter anything up to
    // deepest+1, so a run is never a re-grind of what you have already beaten
    cleared: { easy: 0, medium: 0, hard: 0 },
    // bosses beaten per difficulty, so first-clear rewards fire exactly once
    bossesBeaten: {},          // `${diff}:${bossId}` -> true
    runs: 0, deaths: 0,
    active: null,              // the run in progress, or null
  };

  const unlocked = (level) => level >= UNLOCK_LEVEL;

  /** The deepest floor you are allowed to start on a difficulty. */
  function highestOpen(diffId) {
    return Math.min(MAX_FLOOR, (state.cleared[diffId] || 0) + 1);
  }

  /**
   * Harder difficulties are NOT gated behind clearing the easier one.
   *
   * Gating them would mean somebody who wants a real fight has to first play
   * thirty floors of one they find trivial, and the only thing that produces is
   * people bouncing off before they ever see the content. If you want to walk
   * into the Unlit at Lv20 and be destroyed, that is your business.
   */
  function canEnter(level, diffId, floor) {
    if (!unlocked(level)) return { ok: false, why: `The Hollow opens at level ${UNLOCK_LEVEL}.` };
    if (floor < 1 || floor > MAX_FLOOR) return { ok: false, why: 'No such floor.' };
    if (floor > highestOpen(diffId)) {
      return { ok: false, why: `Clear floor ${highestOpen(diffId)} first — the stair below it is sealed.` };
    }
    return { ok: true };
  }

  function begin(diffId, floor) {
    state.runs++;
    state.active = {
      difficulty: diffId,
      floor,
      startedFloor: floor,
      plan: planFloor(floor, diffId),
      cleared: false,
      killed: 0,
      startedAt: Date.now(),
      earned: [],              // everything the run has paid, for the summary
    };
    return state.active;
  }

  /** Move to the next floor down. Returns the new plan, or null at the bottom. */
  function descend() {
    const r = state.active;
    if (!r) return null;
    if (r.floor >= MAX_FLOOR) return null;
    r.floor++;
    r.plan = planFloor(r.floor, r.difficulty);
    r.cleared = false;
    r.killed = 0;
    return r.plan;
  }

  /** Record a cleared floor. Returns true if this was new progress. */
  function markCleared() {
    const r = state.active;
    if (!r || r.cleared) return false;
    r.cleared = true;
    const best = state.cleared[r.difficulty] || 0;
    if (r.floor > best) { state.cleared[r.difficulty] = r.floor; return true; }
    return false;
  }

  const bossKey = (diff, boss) => `${diff}:${boss}`;
  const bossBeaten = (diff, boss) => !!state.bossesBeaten[bossKey(diff, boss)];
  function markBossBeaten(diff, boss) { state.bossesBeaten[bossKey(diff, boss)] = true; }

  function leave(died = false) {
    if (died) state.deaths++;
    const r = state.active;
    state.active = null;
    return r;
  }

  /** Everything the gate panel needs to draw itself. */
  function overview(level) {
    return {
      unlocked: unlocked(level),
      unlockLevel: UNLOCK_LEVEL,
      maxFloor: MAX_FLOOR,
      difficulties: DIFF_ORDER.map((id) => ({
        ...DIFFICULTIES[id],
        cleared: state.cleared[id] || 0,
        open: highestOpen(id),
        done: (state.cleared[id] || 0) >= MAX_FLOOR,
      })),
      runs: state.runs, deaths: state.deaths,
    };
  }

  const serialize = () => ({
    cleared: state.cleared, bossesBeaten: state.bossesBeaten,
    runs: state.runs, deaths: state.deaths,
  });

  function load(d) {
    if (!d) return;
    // Validated rather than trusted: a save is a file on somebody's disk, and a
    // junk floor number here would put the world builder on a floor that has no
    // theme and no boss.
    for (const id of DIFF_ORDER) {
      const v = Number(d.cleared?.[id]);
      state.cleared[id] = Number.isFinite(v) ? Math.max(0, Math.min(MAX_FLOOR, Math.floor(v))) : 0;
    }
    state.bossesBeaten = (d.bossesBeaten && typeof d.bossesBeaten === 'object') ? { ...d.bossesBeaten } : {};
    state.runs = Number(d.runs) || 0;
    state.deaths = Number(d.deaths) || 0;
  }

  return {
    state, unlocked, canEnter, highestOpen, begin, descend, markCleared,
    bossBeaten, markBossBeaten, leave, overview, serialize, load,
    planFloor, floorReward, bossDrops, floorKind, floorTheme,
    THEMES, DIFFICULTIES, DIFF_ORDER, UNLOCK_LEVEL, MAX_FLOOR,
  };
}
