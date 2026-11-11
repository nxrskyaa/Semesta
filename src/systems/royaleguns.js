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
  rattler: { name: 'Cinder Rattler', cls: 'SMG', dmg: 9, rate: 11.5, mag: 30, reload: 1.5, spread: 0.085, speed: 46, range: 19, auto: true, pellets: 1, ideal: 7, len: 0.5, kick: 0.03, sfx: 'gun_smg' },
  lance: { name: 'Emberlance', cls: 'RIFLE', dmg: 14, rate: 6.6, mag: 26, reload: 1.8, spread: 0.036, speed: 58, range: 32, auto: true, pellets: 1, ideal: 13, len: 0.74, kick: 0.045, sfx: 'gun_rifle' },
  bloom: { name: 'Blunderbloom', cls: 'SHOTGUN', dmg: 10, rate: 1.15, mag: 5, reload: 2.0, spread: 0.2, speed: 42, range: 11, auto: false, pellets: 7, ideal: 4.5, len: 0.66, kick: 0.16, sfx: 'gun_shotgun' },
  longwick: { name: 'Longwick', cls: 'MARKSMAN', dmg: 64, rate: 0.75, mag: 4, reload: 2.3, spread: 0.003, speed: 110, range: 58, auto: false, pellets: 1, ideal: 24, len: 0.98, kick: 0.2, pierce: true, sfx: 'gun_sniper' },
  mortar: { name: 'Lantern Mortar', cls: 'LAUNCHER', dmg: 52, rate: 0.8, mag: 3, reload: 2.6, spread: 0.015, speed: 19, range: 26, auto: false, pellets: 1, ideal: 14, len: 0.7, kick: 0.22, blast: 3.4, arc: true, sfx: 'gun_launcher' },
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
const IRON = '#2c3340', IRON_L = '#465062', BRASS = '#c9963e', WOOD = '#7a5234', CLOTH = '#d8cdb4';

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
  const k = new Kit();
  const glow = RARITIES[rar].color;
  if (id === 'wick') {
    k.box(IRON, 0.07, 0.11, 0.3, 0, 0.05, 0.14).box(WOOD, 0.06, 0.16, 0.09, 0, -0.05, 0.02, 0.3)
      .tube(BRASS, 0.026, 0.12, 0, 0.06, 0.34).box(glow, 0.075, 0.035, 0.1, 0, 0.115, 0.1, 0, 0, 0, true);
  } else if (id === 'rattler') {
    k.box(IRON, 0.08, 0.12, 0.42, 0, 0.05, 0.2).box(WOOD, 0.06, 0.15, 0.08, 0, -0.05, 0.02, 0.3)
      .box(IRON_L, 0.06, 0.2, 0.07, 0, -0.07, 0.24).tube(BRASS, 0.03, 0.16, 0, 0.05, 0.47)
      .box(glow, 0.085, 0.03, 0.2, 0, 0.12, 0.2, 0, 0, 0, true).box(IRON_L, 0.05, 0.06, 0.16, 0, 0.04, -0.1);
  } else if (id === 'lance') {
    k.box(IRON, 0.08, 0.12, 0.5, 0, 0.05, 0.22).box(WOOD, 0.07, 0.11, 0.24, 0, 0.02, -0.17).box(WOOD, 0.06, 0.15, 0.08, 0, -0.06, 0.02, 0.3)
      .tube(IRON_L, 0.028, 0.34, 0, 0.06, 0.62).tube(BRASS, 0.04, 0.05, 0, 0.06, 0.78)
      .box(IRON_L, 0.055, 0.17, 0.08, 0, -0.07, 0.2, -0.15).box(glow, 0.085, 0.03, 0.3, 0, 0.12, 0.2, 0, 0, 0, true)
      .box(IRON_L, 0.03, 0.05, 0.12, 0, 0.15, 0.1);
  } else if (id === 'bloom') {
    k.box(WOOD, 0.08, 0.12, 0.3, 0, 0.02, -0.08, 0.08).box(IRON, 0.09, 0.11, 0.3, 0, 0.05, 0.16)
      .tube(IRON_L, 0.05, 0.36, 0, 0.06, 0.46).tube(BRASS, 0.05, 0.09, 0, 0.06, 0.66, false, 8, 0.078)
      .box(WOOD, 0.1, 0.08, 0.16, 0, -0.01, 0.36).box(glow, 0.095, 0.03, 0.14, 0, 0.115, 0.14, 0, 0, 0, true);
  } else if (id === 'longwick') {
    k.box(WOOD, 0.07, 0.12, 0.34, 0, 0.02, -0.12, 0.06).box(IRON, 0.07, 0.1, 0.36, 0, 0.05, 0.18)
      .tube(IRON_L, 0.022, 0.6, 0, 0.06, 0.64).tube(BRASS, 0.034, 0.07, 0, 0.06, 0.96)
      .tube(IRON, 0.035, 0.26, 0, 0.15, 0.2).tube(glow, 0.036, 0.02, 0, 0.15, 0.34, true)
      .box(IRON_L, 0.03, 0.05, 0.03, 0, 0.11, 0.12).box(IRON_L, 0.03, 0.05, 0.03, 0, 0.11, 0.28)
      .box(glow, 0.075, 0.025, 0.2, 0, 0.105, 0.0, 0, 0, 0, true);
  } else if (id === 'mortar') {
    k.box(WOOD, 0.08, 0.13, 0.2, 0, 0.0, -0.06, 0.1).tube(IRON, 0.1, 0.5, 0, 0.07, 0.3)
      .tube(BRASS, 0.115, 0.07, 0, 0.07, 0.57).tube(BRASS, 0.11, 0.05, 0, 0.07, 0.08)
      .box(glow, 0.06, 0.06, 0.06, 0, 0.19, 0.3, 0, 0, 0, true).box(IRON_L, 0.04, 0.08, 0.04, 0, 0.14, 0.3)
      .box(WOOD, 0.06, 0.15, 0.08, 0, -0.07, 0.2, 0.3);
  } else {                                                   // sunray
    k.box(WOOD, 0.06, 0.1, 0.5, 0, 0.03, 0.12).tube(BRASS, 0.035, 0.1, 0, 0.04, 0.42)
      .add(glow, new THREE.OctahedronGeometry(0.1, 0), 0, 0.06, 0.6, 0, 0, 0, true)
      .box(BRASS, 0.02, 0.2, 0.02, 0.09, 0.06, 0.55, 0, 0, 0.5).box(BRASS, 0.02, 0.2, 0.02, -0.09, 0.06, 0.55, 0, 0, -0.5)
      .box(CLOTH, 0.07, 0.11, 0.1, 0, 0.03, 0.0).box(glow, 0.065, 0.02, 0.3, 0, 0.09, 0.15, 0, 0, 0, true);
  }
  const g = k.build();
  g.userData.len = GUNS[id].len;
  return g;
}

