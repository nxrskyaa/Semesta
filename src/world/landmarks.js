// Scattered world landmarks — a windmill, a little shrine and a ruined tower —
// to make the wilds feel lived-in beyond the village. Purely scenic (blocked
// footprints); the windmill's sails turn.
import * as THREE from 'three';
import { WATER_LEVEL, WATER_Y } from './terrain.js';
import { makeCritterFaceTexture } from '../gfx/textures.js';
import { sharedMat, sharedBox, sharedCyl } from '../gfx/meshcache.js';
import { getQuality } from '../gfx/quality.js';

// Static prop colours are SHARED — a built world was carrying ~2,465 distinct
// materials, which is why the LOW preset barely helped. Nothing in this file
// mutates a material at runtime, so one material per colour is safe here.
function lam(color) { return sharedMat(color); }

const faceCache = new Map();
function critterFace(key, opts) {
  if (!faceCache.has(key)) faceCache.set(key, makeCritterFaceTexture(opts));
  return faceCache.get(key);
}

// small chibi villager critter used by scenic landmarks (dancers, fishermen)
function buildCritter(furC, bellyC, faceKey, faceOpts) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(sharedBox(0.34, 0.3, 0.26), lam(furC));
  body.position.y = 0.26;
  body.castShadow = true;
  const belly = new THREE.Mesh(sharedBox(0.26, 0.18, 0.05), lam(bellyC));
  belly.position.set(0, 0.24, 0.14);
  const head = new THREE.Mesh(sharedBox(0.34, 0.3, 0.28), lam(furC));
  head.position.y = 0.56;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24),
    new THREE.MeshBasicMaterial({ map: critterFace(faceKey, faceOpts), transparent: true }));
  face.position.set(0, 0.57, 0.15);
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.19, 0.36, 0);
    const limb = new THREE.Mesh(sharedBox(0.08, 0.2, 0.09), lam(furC));
    limb.position.y = -0.08;
    arm.add(limb);
    g.add(arm);
    arms.push(arm);
  }
  const feet = new THREE.Mesh(sharedBox(0.26, 0.1, 0.2), lam(bellyC));
  feet.position.y = 0.06;
  g.add(body, belly, head, face, feet);
  g.userData.arms = arms;
  return g;
}

// hanging paper lantern (chōchin) on a swing pivot
function buildChochin(scale = 1) {
  const pivot = new THREE.Group();
  const string = new THREE.Mesh(sharedBox(0.02, 0.18, 0.02), lam('#3a322a'));
  string.position.y = -0.09;
  const body = new THREE.Mesh(sharedCyl(0.11 * scale, 0.11 * scale, 0.22 * scale, 8), lam('#e05a48'));
  body.position.y = -0.3 * scale;
  const rim1 = new THREE.Mesh(sharedCyl(0.08 * scale, 0.08 * scale, 0.035, 8), lam('#3a322a'));
  rim1.position.y = -0.18 * scale;
  const rim2 = rim1.clone(); rim2.position.y = -0.42 * scale;
  const pane = new THREE.Mesh(sharedBox(0.09 * scale, 0.1 * scale, 0.09 * scale),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  pane.position.y = -0.3 * scale;
  pivot.add(string, body, rim1, rim2, pane);
  return pivot;
}

function buildWindmill() {
  const g = new THREE.Group();
  const stone = lam('#d8c8a8'), wood = lam('#7a5638'), roof = lam('#8a4638');
  const tower = new THREE.Mesh(sharedCyl(0.7, 1.0, 3.2, 10), stone);
  tower.position.y = 1.6; tower.castShadow = true;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.9, 10), roof);
  cap.position.y = 3.55;
  const door = new THREE.Mesh(sharedBox(0.5, 0.9, 0.1), wood);
  door.position.set(0, 0.45, 0.95);
  const win = new THREE.Mesh(sharedBox(0.4, 0.4, 0.1), lam('#8ac4d8'));
  win.position.set(0, 2.1, 0.85);
  // sail hub + 4 blades (spins)
  const sails = new THREE.Group();
  sails.position.set(0, 2.9, 1.0);
  const hub = new THREE.Mesh(sharedBox(0.18, 0.18, 0.18), wood);
  sails.add(hub);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i * Math.PI / 2;
    const spar = new THREE.Mesh(sharedBox(0.1, 1.6, 0.06), wood);
    spar.position.y = 0.8;
    const cloth = new THREE.Mesh(sharedBox(0.32, 1.2, 0.03), lam('#f0e8d0'));
    cloth.position.set(0.22, 0.85, 0.04);
    arm.add(spar, cloth);
    sails.add(arm);
  }
  g.add(tower, cap, door, win, sails);
  g.userData.sails = sails;
  return g;
}

function buildShrine() {
  const g = new THREE.Group();
  const stone = lam('#b8b0a0'), red = lam('#c04a3a'), gold = lam('#e8c45a');
  // torii-style gate
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(sharedCyl(0.12, 0.14, 2.0, 8), red);
    post.position.set(sx * 0.9, 1.0, 0); post.castShadow = true;
    g.add(post);
  }
  const beam = new THREE.Mesh(sharedBox(2.4, 0.2, 0.24), red);
  beam.position.y = 2.05;
  const beam2 = new THREE.Mesh(sharedBox(2.7, 0.16, 0.3), lam('#8a3428'));
  beam2.position.y = 2.3;
  // altar with a glowing gem
  const altar = new THREE.Mesh(sharedBox(0.7, 0.5, 0.7), stone);
  altar.position.set(0, 0.25, -0.9); altar.castShadow = true;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), lam('#5ad0f0'));
  gem.position.set(0, 0.75, -0.9);
  const glow = new THREE.PointLight(0x6ad8f0, 1.6, 5, 2);
  glow.position.set(0, 0.9, -0.9);
  // stone lanterns
  for (const sx of [-1, 1]) {
    const lan = new THREE.Mesh(sharedBox(0.22, 0.5, 0.22), stone);
    lan.position.set(sx * 1.3, 0.25, -0.9);
    const lanTop = new THREE.Mesh(sharedBox(0.3, 0.14, 0.3), gold);
    lanTop.position.set(sx * 1.3, 0.55, -0.9);
    g.add(lan, lanTop);
  }
  g.add(beam, beam2, altar, gem, glow);
  g.userData.gem = gem;
  return g;
}

function buildRuinTower() {
  const g = new THREE.Group();
  const stone = lam('#9aa0a2'), moss = lam('#5c8a4a');
  // broken cylindrical tower (jagged top via stacked shrinking rings)
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const r = 0.9 - i * 0.06;
    const seg = new THREE.Mesh(sharedCyl(r, r + 0.06, 0.6, 9), stone);
    seg.position.y = y + 0.3;
    // knock a couple of top segments partly off for a ruined look
    if (i >= 3) seg.rotation.z = (Math.random() - 0.5) * 0.12;
    seg.castShadow = true;
    g.add(seg);
    y += 0.6;
  }
  // broken merlons
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.4) continue;
    const a = (i / 5) * Math.PI * 2;
    const m = new THREE.Mesh(sharedBox(0.24, 0.3, 0.24), stone);
    m.position.set(Math.cos(a) * 0.6, y + 0.1, Math.sin(a) * 0.6);
    g.add(m);
  }
  // moss & vines
  for (let i = 0; i < 5; i++) {
    const v = new THREE.Mesh(sharedBox(0.12, 0.6 + Math.random() * 0.5, 0.06), moss);
    const a = Math.random() * Math.PI * 2;
    v.position.set(Math.cos(a) * 0.85, 0.6 + Math.random() * 1.2, Math.sin(a) * 0.85);
    g.add(v);
  }
  const rubble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), stone);
  rubble.position.set(1.1, 0.15, 0.4); rubble.scale.set(1.2, 0.5, 1);
  g.add(rubble);
  return g;
}

// A romantic garden: torches arranged in a heart, glowing at night.
function buildHeartTorches() {
  const g = new THREE.Group();
  const flames = [];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    // heart curve, laid flat on the x-z plane and scaled down
    const hx = 16 * Math.sin(t) ** 3;
    const hz = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const x = hx * 0.16, z = hz * 0.16;
    const pole = new THREE.Mesh(sharedCyl(0.05, 0.07, 0.7, 5), lam('#3a2e26'));
    pole.position.set(x, 0.35, z);
    const bowl = new THREE.Mesh(sharedCyl(0.11, 0.06, 0.1, 6), lam('#5a4632'));
    bowl.position.set(x, 0.72, z);
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0),
      new THREE.MeshBasicMaterial({ color: 0xff9a3a }));
    flame.position.set(x, 0.86, z);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
    core.position.set(x, 0.88, z);
    g.add(pole, bowl, flame, core);
    flames.push(flame, core);
  }
  // a couple of soft rose lights to bathe the heart at night
  const l1 = new THREE.PointLight(0xff8a5a, 3, 9, 1.6); l1.position.set(0, 1.2, 0.5);
  const l2 = new THREE.PointLight(0xffb060, 2.4, 8, 1.6); l2.position.set(0, 1.2, -1.2);
  g.add(l1, l2);
  // a little plaque/sign
  const post = new THREE.Mesh(sharedBox(0.1, 0.7, 0.1), lam('#6a4a30'));
  post.position.set(0, 0.35, 2.4);
  const heart = new THREE.Mesh(sharedBox(0.3, 0.3, 0.06), lam('#e85a7a'));
  heart.position.set(0, 0.8, 2.4); heart.rotation.z = Math.PI / 4;
  g.add(post, heart);
  g.userData.flames = flames;
  return g;
}

// A cozy Japanese-style schoolhouse — cream walls, hip roof, rows of windows,
// a clock, an entrance porch and a flagpole.
function buildSchool() {
  const g = new THREE.Group();
  const wall = lam('#ede4d2'), wallLow = lam('#d8cdb8'), beam = lam('#7a5a44');
  const roof = lam('#9a5648'), roofDark = lam('#7a4438'), win = lam('#8fc8dc'), gold = lam('#d8a83a');
  const W = 6.4, D = 3.2, H = 2.2;
  // two floors
  const lower = new THREE.Mesh(sharedBox(W, H, D), wallLow);
  lower.position.y = H / 2; lower.castShadow = true; lower.receiveShadow = true;
  const upper = new THREE.Mesh(sharedBox(W - 0.1, H, D - 0.1), wall);
  upper.position.y = H + H / 2; upper.castShadow = true;
  const band = new THREE.Mesh(sharedBox(W + 0.05, 0.16, D + 0.05), beam);
  band.position.y = H;
  g.add(lower, upper, band);
  // corner beams
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const b = new THREE.Mesh(sharedBox(0.16, H * 2, 0.16), beam);
    b.position.set(dx * (W / 2 - 0.08), H, dz * (D / 2 - 0.08));
    g.add(b);
  }
  // hip roof (stacked slabs)
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(sharedBox(W + 0.6 - i * 0.7, 0.28, D + 0.6 - i * 0.5), i % 2 ? roofDark : roof);
    r.position.y = 2 * H + 0.14 + i * 0.26; r.castShadow = true;
    g.add(r);
  }
  // window rows on both floors (front)
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 5; i++) {
      const wm = new THREE.Mesh(sharedBox(0.7, 0.7, 0.08), win);
      wm.position.set(-W / 2 + 0.9 + i * 1.15, 0.7 + f * H, D / 2 + 0.02);
      const frame = new THREE.Mesh(sharedBox(0.8, 0.8, 0.05), beam);
      frame.position.set(wm.position.x, wm.position.y, D / 2 - 0.01);
      g.add(frame, wm);
    }
  }
  // entrance porch + double doors
  const porch = new THREE.Mesh(sharedBox(1.6, 0.16, 0.9), roofDark);
  porch.position.set(0, 1.15, D / 2 + 0.45);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(sharedBox(0.12, 1.1, 0.12), beam);
    post.position.set(sx * 0.6, 0.55, D / 2 + 0.8); g.add(post);
  }
  const door = new THREE.Mesh(sharedBox(1.0, 1.1, 0.1), beam);
  door.position.set(0, 0.55, D / 2 + 0.05);
  const doorGlass = new THREE.Mesh(sharedBox(0.8, 0.8, 0.12), win);
  doorGlass.position.set(0, 0.62, D / 2 + 0.06);
  g.add(porch, door, doorGlass);
  // round clock high on the front gable
  const clock = new THREE.Mesh(sharedCyl(0.32, 0.32, 0.1, 12), lam('#f4f0e4'));
  clock.rotation.x = Math.PI / 2; clock.position.set(0, 2 * H + 0.3, D / 2 + 0.02);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 14), gold);
  rim.position.set(0, 2 * H + 0.3, D / 2 + 0.03);
  const hand1 = new THREE.Mesh(sharedBox(0.03, 0.22, 0.02), beam);
  hand1.position.set(0, 2 * H + 0.36, D / 2 + 0.08);
  const hand2 = new THREE.Mesh(sharedBox(0.16, 0.03, 0.02), beam);
  hand2.position.set(0.06, 2 * H + 0.3, D / 2 + 0.08);
  g.add(clock, rim, hand1, hand2);
  // flagpole with a little flag
  const pole = new THREE.Mesh(sharedCyl(0.04, 0.04, 2.6, 6), lam('#9aa0a2'));
  pole.position.set(-W / 2 - 0.8, 1.3, D / 2 - 0.5);
  const flag = new THREE.Mesh(sharedBox(0.5, 0.32, 0.03), lam('#e05a6a'));
  flag.position.set(-W / 2 - 0.55, 2.4, D / 2 - 0.5);
  g.add(pole, flag);
  g.userData.clockHand = hand2;
  return g;
}

