// THE HOMESTEAD — one house, one place, three tiers.
//
// This used to be four land parcels scattered across the mainland at 250 coins
// each, and it was the weakest system in the game. Four identical plots is a
// choice with no content in it: whichever one you happened to walk past first
// became "yours", the other three stayed as signposts advertising a thing you
// already owned, and the three house designs were alternatives rather than a
// ladder, so picking the Villa meant never seeing the other two and picking the
// Cabin meant regretting it.
//
// Now there is exactly ONE site — Lanternhome, the small island off the
// south-east coast — and the three designs are TIERS of the same building. You
// raise the cabin, then upgrade it into the cottage, then into the villa, and
// each step visibly changes the whole plot rather than just the roof: the yard
// gains a fence, then a wall and a gate; the path gains lamps; the last tier
// hangs a Lanternkeeper's beacon on the roof.
//
// That gives the money and materials somewhere to go for the whole run, and it
// gives the island a silhouette that reads your progress from the water.
import * as THREE from 'three';
import { bakeStatic } from '../gfx/bake.js';
import { WATER_LEVEL } from '../world/terrain.js';
import { sharedMat, sharedBox, sharedCyl, hipRoofGeometry } from '../gfx/meshcache.js';

export const HOUSE_SAFE_R = 8;
export const HOUSE_HEAL_R = 5;

/**
 * The ladder. Order matters — index 0 is what an empty plot builds first, and
 * `build()` only ever advances by one, so a rich player still walks the whole
 * path and sees every stage of their own house.
 */
export const HOUSE_TIERS = [
  {
    id: 'cabin',
    tier: 1,
    name: 'Driftwood Cabin',
    desc: 'Four walls, a tight roof and a lamp by the door. It is enough.',
    cost: { hardwood: 12, iron_ore: 4 },
    coins: 0,
    roof: '#5a7a4a', wall: '#a8805a',
  },
  {
    id: 'cottage',
    tier: 2,
    name: 'Anavela Cottage',
    desc: 'A chimney, a picket fence and a flower bed you did not have to buy.',
    cost: { hardwood: 28, iron_ore: 12 },
    coins: 200,
    roof: '#5a7a9a', wall: '#d0b898',
  },
  {
    id: 'villa',
    tier: 3,
    name: "Lanternkeeper's Villa",
    desc: 'Two floors, a stone wall, and a beacon on the ridge that burns all night.',
    cost: { hardwood: 45, iron_ore: 22 },
    coins: 600,
    roof: '#8a5a88', wall: '#e0d0b0',
  },
];

// old save files stored a design id; map it onto the ladder
const TIER_OF_ID = { cabin: 1, cottage: 2, villa: 3 };

// Static prop colours are SHARED — a built world was carrying ~2,465 distinct
// materials, which is why the LOW preset barely helped. Nothing in this file
// mutates a material at runtime, so one material per colour is safe here.
function lam(color) { return sharedMat(color); }
function box(w, h, d, c) { return new THREE.Mesh(sharedBox(w, h, d), lam(c)); }
function cyl(rt, rb, h, c, seg = 8) { return new THREE.Mesh(sharedCyl(rt, rb, h, seg), lam(c)); }

// a floating billboard label so the plot is obvious from the water
function makeLabel(title, sub, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,14,10,0.72)';
  ctx.fillRect(8, 8, 240, 80);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(9, 9, 238, 78);
  ctx.font = 'bold 28px monospace'; ctx.fillStyle = color;
  ctx.fillText(title, 128, 44);
  ctx.font = '17px monospace'; ctx.fillStyle = '#e2dfc8';
  ctx.fillText(sub, 128, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.6, 0.98, 1);
  spr.position.y = 2.3;
  return spr;
}

/**
 * The empty plot: a laid foundation and a builder's post, so an unbuilt site
 * reads as "yours, not started" rather than as bare sand.
 */
function buildFoundation() {
  const g = new THREE.Group();
  const pad = box(3.6, 0.14, 3.3, '#9aa0a2');
  pad.position.y = 0.07;
  pad.receiveShadow = true;
  g.add(pad);
  // corner stones
  for (const [dx, dz] of [[-1.7, -1.55], [1.7, -1.55], [-1.7, 1.55], [1.7, 1.55]]) {
    const s = box(0.34, 0.26, 0.34, '#b8bcbe');
    s.position.set(dx, 0.17, dz);
    g.add(s);
  }
  // a builder's post with a plan board and a stack of timber waiting to be used
  const post = box(0.12, 1.15, 0.12, '#8a6a48');
  post.position.set(-2.3, 0.57, 1.6);
  const board = box(0.86, 0.5, 0.08, '#c8a06a');
  board.position.set(-2.3, 1.18, 1.6);
  const plan = box(0.6, 0.32, 0.04, '#e8e0c8');
  plan.position.set(-2.3, 1.18, 1.66);
  g.add(post, board, plan);
  for (let i = 0; i < 3; i++) {
    const log = cyl(0.14, 0.14, 1.4, '#a8805a');
    log.rotation.z = Math.PI / 2;
    log.position.set(2.3, 0.15 + i * 0.27, 1.2 + (i % 2) * 0.3);
    g.add(log);
  }
  return g;
}

