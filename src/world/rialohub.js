// THE RIALO BUILDER HUB.
//
// A built island out at the far corner of the ocean. It went through a version
// with thirty-five generated agents on it and that was wrong: they were
// procedural chibis wearing colours from a spreadsheet, and they looked like
// nobody in particular. A crowd of strangers who resemble no one is worse than
// a small cast you can actually name, so it is three now — Baster, Dikzzy, and
// Spider the cat, who also has a twin back at the basecamp.
//
// The floor was the other mistake. Dark blue-black wedges on an island read as
// iron decking, not as ground you could walk on barefoot; it is warm sandstone
// and coral over pale sand now, which is what a plaza on a tropical island is
// actually made of.
//
// Two boards: the Rialo mark on the monument, and a separate wide banner on its
// own dais well clear of everything else, lit from below.

import * as THREE from 'three';
import { boxMesh, cylMesh, sphereMesh } from '../gfx/meshcache.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';
import { paintRialoMark } from './landmarks.js';
import { createSpider } from './spider.js';

const TAU = Math.PI * 2;

/** Island stone: warm, sandy, sun-bleached. Nothing here is blue-black. */
const PAL = {
  sand: '#dcc9a2',
  sandDark: '#c4ad86',
  coral: '#c98f6e',
  stone: '#b9a684',
  trim: '#e8dcc0',
  accent: '#57e39f',
  glow: '#78ecff',
  structure: '#8a7a5e',
};

/** THE CAST. Three, and every one of them is somebody. */
const CAST = [
  {
    name: 'Baster', role: 'Technical Game Developer',
    shirt: '#3f6f9e', accent: '#78ecff', hair: '#2a2118', skin: '#e0a878',
    activity: 'tend',
    dialogue: [
      'Welcome to the Rialo Builder Hub. Mind the wet paint on the east steps.',
      'Everything you are standing on is generated — the paving, the palms, the banner frame.',
      'That is the whole trick of this place: no art files, just maths that agrees with itself.',
    ],
  },
  {
    name: 'Dikzzy', role: 'Game Tester & Bug Hunter',
    shirt: '#e34f3a', accent: '#f2c24e', hair: '#6e4a2a', skin: '#f2c69a',
    activity: 'wander',
    dialogue: [
      'I break this island for a living. You would not believe what used to happen here.',
      'The floor was iron plates. On a beach. Nobody could explain it.',
      'If something looks wrong to you, it probably is — come and tell me about it.',
    ],
  },
];

function seeded(seed) {
  let g = seed;
  return () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
}

/** A chibi builder. Same proportions as the villagers so the Hub's cast and
 *  Anavela's read as living in one game. */
function buildAgent(def) {
  const g = new THREE.Group();

  const legs = [];
  for (const sx of [-1, 1]) {
    const l = boxMesh(0.17, 0.34, 0.18, '#3a3a44');
    l.position.set(sx * 0.11, 0.17, 0);
    g.add(l);
    legs.push(l);
  }
  const body = boxMesh(0.46, 0.44, 0.28, def.shirt);
  body.position.y = 0.56;
  g.add(body);
  const sash = boxMesh(0.48, 0.09, 0.3, def.accent);
  sash.position.y = 0.5;
  g.add(sash);

  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 0.29, 0.74, 0);
    const limb = boxMesh(0.13, 0.34, 0.15, def.shirt);
    limb.position.y = -0.17;
    a.add(limb);
    const hand = boxMesh(0.13, 0.1, 0.15, def.skin);
    hand.position.y = -0.37;
    a.add(hand);
    g.add(a);
    arms.push(a);
  }

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.06;
  g.add(headPivot);
  const head = boxMesh(0.44, 0.42, 0.4, def.skin);
  headPivot.add(head);
  const hair = boxMesh(0.47, 0.16, 0.43, def.hair);
  hair.position.y = 0.19;
  headPivot.add(hair);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.4),
    new THREE.MeshBasicMaterial({
      map: makeCritterFaceTexture({ eye: '#20241c', mouth: 'smile' }),
      transparent: true,
    }));
  face.position.set(0, 0, 0.201);
  headPivot.add(face);

  g.userData = { legs, arms, headPivot, phase: Math.random() * TAU };
  return g;
}

