// Riverbrook village — chibi animal villagers (Animal Crossing energy) with
// real daily activities: Bruna hammers at her anvil, Finn casts a line, Pip
// tends the market stall, Rio patrols, Elder Maple putters in the herb garden.
// Also builds the village itself: huts, a well, stalls, fences, crops, lamps.
import * as THREE from 'three';
import { makeCritterFaceTexture, PALETTE } from '../gfx/textures.js';
import { WATER_LEVEL } from '../world/terrain.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

export const NPC_DEFS = [
  {
    id: 'elder', name: 'Elder Maple', species: 'bear', role: 'Village Elder',
    fur: '#a8825a', furLight: '#c8a87a', outfit: '#7a5a9a',
    dialog: [
      'Welcome to Riverbrook, traveler. Our little village could use a hero like you.',
      'The wilds have grown restless lately... monsters everywhere.',
      'Rest by the torches when night falls. The Wisps come out in the dark.',
      'A great beast rises out in the wilds every few minutes. Be ready.',
    ],
  },
  {
    id: 'fisher', name: 'Finn', species: 'cat', role: 'Fisherman',
    fur: '#e8a84a', furLight: '#f5cc8a', outfit: '#3f6fb0',
    dialog: [
      'The lakes here are teeming with fish. Stand at the shore and press the fishing key!',
      'When the bobber dips and you see the "!", strike fast or it gets away.',
      'They say a Golden Koi lives in the deep water. Never caught it myself...',
    ],
  },
  {
    id: 'smith', name: 'Bruna', species: 'badger', role: 'Blacksmith',
    fur: '#6a6470', furLight: '#a8a2ac', outfit: '#b0503f',
    dialog: [
      'Bring me Forge Stones and I can temper your weapon. Press V at any time!',
      'Every +1 adds 8% damage. Past +3 the forge gets... temperamental.',
      'Monsters drop Forge Stones. The Golem practically rains them.',
    ],
  },
  {
    id: 'scout', name: 'Rio', species: 'rabbit', role: 'Scout',
    fur: '#c8c2b8', furLight: '#ece6da', outfit: '#4a9152',
    dialog: [
      'I mark treasure chests on my patrols — look for the golden sparkles!',
      'Chests refill with goodies over time. Sometimes even pet charms!',
      'The farther from the village, the meaner the monsters. And the better the loot.',
    ],
  },
  {
    id: 'merchant', name: 'Pip', species: 'bird', role: 'Collector',
    fur: '#7ab8d8', furLight: '#b8dcE8', outfit: '#c8a03a',
    dialog: [
      'Ooh! Shiny things! I adore collectors like you.',
      'Craft new weapons at the C menu — each class has its own recipes.',
      'Pet charms summon little companions. Collect all ten, I dare you!',
    ],
  },
];

// ---------------------------------------------------------------------------
// villager mesh
// ---------------------------------------------------------------------------
const faceCache = new Map();
function villagerFace(species) {
  if (!faceCache.has(species)) {
    faceCache.set(species, makeCritterFaceTexture({
      eyeW: 3, eyeH: 5, gap: 5, eyeY: 2,
      mouth: species === 'cat' ? 'w' : 'smile',
      cheeks: 'rgba(240,150,140,0.6)',
    }));
  }
  return faceCache.get(species);
}

