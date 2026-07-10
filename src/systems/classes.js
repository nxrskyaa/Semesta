// Definisi class ala MMO: stat dasar, tipe senjata, dan 3 skill per class.

export const CLASSES = {
  ksatria: {
    name: 'Ksatria',
    tagline: 'Benteng garis depan',
    desc: 'Pedang besar & perisai. Tahan pukul, ayunan lebar. Bisa menahan serangan dengan Shift.',
    weaponType: 'sword',
    startWeapon: 'wooden_sword',
    baseHp: 60, baseStam: 100,
    hpPerLevel: 13, stamPerLevel: 5,
    dmgMult: 1.0, speed: 4.1,
    hasShield: true,
    skills: ['bash', 'whirlwind', 'warcry'],
    color: '#c76b4a',
  },
  pemanah: {
    name: 'Pemanah',
    tagline: 'Mata elang hutan',
    desc: 'Busur jarak jauh. Lincah, serang dari kejauhan sebelum musuh sempat mendekat.',
    weaponType: 'bow',
    startWeapon: 'short_bow',
    baseHp: 42, baseStam: 110,
    hpPerLevel: 9, stamPerLevel: 7,
    dmgMult: 1.0, speed: 4.6,
    hasShield: false,
    skills: ['powershot', 'multishot', 'swiftness'],
    color: '#6fa05a',
  },
  penyihir: {
    name: 'Penyihir',
    tagline: 'Pengendali elemen',
    desc: 'Tongkat sihir dengan bolt meledak. Rapuh tapi damage area paling dahsyat.',
    weaponType: 'staff',
    startWeapon: 'apprentice_staff',
    baseHp: 38, baseStam: 120,
    hpPerLevel: 8, stamPerLevel: 9,
    dmgMult: 1.05, speed: 4.2,
    hasShield: false,
    skills: ['fireball', 'icenova', 'blink'],
    color: '#7a6fd0',
  },
  pembunuh: {
    name: 'Pembunuh',
    tagline: 'Bayangan bertaring',
    desc: 'Sepasang belati super cepat. Masuk, cabik, menghilang sebelum dibalas.',
    weaponType: 'dagger',
    startWeapon: 'rusty_daggers',
    baseHp: 46, baseStam: 105,
    hpPerLevel: 10, stamPerLevel: 6,
    dmgMult: 1.0, speed: 4.9,
    hasShield: false,
    skills: ['dashstrike', 'fanknives', 'shadowstep'],
    color: '#5a6a7a',
  },
};

export const GENDERS = { male: 'Pria', female: 'Wanita' };

export const SKIN_TONES = ['#e8b98a', '#d9a06e', '#c08552', '#8a5a38', '#f0cba6'];
export const HAIR_STYLES = ['Pendek', 'Jabrik', 'Panjang', 'Kuncir', 'Plontos'];
export const HAIR_COLORS = ['#3a2a20', '#1c1c22', '#7a4a22', '#b8862f', '#8a8a92', '#a83a3a'];
export const OUTFIT_COLORS = ['#8a4038', '#3a5a8a', '#3f7345', '#7a5a9a', '#8a7430', '#4a4a52'];

export function defaultCharacter() {
  return {
    name: 'Petualang',
    cls: 'ksatria',
    gender: 'male',
    skin: 0,
    hairStyle: 0,
    hairColor: 0,
    outfit: 0,
  };
}