// Rialo monument — a stone plinth with a tall flagpole; the cream banner
// carries the Rialo mark (painted procedurally on canvas) and ripples in the
// wind. Two paper lanterns sway on a crossbar.
// THE official Rialo symbol path, verbatim from rialo.io/brand-assets
// (Group-14449.svg, viewBox 0 0 180 180). Do NOT edit these coordinates.
const RIALO_PATH = 'M106.125 100.655C103.236 100.493 100.39 99.3801 98.4586 97.1916C95.7725 94.2692 94.8217 89.5202 96.4506 85.8339C98.4818 81.0683 103.412 79.0425 108.395 79.3912C112.108 79.3912 120.536 79.3912 124.854 79.3912C126.267 79.3713 127.504 79.4576 128.764 79.2982C131.666 78.9927 134.708 77.0831 136.26 74.5392C139.212 70.0692 138.095 63.5335 133.627 60.4782C131.849 59.1831 129.711 58.5953 127.52 58.4292C126.426 58.3196 125.326 58.1967 124.289 57.8812C121.008 56.9016 118.401 54.371 117.321 51.143C116.729 49.4626 116.753 47.6394 116.45 45.8992C115.752 41.7081 112.511 38.4934 108.299 37.5403C107.338 37.3145 106.427 37.1484 105.536 37.1418C95.327 37.1086 77.3698 37.0122 73.5268 37.0023C68.4239 36.896 63.5503 40.5092 62.6561 45.6169C61.6156 50.5685 64.6108 55.8621 69.3414 57.5259C71.0136 58.1502 72.3766 58.2864 74.1983 58.2665C79.7766 58.3196 80.9358 58.4525 83.9909 58.4823C87.9203 58.3561 92.1921 60.269 94.0903 63.776C98.2358 71.4308 92.3384 79.5838 83.8911 79.2849C73.4426 79.3082 67.4166 79.2716 54.8771 79.2816C52.7195 79.2982 51.0573 79.1587 49.0129 79.7067C43.132 81.0882 39.5583 87.8763 41.7491 93.5286C43.0655 97.2547 46.5528 99.9447 50.4889 100.426C55.4023 100.745 66.2055 100.463 78.6121 100.552C81.4677 100.552 83.5587 100.552 84.3898 100.552C85.191 100.546 85.9423 100.639 86.8066 100.811C92.0791 101.698 95.6794 106.832 95.3769 112.036C95.3769 115.547 95.3769 126.297 95.3769 131.653C95.3669 133.583 95.7126 135.569 96.7099 137.445C99.5656 143.008 107.265 144.781 112.288 140.975C116.084 138.189 116.906 134.134 116.689 129.74C116.683 125.274 116.696 117.649 116.689 112.704C117.118 106.138 112.906 100.928 106.194 100.669L106.128 100.662L106.125 100.655Z';

export function paintRialoMark(ctx, W = 128) {
  // renders the official vector verbatim — scaled, never redrawn by hand
  ctx.fillStyle = '#e8e3d5'; // official brand cream
  ctx.fillRect(0, 0, W, W);
  ctx.save();
  ctx.scale(W / 180, W / 180);
  ctx.fillStyle = '#141414';
  ctx.fill(new Path2D(RIALO_PATH));
  ctx.restore();
}

// The mark itself is NEVER stretched: it's painted into a square region and
// centered on whatever canvas aspect the target surface needs (the banner is
// 2.0:1.27, so a square texture would distort the glyph — this fixes that).
function makeRialoTexture(w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(0, 0, w, h);
  const s = Math.min(w, h);
  const sq = document.createElement('canvas');
  sq.width = sq.height = s;
  paintRialoMark(sq.getContext('2d'), s);
  ctx.drawImage(sq, (w - s) / 2, (h - s) / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRialoMonument() {
  const g = new THREE.Group();
  const stone = lam('#b8b0a0'), stoneDark = lam('#8a8478');
  // two-step plinth
  const base = new THREE.Mesh(sharedBox(2.0, 0.35, 2.0), stoneDark);
  base.position.y = 0.17; base.castShadow = true;
  const step = new THREE.Mesh(sharedBox(1.4, 0.35, 1.4), stone);
  step.position.y = 0.5; step.castShadow = true;
  // tall pole + gold finial
  const pole = new THREE.Mesh(sharedCyl(0.06, 0.09, 4.4, 8), lam('#5a4a3a'));
  pole.position.y = 2.8; pole.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam('#e8c45a'));
  finial.position.y = 5.05;
  // waving banner — left edge pinned to the pole. TWO single-sided layers
  // sharing one deforming geometry: the back layer carries a horizontally
  // mirrored texture so the mark reads CORRECTLY from both sides (a plain
  // DoubleSide plane would show the logo mirrored from behind).
  const flagGeo = new THREE.PlaneGeometry(2.0, 1.27, 12, 6);
  flagGeo.translate(1.04, 0, 0);
  const flagTexF = makeRialoTexture(320, 203); // canvas aspect = 2.0 : 1.27
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({
    map: flagTexF, side: THREE.FrontSide,
  }));
  flag.position.y = 4.3;
  flag.castShadow = true;
  const flagTexB = makeRialoTexture(320, 203);
  flagTexB.wrapS = THREE.RepeatWrapping;
  flagTexB.repeat.x = -1; // mirror so the back view reads the mark correctly
  const flagBack = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({
    map: flagTexB, side: THREE.BackSide,
  }));
  flagBack.position.y = 4.3;
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  // plaque with the mark on the plinth face — big & readable
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshLambertMaterial({ map: makeRialoTexture() }));
  plaque.position.set(0, 0.52, 0.71);
  // crossbar with two swaying paper lanterns (chōchin)
  const bar = new THREE.Mesh(sharedBox(1.7, 0.07, 0.07), lam('#5a4a3a'));
  bar.position.y = 2.0;
  const lanterns = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.75, 2.0, 0);
    const string = new THREE.Mesh(sharedBox(0.02, 0.22, 0.02), lam('#3a322a'));
    string.position.y = -0.11;
    const body = new THREE.Mesh(sharedCyl(0.13, 0.13, 0.26, 8), lam('#e05a48'));
    body.position.y = -0.36;
    const rim1 = new THREE.Mesh(sharedCyl(0.09, 0.09, 0.04, 8), lam('#3a322a'));
    rim1.position.y = -0.22;
    const rim2 = rim1.clone(); rim2.position.y = -0.5;
    const glowP = new THREE.Mesh(sharedBox(0.1, 0.12, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    glowP.position.y = -0.36;
    pivot.add(string, body, rim1, rim2, glowP);
    g.add(pivot);
    lanterns.push(pivot);
  }
  const light = new THREE.PointLight(0xffc27a, 1.2, 6, 2);
  light.position.y = 1.7;
  g.add(base, step, pole, finial, flag, flagBack, plaque, bar, light);
  g.userData.flag = flag;
  g.userData.flagBase = flagBase;
  g.userData.lanterns = lanterns;
  return g;
}

// Festival plaza — a packed-earth dance circle around a bonfire, ringed by
// lantern poles, with villager critters dancing to their own drum
function buildFestival() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(sharedCyl(2.5, 2.6, 0.08, 14), lam('#b89468'));
  ground.position.y = 0.04;
  ground.receiveShadow = true;
  g.add(ground);
  // bonfire
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(sharedBox(0.16, 0.13, 0.14), lam('#8d9294'));
    stone.position.set(Math.cos(a) * 0.42, 0.12, Math.sin(a) * 0.42);
    g.add(stone);
  }
  const flames = [];
  for (const [fx, fy, fz, s] of [[0, 0.3, 0, 0.17], [0.08, 0.42, 0.05, 0.1], [-0.09, 0.4, -0.04, 0.11]]) {
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0),
      new THREE.MeshBasicMaterial({ color: fy > 0.35 ? 0xffd23e : 0xff8a33 }));
    flame.position.set(fx, fy, fz);
    g.add(flame);
    flames.push(flame);
  }
  const fireLight = new THREE.PointLight(0xffa050, 2.2, 8, 2);
  fireLight.position.y = 0.7;
  g.add(fireLight);
  // lantern poles around the circle
  const lanterns = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const px = Math.cos(a) * 2.2, pz = Math.sin(a) * 2.2;
    const pole = new THREE.Mesh(sharedCyl(0.05, 0.07, 1.7, 6), lam('#5a4a3a'));
    pole.position.set(px, 0.85, pz);
    const arm = new THREE.Mesh(sharedBox(0.5, 0.06, 0.06), lam('#5a4a3a'));
    arm.position.set(px, 1.68, pz);
    arm.lookAt(0, 1.68, 0);
    g.add(pole, arm);
    const cho = buildChochin(0.8);
    cho.position.set(px * 0.86, 1.66, pz * 0.86);
    g.add(cho);
    lanterns.push(cho);
  }
  // the dancers! villager critters circling the fire
  const DANCER_LOOKS = [
    ['#e8a86a', '#f5dcb8', 'd_fox', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,140,120,0.7)' }],
    ['#a8c8e8', '#e0eef8', 'd_bun', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,170,0.6)' }],
    ['#b8d888', '#e8f5cc', 'd_frog', { eyeW: 4, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile' }],
    ['#e8c8a0', '#f8ecd8', 'd_cub', { eyeW: 3, eyeH: 5, gap: 4, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,150,140,0.7)' }],
  ];
  const dancers = [];
  DANCER_LOOKS.forEach((look, i) => {
    const d = buildCritter(...look);
    const a = (i / DANCER_LOOKS.length) * Math.PI * 2;
    d.position.set(Math.cos(a) * 1.35, 0.08, Math.sin(a) * 1.35);
    d.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    g.add(d);
    dancers.push({ g: d, seed: i * 1.7, baseA: a });
  });
  g.userData.flames = flames;
  g.userData.lanterns = lanterns;
  g.userData.dancers = dancers;
  return g;
}

// wooden watchtower — a tall lookout with a lantern, great for sparse corners
function buildWatchtower() {
  const g = new THREE.Group();
  const wood = lam('#7a5638'), woodDark = lam('#5a4028');
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(sharedBox(0.16, 2.8, 0.16), wood);
    leg.position.set(sx * 0.55, 1.4, sz * 0.55);
    leg.rotation.z = -sx * 0.06;
    leg.rotation.x = sz * 0.06;
    leg.castShadow = true;
    g.add(leg);
    const brace = new THREE.Mesh(sharedBox(0.08, 1.1, 0.08), woodDark);
    brace.position.set(sx * 0.5, 0.9, 0);
    brace.rotation.x = sz * 0.6;
    g.add(brace);
  }
  const deck = new THREE.Mesh(sharedBox(1.7, 0.12, 1.7), wood);
  deck.position.y = 2.8;
  deck.castShadow = true;
  g.add(deck);
  for (const [sx, sz, w, d] of [[0, -1, 1.7, 0.08], [0, 1, 1.7, 0.08], [-1, 0, 0.08, 1.7], [1, 0, 0.08, 1.7]]) {
    const rail = new THREE.Mesh(sharedBox(w, 0.34, d), woodDark);
    rail.position.set(sx * 0.81, 3.05, sz * 0.81);
    g.add(rail);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.75, 4), lam('#8a4638'));
  roof.position.y = 3.9;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(sharedBox(0.09, 0.75, 0.09), wood);
    post.position.set(sx * 0.7, 3.2, sz * 0.7);
    g.add(post);
  }
  // ladder up the front
  for (let i = 0; i < 6; i++) {
    const rung = new THREE.Mesh(sharedBox(0.4, 0.05, 0.05), woodDark);
    rung.position.set(0, 0.4 + i * 0.44, 0.62);
    g.add(rung);
  }
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(sharedBox(0.06, 2.75, 0.06), wood);
    rail.position.set(sx * 0.23, 1.45, 0.62);
    g.add(rail);
  }
  const cho = buildChochin(0.9);
  cho.position.set(0, 3.62, 0.8);
  g.add(cho, roof);
  const light = new THREE.PointLight(0xffc27a, 1.3, 7, 2);
  light.position.y = 3.1;
  g.add(light);
  g.userData.lanterns = [cho];
  return g;
}