/** The plaza floor: warm flagstones over pale sand, in concentric courses. */
function buildFloor(R) {
  const g = new THREE.Group();

  // the sand pad the whole thing sits on, so the edges never show bare terrain
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.04, 40),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.sand) }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.04;
  g.add(pad);

  const courses = 4;
  for (let c = 0; c < courses; c++) {
    const r0 = (R * 0.18) + (R * 0.76) * (c / courses);
    const r1 = (R * 0.18) + (R * 0.76) * ((c + 1) / courses) - 0.2;
    const n = 16 + c * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU + (c % 2 ? 0.04 : 0);
      const a1 = ((i + 0.88) / n) * TAU + (c % 2 ? 0.04 : 0);
      const shape = new THREE.Shape();
      shape.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      shape.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
      shape.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      shape.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
      shape.closePath();
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshLambertMaterial({
          color: new THREE.Color(c % 2 ? PAL.stone : PAL.sandDark),
        }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.07;
      g.add(m);
    }
  }

  // a coral kerb so the plaza has an edge instead of fading into sand
  const kerb = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.96, 0.16, 6, 44),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.coral) }));
  kerb.rotation.x = -Math.PI / 2;
  kerb.position.y = 0.1;
  g.add(kerb);

  // a mint inlay ring at the centre — the one cool colour, and it earns it
  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.16, R * 0.185, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.accent), side: THREE.DoubleSide }));
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.085;
  g.add(inlay);
  return g;
}

/** The Rialo mark, painted with a real margin so it is not clipped by its frame. */
function markTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  // paintRialoMark fills its whole square with brand cream and draws the glyph
  // edge to edge. Painted straight onto the pane that read as a cropped logo,
  // so it goes into an INSET square with a border of its own cream around it.
  const pad = Math.round(size * 0.14);
  const inner = size - pad * 2;
  ctx.fillStyle = '#e8e3d5';
  ctx.fillRect(0, 0, size, size);
  const sq = document.createElement('canvas');
  sq.width = sq.height = inner;
  paintRialoMark(sq.getContext('2d'), inner);
  ctx.drawImage(sq, pad, pad);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  return t;
}

// MEASURED LAYOUT. Every number below was checked against the one above it,
// because the first version put the sign at y=5.5 while the pillar reached 5.30
// and 1.15 units of stone drove straight through the middle of the board.
// NOTHING PASSES THROUGH THE SIGN.
//
// The rule is simple and it is enforced by a check at the bottom of this file:
// the sign's vertical span must be empty of every other monument part. The last
// version satisfied it for the pillar and then added a support neck in the same
// edit that ran 1.35 units through the middle of the board.
//
// So the post STOPS and the sign sits on top of it, on a cap. There is nothing
// above the cap except the sign and the finial.
const MON = {
  postTop: 5.30,        // the 4.2 pillar, centred at 3.2, ends here
  capY: 5.45,           // a flat cap closing the post
  signBottom: 5.70,     // the board starts above the cap
  signSize: 2.7,
  get signY() { return this.signBottom + this.signSize / 2; },   // 7.05
  get signTop() { return this.signBottom + this.signSize; },     // 8.40
  get finialY() { return this.signTop + 0.75; },                 // 9.15
};

