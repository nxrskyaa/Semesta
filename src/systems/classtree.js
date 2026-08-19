// CLASS SKILL TREES.
//
// Each of the six classes gets a tree of its own: three TIERS, unlocked by
// character level, with two or three choices at each tier. You spend skill
// points to learn a node, and you equip THREE of what you have learned into
// the three action slots. That separation is the whole design — learning is
// permanent and slow, equipping is free and instant, so experimenting with a
// loadout never costs you the points you ground for.
//
// The shape is borrowed from Dragon Nest: an early tier that defines how the
// class opens a fight, a middle tier that defines how it handles a crowd, and
// a late tier that is the class's one big answer. What is NOT borrowed is any
// node that only adds a hidden percentage — every node here changes something
// you can see happen on screen, because a tree of invisible buffs is a tree
// nobody can make an interesting choice in.
//
// Requirements are LEVEL + POINTS only. There is deliberately no "spend 5 in
// this branch to open the next", which in practice just means everybody looks
// up the one correct path and follows it.

import { SKILLS } from './skills.js';

/** tier -> the character level it opens at. */
export const TIER_LEVEL = [10, 16, 24];

/**
 * id: the skill id in SKILLS
 * cost: skill points to learn
 * tier: 0..2
 */
export const CLASS_TREES = {
  warrior: [
    { id: 'bash', tier: 0, cost: 1 },
    { id: 'shieldcharge', tier: 0, cost: 1 },
    { id: 'whirlwind', tier: 1, cost: 2 },
    { id: 'warcry', tier: 1, cost: 2 },
    { id: 'ironstance', tier: 1, cost: 2 },
    { id: 'earthsplitter', tier: 2, cost: 3 },
    { id: 'lastbastion', tier: 2, cost: 3 },
  ],
  archer: [
    { id: 'powershot', tier: 0, cost: 1 },
    { id: 'beasttrap', tier: 0, cost: 1 },
    { id: 'multishot', tier: 1, cost: 2 },
    { id: 'swiftness', tier: 1, cost: 2 },
    { id: 'volley', tier: 1, cost: 2 },
    { id: 'snipe', tier: 2, cost: 3 },
    { id: 'arrowstorm', tier: 2, cost: 3 },
  ],
  mage: [
    { id: 'fireball', tier: 0, cost: 1 },
    { id: 'blink', tier: 0, cost: 1 },
    { id: 'icenova', tier: 1, cost: 2 },
    { id: 'chainbolt', tier: 1, cost: 2 },
    { id: 'gravitywell', tier: 1, cost: 2 },
    { id: 'meteor', tier: 2, cost: 3 },
    { id: 'infernoshell', tier: 2, cost: 3 },
  ],
  priest: [
    { id: 'heal', tier: 0, cost: 1 },
    { id: 'smite', tier: 0, cost: 1 },
    { id: 'bless', tier: 1, cost: 2 },
    { id: 'sanctuary', tier: 1, cost: 2 },
    { id: 'chastise', tier: 1, cost: 2 },
    { id: 'judgement', tier: 2, cost: 3 },
    { id: 'lightpillar', tier: 2, cost: 3 },
  ],
  assassin: [
    { id: 'dashstrike', tier: 0, cost: 1 },
    { id: 'fanknives', tier: 0, cost: 1 },
    { id: 'shadowstep', tier: 1, cost: 2 },
    { id: 'cyclonestrike', tier: 1, cost: 2 },
    { id: 'smokebomb', tier: 1, cost: 2 },
    { id: 'thousandcuts', tier: 2, cost: 3 },
    { id: 'vanish', tier: 2, cost: 3 },
  ],
  summoner: [
    { id: 'summonbeast', tier: 0, cost: 1 },
    { id: 'turretdrop', tier: 0, cost: 1 },
    { id: 'rocketrain', tier: 1, cost: 2 },
    { id: 'summonbot', tier: 1, cost: 2 },
    { id: 'repairfield', tier: 1, cost: 2 },
    { id: 'siegemode', tier: 2, cost: 3 },
    { id: 'legion', tier: 2, cost: 3 },
  ],
  // FIGHTER. Two openers that close distance, a brace that lets you stay
  // inside, and a top tier that turns being surrounded into the good outcome.
  // `leapslam`, `cleave` and `rage` already exist and read as unarmed just as
  // well as they read as armed — inventing two more skills nobody would have
  // tuned would have been worse than reusing three that are already good.
  fighter: [
    { id: 'flurry', tier: 0, cost: 1 },
    { id: 'risingknee', tier: 0, cost: 1 },
    { id: 'ironbody', tier: 1, cost: 2 },
    { id: 'leapslam', tier: 1, cost: 2 },
    { id: 'cleave', tier: 1, cost: 2 },
    { id: 'rage', tier: 2, cost: 3 },
    { id: 'whirlwind', tier: 2, cost: 3 },
  ],
};

