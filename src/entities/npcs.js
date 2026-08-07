// Riverbrook village — chibi animal villagers (Animal Crossing energy) with
// real daily activities: Bruna hammers at her anvil, Finn casts a line, Pip
// tends the market stall, Rio patrols, Elder Maple putters in the herb garden.
// Also builds the village itself: huts, a well, stalls, fences, crops, lamps.
import * as THREE from 'three';
import { bakeStatic } from '../gfx/bake.js';
import { makeSignTexture } from '../gfx/signs.js';
import { makeCritterFaceTexture, PALETTE } from '../gfx/textures.js';
import { WATER_LEVEL } from '../world/terrain.js';
import { sharedMat, sharedBox, sharedCyl, hipRoofGeometry } from '../gfx/meshcache.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Static prop colours are SHARED — a built world was carrying ~2,465 distinct
// materials, which is why the LOW preset barely helped. Nothing in this file
// mutates a material at runtime, so one material per colour is safe here.
function lam(color) { return sharedMat(color); }

export const NPC_DEFS = [
  {
    id: 'elder', name: 'Elder Maple', species: 'bear', role: 'Village Elder',
    fur: '#a8825a', furLight: '#c8a87a', outfit: '#7a5a9a',
    dialog: [
      'Welcome to Anavela Universe, traveler. Our little village could use a hero like you.',
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
    id: 'merchant', name: 'Pip', species: 'bird', role: 'Shopkeeper',
    fur: '#7ab8d8', furLight: '#b8dcE8', outfit: '#c8a03a',
    dialog: [
      'Ooh! Shiny things! I buy fish, crops and materials — and sell seeds!',
      'Save your coins: farm plots and land for your own house are pricey.',
      'Pet charms summon little companions. Collect all ten, I dare you!',
    ],
  },
  {
    id: 'nxr', name: 'Master NXR', species: 'koala', role: 'Gacha Master',
    fur: '#dce0e4', furLight: '#f4f6f8', outfit: '#26262c',
    dialog: [
      'Welcome, welcome! Feeling lucky today, adventurer?',
      'My Wonder Capsules hold charms, whistles... even the legendary Blossom.',
      'One spin, one destiny. The capsules never lie!',
    ],
  },
  // ambient villagers — no quests, just life
  {
    id: 'momo', name: 'Momo', species: 'squirrel', role: 'Village Kid', ambient: true,
    fur: '#c88a5a', furLight: '#e8b88a', outfit: '#e87a9a',
    dialog: [
      'Wanna race?! I always win. ALWAYS!',
      'I saw a chest sparkle over the hill but Mom says monsters are scary.',
      'When I grow up I want a cloud-cat mount!',
    ],
  },
  {
    id: 'tato', name: 'Grandpa Tato', species: 'turtle', role: 'Retired Angler', ambient: true,
    fur: '#8aa86a', furLight: '#c8d8a8', outfit: '#7a6a4a',
    dialog: [
      'Back in my day the Golden Koi was THIS big... no, bigger.',
      'A nap by the well, a grilled minnow... that is the life.',
      'Slow and steady, young one. Slow and steady.',
    ],
  },
  {
    id: 'lulu', name: 'Lulu', species: 'duck', role: 'Dreamer', ambient: true,
    fur: '#f0e8c8', furLight: '#f8f4e0', outfit: '#8a9ae8',
    dialog: [
      'I practice my quacking every morning. Want to hear? QUACK.',
      'The rain is my favorite weather. Puddles!!',
      'Someday I will swim all the way across the big lake.',
    ],
  },
  {
    id: 'bimo', name: 'Bimo', species: 'dog', role: 'Good Boy', ambient: true,
    fur: '#a8825a', furLight: '#d8c0a0', outfit: '#4a9152',
    dialog: [
      'Woof! ...Ahem. I mean, hello, traveler.',
      'I guard the village at night. Nothing gets past this nose.',
      'If you find a bone out there... you know who to call. Woof.',
    ],
  },
  {
    id: 'nyanya', name: 'Nyanya', species: 'catgirl', role: 'Village Sweetheart', ambient: true,
    fur: '#f7b6d2', furLight: '#ffd6e6', outfit: '#e85a9a',
    dialog: [
      'Nyaa~! Hello hello! Your outfit is SO cute, nya!',
      'Pink is the best colour, obviously. Fight me. Gently. Nya~',
      'If you bring me a Golden Koi someday I might just faint from joy!',
      'Did you say hi to the big Barong yet? He looks scary but he is a softie, nya~',
    ],
  },
  {
    id: 'barong', name: 'Barong', species: 'barong', role: 'Village Guardian', ambient: true,
    fur: '#c8302a', furLight: '#f0d24a', outfit: '#1a1a22',
    dialog: [
      'RRROAR... ahem. Greetings, little one. I am Barong, guardian of Anavela Universe.',
      'For ages I have kept the dark spirits beyond the treeline. Fear not while I stand.',
      'The old dances of Bali gave me form. Honour, courage, and a very good mane.',
    ],
  },
  {
    id: 'kobo', name: 'Kobo', species: 'bear', role: 'Wandering Cub', ambient: true,
    fur: '#8a6a4a', furLight: '#c8a87a', outfit: '#5a9ad0',
    dialog: [
      'I walked SO far from the village! Look how brave I am!',
      'Did you see the windmill? The big blades go whoooosh!',
      'One day I will climb the ruined tower. When I am taller. And braver.',
    ],
  },
  {
    id: 'pesca', name: 'Pesca', species: 'cat', role: 'Shoreline Dreamer', ambient: true,
    fur: '#e0c86a', furLight: '#f4e6a8', outfit: '#3a7a8a',
    dialog: [
      'The best fishing spots are far from the noisy village, nya.',
      'I am not lost. I am... exploring. Definitely exploring.',
      'If you build a house out here, invite me for grilled fish!',
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
      mouth: (species === 'cat' || species === 'catgirl') ? 'w' : 'smile',
      cheeks: 'rgba(240,150,140,0.6)',
    }));
  }
  return faceCache.get(species);
}

// Barong — a Balinese guardian lion. Ornate red/gold/white mask with bulging
// eyes, a fanged grin, a crown, and a layered mane. A proud cultural landmark.
function buildBarong(def) {
  const g = new THREE.Group();
  const red = lam('#c8302a'), gold = lam('#f0c840'), white = lam('#f4f0e4'), black = lam('#1a1a22');

  const body = new THREE.Mesh(sharedBox(0.5, 0.42, 0.36), lam('#8a1e1a'));
  body.position.y = 0.42; body.castShadow = true;
  const sash = new THREE.Mesh(sharedBox(0.54, 0.1, 0.4), gold);
  sash.position.y = 0.5; g.add(sash);
  const legL = new THREE.Mesh(sharedBox(0.15, 0.24, 0.16), black);
  legL.position.set(-0.13, 0.12, 0);
  const legR = legL.clone(); legR.position.x = 0.13;
  for (const leg of [legL, legR]) {
    const anklet = new THREE.Mesh(sharedBox(0.17, 0.05, 0.18), gold);
    anklet.position.y = -0.09; leg.add(anklet);
  }
  const armL = new THREE.Mesh(sharedBox(0.12, 0.26, 0.13), red);
  armL.position.set(-0.32, 0.44, 0);
  const armR = armL.clone(); armR.position.x = 0.32;

  // big ornate head
  const head = new THREE.Mesh(sharedBox(0.66, 0.58, 0.5), red);
  head.position.y = 0.9; head.castShadow = true;
  // layered mane: rings of pointed tufts around the head (red -> gold -> white)
  const maneRing = (radius, len, mat, ry0, count, y) => {
    for (let i = 0; i < count; i++) {
      const a = ry0 + (i / count) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, len, 5), mat);
      tuft.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius - 0.1);
      tuft.rotation.z = -Math.cos(a) * 1.2;
      tuft.rotation.x = Math.sin(a) * 1.2 - 0.3;
      head.add(tuft);
    }
  };
  maneRing(0.42, 0.34, white, 0.2, 14, 0.02);
  maneRing(0.38, 0.28, gold, 0.0, 12, 0.05);
  maneRing(0.3, 0.22, red, 0.3, 10, 0.08);
  // bulging googly eyes
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), white);
    eyeWhite.position.set(sx * 0.16, 0.08, 0.25); head.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), black);
    pupil.position.set(sx * 0.16, 0.08, 0.33); head.add(pupil);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), gold);
    rim.position.set(sx * 0.16, 0.08, 0.26); head.add(rim);
    // bushy brow
    const brow = new THREE.Mesh(sharedBox(0.16, 0.06, 0.06), white);
    brow.position.set(sx * 0.16, 0.2, 0.24); brow.rotation.z = sx * 0.3; head.add(brow);
  }
  // fanged grin
  const mouth = new THREE.Mesh(sharedBox(0.34, 0.12, 0.06), black);
  mouth.position.set(0, -0.16, 0.25); head.add(mouth);
  const tongue = new THREE.Mesh(sharedBox(0.14, 0.06, 0.04), lam('#e05a6a'));
  tongue.position.set(0, -0.17, 0.28); head.add(tongue);
  for (const sx of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), white);
    fang.position.set(sx * 0.12, -0.13, 0.27); fang.rotation.x = Math.PI; head.add(fang);
  }
  // gold crown
  for (let i = -1; i <= 1; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18 - Math.abs(i) * 0.04, 5), gold);
    spike.position.set(i * 0.14, 0.34, 0.06); head.add(spike);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), lam('#5ad0f0'));
  gem.position.set(0, 0.28, 0.24); head.add(gem);

  g.add(body, legL, legR, armL, armR, head);
  g.userData = { head, armL, armR, legL, legR, body, headBaseY: head.position.y, stationary: true };
  return g;
}

