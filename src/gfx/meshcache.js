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

/**
 * A SWEPT BLADE SOLID — the answer to "the weapons are just shapes".
 *
 * Every sword in the game was three stacked boxes of decreasing size, so all
 * six read as the same rectangular slab in a different colour; and the "tip"
 * was a box too, which is exactly why none of them ever came to a point. The
 * same fault the boats had before `buildHullGeometry`, for the same reason: a
 * blade is defined by its taper, and none of that survives being approximated
 * with slabs.
 *
 * So sweep a real cross-section along the length. The section is a flattened
 * hexagon — a spine, two bevels a side, and a cutting edge front and back —
 * which is what a blade actually is, and it catches light on the bevels the way
 * a box cannot. Width and thickness come from curves, and the last ring is a
 * single vertex, so the blade tapers continuously into an actual point.
 *
 * Cheaper than the boxes it replaces at the default ring count, and cached by
 * shape like everything else here.
 *
 * @param len      blade length along +Y
 * @param widthAt  (t) -> half-width  at t in 0..1 (0 = ricasso, 1 = tip)
 * @param thickAt  (t) -> half-thickness at t
 * @param rings    cross-sections along the length; 7 is plenty at 16px scale
 * @param key      cache key — REQUIRED, because two callers passing different
 *                 closures must not collide on one entry
 */
export function bladeGeometry(key, len, widthAt, thickAt, rings = 7) {
  const ck = `blade:${key}:${len.toFixed(3)}:${rings}`;
  const hit = geos.get(ck);
  if (hit) return hit;

  // around the section: cutting edge, two bevels, spine, two bevels back
  const SECT = [[0, 1], [1, 0.42], [1, -0.42], [0, -1], [-1, -0.42], [-1, 0.42]];
  const N = SECT.length;
  const ring = (t) => {
    const w = Math.max(1e-4, widthAt(t)), th = Math.max(1e-4, thickAt(t));
    return SECT.map(([xm, zm]) => [xm * th, t * len, zm * w]);
  };
  const rs = [];
  for (let i = 0; i < rings; i++) rs.push(ring(i / rings));
  const tip = [0, len, 0];

  const pos = [], uv = [];
  const push = (v, u, vv) => { pos.push(v[0], v[1], v[2]); uv.push(u, vv); };
  for (let i = 0; i < rs.length - 1; i++) {
    const a = rs[i], b = rs[i + 1];
    const va = i / rings, vb = (i + 1) / rings;
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      const ua = j / N, ub = (j + 1) / N;
      push(a[j], ua, va); push(b[j], ua, vb); push(b[k], ub, vb);
      push(a[j], ua, va); push(b[k], ub, vb); push(a[k], ub, va);
    }
  }
  // fan the last ring into the point
  const last = rs[rs.length - 1];
  for (let j = 0; j < N; j++) {
    const k = (j + 1) % N;
    push(last[j], j / N, (rings - 1) / rings);
    push(tip, 0.5, 1);
    push(last[k], (j + 1) / N, (rings - 1) / rings);
  }
  // and cap the base so a blade seen from below is not hollow
  for (let j = 1; j < N - 1; j++) {
    push(rs[0][0], 0, 0); push(rs[0][j + 1], 0, 0); push(rs[0][j], 0, 0);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  tag(g);
  geos.set(ck, g);
  return g;
}

/**
 * An axe bit: a crescent swept from the haft out to the edge.
 *
 * The old head was a flat slab stuck on the side of a stick, which reads as a
 * FLAG ON A POLE rather than an axe. What makes an axe an axe is that the mass
 * sits out at the edge and the cheek sweeps back to a narrow eye at the haft.
 *
 * Built as two shells (front and back cheek) meeting at the edge arc, so it has
 * a real cutting line rather than a rectangular end.
 */