export function buildKnife() {
  const k = new Kit();
  k.box(WOOD, 0.05, 0.05, 0.14, 0, 0, 0).box(BRASS, 0.12, 0.03, 0.03, 0, 0, 0.08)
    .add('#dfe7ee', new THREE.ConeGeometry(0.045, 0.36, 4), 0, 0, 0.27, Math.PI / 2, 0, 0);
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
  wick: 'M6 12h34v7h-6l-2 3h-9l-3 9h-8l2-12H6z',
  rattler: 'M4 11h44v4h8v4H44v2H34l-1 11h-7l-1-11h-6l-3 9H9l2-10H4z',
  lance: 'M2 13h12l4-3h26v3h18v4H46l-2 3H34l-2 10h-6l-1-10h-7l-3 6H8l2-7H2z',
  bloom: 'M2 14l10-3h30v2h20v6H44l-3 3H24l-4 8h-7l2-9H2z',
  longwick: 'M1 14h11l3-2h22V9h10v3h16v3H47l-2 3H33l-3 8h-6l-1-8h-7l-3 5H7l1-5H1z',
  mortar: 'M4 12h8l3-4h40v14H22l-3 8h-7l2-10H4z',
  sunray: 'M2 15h36l6-7 8 9-8 9-6-7H24l-3 8h-6l1-8H2z',
  knife: 'M4 20l40-12 14 2-12 10H18l-3 5H8l2-5z',
};
export function gunIcon(id, color = '#fff') {
  return `<svg viewBox="0 0 64 32" width="64" height="32" aria-hidden="true"><path d="${ICON[id] || ICON.wick}" fill="${color}"/></svg>`;
}