// fishing dock — a lantern-lit wooden pier reaching into the lake, with a
// fishmonger critter and a fish-market stall (walk up + interact to sell)
function buildFishingDock() {
  const g = new THREE.Group();
  const wood = lam('#8a6a48'), woodDark = lam('#6a4e34');
  // pier planks marching out over the water (+z = toward the lake)
  for (let i = 0; i < 3; i++) {
    const deck = new THREE.Mesh(sharedBox(1.15, 0.09, 1.05), wood);
    deck.position.set(0, 0.42, 0.55 + i * 1.0);
    deck.castShadow = true;
    g.add(deck);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(sharedCyl(0.06, 0.07, 0.9, 6), woodDark);
      post.position.set(sx * 0.48, 0, 0.55 + i * 1.0);
      g.add(post);
    }
  }
  // end railing + two lanterns over the water
  const lanterns = [];
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(sharedBox(0.07, 0.65, 0.07), woodDark);
    rail.position.set(sx * 0.48, 0.74, 2.95);
    g.add(rail);
    const cho = buildChochin(0.75);
    cho.position.set(sx * 0.48, 1.12, 2.95);
    g.add(cho);
    lanterns.push(cho);
  }
  // fish-market stall on the shore end: counter + striped awning + crates
  const counter = new THREE.Mesh(sharedBox(1.5, 0.55, 0.6), woodDark);
  counter.position.set(0, 0.28, -0.75);
  counter.castShadow = true;
  const top = new THREE.Mesh(sharedBox(1.6, 0.08, 0.7), wood);
  top.position.set(0, 0.6, -0.75);
  for (const sx of [-1, 1]) {
    const pole = new THREE.Mesh(sharedBox(0.08, 1.5, 0.08), wood);
    pole.position.set(sx * 0.76, 0.75, -0.75);
    g.add(pole);
  }
  const awning = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const strip = new THREE.Mesh(sharedBox(0.36, 0.04, 0.95),
      lam(i % 2 ? '#f0ead8' : '#4a90b8'));
    strip.position.set(-0.72 + i * 0.36, 0, 0);
    awning.add(strip);
  }
  awning.position.set(0, 1.55, -0.75);
  awning.rotation.x = 0.18;
  // crates of the day's catch
  const crate = new THREE.Mesh(sharedBox(0.5, 0.3, 0.4), wood);
  crate.position.set(0.45, 0.72, -0.75);
  for (let i = 0; i < 3; i++) {
    const fish = new THREE.Mesh(sharedBox(0.22, 0.08, 0.1),
      lam(['#7ab8e8', '#e8a35d', '#f0c455'][i]));
    fish.position.set(0.34 + i * 0.11, 0.9, -0.75 + (i % 2 ? 0.08 : -0.06));
    fish.rotation.y = i * 0.5;
    g.add(fish);
  }
  // hanging sign: a painted fish
  const sign = new THREE.Mesh(sharedBox(0.5, 0.32, 0.05), lam('#f0ead8'));
  sign.position.set(0, 1.14, -0.4);
  const signFish = new THREE.Mesh(sharedBox(0.3, 0.12, 0.02), lam('#4a90b8'));
  signFish.position.set(0, 1.14, -0.36);
  // the fishmonger — a cheery otter critter in a straw hat
  const monger = buildCritter('#8a7258', '#e8d8b8', 'monger',
    { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile', cheeks: 'rgba(240,160,130,0.6)' });
  monger.position.set(-0.5, 0.05, -1.35);
  monger.rotation.y = Math.PI; // faces customers coming from land
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(sharedCyl(0.26, 0.28, 0.04, 8), lam('#d8b86a'));
  const dome = new THREE.Mesh(sharedCyl(0.13, 0.16, 0.1, 8), lam('#e8cc82'));
  dome.position.y = 0.06;
  hat.add(brim, dome);
  hat.position.y = 0.74;
  monger.add(hat);
  const light = new THREE.PointLight(0xffc27a, 1.1, 6, 2);
  light.position.set(0, 1.2, 0.6);
  g.add(counter, top, awning, crate, sign, signFish, monger, light);
  g.userData.lanterns = lanterns;
  g.userData.monger = monger;
  return g;
}

// tiny canvas-sprite helper for Zzz / chat bubbles
function makeGlyphSprite(glyph, color = '#f0f0e8') {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#20242a'; ctx.lineWidth = 5;
  ctx.strokeText(glyph, 16, 24);
  ctx.fillStyle = color;
  ctx.fillText(glyph, 16, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(0.34, 0.34, 1);
  return spr;
}

// swimming pool — tiled deck, clear blue water, umbrella, lounge chair, and
// critters actually SWIMMING laps (this is a pool, not a fishing spot!)
function buildPool() {
  const g = new THREE.Group();
  const tile = lam('#dce8ec'), trim = lam('#7ab8d8');
  const deck = new THREE.Mesh(sharedBox(5.6, 0.22, 4.4), tile);
  deck.position.y = 0.11;
  deck.receiveShadow = true;
  const rim = new THREE.Mesh(sharedBox(4.4, 0.26, 3.2), trim);
  rim.position.y = 0.13;
  const water = new THREE.Mesh(sharedBox(4.0, 0.16, 2.8),
    new THREE.MeshLambertMaterial({ color: 0x5ec8e8, transparent: true, opacity: 0.8 }));
  water.position.y = 0.2;
  // ladder
  for (const sz of [-1, 1]) {
    const rail = new THREE.Mesh(sharedBox(0.05, 0.5, 0.05), lam('#c8d4d8'));
    rail.position.set(2.05, 0.42, sz * 0.16);
    g.add(rail);
  }
  for (let i = 0; i < 2; i++) {
    const rung = new THREE.Mesh(sharedBox(0.05, 0.05, 0.36), lam('#c8d4d8'));
    rung.position.set(2.05, 0.3 + i * 0.2, 0);
    g.add(rung);
  }
  // umbrella + lounge chair on the deck corner
  const pole = new THREE.Mesh(sharedCyl(0.04, 0.04, 1.5, 6), lam('#e8e2d2'));
  pole.position.set(-2.4, 0.95, -1.7);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 8), lam('#f0716a'));
  shade.position.set(-2.4, 1.75, -1.7);
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(sharedBox(0.5, 0.08, 1.1), lam('#f0d8a0'));
  seat.position.y = 0.24;
  const back = new THREE.Mesh(sharedBox(0.5, 0.08, 0.5), lam('#f0d8a0'));
  back.position.set(0, 0.4, -0.68); back.rotation.x = -0.7;
  chair.add(seat, back);
  chair.position.set(-1.6, 0.22, -1.6);
  // swimmers! two critters doing lazy laps, one on a pink floatie
  const SWIM_LOOKS = [
    ['#e8b878', '#f8e8c8', 's_cap', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile', cheeks: 'rgba(240,150,140,0.6)' }],
    ['#a8d8c8', '#e0f5ec', 's_duck', { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'open' }],
  ];
  const swimmers = [];
  SWIM_LOOKS.forEach((look, i) => {
    const sw = buildCritter(...look);
    sw.scale.setScalar(0.85);
    sw.position.y = -0.14; // chest-deep in the water
    const holder = new THREE.Group();
    holder.add(sw);
    if (i === 1) { // floatie ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12), lam('#f0a8c8'));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22;
      holder.add(ring);
    }
    const foam = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 4, 10),
      new THREE.MeshBasicMaterial({ color: 0xeafaff, transparent: true, opacity: 0.7 }));
    foam.rotation.x = Math.PI / 2;
    foam.position.y = 0.26;
    holder.add(foam);
    g.add(holder);
    swimmers.push({ h: holder, seed: i * 2.6, r: 0.7 + i * 0.45 });
  });
  const light = new THREE.PointLight(0x8ad8f0, 0.8, 6, 2);
  light.position.y = 1.4;
  g.add(deck, rim, water, pole, shade, chair, light);
  g.userData.swimmers = swimmers;
  return g;
}

// spring waterfall — a mossy rock face with a rushing white-blue sheet, foam
// clouds at the base and a clear plunge pool
/**
 * The spring waterfall, rebuilt. The old one was a single striped plane in
 * front of some boxes — flat, and it stopped dead at the pool.
 *
 * What makes falling water read:
 *   - it falls in TIERS, not one drop, with a ledge and a churn at each one
 *   - the sheet is layered: a wide translucent body, a brighter fast core, and
 *     a mist veil in front, all scrolling at DIFFERENT speeds
 *   - it throws spray where it lands, and the plunge pool has expanding rings
 *   - it carries a stream away downhill instead of stopping
 */
