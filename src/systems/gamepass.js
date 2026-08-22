import { ITEMS } from './items.js';

// GAMEPASS — a season pass you buy with gold you earned, not money.
//
// The shape is the one modern battle passes settled on, because it works: a
// single track of numbered tiers, every tier has a FREE reward so nobody feels
// locked out, and buying a pass unlocks a parallel row of better rewards you can
// claim retroactively for every tier you already reached.
//
// Two tiers of pass:
//   BASIC   1,000 gold — unlocks the basic reward row + a permanent +10% XP
//   PREMIUM 3,000 gold — unlocks BOTH rows + +25% XP, +15% luck, +10% coins
//
// Progress is earned as PASS XP from the things you already do (killing, fishing,
// gathering, cooking, questing), so the pass rewards playing rather than grinding
// one specific loop.
//
// Like dailies.js, rewards are described here as data and granted by a single
// caller-supplied `grant()` — this module never touches the inventory.

// ---------------------------------------------------------------------------
// SEASONS
//
// A pass that never ends is not a pass, it is a very long quest — and it is the
// reason nobody feels any urgency about buying one. A season gives the track a
// beginning, an end you can see coming, and a reason for the rewards to be
// different next time.
//
// The clock is REAL time and the boundary is derived from a fixed epoch rather
// than stored, so every player is on the same season without a server telling
// them so, and a save that has been sitting closed for two months lands on the
// correct season the moment it loads.
// ---------------------------------------------------------------------------

/** How long one season runs. Deliberately a month rather than a quarter: the
 *  track has to be finishable by somebody who plays a few times a week. */
export const SEASON_DAYS = 30;
/** Season 1 begins here. Never change this — it would reshuffle history. */
const SEASON_EPOCH = Date.UTC(2026, 7, 1);      // 1 Aug 2026, UTC

/**
 * The seasons cycle through these. Each one renames the pass and re-tints it,
 * and — through `buildTrack` below — genuinely rotates what the track pays out.
 */
export const SEASONS = [
  { name: 'THE LANTERN ROAD', blurb: 'The first lights go back up along the northern road.', accent: '#ffd23e' },
  { name: 'TIDE AND EMBER', blurb: 'Salt on the wind, and something burning under the sea floor.', accent: '#5fd8e8' },
  { name: 'THE LONG FROST', blurb: 'The winter treeline creeps south. The lamps burn longer.', accent: '#a8d8ff' },
  { name: 'HOLLOWTIDE', blurb: 'Whatever the Hollow is, it is closer to the surface this month.', accent: '#c08aff' },
];

/** Which season we are in, and how long is left of it. */
export function seasonNow(at = Date.now()) {
  const span = SEASON_DAYS * 86400000;
  const elapsed = Math.max(0, at - SEASON_EPOCH);
  const index = Math.floor(elapsed / span);
  const startedAt = SEASON_EPOCH + index * span;
  const endsAt = startedAt + span;
  const def = SEASONS[index % SEASONS.length];
  return {
    index,                                   // 0-based, and the shuffle seed
    number: index + 1,                       // what the player is shown
    ...def,
    startedAt, endsAt,
    msLeft: Math.max(0, endsAt - at),
    daysLeft: Math.max(0, Math.ceil((endsAt - at) / 86400000)),
  };
}

// ---------------------------------------------------------------------------
// PACING — and the measurement that forced it
//
// The first version was 30 tiers at a FLAT 100 XP each: 3,000 XP for the whole
// season. Measured against the real XP table at plausible rates, that is
//
//     50 minutes of auto-battle          (15 kills/min x 4 XP = 60 XP/min)
//     55 minutes of ordinary mixed play
//     75 minutes of world bosses
//
// — so the entire thirty-day season was over in under an hour, and then there
// was nothing. That is the whole "naik levelnya cepet banget" complaint, and it
// has two causes, both fixed here.
//
// 1. A FLAT COST MEANS TIER 50 IS AS CHEAP AS TIER 1. Every pass that paces
//    itself ramps. `xpForTier` climbs from 120 to 1,198, which puts the full
//    50-tier track at ~33,000 XP — about nine hours of dedicated grinding
//    spread over thirty days, or roughly twenty minutes a day. Fast for someone
//    farming, reachable for someone who plays a few evenings a week.
//
// 2. A TRACK THAT ENDS IS A TREADMILL THAT STOPS. Past the last tier the pass
//    keeps going forever in PRESTIGE CACHES — a fixed lump of XP each, paying a
//    Keeper's Token and gold. It is deliberately not more cosmetics: the set is
//    finite and completing it should mean something. What it gives is a reason
//    for the last week of a season to still be worth playing.
// ---------------------------------------------------------------------------

