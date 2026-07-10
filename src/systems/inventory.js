// Inventory: material menumpuk, senjata dimiliki + upgrade forge, equipped per class.
import { ITEMS } from './items.js';

export function createInventory(startWeapon = 'wooden_sword') {
  const state = {
    materials: new Map(),          // id -> count
    weapons: new Set([startWeapon]),
    upgrades: new Map(),           // weaponId -> plus level (forge)
    equipped: startWeapon,
    listeners: new Set(),
  };

  function notify() { for (const fn of state.listeners) fn(); }
  function onChange(fn) { state.listeners.add(fn); }

  function count(id) { return state.materials.get(id) || 0; }

  function add(id, n = 1) {
    const def = ITEMS[id];
    if (!def) return;
    if (def.weapon) state.weapons.add(id);
    else state.materials.set(id, count(id) + n);
    notify();
  }

  function remove(id, n = 1) {
    const c = count(id);
    if (c < n) return false;
    if (c === n) state.materials.delete(id);
    else state.materials.set(id, c - n);
    notify();
    return true;
  }

  function usePotion() {
    if (!remove('tonic', 1)) return null;
    return ITEMS.tonic;
  }

  function equip(id) {
    if (!state.weapons.has(id)) return false;
    state.equipped = id;
    notify();
    return true;
  }

  function equippedDef() { return ITEMS[state.equipped]; }
  function equippedPlus() { return state.upgrades.get(state.equipped) || 0; }

  // --- serialisasi untuk save game ---
  function serialize() {
    return {
      materials: [...state.materials.entries()],
      weapons: [...state.weapons],
      upgrades: [...state.upgrades.entries()],
      equipped: state.equipped,
    };
  }
  function load(data) {
    if (!data) return;
    state.materials = new Map(data.materials || []);
    state.weapons = new Set(data.weapons || []);
    state.upgrades = new Map(data.upgrades || []);
    if (data.equipped && state.weapons.has(data.equipped)) state.equipped = data.equipped;
    notify();
  }

  return { state, add, remove, count, onChange, usePotion, equip, equippedDef, equippedPlus, notify, serialize, load };
}
