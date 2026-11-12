// LANTERNFALL — the armoury.
//
// A battleground is its weapons: what you find decides how you fight, and two
// keepers with different guns are playing two different games. The first build
// of this mode had ONE weapon family per hero and called a damage multiplier a
// "weapon", which is the single biggest reason it did not read as the genre.
//
// Seven firearms and a knife, each with its own range, rhythm and silhouette,
// in four rarities. They are lantern-tech: brass, dark iron and a lit cell
// where a magazine would be, so they belong to keepers and not to soldiers.
// Everything here is DATA plus builders — no match state.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const RARITIES = [
  { id: 'common', name: 'COMMON', color: '#aeb9c4', mult: 1.0 },
  { id: 'rare', name: 'RARE', color: '#4da6ff', mult: 1.14 },
  { id: 'epic', name: 'EPIC', color: '#b56cff', mult: 1.28 },
  { id: 'legendary', name: 'LEGENDARY', color: '#ffb238', mult: 1.45 },
];

// dmg is per pellet; rate is shots a second; spread is radians either side;
// range is how far a round flies; `ideal` is where a bot wants to stand.
export const GUNS = {
  wick: { name: 'Wickshot', cls: 'PISTOL', dmg: 17, rate: 3.6, mag: 12, reload: 1.05, spread: 0.03, speed: 50, range: 26, auto: false, pellets: 1, ideal: 9, len: 0.36, kick: 0.05, sfx: 'gun_pistol' },
  rattler: { name: 'Cinder Rattler', cls: 'SMG', dmg: 9, rate: 11.5, mag: 30, reload: 1.5, spread: 0.06, speed: 46, range: 19, auto: true, pellets: 1, ideal: 7, len: 0.5, kick: 0.03, sfx: 'gun_smg' },
  lance: { name: 'Emberlance', cls: 'RIFLE', dmg: 14, rate: 5.8, mag: 26, reload: 1.8, spread: 0.036, speed: 58, range: 32, auto: true, pellets: 1, ideal: 13, len: 0.74, kick: 0.045, sfx: 'gun_rifle' },
  bloom: { name: 'Blunderbloom', cls: 'SHOTGUN', dmg: 10, rate: 1.15, mag: 5, reload: 2.0, spread: 0.2, speed: 42, range: 11, auto: false, pellets: 7, ideal: 4.5, len: 0.66, kick: 0.16, sfx: 'gun_shotgun' },
  longwick: { name: 'Longwick', cls: 'MARKSMAN', dmg: 85, rate: 0.9, mag: 4, reload: 2.3, spread: 0.003, speed: 110, range: 36, auto: false, pellets: 1, ideal: 24, len: 0.98, kick: 0.2, pierce: true, sfx: 'gun_sniper' },
  mortar: { name: 'Lantern Mortar', cls: 'LAUNCHER', dmg: 52, rate: 0.8, mag: 4, reload: 2.6, spread: 0.015, speed: 26, range: 26, auto: false, pellets: 1, ideal: 14, len: 0.7, kick: 0.22, blast: 3.4, arc: true, sfx: 'gun_launcher' },
  sunray: { name: 'Sunray', cls: 'BEAM', dmg: 3.4, rate: 17, mag: 90, reload: 2.2, spread: 0, speed: 0, range: 17, auto: true, pellets: 1, ideal: 9, len: 0.8, kick: 0.01, beam: true, sfx: 'gun_beam' },
};
export const GUN_IDS = Object.keys(GUNS);
export const KNIFE = { name: "Keeper's Knife", cls: 'MELEE', dmg: 34, rate: 2.1, range: 2.0, arc: 1.25 };