function buildMonument() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = 3.4 - i * 0.7;
    const step = cylMesh(s, s, 0.34, i ? PAL.sandDark : PAL.stone, 10);
    step.position.y = 0.17 + i * 0.34;
    g.add(step);
  }
  const pillar = cylMesh(0.5, 0.62, 4.2, PAL.structure, 8);
  pillar.position.y = 3.2;
  g.add(pillar);
  for (const y of [1.6, 3.0, 4.4]) {
    const band = cylMesh(0.56, 0.56, 0.12, PAL.accent, 8);
    band.position.y = y;
    g.add(band);
  }
  // a flat cap closing the post. It is the LAST thing below the sign — there is
  // deliberately no shaft continuing upward past this point.
  const cap = cylMesh(0.78, 0.68, 0.3, PAL.trim, 8);
  cap.position.y = MON.capY;
  g.add(cap);

  const tex = markTexture(512);
  // ONE frame with real thickness, and the two painted faces sit just proud of
  // it — a plane and a box at the same Z is a z-fight waiting to happen.
  const frame = boxMesh(MON.signSize + 0.4, MON.signSize + 0.4, 0.34, PAL.trim);
  frame.position.y = MON.signY;
  g.add(frame);
  // two slim struts BEHIND the board carrying it off the cap, well outside the
  // painted face so they can never cross the mark
  for (const sx of [-1, 1]) {
    const strut = boxMesh(0.14, MON.signBottom - MON.capY + 0.4, 0.14, PAL.structure);
    strut.position.set(sx * (MON.signSize / 2 - 0.1), (MON.capY + MON.signBottom) / 2, -0.28);
    g.add(strut);
  }
  for (const rot of [0, Math.PI]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(MON.signSize, MON.signSize),
      new THREE.MeshBasicMaterial({ map: tex }));
    pane.position.set(0, MON.signY, rot ? -0.19 : 0.19);
    pane.rotation.y = rot;
    g.add(pane);
  }

  const finial = sphereMesh(0.42, PAL.glow);
  finial.position.y = MON.finialY;
  finial.material = finial.material.clone();
  finial.material.emissive = new THREE.Color(PAL.glow);
  finial.material.emissiveIntensity = 1.4;
  g.add(finial);
  g.userData.finial = finial;

  const light = new THREE.PointLight(0x78ecff, 1.4, 26, 2);
  light.position.y = MON.finialY - 0.6;
  g.add(light);
  return g;
}

/**
 * THE BIG BANNER. Its own dais, its own lights, and nothing else within reach
 * of it — a board this size sharing a footprint with anything would look like
 * an accident.
 */
// Also measured. The board's bottom edge sits at BOARD_Y; the legs run from the
// dais up to it, and the whole thing is tilted back 6 degrees so that from the
// plaza — where you approach it from, looking slightly up — the artwork faces
// you square instead of foreshortening away.
const BAN = {
  // SIZED FOR THE CAMERA, not for a mockup. 16x9 was 9 units tall, and against
  // a view that looks down even at its flattest that meant the top third was
  // permanently off-screen. 12x6.75 keeps the artwork's 16:9 exactly and is
  // still by far the biggest thing on the island.
  W: 12, H: 6.75,
  daisH: 0.5,
  // BOTTOM EDGE, and it is low on purpose.
  //
  // At 4.2 the board's top sat at 13.2, and the game camera looks DOWN at a
  // fixed 56 degrees — so the top third of the artwork was always off the top
  // of the screen no matter how far back you stood. It reads as a billboard you
  // stand in FRONT of now rather than one you walk under, which is also what a
  // sign this size wants to be.
  boardY: 1.35,
  tilt: -0.105,         // ~6 degrees back
};

