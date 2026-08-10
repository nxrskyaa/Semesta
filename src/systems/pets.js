// Pet companions — five collectible critters (Pokopia-inspired, original designs).
// Summoned via pet charms found in treasure chests. Each grants a small passive
// perk while active. Pets trot along behind you with happy little bounces.
import * as THREE from 'three';
import { makeCritterFaceTexture } from '../gfx/textures.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

export const PET_DEFS = {
  moku: {
    name: 'Moku', charm: 'charm_moku', color: '#7ac86a',
    desc: 'A sprout-cat with a fresh leaf on its head. Smells like morning grass.',
    perk: { key: 'speed', value: 0.10, label: '+10% move speed' },
  },
  piko: {
    name: 'Piko', charm: 'charm_piko', color: '#f0d05a',
    desc: 'A crackling spark-pup. Its zigzag tail never stops wagging.',
    perk: { key: 'dmg', value: 0.10, label: '+10% damage' },
  },
  bubbles: {
    name: 'Bubbles', charm: 'charm_bubbles', color: '#7ab8e8',
    desc: 'A cheerful axolotl that drips everywhere. Worth it.',
    perk: { key: 'regen', value: 1.2, label: '+1.2 HP/s regen' },
  },
  cinder: {
    name: 'Cinder', charm: 'charm_cinder', color: '#f08a5a',
    desc: 'An ember-fox with a flame-tipped tail. Warm to hug, slightly singed.',
    perk: { key: 'atkSpeed', value: 0.10, label: '+10% attack speed' },
  },
  luma: {
    name: 'Luma', charm: 'charm_luma', color: '#c8a8f0',
    desc: 'A star-bunny that glows faintly at night. Naps 20 hours a day.',
    perk: { key: 'xp', value: 0.15, label: '+15% XP' },
  },
  tuff: {
    name: 'Tuff', charm: 'charm_tuff', color: '#a8a29a',
    desc: 'A pebble-turtle with a mossy shell. Slow, loyal, indestructible.',
    perk: { key: 'armor', value: 0.12, label: '-12% damage taken' },
  },
  flap: {
    name: 'Flap', charm: 'charm_flap', color: '#8a7ab8',
    desc: 'A dusk-owl who judges your aim silently. It helps anyway.',
    perk: { key: 'crit', value: 0.06, label: '+6% crit chance' },
  },
  hopps: {
    name: 'Hopps', charm: 'charm_hopps', color: '#8ac86a',
    desc: 'A meadow-frog with boundless energy. Boing. Boing. Boing.',
    perk: { key: 'stamRegen', value: 0.25, label: '+25% stamina regen' },
  },
  wooly: {
    name: 'Wooly', charm: 'charm_wooly', color: '#f0eae0',
    desc: 'A cloud-sheep, softer than any pillow. Loot drifts toward it.',
    perk: { key: 'magnet', value: 1.0, label: 'Pickup magnet x2' },
  },
  koko: {
    name: 'Koko', charm: 'charm_koko', color: '#f0c05a',
    desc: 'A coconut-chick that smells faintly of the beach. Fish adore it.',
    perk: { key: 'fish', value: 1.0, label: 'Faster fishing bites' },
  },
  // --- gacha-exclusive companions (never found in chests) ---
  glimmer: {
    name: 'Glimmer', charm: 'charm_glimmer', color: '#a8d8f0', gachaOnly: true, rarity: 'legendary',
    desc: 'GACHA EXCLUSIVE — a crystal fox grown from a living gemstone. It chimes when it trots.',
    perk: { key: 'dmg', value: 0.15, label: '+15% damage' },
  },
  nox: {
    name: 'Nox', charm: 'charm_nox', color: '#6a4a8a', gachaOnly: true, rarity: 'legendary',
    desc: 'GACHA EXCLUSIVE — a mischievous shadow imp. Mostly harmless. Mostly.',
    perk: { key: 'atkSpeed', value: 0.15, label: '+15% attack speed' },
  },
  seraphi: {
    name: 'Seraphi', charm: 'charm_seraphi', color: '#f0d8a0', gachaOnly: true, rarity: 'mythic',
    desc: 'MYTHIC — a palm-sized golden dragon whose sneezes smell of stardust.',
    perk: { key: 'xp', value: 0.30, label: '+30% XP' },
  },
  // The top of the shelf used to be ONE legendary pair and ONE mythic. A tier
  // that can only ever hand you the same companion stops being a surprise the
  // second time you reach it, so both tiers now have real spread — and each of
  // these takes a perk no other pet at its rarity carries.
  emberling: {
    name: 'Emberling', charm: 'charm_emberling', color: '#f06a3a', gachaOnly: true, rarity: 'legendary',
    desc: 'GACHA EXCLUSIVE — a molten salamander that leaves faint scorch marks on nice rugs.',
    perk: { key: 'crit', value: 0.10, label: '+10% crit chance' },
  },
  tideling: {
    name: 'Tideling', charm: 'charm_tideling', color: '#5ac8d8', gachaOnly: true, rarity: 'legendary',
    desc: 'GACHA EXCLUSIVE — a drifting moon-jelly. Weightless, unbothered, faintly humming.',
    perk: { key: 'stamRegen', value: 0.5, label: '+50% stamina regen' },
  },
  zephyr: {
    name: 'Zephyr', charm: 'charm_zephyr', color: '#c8d8f8', gachaOnly: true, rarity: 'mythic',
    desc: 'MYTHIC — a storm-swift with a tail of moving air. It arrives slightly before you do.',
    perk: { key: 'speed', value: 0.22, label: '+22% move speed' },
  },
  verdant: {
    name: 'Verdant', charm: 'charm_verdant', color: '#6ad88a', gachaOnly: true, rarity: 'mythic',
    desc: 'MYTHIC — a forest spirit shaped like a fawn made of new growth. Older than the village.',
    perk: { key: 'regen', value: 3.5, label: '+3.5 HP/s regen' },
  },
};