// What turns up on the ground, weighted. Rarer guns are rarer AND better.
const GUN_WEIGHT = { wick: 22, rattler: 18, lance: 16, bloom: 15, longwick: 9, mortar: 7, sunray: 8 };
const RAR_WEIGHT = [52, 30, 14, 4];
export function rollGun(rnd, lift = 0) {
  let r = rnd() * Object.values(GUN_WEIGHT).reduce((a, b) => a + b, 0), id = 'wick';
  for (const k of GUN_IDS) { if ((r -= GUN_WEIGHT[k]) <= 0) { id = k; break; } }
  const w = RAR_WEIGHT.map((v, i) => v * (1 + lift * i * 1.6));
  let q = rnd() * w.reduce((a, b) => a + b, 0), rar = 0;
  for (let i = 0; i < w.length; i++) { if ((q -= w[i]) <= 0) { rar = i; break; } }
  return { id, rar };
}
/** How good a gun is, for a bot deciding whether to swap. */
export const gunScore = (id, rar) => {
  const g = GUNS[id];
  return g.dmg * g.pellets * g.rate * RARITIES[rar].mult * (g.cls === 'PISTOL' ? 0.8 : 1);
};

// ------------------------------------------------------------------ models ---
const matCache = new Map();
const mat = (color, basic = false) => {
  const k = `${color}|${basic}`;
  if (!matCache.has(k)) {
    matCache.set(k, basic
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
      : new THREE.MeshLambertMaterial({ color: new THREE.Color(color), flatShading: true }));
  }
  return matCache.get(k);
};
const IRON = '#4a5568', IRON_L = '#74829a', BRASS = '#d9a441', WOOD = '#8a5a34', CLOTH = '#d8cdb4';

/** Parts gathered per colour and merged: a whole gun is three or four meshes. */
class Kit {
  constructor() { this.by = new Map(); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
  add(color, geo, x, y, z, rx = 0, ry = 0, rz = 0, basic = false) {
    this.q.setFromEuler(this.e.set(rx, ry, rz));
    geo.applyMatrix4(this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(1, 1, 1)));
    const k = `${color}|${basic ? 1 : 0}`;
    if (!this.by.has(k)) this.by.set(k, { color, basic, geos: [] });
    this.by.get(k).geos.push(geo.index ? geo.toNonIndexed() : geo);
    return this;
  }
  box(color, w, h, d, x, y, z, rx, ry, rz, basic) { return this.add(color, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz, basic); }
  // a barrel: a cylinder lying along +Z
  tube(color, r, len, x, y, z, basic, seg = 8, r2 = r) { return this.add(color, new THREE.CylinderGeometry(r2, r, len, seg), x, y, z, Math.PI / 2, 0, 0, basic); }
  build() {
    const g = new THREE.Group();
    for (const { color, basic, geos } of this.by.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat(color, basic));
      mesh.castShadow = !basic;
      g.add(mesh);
    }
    return g;
  }
}

/**
 * A gun, built pointing down +Z with the grip at the origin. `rar` tints the
 * lit parts, so a legendary is recognisable across a street by its colour.
 */