/** A small lamp post — the yard dressing that marks tier 2 and 3. */
function buildYardLamp() {
  const g = new THREE.Group();
  const post = cyl(0.07, 0.09, 1.5, '#4a4038', 6);
  post.position.y = 0.75;
  const arm = box(0.09, 0.09, 0.34, '#4a4038');
  arm.position.set(0, 1.5, 0.14);
  const cage = box(0.26, 0.3, 0.26, '#3a342e');
  cage.position.set(0, 1.42, 0.28);
  const pane = new THREE.Mesh(sharedBox(0.19, 0.23, 0.19),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  pane.position.set(0, 1.42, 0.28);
  const cap = box(0.32, 0.08, 0.32, '#3a342e');
  cap.position.set(0, 1.6, 0.28);
  g.add(post, arm, cage, pane, cap);
  return g;
}

/** A run of picket fence, `n` pickets long, along +x. */
function buildFence(n, colour = '#c8a06a') {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = box(0.1, 0.62, 0.08, colour);
    p.position.set(i * 0.34, 0.31, 0);
    g.add(p);
  }
  for (const y of [0.2, 0.46]) {
    const rail = box(n * 0.34, 0.07, 0.06, colour);
    rail.position.set((n - 1) * 0.17, y, 0);
    g.add(rail);
  }
  return g;
}

/** A course of low stone wall, `n` blocks long, along +x. */
function buildStoneWall(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = box(0.42, 0.5 + (i % 2) * 0.06, 0.32, i % 2 ? '#9aa0a2' : '#8a9092');
    b.position.set(i * 0.44, 0.27, 0);
    g.add(b);
    if (i % 3 === 0) {
      const cap = box(0.5, 0.09, 0.4, '#b8bcbe');
      cap.position.set(i * 0.44, 0.56, 0);
      g.add(cap);
    }
  }
  return g;
}

/**
 * The house itself at a given tier. Everything here is placed relative to a
 * door on +z, because the teleport home and `moveToClearSpot` both prefer that
 * side and a hero who lands facing a blank wall has been dropped in the garden.
 */