// ---------------------------------------------------------------------------
// pet meshes — chibi critters with big glossy faces
// ---------------------------------------------------------------------------
const faceCache = new Map();
function petFace(id, opts) {
  if (!faceCache.has(id)) faceCache.set(id, makeCritterFaceTexture(opts));
  return faceCache.get(id);
}

function basePet(bodyColor, bellyColor, faceKey, faceOpts) {
  const g = new THREE.Group();
  const fur = lam(bodyColor);
  const belly = lam(bellyColor);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.34), fur);
  body.position.y = 0.2;
  body.castShadow = true;
  const tummy = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), belly);
  tummy.position.set(0, 0.16, 0.16);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.3), fur);
  head.position.y = 0.44;
  head.castShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22),
    new THREE.MeshBasicMaterial({ map: petFace(faceKey, faceOpts), transparent: true }));
  face.position.set(0, 0.01, 0.16);
  head.add(face);

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), fur);
    leg.position.set(sx * 0.09, 0.06, 0.08);
    g.add(leg);
    const legB = leg.clone(); legB.position.z = -0.1;
    g.add(legB);
  }

  g.add(body, tummy, head);
  g.userData = { head, body };
  return { g, fur, belly, head };
}

const BUILDERS = {
  moku() {
    const { g, head } = basePet('#7ac86a', '#b8e8a8', 'moku',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,140,0.6)' });
    // cat ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06), lam('#7ac86a'));
      ear.position.set(sx * 0.11, 0.19, 0);
      head.add(ear);
    }
    // leaf sprout
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), lam('#4f9857'));
    stem.position.set(0, 0.19, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.08), lam('#66b06a'));
    leaf.position.set(0.05, 0.25, 0);
    leaf.rotation.z = 0.3;
    head.add(stem, leaf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), lam('#7ac86a'));
    tail.position.set(0, 0.26, -0.2);
    tail.rotation.x = -0.5;
    g.add(tail);
    return g;
  },
  piko() {
    const { g, head } = basePet('#f0d05a', '#f8e8a8', 'piko',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'open', cheeks: 'rgba(240,120,90,0.7)' });
    // pointed ear tufts
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), lam('#f0d05a'));
      ear.position.set(sx * 0.12, 0.2, 0);
      ear.rotation.z = -sx * 0.3;
      head.add(ear);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), lam('#8a6a2a'));
      tip.position.y = 0.08; ear.add(tip);
    }
    // zigzag tail
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), lam('#f0d05a'));
    t1.position.set(0, 0.28, -0.2); t1.rotation.x = -0.7;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), lam('#f8e8a8'));
    t2.position.set(0, 0.07, 0); t2.rotation.x = 1.2; t1.add(t2);
    g.add(t1);
    return g;
  },
  bubbles() {
    const { g, head } = basePet('#7ab8e8', '#c8e4f5', 'bubbles',
      { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'open', cheeks: 'rgba(230,140,160,0.7)' });
    // axolotl gill frills
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const frill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), lam('#e890ac'));
        frill.position.set(sx * (0.19 + i * 0.015), 0.1 - i * 0.06, 0.02 - i * 0.03);
        frill.rotation.z = sx * (0.4 + i * 0.3);
        head.add(frill);
      }
    }
    // flat tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16), lam('#a8d0f0'));
    fin.position.set(0, 0.22, -0.24);
    g.add(fin);
    return g;
  },
  cinder() {
    const { g, head } = basePet('#f08a5a', '#f8c8a8', 'cinder',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(200,80,60,0.5)' });
    // fox ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.05), lam('#f08a5a'));
      ear.position.set(sx * 0.12, 0.2, -0.02);
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), lam('#f8c8a8'));
      inner.position.set(0, -0.01, 0.03); ear.add(inner);
    }
    // fluffy tail with flame tip
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), lam('#f08a5a'));
    tail.position.set(0, 0.28, -0.26);
    tail.rotation.x = -0.4;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffdd55 }));
    tip.position.set(0, 0.04, -0.12); tail.add(tip);
    g.add(tail);
    return g;
  },
  luma() {
    const { g, head } = basePet('#c8a8f0', '#e8dcf8', 'luma',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile', cheeks: 'rgba(240,150,180,0.6)' });
    // long bunny ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.05), lam('#c8a8f0'));
      ear.position.set(sx * 0.09, 0.28, 0);
      ear.rotation.z = -sx * 0.1;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.02), lam('#e8dcf8'));
      inner.position.set(0, 0, 0.03); ear.add(inner);
    }
    // star on forehead
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    star.position.set(0, 0.1, 0.16);
    star.rotation.z = Math.PI / 4;
    head.add(star);
    // soft glow
    const glow = new THREE.PointLight(0xc8a8f0, 0.8, 3, 2);
    glow.position.y = 0.4;
    g.add(glow);
    return g;
  },
  tuff() {
    const { g, head } = basePet('#a8a29a', '#c8c2ba', 'tuff',
      { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile' });
    // mossy dome shell
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), lam('#8a8a7a'));
    shell.position.set(0, 0.3, -0.08);
    shell.scale.set(1, 0.7, 1.1);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.14), lam('#568a42'));
    moss.position.set(0.04, 0.42, -0.1);
    g.add(shell, moss);
    head.position.z = 0.12;
    return g;
  },
  flap() {
    const { g, head } = basePet('#8a7ab8', '#b8aad8', 'flap',
      { eyeW: 4, eyeH: 5, gap: 3, eyeY: 1, mouth: 'none' });
    // ear tufts + tiny beak + folded wings
    for (const sx of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), lam('#6a5a98'));
      tuft.position.set(sx * 0.13, 0.2, 0);
      tuft.rotation.z = -sx * 0.35;
      head.add(tuft);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.22), lam('#6a5a98'));
      wing.position.set(sx * 0.18, 0.22, -0.02);
      g.add(wing);
    }
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.07), lam('#e8a33d'));
    beak.position.set(0, -0.06, 0.17);
    head.add(beak);
    return g;
  },
  hopps() {
    const { g, head } = basePet('#8ac86a', '#c8e8a8', 'hopps',
      { eyeW: 3, eyeH: 4, gap: 6, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,150,140,0.5)' });
    // bulgy eye bumps on top + big springy back legs
    for (const sx of [-1, 1]) {
      const bump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.1), lam('#8ac86a'));
      bump.position.set(sx * 0.11, 0.17, 0.04);
      head.add(bump);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.2), lam('#6aa84f'));
      leg.position.set(sx * 0.16, 0.08, -0.08);
      g.add(leg);
    }
    return g;
  },
  wooly() {
    const { g, head } = basePet('#f0eae0', '#ffffff', 'wooly',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile', cheeks: 'rgba(240,150,160,0.5)' });
    // fluffy cloud lumps all over
    for (const [dx, dy, dz, s] of [[-0.12, 0.32, -0.1, 0.14], [0.12, 0.3, -0.05, 0.13], [0, 0.36, -0.15, 0.15], [-0.08, 0.26, 0.1, 0.11], [0.1, 0.26, 0.08, 0.1]]) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), lam('#ffffff'));
      puff.position.set(dx, dy, dz);
      g.add(puff);
    }
    // wool cap on the head
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), lam('#ffffff'));
    cap.position.set(0, 0.16, -0.02);
    head.add(cap);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), lam('#d8c8b8'));
    earL.position.set(-0.18, 0.04, 0); head.add(earL);
    const earR = earL.clone(); earR.position.x = 0.18; head.add(earR);
    return g;
  },
  koko() {
    const { g, head } = basePet('#f0c05a', '#f8e0a8', 'koko',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'none', cheeks: 'rgba(240,130,90,0.6)' });
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.09), lam('#e8834a'));
    beak.position.set(0, -0.04, 0.17);
    head.add(beak);
    // coconut-husk cap
    const capBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.24), lam('#8a6a48'));
    capBase.position.set(0, 0.17, 0);
    const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.15), lam('#6e5438'));
    capTop.position.set(0, 0.24, 0);
    head.add(capBase, capTop);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.18), lam('#f8e0a8'));
      wing.position.set(sx * 0.17, 0.2, 0);
      g.add(wing);
    }
    return g;
  },
  glimmer() {
    const { g, head } = basePet('#a8d8f0', '#e0f2fc', 'glimmer',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(160,200,240,0.6)' });
    // crystal fox: pointed ears + gem shards growing from back & brow
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), lam('#a8d8f0'));
      ear.position.set(sx * 0.11, 0.22, -0.02);
      head.add(ear);
    }
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.9 });
    for (const [dx, dy, dz, s] of [[0, 0.36, -0.12, 0.09], [-0.1, 0.32, -0.02, 0.06], [0.1, 0.3, -0.08, 0.07]]) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(s), shardMat);
      shard.position.set(dx, dy, dz);
      shard.rotation.set(dx * 3, dy * 2, dz);
      g.add(shard);
    }
    const brow = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), shardMat);
    brow.position.set(0, 0.14, 0.14); head.add(brow);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 5), lam('#cfeaf8'));
    tail.position.set(0, 0.28, -0.24); tail.rotation.x = -1.0;
    const glow = new THREE.PointLight(0xa8d8f0, 0.9, 3, 2);
    glow.position.y = 0.35;
    g.add(tail, glow);
    return g;
  },
  nox() {
    const { g, head } = basePet('#4a3a66', '#6a4a8a', 'nox',
      { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, eye: '#ffd24a', mouth: 'fang' });
    // shadow imp: curved horns, bat winglets, glowing eyes, wispy tail
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), lam('#2c2440'));
      horn.position.set(sx * 0.11, 0.2, 0);
      horn.rotation.z = -sx * 0.5;
      head.add(horn);
      const wingM = new THREE.Mesh(new THREE.CircleGeometry(0.12, 3),
        new THREE.MeshLambertMaterial({ color: 0x38294e, side: THREE.DoubleSide }));
      wingM.position.set(sx * 0.18, 0.28, -0.1);
      wingM.rotation.y = sx * 0.7;
      g.add(wingM);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 4), lam('#38294e'));
    tail.position.set(0, 0.26, -0.22); tail.rotation.x = -1.1;
    const glow = new THREE.PointLight(0x8a5ae8, 0.8, 3, 2);
    glow.position.y = 0.35;
    g.add(tail, glow);
    return g;
  },
  seraphi() {
    const { g, head } = basePet('#f0d8a0', '#faecc8', 'seraphi',
      { eyeW: 3, eyeH: 5, gap: 4, eyeY: 1, mouth: 'smile', cheeks: 'rgba(240,170,120,0.6)' });
    // tiny golden dragon: snout, horns, wings, flame-tip tail, star sparkle
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1), lam('#faecc8'));
    snout.position.set(0, -0.06, 0.18); head.add(snout);
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), lam('#e8c24a'));
      horn.position.set(sx * 0.09, 0.2, -0.04);
      horn.rotation.z = -sx * 0.35;
      head.add(horn);
      const wingM = new THREE.Mesh(new THREE.CircleGeometry(0.17, 8),
        new THREE.MeshLambertMaterial({ color: 0xf5e0b0, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
      wingM.position.set(sx * 0.19, 0.32, -0.08);
      wingM.rotation.y = sx * 0.6;
      wingM.scale.set(1, 1.4, 1);
      g.add(wingM);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), lam('#f0d8a0'));
    tail.position.set(0, 0.26, -0.24); tail.rotation.x = -1.0;
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.05),
      new THREE.MeshBasicMaterial({ color: 0xffb055 }));
    flame.position.set(0, 0.36, -0.36);
    const glow = new THREE.PointLight(0xffd88a, 1.1, 3.5, 2);
    glow.position.y = 0.4;
    g.add(tail, flame, glow);
    return g;
  },

  // --- the wider top shelf. Each one is given a silhouette no other pet has,
  // because "which legendary is that?" should be answerable across a field.
  emberling() {
    const { g, head } = basePet('#e0562a', '#ffb07a', 'emberling',
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 1, mouth: 'smile', cheeks: 'rgba(255,180,120,0.7)' });
    // a salamander: low crest down the spine, cracked-magma back, hot tail
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11 - i * 0.015, 3),
        new THREE.MeshBasicMaterial({ color: 0xffb055 }));
      fin.position.set(0, 0.34, 0.08 - i * 0.09);
      fin.rotation.x = -0.2;
      g.add(fin);
    }
    // magma cracks: three bright bars across the back
    for (let i = 0; i < 3; i++) {
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.03),
        new THREE.MeshBasicMaterial({ color: 0xffd06a }));
      crack.position.set(0, 0.325, 0.06 - i * 0.1);
      g.add(crack);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), lam('#c4441e'));
    tail.position.set(0, 0.2, -0.28); tail.rotation.x = 1.4;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.06),
      new THREE.MeshBasicMaterial({ color: 0xffa03a }));
    tip.position.set(0, 0.22, -0.44);
    const glow = new THREE.PointLight(0xff8a3a, 1.0, 3.2, 2);
    glow.position.set(0, 0.28, -0.3);
    g.add(tail, tip, glow);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), lam('#ffb07a')))
      .position.set(0, -0.07, 0.17);
    return g;
  },

  tideling() {
    // A jelly is not a quadruped, so this one does NOT use basePet — the whole
    // point is that it has no legs and floats.
    const g = new THREE.Group();
    const jelly = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#5ac8d8'), transparent: true, opacity: 0.72,
    });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), jelly);
    bell.position.y = 0.5;
    bell.scale.y = 0.9;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.02, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0xa8f0ff }));
    rim.position.y = 0.43; rim.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.18),
      new THREE.MeshBasicMaterial({
        map: petFace('tideling', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 0, mouth: 'smile' }),
        transparent: true,
      }));
    face.position.set(0, 0.46, 0.2);
    g.add(bell, rim, face);
    // trailing tentacles, each a little different length so they read as loose
    const tentacles = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const len = 0.2 + (i % 3) * 0.07;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.006, len, 4), jelly);
      t.position.set(Math.cos(a) * 0.13, 0.44 - len / 2, Math.sin(a) * 0.13);
      g.add(t);
      tentacles.push(t);
    }
    const glow = new THREE.PointLight(0x6ad8f0, 0.9, 3.4, 2);
    glow.position.y = 0.48;
    g.add(glow);
    g.userData = { head: bell, body: bell, tentacles, floats: true };
    return g;
  },

  zephyr() {
    const { g, head } = basePet('#dae6fb', '#ffffff', 'zephyr',
      { eyeW: 3, eyeH: 4, gap: 5, eyeY: 0, mouth: 'smile' });
    // a swift: swept-back wings, a forked tail and a beak, all pale
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.2, 3),
        new THREE.MeshLambertMaterial({
          color: 0xeaf2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9,
        }));
      wing.position.set(sx * 0.2, 0.3, -0.04);
      wing.rotation.set(0.2, sx * 0.9, sx * -0.5);
      wing.scale.set(1, 0.7, 1);
      g.add(wing);
      const fork = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 3), lam('#c2d6f2'));
      fork.position.set(sx * 0.06, 0.2, -0.3);
      fork.rotation.set(1.5, 0, sx * 0.3);
      g.add(fork);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), lam('#f2c86a'));
    beak.position.set(0, -0.03, 0.2); beak.rotation.x = Math.PI / 2;
    head.add(beak);
    // three rings of moving air trailing it
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.03, 0.008, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.5 - i * 0.12 }));
      ring.position.set(0, 0.26, -0.24 - i * 0.1);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    const glow = new THREE.PointLight(0xbcd8ff, 0.8, 3.0, 2);
    glow.position.y = 0.42;
    g.add(glow);
    return g;
  },

  verdant() {
    const { g, head } = basePet('#4f8a52', '#a8d8a0', 'verdant',
      { eyeW: 3, eyeH: 5, gap: 4, eyeY: 1, mouth: 'smile' });
    // a fawn made of new growth: branching antlers with leaves, moss flank,
    // and small blossoms that catch the light
    for (const sx of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.26, 5), lam('#8a6a44'));
      beam.position.set(sx * 0.1, 0.66, -0.02);
      beam.rotation.z = -sx * 0.34;
      g.add(beam);
      for (let i = 0; i < 3; i++) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.12, 4), lam('#8a6a44'));
        tine.position.set(sx * (0.15 + i * 0.03), 0.7 + i * 0.07, -0.02);
        tine.rotation.z = -sx * 0.9;
        g.add(tine);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), lam('#7ad86a'));
        leaf.position.set(sx * (0.19 + i * 0.03), 0.76 + i * 0.07, -0.02);
        leaf.scale.set(1, 0.6, 1.3);
        g.add(leaf);
      }
      const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(0.035),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      bloom.position.set(sx * 0.13, 0.62, 0.02);
      g.add(bloom);
    }
    // moss along the back
    for (let i = 0; i < 4; i++) {
      const moss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), lam('#6ab85a'));
      moss.position.set((i % 2 ? 0.06 : -0.06), 0.33, 0.1 - i * 0.08);
      moss.scale.y = 0.6;
      g.add(moss);
    }
    const glow = new THREE.PointLight(0x9ae88a, 0.85, 3.2, 2);
    glow.position.y = 0.6;
    g.add(glow);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), lam('#a8d8a0')))
      .position.set(0, -0.07, 0.17);
    return g;
  },
};

