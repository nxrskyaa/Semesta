// MMO-style class definitions: base stats, weapon type, 3 skills each.

export const CLASSES = {
  knight: {
    name: 'Knight',
    tagline: 'Frontline bulwark',
    desc: 'Greatsword & shield. Tanky, wide swings. Hold Shift to block incoming damage.',
    weaponType: 'sword',
    startWeapon: 'wooden_sword',
    baseHp: 60, baseStam: 100,
    hpPerLevel: 13, stamPerLevel: 5,
    dmgMult: 1.0, speed: 4.1,
    hasShield: true,
    skills: ['bash', 'whirlwind', 'warcry'],
    color: '#e08a5a',
    stats: { power: 3, speed: 2, range: 1, defense: 5 },
  },
  archer: {
    name: 'Archer',
    tagline: 'Hawk-eye of the woods',
    desc: 'Long-range bow. Nimble — pepper enemies from afar before they ever reach you.',
    weaponType: 'bow',
    startWeapon: 'short_bow',
    baseHp: 42, baseStam: 110,
    hpPerLevel: 9, stamPerLevel: 7,
    dmgMult: 1.0, speed: 4.6,
    hasShield: false,
    skills: ['powershot', 'multishot', 'swiftness'],
    color: '#8fce5a',
    stats: { power: 3, speed: 4, range: 5, defense: 2 },
  },
  mage: {
    name: 'Mage',
    tagline: 'Weaver of elements',
    desc: 'Arcane staff with exploding bolts. Fragile, but no one clears crowds harder.',
    weaponType: 'staff',
    startWeapon: 'apprentice_staff',
    baseHp: 38, baseStam: 120,
    hpPerLevel: 8, stamPerLevel: 9,
    dmgMult: 1.05, speed: 4.2,
    hasShield: false,
    skills: ['fireball', 'icenova', 'blink'],
    color: '#a48ae8',
    stats: { power: 5, speed: 2, range: 4, defense: 1 },
  },
  assassin: {
    name: 'Assassin',
    tagline: 'Fanged shadow',
    desc: 'Twin daggers, blinding speed. Slip in, shred, vanish before they can answer.',
    weaponType: 'dagger',
    startWeapon: 'rusty_daggers',
    baseHp: 46, baseStam: 105,
    hpPerLevel: 10, stamPerLevel: 6,
    dmgMult: 1.0, speed: 4.9,
    hasShield: false,
    skills: ['dashstrike', 'fanknives', 'shadowstep'],
    color: '#7a9ac8',
    stats: { power: 4, speed: 5, range: 2, defense: 2 },
  },
  berserker: {
    name: 'Berserker',
    tagline: 'Fury unchained',
    desc: 'A massive axe and a temper to match. The angrier it gets, the harder it hits.',
    weaponType: 'sword',
    startWeapon: 'battle_axe',
    baseHp: 66, baseStam: 100,
    hpPerLevel: 14, stamPerLevel: 5,
    dmgMult: 1.1, speed: 4.2,
    hasShield: false,
    skills: ['rage', 'cleave', 'leapslam'],
    color: '#d0553a',
    stats: { power: 5, speed: 3, range: 1, defense: 3 },
  },
  hunter: {
    name: 'Hunter',
    tagline: 'Wildwood tracker',
    desc: 'Bow, traps and instinct. Controls the field and picks foes off before they close in.',
    weaponType: 'bow',
    startWeapon: 'hunter_bow',
    baseHp: 44, baseStam: 110,
    hpPerLevel: 9, stamPerLevel: 7,
    dmgMult: 1.0, speed: 4.7,
    hasShield: false,
    skills: ['volley', 'snipe', 'beasttrap'],
    color: '#6aa04a',
    stats: { power: 3, speed: 4, range: 5, defense: 2 },
  },
  priest: {
    name: 'Priest',
    tagline: 'Keeper of the light',
    desc: 'Holy staff that mends wounds and smites the wicked. Frail body, radiant will.',
    weaponType: 'staff',
    startWeapon: 'holy_staff',
    baseHp: 42, baseStam: 120,
    hpPerLevel: 9, stamPerLevel: 9,
    dmgMult: 1.0, speed: 4.2,
    hasShield: false,
    skills: ['heal', 'smite', 'bless'],
    color: '#e6d488',
    stats: { power: 3, speed: 3, range: 4, defense: 3 },
  },
};

