// THE EMBERWASTE — the battleground Lanternfall is fought on.
//
// A desert island that hangs in the sky above a sea of cloud, at the last
// minute of dusk. It is deliberately NOT Anavela: the first two builds of this
// arena reused the overworld's tiles and trees, and a second mode that looks
// like the first one reads as the same game with the monsters swapped. Here the
// only thing carried over is the keepers themselves.
//
// What makes it its own place is written as SHADERS, not as props:
//   · the sky is a dome with a sun on the horizon, cloud streaks and stars
//   · the island floats on a sea of rolling cloud
//   · the sand has wind ripples, the cliffs are banded rock
//   · the Dark is drawn INTO every surface: anything outside the light is
//     tinted in its own fragment shader, with a lit line where the edge
//     crosses the ground, so the boundary follows dunes and walls exactly
//
// Same trick as the Hollow underneath: one override on `terrain`, and every
// system follows without knowing an arena exists. The isle sits 4,000 units
// from Anavela so nothing there is within reach of anything here.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ChunkedInstanced } from '../gfx/chunked.js';
import { bakeStatic } from '../gfx/bake.js';
import { buildPalm } from './isles.js';

export const ROYALE_CX = 4000;
export const ROYALE_CZ = 4000;
export const ISLE_R = 96;
const PAD_H = 2.2;
const WATER_Y = 1.55;

// Ten named places. A battleground is somewhere you can say you are.
export const POIS = [
  { id: 'zig', name: 'THE SUNKEN ZIGGURAT', x: 4, z: -2, r: 15 },
  { id: 'skiff', name: 'WRECK OF THE DAWNSKIFF', x: -52, z: -28, r: 13 },
  { id: 'oasis', name: 'SALTGLASS OASIS', x: -26, z: 24, r: 16 },
  { id: 'bazaar', name: 'BAZAAR OF AWNINGS', x: 40, z: 32, r: 14 },
  { id: 'fort', name: 'FORT CINDER', x: 44, z: -38, r: 15 },
  { id: 'bones', name: 'THE BONEYARD', x: -8, z: -62, r: 13 },
  { id: 'canyon', name: 'GLASSFALL CANYON', x: 68, z: -2, r: 15 },
  { id: 'steps', name: "PILGRIM'S STEPS", x: -66, z: 10, r: 12 },
  { id: 'mills', name: 'WINDMILL RIDGE', x: 10, z: 62, r: 13 },
  { id: 'well', name: 'LAST WELL', x: -42, z: 60, r: 12 },
  // three hamlets: houses with doors, which is where you go to not be seen
  { id: 'cinder', name: 'CINDER HAMLET', x: 36, z: -4, r: 13, hamlet: true },
  { id: 'dust', name: 'DUSTWATCH', x: -30, z: -8, r: 13, hamlet: true },
  { id: 'salt', name: 'SALTROW', x: -2, z: 40, r: 13, hamlet: true },
];
const P = Object.fromEntries(POIS.map((p) => [p.id, p]));
const LINKS = [['zig', 'fort'], ['zig', 'bazaar'], ['zig', 'oasis'], ['zig', 'skiff'], ['zig', 'bones'], ['zig', 'mills'],
  ['oasis', 'well'], ['well', 'mills'], ['mills', 'bazaar'], ['bazaar', 'canyon'], ['canyon', 'fort'], ['fort', 'bones'],
  ['bones', 'skiff'], ['skiff', 'steps'], ['steps', 'oasis'],
  ['zig', 'cinder'], ['cinder', 'canyon'], ['zig', 'dust'], ['dust', 'steps'], ['oasis', 'salt'], ['salt', 'mills']];
export const ROADS = LINKS.map(([a, b]) => [P[a].x, P[a].z, P[b].x, P[b].z]);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, k) => a + (b - a) * k;

function roadDist(dx, dz) {
  let best = 1e9;
  for (const [ax, az, bx, bz] of ROADS) {
    const ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((dx - ax) * ex + (dz - az) * ez) / (ex * ex + ez * ez)));
    best = Math.min(best, Math.hypot(dx - ax - ex * t, dz - az - ez * t));
  }
  return best;
}
function poiDist(dx, dz) {
  let best = 1e9, who = null;
  for (const p of POIS) {
    const d = Math.hypot(dx - p.x, dz - p.z) - p.r;
    if (d < best) { best = d; who = p; }
  }
  return { d: best, p: who };
}

/** The ground, in coordinates relative to the isle's centre. One function
 *  feeds the mesh and the collision so they cannot disagree. */
function localHeight(dx, dz) {
  const d = Math.hypot(dx, dz);
  // dunes: long ridges that bend, with a smaller chop across them
  let h = PAD_H + Math.sin(dx * 0.07 + Math.sin(dz * 0.05) * 1.8) * 1.0
    + Math.sin(dz * 0.11 + dx * 0.03) * 0.5 + Math.sin((dx - dz) * 0.19) * 0.2;
  // built ground is level
  const pd = poiDist(dx, dz).d;
  h = lerp(h, PAD_H, smooth(5, -1, pd));
  h = lerp(h, lerp(h, PAD_H, 0.6), smooth(3.2, 1.2, roadDist(dx, dz)));
  // the oasis is a bowl with water in it
  const od = Math.hypot(dx - P.oasis.x, dz - P.oasis.z);
  h = lerp(h, 0.6, smooth(10.5, 5.5, od));
  // and the world ends in a cliff
  if (d > ISLE_R) h = lerp(h, PAD_H, 0.5) - (d - ISLE_R) * 7;
  else h = lerp(h, PAD_H, smooth(ISLE_R - 10, ISLE_R, d) * 0.6);
  return h;
}
export const isleHeight = (x, z) => localHeight(x - ROYALE_CX, z - ROYALE_CZ);

// ------------------------------------------------------------------ shaders ---
const NOISE = /* glsl */`
float rhash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rhash(i), rhash(i + vec2(1.0, 0.0)), f.x), mix(rhash(i + vec2(0.0, 1.0)), rhash(i + vec2(1.0, 1.0)), f.x), f.y); }
float rfbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * rnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;
// every arena shader writes sRGB-looking colours; this hands them to three's
// own tone-map and colour-space chunks so they are right with or without post
const OUT = /* glsl */`
  gl_FragColor.rgb = pow(max(gl_FragColor.rgb, 0.0), vec3(2.2));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const SKY_FRAG = /* glsl */`
uniform float uTime; varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 zen = vec3(0.09, 0.06, 0.25), mid = vec3(0.42, 0.19, 0.52), low = vec3(1.0, 0.47, 0.32), hor = vec3(1.0, 0.82, 0.55);
  vec3 c = mix(hor, low, smoothstep(0.0, 0.10, h));
  c = mix(c, mid, smoothstep(0.06, 0.36, h));
  c = mix(c, zen, smoothstep(0.30, 0.88, h));
  c = mix(c, vec3(0.90, 0.60, 0.52), smoothstep(0.0, -0.22, h));
  vec3 sd = normalize(vec3(-0.78, 0.115, 0.44));
  float sdot = max(dot(d, sd), 0.0);
  c += vec3(1.0, 0.70, 0.40) * pow(sdot, 26.0) * 0.55;
  c += vec3(1.0, 0.94, 0.80) * smoothstep(0.9982, 0.9993, sdot) * 1.6;
  vec2 uv = d.xz / (abs(d.y) + 0.22);
  float cl = rfbm(uv * vec2(1.1, 3.4) + vec2(uTime * 0.006, 0.0));
  float band = smoothstep(0.46, 0.74, cl) * smoothstep(0.0, 0.10, h) * (1.0 - smoothstep(0.34, 0.72, h));
  c = mix(c, mix(vec3(0.86, 0.42, 0.52), vec3(1.0, 0.86, 0.66), pow(sdot, 3.0)), band * 0.8);
  vec2 sp = d.xz / (d.y + 0.42) * 96.0;
  float sid = rhash(floor(sp));
  float star = step(0.9966, sid) * smoothstep(0.34, 0.8, h) * (0.55 + 0.45 * sin(uTime * 2.0 + sid * 40.0));
  c += vec3(1.0, 0.96, 0.9) * star;
  gl_FragColor = vec4(c, 1.0);
  ${OUT}
}`;