function buildWaterfall() {
  const g = new THREE.Group();
  const rock = lam('#8d9294'), rockDark = lam('#6a7074'), rockWet = lam('#5c6468');

  // --- the cliff: a stack of ledges, wet and dark where the water runs ------
  for (const [x, y, z, w, h, d, wet] of [
    [0, 1.4, -0.9, 3.0, 2.8, 1.4, 0],
    [-1.35, 0.9, -0.5, 1.4, 1.8, 1.5, 0],
    [1.35, 1.0, -0.55, 1.5, 2.0, 1.4, 0],
    [0, 3.0, -1.1, 2.2, 0.6, 1.0, 0],
    [0, 1.75, -0.2, 1.5, 0.28, 0.6, 1],   // the mid ledge the water breaks on
    [0, 0.55, 0.25, 1.9, 0.24, 0.7, 1],   // the lower lip
  ]) {
    const b = new THREE.Mesh(sharedBox(w, h, d), wet ? rockWet : (Math.random() < 0.5 ? rock : rockDark));
    b.position.set(x, y, z);
    b.castShadow = true;
    g.add(b);
  }
  // mossy toppers + ferns at the lip
  for (const [x, z] of [[-1.1, -0.4], [1.1, -0.5], [0, -0.9], [-0.5, -1.0]]) {
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), lam('#6fa05a'));
    moss.position.set(x, 3.2, z);
    moss.scale.y = 0.5;
    g.add(moss);
  }
  for (let i = 0; i < 6; i++) {
    const a = -0.9 + i * 0.36;
    const fern = new THREE.Mesh(sharedBox(0.28, 0.03, 0.1), lam('#4e8a3e'));
    fern.position.set(a, 1.9 + (i % 2) * 0.1, 0.12);
    fern.rotation.z = 0.5 - (i % 3) * 0.4;
    g.add(fern);
  }

  // --- the water sheets ------------------------------------------------------
  // three canvases at different densities: body, fast core, mist
  function waterTex(bands, bright) {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 32, 64);
    ctx.fillStyle = bright ? 'rgba(190,240,255,0.55)' : 'rgba(122,208,232,0.75)';
    ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = bright ? 'rgba(255,255,255,0.95)' : 'rgba(184,236,248,0.9)';
    for (let i = 0; i < bands; i++) ctx.fillRect((i * 7) % 32, (i * 19) % 64, bright ? 2 : 4, 12 + (i % 3) * 6);
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (let i = 0; i < bands / 2; i++) ctx.fillRect((i * 13 + 3) % 32, (i * 27 + 8) % 64, 2, 8);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }
  const sheets = [];
  // upper fall: cliff lip down to the mid ledge
  const bodyA = waterTex(8, false);
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4),
    new THREE.MeshBasicMaterial({ map: bodyA, transparent: true, opacity: 0.9, depthWrite: false }));
  upper.position.set(0, 2.6, 0.14);
  g.add(upper); sheets.push({ t: bodyA, sp: 2.2 });
  // lower fall: mid ledge down into the pool, wider
  const bodyB = waterTex(9, false);
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.3),
    new THREE.MeshBasicMaterial({ map: bodyB, transparent: true, opacity: 0.9, depthWrite: false }));
  lower.position.set(0, 1.15, 0.34);
  g.add(lower); sheets.push({ t: bodyB, sp: 2.6 });
  // a bright fast core over both, scrolling quicker — this is the "rush"
  const coreT = waterTex(14, true);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.7),
    new THREE.MeshBasicMaterial({
      map: coreT, transparent: true, opacity: 0.75, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
  core.position.set(0, 1.85, 0.4);
  g.add(core); sheets.push({ t: coreT, sp: 4.4 });
  // a mist veil in front, drifting slowly the other way
  const mistT = waterTex(5, true);
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9),
    new THREE.MeshBasicMaterial({
      map: mistT, transparent: true, opacity: 0.16, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
  mist.position.set(0, 1.7, 0.55);
  g.add(mist); sheets.push({ t: mistT, sp: -0.8 });

  // --- plunge pool -----------------------------------------------------------
  const pool = new THREE.Mesh(sharedCyl(1.7, 1.8, 0.2, 14),
    new THREE.MeshLambertMaterial({ color: 0x4fb8dc, transparent: true, opacity: 0.82 }));
  pool.position.set(0, 0.1, 1.15);
  g.add(pool);
  // a pale shallow ring around the rim so the pool reads as having depth
  const rim = new THREE.Mesh(sharedCyl(1.85, 1.9, 0.16, 14),
    new THREE.MeshLambertMaterial({ color: 0x9fe0e8, transparent: true, opacity: 0.5 }));
  rim.position.set(0, 0.08, 1.15);
  g.add(rim);
  // stones round the edge
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.14, 0), rockDark);
    st.position.set(Math.cos(a) * 1.9, 0.12, 1.15 + Math.sin(a) * 1.9);
    st.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(st);
  }

  // churn where each fall lands
  const foams = [];
  for (let i = 0; i < 9; i++) {
    const at = i < 4 ? { y: 1.95, z: 0.2, spread: 0.5 } : { y: 0.28, z: 0.72, spread: 0.85 };
    const foam = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 + Math.random() * 0.12, 0),
      new THREE.MeshBasicMaterial({ color: 0xf0fbff, transparent: true, opacity: 0.85 }));
    foam.position.set((Math.random() - 0.5) * at.spread * 2, at.y, at.z + (Math.random() - 0.5) * 0.35);
    g.add(foam);
    foams.push(foam);
  }

  // expanding rings on the pool surface, recycled
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 5, 14),
      new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.5, depthWrite: false }));
    r.rotation.x = Math.PI / 2;
    r.position.set(0, 0.21, 0.9);
    g.add(r);
    rings.push({ m: r, t: i * 0.45 });
  }

  // --- the outflow: a stream running away downhill, so the water goes SOMEWHERE
  const streamT = waterTex(6, false);
  streamT.repeat.set(1, 3);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 4.2),
    new THREE.MeshBasicMaterial({ map: streamT, transparent: true, opacity: 0.72, depthWrite: false }));
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(0, 0.13, 4.2);
  g.add(stream);
  sheets.push({ t: streamT, sp: 0.9 });
  for (let i = 0; i < 8; i++) {
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + Math.random() * 0.1, 0), rockDark);
    st.position.set((i % 2 ? 0.62 : -0.62) + (Math.random() - 0.5) * 0.2, 0.1, 2.4 + i * 0.5);
    g.add(st);
  }

  const light = new THREE.PointLight(0x9ae0f0, 1.0, 7, 2);
  light.position.set(0, 1.4, 1.1);
  g.add(light);

  g.userData.fall = { sheets, foams, rings, core, mist };
  g.userData.foams = foams;      // kept for the old update path
  return g;
}

// nap nest — a cozy grass bed where a critter snoozes with drifting Zzz,
// waking now and then to look around before flopping back down
function buildNapNest() {
  const g = new THREE.Group();
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 6, 12), lam('#8a7a4a'));
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.12;
  const bed = new THREE.Mesh(sharedCyl(0.5, 0.5, 0.12, 10), lam('#a8985a'));
  bed.position.y = 0.08;
  const looks = [
    ['#e8a86a', '#f5dcb8', 'n_fox', { eyeW: 3, eyeH: 1, gap: 5, eyeY: 3, mouth: 'w' }],
    ['#b8a8cc', '#e8e0f0', 'n_puff', { eyeW: 3, eyeH: 1, gap: 4, eyeY: 3, mouth: 'smile' }],
    ['#a8c8a0', '#e0f0d8', 'n_leaf', { eyeW: 3, eyeH: 1, gap: 5, eyeY: 3, mouth: 'none' }],
  ];
  const sleeper = buildCritter(...looks[Math.floor(Math.random() * looks.length)]);
  const pivot = new THREE.Group(); // rotates to lie down / sit up
  pivot.add(sleeper);
  sleeper.position.z = 0.18;
  pivot.rotation.x = -Math.PI * 0.42; // lying on its back
  pivot.position.y = 0.16;
  g.add(nest, bed, pivot);
  const zs = [];
  for (let i = 0; i < 3; i++) {
    const z = makeGlyphSprite('z');
    z.position.set(0.2, 0.7, 0);
    g.add(z);
    zs.push(z);
  }
  g.userData.nap = { pivot, zs, seed: Math.random() * 20 };
  return g;
}

// kickabout — three critters passing a ball around a worn grass patch,
// hopping with excitement whenever they kick it
function buildKickabout() {
  const g = new THREE.Group();
  const patch = new THREE.Mesh(sharedCyl(2.1, 2.2, 0.06, 12), lam('#9aa860'));
  patch.position.y = 0.03;
  patch.receiveShadow = true;
  g.add(patch);
  const LOOKS = [
    ['#e8b878', '#f8e8c8', 'k_pup', { eyeW: 3, eyeH: 5, gap: 5, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,140,120,0.7)' }],
    ['#a8c8e8', '#e0eef8', 'k_bun', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'smile' }],
    ['#d8a8a0', '#f5e0dc', 'k_pig', { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,140,0.8)' }],
  ];
  const players = [];
  LOOKS.forEach((look, i) => {
    const p = buildCritter(...look);
    const a = (i / LOOKS.length) * Math.PI * 2;
    p.position.set(Math.cos(a) * 1.35, 0.05, Math.sin(a) * 1.35);
    g.add(p);
    players.push({ g: p, a });
  });
  // a REAL soccer ball: smooth white sphere with the classic black-pentagon
  // panel pattern painted onto its texture (not floating patches)
  const bc = document.createElement('canvas');
  bc.width = 64; bc.height = 32;
  {
    const ctx = bc.getContext('2d');
    ctx.fillStyle = '#f4f4ec';
    ctx.fillRect(0, 0, 64, 32);
    const pent = (cx, cy, r, rot = 0) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#22262a';
    // evenly spread pentagons (equirect layout, wraps seamlessly-ish)
    pent(8, 10, 5); pent(30, 8, 5, 0.5); pent(52, 11, 5, 1);
    pent(19, 22, 5, 0.8); pent(41, 23, 5, 0.2); pent(62, 24, 5, 0.6); pent(-2, 24, 5, 0.6);
    // faint grey seams between panels
    ctx.strokeStyle = 'rgba(120,126,132,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 10); ctx.lineTo(19, 22); ctx.lineTo(30, 8); ctx.lineTo(41, 23);
    ctx.lineTo(52, 11); ctx.lineTo(62, 24);
    ctx.stroke();
  }
  const ballTex = new THREE.CanvasTexture(bc);
  ballTex.magFilter = THREE.NearestFilter;
  ballTex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10),
    new THREE.MeshLambertMaterial({ map: ballTex }));
  ball.castShadow = true;
  ball.position.y = 0.17;
  g.add(ball);
  g.userData.kick = { players, ball, from: 0, to: 1, t: 0, dur: 1.1 };
  return g;
}

// two friends deep in conversation — bobbing at each other with little
// speech bubbles taking turns
function buildChatterPair(lookA, lookB) {
  const g = new THREE.Group();
  const a = buildCritter(...lookA);
  const b = buildCritter(...lookB);
  a.position.set(-0.45, 0.02, 0);
  b.position.set(0.45, 0.02, 0);
  a.rotation.y = Math.PI / 2;
  b.rotation.y = -Math.PI / 2;
  const bubbleA = makeGlyphSprite('…', '#ffe9a8');
  bubbleA.position.set(-0.45, 1.0, 0);
  const bubbleB = makeGlyphSprite('♪', '#a8e0ff');
  bubbleB.position.set(0.45, 1.0, 0);
  g.add(a, b, bubbleA, bubbleB);
  g.userData.chat = { a, b, bubbleA, bubbleB, seed: Math.random() * 10 };
  return g;
}

// ---------------------------------------------------------------------------
// MORE BUILDINGS. The map had plenty of open ground with nothing on it, and a
// world reads as inhabited when there are places people obviously use. Five
// new structures, each with a silhouette you can name from a distance:
// a red-roofed WINDMILL FARM barn, a stone BRIDGE over a stream, a tiered
// PAGODA, a MINE ENTRANCE cut into a hillside, and a covered MARKET ROW.
// ---------------------------------------------------------------------------

