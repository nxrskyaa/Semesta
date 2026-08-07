// LIFE SKILLS.
//
// Fishing, farming and cooking each had a loop and no progression: you did the
// same cast on hour ten as on minute one. Combat had levels and a skill panel;
// the livelihoods had nothing, so there was no reason to keep doing them once
// you could afford what they bought.
//
// Each skill levels on its OWN xp, earned by doing that skill, and every level
// hands out a point. Points buy nodes on a small tree — and a node has to change
// how the activity actually plays, not just add a percent. A bigger bite window,
// a second harvest, a chance to cook two portions: things you notice.
//
// Everything here is DATA plus a pure query API (`bonus(skill, key)`), so the
// callers never need to know what a node is — they ask "how much extra?" and get
// a number. That keeps the tree editable without touching fishing.js.

/** XP for one action, by the rarity of what came out of it. */
export const XP_BY_RARITY = {
  common: 6, uncommon: 13, rare: 26, epic: 46, legendary: 90, mythic: 220,
};

/** XP needed to reach level n+1 from n. Deliberately shallow — this is a hobby. */
export const levelCost = (lv) => Math.round(40 * Math.pow(1.42, lv - 1));

export const MAX_LEVEL = 20;

/**
 * A node: `id`, the `skill` it belongs to, a display `name`, the `req` level
 * before it can be bought, its `cost` in points, how many times it can be
 * bought (`ranks`), and `gives` — the bonus keys it adds per rank.
 */
export const NODES = [
  // --- FISHING -------------------------------------------------------------
  {
    id: 'f_patience', skill: 'fishing', name: 'Patience', req: 1, cost: 1, ranks: 3,
    desc: 'The bite window stays open longer, so a late strike still lands.',
    gives: { biteWindow: 0.22 },
  },
  {
    id: 'f_bait', skill: 'fishing', name: 'Better Bait', req: 2, cost: 1, ranks: 3,
    desc: 'Fish come to the float sooner.',
    gives: { biteSpeed: 0.14 },
  },
  {
    id: 'f_reader', skill: 'fishing', name: 'Water Reader', req: 4, cost: 2, ranks: 3,
    desc: 'Better odds on rare and above.',
    gives: { rareLuck: 0.18 },
  },
  {
    id: 'f_double', skill: 'fishing', name: 'Double Hook', req: 7, cost: 2, ranks: 2,
    desc: 'A chance to land two fish on one cast.',
    gives: { doubleCatch: 0.12 },
  },
  {
    id: 'f_afk', skill: 'fishing', name: 'Set Lines', req: 9, cost: 2, ranks: 2,
    desc: 'AFK fishing stops being quite so hopeless at the top end.',
    gives: { afkQuality: 0.3 },
  },
  {
    id: 'f_master', skill: 'fishing', name: 'Deep Water', req: 13, cost: 3, ranks: 1,
    desc: 'Mythic fish can bite. Nothing else in the game unlocks this.',
    gives: { mythicUnlock: 1, rareLuck: 0.25 },
  },

  // --- FARMING -------------------------------------------------------------
  {
    id: 'a_green', skill: 'farming', name: 'Green Thumb', req: 1, cost: 1, ranks: 3,
    desc: 'Crops grow faster.',
    gives: { growSpeed: 0.15 },
  },
  {
    id: 'a_yield', skill: 'farming', name: 'Heavy Yield', req: 3, cost: 1, ranks: 3,
    desc: 'A chance of an extra crop when you harvest.',
    gives: { extraCrop: 0.14 },
  },
  {
    id: 'a_seed', skill: 'farming', name: 'Seed Saver', req: 5, cost: 2, ranks: 2,
    desc: 'A chance to get the seed back with the harvest.',
    gives: { seedBack: 0.2 },
  },
  {
    id: 'a_plots', skill: 'farming', name: 'Land Sense', req: 8, cost: 2, ranks: 2,
    desc: 'Buying the next plot costs less.',
    gives: { plotDiscount: 0.2 },
  },
  {
    id: 'a_master', skill: 'farming', name: 'Perennial', req: 12, cost: 3, ranks: 1,
    desc: 'Harvesting sometimes leaves the plant standing, fully grown.',
    gives: { regrow: 0.22 },
  },

  // --- COOKING -------------------------------------------------------------
  {
    id: 'c_taste', skill: 'cooking', name: 'Seasoning', req: 1, cost: 1, ranks: 3,
    desc: 'Cooked food heals more.',
    gives: { healBonus: 0.18 },
  },
  {
    id: 'c_batch', skill: 'cooking', name: 'Big Pot', req: 3, cost: 1, ranks: 3,
    desc: 'A chance to cook two portions from one set of ingredients.',
    gives: { doubleCook: 0.15 },
  },
  {
    id: 'c_buff', skill: 'cooking', name: 'Hearty Meals', req: 6, cost: 2, ranks: 3,
    desc: 'Food buffs last longer.',
    gives: { buffTime: 0.25 },
  },
  {
    id: 'c_sell', skill: 'cooking', name: 'Restaurateur', req: 9, cost: 2, ranks: 2,
    desc: 'Cooked dishes sell for more.',
    gives: { sellBonus: 0.16 },
  },
  {
    id: 'c_master', skill: 'cooking', name: "Chef's Table", req: 12, cost: 3, ranks: 1,
    desc: 'Every dish you cook also grants a small permanent max-HP bump, once each.',
    gives: { feast: 1 },
  },
];

