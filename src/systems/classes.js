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
};

export const GENDERS = { male: 'Male', female: 'Female' };

export const SKIN_TONES = [
  '#f0c9a2', '#e8b98a', '#d9a06e', '#c08552',
  '#a06b40', '#8a5a38', '#6e4428', '#f5d9bc',
];

export const HAIR_STYLES = [
  'Short', 'Spiky', 'Long', 'Ponytail', 'Twin Tails', 'Bob',
  'Topknot', 'Buns', 'Braid', 'Mohawk', 'Waves', 'Bald',
];
export const BALD_STYLE = 11;

export const ACCESSORIES = ['None', 'Freckles', 'Blush', 'Scar', 'Glasses', 'Eyepatch'];

export const HAIR_COLORS = [
  '#3a2a20', '#1c1c22', '#7a4a22', '#c8963a', '#e8d8a8',
  '#8a8a92', '#b04038', '#4a7a52', '#4a5a9a', '#b060a8',
];

export const EYE_COLORS = [
  '#3a2e26', '#2b4a6e', '#2e6640', '#6a4a8a', '#8a3a30', '#c8922a',
];

// outfit silhouettes handled by the mesh builder
export const OUTFIT_STYLES = ['Tunic', 'Robe', 'Leather', 'Plate'];

export const OUTFIT_COLORS = [
  '#b0503f', '#3f6fb0', '#4a9152', '#8a62b8', '#c8a03a',
  '#5a6470', '#b8687e', '#3a8a86', '#7a5a3a', '#2e3440',
];

export const CAPE_COLORS = ['#8a3030', '#2e4a7a', '#3a6a3f', '#6a4a8a', '#c89a3a', '#2e3038'];

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