export function buildGun(id, rar = 0) {
  // SEEN FROM ABOVE, A GUN IS ITS PLAN. The first set differed in height (grip,
  // magazine, scope), which a camera looking down foreshortens to nothing, and
  // every receiver was 0.07 wide: seven sticks of different lengths. Each gun
  // here is told apart in the XZ plane by ONE thing nobody else has (a cage, a
  // sideways drum, a spear point, twin barrels and a bell, a scope and bipod,
  // a banded tube, a crystal in prongs), and that thing carries the rarity.
  const k = new Kit();
  const glow = RARITIES[rar].color;
  const PI = Math.PI;
  const grip = (z = 0.02) => k.box(WOOD, 0.08, 0.17, 0.1, 0, -0.06, z, 0.3);
  if (id === 'wick') {
    grip();
    k.box(IRON, 0.12, 0.1, 0.3, 0, 0.05, 0.15).box(IRON_L, 0.08, 0.02, 0.28, 0, 0.11, 0.15)
      .box(IRON_L, 0.04, 0.06, 0.05, 0, 0.12, -0.01)
      .tube(BRASS, 0.075, 0.12, 0, 0.05, 0.35, false, 6).tube(glow, 0.05, 0.13, 0, 0.05, 0.35, true, 6)
      .tube(BRASS, 0.085, 0.025, 0, 0.05, 0.29, false, 6).tube(BRASS, 0.085, 0.025, 0, 0.05, 0.41, false, 6)
      .box(BRASS, 0.02, 0.02, 0.1, 0, -0.03, 0.1);
  } else if (id === 'rattler') {
    grip();
    k.box(IRON, 0.13, 0.11, 0.34, 0, 0.05, 0.17).box(IRON_L, 0.09, 0.02, 0.3, 0, 0.115, 0.17)
      // the drum lies on its side: a disc you can see from straight above
      .add(BRASS, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), -0.11, 0.03, 0.2, 0, 0, PI / 2)
      .add(glow, new THREE.CylinderGeometry(0.07, 0.07, 0.09, 10), -0.11, 0.03, 0.2, 0, 0, PI / 2, true)
      .tube(IRON_L, 0.05, 0.22, 0, 0.05, 0.45).tube(BRASS, 0.06, 0.025, 0, 0.05, 0.39).tube(BRASS, 0.06, 0.025, 0, 0.05, 0.46).tube(BRASS, 0.06, 0.025, 0, 0.05, 0.53)
      .box(IRON_L, 0.016, 0.016, 0.22, 0.05, 0.07, -0.13).box(IRON_L, 0.016, 0.016, 0.22, -0.05, 0.07, -0.13).box(IRON_L, 0.12, 0.08, 0.016, 0, 0.05, -0.24);
  } else if (id === 'lance') {
    grip();
    k.box(IRON, 0.12, 0.12, 0.42, 0, 0.05, 0.2).box(IRON_L, 0.08, 0.02, 0.38, 0, 0.12, 0.2)
      .box(WOOD, 0.1, 0.11, 0.24, 0, 0.03, -0.14, 0.05).box(WOOD, 0.085, 0.1, 0.1, 0, 0.01, -0.3, 0.1).box(BRASS, 0.11, 0.13, 0.03, 0, 0.0, -0.36)
      .box(IRON_L, 0.07, 0.2, 0.1, 0, -0.08, 0.17, -0.3)
      .box(WOOD, 0.11, 0.09, 0.26, 0, 0.04, 0.52).tube(IRON_L, 0.03, 0.3, 0, 0.06, 0.78)
      .add(glow, new THREE.ConeGeometry(0.06, 0.16, 4), 0, 0.06, 0.99, PI / 2, 0, 0, true)
      .tube(BRASS, 0.045, 0.03, 0, 0.06, 0.9).box(IRON_L, 0.02, 0.06, 0.02, 0, 0.15, 0.6)
      .box(glow, 0.125, 0.03, 0.12, 0, 0.06, 0.3, 0, 0, 0, true);
  } else if (id === 'bloom') {
    grip();
    k.box(IRON, 0.15, 0.11, 0.24, 0, 0.05, 0.1).box(WOOD, 0.11, 0.12, 0.2, 0, 0.02, -0.12, 0.1).box(WOOD, 0.13, 0.13, 0.08, 0, 0.0, -0.25, 0.1)
      .tube(IRON_L, 0.052, 0.36, 0.056, 0.06, 0.4).tube(IRON_L, 0.052, 0.36, -0.056, 0.06, 0.4)
      .box(WOOD, 0.18, 0.08, 0.14, 0, 0.02, 0.32)
      // the bell: the widest thing on any gun
      .tube(BRASS, 0.11, 0.14, 0, 0.06, 0.65, false, 10, 0.17).tube(glow, 0.13, 0.02, 0, 0.06, 0.725, true, 10)
      .tube(BRASS, 0.115, 0.025, 0, 0.06, 0.58, false, 10);
  } else if (id === 'longwick') {
    grip();
    k.box(IRON, 0.08, 0.09, 0.42, 0, 0.05, 0.17).tube(IRON_L, 0.024, 0.74, 0, 0.06, 0.74)
      .box(BRASS, 0.12, 0.05, 0.08, 0, 0.06, 1.12).box(IRON, 0.14, 0.03, 0.03, 0, 0.06, 1.12)
      .tube(IRON, 0.055, 0.32, 0, 0.17, 0.2).tube(BRASS, 0.062, 0.03, 0, 0.17, 0.06).tube(BRASS, 0.062, 0.03, 0, 0.17, 0.34)
      .tube(glow, 0.048, 0.02, 0, 0.17, 0.365, true).tube(glow, 0.048, 0.02, 0, 0.17, 0.035, true)
      .box(IRON_L, 0.02, 0.24, 0.02, 0.09, -0.06, 0.64, 0, 0, -0.55).box(IRON_L, 0.02, 0.24, 0.02, -0.09, -0.06, 0.64, 0, 0, 0.55)
      .box(WOOD, 0.06, 0.04, 0.3, 0, 0.08, -0.17).box(WOOD, 0.06, 0.03, 0.26, 0, -0.03, -0.19).box(WOOD, 0.07, 0.15, 0.04, 0, 0.02, -0.33);
  } else if (id === 'mortar') {
    grip(0.16);
    k.tube(IRON, 0.14, 0.5, 0, 0.09, 0.3, false, 10)
      .tube(BRASS, 0.152, 0.035, 0, 0.09, 0.1, false, 10).tube(BRASS, 0.152, 0.035, 0, 0.09, 0.24, false, 10)
      .tube(BRASS, 0.152, 0.035, 0, 0.09, 0.38, false, 10).tube(BRASS, 0.165, 0.05, 0, 0.09, 0.54, false, 10)
      .tube(glow, 0.11, 0.02, 0, 0.09, 0.565, true, 10)
      .tube(BRASS, 0.17, 0.06, 0, 0.09, 0.03, false, 10, 0.14)
      .box(WOOD, 0.15, 0.11, 0.1, 0, 0.06, -0.08)
      .add(glow, new THREE.SphereGeometry(0.075, 8, 6), 0.19, 0.06, 0.44, 0, 0, 0, true).box(BRASS, 0.06, 0.02, 0.02, 0.15, 0.06, 0.44)
      .box(IRON_L, 0.02, 0.14, 0.02, 0, 0.27, 0.22).box(IRON_L, 0.06, 0.02, 0.02, 0, 0.33, 0.22);
  } else {                                                   // sunray
    grip();
    k.box(WOOD, 0.09, 0.1, 0.46, 0, 0.03, 0.1).box(CLOTH, 0.1, 0.11, 0.1, 0, 0.03, -0.05)
      .box(glow, 0.1, 0.09, 0.14, -0.1, 0.04, 0.12, 0, 0, 0, true).box(BRASS, 0.12, 0.02, 0.16, -0.1, 0.09, 0.12)
      .tube(BRASS, 0.06, 0.1, 0, 0.04, 0.38)
      .add(glow, new THREE.OctahedronGeometry(0.14, 0), 0, 0.05, 0.6, 0, 0, 0, true);
    for (let i = 0; i < 3; i++) {                              // three prongs holding the stone
      const a = (i / 3) * PI * 2 + PI / 2;
      k.box(BRASS, 0.03, 0.03, 0.3, Math.cos(a) * 0.13, 0.05 + Math.sin(a) * 0.13, 0.52, Math.sin(a) * 0.25, -Math.cos(a) * 0.25, 0);
    }
    for (const z of [-0.0, 0.08, 0.16]) k.add(BRASS, new THREE.TorusGeometry(0.075, 0.016, 5, 10), 0, 0.03, z + 0.14);
  }
  const g = k.build();
  g.userData.len = GUNS[id].len;
  return g;
}