function buildVillagerMesh(def) {
  if (def.species === 'barong') return buildBarong(def);
  const g = new THREE.Group();
  const fur = lam(def.fur);
  const furLight = lam(def.furLight);
  const cloth = lam(def.outfit);

  const body = new THREE.Mesh(sharedBox(0.34, 0.3, 0.24), cloth);
  body.position.y = 0.34;
  body.castShadow = true;
  const legL = new THREE.Mesh(sharedBox(0.11, 0.2, 0.13), fur);
  legL.position.set(-0.08, 0.1, 0);
  const legR = legL.clone(); legR.position.x = 0.08;
  const armL = new THREE.Mesh(sharedBox(0.09, 0.22, 0.11), fur);
  armL.position.set(-0.21, 0.36, 0);
  const armR = armL.clone(); armR.position.x = 0.21;

  const head = new THREE.Mesh(sharedBox(0.5, 0.44, 0.46), fur);
  head.position.y = 0.72;
  head.castShadow = true;
  const muzzle = new THREE.Mesh(sharedBox(0.24, 0.16, 0.04), furLight);
  muzzle.position.set(0, -0.08, 0.24);
  head.add(muzzle);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33),
    new THREE.MeshBasicMaterial({ map: villagerFace(def.species), transparent: true }));
  face.position.set(0, 0.02, 0.24);
  head.add(face);

  if (def.species === 'cat') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.12, 0.16, 0.08), fur);
      ear.position.set(sx * 0.17, 0.28, 0);
      ear.rotation.z = -sx * 0.25;
      head.add(ear);
      const inner = new THREE.Mesh(sharedBox(0.06, 0.08, 0.02), furLight);
      inner.position.set(0, 0, 0.04); ear.add(inner);
    }
    const tail = new THREE.Mesh(sharedBox(0.08, 0.3, 0.08), fur);
    tail.position.set(0.12, 0.3, -0.16);
    tail.rotation.x = -0.5;
    g.add(tail);
  } else if (def.species === 'catgirl') {
    // pink cat-girl: ears, tail, a hair bow and a soft fringe
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.12, 0.16, 0.08), fur);
      ear.position.set(sx * 0.17, 0.28, 0);
      ear.rotation.z = -sx * 0.25;
      head.add(ear);
      const inner = new THREE.Mesh(sharedBox(0.06, 0.08, 0.02), lam('#ffe0ec'));
      inner.position.set(0, 0, 0.04); ear.add(inner);
    }
    // hair fringe across the brow + side locks (deeper pink)
    const hairC = lam('#f28ab8');
    const fringe = new THREE.Mesh(sharedBox(0.5, 0.12, 0.08), hairC);
    fringe.position.set(0, 0.16, 0.2); head.add(fringe);
    for (const sx of [-1, 1]) {
      const lock = new THREE.Mesh(sharedBox(0.09, 0.34, 0.12), hairC);
      lock.position.set(sx * 0.26, -0.02, 0.06); head.add(lock);
    }
    // a cute bow on one ear
    const bow = new THREE.Mesh(sharedBox(0.14, 0.08, 0.06), lam('#ffd24a'));
    bow.position.set(0.2, 0.4, 0.02); head.add(bow);
    const bowKnot = new THREE.Mesh(sharedBox(0.05, 0.05, 0.05), lam('#e8a83a'));
    bowKnot.position.set(0.2, 0.4, 0.05); head.add(bowKnot);
    const tail = new THREE.Mesh(sharedBox(0.08, 0.32, 0.08), fur);
    tail.position.set(0.12, 0.3, -0.16); tail.rotation.x = -0.4;
    const tailTip = new THREE.Mesh(sharedBox(0.09, 0.09, 0.09), lam('#ffd6e6'));
    tailTip.position.set(0.12, 0.46, -0.22);
    g.add(tail, tailTip);
  } else if (def.species === 'bear') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.14, 0.12, 0.08), fur);
      ear.position.set(sx * 0.2, 0.26, 0);
      head.add(ear);
    }
  } else if (def.species === 'rabbit') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.1, 0.34, 0.06), fur);
      ear.position.set(sx * 0.13, 0.4, 0);
      ear.rotation.z = -sx * 0.12;
      head.add(ear);
      const inner = new THREE.Mesh(sharedBox(0.05, 0.24, 0.02), furLight);
      inner.position.set(0, 0, 0.035); ear.add(inner);
    }
    const puff = new THREE.Mesh(sharedBox(0.12, 0.12, 0.1), furLight);
    puff.position.set(0, 0.32, -0.16);
    g.add(puff);
  } else if (def.species === 'bird') {
    const beak = new THREE.Mesh(sharedBox(0.09, 0.07, 0.12), lam('#f0a83d'));
    beak.position.set(0, -0.05, 0.28);
    head.add(beak);
    const tuft = new THREE.Mesh(sharedBox(0.07, 0.14, 0.07), furLight);
    tuft.position.set(0, 0.28, 0);
    tuft.rotation.z = 0.2;
    head.add(tuft);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(sharedBox(0.06, 0.18, 0.2), furLight);
      wing.position.set(sx * 0.21, 0.36, -0.02);
      g.add(wing);
    }
  } else if (def.species === 'koala') {
    // Master NXR — modeled after the NXR mascot: fluffy koala, VR visor,
    // golden batik headband & sash
    for (const sx of [-1, 1]) {
      // big fluffy round ears with pink inners
      const ear = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), furLight);
      ear.position.set(sx * 0.28, 0.2, -0.02);
      head.add(ear);
      const earFluff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), fur);
      earFluff.position.set(sx * 0.34, 0.28, -0.02);
      head.add(earFluff);
      const inner = new THREE.Mesh(sharedBox(0.1, 0.1, 0.04), lam('#f0b8c0'));
      inner.position.set(sx * 0.26, 0.19, 0.08);
      head.add(inner);
    }
    // VR visor with the NXR wordmark
    const visorC = document.createElement('canvas');
    visorC.width = 32; visorC.height = 12;
    const vctx = visorC.getContext('2d');
    vctx.fillStyle = '#2a2a30'; vctx.fillRect(0, 0, 32, 12);
    vctx.fillStyle = '#3a3a42'; vctx.fillRect(1, 1, 30, 3);
    vctx.fillStyle = '#9a9aa4';
    vctx.font = 'bold 7px monospace'; vctx.textAlign = 'center';
    vctx.fillText('NXR', 16, 9);
    const visorTex = new THREE.CanvasTexture(visorC);
    visorTex.magFilter = THREE.NearestFilter;
    const visor = new THREE.Mesh(sharedBox(0.46, 0.16, 0.1),
      [lam('#2a2a30'), lam('#2a2a30'), lam('#2a2a30'), lam('#2a2a30'),
        new THREE.MeshBasicMaterial({ map: visorTex }), lam('#2a2a30')]);
    visor.position.set(0, 0.04, 0.22);
    head.add(visor);
    const strap = new THREE.Mesh(sharedBox(0.52, 0.1, 0.46), lam('#1e1e24'));
    strap.position.set(0, 0.04, -0.02);
    head.add(strap);
    // golden batik headband with a knot on top
    const band = new THREE.Mesh(sharedBox(0.52, 0.09, 0.48), lam('#c8963a'));
    band.position.set(0, 0.18, 0);
    const knot = new THREE.Mesh(sharedBox(0.14, 0.12, 0.12), lam('#e8b84a'));
    knot.position.set(0, 0.28, 0.06);
    head.add(band, knot);
    // koala nose
    const nose = new THREE.Mesh(sharedBox(0.1, 0.13, 0.05), lam('#2a2a30'));
    nose.position.set(0, -0.1, 0.25);
    head.add(nose);
    // golden ornate collar + batik sarong hem
    const collar = new THREE.Mesh(sharedBox(0.38, 0.08, 0.28), lam('#c8963a'));
    collar.position.y = 0.5;
    const sarong = new THREE.Mesh(sharedBox(0.36, 0.12, 0.26), lam('#c8963a'));
    sarong.position.y = 0.18;
    const sarongDark = new THREE.Mesh(sharedBox(0.37, 0.06, 0.27), lam('#1e1e24'));
    sarongDark.position.y = 0.23;
    // golden anklets
    for (const sx of [-1, 1]) {
      const anklet = new THREE.Mesh(sharedBox(0.13, 0.05, 0.15), lam('#e8b84a'));
      anklet.position.set(sx * 0.08, 0.04, 0);
      g.add(anklet);
    }
    g.add(collar, sarong, sarongDark);
  } else if (def.species === 'squirrel') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.1, 0.12, 0.06), fur);
      ear.position.set(sx * 0.16, 0.27, 0);
      head.add(ear);
    }
    // big fluffy tail curling up the back
    const tail1 = new THREE.Mesh(sharedBox(0.14, 0.3, 0.14), fur);
    tail1.position.set(0, 0.35, -0.22);
    tail1.rotation.x = -0.3;
    const tail2 = new THREE.Mesh(sharedBox(0.16, 0.2, 0.16), furLight);
    tail2.position.set(0, 0.58, -0.28);
    g.add(tail1, tail2);
  } else if (def.species === 'turtle') {
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), lam('#5a8a52'));
    shell.position.set(0, 0.4, -0.16);
    shell.scale.set(1, 0.75, 0.8);
    g.add(shell);
  } else if (def.species === 'duck') {
    const bill = new THREE.Mesh(sharedBox(0.16, 0.05, 0.12), lam('#f0a83d'));
    bill.position.set(0, -0.07, 0.28);
    head.add(bill);
    const tailNub = new THREE.Mesh(sharedBox(0.12, 0.1, 0.1), furLight);
    tailNub.position.set(0, 0.36, -0.18);
    tailNub.rotation.x = 0.5;
    g.add(tailNub);
  } else if (def.species === 'dog') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.1, 0.16, 0.06), lam('#8a6a48'));
      ear.position.set(sx * 0.19, 0.2, 0.04);
      ear.rotation.z = -sx * 0.5;
      head.add(ear);
    }
    const snout = new THREE.Mesh(sharedBox(0.14, 0.1, 0.08), furLight);
    snout.position.set(0, -0.1, 0.26);
    head.add(snout);
    const nose = new THREE.Mesh(sharedBox(0.06, 0.05, 0.03), lam('#2a2620'));
    nose.position.set(0, -0.08, 0.3);
    head.add(nose);
    const tail = new THREE.Mesh(sharedBox(0.07, 0.22, 0.07), fur);
    tail.position.set(0, 0.36, -0.18);
    tail.rotation.x = -0.7;
    g.add(tail);
  } else if (def.species === 'badger') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(sharedBox(0.1, 0.1, 0.06), lam('#4a4650'));
      ear.position.set(sx * 0.18, 0.26, 0);
      head.add(ear);
    }
    const stripe = new THREE.Mesh(sharedBox(0.1, 0.44, 0.02), furLight);
    stripe.position.set(0, 0, 0.235);
    head.add(stripe);
  }

  g.add(body, legL, legR, armL, armR, head);
  g.userData = { head, armL, armR, legL, legR, body, headBaseY: head.position.y };
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

  const base = new THREE.Mesh(sharedBox(2.4 * scale, 1.5 * scale, 2.2 * scale), wall);
  base.position.y = 0.75 * scale;
  base.castShadow = true;
  base.receiveShadow = true;
  for (const [dx, dz] of [[-1.15, -1.05], [1.15, -1.05], [-1.15, 1.05], [1.15, 1.05]]) {
    const b = new THREE.Mesh(sharedBox(0.16, 1.5 * scale, 0.16), beam);
    b.position.set(dx * scale, 0.75 * scale, dz * scale);
    g.add(b);
  }
  // cross beam under the roof
  const cross = new THREE.Mesh(sharedBox(2.5 * scale, 0.12, 0.12), beam);
  cross.position.set(0, 1.45 * scale, 1.08 * scale);
  g.add(cross);
  // A REAL HIP ROOF. This used to be three flat slabs of decreasing size stacked
  // on each other, which reads as a tiered cake, not a building — it was the
  // main reason the basecamp looked unfinished. Now it is the actual solid:
  // an overhanging eave line rising to a ridge, sitting on a fascia band.
  const eaveW = 3.0 * scale, eaveD = 2.8 * scale;
  const fascia = new THREE.Mesh(sharedBox(eaveW, 0.16 * scale, eaveD), roofDark);
  fascia.position.y = 1.56 * scale;
  fascia.castShadow = true;
  const hip = new THREE.Mesh(hipRoofGeometry(eaveW, eaveD, 0.95 * scale, 0.42), roof);
  hip.position.y = 1.64 * scale;
  hip.castShadow = true;
  g.add(fascia, hip);
  // chimney
  const chimney = new THREE.Mesh(sharedBox(0.3 * scale, 0.6 * scale, 0.3 * scale), lam('#8d9294'));
  chimney.position.set(0.62 * scale, 2.28 * scale, -0.35 * scale);
  g.add(chimney);
  const door = new THREE.Mesh(sharedBox(0.55 * scale, 0.95 * scale, 0.08), beam);
  door.position.set(0, 0.5 * scale, 1.12 * scale);
  const knob = new THREE.Mesh(sharedBox(0.07, 0.07, 0.04), lam('#d8a83a'));
  knob.position.set(0.16 * scale, 0.45 * scale, 1.17 * scale);
  const win = new THREE.Mesh(sharedBox(0.5 * scale, 0.45 * scale, 0.06), lam('#8ac4d8'));
  win.position.set(0.75 * scale, 0.95 * scale, 1.12 * scale);
  const winFrame = new THREE.Mesh(sharedBox(0.56 * scale, 0.51 * scale, 0.04), beam);
  winFrame.position.set(0.75 * scale, 0.95 * scale, 1.1 * scale);
  // flower box under the window
  const flowerBox = new THREE.Mesh(sharedBox(0.5 * scale, 0.12, 0.14), beam);
  flowerBox.position.set(0.75 * scale, 0.66 * scale, 1.16 * scale);
  for (let i = 0; i < 3; i++) {
    const fl = new THREE.Mesh(sharedBox(0.07, 0.07, 0.07),
      lam(PALETTE.flowers[i % PALETTE.flowers.length]));
    fl.position.set((0.6 + i * 0.15) * scale, 0.76 * scale, 1.16 * scale);
    g.add(fl);
  }
  // door step + a little lantern by the door
  const step = new THREE.Mesh(sharedBox(0.7 * scale, 0.08, 0.4 * scale), lam('#9aa0a2'));
  step.position.set(0, 0.04, 1.3 * scale);
  const lanternPost = new THREE.Mesh(sharedBox(0.06, 0.5 * scale, 0.06), beam);
  lanternPost.position.set(-0.55 * scale, 0.25 * scale, 1.25 * scale);
  const lantern = new THREE.Mesh(sharedBox(0.13, 0.15, 0.13),
    new THREE.MeshBasicMaterial({ color: 0xffd88a }));
  lantern.position.set(-0.55 * scale, 0.56 * scale, 1.25 * scale);
  // roof ridge beam
  // ridge cap, on the real ridge line (eave 1.64 + rise 0.95)
  const ridge = new THREE.Mesh(sharedBox(1.34 * scale, 0.12 * scale, 0.2 * scale), roofDark);
  ridge.position.y = 2.6 * scale;
  g.add(base, door, knob, win, winFrame, flowerBox, step, lanternPost, lantern, ridge);
  return g;
}

