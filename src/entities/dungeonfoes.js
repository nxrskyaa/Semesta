// WHAT LIVES IN THE HOLLOW.
//
// Six species and six bosses that exist NOWHERE above ground. That exclusivity
// is most of the point: if the dungeon were stocked with re-tinted Slimes then
// going down would be the overworld with worse lighting, and nobody would make
// the trip twice.
//
// Anavela's monsters are cute on purpose — big glossy eyes, round bodies, an
// animal you could imagine keeping. The Hollow's are built from the SAME
// vocabulary and then bent: the eyes are still big, but there are too many of
// them, or only one, or they are set in something that should not have a face.
// Cute-wrong reads as far more unsettling than a generic skull would, and it
// keeps the game looking like itself all the way down.
//
// THE BOSSES ARE THEIR MECHANICS. Three phases each, every phase a telegraphed
// pattern with a tell you can read and an answer you can perform. A boss with
// four times the health and the same swing is not a boss, it is a wait — that
// lesson is already written into WORLD_BOSSES above and this file follows it.
// The `move` names below are handled by main.js's `onSpecial`, so a boss's
// script is data here and never a special case in the loop.

import * as THREE from 'three';
import { sharedBox, sharedCyl, sharedSphere } from '../gfx/meshcache.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';

// THIS FILE DELIBERATELY DOES NOT IMPORT FROM enemies.js.
//
// enemies.js merges these tables into its own, so importing back the other way
// would make the two modules a cycle — and a cycle here is not theoretical. If
// anything ever loaded dungeonfoes.js first, enemies.js would run its top-level
// `const BUILDERS = { ...DUNGEON_BUILDERS }` while this module was still
// initialising, read a `const` in its temporal dead zone, and throw during
// import with a stack that points nowhere near the cause. TDZ has bitten this
// codebase five times already.
//
// The price of avoiding it is these three helpers, which are three lines each.
// That is a very cheap way to buy a dependency arrow that only points one way.
const faceTexCache = new Map();
const critterFace = (key, opts) => {
  if (!faceTexCache.has(key)) faceTexCache.set(key, makeCritterFaceTexture(opts));
  return faceTexCache.get(key);
};
const lam = (color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...opts });
const facePlane = (key, opts, w = 0.6, h = 0.45) => new THREE.Mesh(
  new THREE.PlaneGeometry(w, h),
  new THREE.MeshBasicMaterial({ map: critterFace(key, opts), transparent: true }));

// ---------------------------------------------------------------------------
// SPECIES
//
// `dungeonOnly: true` keeps them out of the overworld spawner entirely, and
// `weight: 0` means the ambient roll can never pick them even if that guard
// were ever missed. Belt and braces, because a Gloomling wandering past the
// village would give away the ending of a place you have not found yet.
// ---------------------------------------------------------------------------
export const DUNGEON_TYPES = {
  // -- STONE HALLS: what the Lanternkeepers left, and what moved in after ----
  gloomling: {
    name: 'Gloomling', hp: 30, dmg: 9, speed: 2.0, xp: 26, aggro: 6.5, attackRange: 1.1,
    attackCd: 1.3, weight: 0, behavior: 'melee', dungeonOnly: true, band: 'stone',
    floats: true,
  },
  lampwright: {
    name: 'Lampwright', hp: 46, dmg: 11, speed: 1.1, xp: 34, aggro: 7.0, attackRange: 7.0,
    attackCd: 2.2, weight: 0, behavior: 'ranged', keepDist: 5.5, dungeonOnly: true,
    band: 'stone',
  },
  // -- FROST CRYPT: the cold kept things that should have finished dying -----
  rimefang: {
    name: 'Rimefang', hp: 38, dmg: 14, speed: 3.0, xp: 40, aggro: 7.5, attackRange: 1.2,
    attackCd: 1.1, weight: 0, behavior: 'charge', dungeonOnly: true, band: 'frost',
  },
  hollowchoir: {
    name: 'Hollow Choir', hp: 52, dmg: 12, speed: 1.4, xp: 46, aggro: 8.0, attackRange: 8.0,
    attackCd: 2.6, weight: 0, behavior: 'ranged', keepDist: 6.5, dungeonOnly: true,
    band: 'frost', floats: true,
  },
  // -- EMBER CORE: whatever is still burning down here, and its keepers ------
  cinderhound: {
    name: 'Cinderhound', hp: 58, dmg: 18, speed: 3.3, xp: 62, aggro: 9.0, attackRange: 1.3,
    attackCd: 1.0, weight: 0, behavior: 'charge', dungeonOnly: true, band: 'ember',
  },
  slagmaw: {
    name: 'Slagmaw', hp: 120, dmg: 22, speed: 0.8, xp: 88, aggro: 6.0, attackRange: 1.8,
    attackCd: 2.0, weight: 0, behavior: 'melee', dungeonOnly: true, band: 'ember',
  },
};