export const SKILLS = [
  { id: 'fishing', name: 'Fishing', icon: '🎣', color: '#5aa8e8' },
  { id: 'farming', name: 'Farming', icon: '🌱', color: '#7fc44f' },
  { id: 'cooking', name: 'Cooking', icon: '🍳', color: '#e8a35d' },
];

export function createSkillTree({ onLevel, onToast } = {}) {
  const state = {
    fishing: { lv: 1, xp: 0, pts: 0, nodes: {} },
    farming: { lv: 1, xp: 0, pts: 0, nodes: {} },
    cooking: { lv: 1, xp: 0, pts: 0, nodes: {} },
  };

  /** Award xp for one action. `rarityOrXp` is a rarity name or a raw number. */
  function gain(skill, rarityOrXp = 'common') {
    const st = state[skill];
    if (!st || st.lv >= MAX_LEVEL) return;
    const xp = typeof rarityOrXp === 'number' ? rarityOrXp : (XP_BY_RARITY[rarityOrXp] || 6);
    st.xp += xp;
    while (st.lv < MAX_LEVEL && st.xp >= levelCost(st.lv)) {
      st.xp -= levelCost(st.lv);
      st.lv++;
      st.pts++;
      onLevel?.(skill, st.lv);
    }
  }

  const ranksOf = (skill, nodeId) => state[skill]?.nodes[nodeId] || 0;

  /** Total of one bonus key across every bought node of a skill. */
  function bonus(skill, key) {
    const st = state[skill];
    if (!st) return 0;
    let total = 0;
    for (const n of NODES) {
      if (n.skill !== skill) continue;
      const r = st.nodes[n.id] || 0;
      if (r && n.gives[key]) total += n.gives[key] * r;
    }
    return total;
  }

  /** Can this node be bought right now, and if not, why? */
  function canBuy(nodeId) {
    const n = NODES.find((x) => x.id === nodeId);
    if (!n) return { ok: false, why: 'No such node' };
    const st = state[n.skill];
    if (ranksOf(n.skill, nodeId) >= n.ranks) return { ok: false, why: 'Maxed' };
    if (st.lv < n.req) return { ok: false, why: `Needs level ${n.req}` };
    if (st.pts < n.cost) return { ok: false, why: `Needs ${n.cost} point${n.cost > 1 ? 's' : ''}` };
    return { ok: true };
  }

  function buy(nodeId) {
    const c = canBuy(nodeId);
    if (!c.ok) return c;
    const n = NODES.find((x) => x.id === nodeId);
    const st = state[n.skill];
    st.pts -= n.cost;
    st.nodes[n.id] = (st.nodes[n.id] || 0) + 1;
    onToast?.(`${n.name} ${st.nodes[n.id]}/${n.ranks}`);
    return { ok: true };
  }

  const progress = (skill) => {
    const st = state[skill];
    return { lv: st.lv, xp: st.xp, need: levelCost(st.lv), pts: st.pts };
  };
  /** Any skill with an unspent point, for the "!" badge. */
  const pending = () => SKILLS.reduce((n, s) => n + state[s.id].pts, 0);

  const serialize = () => JSON.parse(JSON.stringify(state));
  function load(data) {
    if (!data) return;
    for (const s of SKILLS) {
      if (!data[s.id]) continue;
      Object.assign(state[s.id], data[s.id]);
      state[s.id].nodes = { ...(data[s.id].nodes || {}) };
    }
  }

  return { state, gain, bonus, ranksOf, canBuy, buy, progress, pending, serialize, load, NODES, SKILLS };
}