function buildBanner(texture) {
  const g = new THREE.Group();
  const W = BAN.W, H = BAN.H;       // the artwork is 16:9; the board matches it

  // dais
  const base = boxMesh(W + 3, 0.5, 4, PAL.stone);
  base.position.y = 0.25;
  g.add(base);
  const step = boxMesh(W + 5, 0.28, 5.4, PAL.sandDark);
  step.position.y = 0.14;
  g.add(step);

  // two legs and a lintel
  // legs run from the dais top to the board's bottom edge, and no further
  for (const sx of [-1, 1]) {
    const legH = BAN.boardY - BAN.daisH;
    const leg = cylMesh(0.44, 0.52, legH, PAL.structure, 8);
    leg.position.set(sx * (W / 2 + 0.7), BAN.daisH + legH / 2, 0);
    g.add(leg);
    const foot = boxMesh(1.5, 0.4, 1.5, PAL.trim);
    foot.position.set(sx * (W / 2 + 0.7), BAN.daisH + 0.2, 0);
    g.add(foot);
  }

  // THE BOARD, on its own tilted pivot so the frame, the artwork and the lintel
  // all lean together instead of the panel sliding off the frame.
  const board = new THREE.Group();
  board.position.y = BAN.boardY + H / 2;
  board.rotation.x = BAN.tilt;
  g.add(board);

  const frame = boxMesh(W + 1.2, H + 1.2, 0.5, PAL.trim);
  board.add(frame);
  const backer = boxMesh(W + 0.4, H + 0.4, 0.34, PAL.structure);
  board.add(backer);

  // the artwork, on both faces so it reads from either side of the island
  for (const rot of [0, Math.PI]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ map: texture }));
    pane.position.set(0, 0, rot ? -0.3 : 0.3);
    pane.rotation.y = rot;
    board.add(pane);
  }

  const lintel = boxMesh(W + 3.4, 0.6, 1.0, PAL.trim);
  lintel.position.y = H / 2 + 0.9;
  board.add(lintel);

  // WHITE LIGHTS. A row of bulbs on a rail below the board washing up at it,
  // plus two floods. Basic materials so they stay bright at night and bloom
  // catches them; the real light is two point lights, because seven would cost
  // more than the whole island.
  const bulbs = [];
  const N = 9;
  const railY = BAN.boardY - 0.5;   // a rail just under the board's bottom edge
  for (let i = 0; i < N; i++) {
    const x = -W / 2 + (W / (N - 1)) * i;
    const post = cylMesh(0.07, 0.07, 0.5, PAL.structure, 6);
    post.position.set(x, railY, 1.0);
    g.add(post);
    const bulb = sphereMesh(0.17, '#ffffff');
    bulb.material = bulb.material.clone();
    bulb.position.set(x, railY + 0.35, 1.0);
    g.add(bulb);
    bulbs.push(bulb);
    const shade = cylMesh(0.24, 0.1, 0.16, PAL.trim, 6);
    shade.position.set(x, railY + 0.5, 1.0);
    g.add(shade);
  }
  const floods = [];
  for (const sx of [-1, 1]) {
    const l = new THREE.PointLight(0xffffff, 0, 22, 2);
    l.position.set(sx * (W / 3), BAN.boardY + 1.5, 3.0);
    g.add(l);
    floods.push(l);
  }

  g.userData.bulbs = bulbs;
  g.userData.floods = floods;
  return g;
}