/** A big red barn with a hayloft, a silo and a fenced paddock. */
function buildBarn() {
  const g = new THREE.Group();
  const RED = '#b0463c', DARK = '#8a352e', WOOD = '#e8dcc0', ROOF = '#5e4038';
  // body
  const body = new THREE.Mesh(sharedBox(4.4, 2.4, 3.2), lam(RED));
  body.position.y = 1.2; body.castShadow = true; g.add(body);
  // white trim boards
  for (const sx of [-2.16, 2.16]) {
    const t = new THREE.Mesh(sharedBox(0.12, 2.4, 3.3), lam(WOOD));
    t.position.set(sx, 1.2, 0); g.add(t);
  }
  const beltA = new THREE.Mesh(sharedBox(4.5, 0.12, 3.3), lam(WOOD));
  beltA.position.y = 2.36; g.add(beltA);
  // gambrel roof: two slopes a side, which is what makes a barn a barn
  for (const sz of [-1, 1]) {
    const lower = new THREE.Mesh(sharedBox(4.7, 0.16, 1.5), lam(ROOF));
    lower.position.set(0, 2.75, sz * 1.15);
    lower.rotation.x = sz * 0.62;
    lower.castShadow = true; g.add(lower);
    const upper = new THREE.Mesh(sharedBox(4.7, 0.16, 1.15), lam(ROOF));
    upper.position.set(0, 3.42, sz * 0.42);
    upper.rotation.x = sz * 0.28;
    upper.castShadow = true; g.add(upper);
  }
  // hayloft door + big sliding doors
  const loft = new THREE.Mesh(sharedBox(0.9, 0.8, 0.1), lam(DARK));
  loft.position.set(0, 2.5, 1.63); g.add(loft);
  const doorL = new THREE.Mesh(sharedBox(0.85, 1.6, 0.1), lam(DARK));
  doorL.position.set(-0.45, 0.8, 1.63); g.add(doorL);
  const doorR = new THREE.Mesh(sharedBox(0.85, 1.6, 0.1), lam(DARK));
  doorR.position.set(0.45, 0.8, 1.63); g.add(doorR);
  const cross = new THREE.Mesh(sharedBox(1.8, 0.1, 0.12), lam(WOOD));
  cross.position.set(0, 1.1, 1.7); g.add(cross);
  // silo alongside
  const silo = new THREE.Mesh(sharedCyl(0.85, 0.9, 3.4, 10), lam('#c8c2b0'));
  silo.position.set(-3.0, 1.7, 0.3); silo.castShadow = true; g.add(silo);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    lam('#8a9099'));
  dome.position.set(-3.0, 3.4, 0.3); g.add(dome);
  // hay bales
  for (let i = 0; i < 3; i++) {
    const bale = new THREE.Mesh(sharedCyl(0.32, 0.32, 0.5, 8), lam('#e0c060'));
    bale.rotation.z = Math.PI / 2;
    bale.position.set(2.6 + (i % 2) * 0.6, 0.32 + Math.floor(i / 2) * 0.6, -1.2 + i * 0.5);
    g.add(bale);
  }
  // paddock fence
  for (let i = 0; i < 7; i++) {
    const post = new THREE.Mesh(sharedBox(0.1, 0.7, 0.1), lam('#8a6a44'));
    post.position.set(-2.4 + i * 0.9, 0.35, -2.6); g.add(post);
    if (i < 6) {
      const rail = new THREE.Mesh(sharedBox(0.9, 0.07, 0.06), lam('#96754d'));
      rail.position.set(-1.95 + i * 0.9, 0.5, -2.6); g.add(rail);
    }
  }
  return g;
}

/** An arched stone bridge with lamp posts — reads as a road, not an ornament. */
function buildBridge() {
  const g = new THREE.Group();
  const STONE = '#9a9488', DARK = '#6e6a60';
  // the arch: a run of blocks stepped up and over
  const N = 11;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const rise = Math.sin(t * Math.PI) * 0.55;
    const slab = new THREE.Mesh(sharedBox(0.62, 0.28, 2.6), lam(i % 2 ? STONE : DARK));
    slab.position.set(-3.1 + i * 0.62, 0.5 + rise, 0);
    slab.castShadow = true;
    g.add(slab);
    // parapet either side
    for (const sz of [-1.2, 1.2]) {
      const wall = new THREE.Mesh(sharedBox(0.62, 0.42, 0.2), lam(STONE));
      wall.position.set(-3.1 + i * 0.62, 0.85 + rise, sz);
      g.add(wall);
    }
  }
  // the arch underneath, so it reads as a bridge from the bank
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    const vou = new THREE.Mesh(sharedBox(0.36, 0.3, 2.2), lam(DARK));
    vou.position.set(Math.cos(a) * 1.5, 0.42 + Math.sin(a) * 0.32, 0);
    vou.rotation.z = -a + Math.PI / 2;
    g.add(vou);
  }
  // abutments
  for (const sx of [-3.3, 3.3]) {
    const ab = new THREE.Mesh(sharedBox(0.9, 1.1, 2.8), lam(DARK));
    ab.position.set(sx, 0.2, 0); g.add(ab);
  }
  // a lamp on each corner
  const lamps = [];
  for (const [sx, sz] of [[-2.9, -1.2], [-2.9, 1.2], [2.9, -1.2], [2.9, 1.2]]) {
    const post = new THREE.Mesh(sharedBox(0.12, 1.1, 0.12), lam('#5a5750'));
    post.position.set(sx, 1.4, sz); g.add(post);
    const lamp = new THREE.Mesh(sharedBox(0.24, 0.26, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xffd89a }));
    lamp.position.set(sx, 2.05, sz); g.add(lamp);
    lamps.push(lamp);
  }
  g.userData.lamps = lamps;
  return g;
}

/** A three-tier pagoda: the tallest thing on the map after the watchtower. */
function buildPagoda() {
  const g = new THREE.Group();
  const WOOD = '#b0463c', ROOF = '#3f5f6a', TRIM = '#e8dcc0';
  const base = new THREE.Mesh(sharedBox(3.2, 0.4, 3.2), lam('#8a8478'));
  base.position.y = 0.2; g.add(base);
  const tiers = [
    { y: 0.4, w: 2.4, h: 1.5, rw: 3.4 },
    { y: 2.2, w: 1.9, h: 1.3, rw: 2.8 },
    { y: 3.8, w: 1.4, h: 1.1, rw: 2.2 },
  ];
  const bells = [];
  for (const t of tiers) {
    const body = new THREE.Mesh(sharedBox(t.w, t.h, t.w), lam(WOOD));
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    g.add(body);
    // white lattice railing
    const rail = new THREE.Mesh(sharedBox(t.w + 0.25, 0.1, t.w + 0.25), lam(TRIM));
    rail.position.y = t.y + 0.12; g.add(rail);
    // the wide overhanging roof — four sloped slabs, corners lifted
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2;
      const slab = new THREE.Mesh(sharedBox(t.rw, 0.14, t.rw * 0.42), lam(ROOF));
      slab.position.set(
        Math.sin(a) * t.rw * 0.22, t.y + t.h + 0.2, Math.cos(a) * t.rw * 0.22);
      slab.rotation.y = a;
      slab.rotation.x = -0.34;
      slab.castShadow = true;
      g.add(slab);
      // a little bell hanging at each corner
      const bell = new THREE.Mesh(sharedCyl(0.04, 0.08, 0.12, 6), lam('#d8b866'));
      bell.position.set(Math.sin(a + 0.78) * t.rw * 0.5, t.y + t.h + 0.05, Math.cos(a + 0.78) * t.rw * 0.5);
      g.add(bell);
      bells.push(bell);
    }
  }
  // finial spire
  const spire = new THREE.Mesh(sharedCyl(0.03, 0.1, 1.1, 6), lam('#d8b866'));
  spire.position.y = 5.4; g.add(spire);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13 - i * 0.03, 0.02, 5, 10), lam('#d8b866'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 5.2 + i * 0.22;
    g.add(ring);
  }
  g.userData.bells = bells;
  return g;
}

/** A timbered mine entrance with a cart on rails and a lantern over the mouth. */
function buildMine() {
  const g = new THREE.Group();
  const ROCK = '#6e6a60', WOOD = '#7d5f3c';
  // the hillside face
  const face = new THREE.Mesh(sharedBox(4.2, 2.6, 1.2), lam(ROCK));
  face.position.set(0, 1.3, -0.6); face.castShadow = true; g.add(face);
  for (let i = 0; i < 5; i++) {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0), lam('#7d7a70'));
    boulder.position.set(-1.8 + i * 0.9, 2.4 + Math.random() * 0.4, -0.9);
    boulder.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(boulder);
  }
  // the mouth: a dark opening framed in heavy timber
  const mouth = new THREE.Mesh(sharedBox(1.5, 1.7, 0.3), lam('#14100c'));
  mouth.position.set(0, 0.85, 0.05); g.add(mouth);
  for (const sx of [-0.85, 0.85]) {
    const post = new THREE.Mesh(sharedBox(0.22, 1.9, 0.34), lam(WOOD));
    post.position.set(sx, 0.95, 0.12); g.add(post);
  }
  const lintel = new THREE.Mesh(sharedBox(2.1, 0.26, 0.4), lam(WOOD));
  lintel.position.set(0, 1.98, 0.12); g.add(lintel);
  const brace = new THREE.Mesh(sharedBox(2.3, 0.16, 0.24), lam('#5f4728'));
  brace.position.set(0, 2.2, 0.1); g.add(brace);
  // a lantern hung over the mouth
  const lamp = new THREE.Mesh(sharedBox(0.24, 0.3, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xffcf80 }));
  lamp.position.set(0, 1.78, 0.34); g.add(lamp);
  g.userData.lamps = [lamp];
  // rails running out of the mouth, with a cart on them
  for (const sx of [-0.3, 0.3]) {
    const rail = new THREE.Mesh(sharedBox(0.07, 0.05, 4.4), lam('#5a5750'));
    rail.position.set(sx, 0.06, 2.2); g.add(rail);
  }
  for (let i = 0; i < 8; i++) {
    const tie = new THREE.Mesh(sharedBox(0.9, 0.06, 0.14), lam('#6b4a2c'));
    tie.position.set(0, 0.03, 0.4 + i * 0.55); g.add(tie);
  }
  const cart = new THREE.Group();
  const tub = new THREE.Mesh(sharedBox(0.8, 0.5, 0.7), lam('#7a6a58'));
  tub.position.y = 0.36; cart.add(tub);
  for (const [cx, cz] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]]) {
    const wheel = new THREE.Mesh(sharedCyl(0.14, 0.14, 0.07, 8), lam('#3a3730'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(cx, 0.14, cz); cart.add(wheel);
  }
  // a heap of ore in the tub
  for (let i = 0; i < 4; i++) {
    const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), lam(i % 2 ? '#c88a3a' : '#8a8478'));
    ore.position.set(-0.2 + i * 0.14, 0.64, (i % 2) * 0.16 - 0.08);
    cart.add(ore);
  }
  cart.position.set(0, 0, 2.4);
  g.add(cart);
  return g;
}

/** A covered market row: three striped stalls under one long awning. */
function buildMarketRow() {
  const g = new THREE.Group();
  const WOOD = '#a8804c', DARK = '#84633a';
  // the long roof over the whole row
  for (let i = 0; i < 9; i++) {
    const strip = new THREE.Mesh(sharedBox(0.62, 0.08, 2.2), lam(i % 2 ? '#f4efe0' : '#c8544a'));
    strip.position.set(-2.5 + i * 0.62, 2.15, 0);
    strip.rotation.x = 0.1;
    strip.castShadow = true;
    g.add(strip);
  }
  for (const sx of [-2.6, 0, 2.6]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(sharedBox(0.12, 2.1, 0.12), lam(DARK));
      post.position.set(sx, 1.05, sz); g.add(post);
    }
  }
  // three counters with different wares
  const wares = [
    { c: '#e8574a', n: 5 },   // fruit
    { c: '#5aa845', n: 6 },   // greens
    { c: '#e8b45d', n: 4 },   // bread
  ];
  for (let s = 0; s < 3; s++) {
    const cx = -2.2 + s * 2.2;
    const counter = new THREE.Mesh(sharedBox(1.7, 0.12, 1.0), lam(WOOD));
    counter.position.set(cx, 0.85, 0); g.add(counter);
    const front = new THREE.Mesh(sharedBox(1.7, 0.8, 0.1), lam(DARK));
    front.position.set(cx, 0.42, 0.5); g.add(front);
    // crates under the counter
    const crate = new THREE.Mesh(sharedBox(0.5, 0.4, 0.5), lam('#96754d'));
    crate.position.set(cx + 0.5, 0.2, -0.3); g.add(crate);
    // the wares themselves, piled on top
    for (let i = 0; i < wares[s].n; i++) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), lam(wares[s].c));
      w.position.set(cx - 0.5 + (i % 3) * 0.35, 0.99 + Math.floor(i / 3) * 0.18, -0.1 + (i % 2) * 0.2);
      g.add(w);
    }
    // a hanging sign
    const sign = new THREE.Mesh(sharedBox(0.7, 0.34, 0.06), lam('#e8dcc0'));
    sign.position.set(cx, 1.65, -0.5); g.add(sign);
  }
  return g;
}

