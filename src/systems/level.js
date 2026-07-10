// Sistem XP & level. Level up: HP/stamina naik, heal penuh.

export function xpNeeded(level) {
  return Math.round(22 * Math.pow(level, 1.45));
}

export function createLeveling() {
  const state = {
    level: 1,
    xp: 0,
    onLevelUp: null, // callback(levelBaru)
  };

  function addXp(amount) {
    state.xp += amount;
    let ups = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      ups++;
    }
    if (ups > 0 && state.onLevelUp) state.onLevelUp(state.level);
    return ups;
  }

  function progress() { return state.xp / xpNeeded(state.level); }

  // bonus stat dari level
  function maxHp() { return 40 + (state.level - 1) * 10; }
  function maxStamina() { return 100 + (state.level - 1) * 6; }
  function dmgMult() { return 1 + (state.level - 1) * 0.06; }

  return { state, addXp, progress, maxHp, maxStamina, dmgMult };
}