function buildVillagerMesh(def) {
  const g = new THREE.Group();
  const fur = lam(def.fur);
  const furLight = lam(def.furLight);
  const cloth = lam(def.outfit);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.24), cloth);
  body.position.y = 0.34;
  body.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.13), fur);
  legL.position.set(-0.08, 0.1, 0);
  const legR = legL.clone(); legR.position.x = 0.08;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.11), fur);
  armL.position.set(-0.21, 0.36, 0);
  const armR = armL.clone(); armR.position.x = 0.21;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.46), fur);
  head.position.y = 0.72;
  head.castShadow = true;
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.04), furLight);
  muzzle.position.set(0, -0.08, 0.24);
  head.add(muzzle);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33),
    new THREE.MeshBasicMaterial({ map: villagerFace(def.species), transparent: true }));
  face.position.set(0, 0.02, 0.24);
  head.add(face);

  if (def.species === 'cat') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), fur);
      ear.position.set(sx * 0.17, 0.28, 0);
      ear.rotation.z = -sx * 0.25;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02), furLight);
      inner.position.set(0, 0, 0.04); ear.add(inner);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), fur);
    tail.position.set(0.12, 0.3, -0.16);
    tail.rotation.x = -0.5;
    g.add(tail);
  } else if (def.species === 'bear') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), fur);
      ear.position.set(sx * 0.2, 0.26, 0);
      head.add(ear);
    }
  } else if (def.species === 'rabbit') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.06), fur);
      ear.position.set(sx * 0.13, 0.4, 0);
      ear.rotation.z = -sx * 0.12;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.02), furLight);
      inner.position.set(0, 0, 0.035); ear.add(inner);
    }
    const puff = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.1), furLight);
    puff.position.set(0, 0.32, -0.16);
    g.add(puff);
  } else if (def.species === 'bird') {
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.12), lam('#f0a83d'));
    beak.position.set(0, -0.05, 0.28);
    head.add(beak);
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.07), furLight);
    tuft.position.set(0, 0.28, 0);
    tuft.rotation.z = 0.2;
    head.add(tuft);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.2), furLight);
      wing.position.set(sx * 0.21, 0.36, -0.02);
      g.add(wing);
    }
  } else if (def.species === 'badger') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), lam('#4a4650'));
      ear.position.set(sx * 0.18, 0.26, 0);
      head.add(ear);
    }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.02), furLight);
    stripe.position.set(0, 0, 0.235);
    head.add(stripe);
  }

  g.add(body, legL, legR, armL, armR, head);
  g.userData = { head, armL, armR, legL, legR, body };
  return g;
}

// ---------------------------------------------------------------------------
// village architecture & props
// ---------------------------------------------------------------------------
function buildHut(scale = 1, wallColor = '#c8b090', roofColor = '#a85a48') {
  const g = new THREE.Group();
  const wall = lam(wallColor);
  const beam = lam('#6a4a30');
  const roof = lam(roofColor);
  const roofDark = lam('#8a4638');

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 1.5 * scale, 2.2 * scale), wall);
  base.position.y = 0.75 * scale;
  base.castShadow = true;
  base.receiveShadow = true;
  for (const [dx, dz] of [[-1.15, -1.05], [1.15, -1.05], [-1.15, 1.05], [1.15, 1.05]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5 * scale, 0.16), beam);
    b.position.set(dx * scale, 0.75 * scale, dz * scale);
    g.add(b);
  }
  // cross beam under the roof
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.5 * scale, 0.12, 0.12), beam);
  cross.position.set(0, 1.45 * scale, 1.08 * scale);
  g.add(cross);
  for (let i = 0; i < 3; i++) {
    const w = (2.8 - i * 0.7) * scale;
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3 * scale, (2.6 - i * 0.6) * scale), i % 2 ? roofDark : roof);
    r.position.y = (1.6 + i * 0.3) * scale;
    r.castShadow = true;
    g.add(r);
  }
  // chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.6 * scale, 0.3 * scale), lam('#8d9294'));
  chimney.position.set(0.7 * scale, 2.1 * scale, -0.4 * scale);
  g.add(chimney);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.95 * scale, 0.08), beam);
  door.position.set(0, 0.5 * scale, 1.12 * scale);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), lam('#d8a83a'));
  knob.position.set(0.16 * scale, 0.45 * scale, 1.17 * scale);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.45 * scale, 0.06), lam('#8ac4d8'));
  win.position.set(0.75 * scale, 0.95 * scale, 1.12 * scale);
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56 * scale, 0.51 * scale, 0.04), beam);
  winFrame.position.set(0.75 * scale, 0.95 * scale, 1.1 * scale);
  // flower box under the window
  const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.12, 0.14), beam);
  flowerBox.position.set(0.75 * scale, 0.66 * scale, 1.16 * scale);
  for (let i = 0; i < 3; i++) {
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07),
      lam(PALETTE.flowers[i % PALETTE.flowers.length]));
    fl.position.set((0.6 + i * 0.15) * scale, 0.76 * scale, 1.16 * scale);
    g.add(fl);
  }
  // door step + a little lantern by the door
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.08, 0.4 * scale), lam('#9aa0a2'));
  step.position.set(0, 0.04, 1.3 * scale);
  const lanternPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5 * scale, 0.06), beam);
  lanternPost.position.set(-0.55 * scale, 0.25 * scale, 1.25 * scale);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.13),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  lantern.position.set(-0.55 * scale, 0.56 * scale, 1.25 * scale);
  // roof ridge beam
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.1, 0.18), lam('#6a4a30'));
  ridge.position.y = 2.36 * scale;
  g.add(base, door, knob, win, winFrame, flowerBox, step, lanternPost, lantern, ridge);
  return g;
}

