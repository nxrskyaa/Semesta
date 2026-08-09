// XP and levels. A level-up raises HP and stamina and heals to full.

/** The ceiling. Everything else in the game is tuned against this number:
 *  monster scaling adds a tier per 5 hero levels, the class trees open their
 *  last tier at 24, and auto-battle unlocks here. A cap is not a limitation —
 *  it is what lets the rest of the curve mean something. */
export const MAX_LEVEL = 30;

export function xpNeeded(level) {
  return Math.round(22 * Math.pow(level, 1.45));
}

export function createLeveling() {
  const state = {
    level: 1,
    xp: 0,
    onLevelUp: null, // callback(newLevel)
  };

  function addXp(amount) {
    if (state.level >= MAX_LEVEL) {
      // At the cap the bar reads full and stays there rather than filling and
      // resetting forever, which looks like progress that goes nowhere.
      state.xp = xpNeeded(MAX_LEVEL);
      return 0;
    }
    state.xp += amount;
    let ups = 0;
    while (state.level < MAX_LEVEL && state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      ups++;
    }
    if (state.level >= MAX_LEVEL) state.xp = xpNeeded(MAX_LEVEL);
    if (ups > 0 && state.onLevelUp) state.onLevelUp(state.level);
    return ups;
  }

  function progress() {
    if (state.level >= MAX_LEVEL) return 1;
    return state.xp / xpNeeded(state.level);
  }

  const atCap = () => state.level >= MAX_LEVEL;

  // stat growth from levels
  function maxHp() { return 40 + (state.level - 1) * 10; }
  function maxStamina() { return 100 + (state.level - 1) * 6; }
  function dmgMult() { return 1 + (state.level - 1) * 0.06; }

  return { state, addXp, progress, maxHp, maxStamina, dmgMult, atCap, MAX_LEVEL };
}