// ---------------------------------------------------------------------------
// FLOWER GARDENS. Three real species, each with its own build so they read as
// different plants and not three colours of the same blob:
//
//   LILY       — six pointed petals swept back off a trumpet throat, on a tall
//                slender stem with long drooping leaves. Pink and white.
//   PINK ROSE  — a tight spiral of short cupped petals in three rings, a
//                darker heart, thorny stem, toothed leaves.
//   SUNFLOWER  — a big brown disc ringed by long yellow rays on a thick stem
//                with broad heart-shaped leaves. Tall enough to tower over the
//                rest, and it TRACKS THE SUN.
//
// They are planted in laid-out beds with a low border, an arch, and a bench,
// so a garden reads as somewhere tended rather than a random scatter.
// ---------------------------------------------------------------------------


// A PETAL that is actually petal-shaped: wide at the middle, tapering to a
// point, and slightly cupped. Built once per size and shared. Boxes made the
// first pass look like plastic plates on sticks.
const _petalCache = new Map();
function petalGeo(len, wide) {
  const k = `${len}|${wide}`;
  let g = _petalCache.get(k);
  if (!g) {
    // a lathe profile swept a half turn gives a rounded, tapering blade
    const pts = [];
    const N = 6;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // width swells to ~60% of the way along, then narrows to a tip
      const w = Math.sin(t * Math.PI * 0.92) * wide * (1 - t * 0.25);
      pts.push(new THREE.Vector2(Math.max(0.004, w), t * len));
    }
    g = new THREE.LatheGeometry(pts, 5, 0, Math.PI);
    g.scale(1, 1, 0.42);          // flatten it into a blade
    _petalCache.set(k, g);
  }
  return g;
}

/** A rounded bloom centre — a squashed sphere, shared by size. */
const _domeCache = new Map();
function domeGeo(r) {
  let g = _domeCache.get(r);
  if (!g) { g = new THREE.SphereGeometry(r, 7, 5); _domeCache.set(r, g); }
  return g;
}

/** A leaf with a point: a cone squashed flat reads far better than a slab. */
const _leafCache = new Map();
function leafGeo(len, wide) {
  const k = `${len}|${wide}`;
  let g = _leafCache.get(k);
  if (!g) {
    g = new THREE.ConeGeometry(wide, len, 5);
    g.scale(1, 1, 0.3);
    g.rotateZ(-Math.PI / 2);
    _leafCache.set(k, g);
  }
  return g;
}

const LILY_COLS = [['#f7a8c8', '#fde3ee'], ['#ffffff', '#ffe9f2'], ['#f58fb4', '#fbcfe0']];
const ROSE_COLS = [['#e8618f', '#c23f6d'], ['#f086ab', '#d1567f'], ['#ffb3cc', '#e07ba0']];

function buildLily(rng, cols) {
  const g = new THREE.Group();
  const [petal, throat] = cols;
  const H = 0.85 + rng() * 0.35;
  const stem = new THREE.Mesh(sharedCyl(0.022, 0.03, H, 5), lam('#4e8a3e'));
  stem.position.y = H / 2; g.add(stem);
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeo(0.42, 0.06), lam('#4e8a3e'));
    leaf.position.set(Math.cos(a) * 0.16, H * (0.28 + i * 0.26), Math.sin(a) * 0.16);
    leaf.rotation.y = -a;
    leaf.rotation.z = -0.45;
    g.add(leaf);
  }
  const head = new THREE.Group();
  head.position.y = H;
  g.add(head);
  // six tapering petals swept back off the throat — that recurve IS the lily
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo(0.26, 0.055), lam(petal));
    p.position.set(Math.cos(a) * 0.045, 0.02, Math.sin(a) * 0.045);
    p.rotation.y = -a + Math.PI / 2;
    p.rotation.z = -1.15;                      // laid out and curving back
    p.rotation.x = 0.25;
    head.add(p);
  }
  // the trumpet throat, with a paler lip
  const cup = new THREE.Mesh(sharedCyl(0.062, 0.018, 0.1, 7), lam(throat));
  cup.position.y = 0.05; head.add(cup);
  const lip = new THREE.Mesh(sharedCyl(0.075, 0.06, 0.02, 7), lam(petal));
  lip.position.y = 0.1; head.add(lip);
  // anthers on filaments, the detail that sells a lily up close
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fil = new THREE.Mesh(sharedCyl(0.006, 0.006, 0.1, 4), lam('#f0e6c0'));
    fil.position.set(Math.cos(a) * 0.022, 0.12, Math.sin(a) * 0.022);
    fil.rotation.z = Math.cos(a) * 0.3;
    head.add(fil);
    const anther = new THREE.Mesh(domeGeo(0.016), lam('#d88a3a'));
    anther.position.set(Math.cos(a) * 0.04, 0.17, Math.sin(a) * 0.04);
    anther.scale.set(1, 0.6, 1.7);
    head.add(anther);
  }
  g.userData.head = head;
  return g;
}

function buildRose(rng, cols) {
  const g = new THREE.Group();
  const [petal, heart] = cols;
  const H = 0.5 + rng() * 0.25;
  const stem = new THREE.Mesh(sharedCyl(0.02, 0.026, H, 5), lam('#3f7a34'));
  stem.position.y = H / 2; g.add(stem);
  for (let i = 0; i < 2; i++) {
    const th = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 4), lam('#2f6027'));
    const a = rng() * Math.PI * 2;
    th.position.set(Math.cos(a) * 0.026, H * (0.3 + i * 0.26), Math.sin(a) * 0.026);
    th.rotation.z = Math.PI / 2 - 0.5;
    th.rotation.y = -a;
    g.add(th);
  }
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeo(0.2, 0.07), lam('#3f7a34'));
    leaf.position.set(Math.cos(a) * 0.12, H * (0.38 + i * 0.26), Math.sin(a) * 0.12);
    leaf.rotation.y = -a; leaf.rotation.z = -0.25;
    g.add(leaf);
  }
  const head = new THREE.Group();
  head.position.y = H + 0.03;
  g.add(head);
  // A rose is a SPIRAL of cupped petals tightening to a closed heart. Three
  // rings, each smaller, more upright and rotated off the last.
  const rings = [
    { n: 7, rad: 0.085, y: 0.0,  tilt: -1.05, len: 0.14, w: 0.052 },
    { n: 5, rad: 0.052, y: 0.03, tilt: -0.72, len: 0.11, w: 0.045 },
    { n: 4, rad: 0.026, y: 0.06, tilt: -0.35, len: 0.085, w: 0.038 },
  ];
  for (let r = 0; r < rings.length; r++) {
    const R = rings[r];
    for (let i = 0; i < R.n; i++) {
      const a = (i / R.n) * Math.PI * 2 + r * 0.75;
      const p = new THREE.Mesh(petalGeo(R.len, R.w), lam(r === 2 ? heart : petal));
      p.position.set(Math.cos(a) * R.rad, R.y, Math.sin(a) * R.rad);
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.z = R.tilt;
      head.add(p);
    }
  }
  // the closed bud at the very centre
  const core = new THREE.Mesh(domeGeo(0.03), lam(heart));
  core.position.y = 0.095; core.scale.y = 1.5; head.add(core);
  // green sepals cupping the bloom from below
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(petalGeo(0.075, 0.026), lam('#3f7a34'));
    sp.position.set(Math.cos(a) * 0.05, -0.02, Math.sin(a) * 0.05);
    sp.rotation.y = -a + Math.PI / 2;
    sp.rotation.z = -2.1;
    head.add(sp);
  }
  g.userData.head = head;
  return g;
}

function buildSunflower(rng) {
  const g = new THREE.Group();
  const H = 1.5 + rng() * 0.6;
  const stem = new THREE.Mesh(sharedCyl(0.045, 0.06, H, 6), lam('#4a7d33'));
  stem.position.y = H / 2; g.add(stem);
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2 + i * 2.1;
    const leaf = new THREE.Mesh(leafGeo(0.5, 0.17), lam('#4a7d33'));
    leaf.position.set(Math.cos(a) * 0.28, H * (0.3 + i * 0.2), Math.sin(a) * 0.28);
    leaf.rotation.y = -a;
    leaf.rotation.z = -0.4;
    g.add(leaf);
  }
  const head = new THREE.Group();
  head.position.y = H;
  g.add(head);
  // the seed head is DOMED, not a flat coin — that curve catches the light
  const disc = new THREE.Mesh(domeGeo(0.2), lam('#5a3a1e'));
  disc.scale.set(1, 1, 0.42);
  head.add(disc);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 5, 14), lam('#7a5228'));
  head.add(rimRing);
  // two staggered rings of tapering rays, the back one darker
  for (let r = 0; r < 2; r++) {
    const n = r ? 8 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.32;
      const ray = new THREE.Mesh(petalGeo(0.2, 0.036), lam(r ? '#e8a51f' : '#ffd34e'));
      ray.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, r ? -0.02 : 0.015);
      ray.rotation.z = a - Math.PI / 2;
      ray.rotation.x = r ? 0.25 : -0.1;
      head.add(ray);
    }
  }
  g.userData.head = head;
  g.userData.sunflower = true;
  return g;
}

/**
 * A tended flower bed: a low stone border, mixed planting, a rose arch and a
 * bench. `kind` biases the mix so no two gardens look alike.
 */