export function axeBitGeometry(key, reach, span, thick, curve = 0.55, steps = 9) {
  const ck = `axebit:${key}:${reach.toFixed(3)}:${span.toFixed(3)}:${thick.toFixed(3)}:${curve.toFixed(2)}:${steps}`;
  const hit = geos.get(ck);
  if (hit) return hit;
  const pos = [], uv = [];
  const push = (v, u, vv) => { pos.push(v[0], v[1], v[2]); uv.push(u, vv); };
  // the edge is an arc; the eye is a short vertical line at the haft
  const edge = [], eye = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (t - 0.5) * Math.PI * curve;
    // The edge is only SLIGHTLY convex. Pulling its ends a long way back toward
    // the haft made the top and bottom converge, which is a leaf -- a spearhead,
    // not an axe. And the eye has to be SHORT: a tall eye makes the cheek a
    // parallel slab instead of a fan opening out to the edge.
    edge.push([0, Math.sin(a) * span, reach * (0.93 + 0.07 * Math.cos(a))]);
    eye.push([0, (t - 0.5) * span * 0.2, 0]);
  }
  for (let i = 0; i < steps; i++) {
    const e0 = edge[i], e1 = edge[i + 1], y0 = eye[i], y1 = eye[i + 1];
    for (const sgn of [1, -1]) {
      // the cheek bulges to `thick` midway between eye and edge
      const m0 = [sgn * thick, (y0[1] + e0[1]) / 2, e0[2] * 0.45];
      const m1 = [sgn * thick, (y1[1] + e1[1]) / 2, e1[2] * 0.45];
      const u0 = i / steps, u1 = (i + 1) / steps;
      if (sgn > 0) {
        push(y0, u0, 0); push(m0, u0, 0.5); push(m1, u1, 0.5);
        push(y0, u0, 0); push(m1, u1, 0.5); push(y1, u1, 0);
        push(m0, u0, 0.5); push(e0, u0, 1); push(e1, u1, 1);
        push(m0, u0, 0.5); push(e1, u1, 1); push(m1, u1, 0.5);
      } else {
        push(m0, u0, 0.5); push(y0, u0, 0); push(m1, u1, 0.5);
        push(m1, u1, 0.5); push(y0, u0, 0); push(y1, u1, 0);
        push(e0, u0, 1); push(m0, u0, 0.5); push(e1, u1, 1);
        push(e1, u1, 1); push(m0, u0, 0.5); push(m1, u1, 0.5);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  tag(g);
  geos.set(ck, g);
  return g;
}

/**
 * A tapered tube swept along a curve.
 *
 * The bows were nine separate boxes posted along an arc and rotated
 * individually, which opened a gap on the outside of every joint -- so a bow
 * read as BEADS ON A STRING rather than as a limb. A limb is one continuous
 * piece that is thick at the riser and fine at the nock, and that is a sweep.
 *
 * Uses three's own Frenet frames off a Catmull-Rom through the given points, so
 * the section stays square to the path and never pinches on a tight bend.
 *
 * @param pts       array of [x,y,z] the path runs through
 * @param radiusAt  (t) -> radius at t in 0..1 along the path
 */
export function sweepGeometry(key, pts, radiusAt, sides = 6, steps = 18) {
  const ck = `sweep:${key}:${sides}:${steps}`;
  const hit = geos.get(ck);
  if (hit) return hit;
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
  const frames = curve.computeFrenetFrames(steps, false);
  const pos = [], uv = [];
  const ringAt = (i) => {
    const t = i / steps;
    const c = curve.getPointAt(t);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = Math.max(1e-4, radiusAt(t));
    return Array.from({ length: sides }, (_, j) => {
      const a = (j / sides) * Math.PI * 2;
      return [
        c.x + (N.x * Math.cos(a) + B.x * Math.sin(a)) * r,
        c.y + (N.y * Math.cos(a) + B.y * Math.sin(a)) * r,
        c.z + (N.z * Math.cos(a) + B.z * Math.sin(a)) * r,
      ];
    });
  };
  const push = (v, u, vv) => { pos.push(v[0], v[1], v[2]); uv.push(u, vv); };
  let prev = ringAt(0);
  for (let i = 1; i <= steps; i++) {
    const cur = ringAt(i);
    const va = (i - 1) / steps, vb = i / steps;
    for (let j = 0; j < sides; j++) {
      const k2 = (j + 1) % sides;
      const ua = j / sides, ub = (j + 1) / sides;
      push(prev[j], ua, va); push(cur[j], ua, vb); push(cur[k2], ub, vb);
      push(prev[j], ua, va); push(cur[k2], ub, vb); push(prev[k2], ub, va);
    }
    prev = cur;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  tag(g);
  geos.set(ck, g);
  return g;
}

export function sharedTorus(r, tube, rSeg = 6, tSeg = 12) {
  const key = k('t', r, tube, rSeg, tSeg);
  let g = geos.get(key);
  if (!g) { g = tag(new THREE.TorusGeometry(r, tube, rSeg, tSeg)); geos.set(key, g); }
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