function buildWell() {
  const g = new THREE.Group();
  const stone = lam('#8d9294');
  const beam = lam('#6a4a30');
  const ring = new THREE.Mesh(sharedCyl(0.55, 0.6, 0.5, 8), stone);
  ring.position.y = 0.25;
  ring.castShadow = true;
  const inner = new THREE.Mesh(sharedCyl(0.4, 0.4, 0.52, 8),
    lam('#1c2a34'));
  inner.position.y = 0.26;
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(sharedBox(0.1, 1.0, 0.1), beam);
    post.position.set(sx * 0.5, 0.9, 0);
    g.add(post);
  }
  const axle = new THREE.Mesh(sharedCyl(0.04, 0.04, 1.05, 5), beam);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.3;
  const bucket = new THREE.Mesh(sharedBox(0.18, 0.16, 0.18), beam);
  bucket.position.y = 0.85;
  const roof = new THREE.Mesh(sharedBox(1.4, 0.14, 1.0), lam('#a85a48'));
  roof.position.y = 1.5;
  roof.castShadow = true;
  const roofTop = new THREE.Mesh(sharedBox(0.9, 0.12, 0.6), lam('#8a4638'));
  roofTop.position.y = 1.62;
  g.add(ring, inner, axle, bucket, roof, roofTop);
  return g;
}