function buildGarden(rng, kind, detail = 1) {
  const g = new THREE.Group();
  const R = 2.9;
  const heads = [];

  // packed-earth bed with a low stone border
  const bed = new THREE.Mesh(sharedCyl(R, R, 0.09, 14), lam('#7a5c3c'));
  bed.position.y = 0.045; g.add(bed);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const st = new THREE.Mesh(sharedBox(0.34, 0.17, 0.24), lam(i % 2 ? '#9a9488' : '#84887e'));
    st.position.set(Math.cos(a) * R, 0.09, Math.sin(a) * R);
    st.rotation.y = -a;
    g.add(st);
  }
  // a mown grass path in, so it reads as a place people visit
  const path = new THREE.Mesh(sharedBox(1.0, 0.03, R * 1.5), lam('#c8b494'));
  path.position.set(0, 0.1, R * 0.55); g.add(path);

  // planting mix by kind
  const mix = kind === 'rose' ? [0.15, 0.7, 0.15]
    : kind === 'sun' ? [0.2, 0.15, 0.65]
      : [0.6, 0.25, 0.15];                       // lily garden
  // WORLD DETAIL scales the planting: a garden should still read at LOW, it
  // just has fewer blooms in the bed
  const N = Math.max(7, Math.round(22 * detail));
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * (R - 0.45);
    if (Math.abs(Math.cos(a) * rr) < 0.5 && Math.sin(a) * rr > 0) continue;  // keep the path clear
    const roll = rng();
    let f;
    if (roll < mix[0]) f = buildLily(rng, LILY_COLS[Math.floor(rng() * LILY_COLS.length)]);
    else if (roll < mix[0] + mix[1]) f = buildRose(rng, ROSE_COLS[Math.floor(rng() * ROSE_COLS.length)]);
    else f = buildSunflower(rng);
    f.position.set(Math.cos(a) * rr, 0.09, Math.sin(a) * rr);
    f.rotation.y = rng() * Math.PI * 2;
    const s = 0.85 + rng() * 0.35;
    f.scale.setScalar(s);
    g.add(f);
    heads.push({ o: f, phase: rng() * 10, sun: !!f.userData.sunflower });
  }

  // a rose arch over the path entrance
  const arch = new THREE.Group();
  for (const sx of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(sharedBox(0.07, 1.7, 0.07), lam('#e8dcc0'));
    leg.position.set(sx, 0.85, 0); arch.add(leg);
  }
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const seg = new THREE.Mesh(sharedBox(0.34, 0.06, 0.07), lam('#e8dcc0'));
    seg.position.set(-0.6 + t * 1.2, 1.7 + Math.sin(t * Math.PI) * 0.22, 0);
    seg.rotation.z = Math.cos(t * Math.PI) * 0.5;
    arch.add(seg);
  }
  // roses climbing it
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bl = new THREE.Mesh(sharedBox(0.1, 0.1, 0.1), lam(i % 2 ? '#e8618f' : '#f086ab'));
    bl.position.set(-0.6 + t * 1.2, 1.72 + Math.sin(t * Math.PI) * 0.24, (i % 2 ? 0.06 : -0.06));
    arch.add(bl);
    const lf = new THREE.Mesh(sharedBox(0.1, 0.02, 0.08), lam('#3f7a34'));
    lf.position.set(-0.6 + t * 1.2, 1.62 + Math.sin(t * Math.PI) * 0.24, 0);
    arch.add(lf);
  }
  arch.position.z = R * 0.92;
  g.add(arch);

  // a bench facing the bed
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(sharedBox(1.2, 0.08, 0.36), lam('#a8804c'));
  seat.position.y = 0.42; bench.add(seat);
  const back = new THREE.Mesh(sharedBox(1.2, 0.36, 0.07), lam('#a8804c'));
  back.position.set(0, 0.62, -0.16); bench.add(back);
  for (const sx of [-0.5, 0.5]) {
    const lg = new THREE.Mesh(sharedBox(0.08, 0.42, 0.3), lam('#84633a'));
    lg.position.set(sx, 0.21, 0); bench.add(lg);
  }
  bench.position.set(-R * 0.72, 0.09, -R * 0.55);
  bench.rotation.y = 2.4;
  g.add(bench);

  // butterflies over the bed — a garden should have something moving in it
  const flutter = [];
  for (let i = 0; i < Math.max(2, Math.round(5 * detail)); i++) {
    const b = new THREE.Mesh(sharedBox(0.11, 0.02, 0.16),
      lam(['#f0b8d8', '#f5e88a', '#a8c8f0'][i % 3]));
    b.position.set(0, 1, 0);
    g.add(b);
    flutter.push({ o: b, a: rng() * 6.28, r: 0.8 + rng() * 1.6, y: 0.6 + rng() * 0.7, sp: 0.5 + rng() * 0.6 });
  }

  g.userData.garden = { heads, flutter };
  return g;
}

