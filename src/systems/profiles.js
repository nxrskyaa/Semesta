// CHARACTER SLOTS.
//
// Three per browser (and, once signed in, per account). Three is the right
// number for a game with six classes: enough that trying a Summoner does not
// mean deleting your Warrior, few enough that the select screen stays a glance
// rather than a list you scroll.
//
// The storage shape is deliberately conservative. The old single save lives at
// `semesta.save.v3` and thousands of characters already exist under it, so slot
// 0 IS that key — a returning player finds their hero exactly where it was and
// simply gains two empty slots beside it. Slots 1 and 2 get their own keys.
// Migrating everybody's save to a new format to make the code prettier would be
// trading a real risk of data loss for an internal tidiness nobody sees.

const LEGACY_KEY = 'semesta.save.v3';
const SLOT_KEY = (i) => (i === 0 ? LEGACY_KEY : `semesta.save.v3.slot${i}`);
const ACTIVE_KEY = 'semesta.slot.v1';

export const MAX_SLOTS = 3;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Which slot the game is currently playing. */
export function activeSlot() {
  try {
    const n = Number(localStorage.getItem(ACTIVE_KEY));
    return Number.isInteger(n) && n >= 0 && n < MAX_SLOTS ? n : 0;
  } catch { return 0; }
}

export function setActiveSlot(i) {
  try { localStorage.setItem(ACTIVE_KEY, String(i)); } catch { /* private mode */ }
}

/** The storage key the save system should read and write right now. */
export function activeKey() { return SLOT_KEY(activeSlot()); }

/**
 * A summary of every slot, for the select screen. Never returns the whole save
 * — the picker only needs enough to tell one hero from another.
 */
export function listSlots() {
  const out = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const d = read(SLOT_KEY(i));
    out.push(d ? {
      i,
      empty: false,
      name: d.character?.name || 'Adventurer',
      cls: d.character?.cls || 'origin',
      level: d.level || 1,
      at: d.at || 0,
      coins: d.inventory?.coins ?? 0,
      character: d.character,
    } : { i, empty: true });
  }
  return out;
}

export function slotUsed() { return listSlots().filter((s) => !s.empty).length; }
export function firstEmptySlot() {
  const s = listSlots().find((x) => x.empty);
  return s ? s.i : -1;
}

/** Wipe one slot. Used by DELETE on the select screen. */
export function deleteSlot(i) {
  try { localStorage.removeItem(SLOT_KEY(i)); } catch { /* nothing to do */ }
  if (activeSlot() === i) setActiveSlot(0);
}

/** Read a slot's full save (what main.js hands to init). */
export function loadSlot(i) { return read(SLOT_KEY(i)); }

/** Write to a slot. The save loop calls this rather than touching localStorage. */
export function saveSlot(i, data) {
  try { localStorage.setItem(SLOT_KEY(i), JSON.stringify(data)); return true; }
  catch { return false; }   // storage full or blocked
}
