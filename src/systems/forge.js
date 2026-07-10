// Sistem forge: tempa senjata +1 s/d +9. Tiap + menambah 8% damage.
// Gagal = bahan hangus, senjata aman. Peluang sukses turun di + tinggi.

export const MAX_PLUS = 9;

export function forgeCost(plus) {
  // biaya untuk naik ke (plus+1)
  return {
    forge_stone: 1 + Math.floor(plus / 2),
    ...(plus >= 3 ? { golem_core: plus >= 6 ? 1 : 0 } : {}),
  };
}

export function forgeChance(plus) {
  if (plus < 3) return 1.0;
  return Math.max(0.35, 1.0 - (plus - 2) * 0.12);
}

export function forgeMultiplier(plus) {
  return 1 + plus * 0.08;
}

export function createForge(inventory) {
  function plusOf(weaponId) {
    return inventory.state.upgrades.get(weaponId) || 0;
  }

  function canForge(weaponId) {
    const plus = plusOf(weaponId);
    if (plus >= MAX_PLUS) return { ok: false, reason: 'MAX' };
    const cost = forgeCost(plus);
    for (const [id, n] of Object.entries(cost)) {
      if (n > 0 && inventory.count(id) < n) return { ok: false, reason: 'BAHAN' };
    }
    return { ok: true };
  }

  // return { success, plus }
  function forge(weaponId) {
    const check = canForge(weaponId);
    if (!check.ok) return null;
    const plus = plusOf(weaponId);
    const cost = forgeCost(plus);
    for (const [id, n] of Object.entries(cost)) {
      if (n > 0) inventory.remove(id, n);
    }
    const success = Math.random() < forgeChance(plus);
    if (success) inventory.state.upgrades.set(weaponId, plus + 1);
    inventory.notify();
    return { success, plus: plusOf(weaponId) };
  }

  return { plusOf, canForge, forge };
}