function buildWell() {
  const g = new THREE.Group();
  const stone = lam('#8d9294');
  const beam = lam('#6a4a30');
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 8), stone);
  ring.position.y = 0.25;
  ring.castShadow = true;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.52, 8),
    lam('#1c2a34'));
  inner.position.y = 0.26;
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), beam);
    post.position.set(sx * 0.5, 0.9, 0);
    g.add(post);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 5), beam);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.3;
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), beam);
  bucket.position.y = 0.85;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.0), lam('#a85a48'));
  roof.position.y = 1.5;
  roof.castShadow = true;
  const roofTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.6), lam('#8a4638'));
  roofTop.position.y = 1.62;
  g.add(ring, inner, axle, bucket, roof, roofTop);
  return g;
}

function buildStall(awningA = '#c85a4a', awningB = '#f0e8d0') {
  const g = new THREE.Group();
  const beam = lam('#6a4a30');
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.7), lam('#8a6a48'));
  counter.position.y = 0.45;
  counter.castShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), lam('#a8805a'));
  top.position.y = 0.74;
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.5, 0.09), beam);
    post.position.set(sx * 0.82, 0.75, -0.28);
    g.add(post);
  }
  // striped awning
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.95),
      lam(i % 2 ? awningB : awningA));
    stripe.position.set(-0.76 + i * 0.38, 1.55 - 0.02 * Math.abs(i - 2), 0.05);
    stripe.rotation.x = -0.18;
    g.add(stripe);
  }
  // goods on the counter
  const goods = [['#e87a9a', 0.12], ['#f5e88a', 0.1], ['#8ac86a', 0.13]];
  goods.forEach(([c, s], i) => {
    const item = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), lam(c));
    item.position.set(-0.5 + i * 0.5, 0.83, 0.05);
    g.add(item);
  });
  g.add(counter, top);
  return g;
}

function buildForgeCorner() {
  const g = new THREE.Group();
  // anvil
  const anvil = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), lam('#6a4a30'));
  base.position.y = 0.15;
  const bodyA = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.24), lam('#4a4e52'));
  bodyA.position.y = 0.38;
  const horn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.14), lam('#3a3e42'));
  horn.position.set(0.32, 0.4, 0);
  anvil.add(base, bodyA, horn);
  anvil.position.set(0, 0, 0);
  // furnace with glowing coals
  const furnace = new THREE.Group();
  const stones = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), lam('#7d8284'));
  stones.position.y = 0.4;
  stones.castShadow = true;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
  mouth.position.set(0, 0.3, 0.33);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), lam('#646a6c'));
  chimney.position.set(0, 0.95, -0.1);
  const glow = new THREE.PointLight(0xff8a3a, 1.6, 4, 2);
  glow.position.set(0, 0.5, 0.5);
  furnace.add(stones, mouth, chimney, glow);
  furnace.position.set(-1.0, 0, -0.3);
  g.add(anvil, furnace);
  g.userData.anvil = anvil;
  return g;
}

