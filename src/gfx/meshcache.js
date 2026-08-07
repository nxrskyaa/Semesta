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

// Anything handed out by this module is SHARED, so disposing it would pull the
// rug out from under every other object using it. Everything is tagged, and
// util/dispose.js skips tagged resources.
export const SHARED = Symbol('shared-resource');
const tag = (o) => { o[SHARED] = true; return o; };

const k = (...a) => a.join('|');

/**
 * A real HIP ROOF, not a stack of shrinking boxes.
 *
 * Every roof in the village was three flat slabs of decreasing size piled on top
 * of each other, which reads as a tiered cake rather than a building — it is the
 * single thing that made the basecamp look unfinished next to the terrain. This
 * builds the actual solid: a rectangular eave line rising to a ridge, so the four
 * faces are two trapezoids and two triangular hips.
 *
 * @param w      width at the eaves (x)
 * @param d      depth at the eaves (z)
 * @param h      height from eave to ridge
 * @param ridge  ridge length as a fraction of w — 0 gives a pyramid, 1 a gable
 */
export function hipRoofGeometry(w, d, h, ridge = 0.45) {
  const key = `roof:${w.toFixed(3)},${d.toFixed(3)},${h.toFixed(3)},${ridge.toFixed(3)}`;
  const hit = geos.get(key);
  if (hit) return hit;
  const x = w / 2, z = d / 2, r = (w * ridge) / 2;
  // eave corners (y=0) and the two ridge ends (y=h)
  const A = [-x, 0, z], B = [x, 0, z], C = [x, 0, -z], D = [-x, 0, -z];
  const P = [-r, h, 0], Q = [r, h, 0];
  const tri = (a, b, c) => [...a, ...b, ...c];
  const pos = new Float32Array([
    ...tri(A, B, Q), ...tri(A, Q, P),   // front slope
    ...tri(C, D, P), ...tri(C, P, Q),   // back slope
    ...tri(B, C, Q),                    // right hip
    ...tri(D, A, P),                    // left hip
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const n = pos.length / 3;
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  tag(g);
  geos.set(key, g);
  return g;
}

export function sharedBox(w, h, d) {
  const key = k('b', w, h, d);
  let g = geos.get(key);
  if (!g) { g = tag(new THREE.BoxGeometry(w, h, d)); geos.set(key, g); }
  return g;
}

export function sharedCyl(rt, rb, h, seg = 8) {
  const key = k('c', rt, rb, h, seg);
  let g = geos.get(key);
  if (!g) { g = tag(new THREE.CylinderGeometry(rt, rb, h, seg)); geos.set(key, g); }
  return g;
}

export function sharedSphere(r, wSeg = 8, hSeg = 6) {
  const key = k('s', r, wSeg, hSeg);
  let g = geos.get(key);
  if (!g) { g = tag(new THREE.SphereGeometry(r, wSeg, hSeg)); geos.set(key, g); }
  return g;
}

export function sharedPlane(w, h) {
  const key = k('p', w, h);
  let g = geos.get(key);
  if (!g) { g = tag(new THREE.PlaneGeometry(w, h)); geos.set(key, g); }
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
  if (!m) { m = tag(new THREE.MeshLambertMaterial(opts)); mats.set(key, m); }
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