/** Which species stock a band's ordinary halls. */
export const BAND_SPECIES = {
  stone: ['gloomling', 'lampwright', 'gloomling'],
  frost: ['rimefang', 'hollowchoir', 'rimefang'],
  ember: ['cinderhound', 'slagmaw', 'cinderhound'],
};

// ---------------------------------------------------------------------------
// MESHES
// ---------------------------------------------------------------------------

/** A lump of dark with two frightened-looking eyes. Drifts, does not walk. */
function buildGloomling() {
  const g = new THREE.Group();
  const skin = lam('#2b2438');
  const body = new THREE.Mesh(sharedSphere(0.38, 8, 6), skin);
  body.position.y = 0.55;
  body.scale.set(1, 0.86, 1);
  body.castShadow = true;
  // ragged tatters underneath instead of legs — nothing down here walks well
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const rag = new THREE.Mesh(sharedBox(0.1, 0.3 + (i % 2) * 0.14, 0.09), lam('#1d1828'));
    rag.position.set(Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2);
    g.add(rag);
  }
  const face = facePlane('gloomling',
    { eyeW: 4, eyeH: 6, gap: 4, eyeY: 1, eye: '#ffd98a', mouth: 'w', cheeks: 'rgba(255,190,120,0.25)' },
    0.42, 0.32);
  face.position.set(0, 0.58, 0.36);
  g.add(body, face);
  g.userData.body = body;
  return g;
}

/** A dead Lanternkeeper lamp that learned to carry itself. Fires cold sparks. */
function buildLampwright() {
  const g = new THREE.Group();
  const iron = lam('#4a4436');
  const post = new THREE.Mesh(sharedCyl(0.09, 0.13, 0.9, 6), iron);
  post.position.y = 0.45;
  const box = new THREE.Mesh(sharedBox(0.42, 0.44, 0.42), iron);
  box.position.y = 1.12;
  box.castShadow = true;
  // the pane still glows, and that glow IS its face
  const pane = new THREE.Mesh(sharedBox(0.34, 0.36, 0.34),
    lam('#ffcb6a', { transparent: true, opacity: 0.55 }));
  pane.position.y = 1.12;
  const cap = new THREE.Mesh(sharedCyl(0.02, 0.32, 0.22, 4), iron);
  cap.position.y = 1.42;
  const face = facePlane('lampwright',
    { eyeW: 3, eyeH: 3, gap: 6, eyeY: 2, eye: '#3a2a10', mouth: 'flat' }, 0.3, 0.24);
  face.position.set(0, 1.12, 0.23);
  // three spindly legs, so it reads as a lamp that should not be moving
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(sharedBox(0.06, 0.42, 0.06), iron);
    leg.position.set(Math.cos(a) * 0.16, 0.21, Math.sin(a) * 0.16);
    leg.rotation.z = Math.cos(a) * 0.3;
    leg.rotation.x = -Math.sin(a) * 0.3;
    g.add(leg);
  }
  g.add(post, box, pane, cap, face);
  g.userData.body = box;
  return g;
}

/** All jaw and no patience. Runs you down on four thin legs. */
function buildRimefang() {
  const g = new THREE.Group();
  const hide = lam('#8fb6cc');
  const deep = lam('#5d7f96');
  const body = new THREE.Mesh(sharedBox(0.42, 0.34, 0.72), hide);
  body.position.y = 0.44;
  body.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.4, 0.32, 0.4), hide);
  head.position.set(0, 0.56, 0.44);
  // the jaw is the silhouette: a wide underbite of ice teeth
  const jaw = new THREE.Mesh(sharedBox(0.44, 0.14, 0.3), deep);
  jaw.position.set(0, 0.4, 0.5);
  const ice = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), ice);
    t.position.set(-0.16 + i * 0.08, 0.47, 0.6);
    t.rotation.x = Math.PI;
    g.add(t);
  }
  // a crest of shards down the spine
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22 - i * 0.03, 4), ice);
    s.position.set(0, 0.64, 0.2 - i * 0.19);
    g.add(s);
  }
  const face = facePlane('rimefang',
    { eyeW: 4, eyeH: 3, gap: 5, eyeY: 0, eye: '#e8feff', mouth: 'flat' }, 0.36, 0.24);
  face.position.set(0, 0.62, 0.65);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(sharedBox(0.09, 0.3, 0.09), deep);
    leg.position.set(sx * 0.16, 0.15, sz * 0.24);
    g.add(leg);
  }
  g.add(body, head, jaw, face);
  g.userData.body = body;
  return g;
}

