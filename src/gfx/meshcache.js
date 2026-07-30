// Shared geometry + material cache.
//
// Every prop in this game is built from little boxes and cylinders, and the
// naive way to do that — `new BoxGeometry(...)` + `new MeshLambertMaterial(...)`
// per part — is what made a LOW preset feel no faster than ULTRA. Measured on a
// built world: 2,881 scene objects carrying 2,465 DISTINCT materials and 2,838
// distinct geometries. Nothing could be batched, every material owned its own
// uniform block, and the per-frame traversal had to touch all of it.
//
// These helpers key on the actual parameters, so a hundred identical palm blades
// share one geometry and one material. Same visual result, a fraction of the
// state. Use them for STATIC prop parts. Anything that needs its own colour
// tween, opacity animation or emissive pulse at runtime must own its material —
// pass `unique: true` (or just build it by hand) so it does.
import * as THREE from 'three';

const geos = new Map();
const mats = new Map();

const k = (...a) => a.join('|');

export function sharedBox(w, h, d) {
  const key = k('b', w, h, d);
  let g = geos.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geos.set(key, g); }
  return g;
}

export function sharedCyl(rt, rb, h, seg = 8) {
  const key = k('c', rt, rb, h, seg);
  let g = geos.get(key);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); geos.set(key, g); }
  return g;
}

export function sharedSphere(r, wSeg = 8, hSeg = 6) {
  const key = k('s', r, wSeg, hSeg);
  let g = geos.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, wSeg, hSeg); geos.set(key, g); }
  return g;
}

export function sharedPlane(w, h) {
  const key = k('p', w, h);
  let g = geos.get(key);
  if (!g) { g = new THREE.PlaneGeometry(w, h); geos.set(key, g); }
  return g;
}

/**
 * A Lambert material shared by colour (+ transparency). `unique: true` opts out
 * for anything that animates its own material state.
 */
export function sharedMat(color, { opacity = 1, unique = false, emissive = null } = {}) {
  const opts = {
    color: new THREE.Color(color),
    ...(opacity < 1 ? { transparent: true, opacity } : {}),
    ...(emissive ? { emissive: new THREE.Color(emissive) } : {}),
  };
  if (unique) return new THREE.MeshLambertMaterial(opts);
  const key = k('m', color, opacity, emissive || '-');
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial(opts); mats.set(key, m); }
  return m;
}

/** box mesh with a shared geometry + material */
export function boxMesh(w, h, d, color, opts) {
  return new THREE.Mesh(sharedBox(w, h, d), sharedMat(color, opts));
}

/** cylinder mesh with a shared geometry + material */
export function cylMesh(rt, rb, h, color, seg = 8, opts) {
  return new THREE.Mesh(sharedCyl(rt, rb, h, seg), sharedMat(color, opts));
}

/** sphere mesh with a shared geometry + material */
export function sphereMesh(r, color, wSeg = 8, hSeg = 6, opts) {
  return new THREE.Mesh(sharedSphere(r, wSeg, hSeg), sharedMat(color, opts));
}

/** Diagnostics for the perf panel / tests. */
export function cacheStats() {
  return { geometries: geos.size, materials: mats.size };
}
