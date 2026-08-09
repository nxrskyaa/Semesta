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

export const PASS_TIERS = 30;
export const XP_PER_TIER = 100;

export const PASS_PRICES = { basic: 1000, premium: 3000 };

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
};

/**
 * The reward track. `free` is always claimable; `basic` needs either pass;
 * `premium` needs the premium pass. Big beats land on the round tiers so the
 * ladder has a shape you can see.
 */
export const PASS_TRACK = (() => {
  const t = [];
  for (let i = 1; i <= PASS_TIERS; i++) {
    // FREE ROW. Every third tier now hands over something that is not money —
    // a row of nothing but coins is a row nobody looks at, and the free track
    // is the one most players will actually live on.
    const free = i === 30 ? { cosmetic: 'hat_straw', label: 'Straw Hat', big: true }
      : i === 20 ? { petCharm: 'charm_moku', label: 'Moku the Sprout', big: true }
        : i === 10 ? { cosmetic: 'trail_leaf', label: 'Leaf Trail', big: true }
          : i % 5 === 0 ? { item: 'forge_stone', n: 4, label: 'Forge Stone x4' }
            : i % 3 === 0 ? { item: 'tonic', n: 3, label: 'Tonic x3' }
              : { coins: 60 + i * 8, label: `${60 + i * 8} coins` };

    // BASIC ROW. Three cosmetics, real consumable stacks, and a gacha-exclusive
    // weapon at the top — the point of a pass is that it hands you things the
    // shop cannot, so a row of coins at 3x the free rate was never worth 1,000.
    let basic;
    if (i === 30) basic = { weaponTier: 'epic', label: 'STARFORGED WEAPON', grand: true };
    else if (i === 26) basic = { cosmetic: 'back_prism', label: 'Prism Wings', big: true };
    else if (i === 22) basic = { item: 'potion_luck', n: 4, label: 'Lucky Charm x4' };
    else if (i === 18) basic = { cosmetic: 'hat_crown', label: 'Gilded Crown', big: true };
    else if (i === 14) basic = { item: 'potion_xp', n: 4, label: 'Scholar Brew x4' };
    else if (i === 10) basic = { cosmetic: 'trail_star', label: 'Starfall Trail', big: true };
    else if (i === 6) basic = { petCharm: 'charm_piko', label: 'Piko the Cub', big: true };
    else if (i === 3) basic = { item: 'forge_stone', n: 8, label: 'Forge Stone x8' };
    else if (i % 2 === 0) basic = { coins: 160 + i * 14, label: `${160 + i * 14} coins` };
    else basic = { item: i % 4 === 1 ? 'potion_xp' : 'potion_luck', n: 2, label: i % 4 === 1 ? 'Scholar Brew x2' : 'Lucky Charm x2' };

    // PREMIUM ROW. Two mounts, three pets, four cosmetics and a MYTHIC weapon
    // at the end, so the last tier is genuinely a trophy rather than a bigger
    // pile of coins. Nothing here is purchasable with gold anywhere else.
    let premium;
    if (i === 30) premium = { weaponTier: 'mythic', label: 'CELESTIUM — MYTHIC WEAPON', grand: true };
    else if (i === 28) premium = { mount: 'mount_aurora', label: 'AURORA MOUNT', grand: true };
    else if (i === 25) premium = { petCharm: 'charm_seraphi', label: 'Seraphi the Dragon', big: true };
    else if (i === 21) premium = { weaponTier: 'legendary', label: 'DRAGONFANG WEAPON', big: true };
    else if (i === 19) premium = { cosmetic: 'hat_kitsune', label: 'Kitsune Mask', big: true };
    else if (i === 16) premium = { petCharm: 'charm_nox', label: 'Nox the Shade', big: true };
    else if (i === 13) premium = { cosmetic: 'back_koi', label: 'Koi Kite', big: true };
    else if (i === 11) premium = { petCharm: 'charm_glimmer', label: 'Glimmer the Fox', big: true };
    else if (i === 8) premium = { mount: 'mount_pebble', label: 'Pebble Mount', big: true };
    else if (i === 5) premium = { cosmetic: 'hat_pumpkin', label: 'Pumpkin Head', big: true };
    else if (i % 3 === 0) premium = { item: 'potion_luck', n: 3, label: 'Lucky Charm x3' };
    else premium = { coins: 320 + i * 26, label: `${320 + i * 26} coins` };

    t.push({ tier: i, free, basic, premium });
  }
  return t;
})();

export function createGamePass({ grant, onToast, onBanner }) {
  const state = {
    owned: 'none',        // 'none' | 'basic' | 'premium'
    xp: 0,                // total pass XP earned this season
    claimed: { free: [], basic: [], premium: [] },
  };

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
  }
  function serialize() {
    return { owned: state.owned, xp: state.xp, claimed: state.claimed };
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
    const entry = PASS_TRACK[tier - 1]?.[row];
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

  /** Buy a pass. `spend` returns true if the coins were taken. */
  function buy(kind, spend) {
    if (kind !== 'basic' && kind !== 'premium') return false;
    if (state.owned === kind) return false;
    if (state.owned === 'premium') return false;          // already the best
    // upgrading basic -> premium only costs the difference
    const price = state.owned === 'basic' && kind === 'premium'
      ? PASS_PRICES.premium - PASS_PRICES.basic
      : PASS_PRICES[kind];
    if (!spend(price)) { onToast?.('Not enough gold for that pass.'); return false; }
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
    state, load, serialize, event, claim, claimAll, canClaim, buy, pending,
    tierOf, progressInTier, perks,
    PASS_TRACK, PASS_TIERS, PASS_PRICES, XP_PER_TIER,
  };
}
