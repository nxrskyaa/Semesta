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
  // consumables — all classes
  { out: 'tonic',          cost: { green_herb: 2, slime_gel: 1 },                desc: 'Restores 40 HP.' },
];

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

export function craft(recipe, inventory) {
  if (!canCraft(recipe, inventory)) return false;
  for (const [id, n] of Object.entries(recipe.cost)) inventory.remove(id, n);
  inventory.add(recipe.out, 1);
  return true;
}