const CLOUD_FRAG = /* glsl */`
uniform float uTime; varying vec3 vWp;
${NOISE}
void main(){
  vec2 p = vWp.xz;
  float a = rfbm(p * 0.018 + vec2(uTime * 0.010, uTime * 0.004));
  float b = rfbm(p * 0.052 - vec2(uTime * 0.018, 0.0));
  float n = a * 0.68 + b * 0.32;
  vec3 c = mix(vec3(0.33, 0.20, 0.46), vec3(0.98, 0.60, 0.50), smoothstep(0.30, 0.62, n));
  c = mix(c, vec3(1.0, 0.90, 0.76), smoothstep(0.62, 0.86, n));
  float dist = distance(p, cameraPosition.xz);
  c = mix(c, vec3(1.0, 0.72, 0.50), smoothstep(160.0, 620.0, dist));
  gl_FragColor = vec4(c, 1.0);
  ${OUT}
}`;

const WALL_FRAG = /* glsl */`
uniform float uTime; varying vec2 vUv;
${NOISE}
void main(){
  float y = vUv.y;
  float streak = rfbm(vec2(vUv.x * 46.0, y * 3.0 - uTime * 0.55));
  float body = pow(1.0 - y, 1.6);
  float flash = step(0.985, rhash(vec2(floor(uTime * 9.0), floor(vUv.x * 28.0)))) * (1.0 - y);
  vec3 c = mix(vec3(0.10, 0.03, 0.26), vec3(0.74, 0.46, 1.0), smoothstep(0.42, 0.9, streak) * (0.55 + 0.45 * (1.0 - y)));
  c += vec3(0.9, 0.8, 1.0) * flash * 1.4;
  float al = clamp(body * (0.62 + 0.38 * streak) + flash * 0.5, 0.0, 0.96);
  gl_FragColor = vec4(c, al);
  ${OUT}
}`;

const WATER_FRAG = /* glsl */`
uniform float uTime; varying vec3 vWp; varying vec2 vUv;
${NOISE}
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float n = rnoise(vWp.xz * 1.6 + uTime * 0.35) * 0.5 + rnoise(vWp.xz * 3.7 - uTime * 0.5) * 0.5;
  vec3 c = mix(vec3(0.07, 0.42, 0.52), vec3(0.20, 0.82, 0.80), smoothstep(0.2, 0.95, r));
  c += vec3(0.75, 1.0, 0.95) * smoothstep(0.72, 0.80, n) * 0.5;
  c = mix(c, vec3(1.0, 0.98, 0.92), smoothstep(0.90, 1.0, r + (n - 0.5) * 0.08) * 0.8);
  c += vec3(1.0, 0.55, 0.30) * pow(n, 6.0) * 0.5;
  gl_FragColor = vec4(c, 0.9);
  ${OUT}
}`;

const VERT_WP = /* glsl */`
varying vec3 vWp; varying vec2 vUv; varying vec3 vDir;
void main(){ vUv = uv; vDir = position; vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp; }`;