/** A floating ring of small singing faces. Too many eyes, all of them polite. */
function buildHollowChoir() {
  const g = new THREE.Group();
  const robe = lam('#3d4a62');
  const core = new THREE.Mesh(sharedSphere(0.3, 8, 6), lam('#9fd0ff', { transparent: true, opacity: 0.6 }));
  core.position.y = 0.9;
  core.castShadow = true;
  g.add(core);
  // five little hooded singers orbiting the core, each with its own face
  const ring = new THREE.Group();
  ring.position.y = 0.9;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.Group();
    const hood = new THREE.Mesh(sharedBox(0.2, 0.26, 0.18), robe);
    const f = facePlane(`choir${i}`,
      { eyeW: 3, eyeH: 4, gap: 4, eyeY: 1, eye: '#cfeaff', mouth: 'o' }, 0.18, 0.14);
    f.position.z = 0.1;
    s.add(hood, f);
    s.position.set(Math.cos(a) * 0.52, Math.sin(i * 1.7) * 0.14, Math.sin(a) * 0.52);
    s.rotation.y = -a + Math.PI / 2;
    ring.add(s);
  }
  ring.userData.dynamic = true;
  g.add(ring);
  const skirt = new THREE.Mesh(sharedCyl(0.08, 0.34, 0.5, 7), robe);
  skirt.position.y = 0.42;
  g.add(skirt);
  g.userData.body = core;
  g.userData.ring = ring;
  return g;
}

/** Lean, fast, and cracked open down the flanks with fire showing through. */
function buildCinderhound() {
  const g = new THREE.Group();
  const coal = lam('#2e1c18');
  const body = new THREE.Mesh(sharedBox(0.44, 0.36, 0.8), coal);
  body.position.y = 0.5;
  body.castShadow = true;
  const head = new THREE.Mesh(sharedBox(0.38, 0.34, 0.42), coal);
  head.position.set(0, 0.64, 0.5);
  // molten seams: additive strips down both flanks
  const emberMat = new THREE.MeshBasicMaterial({
    color: 0xff8a3c, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const seam = new THREE.Mesh(sharedBox(0.03, 0.16 + i * 0.04, 0.2), emberMat);
    seam.position.set(sx * 0.23, 0.5, 0.22 - i * 0.22);
    g.add(seam);
  }
  // a mane of flame tongues along the neck
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3 - i * 0.04, 5), emberMat);
    t.position.set(0, 0.78, 0.34 - i * 0.16);
    g.add(t);
  }
  const face = facePlane('cinderhound',
    { eyeW: 4, eyeH: 4, gap: 5, eyeY: 1, eye: '#ffe27a', mouth: 'w', cheeks: 'rgba(255,120,50,0.5)' },
    0.34, 0.26);
  face.position.set(0, 0.66, 0.72);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(sharedBox(0.1, 0.34, 0.1), coal);
    leg.position.set(sx * 0.17, 0.17, sz * 0.28);
    g.add(leg);
  }
  g.add(body, head, face);
  g.userData.body = body;
  return g;
}

/** A furnace that grew a mouth. Slow, enormous, and worth going around. */
function buildSlagmaw() {
  const g = new THREE.Group();
  const rock = lam('#3a2622');
  const body = new THREE.Mesh(sharedBox(1.0, 0.86, 0.9), rock);
  body.position.y = 0.62;
  body.castShadow = true;
  // the maw: a glowing slot across the front, teeth top and bottom
  const glow = new THREE.MeshBasicMaterial({
    color: 0xffa04a, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const maw = new THREE.Mesh(sharedBox(0.78, 0.26, 0.1), glow);
  maw.position.set(0, 0.56, 0.47);
  g.add(maw);
  for (let i = 0; i < 6; i++) {
    for (const up of [1, -1]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 4), lam('#d8ccb8'));
      t.position.set(-0.3 + i * 0.12, 0.56 + up * 0.12, 0.49);
      t.rotation.x = up > 0 ? Math.PI : 0;
      g.add(t);
    }
  }
  // one big eye above it, which is what makes it read as alive and not a stove
  const eye = facePlane('slagmaw',
    { eyeW: 7, eyeH: 7, gap: 0, eyeY: 0, eye: '#fff0c0', mouth: 'none' }, 0.3, 0.3);
  eye.position.set(0, 0.92, 0.47);
  g.add(eye);
  // stubby pillar legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(sharedBox(0.24, 0.24, 0.24), lam('#2a1a16'));
    leg.position.set(sx * 0.32, 0.12, sz * 0.28);
    g.add(leg);
  }
  g.add(body);
  g.userData.body = body;
  return g;
}

export const DUNGEON_BUILDERS = {
  gloomling: buildGloomling,
  lampwright: buildLampwright,
  rimefang: buildRimefang,
  hollowchoir: buildHollowChoir,
  cinderhound: buildCinderhound,
  slagmaw: buildSlagmaw,
};