export const PASS_TIERS = 50;
/** XP for tier n on its own. Climbs, so the back half is the achievement. */
export function xpForTier(n) { return 120 + (n - 1) * 22; }

/** Cumulative XP to have REACHED tier n+1. CUM[0] = 0, so tier 1 is free. */
const CUM = (() => {
  const c = [0];
  for (let n = 1; n <= PASS_TIERS; n++) c[n] = c[n - 1] + xpForTier(n);
  return c;
})();
/** XP that completes the whole curated track. */
export const TOTAL_XP = CUM[PASS_TIERS];
/** XP per endless cache once the track is done. */
export const PRESTIGE_XP = 1500;

/** Cumulative XP the ladder prints beside each tier. */
export function xpAt(tier) { return CUM[Math.max(0, Math.min(PASS_TIERS, tier))]; }

export const PASS_PRICES = { basic: 1000, premium: 3000 };

/** The shop items that unlock each track. */
export const PASS_ITEMS = { basic: 'pass_seal', premium: 'pass_sigil' };
export const PASS_ITEM_NAMES = { basic: "Keeper's Seal", premium: "Keeper's Sigil" };

/** The pass's own currency. Earned here, spent only in the Vault. */
export const PASS_TOKEN = 'pass_token';

/** Permanent boosts each pass carries while it is owned. */
export const PASS_PERKS = {
  none: { xp: 0, luck: 0, coin: 0, label: 'No pass' },
  basic: { xp: 0.10, luck: 0, coin: 0, label: '+10% XP' },
  premium: { xp: 0.25, luck: 0.15, coin: 0.10, label: '+25% XP · +15% luck · +10% coins' },
};

// How much pass XP each action is worth. Deliberately broad: the pass should
// move whatever you enjoy doing.
export const PASS_XP = {
  kill: 4, boss: 120, fish: 10, chest: 25, gather: 6,
  plant: 5, harvest: 8, cook: 12, forge: 20, skill: 1, gacha: 15, quest: 60,
  // main.js fires these two as well; without a weight they were silently worth
  // nothing, which is exactly the kind of thing that makes an XP system feel
  // arbitrary
  sail: 8, island: 40,
};

/** Plain-English names for the table in the pass panel. */
export const PASS_XP_LABEL = {
  kill: 'Defeat a monster', boss: 'Defeat a world boss', fish: 'Catch a fish',
  chest: 'Open a treasure chest', gather: 'Chop or mine a node', plant: 'Plant a crop',
  harvest: 'Harvest a crop', cook: 'Cook a dish', forge: 'Forge a weapon',
  skill: 'Cast a skill', gacha: 'Spin the gacha', quest: 'Complete a quest',
  sail: 'Sail somewhere new', island: 'Set foot on a new island',
};

// ---------------------------------------------------------------------------
// THE KEEPER'S VAULT — the pass's own spin, and the reason to want tokens
//
// The gacha is the random one. The Vault is deliberately the OPPOSITE, because
// two identical slot machines is one slot machine: **it never hands you a piece
// you already own**, so six tokens is the whole set, every single time. It
// still reveals like a spin — that is the part that is fun — but it cannot
// waste your token, which is what makes it read as a reward rather than a bet.
//
// Every piece here exists NOWHERE else in the game: not the shop, not the
// gacha, not the Hollow. That is what a premium track has to be for.
// ---------------------------------------------------------------------------

export const VAULT_SET = [
  { cosmetic: 'hat_lumen' },
  { cosmetic: 'back_keepercloak' },
  { cosmetic: 'trail_gilded' },
  { cosmetic: 'hat_regalia' },
  { cosmetic: 'back_constel' },
  { cosmetic: 'trail_lumen' },
];

