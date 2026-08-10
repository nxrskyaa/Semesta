// THE INDEX — the collection log, and the thing a levelled hero plays FOR.
//
// The problem it solves, in the player's own words: past a certain level there
// is nothing left to aim at. Every system in this game produces something
// unique — fourteen fish, thirteen-plus pets, fourteen monsters, three world
// bosses, four tiers of weapon per class, a shelf of gacha exclusives — and
// none of it was ever counted anywhere. You could own the Anavela Leviathan and
// the game would never once acknowledge it.
//
// So: every unique thing in the world has a slot here, the slot fills the first
// time you see the thing, and the panel shows you exactly how many are left.
// That is the whole design. A collection log works because the empty rows are
// the content — an unfilled slot is a quest nobody had to write.
//
// Three rules this file follows:
//
//  1. DISCOVERY IS A FACT, NOT A REWARD. `see()` is called from wherever the
//     thing actually happens (a fish lands, a monster dies, a capsule opens) and
//     it never grants anything by itself. Completion rewards are data here and
//     granted by a caller-supplied `grant()`, the same contract dailies and the
//     gamepass use.
//  2. THE CATALOGUE IS DERIVED. Entries are built from ITEMS, PET_DEFS,
//     ENEMY_TYPES and the rest at load time, so anything anybody adds to those
//     tables shows up in the Index automatically and cannot be forgotten.
//  3. UNSEEN ENTRIES STILL SHOW. Name hidden, silhouette shown, hint shown —
//     because "there is a fish you have not caught, it lives in the sea, and it
//     only bites at night" is interesting, and a blank grid is not.
import { ITEMS, RARITY_ORDER } from './items.js';
import { PET_DEFS } from './pets.js';
import { ENEMY_TYPES, WORLD_BOSSES } from '../entities/enemies.js';
import { MOUNT_DEFS } from './mounts.js';

/** Where a fish lives, in words, for the hint on an uncaught row. */
function fishHint(d) {
  const where = d.water === 'sea' ? 'Out at sea'
    : d.water === 'lake' ? 'In the lakes'
      : 'Any water';
  const when = d.only === 'night' ? ', after dark'
    : d.only === 'snow' ? ', in the Winter Reach'
      : '';
  return `${where}${when}.`;
}

/**
 * Build the whole catalogue from the game's own tables.
 *
 * Each entry: { id, name, icon, rarity, hint, cat }.
 * `icon` is an item id when one exists, or null for things drawn as a glyph.
 */
export function buildCatalogue() {
  const cats = [];

  // ---- FISH ---------------------------------------------------------------
  cats.push({
    id: 'fish', name: 'FISH', glyph: '🐟',
    blurb: 'Everything that bites in Anavela. Rarer fish want the right water, the right hour, and in one case a life-skill node.',
    entries: Object.entries(ITEMS)
      .filter(([, d]) => d.fish)
      .map(([id, d]) => ({ id, name: d.name, icon: id, rarity: d.rarity, hint: fishHint(d) })),
  });

  // ---- PETS ---------------------------------------------------------------
  cats.push({
    id: 'pets', name: 'PETS', glyph: '🐾',
    blurb: 'Companions. Every one of them fetches what monsters drop; the perk on top is what makes them different.',
    entries: Object.entries(PET_DEFS).map(([id, d]) => ({
      id, name: d.name, icon: d.charm, rarity: d.rarity || 'rare',
      hint: d.gachaOnly ? 'Only from the capsule machine.' : 'From chests, bosses or a quest.',
    })),
  });

  // ---- MOUNTS -------------------------------------------------------------
  cats.push({
    id: 'mounts', name: 'MOUNTS', glyph: '🐴',
    blurb: 'Things to ride. Sprig is free from the first minute; the rest are earned or pulled.',
    entries: Object.entries(MOUNT_DEFS).map(([id, d]) => ({
      id, name: d.name, icon: d.item || null, rarity: d.rarity || 'rare',
      hint: d.gachaOnly ? 'Only from the capsule machine.' : 'From a quest.',
    })),
  });

  // ---- MONSTERS -----------------------------------------------------------
  cats.push({
    id: 'monsters', name: 'MONSTERS', glyph: '👾',
    blurb: 'Everything that lives in the wilds. Two of them only appear in the snow, one only at night.',
    entries: Object.entries(ENEMY_TYPES).map(([id, d]) => ({
      id, name: d.name, icon: null, rarity: 'common',
      hint: d.snowOnly ? 'The Winter Reach, in the north-west.'
        : d.nightOnly ? 'Only after dark.'
          : 'Out in the wilds.',
    })),
  });

  // ---- WORLD BOSSES -------------------------------------------------------
  cats.push({
    id: 'bosses', name: 'WORLD BOSSES', glyph: '☠',
    blurb: 'One spawns every three minutes, always well away from town. Watch the gold marker on the minimap.',
    entries: Object.entries(WORLD_BOSSES).map(([id, d]) => ({
      id, name: d.name, icon: null, rarity: 'legendary',
      hint: 'Hunt the gold marker on the map.',
    })),
  });

  // ---- WEAPONS ------------------------------------------------------------
  // Every class's whole line, not just yours. Seeing the other five ladders is
  // half of why anybody rolls a second hero.
  cats.push({
    id: 'weapons', name: 'WEAPONS', glyph: '⚔',
    blurb: 'Every weapon in the game, across all six classes. Crafted, awarded, or pulled from a capsule.',
    entries: Object.entries(ITEMS)
      .filter(([, d]) => d.weapon)
      .map(([id, d]) => ({
        id, name: d.name, icon: id, rarity: d.rarity || 'common',
        hint: d.gacha ? 'Capsule machine only.' : 'Crafted, or handed over for work done.',
      })),
  });

  // ---- COSMETICS ----------------------------------------------------------
  cats.push({
    id: 'cosmetics', name: 'WARDROBE', glyph: '🧢',
    blurb: 'Hats, back pieces and movement trails. Worn in the wardrobe (O); every one of them is cosmetic only.',
    entries: Object.entries(ITEMS)
      .filter(([, d]) => d.cosmetic)
      .map(([id, d]) => ({
        id, name: d.name, icon: id, rarity: d.rarity || 'uncommon',
        hint: d.cosmetic === 'trail' ? 'A movement trail.'
          : d.cosmetic === 'back' ? 'Worn on the back.' : 'Worn on the head.',
      })),
  });

  return cats;
}

