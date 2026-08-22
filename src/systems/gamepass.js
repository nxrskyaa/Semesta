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

/** How long one season runs. Deliberately a month rather than a quarter: a
 *  30-tier track has to be finishable by somebody who plays a few times a week. */
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

export const PASS_TIERS = 30;
export const XP_PER_TIER = 100;

export const PASS_PRICES = { basic: 1000, premium: 3000 };

/** The shop items that unlock each track. */
export const PASS_ITEMS = { basic: 'pass_seal', premium: 'pass_sigil' };
export const PASS_ITEM_NAMES = { basic: "Keeper's Seal", premium: "Keeper's Sigil" };

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
  // nothing, which is exactly the kind of thing that makes a pass feel arbitrary
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

/**
 * The reward track. `free` is always claimable; `basic` needs either pass;
 * `premium` needs the premium pass. Big beats land on the round tiers so the
 * ladder has a shape you can see.
 */
/**
 * THE REWARD TRACK, BUILT PER SEASON.
 *
 * The SHAPE is the tuned part and does not move: which tiers are milestones,
 * where the grand prizes land, how the coin curve climbs. What rotates is WHAT
 * lands on those beats, drawn from the pools below by the season index, so
 * every player sees the same season and next season is genuinely a different
 * track rather than a recoloured one.
 *
 * `free` is always claimable; `basic` needs either pass; `premium` needs the
 * premium pass.
 */
const POOLS = {
  freeBig: [
    { cosmetic: 'hat_straw', label: 'Straw Hat' },
    { cosmetic: 'hat_bandana', label: 'Bandana' },
    { cosmetic: 'back_sprout', label: 'Sprout Pack' },
    { cosmetic: 'hat_leaf', label: 'Leaf Cap' },
  ],
  freeTrail: [
    { cosmetic: 'trail_leaf', label: 'Leaf Trail' },
    { cosmetic: 'trail_bubble', label: 'Bubble Trail' },
    { cosmetic: 'trail_frost', label: 'Frost Trail' },
    { cosmetic: 'trail_petal', label: 'Petal Trail' },
  ],
  freePet: [
    { petCharm: 'charm_moku', label: 'Moku (pet)' },
    { petCharm: 'charm_hopps', label: 'Hopps (pet)' },
    { petCharm: 'charm_flap', label: 'Flap (pet)' },
    { petCharm: 'charm_koko', label: 'Koko (pet)' },
  ],
  basicCos: [
    { cosmetic: 'back_prism', label: 'Prism Wings' },
    { cosmetic: 'hat_wizard', label: 'Wizard Hat' },
    { cosmetic: 'back_butterfly', label: 'Butterfly Wings' },
    { cosmetic: 'hat_viking', label: 'Viking Helm' },
  ],
  basicCrown: [
    { cosmetic: 'hat_crown', label: 'Gilded Crown' },
    { cosmetic: 'hat_halo', label: 'Halo' },
    { cosmetic: 'hat_catears', label: 'Cat Ears' },
    { cosmetic: 'hat_chef', label: 'Chef Toque' },
  ],
  basicTrail: [
    { cosmetic: 'trail_star', label: 'Starfall Trail' },
    { cosmetic: 'trail_ember', label: 'Ember Trail' },
    { cosmetic: 'trail_ink', label: 'Ink Trail' },
    { cosmetic: 'trail_lantern', label: 'Lantern Trail' },
  ],
  basicPet: [
    { petCharm: 'charm_piko', label: 'Piko (pet)' },
    { petCharm: 'charm_bubbles', label: 'Bubbles (pet)' },
    { petCharm: 'charm_tuff', label: 'Tuff (pet)' },
    { petCharm: 'charm_wooly', label: 'Wooly (pet)' },
  ],
  premCos: [
    { cosmetic: 'hat_kitsune', label: 'Kitsune Mask' },
    { cosmetic: 'hat_pumpkin', label: 'Pumpkin Head' },
    { cosmetic: 'hat_moon', label: 'Moonwreath' },
    { cosmetic: 'hat_antlers', label: 'Spirit Antlers' },
  ],
  premBack: [
    { cosmetic: 'back_koi', label: 'Koi Kite' },
    { cosmetic: 'back_phoenix', label: 'Phoenix Wings' },
    { cosmetic: 'back_lanterns', label: 'Hanging Lanterns' },
    { cosmetic: 'back_shell', label: 'Turtle Shell' },
  ],
  premPet: [
    { petCharm: 'charm_seraphi', label: 'Seraphi (mythic pet)' },
    { petCharm: 'charm_nox', label: 'Nox (legendary pet)' },
    { petCharm: 'charm_glimmer', label: 'Glimmer (legendary pet)' },
    { petCharm: 'charm_zephyr', label: 'Zephyr (mythic pet)' },
  ],
  premMount: [
    { mount: 'mount_aurora', label: 'AURORA MOUNT' },
    { mount: 'mount_blossom', label: 'BLOSSOM MOUNT' },
  ],
};