// Exported so OTHER players' pets can be built too — a companion only its owner
// can see is not a companion in a shared world.
export const PET_BUILDERS = BUILDERS;

// ---------------------------------------------------------------------------
// pet runtime — follows the player with a springy trot
// ---------------------------------------------------------------------------
// FETCHING. Every pet does this, not one special breed of them.
//
// The complaint that started it was fair: a pet was a mesh that trotted behind
// you and a number in a tooltip. Nothing it did was ever visible. Now the one
// thing they ALL do is the thing you actually want a companion for — they run
// out to whatever a monster dropped, pick it up, and bring it back.
//
// It has to read as fetching rather than as a wider pickup radius, so the pet
// genuinely leaves your side, the drop genuinely travels to the pet, and the
// pet genuinely comes back before you get the item.
const FETCH_R = 13;          // how far a pet will range for a drop
const FETCH_GRAB = 0.75;     // close enough to have it in its mouth
const FETCH_SPEED = 8.5;     // faster than the heel trot: it is excited

export function createPets(scene, terrain, particles) {
  const state = {
    active: null, mesh: null, anim: 0,
    fetch: null,          // the drop being fetched
    carrying: null,       // { id, count } in its mouth, on the way back
    cooldown: 0,
  };

  function summon(petId, playerPos) {
    dismiss();
    if (!petId || !PET_DEFS[petId]) return false;
    state.active = petId;
    state.mesh = BUILDERS[petId]();
    state.mesh.position.set(playerPos.x - 0.8, playerPos.y, playerPos.z - 0.8);
    scene.add(state.mesh);
    particles.fountain(state.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)), PET_DEFS[petId].color, 14);
    return true;
  }

  function dismiss() {
    // a dismissed pet must not hold a claim on a drop it will never reach
    if (state.fetch) state.fetch.claimed = false;
    state.fetch = null;
    state.carrying = null;
    if (state.mesh) {
      particles.burst(state.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffffff', 8, 1.5);
      scene.remove(state.mesh);
    }
    state.active = null;
    state.mesh = null;
  }

  /**
   * @param loot optional { nearestFree, collect } from pickups.js. Without it a
   *   pet just heels, which is what happens on the character-preview canvas.
   * @param onFetched called with (id, count) when the pet delivers.
   */
  function update(dt, playerState, time, loot = null, onFetched = null) {
    if (!state.mesh) return;
    state.anim += dt;
    const p = state.mesh.position;
    const pp = playerState.pos;
    state.cooldown = Math.max(0, state.cooldown - dt);

    // ---- FETCH. Runs before the heel logic, because a pet on a job is not
    // heeling. A pet that is carrying something is on its way back to you.
    if (loot && !playerState.dead) {
      // pick a job
      if (!state.fetch && !state.carrying && state.cooldown <= 0) {
        const it = loot.nearestFree(pp.x, pp.z, FETCH_R);
        if (it) { it.claimed = true; state.fetch = it; }
      }
      // the claimed drop may have been walked over by the player first
      if (state.fetch && !loot.items.includes(state.fetch)) state.fetch = null;

      if (state.fetch) {
        const t = state.fetch.spr.position;
        const gx = t.x - p.x, gz = t.z - p.z;
        const gd = Math.hypot(gx, gz) || 1;
        if (gd > FETCH_GRAB) {
          p.x += (gx / gd) * FETCH_SPEED * dt;
          p.z += (gz / gd) * FETCH_SPEED * dt;
          state.mesh.rotation.y = Math.atan2(gx, gz);
          p.y = terrain.surfaceY(p.x, p.z) + Math.abs(Math.sin(state.anim * 13)) * 0.11;
          return;
        }
        // got it: the drop goes into its mouth and it turns for home
        state.carrying = { id: state.fetch.id, count: state.fetch.count };
        loot.collect(state.fetch, null);      // off the ground, NOT into the bag yet
        state.fetch = null;
        particles.burst(p.clone().add(new THREE.Vector3(0, 0.35, 0)),
          PET_DEFS[state.active].color, 5, 1.6);
      }
    }

    // DELIVERY. Carrying something means running back to the player rather than
    // to the heel spot, and handing it over on arrival.
    if (state.carrying) {
      const hx = pp.x - p.x, hz = pp.z - p.z;
      const hd = Math.hypot(hx, hz) || 1;
      if (hd > 1.1) {
        p.x += (hx / hd) * FETCH_SPEED * dt;
        p.z += (hz / hd) * FETCH_SPEED * dt;
        state.mesh.rotation.y = Math.atan2(hx, hz);
        p.y = terrain.surfaceY(p.x, p.z) + Math.abs(Math.sin(state.anim * 13)) * 0.11;
        // a little sparkle trailing the thing in its mouth
        if (Math.random() < dt * 8) {
          particles.burst(p.clone().add(new THREE.Vector3(0, 0.45, 0)), '#ffe9a8', 1, 0.6);
        }
        return;
      }
      onFetched?.(state.carrying.id, state.carrying.count);
      particles.fountain(p.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffe9a8', 8);
      state.carrying = null;
      state.cooldown = 0.25;          // a beat before it goes again
    }

    // ---- HEEL. Only reached when the pet has no job on: behind and beside you.
    const f = playerState.facing;
    const tx = pp.x - Math.sin(f) * 0.9 - Math.cos(f) * 0.35;
    const tz = pp.z - Math.cos(f) * 0.9 + Math.sin(f) * 0.35;
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);

    if (d > 12) { // too far behind — pop over
      p.set(tx, terrain.surfaceY(tx, tz), tz);
      particles.burst(p.clone().add(new THREE.Vector3(0, 0.3, 0)), PET_DEFS[state.active].color, 6, 1.5);
      return;
    }
    if (d > 0.25) {
      const sp = Math.min(7, 2.2 + d * 2.2);
      p.x += (dx / d) * sp * dt;
      p.z += (dz / d) * sp * dt;
      state.mesh.rotation.y = Math.atan2(dx, dz);
      // trot bounce
      p.y = terrain.surfaceY(p.x, p.z) + Math.abs(Math.sin(state.anim * 10)) * 0.08;
    } else {
      // idle: sit & bob
      p.y = terrain.surfaceY(p.x, p.z);
      const u = state.mesh.userData;
      if (u.head) u.head.position.y = 0.44 + Math.sin(state.anim * 2.6) * 0.02;
      if (Math.random() < dt * 0.15) { // occasional happy hop
        p.y += 0.001; // noop-ish; the bounce below sells it
      }
    }
  }

  function serialize() { return { active: state.active }; }

  return { state, PET_DEFS, summon, dismiss, update, serialize };
}
