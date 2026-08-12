// Item definitions, per-class weapons, and enemy drop tables.

// The six-tier rarity ladder used by gacha, cosmetics and reveal FX.
export const RARITY = {
  common:    { name: 'Common',    color: '#b8c4b0', refund: 10 },
  uncommon:  { name: 'Uncommon',  color: '#6fc25e', refund: 30 },
  rare:      { name: 'Rare',      color: '#5aa8e8', refund: 60 },
  epic:      { name: 'Epic',      color: '#b06ae8', refund: 120 },
  legendary: { name: 'Legendary', color: '#f0c455', refund: 300 },
  mythic:    { name: 'Mythic',    color: '#f05a9a', refund: 800 },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const ITEMS = {
  // materials (sell = coin value at Pip's shop)
  slime_gel:    { name: 'Slime Gel', sell: 2 },
  chitin_shell: { name: 'Chitin Shell', sell: 4 },
  small_bone:   { name: 'Small Bone', sell: 2 },
  feather:      { name: 'Feather', sell: 2 },
  nibbit_beak:  { name: 'Nibbit Beak', sell: 3 },
  green_herb:   { name: 'Green Herb', sell: 3 },
  wheat_seed:   { name: 'Wheat Seed', sell: 1 },
  hardwood:     { name: 'Hardwood', sell: 5 },
  spore_sac:    { name: 'Spore Sac', sell: 4 },
  boar_tusk:    { name: 'Boar Tusk', sell: 5 },
  wisp_essence: { name: 'Wisp Essence', sell: 8 },
  golem_core:   { name: 'Golem Core', sell: 40 },
  forge_stone:  { name: 'Forge Stone', sell: 6 },
  frost_shard:  { name: 'Frost Shard', sell: 9 },
  static_fluff: { name: 'Static Fluff', sell: 6 },
  soft_plume:   { name: 'Soft Plume', sell: 8 },

  // FISH. Three species was not a fishing system, it was a loot table with a
  // rod attached. Fourteen now, spread across the six rarity tiers and split by
  // WHERE they live — lake, ocean, the winter reach, and night — so casting in a
  // new place is worth doing and a rare catch is an event.
  // `water`: 'lake' | 'sea' | 'any';  `only`: 'night' | 'snow' | undefined
  fish_minnow:  { name: 'Mossy Minnow', fish: true, rarity: 'common', water: 'lake', sell: 4 },
  fish_bitterling: { name: 'Bitterling', fish: true, rarity: 'common', water: 'any', sell: 5 },
  fish_sardine: { name: 'Silver Sardine', fish: true, rarity: 'common', water: 'sea', sell: 6 },
  fish_perch:   { name: 'Sunset Perch', fish: true, rarity: 'uncommon', water: 'lake', sell: 10 },
  fish_mackerel: { name: 'Banded Mackerel', fish: true, rarity: 'uncommon', water: 'sea', sell: 12 },
  fish_catfish: { name: 'Whiskered Catfish', fish: true, rarity: 'uncommon', water: 'lake', only: 'night', sell: 16 },
  fish_snapper: { name: 'Coral Snapper', fish: true, rarity: 'rare', water: 'sea', sell: 26 },
  fish_trout:   { name: 'Spotted Trout', fish: true, rarity: 'rare', water: 'lake', sell: 24 },
  fish_icefin:  { name: 'Icefin', fish: true, rarity: 'rare', water: 'any', only: 'snow', sell: 30 },
  fish_koi:     { name: 'Golden Koi', fish: true, rare: true, rarity: 'epic', water: 'lake', sell: 60 },
  fish_lantern: { name: 'Lanternfish', fish: true, rare: true, rarity: 'epic', water: 'sea', only: 'night', sell: 70 },
  fish_sunfish: { name: 'Sunfish', fish: true, rare: true, rarity: 'legendary', water: 'sea', sell: 150 },
  fish_ghostcarp: { name: 'Ghost Carp', fish: true, rare: true, rarity: 'legendary', water: 'lake', only: 'night', sell: 165 },
  fish_leviathan: { name: 'Anavela Leviathan', fish: true, rare: true, rarity: 'mythic', water: 'sea', sell: 480 },

  // --- THE WIDER SHOAL ---------------------------------------------------
  // Fourteen species meant the Index's fish page filled up in an afternoon and
  // most casts drew the same three. These spread the catch across both waters,
  // both times of day and the winter biome, so where and when you fish is a
  // real decision. Nothing else needs registering: the catch table filters
  // ITEMS by `water`/`only`, and the Index derives its page from the same
  // table, so a species added here appears in both automatically.
  fish_bluegill:   { name: 'Bluegill', fish: true, rarity: 'common', water: 'lake', sell: 5 },
  fish_anchovy:    { name: 'Anchovy', fish: true, rarity: 'common', water: 'sea', sell: 5 },
  fish_eel:        { name: 'Reed Eel', fish: true, rarity: 'uncommon', water: 'lake', only: 'night', sell: 15 },
  fish_pike:       { name: 'Green Pike', fish: true, rarity: 'uncommon', water: 'lake', sell: 13 },
  fish_pufferfish: { name: 'Puffer', fish: true, rarity: 'uncommon', water: 'sea', sell: 14 },
  fish_glasscarp:  { name: 'Glass Carp', fish: true, rarity: 'rare', water: 'any', sell: 27 },
  fish_rayfin:     { name: 'Velvet Ray', fish: true, rarity: 'rare', water: 'sea', sell: 30 },
  fish_stonejaw:   { name: 'Stonejaw', fish: true, rarity: 'rare', water: 'lake', only: 'snow', sell: 32 },
  fish_moonscale:  { name: 'Moonscale', fish: true, rare: true, rarity: 'epic', water: 'any', only: 'night', sell: 66 },
  fish_emberfin:   { name: 'Emberfin', fish: true, rare: true, rarity: 'epic', water: 'sea', sell: 72 },
  fish_aurorafish: { name: 'Aurorafish', fish: true, rare: true, rarity: 'legendary', water: 'lake', only: 'snow', sell: 175 },
  fish_kraken:     { name: 'Lesser Kraken', fish: true, rare: true, rarity: 'mythic', water: 'sea', only: 'night', sell: 520 },

  // gathering
  iron_ore: { name: 'Iron Ore', sell: 10 },

  // farming — seeds grow into crops on your plots
  seed_wheat:   { name: 'Wheat Seeds', seed: 'crop_wheat', growTime: 60, buy: 5 },
  seed_berry:   { name: 'Berry Seeds', seed: 'crop_berry', growTime: 95, buy: 10 },
  seed_pumpkin: { name: 'Pumpkin Seeds', seed: 'crop_pumpkin', growTime: 130, buy: 18 },
  crop_wheat:   { name: 'Golden Wheat', crop: true, sell: 8 },
  crop_berry:   { name: 'Sunberries', crop: true, sell: 15 },
  crop_pumpkin: { name: 'Plump Pumpkin', crop: true, sell: 26 },

  // cooking — grilled at any campfire, eat from the Bag
  grilled_minnow: { name: 'Grilled Minnow', consumable: true, heal: 22, sell: 8 },
  perch_dinner:   { name: 'Perch Dinner', consumable: true, heal: 55, sell: 20 },
  koi_feast:      { name: 'Koi Feast', consumable: true, heal: 120, sell: 90 },

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

  // gacha-exclusive pet charms (never in chests)
  charm_glimmer: { name: 'Glimmer Charm', petCharm: 'glimmer', rarity: 'legendary' },
  charm_nox:     { name: 'Nox Charm', petCharm: 'nox', rarity: 'legendary' },
  charm_seraphi: { name: 'Seraphi Charm', petCharm: 'seraphi', rarity: 'mythic' },
  charm_emberling: { name: 'Emberling Charm', petCharm: 'emberling', rarity: 'legendary' },
  charm_tideling: { name: 'Tideling Charm', petCharm: 'tideling', rarity: 'legendary' },
  charm_zephyr:  { name: 'Zephyr Charm', petCharm: 'zephyr', rarity: 'mythic' },
  charm_verdant: { name: 'Verdant Charm', petCharm: 'verdant', rarity: 'mythic' },

  // ---- WARDROBE COSMETICS (gacha & level rewards) ----
  // hats
  hat_straw:   { name: 'Straw Hat', cosmetic: 'hat', rarity: 'common' },
  hat_leaf:    { name: 'Leaf Cap', cosmetic: 'hat', rarity: 'common' },
  hat_bandana: { name: 'Scout Bandana', cosmetic: 'hat', rarity: 'uncommon' },
  hat_miner:   { name: 'Miner Helm', cosmetic: 'hat', rarity: 'uncommon' },
  hat_wizard:  { name: 'Wizard Hat', cosmetic: 'hat', rarity: 'rare' },
  hat_catears: { name: 'Cat Ears', cosmetic: 'hat', rarity: 'rare' },
  hat_viking:  { name: 'Viking Helm', cosmetic: 'hat', rarity: 'epic' },
  hat_crown:   { name: 'Royal Crown', cosmetic: 'hat', rarity: 'legendary' },
  hat_halo:    { name: 'Radiant Halo', cosmetic: 'hat', rarity: 'mythic' },
  hat_chef:    { name: 'Chef Toque', cosmetic: 'hat', rarity: 'uncommon' },
  hat_pirate:  { name: 'Pirate Tricorn', cosmetic: 'hat', rarity: 'rare' },
  hat_pumpkin: { name: 'Pumpkin Head', cosmetic: 'hat', rarity: 'epic' },
  hat_kitsune: { name: 'Kitsune Mask', cosmetic: 'hat', rarity: 'legendary' },
  // back
  back_pack:      { name: 'Traveler Pack', cosmetic: 'back', rarity: 'common' },
  back_sprout:    { name: 'Sprout Wings', cosmetic: 'back', rarity: 'uncommon' },
  back_bubble:    { name: 'Bubble Wings', cosmetic: 'back', rarity: 'rare' },
  back_butterfly: { name: 'Butterfly Wings', cosmetic: 'back', rarity: 'epic' },
  back_phoenix:   { name: 'Phoenix Wings', cosmetic: 'back', rarity: 'legendary' },
  back_prism:     { name: 'Prism Wings', cosmetic: 'back', rarity: 'mythic' },
  back_shell:     { name: 'Turtle Shell', cosmetic: 'back', rarity: 'uncommon' },
  back_balloon:   { name: 'Red Balloon', cosmetic: 'back', rarity: 'rare' },
  back_koi:       { name: 'Koi Kite', cosmetic: 'back', rarity: 'epic' },
  // movement trails
  trail_leaf:    { name: 'Leaf Trail', cosmetic: 'trail', rarity: 'uncommon' },
  trail_petal:   { name: 'Petal Trail', cosmetic: 'trail', rarity: 'rare' },
  trail_frost:   { name: 'Frost Trail', cosmetic: 'trail', rarity: 'rare' },
  trail_ember:   { name: 'Ember Trail', cosmetic: 'trail', rarity: 'epic' },
  trail_star:    { name: 'Star Trail', cosmetic: 'trail', rarity: 'legendary' },
  trail_rainbow: { name: 'Rainbow Trail', cosmetic: 'trail', rarity: 'mythic' },

  // --- SEASON ONE: LANTERNS -------------------------------------------------
  // `limited` marks a piece that belongs to a named season rather than the
  // permanent pool. Nothing here is time-gated yet — the tag is honest about
  // what it means today: these are the pieces tied to this chapter of the game,
  // shown with a season badge so the set reads as a set. The wardrobe and the
  // capsule catalogue both surface it.
  hat_lantern:  { name: 'Keeper Lantern Hat', cosmetic: 'hat', rarity: 'epic', limited: 'Lanterns' },
  hat_fox:      { name: 'Fox Hood', cosmetic: 'hat', rarity: 'rare', limited: 'Lanterns' },
  hat_antlers:  { name: 'Spirit Antlers', cosmetic: 'hat', rarity: 'legendary', limited: 'Lanterns' },
  hat_bucket:   { name: 'Angler Bucket', cosmetic: 'hat', rarity: 'common' },
  hat_flower:   { name: 'Flower Circlet', cosmetic: 'hat', rarity: 'uncommon' },
  hat_horns:    { name: 'Ember Horns', cosmetic: 'hat', rarity: 'epic' },
  hat_starcap:  { name: 'Starfall Cap', cosmetic: 'hat', rarity: 'rare' },
  hat_moon:     { name: 'Moonwreath', cosmetic: 'hat', rarity: 'mythic', limited: 'Lanterns' },

  back_cloakfeather: { name: 'Featherfall Cloak', cosmetic: 'back', rarity: 'rare' },
  back_lanterns: { name: 'Hanging Lanterns', cosmetic: 'back', rarity: 'epic', limited: 'Lanterns' },
  back_reef:    { name: 'Reef Fins', cosmetic: 'back', rarity: 'uncommon' },
  back_frost:   { name: 'Frostglass Wings', cosmetic: 'back', rarity: 'legendary', limited: 'Lanterns' },
  back_scroll:  { name: 'Scholar Scrolls', cosmetic: 'back', rarity: 'common' },

  trail_bubble: { name: 'Bubble Trail', cosmetic: 'trail', rarity: 'uncommon' },
  trail_lantern: { name: 'Lantern Trail', cosmetic: 'trail', rarity: 'epic', limited: 'Lanterns' },
  trail_ink:    { name: 'Ink Trail', cosmetic: 'trail', rarity: 'rare' },
  trail_aurora: { name: 'Aurora Trail', cosmetic: 'trail', rarity: 'mythic', limited: 'Lanterns' },

  // mount whistles — starter one is free, the rest come from villager quests
  mount_sprig:      { name: 'Sprig Whistle', mountId: 'sprig' },
  mount_trotter:    { name: 'Trotter Whistle', mountId: 'trotter' },
  mount_clucky:     { name: 'Clucky Whistle', mountId: 'clucky' },
  mount_shellsworth:{ name: 'Shellsworth Whistle', mountId: 'shellsworth' },
  mount_nimbus:     { name: 'Nimbus Whistle', mountId: 'nimbus' },
  mount_blossom:    { name: 'Blossom Whistle', mountId: 'blossom', rarity: 'legendary' },
  mount_aurora:     { name: 'Aurora Whistle', mountId: 'aurora', rarity: 'mythic' },
  mount_pebble:     { name: 'Pebble Whistle', mountId: 'pebble', rarity: 'epic' },

  // watercraft keys — moored at the marina, not summoned like a mount
  craft_dinghy:  { name: 'Dinghy Oars', craftId: 'dinghy', buy: 120, rarity: 'common' },
  craft_jetski:  { name: 'Donut Boat Key', craftId: 'jetski', buy: 480, rarity: 'rare' },

  // consumables
  tonic: { name: 'Health Tonic', consumable: true, heal: 40 },
  // hour-long boosters: the two things players actually want to double
  potion_xp:   { name: 'Scholar Brew', buff: 'xp',   mult: 1, mins: 60, buy: 220, sell: 60, rarity: 'uncommon' },
  potion_luck: { name: 'Lucky Charm',  buff: 'luck', mult: 1, mins: 60, buy: 260, sell: 70, rarity: 'rare' },

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

  // AXE (Warrior's other hand). A real second type rather than a re-skinned
  // sword: slower, shorter reach, but a much wider arc and a heavier hit, so
  // picking it at the awakening actually changes how the class plays.
  iron_axe:      { name: 'Iron Axe',       weapon: true, type: 'axe', tier: 0, dmg: 13, speed: 1.35, range: 2.4, arc: 2.7, blade: ['#7a7f86', '#b4bcc4'], scale: 1.22 },
  bearded_axe:   { name: 'Bearded Axe',    weapon: true, type: 'axe', tier: 1, dmg: 20, speed: 1.3,  range: 2.5, arc: 2.8, blade: ['#8a6b42', '#c8a86a'], scale: 1.26 },
  obsidian_axe:  { name: 'Obsidian Axe',   weapon: true, type: 'axe', tier: 2, dmg: 30, speed: 1.25, range: 2.6, arc: 2.9, blade: ['#3a3440', '#8a7a9a'], scale: 1.3 },
  worldsplitter: { name: 'Worldsplitter',  weapon: true, type: 'axe', tier: 3, dmg: 44, speed: 1.15, range: 2.8, arc: 3.0, blade: ['#5a3a2a', '#e0a050'], scale: 1.4 },

  // CANNON (Summoner). Slow, arcing, and it explodes — the only weapon whose
  // basic attack has an area, which is what makes standing behind an army of
  // summons and lobbing shells a playstyle rather than a gimmick.
  scrap_bazooka:  { name: 'Scrap Bazooka',  weapon: true, type: 'cannon', tier: 0, dmg: 14, speed: 0.85, range: 12, projSpeed: 15, aoe: 1.8, blade: ['#6c7480', '#a8b0ba'], scale: 1.0 },
  brass_mortar:   { name: 'Brass Mortar',   weapon: true, type: 'cannon', tier: 1, dmg: 22, speed: 0.85, range: 13, projSpeed: 16, aoe: 2.0, blade: ['#8a6a30', '#d8b060'], scale: 1.05 },
  tesla_launcher: { name: 'Tesla Launcher', weapon: true, type: 'cannon', tier: 2, dmg: 32, speed: 0.9,  range: 14, projSpeed: 17, aoe: 2.2, blade: ['#3a5a6a', '#6ec8d8'], scale: 1.1 },
  siege_engine:   { name: 'Siege Engine',   weapon: true, type: 'cannon', tier: 3, dmg: 46, speed: 0.8,  range: 15, projSpeed: 18, aoe: 2.6, blade: ['#4a4038', '#ffb055'], scale: 1.2 },

  // the awakening hand-me-downs: one rung above what an Origin carries, so
  // choosing a class feels like being given something
  iron_sword:    { name: 'Iron Sword',      weapon: true, type: 'sword', tier: 0, dmg: 11, speed: 2.0, range: 2.3, arc: 2.1, blade: ['#7a7f86', '#c4ccd4'], scale: 1.04 },
  oak_staff:     { name: 'Oak Staff',       weapon: true, type: 'staff', tier: 0, dmg: 10, speed: 1.5, range: 13, projSpeed: 14, aoe: 1.3, blade: ['#6e5438', '#b09ae8'], scale: 1.0 },

  // extra starter weapons for the new classes (reuse existing weapon types so
  // they share the sword/bow/staff crafting trees & attack animations)
  battle_axe:   { name: 'Battle Axe',    weapon: true, type: 'sword', tier: 0, dmg: 10, speed: 1.6, range: 2.5, arc: 2.4, blade: ['#8a8e92', '#c8ccd0'], scale: 1.2 },
  hunter_bow:   { name: 'Hunter Bow',    weapon: true, type: 'bow',   tier: 0, dmg: 7,  speed: 2.0, range: 16, projSpeed: 22, blade: ['#5a7a3a', '#8aac5a'], scale: 1.02 },
  holy_staff:   { name: 'Acolyte Staff', weapon: true, type: 'staff', tier: 0, dmg: 8,  speed: 1.5, range: 14, projSpeed: 14, aoe: 1.3, blade: ['#c8b048', '#f8e8a8'], scale: 1.0 },

  // dagger (Assassin): 2 fast stabs per attack
  rusty_daggers: { name: 'Rusty Daggers', weapon: true, type: 'dagger', tier: 0, dmg: 4,  speed: 3.0, range: 1.8, arc: 1.6, hits: 2, blade: ['#7a6a5a', '#a89888'], scale: 0.72 },
  fang_daggers:  { name: 'Fang Daggers',  weapon: true, type: 'dagger', tier: 1, dmg: 7,  speed: 3.1, range: 1.9, arc: 1.6, hits: 2, blade: ['#b5ad95', '#efe9d6'], scale: 0.75 },
  chitin_claws:  { name: 'Chitin Claws',  weapon: true, type: 'dagger', tier: 2, dmg: 10, speed: 3.2, range: 1.9, arc: 1.7, hits: 2, blade: ['#5c4630', '#96703f'], scale: 0.78 },
  shadow_fangs:  { name: 'Shadow Fangs',  weapon: true, type: 'dagger', tier: 3, dmg: 15, speed: 3.3, range: 2.0, arc: 1.8, hits: 2, blade: ['#3a3a4a', '#8a7ad0'], scale: 0.85 },

  // FIST (Fighter): the shortest reach in the game, three hits per attack, and
  // a wide arc because a combination is thrown at whatever is in front of you
  // rather than aimed at one target. Per-hit damage is low on purpose — the
  // class's damage comes from landing three of them, three times a second, from
  // a distance where everything else is already hitting you back.
  hand_wraps:    { name: 'Hand Wraps',     weapon: true, type: 'fist', tier: 0, dmg: 4,  speed: 3.4, range: 1.6, arc: 2.0, hits: 3, blade: ['#c8b89a', '#efe4cc'], scale: 0.6 },
  rattan_guards: { name: 'Rattan Guards',  weapon: true, type: 'fist', tier: 1, dmg: 6,  speed: 3.5, range: 1.7, arc: 2.0, hits: 3, blade: ['#9a7440', '#d8b070'], scale: 0.64 },
  iron_knuckles: { name: 'Iron Knuckles',  weapon: true, type: 'fist', tier: 2, dmg: 9,  speed: 3.5, range: 1.7, arc: 2.1, hits: 3, blade: ['#6a6e74', '#b8c0c8'], scale: 0.68 },
  tiger_claws:   { name: 'Harimau Claws',  weapon: true, type: 'fist', tier: 3, dmg: 13, speed: 3.6, range: 1.8, arc: 2.2, hits: 3, blade: ['#8a3a1a', '#f0a850'], scale: 0.74 },

  // ---- GACHA-EXCLUSIVE WEAPONS ----
  // three tiers per weapon type; `glow` gives them an aura light + orbiting
  // sparks on the blade. Which one you pull matches your class's weapon type.
  // epic — STARFORGED (violet starlight)
  star_blade:  { name: 'Starforged Blade',   weapon: true, type: 'sword',  tier: 4, dmg: 32, speed: 1.7,  range: 2.6, arc: 2.2, blade: ['#4a4a7a', '#b8b8f5'], scale: 1.2,  glow: '#b06ae8', rarity: 'epic', model: 'star' },
  star_bow:    { name: 'Starforged Bow',     weapon: true, type: 'bow',    tier: 4, dmg: 26, speed: 1.95, range: 19, projSpeed: 27, blade: ['#4a4a7a', '#b8b8f5'], scale: 1.15, glow: '#b06ae8', rarity: 'epic', model: 'star' },
  star_staff:  { name: 'Starforged Staff',   weapon: true, type: 'staff',  tier: 4, dmg: 31, speed: 1.45, range: 16, projSpeed: 16, aoe: 2.0, blade: ['#4a4a7a', '#b8b8f5'], scale: 1.12, glow: '#b06ae8', rarity: 'epic', model: 'star' },
  star_fangs:  { name: 'Starforged Fangs',   weapon: true, type: 'dagger', tier: 4, dmg: 17, speed: 3.35, range: 2.0, arc: 1.8, hits: 2, blade: ['#4a4a7a', '#b8b8f5'], scale: 0.86, glow: '#b06ae8', rarity: 'epic', model: 'star' },
  // legendary — DRAGONFANG (molten gold)
  dragon_edge:    { name: 'Dragonfang Edge',    weapon: true, type: 'sword',  tier: 5, dmg: 38, speed: 1.75, range: 2.7, arc: 2.3, blade: ['#8a3a20', '#ffb055'], scale: 1.28, glow: '#f0c455', rarity: 'legendary', model: 'dragon' },
  dragon_recurve: { name: 'Dragonfang Recurve', weapon: true, type: 'bow',    tier: 5, dmg: 31, speed: 2.0,  range: 20, projSpeed: 28, blade: ['#8a3a20', '#ffb055'], scale: 1.2,  glow: '#f0c455', rarity: 'legendary', model: 'dragon' },
  dragon_scepter: { name: 'Dragonfang Scepter', weapon: true, type: 'staff',  tier: 5, dmg: 37, speed: 1.5,  range: 17, projSpeed: 16, aoe: 2.2, blade: ['#8a3a20', '#ffb055'], scale: 1.18, glow: '#f0c455', rarity: 'legendary', model: 'dragon' },
  dragon_talons:  { name: 'Dragonfang Talons',  weapon: true, type: 'dagger', tier: 5, dmg: 21, speed: 3.4,  range: 2.1, arc: 1.9, hits: 2, blade: ['#8a3a20', '#ffb055'], scale: 0.9,  glow: '#f0c455', rarity: 'legendary', model: 'dragon' },
  // mythic — CELESTIUM (rose starfire)
  celestial_saber: { name: 'Celestium Saber', weapon: true, type: 'sword',  tier: 6, dmg: 46, speed: 1.8,  range: 2.8, arc: 2.4, blade: ['#6a2a4a', '#ffc8e8'], scale: 1.34, glow: '#f05a9a', rarity: 'mythic', model: 'celestial' },
  celestial_arc:   { name: 'Celestium Arc',   weapon: true, type: 'bow',    tier: 6, dmg: 38, speed: 2.05, range: 21, projSpeed: 30, blade: ['#6a2a4a', '#ffc8e8'], scale: 1.25, glow: '#f05a9a', rarity: 'mythic', model: 'celestial' },
  celestial_rod:   { name: 'Celestium Rod',   weapon: true, type: 'staff',  tier: 6, dmg: 45, speed: 1.55, range: 18, projSpeed: 17, aoe: 2.5, blade: ['#6a2a4a', '#ffc8e8'], scale: 1.22, glow: '#f05a9a', rarity: 'mythic', model: 'celestial' },
  celestial_claws: { name: 'Celestium Claws', weapon: true, type: 'dagger', tier: 6, dmg: 26, speed: 3.5,  range: 2.2, arc: 2.0, hits: 2, blade: ['#6a2a4a', '#ffc8e8'], scale: 0.95, glow: '#f05a9a', rarity: 'mythic', model: 'celestial' },
};

// gacha weapon lookup: rarity tier -> weapon type -> item id
export const GACHA_WEAPONS = {
  epic:      { sword: 'star_blade', bow: 'star_bow', staff: 'star_staff', dagger: 'star_fangs' },
  legendary: { sword: 'dragon_edge', bow: 'dragon_recurve', staff: 'dragon_scepter', dagger: 'dragon_talons' },
  mythic:    { sword: 'celestial_saber', bow: 'celestial_arc', staff: 'celestial_rod', dagger: 'celestial_claws' },
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
  frostling: [
    ['frost_shard', 0.9, 1, 2],
    ['green_herb', 0.25, 1, 1],
    ['forge_stone', 0.1, 1, 1],
  ],
  sparkit: [
    ['static_fluff', 0.85, 1, 2],
    ['wheat_seed', 0.2, 1, 1],
    ['forge_stone', 0.06, 1, 1],
  ],
  puffowl: [
    ['soft_plume', 0.9, 1, 2],
    ['feather', 0.5, 1, 2],
    ['forge_stone', 0.12, 1, 1],
  ],
  embercub: [
    ['forge_stone', 0.5, 1, 2],
    ['green_herb', 0.3, 1, 1],
    ['boar_tusk', 0.2, 1, 1],
  ],
  thornling: [
    ['green_herb', 0.9, 1, 2],
    ['wheat_seed', 0.35, 1, 2],
    ['forge_stone', 0.08, 1, 1],
  ],
  mossback: [
    ['hardwood', 0.7, 1, 2],
    ['green_herb', 0.6, 1, 2],
    ['iron_ore', 0.25, 1, 1],
    ['forge_stone', 0.14, 1, 1],
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
