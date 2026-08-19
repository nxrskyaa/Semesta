// CHARACTER STATS — the build.
//
// Four attributes, three points a level, and no respec. That is the whole
// system, and every part of it is chosen against the same rule: a point must
// change something you can FEEL within one fight, or it is not worth the
// decision it asks for.
//
//   MIGHT      more damage per hit
//   VITALITY   more health
//   AGILITY    faster attacks and faster feet
//   FOCUS      more stamina, and it comes back quicker
//
// Deliberately NOT percentages that read like accounting. Each attribute owns
// one obvious thing, so "I put ten into Agility" has an answer you can see
// rather than one you have to trust a tooltip about.
//
// No respec on purpose: a build you can undo for free is not a build, it is a
// menu you re-open before every boss. What softens it is that the numbers are
// generous — no allocation is a trap, and every one of the four is playable.

export const ATTRS = {
  might: {
    name: 'Might', short: 'MGT', color: '#e8574a',
    desc: 'Every hit lands harder. Weapons, skills and summons all scale off it.',
    per: '+2.5% damage',
  },
  vitality: {
    name: 'Vitality', short: 'VIT', color: '#8ad86e',
    desc: 'Flat health. The difference between surviving a mistake and not.',
    per: '+6 max HP',
  },
  agility: {
    name: 'Agility', short: 'AGI', color: '#78ecff',
    desc: 'Swing faster and move faster. The only stat that changes how the game feels to hold.',
    per: '+1.2% attack & move speed',
  },
  focus: {
    name: 'Focus', short: 'FOC', color: '#d8b866',
    desc: 'A deeper stamina pool that refills sooner. Rolls, blocks and skills all draw on it.',
    per: '+4 max stamina, +2% regen',
  },
};

export const ATTR_ORDER = ['might', 'vitality', 'agility', 'focus'];

/** Points awarded per character level. Three is enough to feel a level-up in
 *  the build as well as in the numbers, without the pool getting silly by 30. */
export const POINTS_PER_LEVEL = 3;

/** A hard ceiling per attribute, so nothing can be pushed past the point where
 *  the maths stops being sane. At the Lv50 cap a hero earns 150 points against
 *  four attributes, so this still binds: you can max two and part of a third,
 *  which is a real choice rather than a formality. */
export const ATTR_CAP = 60;

export function createStats() {
  const state = {
    points: 0,
    spent: { might: 0, vitality: 0, agility: 0, focus: 0 },
    // The level we last granted points for, so loading a save never double-pays.
    // Starts at 0 so Lv1 itself pays out — a brand new hero opens the panel with
    // points in hand rather than an empty screen and a promise.
    grantedTo: 0,
  };

  /** Called on every level-up (and once on load, to catch up). */
  function syncLevel(level) {
    if (level <= state.grantedTo) return 0;
    const gained = (level - state.grantedTo) * POINTS_PER_LEVEL;
    state.points += gained;
    state.grantedTo = level;
    return gained;
  }

  function canSpend(attr) {
    return state.points > 0 && (state.spent[attr] ?? 0) < ATTR_CAP;
  }

  function spend(attr, n = 1) {
    let done = 0;
    for (let i = 0; i < n && canSpend(attr); i++) {
      state.points--;
      state.spent[attr]++;
      done++;
    }
    return done;
  }

  // ---- what the points actually do ---------------------------------------
  //
  // These are read by the game every frame, so they are plain arithmetic with
  // no allocation. Each returns a MULTIPLIER or a flat bonus, and the caller
  // decides where it lands.

  const dmgMult = () => 1 + state.spent.might * 0.025;
  const bonusHp = () => state.spent.vitality * 6;
  const atkSpeedMult = () => 1 + state.spent.agility * 0.012;
  const moveMult = () => 1 + state.spent.agility * 0.012;
  const bonusStamina = () => state.spent.focus * 4;
  const staminaRegenMult = () => 1 + state.spent.focus * 0.02;

  /** Everything a panel needs to draw a row. */
  function rows() {
    return ATTR_ORDER.map((id) => ({
      id,
      ...ATTRS[id],
      value: state.spent[id],
      capped: state.spent[id] >= ATTR_CAP,
      canBuy: canSpend(id),
    }));
  }

  /** The derived numbers, for the summary at the bottom of the panel. */
  function summary() {
    return [
      ['Damage', `+${Math.round((dmgMult() - 1) * 100)}%`],
      ['Max HP', `+${bonusHp()}`],
      ['Attack speed', `+${Math.round((atkSpeedMult() - 1) * 100)}%`],
      ['Move speed', `+${Math.round((moveMult() - 1) * 100)}%`],
      ['Max stamina', `+${bonusStamina()}`],
      ['Stamina regen', `+${Math.round((staminaRegenMult() - 1) * 100)}%`],
    ];
  }

  /**
   * Hand every spent point back.
   *
   * The design said "no respec" and meant it — a build you cannot undo is a
   * build you have to think about. But that was written when the cap was 30 and
   * ninety points; at fifty and a hundred and fifty, a choice made at level
   * twelve is being enforced on a character forty levels later, and a player who
   * wants to try a Might build after grinding a Focus one has no route but to
   * delete the hero. Undoing a build is not the same as never having to make one:
   * the points still cost levels, and the reset is a deliberate, confirmed act.
   *
   * @returns how many points came back, so the caller can say so.
   */
  function reset() {
    let back = 0;
    for (const k of ATTR_ORDER) { back += state.spent[k]; state.spent[k] = 0; }
    state.points += back;
    return back;
  }

  return {
    state, syncLevel, spend, canSpend, rows, summary, reset,
    dmgMult, bonusHp, atkSpeedMult, moveMult, bonusStamina, staminaRegenMult,
    serialize: () => ({ points: state.points, spent: { ...state.spent }, grantedTo: state.grantedTo }),
    load: (d) => {
      if (!d) return;
      state.points = d.points || 0;
      state.grantedTo = d.grantedTo || 1;
      for (const k of ATTR_ORDER) state.spent[k] = d.spent?.[k] || 0;
    },
  };
}