/** Same season, same track, on every machine. */
const pick = (pool, seasonIndex, offset = 0) => pool[(seasonIndex + offset) % pool.length];

/**
 * THE LADDER MUST NEVER LIE ABOUT WHAT A REWARD IS CALLED.
 *
 * The panel shows the reward NAME beside every icon now, and a hand-written
 * label drifts the moment somebody renames an item — a sweep against ITEMS
 * found five already wrong ("Halo" for Radiant Halo, "Gilded Crown" for Royal
 * Crown). Anything with an id takes its name from ITEMS; the hand-written label
 * only survives where there is nothing to look up (coins, a weapon TIER that
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
    // FREE ROW. Every third tier hands over something that is not money: a row
    // of nothing but coins is a row nobody looks at, and the free track is the
    // one most players will actually live on.
    const free = i === 30 ? { ...pick(POOLS.freeBig, S), big: true }
      : i === 20 ? { ...pick(POOLS.freePet, S), big: true }
        : i === 10 ? { ...pick(POOLS.freeTrail, S), big: true }
          : i % 5 === 0 ? { item: 'forge_stone', n: 4, label: 'Forge Stone x4' }
            : i % 3 === 0 ? { item: 'tonic', n: 3, label: 'Tonic x3' }
              : { coins: 60 + i * 8, label: (60 + i * 8) + ' coins' };

    // BASIC ROW. Cosmetics, real consumable stacks and a gacha-exclusive weapon
    // at the top: the point of a pass is that it hands you things the shop
    // cannot, so a row of coins at 3x the free rate was never worth buying.
    let basic;
    if (i === 30) basic = { weaponTier: 'epic', label: 'STARFORGED WEAPON', grand: true };
    else if (i === 26) basic = { ...pick(POOLS.basicCos, S), big: true };
    else if (i === 22) basic = { item: 'potion_luck', n: 4, label: 'Lucky Charm x4' };
    else if (i === 18) basic = { ...pick(POOLS.basicCrown, S), big: true };
    else if (i === 14) basic = { item: 'potion_xp', n: 4, label: 'Scholar Brew x4' };
    else if (i === 10) basic = { ...pick(POOLS.basicTrail, S), big: true };
    else if (i === 6) basic = { ...pick(POOLS.basicPet, S), big: true };
    else if (i === 3) basic = { item: 'forge_stone', n: 8, label: 'Forge Stone x8' };
    else if (i % 2 === 0) basic = { coins: 160 + i * 14, label: (160 + i * 14) + ' coins' };
    else basic = { item: i % 4 === 1 ? 'potion_xp' : 'potion_luck', n: 2, label: i % 4 === 1 ? 'Scholar Brew x2' : 'Lucky Charm x2' };

    // PREMIUM ROW. Mounts, pets, cosmetics and a MYTHIC weapon at the end, so
    // the last tier is a trophy rather than a bigger pile of coins. Nothing
    // here is purchasable with gold anywhere else.
    let premium;
    if (i === 30) premium = { weaponTier: 'mythic', label: 'CELESTIUM MYTHIC WEAPON', grand: true };
    else if (i === 28) premium = { ...pick(POOLS.premMount, S), grand: true };
    else if (i === 25) premium = { ...pick(POOLS.premPet, S), big: true };
    else if (i === 21) premium = { weaponTier: 'legendary', label: 'DRAGONFANG WEAPON', big: true };
    else if (i === 19) premium = { ...pick(POOLS.premCos, S), big: true };
    else if (i === 16) premium = { ...pick(POOLS.premPet, S, 1), big: true };
    else if (i === 13) premium = { ...pick(POOLS.premBack, S), big: true };
    else if (i === 11) premium = { ...pick(POOLS.premPet, S, 2), big: true };
    else if (i === 8) premium = { ...pick(POOLS.premMount, S, 1), big: true };
    else if (i === 5) premium = { ...pick(POOLS.premCos, S, 1), big: true };
    else if (i % 3 === 0) premium = { item: 'potion_luck', n: 3, label: 'Lucky Charm x3' };
    else premium = { coins: 320 + i * 26, label: (320 + i * 26) + ' coins' };

    t.push({ tier: i, free: name(free), basic: name(basic), premium: name(premium) });
  }
  return t;
}

// NOTE there is deliberately NO module-level PASS_TRACK constant any more. One
// built at import time would be frozen at whatever season the tab was opened in
// and would not follow a rollover, which is a second source of truth for the one
// thing the season is supposed to own. Ask the instance: `gamepass.track()`.

export function createGamePass({ grant, onToast, onBanner }) {
  const state = {
    owned: 'none',        // 'none' | 'basic' | 'premium'
    xp: 0,                // total pass XP earned this season
    claimed: { free: [], basic: [], premium: [] },
    season: seasonNow().index,
  };
  // the track belongs to the season, not to the module
  let track = buildTrack(state.season);

  const tierOf = () => Math.min(PASS_TIERS, Math.floor(state.xp / XP_PER_TIER) + 1);
  const progressInTier = () => (state.xp % XP_PER_TIER) / XP_PER_TIER;

  function load(data) {
    if (!data) return;
    state.owned = data.owned || 'none';
    state.xp = data.xp || 0;
    state.claimed = {
      free: data.claimed?.free || [],
      basic: data.claimed?.basic || [],
      premium: data.claimed?.premium || [],
    };
    state.season = data.season ?? seasonNow().index;
    rollSeason(true);
  }
  function serialize() {
    return { owned: state.owned, xp: state.xp, claimed: state.claimed, season: state.season };
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
    state.xp = Math.min(PASS_TIERS * XP_PER_TIER, state.xp + gain);
    const after = tierOf();
    if (after > before) {
      onBanner?.(`GAMEPASS TIER ${after}`);
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

  /** Claim everything currently available in one go — the button people want. */
  function claimAll() {
    let n = 0;
    for (const row of ['free', 'basic', 'premium']) {
      for (let t = 1; t <= tierOf(); t++) if (canClaim(row, t)) { claim(row, t); n++; }
    }
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

  /** Anything waiting to be claimed — drives the "!" badge. */
  function pending() {
    let n = 0;
    for (const row of ['free', 'basic', 'premium']) {
      for (let t = 1; t <= tierOf(); t++) if (canClaim(row, t)) n++;
    }
    return n;
  }

  const perks = () => PASS_PERKS[state.owned];

  return {
    state, load, serialize, event, claim, claimAll, canClaim, activate, pending,
    tierOf, progressInTier, perks, rollSeason,
    season: () => seasonNow(),
    track: () => track,
    totalXp: () => PASS_TIERS * XP_PER_TIER,
    PASS_TIERS, PASS_PRICES, XP_PER_TIER, PASS_XP, PASS_XP_LABEL, PASS_PERKS, SEASON_DAYS,
    PASS_ITEMS, PASS_ITEM_NAMES,
  };
}
