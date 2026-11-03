// HOLLOWTIDE — the festival of the unlit, dressed onto Anavela for one season.
//
// The gamepass already has a season called HOLLOWTIDE ("whatever the Hollow is,
// it is closer to the surface this month") and nothing in the world knew about
// it. While that season is live — or when forced on for a preview — the map
// takes on its festival dress:
//   * JACK-O'-LANTERNS by every hut door, down the roads and around the
//     landmarks, faces lit from inside. Instanced: every pumpkin in the world is
//     four draw calls (body, stem, face, ground glow) however many there are.
//   * BATS at dusk and after dark, in loose flocks over the village, the
//     landmarks and the graveyard. Instanced the same way: three draw calls.
//   * THE LANTERNLESS GRAVEYARD — a small walled yard of crooked stones, a
//     dead tree, candles and purple ground mist, with two little sheet ghosts
//     drifting round it. Cute, not grim: big glossy eyes, Pokemon energy.
//   * a purple lean to the night sky and fog (lighting.js reads `tint`).
//
// It is all built ONCE at world build if the season is on, and simply absent
// otherwise — no cost at all outside the festival.
import * as THREE from 'three';
import { seasonNow } from '../systems/gamepass.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';
import { bakeStatic } from '../gfx/bake.js';
import { sharedMat, SHARED } from '../gfx/meshcache.js';
import { WATER_LEVEL } from './terrain.js';
import { ChunkedInstanced } from '../gfx/chunked.js';

const FORCE_KEY = 'semesta.hollowtide';

/** On while the HOLLOWTIDE season runs, or when forced on/off for a preview. */
export function hollowtideActive() {
  try {
    const q = new URLSearchParams(location.search).get('hollowtide');
    if (q === '1') return true;
    if (q === '0') return false;
    const f = localStorage.getItem(FORCE_KEY);
    if (f === 'on') return true;
    if (f === 'off') return false;
  } catch { /* storage blocked: fall through to the calendar */ }
  return seasonNow().name === 'HOLLOWTIDE';
}

// --- shared pieces ---------------------------------------------------------
function pumpkinGeometry() {
  // a sphere with eight ribs pushed in, squashed: reads as a pumpkin at any
  // distance where a plain orange ball reads as a ball
  const g = new THREE.SphereGeometry(0.5, 14, 8);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const rib = 1 - 0.09 * (0.5 - 0.5 * Math.cos(a * 8));
    v.x *= rib; v.z *= rib;
    v.y *= 0.74;
    // a dimple top and bottom where the ribs meet
    const k = Math.abs(v.y) / 0.37;
    if (k > 0.82) v.y *= 1 - (k - 0.82) * 0.5;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g[SHARED] = true;
  return g;
}

