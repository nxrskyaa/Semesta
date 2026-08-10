// Crafting recipes per weapon type (follows the class) + consumables.
import { ITEMS } from './items.js';

export const RECIPES = [
  // sword — Knight
  { out: 'bone_blade',     cost: { small_bone: 4, slime_gel: 2 },                desc: 'Sharpened from bone.' },
  { out: 'chitin_edge',    cost: { chitin_shell: 6, slime_gel: 3 },              desc: 'Hard as a beetle shell.' },
  { out: 'treant_cleaver', cost: { hardwood: 4, small_bone: 6, boar_tusk: 3 },   desc: 'Heavy. Crushing.' },
  // bow — Archer
  { out: 'feather_bow',    cost: { feather: 6, nibbit_beak: 2 },                 desc: 'Light and silent.' },
  { out: 'chitin_recurve', cost: { chitin_shell: 5, feather: 4 },                desc: 'A far stronger draw.' },
  { out: 'sylvan_longbow', cost: { hardwood: 4, feather: 8, wisp_essence: 2 },   desc: 'Forest whispers in every arrow.' },
  // staff — Mage
  { out: 'bone_staff',     cost: { small_bone: 5, slime_gel: 3 },                desc: 'Hums with old magic.' },
  { out: 'crystal_staff',  cost: { wisp_essence: 4, spore_sac: 3 },              desc: 'Crystallized wisp essence.' },
  { out: 'treant_staff',   cost: { hardwood: 5, wisp_essence: 5, golem_core: 1 },desc: 'The heart of the forest itself.' },
  // dagger — Assassin
  { out: 'fang_daggers',   cost: { nibbit_beak: 3, small_bone: 3 },              desc: 'Fangs that dance.' },
  { out: 'chitin_claws',   cost: { chitin_shell: 5, boar_tusk: 2 },              desc: 'Claws of a giant insect.' },
  { out: 'shadow_fangs',   cost: { wisp_essence: 4, boar_tusk: 3, hardwood: 2 }, desc: 'Bitten by shadow.' },
  // AXE — Warrior's other branch. These did not exist, so a Warrior who picked
  // the axe at the awakening opened the crafting panel and saw nothing but a
  // health tonic.
  { out: 'bearded_axe',    cost: { hardwood: 5, small_bone: 4 },                 desc: 'A haft you need both hands for.' },
  { out: 'obsidian_axe',   cost: { chitin_shell: 6, boar_tusk: 4 },              desc: 'Volcanic glass, honed to nothing.' },
  { out: 'worldsplitter',  cost: { hardwood: 6, golem_core: 1, boar_tusk: 5 },   desc: 'Swung once. Felt twice.' },
  // CANNON — Summoner. Same problem: the class shipped with no recipes at all.
  { out: 'brass_mortar',   cost: { iron_ore: 5, forge_stone: 3 },                desc: 'Lobs a shell over anything in the way.' },
  { out: 'tesla_launcher', cost: { wisp_essence: 5, iron_ore: 6 },               desc: 'The charge coil hums before it fires.' },
  { out: 'siege_engine',   cost: { golem_core: 1, iron_ore: 8, forge_stone: 6 }, desc: 'Not really a weapon. A siege, held.' },
  // consumables — all classes
  { out: 'tonic',          cost: { green_herb: 2, slime_gel: 1 },                desc: 'Restores 40 HP.' },
];

/**
 * Recipes this class can actually make.
 *
 * The caller MUST pass the current weapon type, not one captured at world
 * build: the panel used to hold `cls.weaponType` from construction time, when
 * every character is still an Origin carrying a sword — so after awakening, a
 * Summoner was still being offered the Warrior's blades and none of its own.
 */
export function recipesFor(weaponType) {
  return RECIPES.filter((r) => {
    const d = ITEMS[r.out];
    return !d.weapon || d.type === weaponType;
  });
}

export function canCraft(recipe, inventory) {
  if (ITEMS[recipe.out].weapon && inventory.state.weapons.has(recipe.out)) return false;
  for (const [id, n] of Object.entries(recipe.cost)) {
    if (inventory.count(id) < n) return false;
  }
  return true;
}

/**
 * Spend the materials and produce the item.
 *
 * `withhold` takes the materials but does NOT hand over the result — the caller
 * adds it themselves later. That is what lets the forge scene be the actual
 * transaction: the ore leaves your bag as the billet goes into the coals, and
 * the weapon appears on the last hammer blow, rather than the whole thing being
 * settled before the animation has drawn a frame.
 */
export function craft(recipe, inventory, { withhold = false } = {}) {
  if (!canCraft(recipe, inventory)) return false;
  for (const [id, n] of Object.entries(recipe.cost)) inventory.remove(id, n);
  if (!withhold) inventory.add(recipe.out, 1);
  return true;
}