/** Once the set is complete a token still has to be worth spending. */
const VAULT_BONUS = [
  { w: 45, make: () => ({ weaponTier: 'mythic', label: 'CELESTIUM MYTHIC WEAPON', grand: true }) },
  { w: 35, make: () => ({ coins: 1200, label: '1,200 coins', big: true }) },
  { w: 20, make: () => ({ item: 'forge_stone', n: 10, label: 'Forge Stone x10', big: true }) },
];

// ---------------------------------------------------------------------------
// THE REWARD TRACK, BUILT PER SEASON
//
// The SHAPE is the tuned part and does not move: which tiers are milestones,
// where the grand prizes land, how the coin curve climbs. What rotates is WHAT
// lands on those beats, drawn from the pools below by the season index, so
// every player sees the same season and next season is genuinely a different
// track rather than a recoloured one.
//
// `free` is always claimable; `basic` needs either pass; `premium` needs the
// premium pass.
// ---------------------------------------------------------------------------

const POOLS = {
  freeBig: [
    { cosmetic: 'hat_straw' }, { cosmetic: 'hat_bandana' },
    { cosmetic: 'hat_flower' }, { cosmetic: 'hat_leaf' },
  ],
  freeBack: [
    { cosmetic: 'back_sprout' }, { cosmetic: 'back_shell' },
    { cosmetic: 'back_reef' }, { cosmetic: 'back_scroll' },
  ],
  freeTrail: [
    { cosmetic: 'trail_leaf' }, { cosmetic: 'trail_bubble' },
    { cosmetic: 'trail_frost' }, { cosmetic: 'trail_petal' },
  ],
  freeGrand: [
    { cosmetic: 'hat_starcap' }, { cosmetic: 'hat_pirate' },
    { cosmetic: 'back_balloon' }, { cosmetic: 'hat_miner' },
  ],
  freePet: [
    { petCharm: 'charm_moku' }, { petCharm: 'charm_hopps' },
    { petCharm: 'charm_flap' }, { petCharm: 'charm_koko' },
  ],
  basicCos: [
    { cosmetic: 'back_butterfly' }, { cosmetic: 'hat_wizard' },
    { cosmetic: 'back_bubble' }, { cosmetic: 'hat_viking' },
  ],
  basicCrown: [
    { cosmetic: 'hat_crown' }, { cosmetic: 'hat_halo' },
    { cosmetic: 'hat_catears' }, { cosmetic: 'hat_chef' },
  ],
  basicTrail: [
    { cosmetic: 'trail_star' }, { cosmetic: 'trail_ember' },
    { cosmetic: 'trail_ink' }, { cosmetic: 'trail_lantern' },
  ],
  basicBack: [
    { cosmetic: 'back_cloakfeather' }, { cosmetic: 'back_koi' },
    { cosmetic: 'back_pack' }, { cosmetic: 'back_reef' },
  ],
  basicPet: [
    { petCharm: 'charm_piko' }, { petCharm: 'charm_bubbles' },
    { petCharm: 'charm_tuff' }, { petCharm: 'charm_wooly' },
  ],
  premCos: [
    { cosmetic: 'hat_kitsune' }, { cosmetic: 'hat_pumpkin' },
    { cosmetic: 'hat_moon' }, { cosmetic: 'hat_antlers' },
  ],
  premBack: [
    { cosmetic: 'back_phoenix' }, { cosmetic: 'back_prism' },
    { cosmetic: 'back_lanterns' }, { cosmetic: 'back_frost' },
  ],
  premTrail: [
    { cosmetic: 'trail_rainbow' }, { cosmetic: 'trail_aurora' },
    { cosmetic: 'trail_star' }, { cosmetic: 'trail_ember' },
  ],
  premPet: [
    { petCharm: 'charm_seraphi' }, { petCharm: 'charm_nox' },
    { petCharm: 'charm_glimmer' }, { petCharm: 'charm_zephyr' },
  ],
  premPet2: [
    { petCharm: 'charm_emberling' }, { petCharm: 'charm_tideling' },
    { petCharm: 'charm_verdant' }, { petCharm: 'charm_luma' },
  ],
  premMount: [
    { mount: 'mount_aurora' }, { mount: 'mount_blossom' },
  ],
  premMount2: [
    { mount: 'mount_pebble' }, { mount: 'mount_nimbus' },
  ],
};