function buildHome(tier) {
  const d = HOUSE_TIERS[tier - 1];
  const g = new THREE.Group();
  const wall = lam(d.wall);
  const beam = lam('#6a4a30');
  const roofM = lam(d.roof);
  const roofDark = lam('#4a3a2c');
  const gold = lam('#c8a03a');

  const twoStory = tier >= 3;
  const W = tier === 1 ? 2.6 : tier === 2 ? 2.9 : 3.2;
  const D = tier === 1 ? 2.3 : tier === 2 ? 2.6 : 2.9;
  const H = twoStory ? 2.4 : tier === 2 ? 1.7 : 1.5;

  const base = new THREE.Mesh(sharedBox(W, H, D), wall);
  base.position.y = H / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const b = new THREE.Mesh(sharedBox(0.18, H, 0.18), beam);
    b.position.set(dx * (W / 2 - 0.05), H / 2, dz * (D / 2 - 0.05));
    g.add(b);
  }
  if (twoStory) {
    const band = new THREE.Mesh(sharedBox(W + 0.1, 0.14, D + 0.1), gold);
    band.position.y = 1.25;
    g.add(band);
  }

  // A REAL HIP ROOF. Three stacked slabs of decreasing size read as a tiered
  // cake, not a house — this is the same fix the village huts got.
  const eaveW = W + 0.7, eaveD = D + 0.7;
  const fascia = new THREE.Mesh(sharedBox(eaveW, 0.18, eaveD), roofDark);
  fascia.position.y = H + 0.09;
  fascia.castShadow = true;
  const hip = new THREE.Mesh(hipRoofGeometry(eaveW, eaveD, 1.15, 0.4), roofM);
  hip.position.y = H + 0.18;
  hip.castShadow = true;
  const cap = new THREE.Mesh(sharedBox(eaveW * 0.44, 0.14, 0.22), roofDark);
  cap.position.y = H + 1.33;
  g.add(fascia, hip, cap);

  if (tier >= 2) {
    const chimney = box(0.34, 0.8, 0.34, '#8d9294');
    chimney.position.set(W * 0.3, H + 1.1, -D * 0.2);
    const pot = box(0.2, 0.14, 0.2, '#6a4a44');
    pot.position.set(W * 0.3, H + 1.56, -D * 0.2);
    g.add(chimney, pot);
  }

  // THE BEACON. The whole story is that you are the last of an order that kept
  // the lights burning, so the final tier is the one that puts a light back on
  // a roof. It is the only part of the build that is not domestic.
  if (tier >= 3) {
    const mast = cyl(0.07, 0.09, 0.7, '#4a4038', 6);
    mast.position.set(0, H + 1.6, 0);
    const housing = box(0.44, 0.46, 0.44, '#3a342e');
    housing.position.set(0, H + 2.1, 0);
    const glass = new THREE.Mesh(sharedBox(0.34, 0.36, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xfff0b4 }));
    glass.position.set(0, H + 2.1, 0);
    const crown = box(0.56, 0.1, 0.56, '#c8a03a');
    crown.position.set(0, H + 2.36, 0);
    const beaconLight = new THREE.PointLight(0xffd08a, 1.8, 12, 2);
    beaconLight.position.set(0, H + 2.1, 0);
    g.add(mast, housing, glass, crown, beaconLight);
  }

  // door side (+z)
  const door = box(0.6, 1.0, 0.09, '#6a4a30');
  door.position.set(0, 0.5, D / 2 + 0.03);
  const knob = box(0.08, 0.08, 0.04, '#c8a03a');
  knob.position.set(0.18, 0.48, D / 2 + 0.08);
  const step = box(0.9, 0.09, 0.5, '#9aa0a2');
  step.position.set(0, 0.04, D / 2 + 0.3);
  const win = box(0.55, 0.5, 0.07, '#8ac4d8');
  win.position.set(W * 0.3, 0.95, D / 2 + 0.03);
  const lantern = new THREE.Mesh(sharedBox(0.15, 0.18, 0.15),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  lantern.position.set(-W * 0.22, 1.1, D / 2 + 0.07);
  const glow = new THREE.PointLight(0xffc878, 1.4, 6, 2);
  glow.position.set(0, 1.2, D / 2 + 0.35);
  g.add(door, knob, step, win, lantern, glow);

  if (twoStory) {
    for (const sx of [-0.75, 0.75]) {
      const w2 = box(0.55, 0.5, 0.07, '#8ac4d8');
      w2.position.set(sx, 1.9, D / 2 + 0.03);
      g.add(w2);
    }
    // a small balcony over the door
    const deck = box(1.5, 0.1, 0.6, '#8a6a48');
    deck.position.set(0, 1.5, D / 2 + 0.32);
    g.add(deck);
    for (let i = 0; i < 5; i++) {
      const rail = box(0.07, 0.34, 0.07, '#8a6a48');
      rail.position.set(-0.6 + i * 0.3, 1.7, D / 2 + 0.58);
      g.add(rail);
    }
    const top = box(1.5, 0.07, 0.07, '#8a6a48');
    top.position.set(0, 1.88, D / 2 + 0.58);
    g.add(top);
  }

  // --- THE YARD. This is what actually sells an upgrade: the building grows a
  // little, the plot around it changes completely.
  if (tier >= 2) {
    // window boxes and a flower bed by the path
    for (const sx of [-1, 1]) {
      const bedBox = box(0.7, 0.16, 0.24, '#8a6a48');
      bedBox.position.set(sx * W * 0.3, 0.68, D / 2 + 0.14);
      g.add(bedBox);
      for (let i = 0; i < 3; i++) {
        const bloom = box(0.1, 0.12, 0.1, ['#e86a8a', '#f0c455', '#d878c8'][i]);
        bloom.position.set(sx * W * 0.3 - 0.22 + i * 0.22, 0.82, D / 2 + 0.14);
        g.add(bloom);
      }
    }
    // picket fence round three sides, with the front left open for the path
    const fx = W / 2 + 1.5, fz = D / 2 + 1.5;
    const side = buildFence(9);
    side.position.set(-fx, 0, -fz);
    const side2 = buildFence(9);
    side2.position.set(-fx, 0, fz);
    const left = buildFence(9);
    left.rotation.y = Math.PI / 2;
    left.position.set(-fx, 0, -fz);
    g.add(side, side2, left);
    // two lamps flanking the path
    for (const sx of [-1, 1]) {
      const l = buildYardLamp();
      l.position.set(sx * 1.25, 0, D / 2 + 1.15);
      l.rotation.y = sx > 0 ? -0.35 : 0.35;
      g.add(l);
    }
    // stepping stones from the door out toward the pier
    for (let i = 0; i < 5; i++) {
      const s = box(0.5, 0.06, 0.42, '#b0b4b0');
      s.position.set((i % 2 ? 0.16 : -0.16), 0.03, D / 2 + 0.7 + i * 0.62);
      g.add(s);
    }
  }

  if (tier >= 3) {
    // the picket fence is replaced by a stone wall with a gate, and the yard
    // gains a well and two banner posts
    const wx = W / 2 + 2.1, wz = D / 2 + 2.1;
    const runs = [
      [-wx, -wz, 0], [-wx, wz, 0], [-wx, -wz, Math.PI / 2], [wx, -wz, Math.PI / 2],
    ];
    for (const [x, z, ry] of runs) {
      const w = buildStoneWall(10);
      w.rotation.y = ry;
      w.position.set(x, 0, z);
      g.add(w);
    }
    // gate posts either side of the path
    for (const sx of [-1, 1]) {
      const p = box(0.34, 1.3, 0.34, '#8a9092');
      p.position.set(sx * 1.1, 0.65, wz);
      const capg = box(0.46, 0.12, 0.46, '#c8a03a');
      capg.position.set(sx * 1.1, 1.36, wz);
      g.add(p, capg);
    }
    // a lintel across the gate
    const lintel = box(2.6, 0.2, 0.3, '#8a9092');
    lintel.position.set(0, 1.5, wz);
    g.add(lintel);
    // a well in the corner
    const wellR = cyl(0.5, 0.54, 0.55, '#8a9092', 10);
    wellR.position.set(-W / 2 - 1.2, 0.27, -D / 2 - 1.1);
    const water = cyl(0.42, 0.42, 0.06, '#3f8fa8', 10);
    water.position.set(-W / 2 - 1.2, 0.5, -D / 2 - 1.1);
    g.add(wellR, water);
    for (const sx of [-1, 1]) {
      const p = box(0.09, 0.9, 0.09, '#6a4a30');
      p.position.set(-W / 2 - 1.2 + sx * 0.42, 0.95, -D / 2 - 1.1);
      g.add(p);
    }
    const wellRoof = box(1.3, 0.12, 0.9, '#6a4a30');
    wellRoof.position.set(-W / 2 - 1.2, 1.45, -D / 2 - 1.1);
    g.add(wellRoof);
    // two more lamps, further out
    for (const sx of [-1, 1]) {
      const l = buildYardLamp();
      l.position.set(sx * 2.0, 0, D / 2 + 2.6);
      g.add(l);
    }
  }

  return g;
}