function faceTexture() {
  // the carved face, drawn as LIGHT: transparent where the shell is, glowing
  // where it was cut through. Additive, so it reads as candlelight from inside.
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(32, 34, 2, 32, 34, 30);
  glow.addColorStop(0, 'rgba(255,190,80,0.35)');
  glow.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#ffd36a';
  const tri = (pts) => { g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath(); g.fill(); };
  tri([[14, 28], [22, 14], [28, 28]]);        // left eye
  tri([[36, 28], [42, 14], [50, 28]]);        // right eye
  tri([[29, 36], [32, 30], [35, 36]]);        // nose
  // the grin: a crescent with two teeth left standing
  g.beginPath();
  g.moveTo(12, 40);
  g.quadraticCurveTo(32, 62, 52, 40);
  g.quadraticCurveTo(32, 50, 12, 40);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(24, 44, 4, 4);
  g.fillRect(36, 44, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function softDisc() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,170,70,0.9)');
  r.addColorStop(0.4, 'rgba(255,130,40,0.35)');
  r.addColorStop(1, 'rgba(255,100,20,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wingGeometry(side) {
  // a bat wing: three scalloped points along the trailing edge
  const s = side;
  const pts = [[0, 0], [s * 0.18, 0.05], [s * 0.42, 0.02], [s * 0.36, -0.06], [s * 0.27, -0.03],
    [s * 0.2, -0.09], [s * 0.12, -0.04], [s * 0.05, -0.08]];
  const pos = [];
  for (let i = 1; i < pts.length - 1; i++) {
    pos.push(0, 0, pts[0][1], pts[i][0], 0, pts[i][1], pts[i + 1][0], 0, pts[i + 1][1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// --- the graveyard ----------------------------------------------------------
function buildGraveyard(rnd) {
  const root = new THREE.Group();
  const stone = sharedMat('#9a9aa8'), stoneDark = sharedMat('#74747e'), moss = sharedMat('#5a7a4a');
  const iron = sharedMat('#2a2630'), wood = sharedMat('#4a3a32'), soil = sharedMat('#6a5a48');
  // the yard itself: a low raised earth pad with a kerb
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, 0.3, 20), soil);
  pad.position.y = 0.05;
  root.add(pad);
  // crooked headstones, rounded tops, in two loose rows
  const slab = new THREE.BoxGeometry(0.7, 0.9, 0.18);
  const cap = new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12, 1, false, 0, Math.PI);
  cap.rotateX(Math.PI / 2); cap.rotateZ(Math.PI / 2);
  for (let i = 0; i < 9; i++) {
    const row = i < 5 ? -1.6 : 1.4;
    const x = (i < 5 ? i - 2 : i - 6.5) * 1.6 + (rnd() - 0.5) * 0.4;
    const g = new THREE.Group();
    const s = new THREE.Mesh(slab, rnd() < 0.3 ? stoneDark : stone);
    s.position.y = 0.45;
    const t = new THREE.Mesh(cap, s.material);
    t.rotation.set(0, 0, 0);
    t.position.y = 0.9;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.2), moss);
    m.position.y = 0.06;
    g.add(s, t, m);
    g.position.set(x, 0.2, row + (rnd() - 0.5) * 0.4);
    g.rotation.set((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.3);
    const sc = 0.8 + rnd() * 0.45;
    g.scale.setScalar(sc);
    root.add(g);
  }
  // two stone crosses at the back
  for (const x of [-3.6, 3.4]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), stone);
    v.position.set(x, 0.9, -3.4);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.22), stone);
    h.position.set(x, 1.25, -3.4);
    root.add(v, h);
  }
  // an iron fence round it, with a gap for the gate on +z
  const post = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5);
  const spike = new THREE.ConeGeometry(0.07, 0.18, 4);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.32) continue;   // the gate
    const x = Math.sin(a) * 6.4, z = Math.cos(a) * 6.4;
    const p = new THREE.Mesh(post, iron); p.position.set(x, 0.65, z);
    const s = new THREE.Mesh(spike, iron); s.position.set(x, 1.28, z);
    root.add(p, s);
  }
  for (const y of [0.45, 0.95]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.025, 4, 48, Math.PI * 2 - 0.64), iron);
    rail.rotation.x = -Math.PI / 2;
    rail.rotation.z = -Math.PI / 2 + 0.32;       // the gap lands on +z, at the gate
    rail.position.y = y;
    root.add(rail);
  }
  // the dead tree: a twisted trunk and bare branches reaching out
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 3.2, 7), wood);
  trunk.position.y = 1.6;
  trunk.rotation.z = 0.12;
  tree.add(trunk);
  for (let i = 0; i < 6; i++) {
    const len = 1.0 + rnd() * 1.2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.1, len, 5), wood);
    b.geometry.translate(0, len / 2, 0);
    const a = (i / 6) * Math.PI * 2 + rnd();
    b.position.set(0, 2.0 + i * 0.22, 0);
    b.rotation.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9);
    tree.add(b);
  }
  tree.position.set(-4.4, 0.2, 1.8);
  root.add(tree);
  return root;
}