/**
 * What finishing a whole category is worth. Deliberately generous and mostly
 * cosmetic: the point of a collection log is the collecting, and a reward big
 * enough to be the REASON would turn it into a chore list.
 */
export const CATEGORY_REWARD = {
  fish: { coins: 2500, item: 'forge_stone', count: 10, label: 'Master Angler' },
  pets: { coins: 3000, item: 'tonic', count: 20, label: 'Beast Friend' },
  mounts: { coins: 2500, item: 'forge_stone', count: 12, label: 'Stablemaster' },
  monsters: { coins: 2000, item: 'tonic', count: 15, label: 'Field Naturalist' },
  bosses: { coins: 4000, item: 'forge_stone', count: 20, label: 'Giant Slayer' },
  weapons: { coins: 5000, item: 'forge_stone', count: 25, label: 'Armoury Complete' },
  cosmetics: { coins: 4000, item: 'tonic', count: 25, label: 'Full Wardrobe' },
};

/**
 * @param grant caller-supplied reward payout — this module never touches an
 *   inventory, same contract as dailies and the gamepass.
 * @param onDiscover optional, fired the first time anything is seen, so the HUD
 *   can toast it.
 */
export function createIndex({ grant, onDiscover } = {}) {
  const cats = buildCatalogue();
  const byCat = new Map(cats.map((c) => [c.id, c]));
  // seen[cat] = Set of ids
  const seen = {};
  const claimed = {};
  for (const c of cats) { seen[c.id] = new Set(); claimed[c.id] = false; }

  /**
   * Record that the player has encountered something. Safe to call every frame
   * and from anywhere — it is a no-op once the thing is already logged, and it
   * only fires `onDiscover` on the genuine first time.
   */
  function see(cat, id) {
    const c = byCat.get(cat);
    if (!c || !id) return false;
    if (seen[cat].has(id)) return false;
    // never log something that is not in the catalogue: a typo'd id would show
    // as a permanently unreachable 15/14
    if (!c.entries.some((e) => e.id === id)) return false;
    seen[cat].add(id);
    const e = c.entries.find((x) => x.id === id);
    onDiscover?.(c, e, progress(cat));
    return true;
  }

  /** Log a whole bag at once — used on load, so an old save is not blank. */
  function seeMany(cat, ids) {
    for (const id of ids || []) {
      const c = byCat.get(cat);
      if (c && c.entries.some((e) => e.id === id)) seen[cat].add(id);
    }
  }

  function progress(cat) {
    const c = byCat.get(cat);
    if (!c) return { have: 0, total: 0, pct: 0 };
    const have = seen[cat].size, total = c.entries.length;
    return { have, total, pct: total ? have / total : 0 };
  }

  function overall() {
    let have = 0, total = 0;
    for (const c of cats) { have += seen[c.id].size; total += c.entries.length; }
    return { have, total, pct: total ? have / total : 0 };
  }

  /** Categories finished but not yet cashed in — drives the "!" on the tile. */
  function pending() {
    return cats.filter((c) => !claimed[c.id] && progress(c.id).have >= c.entries.length).length;
  }

  function claim(cat) {
    const c = byCat.get(cat);
    if (!c || claimed[cat]) return null;
    if (progress(cat).have < c.entries.length) return null;
    claimed[cat] = true;
    const r = CATEGORY_REWARD[cat];
    if (r) grant?.(r);
    return r;
  }

  /** Rows for the panel: the catalogue with `found` folded in. */
  function rows(cat) {
    const c = byCat.get(cat);
    if (!c) return [];
    const order = (r) => RARITY_ORDER.indexOf(r);
    return c.entries
      .map((e) => ({ ...e, found: seen[cat].has(e.id) }))
      .sort((a, b) => order(a.rarity) - order(b.rarity) || a.name.localeCompare(b.name));
  }

  return {
    cats, rows, see, seeMany, progress, overall, pending, claim,
    isClaimed: (cat) => !!claimed[cat],
    serialize: () => ({
      seen: Object.fromEntries(cats.map((c) => [c.id, [...seen[c.id]]])),
      claimed: { ...claimed },
    }),
    load: (d) => {
      if (!d) return;
      for (const c of cats) {
        seeMany(c.id, d.seen?.[c.id]);
        claimed[c.id] = !!d.claimed?.[c.id];
      }
    },
  };
}