export function buildKnife() {
  const k = new Kit();
  k.box(WOOD, 0.06, 0.06, 0.16, 0, 0, 0).box(BRASS, 0.16, 0.035, 0.035, 0, 0, 0.09)
    .add(BRASS, new THREE.TorusGeometry(0.04, 0.014, 5, 10), 0, 0, -0.11, 0, Math.PI / 2, 0)
    .add('#e8eef4', new THREE.ConeGeometry(0.06, 0.42, 4), 0, 0, 0.31, Math.PI / 2, 0, 0)
    .add('#aab6c2', new THREE.BoxGeometry(0.012, 0.012, 0.3), 0, 0.03, 0.28);
  return k.build();
}

/** A consumable on the ground: a tonic flask, a shield cell, an ammo box. */
export function buildItem(kind) {
  const k = new Kit();
  if (kind === 'tonic') {
    k.add('#63e08a', new THREE.SphereGeometry(0.17, 8, 6), 0, 0.17, 0, 0, 0, 0, true)
      .add('#e8f5ea', new THREE.CylinderGeometry(0.06, 0.08, 0.14, 8), 0, 0.36, 0).box(WOOD, 0.09, 0.05, 0.09, 0, 0.45, 0);
  } else if (kind === 'cell') {
    k.add('#5ad1ff', new THREE.CylinderGeometry(0.13, 0.13, 0.3, 6), 0, 0.2, 0, 0, 0, 0, true)
      .add(IRON, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 6), 0, 0.38, 0).add(IRON, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 6), 0, 0.03, 0);
  } else {                                                   // ammo
    k.box('#5a6b3a', 0.36, 0.2, 0.24, 0, 0.1, 0).box(BRASS, 0.38, 0.04, 0.26, 0, 0.2, 0)
      .box('#ffd27a', 0.1, 0.1, 0.02, 0, 0.1, 0.125, 0, 0, 0, true);
  }
  return k.build();
}