function ghostGeometry() {
  // a sheet ghost: a bell that flares to a wavy hem
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = t < 0.45 ? Math.sin((t / 0.45) * Math.PI / 2) * 0.42 : 0.42 + (t - 0.45) * 0.22;
    pts.push(new THREE.Vector2(Math.max(0.001, r), 0.9 - t * 0.95));
  }
  const g = new THREE.LatheGeometry(pts, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0.0) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, y + Math.sin(a * 6) * 0.06);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function createHollowtide({ scene, terrain, landmarks, decor, npcs }) {
  const active = hollowtideActive();
  const api = { active, tint: active ? 1 : 0, update() {}, pumpkins: 0, bats: 0, graveyard: null };
  if (!active) return api;

  let seed = 31031;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const S = terrain.size;
  const dry = (x, z) => {
    const [ix, iz] = terrain.cellOf(x, z);
    return terrain.inBounds(ix, iz) && terrain.heightCell(ix, iz) > WATER_LEVEL;
  };
  const sp = terrain.spawn;

  // --- where the pumpkins go ----------------------------------------------
  const spots = [];
  const tooClose = (x, z, d = 1.4) => spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < d * d);
  const add = (x, z, scale = 1, face = null) => {
    if (!dry(x, z) || tooClose(x, z)) return;
    if ((x - sp.x) ** 2 + (z - sp.z) ** 2 < 3.2 * 3.2) return;     // never on the spawn cells
    spots.push({ x, z, y: terrain.surfaceY(x, z), s: scale, face: face ?? Math.atan2(sp.x - x, sp.z - z) });
  };
  // the village: a ring just inside the kerb, between the avenues, in threes
  for (let k = 0; k < 8; k++) {
    const a = k * (Math.PI / 4) + Math.PI / 8;
    for (let j = 0; j < 3; j++) {
      const aa = a + (j - 1) * 0.07, r = 11.6 + (j === 1 ? 0.5 : 0);
      add(sp.x + Math.sin(aa) * r, sp.z + Math.cos(aa) * r, j === 1 ? 1.15 : 0.78);
    }
  }
  // beside every hut chimney's house — at its door, facing out
  for (const c of npcs?.chimneys || []) {
    const a = Math.atan2(c.x - sp.x, c.z - sp.z);
    add(c.x - Math.sin(a) * 2.0 + Math.cos(a) * 1.0, c.z - Math.cos(a) * 2.0 - Math.sin(a) * 1.0, 0.9);
  }
  // down the roads: every so often, to the side of the path
  let n = 0;
  for (let iz = 4; iz < S - 4; iz += 1) {
    for (let ix = 4; ix < S - 4; ix += 1) {
      if (terrain.type[terrain.idx(ix, iz)] !== 1) continue;
      if (++n % 23 !== 0) continue;
      const x = ix - S / 2 + 0.5 + (rnd() < 0.5 ? -1.6 : 1.6), z = iz - S / 2 + 0.5;
      if ((x - sp.x) ** 2 + (z - sp.z) ** 2 < 15 * 15) continue;
      add(x, z, 0.8 + rnd() * 0.4, rnd() * 6.28);
    }
  }
  // round the landmarks
  for (const L of landmarks?.named || []) {
    for (let k = 0; k < 3; k++) {
      const a = rnd() * 6.28, r = 4.5 + rnd() * 2.5;
      add(L.x + Math.sin(a) * r, L.z + Math.cos(a) * r, 0.7 + rnd() * 0.6, Math.atan2(-Math.sin(a), -Math.cos(a)) + Math.PI);
    }
  }

  // --- the graveyard: flat dry ground, clear of everything else ------------
  let yard = null;
  {
    const foots = landmarks?.foots || [];
    let best = null;
    for (let gz = -80; gz <= 80; gz += 4) {
      for (let gx = -80; gx <= 80; gx += 4) {
        const dSp = Math.hypot(gx - sp.x, gz - sp.z);
        if (dSp < 30 || dSp > 70) continue;
        if (terrain.inSnow?.(gx, gz) || terrain.inOcean?.(gx, gz)) continue;
        let ok = true, lo = 1e9, hi = -1e9;
        for (let k = 0; k < 16 && ok; k++) {
          const a = (k / 16) * 6.28;
          for (const r of [0, 3.5, 7.2]) {
            const x = gx + Math.sin(a) * r, z = gz + Math.cos(a) * r;
            if (!dry(x, z)) { ok = false; break; }
            const [ix, iz] = terrain.cellOf(x, z);
            const t = terrain.type[terrain.idx(ix, iz)];
            if (t === 1 || t === 8) { ok = false; break; }
            const y = terrain.surfaceY(x, z);
            lo = Math.min(lo, y); hi = Math.max(hi, y);
          }
        }
        if (!ok || hi - lo > 0.9) continue;
        if (foots.some((f) => Math.hypot(f.x - gx, f.z - gz) < f.r + 8)) continue;
        // prefer the quiet west, away from the village roads
        const score = (hi - lo) * 10 + Math.hypot(gx + 40, gz - 20) * 0.05;
        if (!best || score < best.score) best = { x: gx, z: gz, y: hi, score };
      }
    }
    if (best) {
      yard = buildGraveyard(rnd);
      yard.position.set(best.x, best.y - 0.15, best.z);
      yard.rotation.y = Math.atan2(sp.x - best.x, sp.z - best.z);     // gate toward town
      scene.add(yard);
      bakeStatic(yard);
      decor?.clearArea?.(best.x, best.z, 7.5);
      landmarks?.foots?.push({ x: best.x, z: best.z, r: 7.5 });
      landmarks?.named?.push({ title: 'THE LANTERNLESS GRAVEYARD', sub: 'Forty-one names, and a candle for each', x: best.x, z: best.z, r: 12 });
      api.graveyard = best;
      // its own pumpkins along the fence
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * 6.28 + 0.3;
        add(best.x + Math.sin(a) * 7.4, best.z + Math.cos(a) * 7.4, 0.75 + rnd() * 0.5, a + Math.PI);
      }
    }
  }

  // --- pumpkins, instanced ---------------------------------------------------
  const N = spots.length;
  const bodyMat = new THREE.MeshLambertMaterial({ color: '#e8742a' });
  // CHUNKED, like the decor. As one InstancedMesh the pumpkins spanned the whole
  // map, were never frustum-culled, and cost 68k triangles in every frame
  // (main pass plus shadow pass) wherever you stood. They no longer cast
  // shadows either: they are small, and the glow pool already seats them.
  const pts = spots.map((s) => ({ x: s.x, z: s.z }));
  const bodies = new ChunkedInstanced(pumpkinGeometry(), bodyMat, pts);
  const stems = new ChunkedInstanced(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 5), new THREE.MeshLambertMaterial({ color: '#4a6a2a' }), pts);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const faces = new ChunkedInstanced(new THREE.PlaneGeometry(0.62, 0.62), faceMat, pts);
  const glowMat = new THREE.MeshBasicMaterial({
    map: softDisc(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const glowGeo = new THREE.PlaneGeometry(1.5, 1.5);
  glowGeo.rotateX(-Math.PI / 2);
  const glows = new ChunkedInstanced(glowGeo, glowMat, pts);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
  const col = new THREE.Color();
  spots.forEach((s, i) => {
    const sz = 0.55 * s.s;
    e.set(0, s.face, 0); q.setFromEuler(e);
    m.compose(pv.set(s.x, s.y + sz * 0.36, s.z), q, sc.set(sz, sz, sz));
    bodies.setMatrixAt(i, m);
    col.setHSL(0.065 + (rnd() - 0.5) * 0.02, 0.82, 0.48 + (rnd() - 0.5) * 0.08);
    bodies.setColorAt(i, col);
    e.set(0.25, s.face, 0.2); q.setFromEuler(e);
    m.compose(pv.set(s.x, s.y + sz * 0.72, s.z), q, sc.set(sz * 1.6, sz * 1.6, sz * 1.6));
    stems.setMatrixAt(i, m);
    // the face sits just proud of the shell, facing the way the pumpkin does
    e.set(0, s.face, 0); q.setFromEuler(e);
    m.compose(pv.set(s.x + Math.sin(s.face) * sz * 0.48, s.y + sz * 0.38, s.z + Math.cos(s.face) * sz * 0.48), q, sc.set(sz, sz, sz));
    faces.setMatrixAt(i, m);
    q.identity();
    m.compose(pv.set(s.x, s.y + 0.05, s.z), q, sc.set(s.s, 1, s.s));
    glows.setMatrixAt(i, m);
    s.phase = rnd() * 50;
  });
  bodies.setShadows(false, true);
  for (const c of faces.chunks) c.renderOrder = 2;
  for (const c of glows.chunks) c.renderOrder = 1;
  for (const im of [bodies, stems, faces, glows]) { im.finalize(); scene.add(im); }
  api.pumpkins = N;

  // --- bats, instanced ---------------------------------------------------------
  const centres = [{ x: sp.x, z: sp.z, r: 14 }];
  if (api.graveyard) centres.push({ x: api.graveyard.x, z: api.graveyard.z, r: 8 }, { x: api.graveyard.x, z: api.graveyard.z, r: 11 });
  for (const L of (landmarks?.named || []).slice(0, 8)) centres.push({ x: L.x, z: L.z, r: 7 });
  const bats = [];
  for (const c of centres) {
    const k = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < k; i++) {
      bats.push({ c, a: rnd() * 6.28, sp: (0.7 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1), r: c.r * (0.6 + rnd() * 0.6),
        h: 4 + rnd() * 4, ph: rnd() * 6.28, beat: 16 + rnd() * 8 });
    }
  }
  // lit by nothing at night, a Lambert bat is a black hole in a black sky:
  // an unlit dusky violet reads as a silhouette against both
  const batMat = new THREE.MeshBasicMaterial({ color: '#4a3a62', side: THREE.DoubleSide });
  const batBody = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), batMat, bats.length);
  const wingL = new THREE.InstancedMesh(wingGeometry(-1), batMat, bats.length);
  const wingR = new THREE.InstancedMesh(wingGeometry(1), batMat, bats.length);
  for (const im of [batBody, wingL, wingR]) { im.frustumCulled = false; scene.add(im); }
  api.bats = bats.length;

  // --- ghosts ----------------------------------------------------------------------
  const ghosts = [];
  if (api.graveyard) {
    const gGeo = ghostGeometry();
    const face = makeCritterFaceTexture({ eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'open', cheeks: 'rgba(200,170,240,0.6)' });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const sheet = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ color: '#f2eefc', emissive: '#6a5a9a', emissiveIntensity: 0.35, transparent: true, opacity: 0.86 }));
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.35), new THREE.MeshBasicMaterial({ map: face, transparent: true }));
      fm.position.set(0, 0.62, 0.4);
      g.add(sheet, fm);
      g.scale.setScalar(1.1);
      scene.add(g);
      ghosts.push({ g, a: i * Math.PI, r: 3 + i * 1.6, sp: 0.35 + i * 0.12 });
    }
  }

  // --- purple mist over the yard ---------------------------------------------------
  let mist = null;
  if (api.graveyard) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(150,110,220,0.45)'); r.addColorStop(0.6, 'rgba(120,90,200,0.15)'); r.addColorStop(1, 'rgba(110,80,190,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5 });
    const geo = new THREE.PlaneGeometry(7, 7); geo.rotateX(-Math.PI / 2);
    mist = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(geo, mm);
      p.position.set((rnd() - 0.5) * 6, 0.25 + i * 0.12, (rnd() - 0.5) * 6);
      mist.add(p);
    }
    mist.position.set(api.graveyard.x, api.graveyard.y, api.graveyard.z);
    scene.add(mist);
  }

  const batM = new THREE.Matrix4(), bq = new THREE.Quaternion(), be = new THREE.Euler(), bs = new THREE.Vector3(1.7, 1.7, 1.7), bp = new THREE.Vector3();
  const wingQ = new THREE.Quaternion(), wq2 = new THREE.Quaternion(), wingE = new THREE.Euler();
  api.update = (dt, time, playerPos, night = 0) => {
    // faces: each candle flickers on its own phase, dim by day
    const lit = 0.18 + night * 0.95;
    for (let i = 0; i < N; i++) {
      const s = spots[i];
      const f = 0.82 + Math.sin(time * 9.1 + s.phase) * 0.08 + Math.sin(time * 23.7 + s.phase * 1.7) * 0.06;
      const k = lit * f;
      col.setRGB(k, k * 0.92, k * 0.8);
      faces.setColorAt(i, col);
      col.setRGB(k * 0.42 * night, k * 0.3 * night, k * 0.2 * night);
      glows.setColorAt(i, col);
    }
    // the shell itself glows a little from the candle inside after dark
    bodyMat.emissive.setRGB(0.3 * night, 0.1 * night, 0.015 * night);
    faces.instanceColor.needsUpdate = true;
    glows.instanceColor.needsUpdate = true;
    glows.visible = night > 0.05;

    // bats: only at dusk and after dark, and only where you are
    const batsOn = night > 0.25;
    let n = 0;
    if (batsOn) {
      for (const b of bats) {
        if ((b.c.x - playerPos.x) ** 2 + (b.c.z - playerPos.z) ** 2 > 90 * 90) continue;
        b.a += b.sp * dt;
        const r = b.r * (1 + Math.sin(time * 0.7 + b.ph) * 0.25);
        const x = b.c.x + Math.cos(b.a) * r, z = b.c.z + Math.sin(b.a) * r;
        const y = terrain.surfaceY(b.c.x, b.c.z) + b.h + Math.sin(time * 2.3 + b.ph) * 0.8 + Math.sin(time * 7 + b.ph) * 0.15;
        // a bat's flight is erratic: it jinks off the circle now and then
        // the body faces +Z, so on a (cos a, sin a) orbit the heading is -a (or
        // -a + PI flying the other way round)
        const head = (b.sp > 0 ? -b.a : -b.a + Math.PI) + Math.sin(time * 3 + b.ph) * 0.3;
        be.set(0, head, 0); bq.setFromEuler(be);
        batM.compose(bp.set(x, y, z), bq, bs);
        batBody.setMatrixAt(n, batM);
        const flap = Math.sin(time * b.beat + b.ph) * 0.9;
        wingE.set(0, 0, flap); wq2.setFromEuler(wingE); wingQ.copy(bq).multiply(wq2);
        batM.compose(bp, wingQ, bs); wingR.setMatrixAt(n, batM);
        wingE.set(0, 0, -flap); wq2.setFromEuler(wingE); wingQ.copy(bq).multiply(wq2);
        batM.compose(bp, wingQ, bs); wingL.setMatrixAt(n, batM);
        n++;
      }
    }
    for (const im of [batBody, wingL, wingR]) { im.count = n; im.instanceMatrix.needsUpdate = true; im.visible = n > 0; }

    // ghosts drift round the yard, bob, and turn to face where they go
    if (api.graveyard) {
      const near = (api.graveyard.x - playerPos.x) ** 2 + (api.graveyard.z - playerPos.z) ** 2 < 90 * 90;
      for (const gh of ghosts) {
        gh.g.visible = near;
        if (!near) continue;
        gh.a += gh.sp * dt;
        const x = api.graveyard.x + Math.cos(gh.a) * gh.r, z = api.graveyard.z + Math.sin(gh.a) * gh.r;
        gh.g.position.set(x, api.graveyard.y + 1.0 + Math.sin(time * 1.6 + gh.a) * 0.22, z);
        gh.g.rotation.y = -gh.a;            // +Z faces along the orbit's tangent
        gh.g.rotation.z = Math.sin(time * 2.1 + gh.a) * 0.08;
        gh.g.children[0].material.opacity = 0.7 + night * 0.2;
      }
      if (mist) {
        mist.visible = near;
        mist.children.forEach((p, i) => { p.rotation.y = time * 0.05 * (i % 2 ? 1 : -1); });
        // measured: 0.65 opacity over four layers turned the yard into a lit white disc
        mist.children[0].material.opacity = 0.1 + night * 0.16;
      }
    }
  };
  return api;
}