export function createRoyaleWorld(scene, terrain, opts = {}) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  const keep = new Set([root, ...(opts.keep || [])]);
  const overworld = scene.children.filter((o) => !o.isLight && !keep.has(o));
  const shown = new Map();

  const U = { uRing: { value: new THREE.Vector3(ROYALE_CX, ROYALE_CZ, 999) }, uTime: { value: 0 } };
  const state = { active: false, built: false, ring: { x: ROYALE_CX, z: ROYALE_CZ, r: ISLE_R + 20 } };
  const circles = [];          // { x, z, r, low }  low = stops feet, not bullets
  const boxes = [];            // { x, z, hw, hd, c, s, low } oriented, world space
  const houses = [];           // { x, z, hw, hd, c, s, inner, outer, centre }
  const roofs = [];            // { mats, i, op } faded while you stand under one
  const lootSpots = [];
  const mesas = [];
  const flames = [], spinners = [], crystals = [];
  let override = null, stash = null;
  let glowTex = null, dome = null, cloudSea = null, wall = null, skiff = null;

  const wx = (dx) => ROYALE_CX + dx, wz = (dz) => ROYALE_CZ + dz;

  // ---- materials: every arena surface carries the Dark in its own shader ----
  const mats = new Map();
  function arenaMat(color, o = {}) {
    const key = `${color}|${o.flat ? 1 : 0}|${o.terrain ? 1 : 0}|${o.vc ? 1 : 0}|${o.side || 0}`;
    if (mats.has(key)) return mats.get(key);
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color), flatShading: !!o.flat, vertexColors: !!o.vc, side: o.side || THREE.FrontSide,
    });
    if (o.terrain) m.defines = { ROYALE_TERRAIN: '' };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRing = U.uRing; sh.uniforms.uTime = U.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n#ifdef ROYALE_TERRAIN\nattribute float aKind; varying float vKind;\n#endif')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 rwp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            rwp = instanceMatrix * rwp;
          #endif
          vWp = (modelMatrix * rwp).xyz;
          #ifdef ROYALE_TERRAIN
            vKind = aKind;
          #endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform vec3 uRing; uniform float uTime; varying vec3 vWp;\n#ifdef ROYALE_TERRAIN\nvarying float vKind;\n#endif\n${NOISE}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          #ifndef ROYALE_TERRAIN
            // plaster and stone are never one flat colour, and a wall is darker
            // where it meets the ground: grain, and a contact shadow, for free
            float mt = rnoise(vWp.xz * 1.9 + vWp.y * 1.4) * 0.65 + rnoise(vWp.xz * 7.0 + vWp.y * 5.0) * 0.35;
            diffuseColor.rgb *= 0.84 + 0.3 * mt;
            diffuseColor.rgb *= mix(0.58, 1.0, smoothstep(${(PAD_H - 0.1).toFixed(2)}, ${(PAD_H + 1.5).toFixed(2)}, vWp.y));
          #else
            float tn = rnoise(vWp.xz * 0.13) * 0.55 + rnoise(vWp.xz * 0.8) * 0.3 + rnoise(vWp.xz * 5.0) * 0.15;
            diffuseColor.rgb *= 0.8 + 0.38 * tn;
          #endif
          #ifdef ROYALE_TERRAIN
            // wind ripples across the sand, and banded strata down the cliff
            float rp = sin(vWp.x * 2.4 + sin(vWp.z * 1.2) * 1.7 + vWp.z * 0.45);
            diffuseColor.rgb *= 0.95 + 0.075 * rp * (1.0 - vKind);
            if (vKind > 0.5) {
              float st = fract(vWp.y * 0.21 + sin(vWp.x * 0.31 + vWp.z * 0.27) * 0.16);
              vec3 sc = st < 0.3 ? vec3(0.33, 0.13, 0.09) : (st < 0.62 ? vec3(0.55, 0.25, 0.14) : vec3(0.74, 0.40, 0.20));
              diffuseColor.rgb = sc * (0.55 + 0.45 * smoothstep(-34.0, 1.0, vWp.y));
            }
          #endif`)
        .replace('#include <opaque_fragment>', `#include <opaque_fragment>
          float rd = distance(vWp.xz, uRing.xy);
          float rk = smoothstep(uRing.z - 0.2, uRing.z + 2.2, rd);
          vec3 dk = gl_FragColor.rgb * vec3(0.24, 0.17, 0.50) + vec3(0.012, 0.004, 0.03);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, dk, rk * 0.94);
          float re = smoothstep(0.85, 0.0, abs(rd - uRing.z));
          gl_FragColor.rgb += vec3(0.55, 0.28, 1.0) * re * (0.5 + 0.25 * sin(uTime * 4.0 + vWp.x * 0.7 + vWp.z * 0.7));`);
    };
    m.customProgramCacheKey = () => `royale|${o.terrain ? 't' : 'p'}`;
    mats.set(key, m);
    return m;
  }
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...o });

  /** Parts gathered per colour and merged: a whole place is a handful of meshes. */
  class Batch {
    constructor() { this.by = new Map(); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
    add(color, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      this.q.setFromEuler(this.e.set(rx, ry, rz));
      geo.applyMatrix4(this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz)));
      if (!this.by.has(color)) this.by.set(color, []);
      this.by.get(color).push(geo.index ? geo.toNonIndexed() : geo);
      return this;
    }
    box(color, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(color, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
    cyl(color, rt, rb, h, x, y, z, seg = 8, ry = 0) { return this.add(color, new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, 0, ry, 0); }
    build(parent = root, shadow = true) {
      const g = new THREE.Group();
      for (const [color, geos] of this.by) {
        const mesh = new THREE.Mesh(mergeGeometries(geos), arenaMat(color, { flat: true }));
        mesh.castShadow = shadow; mesh.receiveShadow = true;
        g.add(mesh);
      }
      parent.add(g);
      return g;
    }
  }

  // ---- collision -----------------------------------------------------------
  const addCircle = (x, z, r, low = false) => circles.push({ x, z, r, low });
  function addBox(x, z, hw, hd, ang = 0, low = false) { boxes.push({ x, z, hw, hd, c: Math.cos(ang), s: Math.sin(ang), low }); }
  function hit(x, z, pad, shots) {
    for (const o of circles) {
      if (shots && o.low) continue;
      const dx = x - o.x, dz = z - o.z, rr = o.r + pad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    for (const b of boxes) {
      if (shots && b.low) continue;
      const dx = x - b.x, dz = z - b.z;
      const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c;
      if (Math.abs(lx) < b.hw + pad && Math.abs(lz) < b.hd + pad) return true;
    }
    return false;
  }
  const blocked = (x, z, pad = 0) => hit(x, z, pad, false);
  /** Does this point stop a round? Low props (cacti, pots) do not. */
  const shotBlocked = (x, z) => hit(x, z, -0.05, true);
  const onIsle = (x, z) => Math.hypot(x - ROYALE_CX, z - ROYALE_CZ) < ISLE_R - 1.4;
  const dry = (x, z) => isleHeight(x, z) > WATER_Y - 0.25;
  const walkable = (x, z) => onIsle(x, z) && dry(x, z) && !hit(x, z, 0.34, false);
  /** Which house is this point inside, or -1. */
  function houseAt(x, z) {
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i], dx = x - h.x, dz = z - h.z;
      if (Math.abs(dx * h.c + dz * h.s) < h.hw && Math.abs(-dx * h.s + dz * h.c) < h.hd) return i;
    }
    return -1;
  }
  /** Is there a clear line between two points? What a bot asks before firing. */
  function losClear(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.7));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (shotBlocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function addGlow(parent, x, y, z, size, color, flicker = true) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(color), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sp.scale.setScalar(size); sp.position.set(x, y, z);
    parent.add(sp);
    if (flicker) flames.push({ sp, base: size, ph: Math.random() * 6.28 });
    return sp;
  }
  function addPool(x, y, z, r, color, op = 0.34) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(color), transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false }));
    pool.position.set(x, y + 0.07, z);
    root.add(pool);
  }

  // ---- the land --------------------------------------------------------------
  function buildGround() {
    const size = (ISLE_R + 12) * 2, seg = 170;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3), kind = new Float32Array(pos.count);
    const sand = new THREE.Color('#e6ba78'), crest = new THREE.Color('#f4d39a'), road = new THREE.Color('#c29058');
    const pave = new THREE.Color('#d8b98c'), red = new THREE.Color('#cf7a4c'), grass = new THREE.Color('#7fae4f');
    const wet = new THREE.Color('#b08a5c'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i), dz = pos.getZ(i);
      const h = localHeight(dx, dz), d = Math.hypot(dx, dz);
      pos.setY(i, h);
      c.copy(sand).lerp(crest, smooth(PAD_H + 0.2, PAD_H + 1.4, h));
      c.lerp(red, smooth(34, 12, Math.hypot(dx - P.canyon.x, dz - P.canyon.z)) * 0.85);
      c.lerp(road, smooth(2.6, 1.0, roadDist(dx, dz)) * 0.8);
      const pd = poiDist(dx, dz);
      if (pd.p.id !== 'oasis' && pd.p.id !== 'canyon' && pd.p.id !== 'bones') c.lerp(pave, smooth(1.5, -3, pd.d) * 0.75);
      const od = Math.hypot(dx - P.oasis.x, dz - P.oasis.z);
      c.lerp(grass, smooth(20, 12, od) * 0.9);
      c.lerp(wet, smooth(11, 8, od));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      kind[i] = d > ISLE_R + 0.3 ? 1 : 0;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, arenaMat('#ffffff', { terrain: true, vc: true }));
    mesh.position.set(ROYALE_CX, 0, ROYALE_CZ);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);

    // the underside: rock hanging into the cloud, so the isle visibly FLOATS
    const under = new Batch();
    const rnd = mulberry(77);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2, d = ISLE_R * (0.25 + rnd() * 0.7);
      const r = 9 + rnd() * 14, h = 22 + rnd() * 34;
      under.add(['#5a2a1c', '#6e3520', '#4a2018'][i % 3], new THREE.ConeGeometry(r, h, 6),
        wx(Math.sin(a) * d), -6 - h / 2, wz(Math.cos(a) * d), Math.PI, rnd() * 6, 0);
    }
    under.build(root, false);

    const water = new THREE.Mesh(new THREE.CircleGeometry(11.5, 40).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT_WP, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false }));
    water.position.set(wx(P.oasis.x), WATER_Y, wz(P.oasis.z));
    root.add(water);
  }

  function buildSky() {
    dome = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 20),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT_WP, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
    dome.renderOrder = -20; dome.frustumCulled = false;
    root.add(dome);
    cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT_WP, fragmentShader: CLOUD_FRAG, fog: false }));
    cloudSea.position.set(ROYALE_CX, -38, ROYALE_CZ);
    cloudSea.frustumCulled = false;
    root.add(cloudSea);
    wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT_WP, fragmentShader: WALL_FRAG, transparent: true,
        side: THREE.DoubleSide, depthWrite: false, fog: false }));
    wall.renderOrder = 6; wall.frustumCulled = false;
    root.add(wall);
  }

  // ---- scatter ---------------------------------------------------------------
  const clearOf = (dx, dz, poiPad, roadPad) => Math.hypot(dx, dz) < ISLE_R - 5
    && poiDist(dx, dz).d > poiPad && roadDist(dx, dz) > roadPad;
  const spot = (rnd, minD = 0, maxD = ISLE_R - 5) => {
    const a = rnd() * Math.PI * 2, d = minD + Math.sqrt(rnd()) * (maxD - minD);
    return [Math.sin(a) * d, Math.cos(a) * d];
  };

  /** A mesa: flat-topped rock in three bands, the silhouette of a canyon. */
  function mesa(b, dx, dz, r, h, rnd) {
    const y0 = localHeight(dx, dz) - 0.3;
    const tiers = 3, cols = ['#a94f30', '#c9703f', '#e09a58'];
    for (let t = 0; t < tiers; t++) {
      const th = h / tiers, rr = r * (1 - t * 0.14);
      b.add(cols[t], new THREE.CylinderGeometry(rr * 0.9, rr, th, 7 + (t % 2)), wx(dx), y0 + th * (t + 0.5), wz(dz), 0, rnd() * 6, 0);
    }
    addCircle(wx(dx), wz(dz), r * 0.93);
    mesas.push({ x: dx, z: dz, r });
  }

  function buildScatter(rnd) {
    const rock = new Batch();
    // the canyon: a ring of mesas with a way through
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, d = 8 + (i % 3) * 3.4;
      if (i === 2 || i === 7) continue;                      // the two mouths
      mesa(rock, P.canyon.x + Math.sin(a) * d, P.canyon.z + Math.cos(a) * d, 2.6 + rnd() * 1.8, 2.4 + rnd() * 2.0, rnd);
    }
    for (let tries = 0, n = 0; tries < 500 && n < 16; tries++) {
      const [dx, dz] = spot(rnd, 14);
      if (!clearOf(dx, dz, 5, 5) || blocked(wx(dx), wz(dz), 5)) continue;
      mesa(rock, dx, dz, 2.2 + rnd() * 2.6, 2.0 + rnd() * 2.2, rnd); n++;
    }
    rock.build();

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const YUP = new THREE.Vector3(0, 1, 0), C = (h) => new THREE.Color(h);
    const set = (mesh, i, x, y, z, sx, sy, sz, ry, col) => {
      q.setFromAxisAngle(YUP, ry);
      mesh.setMatrixAt(i, m.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
      if (col) mesh.setColorAt(i, col);
    };
    const done = (mesh) => { if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.finalize(); root.add(mesh); };
    const scatter = (count, minD, poiPad, roadPad, pad, fn) => {
      const out = [];
      for (let tries = 0; tries < count * 14 && out.length < count; tries++) {
        const [dx, dz] = spot(rnd, minD);
        if (!clearOf(dx, dz, poiPad, roadPad) || !dry(wx(dx), wz(dz)) || blocked(wx(dx), wz(dz), pad)) continue;
        out.push(fn(dx, dz));
      }
      return out;
    };

    const boulders = scatter(90, 6, 1, 1.6, 1.4, (dx, dz) => {
      const s = 0.6 + rnd() * 1.3;
      addCircle(wx(dx), wz(dz), 0.58 * s);
      return { x: wx(dx), z: wz(dz), y: localHeight(dx, dz), s, rot: rnd() * 6, k: rnd() };
    });
    const bm = new ChunkedInstanced(new THREE.IcosahedronGeometry(0.62, 0), arenaMat('#ffffff', { flat: true }), boulders, 48).setShadows(true, true);
    const bc = ['#b06a44', '#c98452', '#96583a'].map(C);
    boulders.forEach((r, i) => set(bm, i, r.x, r.y + r.s * 0.26, r.z, r.s * 1.3, r.s * 0.78, r.s * 1.1, r.rot, bc[Math.floor(r.k * 3) % 3]));
    done(bm);

    // cacti: a trunk and two arms as ONE geometry, so a whole stand is one draw
    const cg = mergeGeometries([
      new THREE.CylinderGeometry(0.2, 0.24, 1.9, 7).translate(0, 0.95, 0),
      new THREE.SphereGeometry(0.2, 7, 5).translate(0, 1.9, 0),
      new THREE.CylinderGeometry(0.11, 0.11, 0.5, 6).rotateZ(Math.PI / 2).translate(0.36, 0.9, 0),
      new THREE.CylinderGeometry(0.11, 0.12, 0.7, 6).translate(0.6, 1.24, 0),
      new THREE.CylinderGeometry(0.1, 0.1, 0.42, 6).rotateZ(Math.PI / 2).translate(-0.32, 1.2, 0),
      new THREE.CylinderGeometry(0.1, 0.11, 0.5, 6).translate(-0.52, 1.44, 0),
    ].map((g) => g.toNonIndexed()));
    const cacti = scatter(80, 8, 2, 2.2, 1.2, (dx, dz) => {
      addCircle(wx(dx), wz(dz), 0.34, true);
      return { x: wx(dx), z: wz(dz), y: localHeight(dx, dz), s: 0.8 + rnd() * 0.7, rot: rnd() * 6, k: rnd() };
    });
    const cm = new ChunkedInstanced(cg, arenaMat('#ffffff', { flat: true }), cacti, 48).setShadows(true, false);
    const cc = ['#4f8f5a', '#3f7a4c', '#62a468'].map(C);
    cacti.forEach((r, i) => set(cm, i, r.x, r.y - 0.05, r.z, r.s, r.s, r.s, r.rot, cc[Math.floor(r.k * 3) % 3]));
    done(cm);

    // dead trees: bleached, forked
    const tg = mergeGeometries([
      new THREE.CylinderGeometry(0.1, 0.2, 2.2, 6).translate(0, 1.1, 0),
      new THREE.CylinderGeometry(0.05, 0.09, 1.3, 5).rotateZ(-0.8).translate(0.5, 2.3, 0),
      new THREE.CylinderGeometry(0.05, 0.09, 1.1, 5).rotateZ(0.9).translate(-0.45, 2.1, 0.1),
      new THREE.CylinderGeometry(0.04, 0.07, 0.9, 5).rotateX(0.8).translate(0, 2.45, 0.35),
    ].map((g) => g.toNonIndexed()));
    const trees = scatter(30, 10, 3, 2.4, 1.6, (dx, dz) => {
      addCircle(wx(dx), wz(dz), 0.3);
      return { x: wx(dx), z: wz(dz), y: localHeight(dx, dz), s: 0.9 + rnd() * 0.7, rot: rnd() * 6 };
    });
    const tm = new ChunkedInstanced(tg, arenaMat('#cbb79a', { flat: true }), trees, 48).setShadows(true, false);
    trees.forEach((r, i) => set(tm, i, r.x, r.y - 0.1, r.z, r.s, r.s, r.s, r.rot));
    done(tm);

    // dry grass: crossed cut-out planes
    const gc = document.createElement('canvas'); gc.width = gc.height = 32;
    const gx = gc.getContext('2d');
    for (let i = 0; i < 22; i++) {
      const x = 2 + rnd() * 28, hgt = 10 + rnd() * 20;
      gx.strokeStyle = ['#e9c66a', '#d8a84e', '#f3dc8e', '#c9963e'][i % 4]; gx.lineWidth = 1.6;
      gx.beginPath(); gx.moveTo(x, 32); gx.quadraticCurveTo(x + (rnd() - 0.5) * 8, 32 - hgt * 0.6, x + (rnd() - 0.5) * 12, 32 - hgt); gx.stroke();
    }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const tuftGeo = mergeGeometries([new THREE.PlaneGeometry(1, 1), new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2)]);
    const tufts = scatter(1300, 6, 0.5, 1.4, 0.6, (dx, dz) => ({ x: wx(dx), z: wz(dz), y: localHeight(dx, dz), s: 0.55 + rnd() * 0.6 }));
    const um = new ChunkedInstanced(tuftGeo, new THREE.MeshLambertMaterial({ map: gt, alphaTest: 0.4, side: THREE.DoubleSide }), tufts, 48);
    tufts.forEach((t, i) => set(um, i, t.x, t.y + t.s * 0.42, t.z, t.s, t.s, t.s, (i * 0.37) % Math.PI));
    done(um);

    // emberglass: the one cold colour on the isle, and it glows
    const cgeo = new THREE.OctahedronGeometry(0.5, 0);
    const cmat = basic('#63f2e2');
    const cl = scatter(20, 12, 2, 2, 2.2, (dx, dz) => [dx, dz]);
    for (let i = 0; i < 9; i++) cl.push([P.canyon.x + (rnd() - 0.5) * 12, P.canyon.z + (rnd() - 0.5) * 12]);
    for (const [dx, dz] of cl) {
      if (blocked(wx(dx), wz(dz), 1.2)) continue;
      const g = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const s = new THREE.Mesh(cgeo, cmat);
        const hh = 0.9 + rnd() * 1.6;
        s.scale.set(0.5 + rnd() * 0.4, hh, 0.5 + rnd() * 0.4);
        s.position.set((rnd() - 0.5) * 0.9, hh * 0.42, (rnd() - 0.5) * 0.9);
        s.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5);
        g.add(s);
      }
      g.position.set(wx(dx), localHeight(dx, dz), wz(dz));
      addGlow(g, 0, 1.1, 0, 4.2, '#4fe8d8', false);
      root.add(g);
      addPool(wx(dx), localHeight(dx, dz), wz(dz), 3.4, '#4fe8d8', 0.3);
      addCircle(wx(dx), wz(dz), 0.75);
      crystals.push({ g, ph: rnd() * 6.28 });
    }
  }

  /** A lamp: a post and a lit pane. Marks the roads at dusk. */
  function lamp(b, dx, dz) {
    const x = wx(dx), z = wz(dz), y = localHeight(dx, dz);
    b.cyl('#5a4634', 0.07, 0.09, 2.3, x, y + 1.15, z, 6).box('#3a3028', 0.34, 0.08, 0.34, x, y + 2.34, z)
      .box('#3a3028', 0.4, 0.07, 0.4, x, y + 2.76, z);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), basic('#ffcf7a'));
    pane.position.set(x, y + 2.55, z);
    root.add(pane);
    addGlow(root, x, y + 2.55, z, 2.6, '#ffb45c');
    addPool(x, y, z, 3.2, '#ffb45c', 0.3);
    addCircle(x, z, 0.16, true);
  }

  // ---- houses ----------------------------------------------------------------
  // A HOUSE YOU CAN GO INTO. Four walls, a door, a window in the other three
  // (a sill stops feet and lets a round through, so you can shoot out of one),
  // and a roof that fades when you are under it. From outside the roof is
  // solid, and whoever is inside cannot be seen: that is what a house is for.
  function house(b, X, Z, w, d, ang, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), H = 2.4, T = 0.3, y0 = PAD_H;
    const W = (lx, lz) => [X + lx * c - lz * s, Z + lx * s + lz * c];
    const wallC = o.wall || '#e2c08c', trim = '#b98a56';
    const run = (ax, fixed, a0, a1, low) => {                  // along local x (0) or z (1)
      const len = a1 - a0, mid = (a0 + a1) / 2;
      const [px, pz] = ax === 0 ? W(mid, fixed) : W(fixed, mid);
      const sx = ax === 0 ? len : T, sz = ax === 0 ? T : len;
      if (low) {
        b.box(wallC, sx, 0.95, sz, px, y0 + 0.475, pz, -ang)
          .box(trim, sx + (ax ? 0.14 : 0), 0.1, sz + (ax ? 0 : 0.14), px, y0 + 1.0, pz, -ang)
          .box(wallC, sx, 0.6, sz, px, y0 + H - 0.3, pz, -ang);
      } else b.box(wallC, sx, H, sz, px, y0 + H / 2, pz, -ang);
      b.box('#6e4a2c', sx + 0.1, 0.12, sz + 0.1, px, y0 + H + 0.02, pz, -ang);
      addBox(px, pz, sx / 2, sz / 2, ang, !!low);
    };
    const windowed = (ax, fixed, half) => { run(ax, fixed, -half, -0.75); run(ax, fixed, -0.75, 0.75, true); run(ax, fixed, 0.75, half); };
    windowed(0, -d / 2, w / 2);
    windowed(1, -w / 2, d / 2); windowed(1, w / 2, d / 2);
    run(0, d / 2, -w / 2, -1.0); run(0, d / 2, 1.0, w / 2);     // the front, with the door
    { const [px, pz] = W(0, d / 2); b.box(trim, 2.3, 0.4, T + 0.08, px, y0 + H - 0.2, pz, -ang); }
    b.box('#8a6238', w, 0.1, d, X, y0 + 0.05, Z, -ang).box(o.rug || '#b8432f', w * 0.5, 0.03, d * 0.42, X, y0 + 0.115, Z, -ang)
      .box('#f0e2c4', w * 0.5 - 0.3, 0.035, d * 0.42 - 0.3, X, y0 + 0.118, Z, -ang).box(o.rug || '#b8432f', w * 0.5 - 0.6, 0.04, d * 0.42 - 0.6, X, y0 + 0.12, Z, -ang);
    for (let i = 1; i < 6; i++) { const [px, pz] = W(-w / 2 + (w / 6) * i, 0); b.box('#6e4a2c', 0.05, 0.11, d - 0.3, px, y0 + 0.052, pz, -ang); }
    { const [px, pz] = W(w / 2 - 1.0, -d / 2 + 0.75); b.box('#a94f30', 1.5, 0.5, 0.8, px, y0 + 0.35, pz, -ang).box('#f0e2c4', 1.4, 0.12, 0.7, px, y0 + 0.62, pz, -ang); addBox(px, pz, 0.75, 0.4, ang, true); }
    { const [px, pz] = W(-w / 2 + 0.95, -d / 2 + 0.95); b.box('#8a6238', 0.9, 0.8, 0.9, px, y0 + 0.5, pz, -ang + 0.3); addCircle(px, pz, 0.55, true); }
    { const [px, pz] = W(1.9, d / 2 + 0.7); b.cyl('#a94f30', 0.3, 0.36, 0.7, px, y0 + 0.35, pz, 8); addCircle(px, pz, 0.36, true); }
    const rb = new Batch();
    const roofC = o.roof || '#9a5238';
    rb.box('#5a3a22', w + 0.8, 0.16, d + 0.8, X, y0 + H + 0.1, Z, -ang)
      .add(roofC, new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4), X, y0 + H + 0.18 + 0.5, Z, 0, -ang, 0, (w + 1.0) / 1.414, 1.0, (d + 1.0) / 1.414)
      .box('#5a3a22', 0.5, 0.9, 0.5, ...((q) => [q[0], y0 + H + 0.7, q[1]])(W(w * 0.24, -d * 0.2)), -ang)
      .box(roofC, 2.6, 0.1, 1.2, ...((q) => [q[0], y0 + H - 0.5, q[1]])(W(0, d / 2 + 0.6)), -ang, 0, 0);
    const rg = rb.build(root, false);
    const mats = [];
    rg.traverse((m) => {
      if (!m.isMesh) return;
      const base = m.material, mm = base.clone();
      mm.onBeforeCompile = base.onBeforeCompile; mm.customProgramCacheKey = base.customProgramCacheKey;
      mm.transparent = true; m.material = mm; m.renderOrder = 3; mats.push(mm);
    });
    const pt = (lx, lz) => { const [x, z] = W(lx, lz); return { x, z }; };
    roofs.push({ mats, i: houses.length, op: 1 });
    houses.push({ x: X, z: Z, hw: w / 2, hd: d / 2, c, s, inner: pt(0, d / 2 - 0.95), outer: pt(0, d / 2 + 1.35), centre: pt(0.4, -0.3) });
    for (const [lx, lz] of [[w / 4, -d / 4], [-w / 4, d / 5]]) lootSpots.push({ ...pt(lx, lz), poi: o.poi || null, house: true });
  }

  function buildHamlet(p, rnd) {
    const b = new Batch(), X = wx(p.x), Z = wz(p.z);
    const roofsC = ['#9a5238', '#5f7a86', '#b8683a', '#7a8450'];
    for (let i = 0; i < 4; i++) {
      const A = Math.PI / 4 + i * Math.PI / 2 + (rnd() - 0.5) * 0.2, d = 8.4;
      // the door looks at the yard
      house(b, X + Math.sin(A) * d, Z + Math.cos(A) * d, 5.4 + (i % 2) * 0.8, 4.4, Math.PI - A,
        { roof: roofsC[(i + p.name.length) % 4], rug: roofsC[(i + 1) % 4], poi: p.id });
    }
    // the yard: a well-lamp and things to crouch behind
    for (let i = 0; i < 5; i++) {
      const a = rnd() * 6.28, d = 1.6 + rnd() * 3.4;
      const x = X + Math.sin(a) * d, z = Z + Math.cos(a) * d;
      if (i % 2) { b.box('#8a6238', 1.0, 0.9, 1.0, x, PAD_H + 0.45, z, rnd() * 3); addCircle(x, z, 0.62, true); }
      else { b.cyl('#a94f30', 0.36, 0.42, 0.9, x, PAD_H + 0.45, z, 8); addCircle(x, z, 0.42, true); }
    }
    lamp(b, p.x + 0.2, p.z - 0.2);
    b.build();
    ringSpots(p, 6, 1, 6, rnd);
  }

  // ---- the places ------------------------------------------------------------
  function ringSpots(p, n, r0, r1, rnd) {
    for (let i = 0, t = 0; i < n && t < n * 12; t++) {
      const a = rnd() * Math.PI * 2, d = r0 + rnd() * (r1 - r0);
      const x = wx(p.x + Math.sin(a) * d), z = wz(p.z + Math.cos(a) * d);
      if (!walkable(x, z) || blocked(x, z, 0.9)) continue;
      lootSpots.push({ x, z, poi: p.id }); i++;
    }
  }

  function buildZiggurat(rnd) {
    const p = P.zig, b = new Batch(), X = wx(p.x), Z = wz(p.z);
    const tiers = [[18, '#d9b27c'], [13.6, '#c99c66'], [9.2, '#d9b27c'], [5, '#c99c66']];
    tiers.forEach(([w, c], i) => {
      b.box(c, w, 1.7, w, X, PAD_H + 0.85 + i * 1.7, Z).box('#b98a56', w + 0.4, 0.22, w + 0.4, X, PAD_H + 1.7 + i * 1.7, Z);
    });
    for (let s = 0; s < 4; s++) {                              // a stair up each face
      const a = (s / 4) * Math.PI * 2;
      for (let k = 0; k < 12; k++) {
        const d = 9.6 - k * 0.56;
        b.box('#e8c898', 2.6, 0.28, 0.6, X + Math.sin(a) * d, PAD_H + 0.3 + k * 0.42, Z + Math.cos(a) * d, a);
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {     // corner obelisks
      const ox = X + sx * 12.5, oz = Z + sz * 12.5;
      b.add('#c99c66', new THREE.CylinderGeometry(0.34, 0.6, 4.6, 4), ox, PAD_H + 2.3, oz, 0, Math.PI / 4)
        .add('#f0c060', new THREE.ConeGeometry(0.5, 0.8, 4), ox, PAD_H + 5.0, oz, 0, Math.PI / 4);
      addCircle(ox, oz, 0.62);
    }
    b.cyl('#3a3028', 1.0, 0.7, 0.7, X, PAD_H + 7.2, Z, 8);
    b.build();
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.0, 7), basic('#ffb04a'));
    fire.position.set(X, PAD_H + 8.4, Z);
    root.add(fire);
    flames.push({ sp: fire, base: 1, ph: 1.3, mesh: true });
    addGlow(root, X, PAD_H + 8.6, Z, 13, '#ff9a3c');
    addBox(X, Z, 9.1, 9.1);
    ringSpots(p, 12, 10.5, 15, rnd);
  }

  function buildWreck(rnd) {
    const p = P.skiff, b = new Batch(), X = wx(p.x), Z = wz(p.z), ang = 0.55;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const W = (lx, lz) => [X + lx * ca - lz * sa, Z + lx * sa + lz * ca];
    for (let i = 0; i < 10; i++) {                             // the ribs of the hull
      const t = i - 4.5, w = 3.2 * (1 - Math.abs(t) / 7), [px, pz] = W(t * 1.6, 0);
      b.box(i % 2 ? '#6e4a2c' : '#7d5634', 0.22, 2.2 + w * 0.3, w * 2, px, PAD_H + 0.9, pz, -ang, 0, 0.22);
    }
    { const [px, pz] = W(0, 0); b.box('#523620', 16, 0.5, 1.2, px, PAD_H + 0.2, pz, -ang); }
    { const [px, pz] = W(-2, 0.4); b.box('#8a6238', 9, 0.16, 3.4, px, PAD_H + 1.5, pz, -ang, 0, 0.12); }
    { const [px, pz] = W(2.5, 0); b.cyl('#5f4326', 0.18, 0.24, 5.5, px, PAD_H + 3.2, pz, 6).box('#5f4326', 0.16, 0.16, 4.2, px, PAD_H + 4.6, pz, -ang + 1.2); }
    // what is left of the balloon, draped over the stern
    for (let i = 0; i < 4; i++) {
      const [px, pz] = W(-6.5 - i * 1.5, (i % 2 ? 1 : -1) * 1.2);
      b.add(i % 2 ? '#e9dcc0' : '#d9483b', new THREE.SphereGeometry(2.4, 9, 6), px, PAD_H + 0.9, pz, 0, i, 0, 1, 0.42, 0.8);
    }
    b.build();
    addBox(X, Z, 8.2, 2.0, ang);
    ringSpots(p, 10, 3.5, 12, rnd);
  }

  function buildOasis(rnd) {
    const p = P.oasis, grove = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2, d = 11.6 + rnd() * 4.5;
      const dx = p.x + Math.sin(a) * d, dz = p.z + Math.cos(a) * d;
      const palm = buildPalm(rnd);
      palm.position.set(wx(dx), localHeight(dx, dz), wz(dz));
      palm.rotation.y = rnd() * 6; palm.scale.setScalar(1.05 + rnd() * 0.35);
      palm.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      grove.add(palm);
      addCircle(wx(dx), wz(dz), 0.34);
    }
    root.add(grove);
    bakeStatic(grove);
    const b = new Batch();
    for (let i = 0; i < 4; i++) {                              // nomad tents
      const a = 0.6 + i * 1.5, d = 14.5;
      const x = wx(p.x + Math.sin(a) * d), z = wz(p.z + Math.cos(a) * d), y = PAD_H;
      b.add(['#d9483b', '#3b8fd9', '#e0a52e', '#5cb85c'][i], new THREE.ConeGeometry(2.0, 2.4, 6), x, y + 1.2, z, 0, i)
        .add('#f0e2c4', new THREE.ConeGeometry(2.06, 0.5, 6), x, y + 0.26, z, 0, i).cyl('#5f4326', 0.05, 0.05, 0.7, x, y + 2.7, z, 5);
      addCircle(x, z, 1.7);
    }
    b.build();
    ringSpots(p, 10, 12, 17, rnd);
  }

  function buildBazaar(rnd) {
    const p = P.bazaar, b = new Batch();
    const cloth = ['#d9483b', '#3b8fd9', '#e0a52e', '#5cb85c', '#b25cd9', '#e87a3c'];
    let n = 0;
    for (let row = -1; row <= 1; row += 2) {
      for (let i = -2; i <= 2; i++) {
        const x = wx(p.x + i * 4.6), z = wz(p.z + row * 4.4), y = PAD_H;
        for (const [ox, oz] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]) b.cyl('#6e4a2c', 0.07, 0.07, 2.5, x + ox, y + 1.25, z + oz, 5);
        b.box(cloth[n % cloth.length], 3.4, 0.1, 2.6, x, y + 2.55, z, 0, row * 0.16)
          .box('#f0e2c4', 3.4, 0.11, 0.5, x, y + 2.42 - row * 0.02, z + row * 1.25, 0, row * 0.16)
          .box('#8a6238', 2.6, 0.9, 0.8, x, y + 0.45, z - row * 0.4)
          .box(cloth[(n + 2) % cloth.length], 2.2, 0.04, 1.3, x, y + 0.03, z + row * 1.3);
        for (let k = 0; k < 3; k++) b.cyl(['#c9703f', '#a94f30', '#e0a52e'][k], 0.16, 0.2, 0.36, x - 0.8 + k * 0.8, y + 1.08, z - row * 0.4, 7);
        addBox(x, z - row * 0.4, 1.3, 0.42);
        n++;
      }
    }
    house(b, wx(p.x - 3), wz(p.z + 10.4), 6, 4.2, Math.PI, { roof: '#5f7a86', poi: p.id });
    house(b, wx(p.x + 3), wz(p.z - 10.4), 6, 4.2, 0, { roof: '#b8683a', poi: p.id });
    b.build();
    for (let i = -2; i <= 2; i++) addGlow(root, wx(p.x + i * 4.6), PAD_H + 2.2, wz(p.z), 2.2, ['#ffb45c', '#ff8a5c', '#ffd27a'][(i + 2) % 3]);
    ringSpots(p, 12, 1.5, 13, rnd);
  }

  function buildFort(rnd) {
    const p = P.fort, b = new Batch(), X = wx(p.x), Z = wz(p.z), H = 3.4, S = 11;
    const wallSeg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0);
      const cx = X + (x0 + x1) / 2, cz = Z + (z0 + z1) / 2;
      b.box('#c9a070', len, H, 0.9, cx, PAD_H + H / 2, cz, -a).box('#b98a56', len, 0.3, 1.1, cx, PAD_H + H + 0.1, cz, -a);
      const n = Math.floor(len / 1.4);
      for (let k = 0; k < n; k += 2) {
        const t = (k + 0.5) / n - 0.5;
        b.box('#c9a070', 0.7, 0.55, 1.0, cx + Math.cos(a) * len * t, PAD_H + H + 0.5, cz + Math.sin(a) * len * t, -a);
      }
      addBox(cx, cz, len / 2, 0.5, a);
    };
    // four walls with a gate in the north and the west
    wallSeg(-S, -S, -2.6, -S); wallSeg(2.6, -S, S, -S);
    wallSeg(-S, S, S, S); wallSeg(S, -S, S, S);
    wallSeg(-S, -S, -S, -2.6); wallSeg(-S, 2.6, -S, S);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tx = X + sx * S, tz = Z + sz * S;
      b.cyl('#d9b27c', 1.9, 2.1, 5.6, tx, PAD_H + 2.8, tz, 8).add('#b8432f', new THREE.ConeGeometry(2.4, 2.2, 8), tx, PAD_H + 6.7, tz);
      addCircle(tx, tz, 2.1);
    }
    house(b, X + 3.4, Z + 3.6, 6.6, 6.0, Math.PI, { roof: '#8a4a36', wall: '#d9b27c', poi: p.id });
    house(b, X - 5.6, Z + 4.6, 5.0, 4.4, -Math.PI / 2, { roof: '#8a4a36', wall: '#d9b27c', poi: p.id });
    b.build();
    addGlow(root, X - 2.6, PAD_H + 2.6, Z - S, 2.6, '#ffb45c'); addGlow(root, X + 2.6, PAD_H + 2.6, Z - S, 2.6, '#ffb45c');
    ringSpots(p, 13, 0.5, 9.5, rnd);
  }

  function buildBones(rnd) {
    const p = P.bones, b = new Batch(), X = wx(p.x), Z = wz(p.z), bone = '#efe6d0', shade = '#d8ccb0';
    for (let i = 0; i < 9; i++) b.cyl(i % 2 ? bone : shade, 0.5, 0.5, 1.3, X - 8 + i * 2, PAD_H + 3.4, Z, 7, 0);
    for (let i = 0; i < 7; i++) {                              // the ribs, in pairs
      const x = X - 6.5 + i * 2.1, r = 3.4 - Math.abs(i - 3) * 0.3;
      for (const s of [-1, 1]) {
        b.add(bone, new THREE.TorusGeometry(r, 0.24, 6, 12, Math.PI * 0.62), x, PAD_H + 3.3 - r * 0.1, Z, 0, s * Math.PI / 2, 0);
        addCircle(x, Z + s * r * 0.98, 0.34);
      }
    }
    b.add(bone, new THREE.SphereGeometry(2.3, 9, 7), X + 11.5, PAD_H + 1.9, Z, 0, 0, 0, 1.25, 0.9, 1)
      .add('#2a1c14', new THREE.SphereGeometry(0.6, 7, 5), X + 12.6, PAD_H + 2.2, Z + 1.0).add('#2a1c14', new THREE.SphereGeometry(0.6, 7, 5), X + 12.6, PAD_H + 2.2, Z - 1.0)
      .box(shade, 2.6, 0.7, 2.4, X + 13.2, PAD_H + 0.6, Z);
    addCircle(X + 11.8, Z, 2.5);
    b.build();
    ringSpots(p, 10, 2, 12, rnd);
  }

  function buildSteps(rnd) {
    const p = P.steps, b = new Batch(), X = wx(p.x), Z = wz(p.z);
    for (let i = 0; i < 5; i++) {
      for (const s of [-1, 1]) {
        const x = X - 7.5 + i * 3.75, z = Z + s * 3.6, broken = (i + (s > 0 ? 1 : 0)) % 3 === 0;
        const h = broken ? 1.6 + rnd() * 1.2 : 5.2;
        b.add('#d9b27c', new THREE.CylinderGeometry(0.42, 0.7, h, 4), x, PAD_H + h / 2, z, 0, Math.PI / 4);
        if (!broken) b.add('#f0c060', new THREE.ConeGeometry(0.6, 0.9, 4), x, PAD_H + h + 0.45, z, 0, Math.PI / 4);
        b.box('#c99c66', 1.6, 0.3, 1.6, x, PAD_H + 0.15, z);
        addCircle(x, z, 0.72);
      }
    }
    // the shrine at the end of the walk
    for (const [ox, oz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      b.cyl('#e8c898', 0.3, 0.34, 3.2, X + 10.5 + ox, PAD_H + 1.6, Z + oz, 8);
      addCircle(X + 10.5 + ox, Z + oz, 0.4);
    }
    b.box('#c99c66', 4.6, 0.4, 4.6, X + 10.5, PAD_H + 3.4, Z).add('#b8432f', new THREE.ConeGeometry(3.4, 1.6, 4), X + 10.5, PAD_H + 4.4, Z, 0, Math.PI / 4)
      .cyl('#3a3028', 0.5, 0.36, 0.7, X + 10.5, PAD_H + 0.35, Z, 8);
    b.build();
    addGlow(root, X + 10.5, PAD_H + 1.2, Z, 4.2, '#ff9a3c'); addPool(X + 10.5, PAD_H, Z, 4.5, '#ff9a3c');
    addCircle(X + 10.5, Z, 0.6);
    ringSpots(p, 9, 1, 11, rnd);
  }

  function buildMills(rnd) {
    const p = P.mills;
    for (let i = 0; i < 3; i++) {
      const x = wx(p.x - 7 + i * 7), z = wz(p.z + (i % 2 ? -3 : 3)), b = new Batch();
      for (const [ox, oz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
        b.add('#7d5634', new THREE.CylinderGeometry(0.09, 0.12, 6.4, 5), x + ox * 0.6, PAD_H + 3.2, z + oz * 0.6, ox * 0.09, 0, -oz * 0.09);
      }
      b.box('#8a6238', 1.9, 0.14, 1.9, x, PAD_H + 2.2, z).box('#8a6238', 1.5, 0.14, 1.5, x, PAD_H + 4.4, z)
        .box('#6e4a2c', 0.9, 0.8, 1.4, x, PAD_H + 6.6, z);
      b.build();
      const rotor = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.05), arenaMat(k % 2 ? '#e9dcc0' : '#d9483b', { flat: true, side: THREE.DoubleSide }));
        blade.position.y = 1.5;
        const arm = new THREE.Group(); arm.rotation.z = (k / 6) * Math.PI * 2; arm.add(blade);
        rotor.add(arm);
      }
      rotor.position.set(x, PAD_H + 6.6, z + 0.82);
      root.add(rotor);
      spinners.push({ o: rotor, sp: 0.9 + i * 0.25 });
      addCircle(x, z, 1.0);
    }
    { const b = new Batch(); house(b, wx(p.x), wz(p.z + 9.4), 5.6, 4.4, Math.PI, { roof: '#7a8450', poi: p.id }); b.build(); }
    ringSpots(p, 9, 2, 12, rnd);
  }

  function buildWell(rnd) {
    const p = P.well, b = new Batch(), X = wx(p.x), Z = wz(p.z);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, d = 7.6;
      const x = X + Math.sin(a) * d, z = Z + Math.cos(a) * d;
      b.cyl(i % 2 ? '#d9a66c' : '#e0b27c', 1.9, 2.05, 2.5, x, PAD_H + 1.25, z, 9)
        .add('#c98452', new THREE.SphereGeometry(1.95, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), x, PAD_H + 2.5, z, 0, 0, 0, 1, 0.62, 1)
        .box('#3a2a1e', 0.9, 1.5, 0.2, x - Math.sin(a) * 1.95, PAD_H + 0.75, z - Math.cos(a) * 1.95, a);
      addCircle(x, z, 2.1);
    }
    b.cyl('#b8a48a', 1.3, 1.3, 0.9, X, PAD_H + 0.45, Z, 10).cyl('#2a4a58', 1.05, 1.05, 0.1, X, PAD_H + 0.86, Z, 10)
      .cyl('#6e4a2c', 0.08, 0.08, 2.4, X - 1.2, PAD_H + 1.6, Z, 5).cyl('#6e4a2c', 0.08, 0.08, 2.4, X + 1.2, PAD_H + 1.6, Z, 5)
      .box('#6e4a2c', 3.0, 0.14, 0.14, X, PAD_H + 2.8, Z).add('#b8432f', new THREE.ConeGeometry(2.0, 0.9, 4), X, PAD_H + 3.3, Z, 0, Math.PI / 4);
    b.build();
    addCircle(X, Z, 1.4);
    ringSpots(p, 10, 2.2, 11.5, rnd);
  }

  /** The Dawnskiff: the ship everybody jumps from. A hull under a striped bag. */
  function buildSkiff() {
    const b = new Batch();
    b.box('#6e4a2c', 3.2, 1.0, 9, 0, 0, 0).box('#8a6238', 3.6, 0.18, 9.4, 0, 0.55, 0).box('#523620', 2.2, 0.8, 2.4, 0, -0.5, -4.8, 0, 0.3)
      .box('#523620', 2.2, 0.8, 2.4, 0, -0.5, 4.8, 0, -0.3).box('#3a3028', 1.6, 1.3, 2.0, 0, 1.3, -2.6);
    for (const s of [-1, 1]) b.box('#d9483b', 0.08, 1.6, 3.2, s * 2.6, 0.3, -1, 0, 0, s * 0.9);
    for (const [sx, sz] of [[-1.5, -3.5], [1.5, -3.5], [-1.5, 3.5], [1.5, 3.5]]) b.cyl('#c9a070', 0.03, 0.03, 4.2, sx, 2.6, sz, 4);
    const g = b.build(root, false);
    // THE BAG IS SEE-THROUGH FROM ABOVE. The camera looks straight down on it,
    // and a solid balloon hid the deck, the hero and the ground you are
    // choosing a landing on: the three things the ride exists to show.
    const bag = new Batch();
    for (let i = 0; i < 6; i++) {
      bag.add(i % 2 ? '#e9dcc0' : '#d9483b', new THREE.SphereGeometry(3.0, 10, 8), 0, 5.4, -5 + i * 2, 0, 0, 0, 1.15, 0.95, 0.42);
    }
    const bg = bag.build(g, false);
    bg.traverse((m) => {
      if (!m.isMesh) return;
      const mm = m.material.clone();
      mm.onBeforeCompile = m.material.onBeforeCompile; mm.customProgramCacheKey = m.material.customProgramCacheKey;
      mm.transparent = true; mm.opacity = 0.2; mm.depthWrite = false; m.material = mm; m.renderOrder = 4;
    });
    addGlow(g, 0, 1.4, 4.6, 5, '#ffb45c');
    g.visible = false;
    return g;
  }

  function build() {
    if (state.built) return;
    state.built = true;
    glowTex = glowTexture();
    const rnd = mulberry(20260801);
    buildSky();
    buildGround();
    buildZiggurat(rnd); buildWreck(rnd); buildOasis(rnd); buildBazaar(rnd); buildFort(rnd);
    buildBones(rnd); buildSteps(rnd); buildMills(rnd); buildWell(rnd);
    for (const p of POIS) if (p.hamlet) buildHamlet(p, rnd);
    const lamps = new Batch();
    for (const [ax, az, bx, bz] of ROADS) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 15);
      for (let i = 1; i < n; i++) {
        const t = i / n, nx = -(bz - az) / len, nz = (bx - ax) / len;
        const dx = ax + (bx - ax) * t + nx * 2.3, dz = az + (bz - az) * t + nz * 2.3;
        if (poiDist(dx, dz).d < 2 || blocked(wx(dx), wz(dz), 1)) continue;
        lamp(lamps, dx, dz);
      }
    }
    lamps.build();
    buildScatter(rnd);
    ringSpots(P.canyon, 10, 0.5, 7, rnd);
    for (let i = 0, t = 0; i < 46 && t < 900; t++) {          // loot out in the open, too
      const [dx, dz] = spot(rnd, 8, ISLE_R - 8);
      const x = wx(dx), z = wz(dz);
      if (poiDist(dx, dz).d < 3 || !walkable(x, z) || blocked(x, z, 1)) continue;
      lootSpots.push({ x, z, poi: null }); i++;
    }
    skiff = buildSkiff();
  }

  /** A free standing spot in a distance band from the middle. */
  function randomSpot(rnd, minD = 6, maxD = ISLE_R - 7, pad = 1.2) {
    for (let tries = 0; tries < 120; tries++) {
      const a = rnd() * Math.PI * 2, d = minD + rnd() * (maxD - minD);
      const x = ROYALE_CX + Math.sin(a) * d, z = ROYALE_CZ + Math.cos(a) * d;
      if (walkable(x, z) && !blocked(x, z, pad)) return { x, z };
    }
    return { x: ROYALE_CX + 14, z: ROYALE_CZ + 14 };
  }
  /** Which named place is this point in, if any. */
  function placeAt(x, z) {
    const pd = poiDist(x - ROYALE_CX, z - ROYALE_CZ);
    return pd.d < 2 ? pd.p : null;
  }

  // ---- the override, and the light --------------------------------------------
  function installOverride() {
    if (override) return;
    override = {
      surfaceY: terrain.surfaceY, walkable: terrain.walkable,
      swimmable: terrain.swimmable, deepWater: terrain.deepWater,
      isWater: terrain.isWater, inOcean: terrain.inOcean, inSnow: terrain.inSnow,
      nearestShore: terrain.nearestShore, inBounds: terrain.inBounds,
      cellOf: terrain.cellOf, typeAt: terrain.typeAt,
    };
    terrain.surfaceY = (x, z) => isleHeight(x, z);
    terrain.walkable = (x, z) => walkable(x, z);
    terrain.swimmable = () => false;
    terrain.deepWater = () => false;
    terrain.isWater = () => false;
    terrain.inOcean = () => false;
    terrain.inSnow = () => false;
    terrain.nearestShore = () => new THREE.Vector3(ROYALE_CX + 14, PAD_H, ROYALE_CZ + 14);
    terrain.inBounds = () => true;
    terrain.cellOf = () => [0, 0];
    terrain.typeAt = () => 9;                                   // sand underfoot
  }
  function removeOverride() {
    if (!override) return;
    Object.assign(terrain, override);
    override = null;
  }

  /** The isle has its own hour. Anavela's sky, fog and sun are put away and
   *  handed back exactly as they were. */
  function takeLight() {
    if (stash) return;
    stash = { fog: scene.fog, bg: scene.background, lights: new Map() };
    for (const o of scene.children) {
      if (!o.isLight || o.isPointLight) continue;
      stash.lights.set(o, { i: o.intensity, c: o.color.getHex(), g: o.groundColor ? o.groundColor.getHex() : null });
      if (o.isDirectionalLight) { o.intensity = 2.25; o.color.set('#ffb878'); }
      else if (o.isHemisphereLight) { o.intensity = 0.95; o.color.set('#8f8cff'); o.groundColor.set('#b8704a'); }
      else { o.intensity = 0.32; o.color.set('#c9c0ff'); }
    }
    scene.fog = new THREE.Fog(new THREE.Color('#f09a6c'), 90, 330);
    scene.background = new THREE.Color('#f09a6c');
  }
  function giveLight() {
    if (!stash) return;
    for (const [o, s] of stash.lights) { o.intensity = s.i; o.color.setHex(s.c); if (s.g !== null) o.groundColor.setHex(s.g); }
    scene.fog = stash.fog; scene.background = stash.bg;
    stash = null;
  }

  function enter() {
    build();
    installOverride();
    if (!shown.size) for (const o of overworld) { shown.set(o, o.visible); o.visible = false; }
    takeLight();
    root.visible = true;
    state.active = true;
    setRing(ROYALE_CX, ROYALE_CZ, ISLE_R + 20);
  }
  function leave() {
    removeOverride();
    for (const [o, v] of shown) o.visible = v;
    shown.clear();
    giveLight();
    root.visible = false;
    if (skiff) skiff.visible = false;
    state.active = false;
  }

  function setRing(x, z, r) {
    state.ring.x = x; state.ring.z = z; state.ring.r = r;
    U.uRing.value.set(x, z, r);
    if (!wall) return;
    const rr = Math.max(0.05, r);
    wall.scale.set(rr, 34, rr); wall.position.set(x, PAD_H + 15, z);
    wall.visible = r < ISLE_R + 12;
  }

  function update(dt, time, focus, camera) {
    if (!state.active) return;
    U.uTime.value = time;
    if (camera) dome.position.copy(camera.position);
    // the sun rides with whoever we are watching, low in the west: long shadows
    if (focus) {
      for (const o of scene.children) {
        if (!o.isDirectionalLight) continue;
        o.position.set(focus.x - 30, 22, focus.z + 17);
        o.target.position.set(focus.x, 0, focus.z);
        o.target.updateMatrixWorld();
      }
    }
    for (const f of flames) {
      const k = 0.86 + Math.sin(time * 7.3 + f.ph) * 0.07 + Math.sin(time * 13.1 + f.ph * 2) * 0.05;
      if (f.mesh) f.sp.scale.set(k, 0.8 + k * 0.3, k);
      else f.sp.scale.setScalar(f.base * k);
    }
    for (const s of spinners) s.o.rotation.z += dt * s.sp;
    const under = focus ? houseAt(focus.x, focus.z) : -1;
    for (const r of roofs) {
      // under it the roof goes; standing BEHIND it (the camera looks from the
      // south) it thins, or a house would hide whoever walks round the back
      let t = r.i === under ? 0.07 : 1;
      if (t === 1 && focus) {
        const h = houses[r.i], R = Math.max(h.hw, h.hd) + 0.7, dx = focus.x - h.x, dz = focus.z - h.z;
        if (Math.abs(dx) < R && dz < 0 && dz > -(R + 2.4)) t = 0.4;
      }
      if (Math.abs(r.op - t) < 0.004) continue;
      r.op += (t - r.op) * Math.min(1, dt * 9);
      for (const m of r.mats) { m.opacity = r.op; m.depthWrite = r.op > 0.9; }
    }
    for (const c of crystals) c.g.scale.setScalar(1 + Math.sin(time * 1.4 + c.ph) * 0.035);
  }

  return {
    state, root, enter, leave, update, setRing, walkable, blocked, shotBlocked, losClear,
    randomSpot, placeAt, heightAt: isleHeight, lootSpots, mesas, mulberry, houses, houseAt,
    get skiff() { return skiff; }, glow: () => glowTex,
  };
}