function buildStall(awningA = '#c85a4a', awningB = '#f0e8d0') {
  const g = new THREE.Group();
  const beam = lam('#6a4a30');
  const counter = new THREE.Mesh(sharedBox(1.7, 0.5, 0.7), lam('#8a6a48'));
  counter.position.y = 0.45;
  counter.castShadow = true;
  const top = new THREE.Mesh(sharedBox(1.8, 0.08, 0.8), lam('#a8805a'));
  top.position.y = 0.74;
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(sharedBox(0.09, 1.5, 0.09), beam);
    post.position.set(sx * 0.82, 0.75, -0.28);
    g.add(post);
  }
  // striped awning
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(sharedBox(0.38, 0.05, 0.95),
      lam(i % 2 ? awningB : awningA));
    stripe.position.set(-0.76 + i * 0.38, 1.55 - 0.02 * Math.abs(i - 2), 0.05);
    stripe.rotation.x = -0.18;
    g.add(stripe);
  }
  // goods on the counter
  const goods = [['#e87a9a', 0.12], ['#f5e88a', 0.1], ['#8ac86a', 0.13]];
  goods.forEach(([c, s], i) => {
    const item = new THREE.Mesh(sharedBox(s, s, s), lam(c));
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
  const base = new THREE.Mesh(sharedBox(0.3, 0.3, 0.3), lam('#6a4a30'));
  base.position.y = 0.15;
  const bodyA = new THREE.Mesh(sharedBox(0.5, 0.16, 0.24), lam('#4a4e52'));
  bodyA.position.y = 0.38;
  const horn = new THREE.Mesh(sharedBox(0.18, 0.1, 0.14), lam('#3a3e42'));
  horn.position.set(0.32, 0.4, 0);
  anvil.add(base, bodyA, horn);
  anvil.position.set(0, 0, 0);
  // furnace with glowing coals
  const furnace = new THREE.Group();
  const stones = new THREE.Mesh(sharedBox(0.9, 0.8, 0.7), lam('#7d8284'));
  stones.position.y = 0.4;
  stones.castShadow = true;
  const mouth = new THREE.Mesh(sharedBox(0.5, 0.34, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
  mouth.position.set(0, 0.3, 0.33);
  const chimney = new THREE.Mesh(sharedBox(0.3, 0.5, 0.3), lam('#646a6c'));
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
  const plot = new THREE.Mesh(sharedBox(2.2, 0.1, 1.6), lam(PALETTE.dirt[0]));
  plot.position.y = 0.05;
  g.add(plot);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const sprout = new THREE.Mesh(sharedBox(0.08, 0.16 + (c % 2) * 0.06, 0.08), lam('#6fbf55'));
      sprout.position.set(-0.85 + c * 0.42, 0.18, -0.5 + r * 0.5);
      g.add(sprout);
    }
  }
  // fence posts + rails around it
  const posts = [];
  for (let i = 0; i <= 4; i++) { posts.push([-1.2 + i * 0.6, -0.95]); posts.push([-1.2 + i * 0.6, 0.95]); }
  for (let i = 1; i <= 2; i++) { posts.push([-1.2, -0.95 + i * 0.633]); posts.push([1.2, -0.95 + i * 0.633]); }
  for (const [px, pz] of posts) {
    const post = new THREE.Mesh(sharedBox(0.08, 0.4, 0.08), beam);
    post.position.set(px, 0.2, pz);
    g.add(post);
  }
  for (const rz of [-0.95, 0.95]) {
    const rail = new THREE.Mesh(sharedBox(2.4, 0.06, 0.06), beam);
    rail.position.set(0, 0.3, rz);
    g.add(rail);
  }
  for (const rx of [-1.2, 1.2]) {
    const rail = new THREE.Mesh(sharedBox(0.06, 0.06, 1.9), beam);
    rail.position.set(rx, 0.3, 0);
    g.add(rail);
  }
  return g;
}

let _poolTex = null;
function lampPoolMat() {
  if (!_poolTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g4 = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    g4.addColorStop(0, 'rgba(255,214,150,0.55)');
    g4.addColorStop(0.25, 'rgba(255,186,105,0.3)');
    g4.addColorStop(0.55, 'rgba(255,158,78,0.11)');
    g4.addColorStop(0.8, 'rgba(255,146,66,0.03)');
    g4.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g4; ctx.fillRect(0, 0, 64, 64);
    _poolTex = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshBasicMaterial({
    map: _poolTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

// ---------------------------------------------------------------------------
// THE TEMPLE PLAZA — the floor of Anavela Universe.
//
// The old basecamp was a scatter: five huts at arbitrary offsets, the well
// off-centre, the shop, forge and capsule machine wherever they happened to
// fit. Nothing lined up with anything, and the ground under it was a single
// flat tile. It read as placed, not designed.
//
// This is built the way a real plaza is: ONE focal point at dead centre, FOUR
// cardinal avenues out of it, and everything else arranged on those axes at
// matched radii. Symmetry is what makes a public space read as built.
//
// Palette follows the Rialo temple language — cream/parchment paving, warm gold
// inlay, deep green-black structure, muted stone.
// ---------------------------------------------------------------------------
const PZ = {
  pave: '#e8dfc4',       // cream flagstone
  paveAlt: '#dcd0b0',    // its darker sibling, for the checker
  grout: '#b3a684',      // the joint between stones
  gold: '#d8a94a',       // inlay
  goldDim: '#a8823a',
  stone: '#9a9488',      // structural stone
  stoneDark: '#6e6a60',
  ink: '#232a24',        // deep green-black
};

/**
 * The paved plaza: a central rosette, four avenues, a ring walk and a stepped
 * kerb. All flat geometry laid just above the terrain, with polygonOffset so it
 * never z-fights the ground.
 */
function buildPlazaFloor() {
  const g = new THREE.Group();

  // Every piece of paving is collected by COLOUR and merged into one mesh per
  // tone. Laying 251 separate meshes cost 251 draw calls that could never batch
  // and were always on screen — measured, that alone took the LOW preset from
  // 109 draw calls to 982 and the frame from 3ms to 29ms. Same picture, six
  // draw calls.
  const buckets = new Map();
  const add = (geo, color, y, rotY = 0, x = 0, z = 0) => {
    geo = geo.clone();
    geo.rotateX(-Math.PI / 2);
    if (rotY) geo.rotateY(rotY);
    geo.translate(x, y, z);
    if (!buckets.has(color)) buckets.set(color, []);
    buckets.get(color).push(geo);
  };

  const R = 11.5;

  // --- the ring walk: alternating flagstone courses, grout showing through ---
  for (let ring = 0; ring < 4; ring++) {
    const r0 = 3.4 + ring * 2.0;
    const r1 = r0 + 2.0;
    const seg = 24 + ring * 6;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 0.86) / seg) * Math.PI * 2;   // the gap IS the grout
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      shape.lineTo(Math.cos(a0) * (r1 - 0.14), Math.sin(a0) * (r1 - 0.14));
      shape.lineTo(Math.cos(a1) * (r1 - 0.14), Math.sin(a1) * (r1 - 0.14));
      shape.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
      shape.closePath();
      add(new THREE.ShapeGeometry(shape), (i + ring) % 2 ? PZ.pave : PZ.paveAlt, 0.03);
    }
  }
  add(new THREE.CircleGeometry(R, 40), PZ.grout, 0.02);

  // --- the ROSETTE at dead centre -------------------------------------------
  add(new THREE.CircleGeometry(3.4, 32), PZ.paveAlt, 0.035);
  add(new THREE.RingGeometry(3.2, 3.4, 32), PZ.gold, 0.045);
  add(new THREE.RingGeometry(2.5, 2.62, 32), PZ.goldDim, 0.045);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(Math.cos(a - 0.13) * 2.4, Math.sin(a - 0.13) * 2.4);
    sh.lineTo(Math.cos(a) * 2.9, Math.sin(a) * 2.9);
    sh.lineTo(Math.cos(a + 0.13) * 2.4, Math.sin(a + 0.13) * 2.4);
    sh.closePath();
    add(new THREE.ShapeGeometry(sh), i % 2 ? PZ.gold : PZ.goldDim, 0.05);
  }
  add(new THREE.CircleGeometry(0.75, 16), PZ.pave, 0.055);
  add(new THREE.RingGeometry(0.68, 0.78, 16), PZ.gold, 0.06);

  // --- four AVENUES on the cardinal axes ------------------------------------
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.sin(a) * (R / 2 + 1.6), cz = Math.cos(a) * (R / 2 + 1.6);
    add(new THREE.PlaneGeometry(2.6, R + 3.5), PZ.pave, 0.055, a, cx, cz);
    for (const sdir of [-1.3, 1.3]) {
      add(new THREE.PlaneGeometry(0.14, R + 3.5), PZ.goldDim, 0.06, a,
        cx + Math.cos(a) * sdir, cz - Math.sin(a) * sdir);
    }
    for (let k = 0; k < 9; k++) {
      const d = 3.6 + k * 1.5;
      add(new THREE.PlaneGeometry(2.5, 0.1), PZ.grout, 0.062, a, Math.sin(a) * d, Math.cos(a) * d);
    }
  }

  // one mesh per tone
  for (const [color, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }));
    m.receiveShadow = true;
    g.add(m);
  }

  // --- the stepped kerb: also merged, two tones ------------------------------
  const kerbBuckets = new Map();
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const geo = new THREE.BoxGeometry(1.7, 0.22, 0.5);
    geo.rotateY(-a);
    geo.translate(Math.cos(a) * R, 0.11, Math.sin(a) * R);
    const c = i % 2 ? PZ.stone : PZ.stoneDark;
    if (!kerbBuckets.has(c)) kerbBuckets.set(c, []);
    kerbBuckets.get(c).push(geo);
  }
  for (const [color, geos] of kerbBuckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }));
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/**
 * The centrepiece: a tiered stone shrine-fountain. Three stepped octagonal
 * plinths, a carved pillar, a gold finial, and water spilling into the basin.
 * This is what the whole plaza points at.
 */