// ---------------------------------------------------------------------------
// BOSSES
//
// Three WARDENS (floors 5 / 15 / 25) and three LORDS (10 / 20 / 30). A warden
// has one idea and executes it well; a lord has three and changes which one it
// is using as it loses health, so the fight you win is not the fight you
// started. `tell` is the wind-up in seconds — the window in which the attack is
// readable and avoidable, and the only reason any of this is fair.
// ---------------------------------------------------------------------------
export const DUNGEON_BOSSES = {
  // -- WARDENS ---------------------------------------------------------------
  warden_lampsworn: {
    name: 'The Lampsworn', base: 'lampwright', scale: 2.4, dungeon: true,
    hp: 900, dmg: 26, xp: 700, speed: 1.0, attackRange: 8.0, attackCd: 2.0, aggro: 20,
    title: 'Who Kept The Last Light', crown: true,
    phases: [
      // it relights the hall's braziers as walls of fire you have to move through
      { at: 1.0, every: 6.0, move: 'firewall', tell: 1.0, color: '#ffb45c', r: 6.5 },
      { at: 0.45, every: 4.5, move: 'summon', tell: 1.2, color: '#ffd98a' },
    ],
  },
  warden_hoarfrost: {
    name: 'Hoarfrost', base: 'rimefang', scale: 2.6, dungeon: true,
    hp: 1150, dmg: 30, xp: 880, speed: 1.9, attackRange: 2.4, attackCd: 1.5, aggro: 20,
    title: 'The Long Winter Under', crown: true,
    phases: [
      // freezes you in place, then charges the spot you were standing in
      { at: 1.0, every: 5.5, move: 'freeze', tell: 0.9, color: '#8fd8ff', r: 5.5 },
      { at: 0.5, every: 4.0, move: 'quake', tell: 0.8, color: '#bfe8ff', r: 7 },
    ],
  },
  warden_cinderjaw: {
    name: 'Cinderjaw', base: 'slagmaw', scale: 2.2, dungeon: true,
    hp: 1500, dmg: 36, xp: 1100, speed: 0.8, attackRange: 2.8, attackCd: 2.0, aggro: 20,
    title: 'The Mouth Of The Core', crown: true,
    phases: [
      { at: 1.0, every: 5.5, move: 'inferno', tell: 1.1, color: '#ff7a3c', r: 7 },
      { at: 0.45, every: 5.0, move: 'boulders', tell: 0.9, color: '#c05a32' },
    ],
  },

  // -- LORDS -----------------------------------------------------------------
  lord_unlit: {
    name: 'The Unlit', base: 'gloomling', scale: 3.2, dungeon: true,
    hp: 2600, dmg: 40, xp: 2200, speed: 1.5, attackRange: 2.6, attackCd: 1.7, aggro: 24,
    title: 'First Of The Dark That Walked', crown: true,
    phases: [
      { at: 1.0, every: 6.5, move: 'slam', tell: 1.0, color: '#6a5a86', r: 7 },
      // halfway down it puts the braziers out and calls the hall's dead in
      { at: 0.6, every: 5.0, move: 'summon', tell: 1.2, color: '#2b2438' },
      { at: 0.3, every: 4.2, move: 'wave', tell: 0.8, color: '#b79cff', r: 9 },
    ],
  },
  lord_glacius: {
    name: 'Glacius', base: 'hollowchoir', scale: 3.0, dungeon: true,
    hp: 3400, dmg: 46, xp: 2900, speed: 1.3, attackRange: 9.0, attackCd: 2.0, aggro: 24,
    title: 'The Choir That Never Stopped', crown: true,
    phases: [
      { at: 1.0, every: 6.0, move: 'freeze', tell: 0.9, color: '#8fd8ff', r: 6 },
      { at: 0.62, every: 5.2, move: 'boulders', tell: 1.0, color: '#bfe8ff' },
      { at: 0.28, every: 4.0, move: 'wave', tell: 0.75, color: '#dff4ff', r: 10 },
    ],
  },
  lord_emberheart: {
    name: 'Emberheart', base: 'cinderhound', scale: 3.4, dungeon: true,
    hp: 4600, dmg: 54, xp: 4200, speed: 2.1, attackRange: 3.0, attackCd: 1.5, aggro: 26,
    title: 'What Is Still Burning', crown: true,
    phases: [
      { at: 1.0, every: 5.5, move: 'inferno', tell: 1.0, color: '#ff7a3c', r: 8 },
      { at: 0.66, every: 4.6, move: 'firewall', tell: 0.85, color: '#ffb45c', r: 8 },
      // at a third it heals unless you are on it — the only real DPS check
      { at: 0.33, every: 6.0, move: 'heal', tell: 1.3, color: '#ffe27a' },
    ],
  },
};

/** True for anything that must never appear above ground. */
export const isDungeonFoe = (id) => !!DUNGEON_TYPES[id] || !!DUNGEON_BOSSES[id];