/** One colonnade post with a lamp on top. */
function buildPost() {
  const g = new THREE.Group();
  const base = boxMesh(0.62, 0.22, 0.62, PAL.sandDark);
  base.position.y = 0.11;
  g.add(base);
  const shaft = cylMesh(0.17, 0.2, 2.5, PAL.structure, 8);
  shaft.position.y = 1.35;
  g.add(shaft);
  const cap = boxMesh(0.5, 0.16, 0.5, PAL.trim);
  cap.position.y = 2.68;
  g.add(cap);
  const lamp = sphereMesh(0.22, '#fff4d8');
  lamp.material = lamp.material.clone();
  lamp.material.emissive = new THREE.Color('#fff4d8');
  lamp.material.emissiveIntensity = 1.2;
  lamp.position.y = 3.0;
  g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

/**
 * @param island the record from terrain.islands with { x, z, r }
 * @param opts.bannerTexture a THREE.Texture for the big board (may be null)
 */
export function createRialoHub(scene, terrain, island, opts = {}) {
  const rnd = seeded(880417);
  const root = new THREE.Group();
  const cx = island.x, cz = island.z;
  const baseY = terrain.surfaceY(cx, cz);
  root.position.set(cx, baseY, cz);
  scene.add(root);

  const R = 15;

  root.add(buildFloor(R));
  const monument = buildMonument();
  root.add(monument);

  // THE BANNER, on the north edge, facing the plaza. Its own ground, well
  // outside the colonnade so nothing can overlap it.
  let banner = null;
  if (opts.bannerTexture) {
    banner = buildBanner(opts.bannerTexture);
    // INSIDE THE ISLAND. At -(R+9) the board stood 24 units out from the centre
    // and the island's radius is 22 — it was built on open water. This keeps the
    // whole dais (21 wide) within the shoreline: the far corners land at
    // hypot(10.5, 18) = 20.8, comfortably inside 22, and still 4 units clear of
    // the colonnade at 13.8.
    banner.position.set(0, 0, -18);
    root.add(banner);
  }

  // colonnade — skipping the arc the banner stands behind
  const posts = [];
  const POSTS = 16;
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * TAU;
    const z = Math.sin(a) * (R * 0.92);
    // leave the northern gap clear so the banner is approached down an avenue
    if (z < -R * 0.6) continue;
    const p = buildPost();
    p.position.set(Math.cos(a) * (R * 0.92), 0, z);
    root.add(p);
    posts.push(p);
  }

  // ---- the cast -----------------------------------------------------------
  const agents = [];
  CAST.forEach((def, i) => {
    const a = (i / CAST.length) * TAU + Math.PI * 0.25;
    const rr = 6.5;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const mesh = buildAgent(def);
    mesh.position.set(x, 0.1, z);
    mesh.rotation.y = Math.atan2(-x, -z);
    root.add(mesh);
    agents.push({
      def, mesh, home: { x, z }, activity: def.activity,
      t: rnd() * 3, dir: rnd() * TAU, dialogIdx: 0,
      wx: cx + x, wz: cz + z,
    });
  });

  // SPIDER'S TWIN. Same cat, same line, on the other side of the ocean.
  const spider = createSpider(scene, terrain, {
    centre: { x: cx, z: cz }, radius: R * 0.7,
  });

  const state = { time: 0 };

  function update(dt, playerPos, night = 0) {
    state.time += dt;

    monument.userData.finial.material.emissiveIntensity =
      1.1 + Math.sin(state.time * 1.6) * 0.35;
    for (const p of posts) p.userData.lamp.material.emissiveIntensity = 0.5 + night * 1.2;

    if (banner) {
      // the board is lit all the time — it is a sign — but it BLOOMS at night
      const on = 0.55 + night * 0.45;
      for (const b of banner.userData.bulbs) {
        b.material.color.setScalar(on);
        b.material.emissive?.setScalar?.(on);
      }
      for (const l of banner.userData.floods) l.intensity = 0.35 + night * 1.5;
    }

    const far = playerPos
      ? Math.hypot(playerPos.x - cx, playerPos.z - cz) > island.r + 45
      : true;
    if (far) return;

    spider.update(dt, playerPos);

    for (const a of agents) {
      a.t -= dt;
      const P = a.mesh.userData;
      const ph = state.time * 2 + P.phase;
      let moving = false;

      if (a.activity === 'wander') {
        if (a.t <= 0) { a.t = 2 + rnd() * 3; a.dir += (rnd() - 0.5) * 2.4; }
        const nx = a.mesh.position.x + Math.sin(a.dir) * 0.7 * dt;
        const nz = a.mesh.position.z + Math.cos(a.dir) * 0.7 * dt;
        if (Math.hypot(nx - a.home.x, nz - a.home.z) < 3.2) {
          a.mesh.position.x = nx; a.mesh.position.z = nz;
          a.mesh.rotation.y = a.dir;
          a.wx = cx + nx; a.wz = cz + nz;
          moving = true;
        } else a.dir += 2.2;
      }

      if (moving) {
        P.legs[0].rotation.x = Math.sin(ph * 2.2) * 0.5;
        P.legs[1].rotation.x = -Math.sin(ph * 2.2) * 0.5;
        P.arms[0].rotation.x = -Math.sin(ph * 2.2) * 0.4;
        P.arms[1].rotation.x = Math.sin(ph * 2.2) * 0.4;
      } else if (a.activity === 'tend') {
        const w = (Math.sin(ph * 0.8) + 1) / 2;
        P.headPivot.rotation.x = 0.3 * w;
        P.arms[0].rotation.x = -1.0 * w;
        P.arms[1].rotation.x = -1.0 * w;
      } else {
        a.mesh.position.y = 0.1 + Math.sin(ph * 0.6) * 0.02;
        P.headPivot.rotation.y = Math.sin(ph * 0.35) * 0.4;
        for (const l of P.legs) l.rotation.x *= 0.9;
        for (const m of P.arms) { m.rotation.x *= 0.9; m.rotation.z *= 0.9; }
      }
    }
  }

  function nearest(pos, r = 2.4) {
    let best = null, bd = r * r;
    for (const a of agents) {
      const dx = a.wx - pos.x, dz = a.wz - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  // WHAT YOU CANNOT WALK INTO. The monument's steps and the banner's dais and
  // legs are solid; without this the hero walked inside the plinth and stood
  // under the board looking like the island had swallowed them.
  const solids = [
    { x: cx, z: cz, r: 3.6 },                                    // monument steps
  ];
  if (banner) {
    const bz = cz + banner.position.z;
    // the dais, as three overlapping circles rather than a box — cheaper to
    // test and the corners were never reachable anyway
    for (const ox of [-7, 0, 7]) solids.push({ x: cx + ox, z: bz, r: 3.2 });
  }

  /** True if this spot is inside one of the Hub's structures. */
  function blocked(x, z) {
    for (const c of solids) {
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
    }
    return false;
  }

  // ---- THE CHECK ---------------------------------------------------------
  //
  // Twice now a part has been added that runs straight through the Rialo sign,
  // and twice it shipped because the numbers were checked by hand against the
  // one part I happened to be thinking about. This walks the real world-space
  // boxes and complains, so the next person to move something finds out here
  // instead of in a screenshot.
  function auditSign() {
    root.updateWorldMatrix(true, true);
    const boxes = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      boxes.push({ o, bb, textured: !!o.material?.map });
    });
    // the sign is the textured pane nearest the monument's axis
    const pane = boxes.find((b) => b.textured
      && Math.abs(b.bb.min.x + b.bb.max.x) / 2 - cx < 1
      && Math.abs((b.bb.min.z + b.bb.max.z) / 2 - cz) < 1);
    if (!pane) return [];
    const faults = [];
    for (const b of boxes) {
      if (b === pane || b.textured) continue;
      // ignore the frame, which is meant to surround it
      const isFrame = b.bb.min.y <= pane.bb.min.y && b.bb.max.y >= pane.bb.max.y
        && (b.bb.max.x - b.bb.min.x) > (pane.bb.max.x - pane.bb.min.x);
      if (isFrame) continue;
      const hits = b.bb.intersectsBox(pane.bb);
      if (hits) faults.push(b.o.name || b.o.geometry.type);
    }
    if (faults.length) {
      console.warn('[semesta] RIALO SIGN IS OBSTRUCTED by:', faults.join(', '));
    }
    return faults;
  }
  const signFaults = auditSign();

  return {
    root, agents, spider, banner, update, nearest, blocked, solids, signFaults,
    centre: { x: cx, z: cz }, radius: island.r,
    count: agents.length,
  };
}
