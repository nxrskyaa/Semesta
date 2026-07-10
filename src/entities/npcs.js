// Village NPCs — chibi animal villagers (Animal Crossing energy): big heads,
// species ears/tails, tiny bodies. They wander near their homes, turn to face
// you, and hand out quests. Also builds the little voxel huts of the village.
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
      'Pet charms summon little companions. Collect all five, I dare you!',
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

  // tiny body in outfit
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.24), cloth);
  body.position.y = 0.34;
  body.castShadow = true;
  // stubby legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.13), fur);
  legL.position.set(-0.08, 0.1, 0);
  const legR = legL.clone(); legR.position.x = 0.08;
  // stubby arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.11), fur);
  armL.position.set(-0.21, 0.36, 0);
  const armR = armL.clone(); armR.position.x = 0.21;

  // big head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.46), fur);
  head.position.y = 0.72;
  head.castShadow = true;
  // muzzle patch
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.04), furLight);
  muzzle.position.set(0, -0.08, 0.24);
  head.add(muzzle);
  // face
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33),
    new THREE.MeshBasicMaterial({ map: villagerFace(def.species), transparent: true }));
  face.position.set(0, 0.02, 0.24);
  head.add(face);

  // species features
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
  g.userData = { head, armL, armR, legL, legR };
  return g;
}

// ---------------------------------------------------------------------------
// village huts
// ---------------------------------------------------------------------------
function buildHut(scale = 1) {
  const g = new THREE.Group();
  const wall = lam('#c8b090');
  const beam = lam('#6a4a30');
  const roof = lam('#a85a48');
  const roofDark = lam('#8a4638');

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 1.5 * scale, 2.2 * scale), wall);
  base.position.y = 0.75 * scale;
  base.castShadow = true;
  base.receiveShadow = true;
  // corner beams
  for (const [dx, dz] of [[-1.15, -1.05], [1.15, -1.05], [-1.15, 1.05], [1.15, 1.05]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5 * scale, 0.16), beam);
    b.position.set(dx * scale, 0.75 * scale, dz * scale);
    g.add(b);
  }
  // roof: stacked slabs
  for (let i = 0; i < 3; i++) {
    const w = (2.8 - i * 0.7) * scale;
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3 * scale, (2.6 - i * 0.6) * scale), i % 2 ? roofDark : roof);
    r.position.y = (1.6 + i * 0.3) * scale;
    r.castShadow = true;
    g.add(r);
  }
  // door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.95 * scale, 0.08), beam);
  door.position.set(0, 0.5 * scale, 1.12 * scale);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), lam('#d8a83a'));
  knob.position.set(0.16 * scale, 0.45 * scale, 1.17 * scale);
  // window
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.45 * scale, 0.06), lam('#8ac4d8'));
  win.position.set(0.75 * scale, 0.95 * scale, 1.12 * scale);
  g.add(base, door, knob, win);
  return g;
}

// ---------------------------------------------------------------------------
// NPC manager
// ---------------------------------------------------------------------------
export function createNPCs(scene, terrain, decorBlocked) {
  const npcs = [];

  // find a walkable spot near an offset from spawn
  function findNear(ox, oz, tries = 30) {
    for (let t = 0; t < tries; t++) {
      const x = terrain.spawn.x + ox + (Math.random() - 0.5) * 3;
      const z = terrain.spawn.z + oz + (Math.random() - 0.5) * 3;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 9) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      return { x, z, y: terrain.surfaceY(x, z) };
    }
    return { x: terrain.spawn.x + ox, z: terrain.spawn.z + oz, y: terrain.spawn.y };
  }

  // --- huts ring the spawn (village of Riverbrook) ---
  const hutOffsets = [[-6, -5], [6.5, -4], [-5, 6]];
  for (const [ox, oz] of hutOffsets) {
    const spot = findNear(ox, oz, 40);
    const hut = buildHut(0.9);
    hut.position.set(spot.x, spot.y, spot.z);
    hut.rotation.y = Math.atan2(terrain.spawn.x - spot.x, terrain.spawn.z - spot.z);
    scene.add(hut);
    // block hut footprint cells
    const [cx, cz] = terrain.cellOf(spot.x, spot.z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) decorBlocked.add(`${cx + dx},${cz + dz}`);
    }
  }

  // --- villagers ---
  const npcOffsets = [[-3.5, -3], [4, 5.5], [3.5, -2.5], [-4.5, 3], [0.5, -5.5]];
  NPC_DEFS.forEach((def, i) => {
    const [ox, oz] = npcOffsets[i % npcOffsets.length];
    const spot = findNear(ox, oz);
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

    npcs.push({
      def, mesh,
      home: { x: spot.x, z: spot.z },
      state: 'idle', t: Math.random() * 4, dir: Math.random() * Math.PI * 2,
      anim: Math.random() * 10,
      dialogIdx: 0,
      questMark: null, // set by the quest system: '!' or '?' sprite
    });
  });

  function update(dt, playerPos, time) {
    for (const n of npcs) {
      n.anim += dt;
      n.t -= dt;
      const p = n.mesh.position;
      const dP = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);

      if (dP < 3) {
        // face the player
        n.mesh.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
        n.state = 'greet';
      } else if (n.t <= 0) {
        n.t = 2 + Math.random() * 4;
        n.state = Math.random() < 0.55 ? 'idle' : 'stroll';
        n.dir = Math.random() * Math.PI * 2;
      }

      if (n.state === 'stroll' && dP >= 3) {
        const vx = Math.cos(n.dir) * 0.7, vz = Math.sin(n.dir) * 0.7;
        const nx = p.x + vx * dt, nz = p.z + vz * dt;
        // keep villagers near home & on land
        const distHome = Math.hypot(nx - n.home.x, nz - n.home.z);
        const [ix, iz] = terrain.cellOf(nx, nz);
        const h = terrain.heightCell(ix, iz);
        if (distHome < 4 && h > WATER_LEVEL && !decorBlocked.has(`${ix},${iz}`)
            && Math.abs(terrain.surfaceY(nx, nz) - p.y) < 0.7) {
          p.x = nx; p.z = nz;
          p.y += (terrain.surfaceY(nx, nz) - p.y) * Math.min(1, dt * 10);
          n.mesh.rotation.y = Math.atan2(vx, vz);
          // waddle
          const u = n.mesh.userData;
          const sw = Math.sin(n.anim * 9) * 0.5;
          u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
          u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = sw * 0.6;
        } else {
          n.dir += 1.8;
        }
      } else {
        const u = n.mesh.userData;
        u.legL.rotation.x = u.legR.rotation.x = 0;
        // idle bob + occasional wave when greeting
        const br = Math.sin(n.anim * 2.4) * 0.04;
        u.head.position.y = 0.72 + br;
        if (n.state === 'greet') {
          u.armR.rotation.x = -2.4 + Math.sin(n.anim * 8) * 0.3;
          u.armL.rotation.x = 0;
        } else {
          u.armL.rotation.x = br; u.armR.rotation.x = -br;
        }
      }

      // quest marker bob
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

// quest marker sprite ('!' available / '?' turn-in) — attached by the quest system
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