function buildFencedGarden() {
  const g = new THREE.Group();
  const beam = lam('#8a6a48');
  // dirt plot with sprout rows
  const plot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.6), lam(PALETTE.dirt[0]));
  plot.position.y = 0.05;
  g.add(plot);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const sprout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16 + (c % 2) * 0.06, 0.08), lam('#6fbf55'));
      sprout.position.set(-0.85 + c * 0.42, 0.18, -0.5 + r * 0.5);
      g.add(sprout);
    }
  }
  // fence posts + rails around it
  const posts = [];
  for (let i = 0; i <= 4; i++) { posts.push([-1.2 + i * 0.6, -0.95]); posts.push([-1.2 + i * 0.6, 0.95]); }
  for (let i = 1; i <= 2; i++) { posts.push([-1.2, -0.95 + i * 0.633]); posts.push([1.2, -0.95 + i * 0.633]); }
  for (const [px, pz] of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), beam);
    post.position.set(px, 0.2, pz);
    g.add(post);
  }
  for (const rz of [-0.95, 0.95]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.06), beam);
    rail.position.set(0, 0.3, rz);
    g.add(rail);
  }
  for (const rx of [-1.2, 1.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.9), beam);
    rail.position.set(rx, 0.3, 0);
    g.add(rail);
  }
  return g;
}

function buildLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 5), lam('#4a3a2c'));
  pole.position.y = 0.8;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), lam('#4a3a2c'));
  arm.position.set(0.12, 1.56, 0);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  lantern.position.set(0.26, 1.44, 0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), lam('#4a3a2c'));
  cap.position.set(0.26, 1.56, 0);
  g.add(pole, arm, lantern, cap);
  return g;
}

function buildFlowerBed(rng) {
  const g = new THREE.Group();
  // low stone border + a cluster of bright blooms
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.75), lam(PALETTE.dirt[1]));
  bed.position.y = 0.04;
  g.add(bed);
  for (const [sx, sz] of [[-0.55, 0], [0.55, 0]]) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.75), lam('#9aa0a2'));
    stone.position.set(sx, 0.07, sz);
    g.add(stone);
  }
  for (const sz of [-0.38, 0.38]) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.1), lam('#8d9294'));
    stone.position.set(0, 0.07, sz);
    g.add(stone);
  }
  for (let i = 0; i < 6; i++) {
    const col = PALETTE.flowers[Math.floor(rng() * PALETTE.flowers.length)];
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), lam('#4f9857'));
    const px = -0.4 + (i % 3) * 0.4 + (rng() - 0.5) * 0.1;
    const pz = -0.16 + Math.floor(i / 3) * 0.32 + (rng() - 0.5) * 0.08;
    stem.position.set(px, 0.16, pz);
    const bloom = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.11), lam(col));
    bloom.position.set(px, 0.27, pz);
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), lam('#f5e88a'));
    center.position.set(px, 0.28, pz);
    g.add(stem, bloom, center);
  }
  return g;
}

function buildClutter(rng) {
  const g = new THREE.Group();
  // barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 8), lam('#8a6a48'));
  barrel.position.y = 0.25;
  barrel.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.06, 8), lam('#4a4e52'));
  band.position.y = 0.3;
  g.add(barrel, band);
  // crate
  if (rng() < 0.7) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), lam('#a8805a'));
    crate.position.set(0.45, 0.18, 0.1);
    crate.rotation.y = rng();
    crate.castShadow = true;
    g.add(crate);
  }
  return g;
}