/**
 * @param islands terrain.islands — the homestead claims the one with kind
 *   'home'. If the map has none (an old seed), housing simply does not exist
 *   rather than throwing, and every caller already handles a null home.
 */
export function createHousing(scene, terrain, decorBlocked, particles, islands = []) {
  const isle = islands.find((i) => i.kind === 'home') || null;

  /**
   * Seat the plot on the island. The centre of an island is its peak, and a
   * flat-bottomed building on a peak buries one side — so this walks a short
   * spiral out from the middle and takes the flattest dry spot it finds.
   */
  function findSite() {
    if (!isle) return null;
    let best = null, bestDrop = Infinity;
    const probe = (x, z) => {
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) return;
      let lo = Infinity, hi = -Infinity;
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const h = terrain.surfaceY(x + dx * 0.9, z + dz * 0.9);
          if (h <= WATER_LEVEL + 0.1) return;       // any wet corner disqualifies it
          lo = Math.min(lo, h); hi = Math.max(hi, h);
        }
      }
      const drop = hi - lo;
      // prefer flat, and among equally flat spots prefer the middle of the isle
      const score = drop + Math.hypot(x - isle.x, z - isle.z) * 0.02;
      if (score < bestDrop) { bestDrop = score; best = { x, z, drop }; }
    };
    probe(isle.x, isle.z);
    for (let ring = 1; ring <= 4; ring++) {
      const r = ring * 0.9;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        probe(isle.x + Math.cos(a) * r, isle.z + Math.sin(a) * r);
      }
    }
    return best;
  }

  const site = findSite();
  const home = site
    ? {
      idx: 0,
      x: site.x, z: site.z, y: terrain.surfaceY(site.x, site.z),
      tier: 0,
      // kept for every existing consumer (world map, minimap, safe zones,
      // the teleport): `built` is the design id of the CURRENT tier
      owned: true, built: null,
      houseMesh: null, sign: null, label: null,
      isleName: isle?.name || 'Lanternhome',
    }
    : null;

  // `lands` stays an array so the world map, the minimap and the save format
  // keep working unchanged — it just never holds more than one entry now.
  const lands = home ? [home] : [];

  if (home) {
    const plot = new THREE.Group();
    plot.add(buildFoundation());
    plot.position.set(home.x, home.y, home.z);
    // face the door at the water, which is where you arrive from
    plot.rotation.y = isle ? Math.atan2(-isle.x, -isle.z) : 0;
    home.sign = plot;
    home.label = makeLabel('YOUR HOMESTEAD', 'press F to BUILD', '#a8e06a');
    plot.add(home.label);
    scene.add(plot);
    blockFootprint(2);
  }

  function blockFootprint(r) {
    if (!home) return;
    const [cx, cz] = terrain.cellOf(home.x, home.z);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r + 1) continue;
        decorBlocked.add(`${cx + dx},${cz + dz}`);
      }
    }
  }

  function refreshLabel() {
    if (!home || !home.sign) return;
    if (home.label) {
      home.sign.remove(home.label);
      // each label is its own canvas texture, and the plot swaps labels three
      // times over a run — dropping them on the floor leaks a texture a build
      home.label.material.map?.dispose();
      home.label.material.dispose();
      home.label = null;
    }
    // A finished villa gets no label at all: a permanent sign hovering over a
    // house you already own is clutter on the one plot you look at most.
    const next = HOUSE_TIERS[home.tier];
    if (!next) return;
    home.label = home.tier === 0
      ? makeLabel('YOUR HOMESTEAD', 'press F to BUILD', '#a8e06a')
      : makeLabel('UPGRADE AVAILABLE', next.name, '#a8e06a');
    home.sign.add(home.label);
  }

  /** The next rung, or null when the villa is standing. */
  function nextTier() { return HOUSE_TIERS[home ? home.tier : HOUSE_TIERS.length] || null; }

  /**
   * Raise or upgrade by exactly one tier. Materials are the CALLER's business —
   * this module never touches the inventory, same contract as dailies and the
   * gamepass.
   */
  function build(quiet = false) {
    if (!home) return null;
    const def = nextTier();
    if (!def) return null;

    if (home.houseMesh) { scene.remove(home.houseMesh); home.houseMesh = null; }
    if (home.sign) { scene.remove(home.sign); }

    home.tier = def.tier;
    home.built = def.id;

    const mesh = buildHome(home.tier);
    mesh.position.set(home.x, home.y, home.z);
    mesh.rotation.y = isle ? Math.atan2(-isle.x, -isle.z) : 0;
    // a house is ~90 little boxes that will never move again
    bakeStatic(mesh);
    scene.add(mesh);
    home.houseMesh = mesh;

    // the sign rides along so the label keeps hovering over the plot
    home.sign = new THREE.Group();
    home.sign.position.set(home.x, home.y + 1.6, home.z);
    scene.add(home.sign);
    refreshLabel();

    blockFootprint(home.tier >= 3 ? 3 : 2);
    // `quiet` is for the save loader: firing a gold fountain on an island the
    // player is nowhere near, during the loading screen, is fireworks for nobody
    if (!quiet) {
      particles.fountain(new THREE.Vector3(home.x, home.y + 1, home.z), '#ffd23e', 30);
      particles.shockwave?.(new THREE.Vector3(home.x, home.y, home.z), '#ffd23e', 5, 0.6);
    }
    return def;
  }

  function nearest(pos, radius) {
    if (!home) return null;
    return (home.x - pos.x) ** 2 + (home.z - pos.z) ** 2 < radius * radius ? home : null;
  }

  function serialize() { return { tier: home ? home.tier : 0 }; }

  function load(data) {
    if (!data || !home) return;
    // v3 saves stored an array of parcels: take the best house anybody built
    let tier = 0;
    if (Array.isArray(data)) {
      for (const d of data) tier = Math.max(tier, TIER_OF_ID[d?.built] || 0);
    } else {
      tier = data.tier || TIER_OF_ID[data.built] || 0;
    }
    while (home.tier < tier && build(true)) { /* walk the ladder up to the saved rung */ }
  }

  return {
    lands, home, isle, HOUSE_TIERS,
    nextTier, build, nearest, serialize, load,
    tier: () => (home ? home.tier : 0),
    hasHome: () => !!home && home.tier > 0,
  };
}