function buildCenterShrine() {
  const g = new THREE.Group();
  // three stepped octagonal plinths
  const tiers = [[3.0, 0.28], [2.35, 0.26], [1.75, 0.24]];
  let y = 0;
  for (let i = 0; i < tiers.length; i++) {
    const [r, h] = tiers[i];
    const step = new THREE.Mesh(sharedCyl(r, r + 0.1, h, 8), lam(i % 2 ? PZ.stone : PZ.pave));
    step.position.y = y + h / 2;
    step.castShadow = true; step.receiveShadow = true;
    g.add(step);
    y += h;
  }
  // THE BASIN: a rippling disc, not a flat plate. It is a subdivided plane so
  // update() can roll a couple of crossing sines through it, which is the whole
  // difference between "there is water here" and a blue lid.
  const basinGeo = new THREE.CircleGeometry(1.5, 24, 0, Math.PI * 2);
  {
    // subdivide by pushing a second ring of vertices in — CircleGeometry is a
    // fan, so the rim moves and the centre does not unless we help it
    const pos = basinGeo.attributes.position;
    basinGeo.userData.base = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) basinGeo.userData.base[i] = pos.getZ(i);
  }
  const basin = new THREE.Mesh(basinGeo, new THREE.MeshPhongMaterial({
    color: 0x4fbfe4, transparent: true, opacity: 0.86, shininess: 90,
    specular: 0x9fe8ff, side: THREE.DoubleSide,
  }));
  basin.rotation.x = -Math.PI / 2;
  basin.position.y = y + 0.11;
  basin.userData.dynamic = true;
  g.add(basin);
  // a pale shallow ring where the water meets the stone, so the basin has an
  // edge instead of ending in a hard line
  const shallow = new THREE.Mesh(new THREE.RingGeometry(1.24, 1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xcdf2ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = y + 0.115;
  g.add(shallow);
  const rim = new THREE.Mesh(sharedCyl(1.62, 1.66, 0.2, 8), lam(PZ.stoneDark));
  rim.position.y = y + 0.04; g.add(rim);

  // the carved pillar
  const shaft = new THREE.Mesh(sharedCyl(0.34, 0.42, 2.1, 8), lam(PZ.pave));
  shaft.position.y = y + 1.15; shaft.castShadow = true; g.add(shaft);
  // gold bands up the shaft
  for (const by of [0.5, 1.15, 1.8]) {
    const band = new THREE.Mesh(sharedCyl(0.4, 0.4, 0.09, 8), lam(PZ.gold));
    band.position.y = y + by; g.add(band);
  }
  // a flared capital and a gold finial
  const cap = new THREE.Mesh(sharedCyl(0.62, 0.36, 0.3, 8), lam(PZ.stone));
  cap.position.y = y + 2.32; g.add(cap);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lam(PZ.gold));
  orb.position.y = y + 2.72; g.add(orb);
  const spike = new THREE.Mesh(sharedCyl(0.02, 0.1, 0.5, 6), lam(PZ.gold));
  spike.position.y = y + 3.1; g.add(spike);

  // FOUR ARCING JETS. These were four thin boxes at 0.6 opacity — literally
  // vertical blue lines, which is exactly what they looked like. Water thrown
  // from a spout follows a parabola, so each jet is a TUBE swept along one, with
  // a scrolling streak texture running down it. That, the splash where it lands
  // and the mist above the basin are what make it read as a fountain.
  const jetTex = (() => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(190,235,250,0.30)';
    ctx.fillRect(0, 0, 8, 32);
    // uneven bright streaks: falling water is not a uniform ribbon
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(Math.random() * 8);
      const yy = Math.floor(Math.random() * 32);
      const h = 2 + Math.floor(Math.random() * 6);
      ctx.fillStyle = `rgba(240,253,255,${0.35 + Math.random() * 0.5})`;
      ctx.fillRect(x, yy, 1, h);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.repeat.set(1, 3);
    return t;
  })();

  const spouts = [];
  const splashes = [];
  const SPOUT_R = 0.46, LAND_R = 1.12, SPOUT_Y = 1.78, RISE = 0.28;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ca = Math.cos(a), sa = Math.sin(a);
    const sp = new THREE.Mesh(sharedBox(0.12, 0.12, 0.46), lam(PZ.goldDim));
    sp.position.set(ca * SPOUT_R, y + SPOUT_Y, sa * SPOUT_R);
    sp.rotation.y = -a;
    g.add(sp);

    // the parabola: out of the nozzle, up a touch, then down into the basin
    const p0 = new THREE.Vector3(ca * (SPOUT_R + 0.18), y + SPOUT_Y, sa * (SPOUT_R + 0.18));
    const p2 = new THREE.Vector3(ca * LAND_R, y + 0.13, sa * LAND_R);
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 1 / 10) {
      // quadratic in the horizontal, ballistic in the vertical
      const x = p0.x + (p2.x - p0.x) * t;
      const z = p0.z + (p2.z - p0.z) * t;
      const yy = p0.y + (p2.y - p0.y) * t + Math.sin(t * Math.PI) * RISE;
      pts.push(new THREE.Vector3(x, yy, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const jet = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, 0.055, 6, false),
      new THREE.MeshBasicMaterial({
        map: jetTex.clone(), transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    jet.material.map.wrapS = jet.material.map.wrapT = THREE.RepeatWrapping;
    jet.material.map.repeat.set(1, 3);
    jet.material.userData = { dynamic: true };
    jet.userData.dynamic = true;
    jet.renderOrder = 2;
    g.add(jet);
    spouts.push(jet);

    // the splash where it lands: a ring that expands and fades, recycled
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xeafcff, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false,
      }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ca * LAND_R, y + 0.13, sa * LAND_R);
    ring.userData.dynamic = true;
    ring.material.userData = { dynamic: true };
    g.add(ring);
    // a low churn puff sitting on the landing point
    const churn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xf2feff, transparent: true, opacity: 0.5, depthWrite: false,
      }));
    churn.position.set(ca * LAND_R, y + 0.16, sa * LAND_R);
    churn.scale.y = 0.5;
    churn.userData.dynamic = true;
    churn.material.userData = { dynamic: true };
    g.add(churn);
    splashes.push({ ring, churn, t: i * 0.25, ang: a });
  }

  // MIST over the basin — one soft additive disc, the cheapest possible way to
  // say "there is spray in the air here"
  const mist = new THREE.Mesh(new THREE.CircleGeometry(1.45, 16),
    new THREE.MeshBasicMaterial({
      color: 0xd8f4ff, transparent: true, opacity: 0.13,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = y + 0.42;
  mist.userData.dynamic = true;
  mist.material.userData = { dynamic: true };
  g.add(mist);

  g.userData.shrine = { spouts, splashes, basin, basinGeo, mist, orb, baseY: y };
  g.userData.dynamic = true;   // the baker must not freeze any of this
  return g;
}

/**
 * A SIGNBOARD on two posts: a painted plank naming what the building does.
 *
 * Walking into the plaza for the first time you saw three matching daises with a
 * prop on each and no way to tell the shop from the forge from the capsule
 * machine. The board is double-sided so it reads from either approach, and it
 * carries a pictogram as well as the word — at plaza distance the picture lands
 * first and the word confirms it.
 */
export function buildSignboard(label, glyph, accent, h = 2.5) {
  const g = new THREE.Group();
  const tex = new THREE.CanvasTexture(makeSignTexture(label, glyph, accent));
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const aspect = tex.image.width / tex.image.height;
  const bh = 0.62, bw = bh * aspect;

  const post = (dx) => {
    const p = new THREE.Mesh(sharedBox(0.11, h, 0.11), lam('#6a4a30'));
    p.position.set(dx, h / 2, 0);
    p.castShadow = true;
    g.add(p);
    const capB = new THREE.Mesh(sharedBox(0.2, 0.12, 0.2), lam('#5a3f26'));
    capB.position.set(dx, h + 0.05, 0);
    g.add(capB);
  };
  post(-bw / 2 - 0.14);
  post(bw / 2 + 0.14);
  // the cross beam the board hangs from
  const beam = new THREE.Mesh(sharedBox(bw + 0.62, 0.13, 0.13), lam('#5a3f26'));
  beam.position.y = h - 0.06;
  g.add(beam);
  // two little chains
  for (const dx of [-bw * 0.34, bw * 0.34]) {
    const link = new THREE.Mesh(sharedBox(0.04, 0.2, 0.04), lam('#8d9294'));
    link.position.set(dx, h - 0.2, 0);
    g.add(link);
  }
  const boardMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), boardMat);
  board.position.y = h - 0.32 - bh / 2;
  board.castShadow = true;
  g.add(board);
  // the board swings, very slightly, on its chains
  g.userData.swing = board;
  board.userData.dynamic = true;
  return g;
}