// --------------------------------------------------------------- HUD icons ---
// Side-on silhouettes, drawn as paths so they are crisp at any size.
const ICON = {
  // each silhouette carries the same one feature as the model: the cage, the
  // drum, the spear point, the bell, the scope and bipod, the banded tube, the stone
  wick: 'M6 11h26v-2h10v2h4v8h-4v2H26l-1 2h-5l-2 8h-8l2-9H6z M35 12v6h2v-6z M39 12v6h2v-6z M18 23h5v3h-5z',
  rattler: 'M3 12h9v2h4v-3h24v3h16v4H40v3h-7a8 8 0 1 1-15 0h-2l-2 9H8l2-9H3z M25.500 21a3 3 0 1 0 0.01 0z',
  lance: 'M1 12l9 1h7l3-2h22v2h12l8 3-8 3H44l-2 2H34l-3 9h-6l1-9h-7l-3 5H9l2-6-10 1z M22 13h16v2H22z',
  bloom: 'M2 14l10-3h26v1h14l9-4v16l-9-4H42l-2 2H24l-3 8h-7l2-9H2z M40 14h12v1H40z',
  longwick: 'M1 15h10l3-2h8V8h16v5h18v-2h6v6h-6v-1H46l-1 2 5 9h-3l-6-9H33l-2 7h-6l-1-7h-5l-3 5H7l1-5H1z M25 10h10v1H25z',
  mortar: 'M5 11h7V7h44v-1h4v18h-4v-1H25l-3 8h-7l2-10H5z M20 9h2v12h-2z M31 9h2v12h-2z M42 9h2v12h-2z',
  sunray: 'M2 14h28v-3h6l9-9 11 14-11 14-9-9h-6v-1H24l-3 8h-6l1-8H2z M45 10l5 6-5 6-5-6z',
  knife: 'M3 17h14v-3h3v3l38-5-12 10H20v3h-3v-3H3z M8 15h2v6H8z',
};
export function gunIcon(id, color = '#fff') {
  return `<svg viewBox="0 0 64 32" width="64" height="32" aria-hidden="true"><path fill-rule="evenodd" d="${ICON[id] || ICON.wick}" fill="${color}"/></svg>`;
}
