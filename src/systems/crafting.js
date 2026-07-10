// Resep crafting per tipe senjata (mengikuti class) + konsumabel.
import { ITEMS } from './items.js';

export const RECIPES = [
  // sword — Ksatria
  { out: 'bone_blade',     cost: { small_bone: 4, slime_gel: 2 },                desc: 'Tajam dari tulang.' },
  { out: 'chitin_edge',    cost: { chitin_shell: 6, slime_gel: 3 },              desc: 'Keras seperti cangkang.' },
  { out: 'treant_cleaver', cost: { hardwood: 4, small_bone: 6, boar_tusk: 3 },   desc: 'Berat, menghancurkan.' },
  // bow — Pemanah
  { out: 'feather_bow',    cost: { feather: 6, nibbit_beak: 2 },                 desc: 'Ringan dan senyap.' },
  { out: 'chitin_recurve', cost: { chitin_shell: 5, feather: 4 },                desc: 'Tarikan lebih kuat.' },
  { out: 'sylvan_longbow', cost: { hardwood: 4, feather: 8, wisp_essence: 2 },   desc: 'Bisikan hutan di tiap panah.' },
  // staff — Penyihir
  { out: 'bone_staff',     cost: { small_bone: 5, slime_gel: 3 },                desc: 'Getar sihir purba.' },
  { out: 'crystal_staff',  cost: { wisp_essence: 4, spore_sac: 3 },              desc: 'Kristal esensi wisp.' },
  { out: 'treant_staff',   cost: { hardwood: 5, wisp_essence: 5, golem_core: 1 },desc: 'Jantung hutan itu sendiri.' },
  // dagger — Pembunuh
  { out: 'fang_daggers',   cost: { nibbit_beak: 3, small_bone: 3 },              desc: 'Taring yang menari.' },
  { out: 'chitin_claws',   cost: { chitin_shell: 5, boar_tusk: 2 },              desc: 'Cakar serangga raksasa.' },
  { out: 'shadow_fangs',   cost: { wisp_essence: 4, boar_tusk: 3, hardwood: 2 }, desc: 'Digigit bayangan.' },
  // konsumabel — semua class
  { out: 'tonic',          cost: { green_herb: 2, slime_gel: 1 },                desc: 'Pulihkan 40 HP.' },
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