export const GENDERS = { male: 'Male', female: 'Female' };

// CUSTOMISATION. Every one of these lists was the shortest it could be and still
// technically offer a choice, which is why two heroes made ten seconds apart
// looked like the same person. Widened across the board; the mesh and face
// builders read the INDEX, so a longer list is genuinely a longer list.
export const SKIN_TONES = [
  '#fbe3c8', '#f5d9bc', '#f0c9a2', '#e8b98a', '#dcae7c', '#d9a06e',
  '#c08552', '#b07a4c', '#a06b40', '#8a5a38', '#7a5030', '#6e4428',
  '#5a3620', '#4a2c1a',
  // the palette also carries a few frankly unnatural ones, because half the
  // cast are talking foxes and a mint-green hero is not the odd one out
  '#cfe8d8', '#dcd0f0',
];

export const HAIR_STYLES = [
  'Short', 'Spiky', 'Long', 'Ponytail', 'Twin Tails', 'Bob',
  'Topknot', 'Buns', 'Braid', 'Mohawk', 'Waves', 'Bald',
  'Undercut', 'Curls', 'Bowl', 'Sidecut', 'Pigtails', 'Messy',
  'Half-Up', 'Pixie', 'Dreads', 'Wolf Cut', 'Hime', 'Afro',
];
export const BALD_STYLE = 11;

export const ACCESSORIES = [
  'None', 'Freckles', 'Blush', 'Scar', 'Glasses', 'Eyepatch',
  'Round Specs', 'Monocle', 'Warpaint', 'Beauty Mark', 'Bandage', 'Tired Eyes',
  'Star Mark', 'Whiskers',
];

export const HAIR_COLORS = [
  '#3a2a20', '#1c1c22', '#5a4030', '#7a4a22', '#a06a2a', '#c8963a',
  '#e8d8a8', '#f0e6c8', '#8a8a92', '#c8ccd4', '#b04038', '#e0704a',
  '#4a7a52', '#7fc44f', '#4a5a9a', '#5aa8e8', '#b060a8', '#f0a8c8',
  '#8a4ac8', '#2fa89a',
];

export const EYE_COLORS = [
  '#3a2e26', '#5a4432', '#2b4a6e', '#4a86c8', '#2e6640', '#5aa858',
  '#6a4a8a', '#a86ad0', '#8a3a30', '#c8922a', '#c8ccd4', '#e0507a',
];

// outfit silhouettes handled by the mesh builder
export const OUTFIT_STYLES = [
  'Tunic', 'Robe', 'Leather', 'Plate', 'Knight', 'Coat',
  'Hakama', 'Sailor', 'Poncho', 'Vestments',
];

export const OUTFIT_COLORS = [
  '#b0503f', '#d06a4a', '#3f6fb0', '#5a9ad8', '#4a9152', '#7fc44f',
  '#8a62b8', '#c08ad8', '#c8a03a', '#e8d07a', '#5a6470', '#8d9294',
  '#b8687e', '#e8a0b0', '#3a8a86', '#5ec0b0', '#7a5a3a', '#a8804c',
  '#2e3440', '#f0ece0',
];

export const CAPE_COLORS = [
  '#8a3030', '#c04a4a', '#2e4a7a', '#4a7ac0', '#3a6a3f', '#6aa858',
  '#6a4a8a', '#a06ac0', '#c89a3a', '#f0d878', '#2e3038', '#e8e0d0',
];

export function defaultCharacter() {
  return {
    name: 'Adventurer',
    cls: 'knight',
    gender: 'male',
    skin: 1,
    hairStyle: 0,
    hairColor: 0,
    eyes: 0,
    accessory: 0,
    outfitStyle: 0,
    outfit: 0,
    cape: -1, // -1 = no cape
  };
}