/**
 * A raised STATION platform. Every interactable in the plaza (shop, forge,
 * capsule machine) stands on one of these, at a matched radius on its own
 * avenue, under a banner in its own colour — so they read as a set rather than
 * as three unrelated props dropped on grass.
 */
function buildStation(color, glyphColor) {
  const g = new THREE.Group();
  // two-step stone dais
  const base = new THREE.Mesh(sharedCyl(2.5, 2.6, 0.22, 8), lam(PZ.stoneDark));
  base.position.y = 0.11; base.receiveShadow = true; g.add(base);
  const top = new THREE.Mesh(sharedCyl(2.15, 2.2, 0.2, 8), lam(PZ.pave));
  top.position.y = 0.31; top.receiveShadow = true; g.add(top);
  const inlay = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.9, 20),
    new THREE.MeshLambertMaterial({
      color: new THREE.Color(PZ.gold),
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }));
  inlay.rotation.x = -Math.PI / 2; inlay.position.y = 0.42; g.add(inlay);

  // two banner posts flanking the back, with cloth in the station's colour
  const cloths = [];
  for (const sx of [-1.55, 1.55]) {
    const post = new THREE.Mesh(sharedCyl(0.09, 0.11, 3.1, 6), lam(PZ.ink));
    post.position.set(sx, 1.55, -1.0); post.castShadow = true; g.add(post);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lam(PZ.gold));
    finial.position.set(sx, 3.15, -1.0); g.add(finial);
    const cloth = new THREE.Mesh(sharedBox(0.55, 1.5, 0.05), lam(color));
    cloth.position.set(sx, 2.15, -0.95); g.add(cloth);
    const trim = new THREE.Mesh(sharedBox(0.6, 0.12, 0.06), lam(glyphColor));
    trim.position.set(sx, 1.42, -0.94); g.add(trim);
    cloths.push(cloth);
  }
  // a lintel across the two posts
  const lintel = new THREE.Mesh(sharedBox(3.4, 0.16, 0.16), lam(PZ.ink));
  lintel.position.set(0, 3.0, -1.0); g.add(lintel);
  g.userData.station = { cloths };
  return g;
}

function buildLamp() {
  // Village lamps match the wild Japanese stone lanterns (ishidōrō) so lighting
  // reads as one aesthetic: stone base + pillar + warm light box + pyramid cap.
  // The light box now carries a real FLAME inside it — a stack of tapering
  // tongues that flicker on their own rhythm — plus a soft glow shell, so the
  // lantern is a light SOURCE rather than a yellow square. With bloom on at
  // high/ultra these actually bloom.
  const g = new THREE.Group();
  const base = new THREE.Mesh(sharedBox(0.46, 0.1, 0.46), lam('#5e625a'));
  base.position.y = 0.05;
  const base2 = new THREE.Mesh(sharedBox(0.3, 0.08, 0.3), lam('#84887e'));
  base2.position.y = 0.13;
  const post = new THREE.Mesh(sharedBox(0.11, 0.62, 0.11), lam('#84887e'));
  post.position.y = 0.46;
  const collar = new THREE.Mesh(sharedBox(0.3, 0.06, 0.3), lam('#5e625a'));
  collar.position.y = 0.79;
  // four corner pillars + translucent paper panes instead of one solid block,
  // so you can see the flame through the shade
  const frame = new THREE.Group();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pil = new THREE.Mesh(sharedBox(0.045, 0.26, 0.045), lam('#5e625a'));
    pil.position.set(sx * 0.115, 0.95, sz * 0.115);
    frame.add(pil);
  }
  g.add(frame);
  const pane = new THREE.Mesh(sharedBox(0.23, 0.22, 0.23),
    new THREE.MeshBasicMaterial({ color: 0xffe8ba, transparent: true, opacity: 0.7 }));
  pane.position.y = 0.95;

  // the flame: three tapering tongues, each animated on its own phase
  const flame = new THREE.Group();
  flame.position.y = 0.87;
  const tongues = [];
  const spec = [['#ff7a2a', 0.105, 0.21], ['#ffc25a', 0.075, 0.16], ['#fff3c0', 0.042, 0.10]];
  for (let i = 0; i < spec.length; i++) {
    const [c, w, h] = spec[i];
    const t = new THREE.Mesh(sharedCyl(w * 0.15, w, h, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c) }));
    t.position.y = h / 2;
    flame.add(t);
    tongues.push(t);
  }
  g.add(flame);

  // A soft halo AROUND THE BOX ONLY. It is deliberately small and it never
  // changes size: a lamp is a fixed light source, and animating its scale is
  // exactly what made it read as a pulsing ball rather than a lantern.
  // deliberately smaller than the light box's roof — a halo wider than the
  // lantern swallows it and all you see from a distance is a floating circle
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 6),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd79a'), transparent: true, opacity: 0.3,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  glow.position.y = 0.95;
  g.add(glow);

  // ground pool, same reasoning as the wild lanterns: only the nearest lamps
  // get a real PointLight, so every lamp needs its own visible spill
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.8, 18), lampPoolMat());
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.07;
  g.add(pool);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 4), lam('#5e625a'));
  roof.position.y = 1.17;
  roof.rotation.y = Math.PI / 4;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), lam('#84887e'));
  cap.position.y = 1.3;
  g.add(base, base2, post, collar, pane, roof, cap);
  // A REAL LIGHT. The village lamps never had one — they were sprites and a
  // halo, which is why the basecamp read as dim with nothing actually lit. It
  // joins the global pool in main.js, so the nearest-N budget still governs it.
  const light = new THREE.PointLight(0xffc07a, 0, 7.5, 1.9);
  light.position.y = 1.0;
  g.add(light);

  g.userData.flame = { tongues, glow, pane, pool, light, seed: Math.random() * 10 };
  return g;
}

/**
 * Animate a lantern flame. Shared by the village lamps and the wild tōrō so the
 * whole map flickers with one rhythm rather than each module inventing its own.
 * `lit` fades the fire out entirely by day.
 */
export function tickFlame(userData, time, lit = 1) {
  const f = userData?.flame;
  if (!f) return;
  const t = time * 7 + f.seed;
  for (let i = 0; i < f.tongues.length; i++) {
    const tg = f.tongues[i];
    // each tongue breathes on its own phase, and leans as if in a draught
    const b = 0.78 + Math.sin(t * (1 + i * 0.35) + i * 1.7) * 0.22;
    tg.scale.set(b, b * (0.85 + Math.sin(t * 0.7 + i) * 0.3), b);
    tg.position.x = Math.sin(t * 0.55 + i * 2.1) * 0.012 * (i + 1);
    tg.visible = lit > 0.08;
    tg.material.opacity = lit;
    tg.material.transparent = lit < 1;
  }
  // brightness flickers, SIZE never does
  f.glow.material.opacity = (0.2 + Math.sin(t * 0.9) * 0.04) * lit;
  f.pane.material.opacity = 0.3 + 0.35 * lit;
  if (f.pool) {
    f.pool.visible = lit > 0.2;
    f.pool.material.opacity = 0.5 * lit * (0.85 + Math.sin(t * 0.9) * 0.1);
  }
  // the lamp's own light flickers with the flame and dies out by day
  if (f.light) f.light.intensity = 2.3 * lit * (0.88 + Math.sin(t * 1.3) * 0.12);
}

function buildGachaMachine() {
  const g = new THREE.Group();
  // gold-trimmed cabinet
  const base = new THREE.Mesh(sharedBox(0.7, 0.8, 0.6), lam('#a83a4a'));
  base.position.y = 0.4;
  base.castShadow = true;
  const trim = new THREE.Mesh(sharedBox(0.74, 0.08, 0.64), lam('#c8963a'));
  trim.position.y = 0.78;
  // glass dome full of capsules
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.35 }));
  dome.position.y = 1.05;
  const capsuleCols = ['#f06a7a', '#f0c455', '#7ab8e8', '#8ac86a', '#c8a8f0', '#f0a8c8'];
  capsuleCols.forEach((col, i) => {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), lam(col));
    const a = i * 1.05;
    ball.position.set(Math.cos(a) * 0.16, 0.95 + (i % 3) * 0.12, Math.sin(a) * 0.16);
    g.add(ball);
  });
  // crank + coin slot + dispenser
  const crank = new THREE.Mesh(sharedBox(0.16, 0.16, 0.08), lam('#e8b84a'));
  crank.position.set(0, 0.5, 0.33);
  const handle = new THREE.Mesh(sharedBox(0.05, 0.14, 0.05), lam('#8a6a2a'));
  handle.position.set(0, 0.56, 0.37);
  const slot = new THREE.Mesh(sharedBox(0.2, 0.12, 0.05), lam('#1e1e24'));
  slot.position.set(0, 0.24, 0.31);
  g.add(base, trim, dome, crank, handle, slot);
  return g;
}