/** Same season, same track, on every machine. */
const pick = (pool, seasonIndex, offset = 0) => pool[(seasonIndex + offset) % pool.length];

const tok = (n) => ({ item: PASS_TOKEN, n, label: `Keeper's Token x${n}`, big: true, token: true });

/**
 * THE MILESTONES, AS DATA.
 *
 * Fifty tiers written as a chain of `else if` is unreadable and impossible to
 * audit — you cannot see at a glance whether a row has a gap in it. As a table
 * keyed by tier you can, and the sweep in the test can check every slot.
 */
const SHAPE = {
  free: {
    5: (S) => ({ ...pick(POOLS.freeTrail, S), big: true }),
    10: (S) => ({ ...pick(POOLS.freeBig, S), big: true }),
    15: () => tok(1),
    20: (S) => ({ ...pick(POOLS.freePet, S), big: true }),
    25: (S) => ({ ...pick(POOLS.freeBack, S), big: true }),
    30: () => ({ item: 'potion_xp', n: 3, label: 'Scholar Brew x3', big: true }),
    35: () => tok(1),
    40: (S) => ({ ...pick(POOLS.freeTrail, S, 1), big: true }),
    45: () => ({ item: 'potion_luck', n: 3, label: 'Lucky Charm x3', big: true }),
    50: (S) => ({ ...pick(POOLS.freeGrand, S), grand: true }),
  },
  basic: {
    3: () => ({ item: 'forge_stone', n: 8, label: 'Forge Stone x8' }),
    6: (S) => ({ ...pick(POOLS.basicPet, S), big: true }),
    10: (S) => ({ ...pick(POOLS.basicTrail, S), big: true }),
    13: () => tok(1),
    16: (S) => ({ ...pick(POOLS.basicBack, S), big: true }),
    20: () => ({ item: 'potion_xp', n: 4, label: 'Scholar Brew x4', big: true }),
    24: (S) => ({ ...pick(POOLS.basicCos, S), big: true }),
    28: () => tok(1),
    32: (S) => ({ ...pick(POOLS.basicPet, S, 1), big: true }),
    36: () => ({ item: 'potion_luck', n: 4, label: 'Lucky Charm x4', big: true }),
    40: (S) => ({ ...pick(POOLS.basicCrown, S), big: true }),
    44: () => tok(1),
    47: (S) => ({ ...pick(POOLS.basicTrail, S, 1), big: true }),
    50: () => ({ weaponTier: 'epic', label: 'STARFORGED WEAPON', grand: true }),
  },
  premium: {
    4: (S) => ({ ...pick(POOLS.premCos, S, 1), big: true }),
    7: () => tok(1),
    9: (S) => ({ ...pick(POOLS.premMount2, S), big: true }),
    12: (S) => ({ ...pick(POOLS.premPet, S, 2), big: true }),
    15: (S) => ({ ...pick(POOLS.premBack, S), big: true }),
    18: () => tok(1),
    21: () => ({ weaponTier: 'legendary', label: 'DRAGONFANG WEAPON', big: true }),
    24: (S) => ({ ...pick(POOLS.premPet2, S), big: true }),
    27: (S) => ({ ...pick(POOLS.premTrail, S), big: true }),
    30: () => tok(1),
    33: (S) => ({ ...pick(POOLS.premCos, S), big: true }),
    36: (S) => ({ ...pick(POOLS.premPet, S), big: true }),
    39: (S) => ({ ...pick(POOLS.premBack, S, 1), big: true }),
    42: () => tok(1),
    45: (S) => ({ ...pick(POOLS.premMount, S), grand: true }),
    48: () => tok(1),
    50: () => ({ weaponTier: 'mythic', label: 'CELESTIUM MYTHIC WEAPON', grand: true }),
  },
};

