// Item definitions, per-class weapons, and enemy drop tables.

export const ITEMS = {
  // materials
  slime_gel:    { name: 'Slime Gel' },
  chitin_shell: { name: 'Chitin Shell' },
  small_bone:   { name: 'Small Bone' },
  feather:      { name: 'Feather' },
  nibbit_beak:  { name: 'Nibbit Beak' },
  green_herb:   { name: 'Green Herb' },
  wheat_seed:   { name: 'Wheat Seed' },
  hardwood:     { name: 'Hardwood' },
  spore_sac:    { name: 'Spore Sac' },
  boar_tusk:    { name: 'Boar Tusk' },
  wisp_essence: { name: 'Wisp Essence' },
  golem_core:   { name: 'Golem Core' },
  forge_stone:  { name: 'Forge Stone' },

  // fish (fishing)
  fish_minnow: { name: 'Mossy Minnow', fish: true },
  fish_perch:  { name: 'Sunset Perch', fish: true },
  fish_koi:    { name: 'Golden Koi', fish: true, rare: true },

  // pet charms — owning one unlocks that pet (chests, world bosses, quests)
  charm_moku:    { name: 'Moku Charm', petCharm: 'moku' },
  charm_piko:    { name: 'Piko Charm', petCharm: 'piko' },
  charm_bubbles: { name: 'Bubbles Charm', petCharm: 'bubbles' },
  charm_cinder:  { name: 'Cinder Charm', petCharm: 'cinder' },
  charm_luma:    { name: 'Luma Charm', petCharm: 'luma' },
  charm_tuff:    { name: 'Tuff Charm', petCharm: 'tuff' },
  charm_flap:    { name: 'Flap Charm', petCharm: 'flap' },
  charm_hopps:   { name: 'Hopps Charm', petCharm: 'hopps' },
  charm_wooly:   { name: 'Wooly Charm', petCharm: 'wooly' },
  charm_koko:    { name: 'Koko Charm', petCharm: 'koko' },

  // mount whistles — earned from villager quests
  mount_trotter:    { name: 'Trotter Whistle', mountId: 'trotter' },
  mount_clucky:     { name: 'Clucky Whistle', mountId: 'clucky' },
  mount_shellsworth:{ name: 'Shellsworth Whistle', mountId: 'shellsworth' },
  mount_nimbus:     { name: 'Nimbus Whistle', mountId: 'nimbus' },

  // consumables
  tonic: { name: 'Health Tonic', consumable: true, heal: 40 },

  // ---- WEAPONS ----
  // sword (Knight): wide melee arc
  wooden_sword:   { name: 'Wooden Sword',   weapon: true, type: 'sword', tier: 0, dmg: 7,  speed: 2.0,  range: 2.2, arc: 2.0, blade: ['#8a6b42', '#b08c58'], scale: 1.0 },
  bone_blade:     { name: 'Bone Blade',     weapon: true, type: 'sword', tier: 1, dmg: 12, speed: 1.95, range: 2.3, arc: 2.0, blade: ['#b5ad95', '#efe9d6'], scale: 1.05 },
  chitin_edge:    { name: 'Chitin Edge',    weapon: true, type: 'sword', tier: 2, dmg: 18, speed: 1.85, range: 2.4, arc: 2.1, blade: ['#5c4630', '#96703f'], scale: 1.1 },
  treant_cleaver: { name: 'Treant Cleaver', weapon: true, type: 'sword', tier: 3, dmg: 28, speed: 1.3,  range: 2.7, arc: 2.4, blade: ['#3e5e46', '#5f8a63'], scale: 1.25 },

  // bow (Archer): arrow projectiles
  short_bow:      { name: 'Short Bow',      weapon: true, type: 'bow', tier: 0, dmg: 6,  speed: 1.9, range: 15, projSpeed: 20, blade: ['#6e5438', '#96703f'], scale: 1.0 },
  feather_bow:    { name: 'Feather Bow',    weapon: true, type: 'bow', tier: 1, dmg: 10, speed: 2.0, range: 16, projSpeed: 22, blade: ['#8fa8ba', '#c3d4e2'], scale: 1.0 },
  chitin_recurve: { name: 'Chitin Recurve', weapon: true, type: 'bow', tier: 2, dmg: 15, speed: 2.1, range: 17, projSpeed: 24, blade: ['#5c4630', '#96703f'], scale: 1.08 },
  sylvan_longbow: { name: 'Sylvan Longbow', weapon: true, type: 'bow', tier: 3, dmg: 23, speed: 1.8, range: 19, projSpeed: 26, blade: ['#3e5e46', '#6fa05a'], scale: 1.18 },

  // staff (Mage): exploding magic bolts
  apprentice_staff: { name: 'Apprentice Staff', weapon: true, type: 'staff', tier: 0, dmg: 8,  speed: 1.5, range: 13, projSpeed: 13, aoe: 1.2, blade: ['#6e5438', '#9a86d8'], scale: 1.0 },
  bone_staff:       { name: 'Bone Staff',       weapon: true, type: 'staff', tier: 1, dmg: 13, speed: 1.5, range: 14, projSpeed: 14, aoe: 1.4, blade: ['#b5ad95', '#c8b8f0'], scale: 1.0 },
  crystal_staff:    { name: 'Crystal Staff',    weapon: true, type: 'staff', tier: 2, dmg: 19, speed: 1.55, range: 15, projSpeed: 15, aoe: 1.6, blade: ['#7a9ad8', '#bfe0ff'], scale: 1.06 },
  treant_staff:     { name: 'Treant Staff',     weapon: true, type: 'staff', tier: 3, dmg: 28, speed: 1.4, range: 16, projSpeed: 15, aoe: 1.9, blade: ['#3e5e46', '#9fe86e'], scale: 1.15 },

  // dagger (Assassin): 2 fast stabs per attack
  rusty_daggers: { name: 'Rusty Daggers', weapon: true, type: 'dagger', tier: 0, dmg: 4,  speed: 3.0, range: 1.8, arc: 1.6, hits: 2, blade: ['#7a6a5a', '#a89888'], scale: 0.72 },
  fang_daggers:  { name: 'Fang Daggers',  weapon: true, type: 'dagger', tier: 1, dmg: 7,  speed: 3.1, range: 1.9, arc: 1.6, hits: 2, blade: ['#b5ad95', '#efe9d6'], scale: 0.75 },
  chitin_claws:  { name: 'Chitin Claws',  weapon: true, type: 'dagger', tier: 2, dmg: 10, speed: 3.2, range: 1.9, arc: 1.7, hits: 2, blade: ['#5c4630', '#96703f'], scale: 0.78 },
  shadow_fangs:  { name: 'Shadow Fangs',  weapon: true, type: 'dagger', tier: 3, dmg: 15, speed: 3.3, range: 2.0, arc: 1.8, hits: 2, blade: ['#3a3a4a', '#8a7ad0'], scale: 0.85 },
};