// ---------------------------------------------------------------------------
// NPC manager
// ---------------------------------------------------------------------------
export function createNPCs(scene, terrain, decorBlocked, particles) {
  const npcs = [];
  const S2 = terrain.size / 2;

  function blockCells(x, z, r = 1) {
    const [cx, cz] = terrain.cellOf(x, z);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) decorBlocked.add(`${cx + dx},${cz + dz}`);
    }
  }

  function groundAt(ox, oz) {
    const x = terrain.spawn.x + ox, z = terrain.spawn.z + oz;
    return { x, z, y: terrain.surfaceY(x, z) };
  }

  function place(mesh, ox, oz, faceCenter = true, blockR = 1) {
    const spot = groundAt(ox, oz);
    mesh.position.set(spot.x, spot.y, spot.z);
    if (faceCenter) mesh.rotation.y = Math.atan2(terrain.spawn.x - spot.x, terrain.spawn.z - spot.z);
    scene.add(mesh);
    if (blockR >= 0) blockCells(spot.x, spot.z, blockR);
    return spot;
  }

  // --- build the village (positions relative to the flattened spawn pocket) ---
  const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  place(buildHut(0.9), -6, -5);
  place(buildHut(0.85, '#d0b898', '#7a8a5a'), 6.5, -4);
  place(buildHut(0.9, '#c0a888', '#5a7a9a'), -5.5, 6);
  place(buildHut(0.8, '#d8c0a0', '#a85a48'), 7, 5.5);
  place(buildHut(0.75, '#c8b090', '#8a5a88'), 0.5, -8);

  place(buildWell(), 2.8, 2.8, false, 1);
  const stallSpot = place(buildStall(), 4.6, 0.6, true, 1);
  const forgeSpot = place(buildForgeCorner(), -3.6, -2.2, true, 1);
  const gardenSpot = place(buildFencedGarden(), -4.2, 3.4, false, 1);
  place(buildClutter(rng), -5.2, -3.4, false, 0);
  place(buildClutter(rng), 5.6, -2.6, false, 0);
  place(buildClutter(rng), 1.8, -6.4, false, 0);

  for (const [lx, lz] of [[2.5, -2.5], [-2.5, 2.6], [3.2, 4.6], [-3.2, -4.6]]) {
    place(buildLamp(), lx, lz, false, 0);
  }

  // cheerful flower beds by the huts
  for (const [fx, fz] of [[-4.6, -5.8], [5, -5.4], [-6.6, 4.4], [5.6, 4], [2, -7.2], [-1.8, 4.8]]) {
    place(buildFlowerBed(rng), fx, fz, false, -1);
  }

  // IMPORTANT: the spawn clearing must stay walkable — village props must
  // never trap the freshly spawned player (3x3 cells around spawn are freed)
  {
    const [scx, scz] = terrain.cellOf(terrain.spawn.x, terrain.spawn.z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) decorBlocked.delete(`${scx + dx},${scz + dz}`);
    }
  }

  // find a fishing spot for Finn: nearest water within 30 of the village
  let finnSpot = null;
  {
    let best = 30 * 30;
    for (let iz = 1; iz < terrain.size - 1; iz++) {
      for (let ix = 1; ix < terrain.size - 1; ix++) {
        if (terrain.isWaterCell(ix, iz)) continue;
        if (!(terrain.isWaterCell(ix + 1, iz) || terrain.isWaterCell(ix - 1, iz)
          || terrain.isWaterCell(ix, iz + 1) || terrain.isWaterCell(ix, iz - 1))) continue;
        const x = ix - S2 + 0.5, z = iz - S2 + 0.5;
        const d = (x - terrain.spawn.x) ** 2 + (z - terrain.spawn.z) ** 2;
        if (d < best) { best = d; finnSpot = { x, z }; }
      }
    }
  }

  // --- villagers with activity schedules ---
  // station: { ox, oz | abs {x,z}, act: 'idle'|'hammer'|'tend'|'sit'|'fish'|'shop', dur }
  const SCHEDULES = {
    elder: [
      { ox: -4.2, oz: 2.6, act: 'tend' },
      { ox: 2.0, oz: 2.0, act: 'idle' },   // by the well
      { ox: -5.2, oz: -4.2, act: 'sit' },
    ],
    fisher: finnSpot
      ? [{ abs: finnSpot, act: 'fish' }, { ox: 2.2, oz: 1.8, act: 'idle' }]
      : [{ ox: 2.2, oz: 1.8, act: 'idle' }, { ox: 3, oz: -3, act: 'idle' }],
    smith: [
      { ox: -3.4, oz: -1.6, act: 'hammer' },
      { ox: -2.6, oz: -2.8, act: 'idle' },
      { ox: 2.0, oz: 2.4, act: 'idle' },   // well break
    ],
    scout: [
      { ox: 8, oz: 0, act: 'idle' },
      { ox: -8, oz: 2, act: 'idle' },
      { ox: 2, oz: 8, act: 'idle' },
      { ox: 0, oz: -8.5, act: 'idle' },
    ],
    merchant: [
      { ox: 4.6, oz: 1.8, act: 'shop' },
      { ox: 2.4, oz: 1.6, act: 'idle' },
      { ox: 4.6, oz: 1.8, act: 'shop' },
    ],
  };

  const npcStart = [[-3.5, -3], [2.5, 1.5], [-3.2, -1.8], [4, 5.5], [4.2, 3.2]];
  NPC_DEFS.forEach((def, i) => {
    const [ox, oz] = npcStart[i % npcStart.length];
    const spot = groundAt(ox, oz);
    const mesh = buildVillagerMesh(def);
    mesh.position.set(spot.x, spot.y, spot.z);
    scene.add(mesh);

    // floating name tag
    const c = document.createElement('canvas');
    c.width = 128; c.height = 24;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,12,10,0.55)';
    const tw = ctx.measureText(def.name).width + 10;
    ctx.fillRect(64 - tw / 2, 2, tw, 18);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(def.name, 64, 16);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    tag.scale.set(1.6, 0.3, 1);
    tag.position.y = 1.35;
    mesh.add(tag);

    const stations = SCHEDULES[def.id] || [{ ox: 0, oz: 0, act: 'idle' }];
    npcs.push({
      def, mesh,
      home: { x: spot.x, z: spot.z },
      stations, stationIdx: Math.floor(Math.random() * stations.length),
      mode: 'do',                 // 'go' walking to station | 'do' performing
      modeT: 4 + Math.random() * 6,
      anim: Math.random() * 10,
      sparkT: 0,
      dialogIdx: 0,
      questMark: null,
    });
  });

  function stationPos(st) {
    if (st.abs) return { x: st.abs.x, z: st.abs.z };
    return { x: terrain.spawn.x + st.ox, z: terrain.spawn.z + st.oz };
  }

  function update(dt, playerPos, time) {
    for (const n of npcs) {
      n.anim += dt;
      const p = n.mesh.position;
      const u = n.mesh.userData;
      const dP = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      const st = n.stations[n.stationIdx];
      const target = stationPos(st);

      // reset transient pose
      n.mesh.position.y = terrain.surfaceY(p.x, p.z);

      if (dP < 2.6) {
        // greet the player: face them & wave
        n.mesh.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
        u.armR.rotation.x = -2.4 + Math.sin(n.anim * 8) * 0.3;
        u.armL.rotation.x = 0;
        u.legL.rotation.x = u.legR.rotation.x = 0;
        u.head.position.y = 0.72 + Math.sin(n.anim * 2.4) * 0.04;
      } else if (n.mode === 'go') {
        const dx = target.x - p.x, dz = target.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) {
          n.mode = 'do';
          n.modeT = 8 + Math.random() * 9;
        } else {
          const sp = 0.9;
          const nx = p.x + (dx / d) * sp * dt, nz = p.z + (dz / d) * sp * dt;
          const [ix, iz] = terrain.cellOf(nx, nz);
          if (terrain.heightCell(ix, iz) > WATER_LEVEL
              && Math.abs(terrain.surfaceY(nx, nz) - p.y) < 0.8) {
            p.x = nx; p.z = nz;
          } else {
            // sidestep obstacles
            p.x += (dz / d) * sp * dt * 0.7;
            p.z += (-dx / d) * sp * dt * 0.7;
          }
          n.mesh.rotation.y = Math.atan2(dx, dz);
          const sw = Math.sin(n.anim * 9) * 0.5;
          u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
          u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
        }
      } else { // 'do' — perform the station activity
        n.modeT -= dt;
        if (n.modeT <= 0) {
          n.stationIdx = (n.stationIdx + 1) % n.stations.length;
          n.mode = 'go';
        }
        u.legL.rotation.x = u.legR.rotation.x = 0;
        const br = Math.sin(n.anim * 2.4) * 0.04;
        u.head.position.y = 0.72 + br;

        if (st.act === 'hammer') {
          // face the anvil & swing; sparks on the downstroke
          n.mesh.rotation.y = Math.atan2(forgeSpot.x - p.x, forgeSpot.z - p.z);
          const swing = Math.sin(n.anim * 7);
          u.armR.rotation.x = -1.6 + Math.max(0, swing) * 1.8;
          u.armL.rotation.x = -0.3;
          n.sparkT -= dt;
          if (swing > 0.92 && n.sparkT <= 0) {
            n.sparkT = 0.5;
            particles.burst(new THREE.Vector3(forgeSpot.x, forgeSpot.y + 0.5, forgeSpot.z), '#ffb055', 5, 1.8, 5, 0.3);
          }
        } else if (st.act === 'tend') {
          // stoop over the garden, arms working
          n.mesh.rotation.y = Math.atan2(gardenSpot.x - p.x, gardenSpot.z - p.z);
          u.body.rotation.x = 0.3;
          u.head.position.y = 0.66 + br;
          u.armL.rotation.x = -0.8 + Math.sin(n.anim * 3) * 0.3;
          u.armR.rotation.x = -0.8 - Math.sin(n.anim * 3) * 0.3;
        } else if (st.act === 'sit') {
          n.mesh.position.y -= 0.12;
          u.legL.rotation.x = u.legR.rotation.x = 1.4;
          u.armL.rotation.x = u.armR.rotation.x = -0.2;
        } else if (st.act === 'fish') {
          // face the water & hold the pose; occasional ripple
          if (finnSpot) {
            // face away from land toward open water
            n.mesh.rotation.y = Math.atan2(finnSpot.x - terrain.spawn.x, finnSpot.z - terrain.spawn.z);
          }
          u.armR.rotation.x = -1.3;
          u.armL.rotation.x = -0.3;
          if (Math.random() < dt * 0.5) {
            const fx = p.x + Math.sin(n.mesh.rotation.y) * 1.6;
            const fz = p.z + Math.cos(n.mesh.rotation.y) * 1.6;
            particles.burst(new THREE.Vector3(fx, p.y - 0.1, fz), '#c8e8f0', 2, 0.6, 3, 0.35);
          }
        } else if (st.act === 'shop') {
          // stand at the stall, tidy the goods
          n.mesh.rotation.y = Math.atan2(stallSpot.x - p.x, stallSpot.z - p.z);
          u.armL.rotation.x = -0.6 + Math.sin(n.anim * 2.2) * 0.25;
          u.armR.rotation.x = -0.6 - Math.sin(n.anim * 2.2) * 0.25;
        } else { // idle
          u.armL.rotation.x = br; u.armR.rotation.x = -br;
          u.body.rotation.x = 0;
        }
        if (st.act !== 'tend') u.body.rotation.x = 0;
      }

      if (n.questMark) {
        n.questMark.position.y = 1.62 + Math.sin(time * 3) * 0.06;
      }
    }
  }

  function nearest(pos, radius) {
    let best = null, bd = radius * radius;
    for (const n of npcs) {
      const d = (n.mesh.position.x - pos.x) ** 2 + (n.mesh.position.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  return { npcs, update, nearest };
}

// quest marker sprite ('!' available / '?' turn-in)
export function makeQuestMark(char, color) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 4;
  ctx.strokeText(char, 16, 26);
  ctx.fillStyle = color;
  ctx.fillText(char, 16, 26);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.45, 0.45, 1);
  spr.position.y = 1.62;
  return spr;
}