/**
 * What lands on a tier with no milestone on it. Never nothing.
 *
 * NOTE THE SIGNATURE: every factory here takes , the SAME
 * shape as a milestone, because  calls whichever it finds with the
 * same two arguments. The first version took  alone, so the filler was
 * handed the SEASON INDEX — which is 0 — and  made every single
 * free filler a Forge Stone x4, every basic filler 180 coins and every premium
 * filler a Lucky Charm x3. The track validated (the ids were all real) and
 * looked, correctly, like the most boring ladder ever built.
 */
const FILLER = {
  // The free row is the one most players actually live on, so every third tier
  // hands over something that is not money: a row of pure coins is a row nobody
  // looks at.
  free: (S, i) => (i % 5 === 0 ? { item: 'forge_stone', n: 4, label: 'Forge Stone x4' }
    : i % 3 === 0 ? { item: 'tonic', n: 3, label: 'Tonic x3' }
      : { coins: 70 + i * 9, label: (70 + i * 9) + ' coins' }),
  // Consumables you would otherwise buy, at a rate the shop cannot match.
  basic: (S, i) => (i % 4 === 1 ? { item: 'potion_xp', n: 2, label: 'Scholar Brew x2' }
    : i % 4 === 3 ? { item: 'potion_luck', n: 2, label: 'Lucky Charm x2' }
      : { coins: 180 + i * 15, label: (180 + i * 15) + ' coins' }),
  premium: (S, i) => (i % 3 === 0 ? { item: 'potion_luck', n: 3, label: 'Lucky Charm x3' }
    : i % 3 === 1 ? { item: 'forge_stone', n: 6, label: 'Forge Stone x6' }
      : { coins: 340 + i * 28, label: (340 + i * 28) + ' coins' }),
};

/**
 * THE LADDER MUST NEVER LIE ABOUT WHAT A REWARD IS CALLED.
 *
 * The panel shows the reward NAME beside every icon, and a hand-written label
 * drifts the moment somebody renames an item — a sweep against ITEMS found five
 * already wrong ("Halo" for Radiant Halo, "Gilded Crown" for Royal Crown).
 * Anything with an id takes its name from ITEMS; the written label only
 * survives where there is nothing to look up (coins, a weapon TIER that
 * resolves to your class at claim time).
 */
function name(e) {
  const id = e.cosmetic || e.mount || e.petCharm;
  if (!id) return e;
  const real = ITEMS[id]?.name;
  return real ? { ...e, label: real } : e;
}

export function buildTrack(seasonIndex = 0) {
  const S = seasonIndex;
  const t = [];
  for (let i = 1; i <= PASS_TIERS; i++) {
    const row = (k) => name((SHAPE[k][i] || FILLER[k])(S, i));
    t.push({ tier: i, free: row('free'), basic: row('basic'), premium: row('premium') });
  }
  return t;
}

// NOTE there is deliberately NO module-level PASS_TRACK constant. One built at
// import time would be frozen at whatever season the tab was opened in and
// would not follow a rollover, which is a second source of truth for the one
// thing the season is supposed to own. Ask the instance: `gamepass.track()`.