export function createLandmarks(scene, terrain, decorBlocked, avoid = []) {
  const S2 = terrain.size / 2;
  const built = [];

  // FOOTPRINT-AWARE placement: every structure registers a circle, and no
  // new structure may overlap any existing one (or the village core, or the
  // avoid list — rest camps etc). This is what stops buildings merging into
  // each other: a single center-cell check is nowhere near enough when
  // footprints span 4-6 units.
  const foots = avoid.map((a) => ({ x: a.x, z: a.z, r: a.r ?? 4 }));
  foots.push({ x: terrain.spawn.x, z: terrain.spawn.z, r: 10 }); // village core

  function clearOfFoots(x, z, footR) {
    for (const f of foots) {
      if (Math.hypot(f.x - x, f.z - z) < f.r + footR) return false;
    }
    return true;
  }
  function cellsClear(x, z, footR) {
    // the whole footprint must be dry land in-bounds; blocked cells only
    // matter in the 3x3 core (outer blocked cells are usually just trees,
    // which decor.clearArea scrubs from around every landmark afterwards —
    // real structures are covered by the footprint circles above)
    const cr = Math.ceil(footR);
    const [cx, cz] = terrain.cellOf(x, z);
    for (let dz = -cr; dz <= cr; dz++) {
      for (let dx = -cr; dx <= cr; dx++) {
        if (dx * dx + dz * dz > footR * footR) continue;
        const ix = cx + dx, iz = cz + dz;
        if (!terrain.inBounds(ix, iz)) return false;
        if (terrain.heightCell(ix, iz) <= WATER_LEVEL) return false;
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && decorBlocked.has(`${ix},${iz}`)) return false;
      }
    }
    return true;
  }
  /**
   * Surface height range across a footprint. A structure is a rigid flat thing;
   * if the ground under it drops away, half of it ends up buried and the grass
   * cuts straight through the deck. This is what the pool was doing.
   */
  function groundRange(x, z, r) {
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      for (const rr of [r * 0.5, r]) {
        const y = terrain.surfaceY(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    }
    const c = terrain.surfaceY(x, z);
    return { lo: Math.min(lo, c), hi: Math.max(hi, c) };
  }

  /**
   * @param maxDrop how much the ground may fall across the footprint. Wide flat
   *                builds (pool, plaza, market) need a small number; a tower or
   *                a shrine can live on a slope quite happily.
   */
  function place(mesh, tx, tz, blockR = 1, jitter = 12, footR = blockR + 2.5, maxDrop = 99) {
    for (let tries = 0; tries < 140; tries++) {
      // widen the search ring if the neighbourhood is crowded
      const j = jitter + tries * 0.12;
      const x = tx + (Math.random() - 0.5) * j;
      const z = tz + (Math.random() - 0.5) * j;
      const [ix, iz] = terrain.cellOf(x, z);
      if (!terrain.inBounds(ix, iz)) continue;
      const h = terrain.heightCell(ix, iz);
      if (h <= WATER_LEVEL || h >= 9) continue;
      if (!clearOfFoots(x, z, footR)) continue;
      if (!cellsClear(x, z, footR)) continue;
      const g = groundRange(x, z, footR);
      // relax the flatness demand as the search widens — better a slightly
      // tilted site than no site at all
      if (g.hi - g.lo > maxDrop + tries * 0.012) continue;
      // sit on the HIGHEST ground under the footprint, never the centre: proud
      // of the slope on the low side beats buried on the high side
      const y = g.hi;
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(mesh);
      for (let dz = -blockR; dz <= blockR; dz++) {
        for (let dx = -blockR; dx <= blockR; dx++) decorBlocked.add(`${ix + dx},${iz + dz}`);
      }
      foots.push({ x, z, r: footR });
      return true;
    }
    return false;
  }

  const windmill = buildWindmill();
  if (place(windmill, S2 * 0.5, -S2 * 0.15, 1, 12, 3.5)) built.push(windmill);
  const shrine = buildShrine();
  if (place(shrine, -S2 * 0.45, S2 * 0.2, 1, 12, 3.5)) built.push(shrine);
  const tower = buildRuinTower();
  if (place(tower, S2 * 0.15, S2 * 0.5, 1, 12, 3)) built.push(tower);
  const school = buildSchool();
  if (place(school, -S2 * 0.2, -S2 * 0.42, 2, 12, 6, 0.7)) built.push(school);
  const heart = buildHeartTorches();
  if (place(heart, S2 * 0.38, S2 * 0.22, 2, 12, 4)) built.push(heart);
  // the Rialo monument stands right at the basecamp so nobody misses it —
  // just outside the village circle, plaque facing the well
  const rialo = buildRialoMonument();
  if (place(rialo, terrain.spawn.x + 12, terrain.spawn.z - 10, 2, 5, 3)) {
    rialo.rotation.y = Math.atan2(
      terrain.spawn.x - rialo.position.x, terrain.spawn.z - rialo.position.z);
    built.push(rialo);
  }
  // festival plaza (south) & watchtower (east) fill the quieter stretches
  const festival = buildFestival();
  if (place(festival, S2 * 0.05, S2 * 0.6, 2, 12, 4.5, 0.6)) built.push(festival);
  const watch = buildWatchtower();
  if (place(watch, S2 * 0.6, S2 * 0.06, 1, 12, 3)) built.push(watch);

  // --- five new structures so the open ground has landmarks worth walking to
  const barn = buildBarn();
  if (place(barn, -S2 * 0.62, -S2 * 0.18, 3, 14, 6, 0.7)) built.push(barn);
  const pagoda = buildPagoda();
  if (place(pagoda, S2 * 0.24, -S2 * 0.62, 2, 14, 5)) built.push(pagoda);
  const mine = buildMine();
  if (place(mine, -S2 * 0.15, -S2 * 0.7, 2, 14, 4.5, 1.0)) built.push(mine);
  const market = buildMarketRow();
  if (place(market, -S2 * 0.55, S2 * 0.55, 2, 14, 4.5, 0.55)) built.push(market);
  // the bridge wants a stream, so it goes near a lake shore rather than mid-field
  const bridge = buildBridge();
  if (place(bridge, S2 * 0.52, S2 * 0.44, 2, 16, 5, 0.8)) built.push(bridge);

  // --- three flower gardens, each with a different planting mix ---
  const grng = (() => { let g = 20261; return () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; }; })();
  const gardens = [];
  for (const [kind, gx, gz] of [['lily', -S2 * 0.42, -S2 * 0.55],
                                ['rose', S2 * 0.46, -S2 * 0.2],
                                ['sun', -S2 * 0.68, S2 * 0.2]]) {
    const gd = buildGarden(grng, kind, getQuality().decorScale);
    if (place(gd, gx, gz, 2, 14, 4.2, 0.55)) { built.push(gd); gardens.push(gd); }
  }

  // a lantern-lit fishing dock on the shore of EVERY lake, each with its own
  // fishmonger — walk up to sell the day's catch
  const docks = [];
  for (const L of terrain.lakes) {
    const wx0 = L.x - terrain.size / 2, wz0 = L.z - terrain.size / 2;
    const dir = Math.atan2(-wx0, -wz0); // out of the lake toward the map center
    for (let t = 2; t < L.r * 2.6; t += 0.5) {
      const x = wx0 + Math.sin(dir) * t;
      const z = wz0 + Math.cos(dir) * t;
      if (terrain.isWater(x, z)) continue;
      // first dry cell heading inland: nudge a little further onto the shore
      const dx2 = x + Math.sin(dir) * 1.2, dz2 = z + Math.cos(dir) * 1.2;
      const [ix, iz] = terrain.cellOf(dx2, dz2);
      if (!terrain.inBounds(ix, iz)) break;
      // never merge into another structure — keep walking inland instead
      if (!clearOfFoots(dx2, dz2, 3.5)) continue;
      const dock = buildFishingDock();
      dock.position.set(dx2, Math.max(terrain.surfaceY(dx2, dz2), WATER_Y + 0.1), dz2);
      dock.rotation.y = Math.atan2(wx0 - dx2, wz0 - dz2); // pier reaches the water
      scene.add(dock);
      decorBlocked.add(`${ix},${iz}`);
      foots.push({ x: dx2, z: dz2, r: 3.5 });
      built.push(dock);
      docks.push({ x: dx2, z: dz2, mesh: dock });
      break;
    }
  }

  // --- Pokopia-style life for the quiet stretches (all far from the village):
  // a swimming pool, a spring waterfall, a kickabout, gossip pairs & nap nests
  const pool = buildPool();
  // blockR 3 covers the whole 5.6x4.4 deck — monsters can't clip through it
  if (place(pool, -S2 * 0.28, S2 * 0.42, 3, 12, 5, 0.5)) built.push(pool);
  const falls = buildWaterfall();
  if (place(falls, S2 * 0.32, -S2 * 0.35, 2, 12, 4)) built.push(falls);
  const kick = buildKickabout();
  if (place(kick, -S2 * 0.38, -S2 * 0.15, 0, 12, 3.5, 0.5)) built.push(kick);
  const CHAT_LOOKS = [
    [['#e8c8a0', '#f8ecd8', 'c_cub', { eyeW: 3, eyeH: 5, gap: 4, eyeY: 1, mouth: 'open', cheeks: 'rgba(240,150,140,0.7)' }],
     ['#b8d888', '#e8f5cc', 'c_frog', { eyeW: 4, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile' }]],
    [['#a8c8e8', '#e0eef8', 'c_bun', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,170,0.6)' }],
     ['#d8a8a0', '#f5e0dc', 'c_pig', { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile' }]],
  ];
  const chats = [];
  const chatSpots = [[S2 * 0.25, S2 * 0.35], [-S2 * 0.12, -S2 * 0.62]];
  CHAT_LOOKS.forEach((pairLooks, i) => {
    const pair = buildChatterPair(pairLooks[0], pairLooks[1]);
    if (place(pair, chatSpots[i][0], chatSpots[i][1], 0, 8, 2)) { built.push(pair); chats.push(pair); }
  });
  const nests = [];
  for (const [nx, nz] of [[S2 * 0.2, -S2 * 0.2], [-S2 * 0.3, S2 * 0.58], [S2 * 0.55, S2 * 0.4], [-S2 * 0.05, S2 * 0.3]]) {
    const nest = buildNapNest();
    if (place(nest, nx, nz, 0, 8, 1.8)) { built.push(nest); nests.push(nest); }
  }

  // Per-frame animation is the real cost of a world this dense: every dancer,
  // napper, gossip, swimmer and lantern used to be posed every frame no matter
  // how far away it was. Nothing 90 units behind you needs its fronds updated,
  // so each animated cluster gets a cheap squared-distance gate. NEAR2 is
  // generous enough that nothing pops while you can actually see it.
  const NEAR2 = 88 * 88;
  let camAt = new THREE.Vector3();
  const near = (o) => {
    const p = o.position || o;
    return (p.x - camAt.x) ** 2 + (p.z - camAt.z) ** 2 < NEAR2;
  };

  function update(dt, time, viewer, dayFrac = 0.5) {
    if (viewer) camAt = viewer;
    // where the sun sits, so sunflowers can face it: dayFrac 0 = dawn, 1 = dusk
    const sunAz = (dayFrac - 0.5) * 2.2;
    const sunEl = -0.5 + Math.sin(Math.max(0, Math.min(1, dayFrac)) * Math.PI) * 0.4;
    // Rialo banner ripples in the wind; the paper lanterns sway
    if (rialo.userData.flag && near(rialo)) {
      const pos = rialo.userData.flag.geometry.attributes.position;
      const base = rialo.userData.flagBase;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        // the further from the pole, the bigger the ripple
        pos.array[i * 3 + 2] = Math.sin(bx * 4.2 - time * 5) * 0.1 * (bx / 2.08)
          + Math.sin(bx * 8 - time * 8.4) * 0.025 * (bx / 2.08);
      }
      pos.needsUpdate = true;
      rialo.userData.flag.geometry.computeVertexNormals();
      for (let i = 0; i < rialo.userData.lanterns.length; i++) {
        rialo.userData.lanterns[i].rotation.z = Math.sin(time * 1.7 + i * 2.1) * 0.16;
        rialo.userData.lanterns[i].rotation.x = Math.sin(time * 1.3 + i) * 0.1;
      }
    }
    if (windmill.userData.sails && near(windmill)) windmill.userData.sails.rotation.z += dt * 0.5;
    if (shrine.userData.gem && near(shrine)) {
      shrine.userData.gem.rotation.y += dt * 1.2;
      shrine.userData.gem.position.y = 0.75 + Math.sin(time * 1.5) * 0.06;
    }
    if (heart.userData.flames && near(heart)) {
      for (let i = 0; i < heart.userData.flames.length; i++) {
        const f = heart.userData.flames[i];
        f.scale.setScalar(1 + Math.sin(time * 8 + i * 1.3) * 0.22);
      }
    }
    if (school.userData.clockHand && near(school)) school.userData.clockHand.rotation.z = -time * 0.2;

    // the new buildings: bridge & mine lamps glow at night, pagoda bells sway
    for (const lm of [bridge, mine]) {
      if (!lm.userData.lamps || !near(lm)) continue;
      for (const l of lm.userData.lamps) {
        const f = 0.8 + Math.sin(time * 5 + l.position.x * 2) * 0.2;
        l.material.color.setRGB(1, 0.82 * f, 0.55 * f);
      }
    }
    if (pagoda.userData.bells && near(pagoda)) {
      for (let i = 0; i < pagoda.userData.bells.length; i++) {
        pagoda.userData.bells[i].rotation.z = Math.sin(time * 1.9 + i * 0.8) * 0.22;
      }
    }

    // gardens: everything sways, sunflowers turn to follow the sun, butterflies
    // loop over the bed
    for (const gd of gardens) {
      if (!near(gd)) continue;
      const G = gd.userData.garden;
      for (const h of G.heads) {
        const sway = Math.sin(time * 1.3 + h.phase) * 0.055;
        h.o.rotation.z = sway;
        h.o.rotation.x = Math.cos(time * 1.1 + h.phase) * 0.035;
        // a sunflower head follows the sun across the sky and droops at night
        if (h.sun && h.o.userData.head) {
          h.o.userData.head.rotation.y = -gd.rotation.y + sunAz;
          h.o.userData.head.rotation.x = sunEl;
        }
      }
      for (const f of G.flutter) {
        f.a += dt * f.sp;
        f.o.position.set(
          Math.cos(f.a) * f.r,
          f.y + Math.sin(time * 3 + f.a) * 0.16,
          Math.sin(f.a * 1.3) * f.r,
        );
        f.o.rotation.y = -f.a;
        f.o.rotation.z = Math.sin(time * 14 + f.a) * 0.6;   // wingbeat
      }
    }

    // paper lanterns sway on every landmark that hangs them
    for (const lm of [festival, watch, ...docks.map((d) => d.mesh)]) {
      const ls = lm.userData.lanterns;
      if (!ls || !near(lm)) continue;
      for (let i = 0; i < ls.length; i++) {
        ls[i].rotation.z = Math.sin(time * 1.6 + i * 2.3 + lm.position.x) * 0.15;
        ls[i].rotation.x = Math.sin(time * 1.2 + i) * 0.09;
      }
    }
    // festival: the bonfire crackles and the critters DANCE
    if (festival.userData.flames && near(festival)) {
      festival.userData.flames.forEach((f, i) => {
        f.scale.setScalar(1 + Math.sin(time * 9 + i * 1.4) * 0.25);
      });
      for (const d of festival.userData.dancers) {
        d.g.position.y = 0.08 + Math.abs(Math.sin(time * 5 + d.seed)) * 0.16;
        d.g.rotation.y = Math.atan2(-Math.cos(d.baseA), -Math.sin(d.baseA))
          + Math.sin(time * 2.4 + d.seed) * 0.7;
        const [aL, aR] = d.g.userData.arms;
        aL.rotation.z = 2.4 + Math.sin(time * 7 + d.seed) * 0.6;   // arms up, waving
        aR.rotation.z = -2.4 - Math.sin(time * 7 + d.seed + 1.2) * 0.6;
      }
    }
    // fishmongers rock gently on their heels
    for (const d of docks) {
      if (!near(d.mesh)) continue;
      const m = d.mesh.userData.monger;
      if (m) m.position.y = 0.05 + Math.abs(Math.sin(time * 2.2 + d.x)) * 0.03;
    }
    // swimmers do lazy laps around the pool, bobbing in the water
    if (pool.userData.swimmers && near(pool)) {
      for (const sw of pool.userData.swimmers) {
        const a = time * 0.45 + sw.seed;
        sw.h.position.set(Math.cos(a) * sw.r, 0.2 + Math.sin(time * 2.4 + sw.seed) * 0.035, Math.sin(a) * sw.r * 0.55);
        sw.h.rotation.y = -a + Math.PI / 2; // face the direction of travel
      }
    }
    // the waterfall rushes & its foam clouds churn
    if (falls.userData.fall && near(falls)) {
      const F = falls.userData.fall;
      // every layer scrolls at its own rate — that difference is what sells it
      for (const sh of F.sheets) sh.t.offset.y -= dt * sh.sp;
      // the bright core breathes so the rush is not a constant wall
      F.core.material.opacity = 0.62 + Math.sin(time * 5.5) * 0.14;
      F.mist.material.opacity = 0.12 + Math.sin(time * 1.3) * 0.05;
      F.foams.forEach((f, i) => {
        f.position.y += Math.sin(time * 3.2 + i * 1.4) * 0.004;
        f.scale.setScalar(0.9 + Math.sin(time * 4.5 + i * 0.9) * 0.22);
        f.material.opacity = 0.7 + Math.sin(time * 6 + i) * 0.2;
      });
      // rings expand out across the plunge pool and fade
      for (const r of F.rings) {
        r.t += dt * 0.75;
        if (r.t > 1) r.t -= 1;
        const k = r.t;
        r.m.scale.setScalar(0.35 + k * 3.4);
        r.m.material.opacity = 0.5 * (1 - k);
      }
    }
    // the kickabout: the ball hops between players, the receiver bounces
    if (kick.userData.kick && near(kick)) {
      const K = kick.userData.kick;
      K.t += dt;
      const A = K.players[K.from].g.position, B2 = K.players[K.to].g.position;
      const w = Math.min(1, K.t / K.dur);
      K.ball.position.set(
        A.x + (B2.x - A.x) * w,
        0.17 + Math.sin(w * Math.PI) * 0.75,
        A.z + (B2.z - A.z) * w,
      );
      K.ball.rotation.x += dt * 9;
      // receiver does an excited hop as the pass lands
      K.players[K.to].g.position.y = 0.05 + Math.max(0, Math.sin(w * Math.PI * 2)) * 0.1 * w;
      if (K.t >= K.dur) {
        K.from = K.to;
        let next = Math.floor(Math.random() * K.players.length);
        if (next === K.from) next = (next + 1) % K.players.length;
        K.to = next;
        K.t = 0;
        K.dur = 0.9 + Math.random() * 0.7;
      }
    }
    // gossip pairs: bubbles take turns, both friends bob along
    for (const c of chats) {
      if (!near(c)) continue;
      const C = c.userData.chat;
      const phase = (time * 0.4 + C.seed) % 2;
      C.bubbleA.visible = phase < 1;
      C.bubbleB.visible = phase >= 1;
      C.bubbleA.position.y = 1.0 + Math.sin(time * 3) * 0.04;
      C.bubbleB.position.y = 1.0 + Math.sin(time * 3 + 1) * 0.04;
      C.a.position.y = 0.02 + Math.abs(Math.sin(time * 2.6 + C.seed)) * 0.03;
      C.b.position.y = 0.02 + Math.abs(Math.sin(time * 2.6 + C.seed + 1.3)) * 0.03;
    }
    // nappers: mostly asleep with drifting Zzz — now and then they sit up,
    // look around, and flop back down
    for (const n of nests) {
      if (!near(n)) continue;
      const N = n.userData.nap;
      const c = (time * 0.085 + N.seed) % 1;
      const awake = c > 0.84;
      const target = awake ? -0.08 : -Math.PI * 0.42;
      N.pivot.rotation.x += (target - N.pivot.rotation.x) * Math.min(1, dt * 5);
      if (awake) N.pivot.rotation.y = Math.sin(time * 1.8) * 0.5; // looking around
      for (let i = 0; i < N.zs.length; i++) {
        const z = N.zs[i];
        z.visible = !awake;
        const f = (time * 0.4 + i * 0.33) % 1;
        z.position.set(0.2 + f * 0.14, 0.62 + f * 0.55, 0);
        z.material.opacity = Math.sin(f * Math.PI);
        z.scale.setScalar(0.24 + f * 0.16);
      }
    }
  }

  return { built, update, heart, docks, foots };
}