/** How many skills can be slotted at once. Three, matching the three buttons. */
export const LOADOUT_SIZE = 3;

/**
 * Learned nodes + the equipped loadout, saved and restored with the character.
 * Nothing here touches the inventory or the player — callers ask it questions.
 */
export function createClassTree() {
  const state = {
    learned: {},        // skillId -> true
    loadout: [],        // up to LOADOUT_SIZE skill ids, in slot order
    points: 0,
  };

  const nodesFor = (cls) => CLASS_TREES[cls] || [];

  function nodeOf(cls, id) {
    return nodesFor(cls).find((n) => n.id === id) || null;
  }

  /** Why you cannot learn this yet, or null if you can. */
  function blockedReason(cls, id, level) {
    const n = nodeOf(cls, id);
    if (!n) return 'Not part of this class.';
    if (state.learned[id]) return 'Already learned.';
    const need = TIER_LEVEL[n.tier] ?? 99;
    if (level < need) return `Unlocks at Lv${need}.`;
    if (state.points < n.cost) return `Needs ${n.cost} skill point${n.cost > 1 ? 's' : ''}.`;
    return null;
  }

  function learn(cls, id, level) {
    if (blockedReason(cls, id, level)) return false;
    const n = nodeOf(cls, id);
    state.points -= n.cost;
    state.learned[id] = true;
    // Learning something while a slot is empty fills it, because making a
    // player learn a skill and THEN go and equip it is a step with no decision
    // in it — the first three are never a real choice.
    if (state.loadout.length < LOADOUT_SIZE) state.loadout.push(id);
    return true;
  }

  /** Put a learned skill in a slot. Swaps if it is already slotted elsewhere. */
  function equip(id, slot) {
    if (!state.learned[id]) return false;
    if (slot < 0 || slot >= LOADOUT_SIZE) return false;
    const at = state.loadout.indexOf(id);
    const was = state.loadout[slot] || null;
    state.loadout[slot] = id;
    if (at >= 0 && at !== slot) state.loadout[at] = was;   // straight swap
    // trim trailing holes so the bar never shows a gap before a filled slot
    while (state.loadout.length && !state.loadout[state.loadout.length - 1]) state.loadout.pop();
    return true;
  }

  function unequip(slot) {
    if (slot < 0 || slot >= state.loadout.length) return false;
    state.loadout[slot] = null;
    while (state.loadout.length && !state.loadout[state.loadout.length - 1]) state.loadout.pop();
    return true;
  }

  /** The three ids the action bar should show. Padded, never sparse. */
  function activeSkills() {
    const out = [];
    for (let i = 0; i < LOADOUT_SIZE; i++) if (state.loadout[i]) out.push(state.loadout[i]);
    return out;
  }

  /** Rows for the panel: node + its skill def + whether it is available. */
  function rows(cls, level) {
    return nodesFor(cls).map((n) => ({
      ...n,
      def: SKILLS[n.id],
      learned: !!state.learned[n.id],
      slot: state.loadout.indexOf(n.id),
      blocked: blockedReason(cls, n.id, level),
      tierLevel: TIER_LEVEL[n.tier],
    }));
  }

  /** Awakening wipes nothing — but a class change must not leave another
   *  class's skills slotted, which would put a button on the bar that the
   *  runtime has no effect for. */
  function resetFor(cls) {
    const valid = new Set(nodesFor(cls).map((n) => n.id));
    for (const id of Object.keys(state.learned)) if (!valid.has(id)) delete state.learned[id];
    state.loadout = state.loadout.filter((id) => id && valid.has(id));
  }

  /**
   * Unlearn the whole tree and hand the points back.
   *
   * Refunds each node's OWN cost rather than counting nodes, because the tree
   * does not price them all the same — refunding one per node would quietly
   * rob anyone who bought the expensive ones.
   */
  function resetLearned(cls) {
    let back = 0;
    for (const id of Object.keys(state.learned)) {
      const n = nodeOf(cls, id);
      back += n?.cost ?? 1;
    }
    state.learned = {};
    state.loadout = [];
    state.points += back;
    return back;
  }

  return {
    state,
    learn, equip, unequip, activeSkills, rows, blockedReason, resetFor, resetLearned,
    addPoints: (n) => { state.points += n; },
    serialize: () => ({ learned: { ...state.learned }, loadout: [...state.loadout], points: state.points }),
    load: (d) => {
      if (!d) return;
      state.learned = d.learned || {};
      state.loadout = (d.loadout || []).filter(Boolean);
      state.points = d.points || 0;
    },
  };
}
