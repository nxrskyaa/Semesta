// XP and levels. A level-up raises HP and stamina and heals to full.

/** The ceiling. Everything else in the game is tuned against this number:
 *  monster scaling adds a tier per 5 hero levels, the class trees open their
 *  last tier at 24, and auto-battle unlocks here. A cap is not a limitation —
 *  it is what lets the rest of the curve mean something. */
// THE CAP IS 50. Raised from 30, and the audit that went with it is written
// down because a cap is not one number — it is every curve that reads it.
//
//   HP        40 + (lv-1)*10   -> 530 at 50 (was 330)
//   Stamina  100 + (lv-1)*6    -> 394 (was 274)
//   Damage     1 + (lv-1)*0.06 -> x3.94 (was x2.74)
//   Attributes    3 per level  -> 150 points (was 90), via `grantedTo`
//   Skill points  1 per level  -> 50, against 21 nodes plus four upgrades each,
//                                 so the tree still cannot be fully bought
//
// The things that did NOT move, deliberately: the awakening stays at 10 and the
// class-tree tiers at 10/16/24, because those are about the shape of the first
// hours and raising the ceiling does not change when a hero should choose what
// they are. The Hollow still opens at 20 and scales on its own curve, so it is
// untouched by this.
export const MAX_LEVEL = 50;

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