function buildFlowerBed(rng) {
  const g = new THREE.Group();
  // low stone border + a cluster of bright blooms
  const bed = new THREE.Mesh(sharedBox(1.1, 0.08, 0.75), lam(PALETTE.dirt[1]));
  bed.position.y = 0.04;
  g.add(bed);
  for (const [sx, sz] of [[-0.55, 0], [0.55, 0]]) {
    const stone = new THREE.Mesh(sharedBox(0.1, 0.14, 0.75), lam('#9aa0a2'));
    stone.position.set(sx, 0.07, sz);
    g.add(stone);
  }
  for (const sz of [-0.38, 0.38]) {
    const stone = new THREE.Mesh(sharedBox(1.1, 0.14, 0.1), lam('#8d9294'));
    stone.position.set(0, 0.07, sz);
    g.add(stone);
  }
  for (let i = 0; i < 6; i++) {
    const col = PALETTE.flowers[Math.floor(rng() * PALETTE.flowers.length)];
    const stem = new THREE.Mesh(sharedBox(0.04, 0.16, 0.04), lam('#4f9857'));
    const px = -0.4 + (i % 3) * 0.4 + (rng() - 0.5) * 0.1;
    const pz = -0.16 + Math.floor(i / 3) * 0.32 + (rng() - 0.5) * 0.08;
    stem.position.set(px, 0.16, pz);
    const bloom = new THREE.Mesh(sharedBox(0.11, 0.09, 0.11), lam(col));
    bloom.position.set(px, 0.27, pz);
    const center = new THREE.Mesh(sharedBox(0.05, 0.1, 0.05), lam('#f5e88a'));
    center.position.set(px, 0.28, pz);
    g.add(stem, bloom, center);
  }
  return g;
}