// [itemId, chance, min, max]
export const DROP_TABLES = {
  slime: [
    ['slime_gel', 0.85, 1, 2],
    ['wheat_seed', 0.28, 1, 2],
    ['green_herb', 0.2, 1, 1],
    ['forge_stone', 0.06, 1, 1],
  ],
  nibbit: [
    ['feather', 0.75, 1, 2],
    ['nibbit_beak', 0.5, 1, 1],
    ['wheat_seed', 0.18, 1, 1],
    ['forge_stone', 0.06, 1, 1],
  ],
  armorbug: [
    ['chitin_shell', 0.9, 1, 3],
    ['small_bone', 0.35, 1, 1],
    ['forge_stone', 0.1, 1, 1],
  ],
  treant: [
    ['hardwood', 1.0, 1, 2],
    ['small_bone', 0.6, 1, 2],
    ['green_herb', 0.4, 1, 1],
    ['forge_stone', 0.14, 1, 1],
  ],
  fungling: [
    ['spore_sac', 0.85, 1, 2],
    ['green_herb', 0.5, 1, 2],
    ['forge_stone', 0.07, 1, 1],
  ],
  boarling: [
    ['boar_tusk', 0.8, 1, 2],
    ['small_bone', 0.5, 1, 2],
    ['forge_stone', 0.09, 1, 1],
  ],
  wisp: [
    ['wisp_essence', 0.9, 1, 2],
    ['forge_stone', 0.16, 1, 1],
  ],
  golem: [
    ['golem_core', 1.0, 1, 1],
    ['forge_stone', 1.0, 2, 4],
    ['chitin_shell', 0.6, 2, 4],
  ],
};

export function rollDrops(tableId, rng = Math.random) {
  const out = [];
  for (const [id, chance, min, max] of DROP_TABLES[tableId] || []) {
    if (rng() < chance) {
      out.push({ id, count: min + Math.floor(rng() * (max - min + 1)) });
    }
  }
  return out;
}