export function createGamePass({ grant, onToast, onBanner }) {
  const state = {
    owned: 'none',        // 'none' | 'basic' | 'premium'
    xp: 0,                // total pass XP earned this season
    claimed: { free: [], basic: [], premium: [] },
    caches: 0,            // prestige caches already claimed this season
    season: seasonNow().index,
  };
  // the track belongs to the season, not to the module
  let track = buildTrack(state.season);

  /** Which tier the XP puts you on. Capped — past it you are in prestige. */
  function tierOf() {
    if (state.xp >= TOTAL_XP) return PASS_TIERS;
    let n = 1;
    while (n < PASS_TIERS && state.xp >= CUM[n]) n++;
    return n;
  }
  /** 0..1 through the CURRENT tier, or through the current cache past the end. */
  function progressInTier() {
    if (state.xp >= TOTAL_XP) return ((state.xp - TOTAL_XP) % PRESTIGE_XP) / PRESTIGE_XP;
    const t = tierOf();
    return (state.xp - CUM[t - 1]) / xpForTier(t);
  }
  /** XP still needed for the next tier — or the next cache once past the end. */
  function toNext() {
    if (state.xp >= TOTAL_XP) return PRESTIGE_XP - ((state.xp - TOTAL_XP) % PRESTIGE_XP);
    return CUM[tierOf()] - state.xp;
  }
  /** How many prestige caches the XP has earned in total. */
  const cachesEarned = () => (state.xp <= TOTAL_XP ? 0 : Math.floor((state.xp - TOTAL_XP) / PRESTIGE_XP));
  /** How many are sitting unclaimed. */
  const cachesReady = () => Math.max(0, cachesEarned() - state.caches);
  /** True once the curated track is finished and the endless half has begun. */
  const inPrestige = () => state.xp >= TOTAL_XP;

  function load(data) {
    if (!data) return;
    state.owned = data.owned || 'none';
    state.xp = data.xp || 0;
    state.claimed = {
      free: data.claimed?.free || [],
      basic: data.claimed?.basic || [],
      premium: data.claimed?.premium || [],
    };
    state.caches = data.caches || 0;
    state.season = data.season ?? seasonNow().index;
    rollSeason(true);
  }
  function serialize() {
    return {
      owned: state.owned, xp: state.xp, claimed: state.claimed,
      caches: state.caches, season: state.season,
    };
  }

  /**
   * THE SEASON ENDS, AND THAT IS THE POINT OF IT.
   *
   * A pass that never resets is a very long quest, and it is why nobody feels
   * any reason to buy one. When the calendar rolls over the track is rebuilt
   * with that season's rewards, progress goes back to zero, and the pass has to
   * be bought again — which is the deal every battlepass makes and the reason
   * unclaimed rewards are worth claiming before the clock runs out.
   *
   * Checked on load and once a second while playing, so a save that has been
   * closed for two months lands on the correct season the moment it opens.
   */
  function rollSeason(quiet = false) {
    const now = seasonNow();
    if (now.index === state.season) return false;
    state.season = now.index;
    state.xp = 0;
    state.owned = 'none';
    state.caches = 0;
    state.claimed = { free: [], basic: [], premium: [] };
    track = buildTrack(now.index);
    if (!quiet) {
      onBanner?.(`SEASON ${now.number} — ${now.name}`);
      onToast?.('A new gamepass season has begun. The track has been reset and the rewards are new.');
    }
    return true;
  }

  /** Feed the same gameplay events the dailies get. */
  function event(ev, amount = 1) {
    const gain = (PASS_XP[ev] || 0) * amount;
    if (!gain) return false;
    const before = tierOf();
    const cachesBefore = cachesEarned();
    state.xp += gain;                    // deliberately uncapped: prestige is endless
    const after = tierOf();
    if (after > before) {
      onBanner?.(after >= PASS_TIERS ? 'GAMEPASS TRACK COMPLETE' : `GAMEPASS TIER ${after}`);
      return true;
    }
    if (cachesEarned() > cachesBefore) {
      onBanner?.("KEEPER'S CACHE READY");
      return true;
    }
    return false;
  }

  /** Can this row be claimed at this tier? */
  function canClaim(row, tier) {
    if (tier > tierOf()) return false;
    if (state.claimed[row].includes(tier)) return false;
    if (row === 'basic' && state.owned === 'none') return false;
    if (row === 'premium' && state.owned !== 'premium') return false;
    return true;
  }

  function claim(row, tier) {
    if (!canClaim(row, tier)) return null;
    const entry = track[tier - 1]?.[row];
    if (!entry) return null;
    state.claimed[row].push(tier);
    grant(entry);
    return entry;
  }

  /**
   * A PRESTIGE CACHE. Endless, and the same every time on purpose — this is the
   * part of the pass that is a steady wage rather than a surprise, so the
   * surprise stays in the Vault where it belongs.
   */
  function claimCache() {
    if (cachesReady() <= 0) return null;
    state.caches++;
    const n = state.caches;
    const payout = [
      { item: PASS_TOKEN, n: 1, label: "Keeper's Token", token: true, big: true },
      { coins: 600 + n * 40, label: (600 + n * 40) + ' coins' },
      { item: 'forge_stone', n: 5, label: 'Forge Stone x5' },
    ];
    for (const p of payout) grant(p);
    onBanner?.(`KEEPER'S CACHE ${n}`);
    return payout;
  }

  /** Claim everything currently available in one go — the button people want. */
  function claimAll() {
    let n = 0;
    for (const row of ['free', 'basic', 'premium']) {
      for (let t = 1; t <= tierOf(); t++) if (canClaim(row, t)) { claim(row, t); n++; }
    }
    while (cachesReady() > 0) { claimCache(); n++; }
    if (n) onBanner?.(`${n} GAMEPASS REWARD${n > 1 ? 'S' : ''} CLAIMED`);
    return n;
  }

  /**
   * A PASS IS ACTIVATED FROM AN ITEM YOU BOUGHT, not from a button that eats
   * gold. Pip sells the Keeper's Seal and the Keeper's Sigil; this consumes one.
   *
   * The indirection is worth it for two reasons. It gives the shop something to
   * be for, and it turns unlocking a pass into a thing you went and got rather
   * than a menu transaction. It is also the shape a token purchase would take
   * later: a deterministic item, not a random roll.
   *
   * @param consume  (itemId) => boolean, true if the item was taken from the bag
   */
  function activate(kind, consume) {
    if (kind !== 'basic' && kind !== 'premium') return false;
    if (state.owned === kind) return false;
    if (state.owned === 'premium') return false;          // already the best
    const id = PASS_ITEMS[kind];
    if (!consume(id)) { onToast?.(`You need a ${PASS_ITEM_NAMES[kind]} — Pip sells one.`); return false; }
    state.owned = kind;
    onBanner?.(`${kind.toUpperCase()} GAMEPASS UNLOCKED!`);
    return true;
  }

  /**
   * THE VAULT. One token, one piece of the set you do not already have.
   *
   * `owns` is supplied by the caller for the same reason `grant` is: this
   * module does not get to know what an inventory is.
   *
   * @param consume (itemId) => boolean   takes the token
   * @param owns    (itemId) => boolean   do we already have this piece?
   */
  function vaultStatus(owns) {
    const missing = VAULT_SET.filter((p) => !owns(p.cosmetic));
    return { total: VAULT_SET.length, have: VAULT_SET.length - missing.length, missing, complete: missing.length === 0 };
  }

  function spinVault(consume, owns) {
    const st = vaultStatus(owns);
    if (!consume(PASS_TOKEN)) { onToast?.("You need a Keeper's Token — earn them on the pass track."); return null; }
    let prize;
    if (!st.complete) {
      const p = st.missing[Math.floor(Math.random() * st.missing.length)];
      prize = name({ ...p, grand: true, vault: true });
    } else {
      let r = Math.random() * VAULT_BONUS.reduce((a, b) => a + b.w, 0);
      const hit = VAULT_BONUS.find((b) => (r -= b.w) < 0) || VAULT_BONUS[0];
      prize = { ...hit.make(), vault: true };
    }
    grant(prize);
    return prize;
  }

  /** Anything waiting to be claimed — drives the "!" badge. */
  function pending() {
    let n = 0;
    for (const row of ['free', 'basic', 'premium']) {
      for (let t = 1; t <= tierOf(); t++) if (canClaim(row, t)) n++;
    }
    return n + cachesReady();
  }

  const perks = () => PASS_PERKS[state.owned];

  return {
    state, load, serialize, event, claim, claimAll, canClaim, activate, pending,
    tierOf, progressInTier, toNext, perks, rollSeason,
    claimCache, cachesReady, cachesEarned, inPrestige,
    vaultStatus, spinVault,
    season: () => seasonNow(),
    track: () => track,
    totalXp: () => TOTAL_XP,
    xpAt, xpForTier,
    PASS_TIERS, PASS_PRICES, PASS_XP, PASS_XP_LABEL, PASS_PERKS, SEASON_DAYS,
    PASS_ITEMS, PASS_ITEM_NAMES, PASS_TOKEN, PRESTIGE_XP, VAULT_SET,
  };
}