function buildClutter(rng) {
  const g = new THREE.Group();
  // barrel
  const barrel = new THREE.Mesh(sharedCyl(0.2, 0.22, 0.5, 8), lam('#8a6a48'));
  barrel.position.y = 0.25;
  barrel.castShadow = true;
  const band = new THREE.Mesh(sharedCyl(0.215, 0.215, 0.06, 8), lam('#4a4e52'));
  band.position.y = 0.3;
  g.add(barrel, band);
  // crate
  if (rng() < 0.7) {
    const crate = new THREE.Mesh(sharedBox(0.36, 0.36, 0.36), lam('#a8805a'));
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
export function createNPCs(scene, terrain, decorBlocked, particles, clearArea = null) {
  const villageLamps = [];   // their flames are ticked in update()
  let bakeReport = null;
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

  // like groundAt but spirals out to the nearest walkable, non-water, unblocked
  // cell — used to scatter ambient NPCs across the world without landing them
  // in a lake or inside a tree
  function landNear(ox, oz) {
    const ok = (x, z) => {
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) return false;
      const h = terrain.heightCell(ix, iz);
      return h > WATER_LEVEL && h < 9 && !decorBlocked.has(`${ix},${iz}`);
    };
    const bx = terrain.spawn.x + ox, bz = terrain.spawn.z + oz;
    if (ok(bx, bz)) return { x: bx, z: bz, y: terrain.surfaceY(bx, bz) };
    for (let r = 1; r <= 10; r++) {
      for (let a = 0; a < 8; a++) {
        const x = bx + Math.cos(a / 8 * Math.PI * 2) * r * 1.5;
        const z = bz + Math.sin(a / 8 * Math.PI * 2) * r * 1.5;
        if (ok(x, z)) return { x, z, y: terrain.surfaceY(x, z) };
      }
    }
    return groundAt(ox, oz);
  }

  // every prop the village places, so the static ones can be merged at the end
  const placed = [];
  function place(mesh, ox, oz, faceCenter = true, blockR = 1) {
    const spot = groundAt(ox, oz);
    mesh.position.set(spot.x, spot.y, spot.z);
    if (faceCenter) mesh.rotation.y = Math.atan2(terrain.spawn.x - spot.x, terrain.spawn.z - spot.z);
    scene.add(mesh);
    placed.push(mesh);
    if (blockR >= 0) blockCells(spot.x, spot.z, blockR);
    return spot;
  }

  // --- build the village ----------------------------------------------------
  // LAID OUT ON AXES, not scattered. Everything is polar: an angle and a
  // radius from the shrine at spawn. The three interactables sit on the three
  // avenues at a MATCHED radius so they read as a set; the huts form an outer
  // ring between the avenues; nothing is placed by eye.
  const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  // the four cardinal avenues, rotated 45 degrees so nothing sits due north
  const AV = [Math.PI / 4, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const polar = (ang, r) => [Math.sin(ang) * r, Math.cos(ang) * r];

  // the paved plaza floor + the shrine that everything points at
  const plazaFloor = buildPlazaFloor();
  {
    const c = groundAt(0, 0);
    plazaFloor.position.set(c.x, c.y, c.z);
    scene.add(plazaFloor);
  }
  // The shrine closes the FOURTH avenue, at the same radius as the three trade
  // stations — so the plaza reads as four matched points around an open centre
  // rather than a fountain parked in the middle of the walking space. It also
  // keeps it well clear of the spawn cells, which is what trapped everyone on
  // teleport when it sat at 0,0.
  const shrine = buildCenterShrine();
  place(shrine, ...polar(AV[3], 8.2), false, 2);

  // --- the three STATIONS, one per avenue at a matched radius --------------
  const STATION_R = 8.2;
  const stationOf = (ang, color, trim, prop, propOff = 0) => {
    const [sx, sz] = polar(ang, STATION_R);
    const dais = buildStation(color, trim);
    const spot = place(dais, sx, sz, true, 2);
    // the prop stands on the dais, facing the shrine
    const [px, pz] = polar(ang, STATION_R - propOff);
    const pSpot = place(prop, px, pz, true, 1);
    pSpot.y += 0.41;                    // sit it on the dais top
    prop.position.y = pSpot.y;
    return pSpot;
  };
  const signs = [];
  const stationOfSigned = (ang, color, trim, prop, off, label, glyph) => {
    const spot = stationOf(ang, color, trim, prop, off);
    // the board stands just OUTSIDE the dais on the same avenue, facing the
    // plaza centre — so you read it on the way in, and it never blocks the prop
    const [bx, bz] = polar(ang, STATION_R + 1.9);
    const sign = buildSignboard(label, glyph, color);
    place(sign, bx, bz, true, -1);      // no blocked cells: you walk under it
    signs.push(sign);
    return spot;
  };
  const stallSpot = stationOfSigned(AV[0], '#a8e06a', '#5e8a3c', buildStall(), 0.35, 'SHOP', 'coin');
  const forgeSpot = stationOfSigned(AV[1], '#e8a35d', '#a85a2c', buildForgeCorner(), 0.35, 'FORGE', 'anvil');
  const gachaSpot = stationOfSigned(AV[2], '#f0a8c8', '#a8548a', buildGachaMachine(), 0.35, 'GACHA', 'capsule');

  // the hearth sits between two avenues, clear of the shrine and the stations
  const [ckx, ckz] = polar(AV[3] + Math.PI / 4, 10.6);

  // --- HUTS: an outer ring, set BETWEEN the avenues so they never block one --
  const HUT_R = 12.6;
  const hutStyles = [
    [0.9, '#d8c8a8', '#a85a48'], [0.85, '#d0b898', '#7a8a5a'],
    [0.9, '#c0a888', '#5a7a9a'], [0.8, '#d8c0a0', '#8a5a88'],
    [0.86, '#cfbf9f', '#4f7a6a'], [0.82, '#d4c2a2', '#96603c'],
  ];
  const hutSpots = [];
  hutStyles.forEach(([sc, wall, roof], i) => {
    const ang = AV[i % 4] + (i < 4 ? Math.PI / 4 : -Math.PI / 4);
    const [hx, hz] = polar(ang, HUT_R + (i % 2) * 1.1);
    place(buildHut(sc, wall, roof), hx, hz, true, 1);
    hutSpots.push([hx, hz]);
  });

  // --- the herb garden and the clutter fill the gaps, still on the grid -----
  const gardenSpot = place(buildFencedGarden(), ...polar(AV[1] + Math.PI / 4, 11.4), false, 1);
  for (let i = 0; i < 4; i++) {
    place(buildClutter(rng), ...polar(AV[i] + 0.55, 10.2), false, 0);
  }

  // --- LAMPS: eight, evenly spaced around the ring walk ---------------------
  for (let i = 0; i < 8; i++) {
    const [lx, lz] = polar((i / 8) * Math.PI * 2 + Math.PI / 8, 10.4);
    const lampMesh = buildLamp();
    villageLamps.push(lampMesh);
    place(lampMesh, lx, lz, false, 0);
  }

  // NO flower beds on the paving. A soil planter sitting on stone flags is the
  // same broken logic as farm plots on a floor — the greenery belongs on the
  // grass beyond the kerb, where the herb garden and the field already are.
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.4;
    place(buildFlowerBed(rng), ...polar(ang, 14.2), false, -1);
  }

  // village campfire — the community cooking spot (interact to cook fish);
  // kept clear of villager stations so the Cook prompt always wins here
  const cookfire = groundAt(ckx, ckz);
  {
    const vf = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(sharedBox(0.15, 0.12, 0.13), lam('#8d9294'));
      stone.position.set(Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.38);
      vf.add(stone);
    }
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0),
      new THREE.MeshBasicMaterial({ color: 0xffaa33 }));
    flame.position.y = 0.24;
    const spit = new THREE.Mesh(sharedBox(0.05, 0.05, 0.9), lam('#6a4a30'));
    spit.position.y = 0.42;
    const fishOnSpit = new THREE.Mesh(sharedBox(0.2, 0.1, 0.12), lam('#c8863a'));
    fishOnSpit.position.y = 0.42;
    const light = new THREE.PointLight(0xffaa44, 2.6, 7, 1.8);
    light.position.y = 0.6;
    vf.add(flame, spit, fishOnSpit, light);
    vf.position.set(cookfire.x, cookfire.y, cookfire.z);
    scene.add(vf);
    cookfire.flame = flame;
    const [fx, fz] = terrain.cellOf(cookfire.x, cookfire.z);
    decorBlocked.add(`${fx},${fz}`);
  }

  // CLEAR THE PLAZA. decor grew before the village was placed, so instanced
  // rocks and bushes were left standing on the paving and jammed against the
  // buildings. Anything inside the kerb goes.
  if (clearArea) {
    clearArea(terrain.spawn.x, terrain.spawn.z, 12.5);
    for (const sp2 of [stallSpot, forgeSpot, gachaSpot]) clearArea(sp2.x, sp2.z, 3.4);
    clearArea(shrine.position.x, shrine.position.z, 3.6);
    // the huts sit at 12.6-13.7, OUTSIDE the kerb sweep — which is why a boulder
    // was left wedged against a wall. Every building gets its own footprint.
    for (const [hx, hz] of hutSpots) clearArea(hx, hz, 3.6);
    clearArea(gardenSpot.x, gardenSpot.z, 3.2);
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
    nxr: [
      { ox: 5.6, oz: -2.2, act: 'shop' },
      { ox: 2.2, oz: 2.6, act: 'idle' },
      { ox: 5.6, oz: -2.2, act: 'shop' },
    ],
    momo: [ // the kid zooms around the east meadow
      { ox: 17, oz: -9, act: 'idle' }, { ox: 13, oz: -13, act: 'idle' },
      { ox: 21, oz: -5, act: 'idle' }, { ox: 15, oz: -11, act: 'idle' },
    ],
    tato: [ // dozing by the far pond
      { ox: -16, oz: 15, act: 'sit' }, { ox: -13, oz: 17, act: 'idle' },
      { ox: -16, oz: 15, act: 'sit' },
    ],
    lulu: [ // dreaming near the distant water
      { ox: 15, oz: 19, act: 'idle' }, { ox: 18, oz: 15, act: 'idle' },
      { ox: 12, oz: 21, act: 'idle' },
    ],
    bimo: [ // wide perimeter patrol
      { ox: -18, oz: -13, act: 'idle' }, { ox: -14, oz: -18, act: 'idle' },
      { ox: -21, oz: -8, act: 'idle' }, { ox: -16, oz: -14, act: 'idle' },
    ],
    nyanya: [ // a flowery clearing just outside the village
      { ox: 11, oz: 7, act: 'idle' }, { ox: 7, oz: 12, act: 'idle' },
      { ox: 14, oz: 4, act: 'idle' }, { ox: 9, oz: 10, act: 'idle' },
    ],
    kobo: [ // roams the far north near the windmill
      { ox: 22, oz: -16, act: 'idle' }, { ox: 26, oz: -10, act: 'idle' },
      { ox: 18, oz: -20, act: 'idle' },
    ],
    pesca: [ // dreams by the far south-east shore
      { ox: -20, oz: 20, act: 'idle' }, { ox: -24, oz: 15, act: 'sit' },
      { ox: -16, oz: 24, act: 'idle' },
    ],
    barong: [ // stands guard at the village entrance, does not wander
      { ox: 0, oz: -9.5, act: 'idle' },
    ],
  };

  // quest-givers + shopkeepers stay in the village; ambient villagers are
  // scattered across the world so it doesn't feel like everyone's in one square
  const npcStart = [
    [-3.5, -3], [2.5, 1.5], [-3.2, -1.8], [4, 5.5], [4.2, 3.2],
    [5.6, -2.2],           // nxr (village)
    [17, -9],              // momo — east meadow
    [-16, 15],             // tato — a quiet pond in the south-west
    [15, 19],              // lulu — near the far water
    [-18, -13],            // bimo — north-west perimeter patrol
    [11, 7],               // nyanya — a flowery clearing near the village
    [0, -9.5],             // barong — village entrance (guardian)
    [22, -16],             // kobo — far north
    [-20, 20],             // pesca — far south-east
  ];
  NPC_DEFS.forEach((def, i) => {
    const [ox, oz] = npcStart[i % npcStart.length];
    const spot = def.ambient ? landNear(ox, oz) : groundAt(ox, oz);
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

  function update(dt, playerPos, time, isNight = false) {
    // THE FOUNTAIN. Skipped entirely when nobody is near enough to see it.
    const F = shrine.userData.shrine;
    if (F && (shrine.position.x - playerPos.x) ** 2 + (shrine.position.z - playerPos.z) ** 2 < 2500) {
      // the jets: scroll the streak texture DOWN the tube so the water falls,
      // and breathe the pressure so it never looks like a frozen ribbon
      for (let i = 0; i < F.spouts.length; i++) {
        const m = F.spouts[i].material;
        if (m.map) m.map.offset.y -= dt * 1.9;
        m.opacity = 0.72 + Math.sin(time * 4.2 + i * 1.7) * 0.13;
      }
      // the basin surface: two crossing sines through the fan's vertices
      const pos = F.basinGeo.attributes.position;
      const base = F.basinGeo.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), yv = pos.getY(i);
        pos.setZ(i, base[i]
          + Math.sin(x * 4.2 + time * 2.3) * 0.022
          + Math.sin(yv * 3.6 - time * 1.7) * 0.018);
      }
      pos.needsUpdate = true;
      // splash rings expand out from each landing point and fade, recycled
      for (const sp of F.splashes) {
        sp.t += dt * 1.35;
        if (sp.t >= 1) sp.t -= 1;
        const w = sp.t;
        sp.ring.scale.setScalar(0.5 + w * 2.6);
        sp.ring.material.opacity = (1 - w) * 0.5;
        sp.churn.scale.set(
          0.9 + Math.sin(time * 7 + sp.ang) * 0.16,
          0.5 + Math.sin(time * 9 + sp.ang) * 0.1,
          0.9 + Math.cos(time * 6.4 + sp.ang) * 0.16,
        );
        sp.churn.material.opacity = 0.42 + Math.sin(time * 8 + sp.ang) * 0.12;
      }
      // mist drifts and breathes above the water
      F.mist.material.opacity = 0.10 + Math.sin(time * 1.1) * 0.045;
      F.mist.position.y = F.baseY + 0.42 + Math.sin(time * 0.8) * 0.05;
      F.mist.rotation.z = time * 0.12;
      // the finial catches the light on its own rhythm
      F.orb.rotation.y += dt * 0.5;
    }

    // the signboards creak on their chains
    for (let i = 0; i < signs.length; i++) {
      const b = signs[i].userData.swing;
      if (b) b.rotation.x = Math.sin(time * 0.9 + i * 2.1) * 0.045;
    }

    // village lantern flames: lit at night, embers by day
    const lit = isNight ? 1 : 0.06;
    for (const lamp of villageLamps) {
      if ((lamp.position.x - playerPos.x) ** 2 + (lamp.position.z - playerPos.z) ** 2 > 6400) continue;
      tickFlame(lamp.userData, time, lit);
    }
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
        u.head.position.y = (u.headBaseY ?? 0.72) + Math.sin(n.anim * 2.4) * 0.04;
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
        u.head.position.y = (u.headBaseY ?? 0.72) + br;

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
          // stand at their stand & tidy the goods (Pip: stall, NXR: capsule machine)
          const stand = n.def.id === 'nxr' ? gachaSpot : stallSpot;
          n.mesh.rotation.y = Math.atan2(stand.x - p.x, stand.z - p.z);
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

  // --- BAKE THE VILLAGE ------------------------------------------------
  // The basecamp is where the player actually stands, so its draw calls are the
  // ones that hurt: a hut is 20 meshes, the paving and the station daises many
  // more, and every one was its own call. Merge everything static per material,
  // per structure — per structure, not globally, so a hut behind you is still
  // culled. The lamps are excluded: their flame tongues, glow, pane and pool all
  // animate every frame.
  {
    for (const lamp of villageLamps) lamp.userData.dynamic = true;
    let before = 0, after = 0;
    for (const mesh of placed) {
      if (mesh.userData.dynamic) continue;
      const r = bakeStatic(mesh);
      before += r.before; after += r.after;
    }
    bakeReport = { before, after };
  }

  return { npcs, update, nearest, cookfire, stallSpot, forgeSpot, gachaSpot, bakeReport };
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
