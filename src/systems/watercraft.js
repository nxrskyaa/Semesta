// Watercraft: the way you actually cross the sea.
//
// Odyvion (the sibling project this borrows its sea from) uses sailing ships —
// slow, stately, wind-driven. Semesta is a chibi action RPG, so the sea here is
// a playground instead: a JETSKI that skips and throws spray, and a little
// DINGHY for a calmer ride. Both are moored at the marina pier and board with
// the interact button.
//
// Rules that make it feel right:
//   - water only. Nose into the shore and the rider steps off onto the sand.
//   - the craft LEANS into turns and PORPOISES over the swell; a boat that just
//     slides flat across a plane reads as a bug.
//   - a foam wake behind, a bow spray in front, and a widening V of ripples.
import * as THREE from 'three';
import { WATER_Y } from '../world/terrain.js';
import { waveAt } from '../world/water.js';
import { disposeObject } from '../util/dispose.js';
import {
  boxMesh, cylMesh, sphereMesh, sharedMat, sharedBox, sharedCyl,
} from '../gfx/meshcache.js';

// A hull needs water under it, not just a water-flagged cell. Anything shallower
// than this grounds the craft — that is what stops a boat driving up the beach.
const HULL_DRAFT = 0.42;
// How far the hull sits INTO the water it is floating on. Without it the keel
// rides exactly on the surface and the craft reads as a bath toy resting on top
// of the sea rather than displacing any of it.
const WATERLINE = 0.16;

const box = (w, h, d, c, opts) => boxMesh(w, h, d, c, opts);
const cyl = (rt, rb, h, c, seg = 8) => cylMesh(rt, rb, h, c, seg);

export const CRAFT_DEFS = {
  jetski: {
    name: 'Donut Boat',
    item: 'craft_jetski',
    speed: 12.5,        // roughly 3x a swim, and faster than any land mount
    accel: 15,          // thrust along the hull
    drag: 0.06,         // quadratic water resistance - this is what caps speed
    grip: 2.2,          // a RING has no keel at all, so it drifts wide on a turn
    turn: 2.6,
    lean: 0.34,         // it rolls rather than banks — there is no hull to lay over
    porpoise: 0.14,     // and it bobs a lot more, because it is basically a float
    spray: 1,
    // SEAT HEIGHT is measured to the hero's feet, and the hero's body sits
    // another 0.55 above that. Both craft were built to a realistic scale next
    // to a deliberately chibi character, so the rider towered out of them.
    seatH: 0.62,
    blurb: 'A pink-iced ring that skips across the swell. Sprinkles included.',
  },
  dinghy: {
    name: 'Bobbin Dinghy',
    item: 'craft_dinghy',
    speed: 7.6,
    accel: 7,
    drag: 0.09,
    grip: 6.5,          // a displacement hull barely slides at all
    turn: 1.5,
    lean: 0.2,
    porpoise: 0.05,
    spray: 0.45,
    seatH: 0.30,
    blurb: 'A cozy little rowboat with a lantern on the bow.',
  },
};

// ---------------------------------------------------------------------------
// HULLS. The first pass stacked boxes, which is why both craft read as bricks:
// a boat is defined by CURVES — a deep-V that narrows to a point, a sheer line
// that sweeps up at the bow, a deck that rolls off to the gunwale. None of that
// survives being approximated with slabs.
//
// These are built from an extruded profile instead: a cross-section swept along
// the length, with the width, height and rocker driven by a curve. One custom
// BufferGeometry per craft, so they are also CHEAPER than the twenty-odd boxes
// they replace.
// ---------------------------------------------------------------------------

/**
 * Build a hull as a swept cross-section.
 * @param len       overall length
 * @param widthAt   (t) -> half-width at t (0 = stern, 1 = bow)
 * @param deckAt    (t) -> deck height above the waterline
 * @param keelAt    (t) -> how far the V drops below the waterline
 * @param vSharp    0 = flat bottom (a dinghy), 1 = a deep knife (a jetski)
 */
/**
 * The material a swept hull must use.
 *
 * buildHullGeometry sweeps an OPEN section — gunwale down to the keel and back
 * up — so the result is a trough, not a closed solid, and its faces only wind
 * one way. With the default FrontSide culling that made both craft invisible
 * from outside: everything you could see was the rail, the floorboards and the
 * oars, which is exactly the "hollow skeleton" in the report. An open shell has
 * to be drawn from both sides, because you are meant to see the inside of a boat.
 */
function hullMat(color) {
  return new THREE.MeshLambertMaterial({
    color: new THREE.Color(color), side: THREE.DoubleSide,
  });
}

function buildHullGeometry(len, widthAt, deckAt, keelAt, vSharp, segs = 18) {
  const pos = [], idx = [];
  const RING = 7;                       // points around one cross-section
  // one cross-section: gunwale -> topside -> chine -> keel and back up
  const section = (t) => {
    const w = widthAt(t), d = deckAt(t), k = keelAt(t);
    const pts = [];
    pts.push([-w, d]);                  // port gunwale
    pts.push([-w * 1.02, d * 0.35]);    // port topside, flaring slightly
    pts.push([-w * 0.82, -k * 0.35]);   // port chine
    pts.push([0, -k]);                  // keel
    pts.push([w * 0.82, -k * 0.35]);    // starboard chine
    pts.push([w * 1.02, d * 0.35]);
    pts.push([w, d]);
    // vSharp pinches the chines inward, which is what makes a V a V
    if (vSharp > 0) {
      pts[2][0] *= 1 - vSharp * 0.35;
      pts[4][0] *= 1 - vSharp * 0.35;
    }
    return pts;
  };
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = -len / 2 + t * len;
    for (const [z, y] of section(t)) pos.push(x, y, z);
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < RING - 1; j++) {
      const a = i * RING + j, b = a + RING;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // cap the transom (stern) and close the bow to a point
  const first = 0, last = segs * RING;
  for (let j = 1; j < RING - 1; j++) {
    idx.push(first, first + j + 1, first + j);
    idx.push(last, last + j, last + j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A lamp that owns its own material.
 *
 *  `sphereMesh` hands back a SHARED material from the mesh cache, so the first
 *  version of the boat lights was mutating opacity on a material every other
 *  cream-coloured object in the world was also using — which is why the lamps
 *  never appeared to work and why anything else that colour flickered with
 *  them. Each lamp gets a private material, marked dynamic so the static baker
 *  leaves it alone.
 */
function lampBulb(radius, color) {
  // `unique: true` rather than cloning the cached one: a clone inherits the
  // SHARED tag, and disposeObject deliberately skips anything carrying it — so
  // every retired boat would leak its bulbs.
  const m = sphereMesh(radius, color, 8, 6, { unique: true });
  m.material.emissive = new THREE.Color(color);
  m.material.emissiveIntensity = 0;
  m.material.userData = { dynamic: true };
  m.userData.dynamic = true;
  return m;
}

function buildJetski() {
  // THE DONUT BOAT, third pass — and this time it is a whole donut.
  //
  // The last version cut a 35-degree wedge out of the ring to make a "bite".
  // From the game's top-down camera that does not read as a bite; it reads as a
  // broken ring, a letter C floating in the sea. The reference is a pool float:
  // a complete, fat, pink-glazed torus. A bite is a detail you can only sell at
  // close range on a shape the viewer already recognises, and this camera never
  // gets close enough — so the shape comes first and the gimmick goes.
  //
  // Construction, outermost first:
  //   dough      a fat torus, warm tan
  //   icing      a slightly larger torus, squashed and lowered so it pours over
  //              the top AND down the outer face rather than sitting on it
  //   drips      a ring of squashed spheres at the icing's lower edge, so the
  //              glaze ends in a scalloped line instead of a hard seam
  //   sprinkles  laid along the icing's curve, not scattered on a flat plane
  const g = new THREE.Group();
  const DOUGH = '#efb782', DOUGH_LO = '#d59a63';
  const ICING = '#ff5fa8', ICING_LO = '#e03d8a';
  const SEAT = '#7fd4f5';

  const R = 1.05;          // ring radius
  const TUBE = 0.52;       // fat: this is a float, not a tyre

  const dough = new THREE.Mesh(
    new THREE.TorusGeometry(R, TUBE, 12, 28),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(DOUGH) }));
  dough.rotation.x = -Math.PI / 2;
  dough.position.y = 0.04;
  dough.castShadow = true;
  g.add(dough);

  // a darker torus tucked just under it: gives the underside shading without
  // needing a second light
  const under = new THREE.Mesh(
    new THREE.TorusGeometry(R, TUBE * 0.92, 8, 22),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(DOUGH_LO) }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.09;
  g.add(under);

  // THE ICING — and this is where the last pass went wrong, which only showed
  // up once the thing was actually rendered and looked at from the game's own
  // top-down angle.
  //
  // The glaze was a torus of the same tube radius squashed to 0.66 and set at
  // y=0.2, which put its crown at 0.54 — TWO CENTIMETRES BELOW the dough's, at
  // 0.56. So from directly above you saw the tan dough across the whole top of
  // the ring and a thin pink band only where the dough curved away underneath.
  // A donut whose glaze is hidden behind the dough is a bread ring.
  //
  // It now sits at 0.30 with a fractionally fatter tube, crowning at 0.62 and
  // overhanging the dough at BOTH the inner and outer edge, so the top face is
  // pink and the tan reads as the ring of bare dough round the rim that it is.
  const ICE_TUBE = TUBE * 1.02;
  const ICE_Y = 0.30, ICE_SQUASH = 0.60;
  const icing = new THREE.Mesh(
    new THREE.TorusGeometry(R, ICE_TUBE, 10, 30),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(ICING) }));
  icing.rotation.x = -Math.PI / 2;
  icing.position.y = ICE_Y;
  // SQUASH THE TUBE, NOT THE RING. `scale.y` was the obvious guess and it is
  // wrong: three.js composes as translate * rotate * scale, so the scale runs in
  // the mesh's own space BEFORE the -90° X rotation. A TorusGeometry lies in its
  // local XY plane, so local Y is one of the RING's in-plane axes — scaling it
  // squashed the glaze into an OVAL, narrower front-to-back than the dough
  // underneath it. Rendered from directly above that showed as a pink stripe
  // across the middle of a tan ring, with bare dough at both ends.
  // The tube's vertical axis after the rotation is local Z.
  icing.scale.z = ICE_SQUASH;
  g.add(icing);

  /** The height of the glaze at a distance `across` from the ring's centreline. */
  const icingTopAt = (across) =>
    ICE_Y + ICE_SQUASH * Math.sqrt(Math.max(0, ICE_TUBE * ICE_TUBE - across * across));

  // the scalloped drip edge, hung on the icing's outer hem
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const drip = sphereMesh(0.115 + (i % 3) * 0.03, ICING_LO);
    const rr = R + ICE_TUBE * 0.80;
    drip.position.set(Math.cos(a) * rr, 0.18 + ((i % 2) ? 0.05 : -0.03), Math.sin(a) * rr);
    drip.scale.set(1, 0.75, 1);
    g.add(drip);
  }

  // SPRINKLES, sitting ON the glaze rather than hovering at one flat height —
  // `icingTopAt` is the same curve the torus is built from, so every one of them
  // touches the surface it is supposed to be stuck to. They were also too small
  // to survive the render at the distance this boat is normally seen from, so
  // they are chunkier now: a sprinkle you cannot see is not a sprinkle.
  let sp = 4242;
  const rnd = () => { sp = (sp * 1103515245 + 12345) & 0x7fffffff; return sp / 0x7fffffff; };
  const SPRINKLE = ['#ffffff', '#5fc8f5', '#ffe27a', '#8ad86e', '#ff8fc4', '#c78fff'];
  for (let i = 0; i < 62; i++) {
    const a = rnd() * Math.PI * 2;
    const across = (rnd() - 0.5) * ICE_TUBE * 1.5;
    const rr = R + across;
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.075, 0.075),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(SPRINKLE[i % SPRINKLE.length]) }));
    s.position.set(Math.cos(a) * rr, icingTopAt(across) - 0.02, Math.sin(a) * rr);
    s.rotation.set(rnd() * 0.4, -a + (rnd() - 0.5) * 1.6, rnd() * 0.4);
    g.add(s);
  }

  // THE SEAT WELL. The hole is the single feature that says "donut", and the old
  // cushion was 0.79 across against a hole of 0.53 — wider than the hole it sat
  // in, so it wedged under the dough and filled the middle solid. From above the
  // boat read as a target, not a ring. It is smaller and lower now: a pad sunk
  // half a unit below the crown, with a clear gap of shadow round it.
  // It leaves a real gap: at 0.94 of the hole the seat still filled the middle
  // solid from above, because a three-centimetre ring of shadow is nothing at
  // this camera height. At 0.72 there is a visible dark collar between the glaze
  // and the pad, and THAT is what reads as a hole.
  const HOLE = R - TUBE;                    // 0.53
  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(HOLE * 0.72, HOLE * 0.56, 0.2, 16),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(SEAT) }));
  cushion.position.y = -0.12;
  g.add(cushion);
  const cushionTop = new THREE.Mesh(
    new THREE.CylinderGeometry(HOLE * 0.68, HOLE * 0.72, 0.06, 16),
    new THREE.MeshLambertMaterial({ color: new THREE.Color('#a8e6ff') }));
  cushionTop.position.y = -0.01;
  g.add(cushionTop);

  // Two grab handles fore and aft, so the float has a readable heading. Raising
  // the glaze raised the whole top of the boat with it — at the old y=0.33 both
  // of these, and every lamp, were now sunk INSIDE the icing. Anything that
  // wants to be seen has to clear the crown at 0.62.
  for (const sz of [1, -1]) {
    const bar = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.05, 6, 10, Math.PI),
      new THREE.MeshLambertMaterial({ color: new THREE.Color('#5a6470') }));
    bar.position.set(0, 0.68, sz * (R - 0.1));
    bar.rotation.set(Math.PI / 2, 0, 0);
    g.add(bar);
  }

  // NIGHT LIGHTS: a ring of bulbs round the OUTSIDE of the rim, below the drip
  // hem, plus a brighter lamp standing proud at the bow.
  const lamps = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bulb = lampBulb(0.085, i % 2 ? '#fff0b0' : '#8fd8f8');
    const rr = R + TUBE * 1.08;
    bulb.position.set(Math.cos(a) * rr, 0.2, Math.sin(a) * rr);
    g.add(bulb);
    lamps.push(bulb);
  }
  const bowPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.34, 6),
    new THREE.MeshLambertMaterial({ color: new THREE.Color('#5a6470') }));
  bowPost.position.set(0, 0.66, -(R + TUBE * 0.55));
  g.add(bowPost);
  const bowLamp = lampBulb(0.13, '#fff3c8');
  bowLamp.position.set(0, 0.9, -(R + TUBE * 0.55));
  g.add(bowLamp);
  lamps.push(bowLamp);

  const light = new THREE.PointLight(0xffd9a0, 0, 9, 2);
  light.position.set(0, 0.7, 0);
  g.add(light);

  g.userData.lamps = lamps;
  g.userData.light = light;
  g.userData.dynamic = true;          // the baker must not freeze the lamps
  g.userData.exhaust = new THREE.Vector3(0, -0.05, -(R + TUBE));
  g.userData.bow = new THREE.Vector3(0, -0.05, R + TUBE);
  return g;
}

function buildDinghy() {
  const g = new THREE.Group();
  const WOOD = '#b0854f', DARK = '#7d5c36', RAIL = '#caa269', FLOOR = '#96754d';

  // A DISPLACEMENT HULL, sized for a CHIBI rider. The first version was drawn to
  // a realistic scale: a 2.4m dinghy with a 0.62 gunwale, which came up to the
  // hero's shins and left them looking like a crate balanced on a canoe. This is
  // longer, far beamier and much deeper, so the rider sits DOWN INSIDE it with
  // the rail at chest height, which is what makes it read as a boat with someone
  // in it rather than a boat with someone on it.
  const LEN = 3.4, BEAM = 0.86, SHEER = 1.02;
  const hullGeo = buildHullGeometry(
    LEN,
    (t) => BEAM * Math.sin(Math.min(1, t * 1.12) * Math.PI * 0.94) + 0.09,
    // the sheer sweeps up at BOTH ends, hardest at the bow
    (t) => SHEER + Math.pow(Math.abs(t - 0.44) * 2, 2.1) * 0.42,
    () => 0.34,
    0.12,                                                      // round-bottomed
  );
  const hull = new THREE.Mesh(hullGeo, hullMat(WOOD));
  hull.castShadow = true;
  g.add(hull);

  // planking: four lap strakes following the sheer, alternating tone. These are
  // thin shells nested just inside the hull, so the lapstrake shadow line reads
  // from any angle without needing a texture.
  // Each strake is a THIN BAND at its own height, nested a hair outside the
  // hull. The first version passed a keel ABOVE its own deck line, which is an
  // inverted cross-section — the sweep folded through itself and drew garbage.
  for (let i = 0; i < 4; i++) {
    const top = SHEER * (0.8 - i * 0.19);
    const strake = new THREE.Mesh(buildHullGeometry(
      LEN - 0.02 - i * 0.01,
      (t) => (BEAM + 0.014) * Math.sin(Math.min(1, t * 1.12) * Math.PI * 0.94) + 0.09,
      () => top,
      () => -(top - 0.1),          // keel line BELOW the deck line, always
      0.12,
    ), hullMat(i % 2 ? DARK : WOOD));
    g.add(strake);
  }

  // FLOORBOARDS. Without them you look straight down through the hull into the
  // sea, which is most of why the boat read as a hollow shell.
  for (let i = 0; i < 5; i++) {
    const bx = -0.95 + i * 0.5;
    const w = 0.62 * Math.sin(Math.min(1, (bx / LEN + 0.5) * 1.12) * Math.PI * 0.94) + 0.3;
    const plank = new THREE.Mesh(sharedBox(0.42, 0.05, w * 1.55),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(i % 2 ? FLOOR : '#8a6a44') }));
    plank.position.set(bx, 0.02, 0);
    g.add(plank);
  }

  // ribs across the inside, so the interior is not one flat tray
  for (const rx of [-0.7, 0, 0.7]) {
    const rib = new THREE.Mesh(sharedBox(0.07, 0.5, 1.5),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(DARK) }));
    rib.position.set(rx, 0.3, 0);
    g.add(rib);
  }

  // a capping rail all the way round the gunwale, in WOOD rather than the
  // near-white trim that used to draw the whole boat as a pale outline
  const rail = new THREE.Mesh(new THREE.TorusGeometry(BEAM + 0.1, 0.06, 6, 24),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(RAIL) }));
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(LEN / (2 * (BEAM + 0.1)), 1, 1);
  rail.position.y = SHEER;
  g.add(rail);

  // the thwart the rider sits on, plus a stern bench
  const bench = new THREE.Mesh(sharedBox(0.5, 0.1, 1.5),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(RAIL) }));
  bench.position.set(-0.18, 0.62, 0); g.add(bench);
  const stern = new THREE.Mesh(sharedBox(0.42, 0.09, 1.2),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(FLOOR) }));
  stern.position.set(-1.3, 0.68, 0); g.add(stern);

  // OARS: each one a single unit — loom, grip and blade in line — pivoting on
  // its rowlock. They used to be a flat cylinder with a detached box floating
  // near it, which is exactly what the screenshot showed: loose planks.
  const oars = [];
  for (const sz of [-1, 1]) {
    const oar = new THREE.Group();
    const loom = new THREE.Mesh(sharedCyl(0.04, 0.05, 2.0, 6),
      new THREE.MeshLambertMaterial({ color: new THREE.Color('#8a6a44') }));
    loom.rotation.z = Math.PI / 2;
    loom.position.x = -0.35;
    oar.add(loom);
    const grip = new THREE.Mesh(sharedCyl(0.06, 0.06, 0.22, 6),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(DARK) }));
    grip.rotation.z = Math.PI / 2;
    grip.position.x = 0.6;
    oar.add(grip);
    const blade = new THREE.Mesh(sharedBox(0.5, 0.04, 0.2),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(FLOOR) }));
    blade.position.x = -1.52;
    oar.add(blade);
    // the rowlock it turns in
    const lock = new THREE.Mesh(sharedCyl(0.05, 0.05, 0.16, 6),
      new THREE.MeshLambertMaterial({ color: new THREE.Color('#8d9294') }));
    lock.position.set(-0.18, SHEER + 0.08, sz * (BEAM + 0.06));
    g.add(lock);
    // pivot at the lock, blade out and down toward the water
    oar.position.set(-0.18, SHEER + 0.1, sz * (BEAM + 0.06));
    oar.rotation.y = sz * 0.5;
    oar.rotation.z = -0.28;
    oar.userData.dynamic = true;
    g.add(oar);
    oars.push({ o: oar, side: sz });
  }
  g.userData.oars = oars;

  // bow lantern on a curved post
  const post = new THREE.Mesh(sharedCyl(0.035, 0.045, 0.46, 6),
    new THREE.MeshLambertMaterial({ color: new THREE.Color('#6e5334') }));
  post.position.set(1.42, 1.28, 0); g.add(post);
  const lamp = new THREE.Mesh(sharedCyl(0.13, 0.13, 0.24, 8),
    sharedMat('#ffdca0', { unique: true, emissive: '#ffb85c' }));
  lamp.position.set(1.42, 1.62, 0);
  lamp.material.emissiveIntensity = 0.7;
  g.add(lamp);
  const lampCap = new THREE.Mesh(sharedCyl(0.03, 0.16, 0.07, 8),
    new THREE.MeshLambertMaterial({ color: new THREE.Color('#c46a3a') }));
  lampCap.position.set(1.42, 1.78, 0); g.add(lampCap);

  g.userData.lamp = lamp;
  g.userData.exhaust = new THREE.Vector3(-1.75, 0.1, 0);
  g.userData.bow = new THREE.Vector3(1.75, 0.1, 0);
  // NIGHT LIGHTS. A boat with no lamp is invisible on a dark sea, and the sea is
  // where the map is emptiest — these are the only thing telling you a hull is
  // out there. Basic materials so they stay bright once the sun drops, plus one
  // real point light so the deck and the rider are lit too.
  {
    const lamps = [];
    const bow = lampBulb(0.11, '#fff3c8');
    bow.position.set(0, 0.72, 1.26);
    g.add(bow);
    lamps.push(bow);
    const stern = lampBulb(0.09, '#ff9a7a');
    stern.position.set(0, 0.66, -1.24);
    g.add(stern);
    lamps.push(stern);
    // port red / starboard green, because that is what boats do
    for (const [sx, col] of [[-1, '#ff7a7a'], [1, '#8ad86e']]) {
      const side = lampBulb(0.07, col);
      side.position.set(sx * 0.5, 0.6, 0.3);
      g.add(side);
      lamps.push(side);
    }
    const light = new THREE.PointLight(0xffd9a0, 0, 10, 2);
    light.position.set(0, 1.0, 0.4);
    g.add(light);
    g.userData.lamps = lamps;
    g.userData.light = light;
  }

  return g;
}

const BUILD = { jetski: buildJetski, dinghy: buildDinghy };

/**
 * @param hooks.onBoard/onLeave  toast + sfx hooks
 * @param hooks.owns(itemId)     does the player own this craft's key?
 */
export function createWatercraft(scene, terrain, particles, hooks = {}) {
  const state = {
    active: null,        // craft id while riding
    heading: 0,          // world yaw of the craft
    speed: 0,            // current forward speed
    vx: 0, vz: 0,        // real velocity vector - the hull carries momentum
    along: 0, slip: 0,   // resolved along-hull / across-hull components
    steer: 0,
    lean: 0, leanV: 0, pitch: 0,
    bob: 0,
    ringT: 0,
    waveT: 0,           // the same clock water.js rolls its swell on
    surfY: WATER_Y,     // live surface height under the craft
    moored: {},          // id -> { mesh, x, z, dir }
    homeBerth: {},       // id -> the original marina berth, for stranded craft
    offWater: 0,         // seconds the rider has spent off the water (grace)
  };
  const group = new THREE.Group();
  scene.add(group);

  let ridden = null;     // the mesh currently under the player

  /** True where a hull has enough water under it to float and be driven. */
  function floats(x, z) {
    const [ix, iz] = terrain.cellOf(x, z);
    return terrain.inBounds(ix, iz) && terrain.swimmable(x, z)
      && WATER_Y - terrain.surfaceY(x, z) > HULL_DRAFT;
  }

  /**
   * Park a craft on the water at (x, z). If that exact spot is too shallow the
   * berth is nudged to the nearest floatable water — a craft moored on the
   * shelf grounds out the instant you board it and feels broken.
   */
  function moor(id, x, z, dir = 0) {
    if (!floats(x, z)) {
      let found = false;
      for (let r = 0.6; r <= 10 && !found; r += 0.6) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
          if (floats(nx, nz)) { x = nx; z = nz; found = true; break; }
        }
      }
    }
    const mesh = BUILD[id]();
    mesh.position.set(x, WATER_Y, z);
    mesh.rotation.y = dir;
    group.add(mesh);
    state.moored[id] = { mesh, x, z, dir, id };
    state.homeBerth[id] = { x, z, dir };   // where to send it back to if stranded
    return state.moored[id];
  }

  /** The nearest moored craft within `r`, or null. Drives the interact prompt. */
  function nearest(pos, r = 2.6) {
    let best = null, bd = r * r;
    for (const m of Object.values(state.moored)) {
      if (state.active === m.id) continue;
      const d = (m.mesh.position.x - pos.x) ** 2 + (m.mesh.position.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  function board(id, player) {
    const m = state.moored[id];
    if (!m || state.active) return false;
    if (hooks.owns && !hooks.owns(CRAFT_DEFS[id].item)) {
      hooks.onDenied?.(CRAFT_DEFS[id]);
      return false;
    }
    // Grab the craft's WORLD position and heading BEFORE reparenting it — the
    // moment it becomes a child of the player its .position is local (0,0,0),
    // and reading it afterwards teleported the rider to the world origin.
    const berthX = m.mesh.position.x, berthZ = m.mesh.position.z;
    const berthDir = m.mesh.rotation.y;

    state.active = id;
    state.heading = berthDir;
    state.speed = 0;
    state.vx = 0; state.vz = 0; state.slip = 0; state.along = 0;
    state.steer = 0; state.lean = 0; state.leanV = 0; state.pitch = 0;
    state.offWater = 0;
    ridden = m.mesh;
    // the craft rides under the hero; the player group carries it so the camera
    // and every other system keep treating the player as the thing that moves
    player.state.group.add(ridden);
    ridden.position.set(0, -CRAFT_DEFS[id].seatH - WATERLINE, 0);
    ridden.rotation.set(0, 0, 0);
    player.state.craft = { id, ...CRAFT_DEFS[id] };
    // sit the hero ON it: knees up, hands forward on the bars
    player.setCraftPose?.(true, id);
    // drop the hero onto the waterline
    // SIT ON THE CRAFT. Boarding used to leave the rider standing wherever they
    // pressed the button — on the pier, on dry land — while the hull was out on
    // the water. The stranding guard then correctly saw a rider who was not over
    // water and threw them straight back off, so the craft could never be ridden
    // at all. You board a boat by getting IN it.
    player.state.pos.x = berthX;
    player.state.pos.z = berthZ;
    player.state.pos.y = WATER_Y + CRAFT_DEFS[id].seatH;
    player.state.vy = 0;
    player.state.grounded = true;
    particles?.burst(player.state.pos.clone().setY(WATER_Y), '#dff6ff', 14, 3, 4, 0.5);
    hooks.onBoard?.(CRAFT_DEFS[id]);
    return true;
  }

  /**
   * Step off. `stranded` means the rider was moved off the water while aboard
   * (teleport / respawn), so the craft is sent back to a floatable berth rather
   * than left wherever the player happened to land.
   */
  function leave(player, stranded = false) {
    if (!state.active) return;
    const id = state.active;
    const m = state.moored[id];
    // step off onto the nearest dry cell, and re-moor the craft where we stopped
    const shore = terrain.nearestShore(player.state.pos.x, player.state.pos.z);
    player.state.group.remove(ridden);
    group.add(ridden);
    let px = player.state.pos.x, pz = player.state.pos.z;
    if (stranded || !floats(px, pz)) {
      // send it home to its berth: a hull left on dry land is the bug, not a
      // feature, and the marina is where you would expect to find it again
      const berth = state.homeBerth[id];
      if (berth) { px = berth.x; pz = berth.z; }
    }
    ridden.position.set(px, WATER_Y, pz);
    ridden.rotation.set(0, stranded ? m.dir : state.heading, 0);
    m.x = px; m.z = pz; m.dir = stranded ? m.dir : state.heading;
    ridden = null;
    state.active = null;
    player.state.craft = null;
    player.setCraftPose?.(false);
    if (!stranded) {
      player.state.pos.set(shore.x, terrain.surfaceY(shore.x, shore.z), shore.z);
    } else {
      // already been moved somewhere deliberate — just drop them on the ground
      player.state.pos.y = terrain.surfaceY(player.state.pos.x, player.state.pos.z);
    }
    player.state.grounded = true;
    particles?.burst(new THREE.Vector3(px, WATER_Y, pz), '#dff6ff', 10, 2.4, 4, 0.45);
    hooks.onLeave?.(CRAFT_DEFS[id]);
  }

  /**
   * Drive the craft. Called from the game loop INSTEAD of normal player
   * movement while `state.active` is set.
   * @param mv normalised {x, z} camera-relative move vector, or null
   */
  function drive(dt, player, mv, time) {
    if (!state.active) return;
    state.waveT = time;          // stay in step with the sea's own clock
    const def = CRAFT_DEFS[state.active];

    // If the rider is no longer over water at all, they were teleported,
    // respawned or nudged while aboard. Put them off the craft properly rather
    // than dragging a hull through the hillside.
    // Grace period: only bail out if the rider stays off the water for a beat.
    // A single odd frame (a nudge, a resize hitch) should not eject anyone.
    if (!terrain.swimmable(player.state.pos.x, player.state.pos.z)) {
      state.offWater += dt;
      if (state.offWater > 0.4) { leave(player, true); return; }
    } else {
      state.offWater = 0;
    }

    // ---- HOW A REAL HULL BEHAVES, and why the earlier versions felt wrong ----
    // A jetski is not a car. Three things define it:
    //
    //   1. THRUST IS ALONG THE HULL. The jet pushes wherever the nose points.
    //      You cannot strafe, and a jetski with no throttle barely turns at all,
    //      because steering needs water flowing over the hull.
    //   2. IT SLIDES. The hull carries sideways momentum through a turn and
    //      washes it off gradually. That drift is the whole feel; snapping the
    //      velocity onto the new heading is what made it read as a hovering
    //      brick that pivots in place.
    //   3. DRAG IS QUADRATIC. Water resistance rises with the square of speed,
    //      so it pulls hard off the bottom, tops out on a curve, and coasts a
    //      long way once you let go.
    //
    // So: keep a real velocity VECTOR, push it along the heading, and let the
    // keel bleed off the sideways part over time.
    const sh = Math.sin(state.heading), ch = Math.cos(state.heading);

    // --- steering -------------------------------------------------------------
    let throttle = 0;
    if (mv) {
      const want = Math.atan2(mv.x, mv.z);
      let diff = want - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // steering AUTHORITY needs flow over the hull: near-nothing at rest, full
      // at speed. This is what stops it spinning on the spot.
      const flow = Math.min(1, state.speed / (def.speed * 0.45));
      const rate = def.turn * (0.18 + 0.82 * flow);
      state.steer += (Math.max(-1, Math.min(1, diff / 0.6)) - state.steer) * Math.min(1, dt * 9);
      state.heading += state.steer * rate * dt;
      // you can hold the throttle through a turn — it just carves wider
      throttle = 1 - Math.min(0.35, (Math.abs(diff) / Math.PI) * 0.7);
    } else {
      state.steer += (0 - state.steer) * Math.min(1, dt * 5);
    }

    // --- forces ---------------------------------------------------------------
    const thrust = throttle * def.accel;
    state.vx += sh * thrust * dt;
    state.vz += ch * thrust * dt;

    // resolve the velocity into along-hull and across-hull parts
    let along = state.vx * sh + state.vz * ch;
    let side = state.vx * ch - state.vz * sh;

    // quadratic drag along the hull: natural top speed, long coast
    // linear term kept LOW: at 0.35 the craft stopped dead in two seconds,
    // which is a rowing boat, not a jetski. At 0.12 it glides.
    along -= (def.drag * along * Math.abs(along) + along * 0.12) * dt;
    // the keel kills sideways motion much faster than forward motion — but not
    // instantly, and that lag IS the drift through a turn
    side -= side * Math.min(1, def.grip * dt);
    if (along < 0) along = Math.max(along, -def.speed * 0.25);   // gentle reverse

    state.vx = sh * along + ch * side;
    state.vz = ch * along - sh * side;
    state.speed = Math.hypot(state.vx, state.vz);
    state.along = along;
    state.slip = side;

    // --- move -----------------------------------------------------------------
    // A hull needs water under it, probed at the BOW: that is what touches the
    // sand first. Probing at the seat let the nose ride up the beach unnoticed.
    const nx = player.state.pos.x + state.vx * dt;
    const nz = player.state.pos.z + state.vz * dt;
    const bowX = nx + sh * 1.15, bowZ = nz + ch * 1.15;
    if (floats(nx, nz) && floats(bowX, bowZ)) {
      player.state.pos.x = nx;
      player.state.pos.z = nz;
    } else {
      // grounded: dump the way, throw foam, and slide back off the bank so the
      // hull can never wedge itself into the shore
      if (state.speed > 3) {
        particles?.burst(player.state.pos.clone().setY(WATER_Y + 0.1), '#eafcff', 12, 3, 5, 0.5);
        particles?.ring?.(player.state.pos.clone().setY(WATER_Y + 0.02), '#ffffff', 1.8, 0.4);
        hooks.onBeach?.();
      }
      state.vx *= 0.1; state.vz *= 0.1; state.speed *= 0.1;
      player.state.pos.x -= sh * 0.05;
      player.state.pos.z -= ch * 0.05;
    }
    player.state.facing = state.heading;

    // --- attitude -------------------------------------------------------------
    const fast = Math.min(1, state.speed / def.speed);
    // ROLL: a hull banks INTO the turn, and it is the sideways slip that tips
    // it — so the bank is driven by the actual drift, not by the stick position.
    const wantRoll = -state.slip * def.lean * 0.55 - state.steer * def.lean * 0.45 * fast;
    state.leanV += (wantRoll - state.lean) * 30 * dt;
    state.leanV *= Math.pow(0.002, dt);
    state.lean += state.leanV * dt;
    // PITCH: the bow lifts as it climbs onto plane, settles once planing, and
    // noses down when the throttle is cut. Plus the swell underneath.
    state.bob += dt * (2.0 + state.speed * 0.55);
    // ROWING. The oars are what make a rowboat move, so they have to move with
    // it: the stroke rate follows the actual speed, and player.js reads the same
    // phase so the hero pulls in time with the blades instead of sitting still
    // while the boat glides.
    if (state.active === 'dinghy') {
      state.row = (state.row || 0) + dt * (1.1 + fast * 4.2);
      player.state.rowPhase = state.row;
      const oars = ridden?.userData.oars;
      if (oars) {
        const pull = Math.sin(state.row);
        for (const { o, side } of oars) {
          o.rotation.z = -0.28 + pull * 0.34;              // blade dips and lifts
          o.rotation.y = side * (0.5 + Math.cos(state.row) * 0.26);
        }
      }
    }
    const plane = Math.min(1, fast * 1.6);
    const wantPitch = -plane * 0.2 + (throttle < 0.05 ? 0.06 : 0);
    state.pitch += (wantPitch - state.pitch) * Math.min(1, dt * 4);
    // FLOAT ON THE ACTUAL SWELL. The craft used to be pinned to the mean
    // waterline while the sea heaved +-0.4 around it, so every crest rose above
    // the keel and washed straight over the deck — which is why the boats looked
    // like they were sinking. Sampling the same wave sum the mesh is displaced
    // by means the hull rides the water it is actually sitting on, and the
    // surface gradient gives an honest pitch and roll for free.
    const w = waveAt(player.state.pos.x, player.state.pos.z, state.waveT,
      terrain.inOcean(player.state.pos.x, player.state.pos.z));
    state.surfY = WATER_Y + w.h;
    player.state.pos.y = state.surfY + def.seatH
      + Math.sin(state.bob) * def.porpoise * (0.3 + fast);
    if (ridden) {
      // the hull leans into its turn AND heels with the face of the wave
      const sh2 = Math.sin(state.heading), ch2 = Math.cos(state.heading);
      const slopeAlong = w.dx * sh2 + w.dz * ch2;      // up/down the wave
      const slopeAcross = w.dx * ch2 - w.dz * sh2;     // across it
      ridden.rotation.z = state.lean + slopeAcross * 0.55;
      ridden.rotation.x = state.pitch - slopeAlong * 0.7 - Math.sin(state.bob * 0.8) * 0.04;
      ridden.rotation.y = state.lean * 0.1;
    }

    // ---- WAKE ----------------------------------------------------------------
    if (fast > 0.05) {
      const px = player.state.pos.x, pz = player.state.pos.z;
      // ROOSTER TAIL straight off the nozzle, thrown up and back
      if (Math.random() < dt * 55 * fast * def.spray) {
        particles?.burst(
          new THREE.Vector3(px - sh * 1.25, WATER_Y + 0.06, pz - ch * 1.25),
          '#f4feff', 2, 1.4 + fast * 3.6, 4.5 + fast * 3.5, 0.5,
        );
      }
      // the V: two foam lines peeling away behind the hull at the wake angle
      if (Math.random() < dt * 34 * fast) {
        const sd = Math.random() < 0.5 ? 1 : -1;
        const a = state.heading + sd * 2.45;
        particles?.burst(
          new THREE.Vector3(px + Math.sin(a) * 1.05, WATER_Y + 0.04, pz + Math.cos(a) * 1.05),
          '#dff6ff', 1, 0.8 + fast, 1.4, 0.85,
        );
      }
      // BOW SPRAY thrown out to the sides once it is up on plane
      if (fast > 0.32 && Math.random() < dt * 28 * def.spray) {
        const sd = Math.random() < 0.5 ? 1 : -1;
        const a = state.heading + sd * 0.5;
        particles?.burst(
          new THREE.Vector3(px + Math.sin(a) * 1.3, WATER_Y + 0.15, pz + Math.cos(a) * 1.3),
          '#ffffff', 1, 2.6 * fast, 5, 0.4,
        );
      }
      // SLIDE SPRAY: kicked out sideways only while the hull is actually
      // drifting, so a hard carve throws a visible sheet
      if (Math.abs(state.slip) > 0.8 && Math.random() < dt * 30) {
        const sd = Math.sign(state.slip);
        const a = state.heading + sd * 1.57;
        particles?.burst(
          new THREE.Vector3(px + Math.sin(a) * 0.8, WATER_Y + 0.08, pz + Math.cos(a) * 0.8),
          '#f0fbff', 2, 1.2 + Math.abs(state.slip) * 0.6, 3.5, 0.45,
        );
      }
      // ripple rings left on the surface so the trail persists behind you
      state.ringT -= dt;
      if (state.ringT <= 0 && fast > 0.22) {
        state.ringT = 0.15 / Math.max(0.4, fast);
        particles?.ring?.(
          new THREE.Vector3(px - sh * 1.0, WATER_Y + 0.03, pz - ch * 1.0),
          '#eafcff', 0.9 + fast * 1.7, 0.5,
        );
      }
    }
    if (ridden?.userData.lamp) {
      ridden.userData.lamp.material.emissiveIntensity = 0.55 + Math.sin(time * 4) * 0.15;
    }
  }

  /** Idle bob for the moored craft, so the marina isn't a car park. */
  /**
   * Lamps on at dusk, off at dawn, with a slow flicker so they read as flame
   * rather than as an LED. `night` is 0..1 and comes from the same day-cycle
   * value the village lanterns use, so every light in the world comes up
   * together instead of each system guessing at its own sunset.
   */
  function tickLamps(night) {
    const on = Math.max(0, Math.min(1, night));
    const hulls = [...Object.values(state.moored).map((m) => m.mesh)];
    if (ridden) hulls.push(ridden);
    for (const g of hulls) {
      const lamps = g?.userData?.lamps;
      if (!lamps) continue;
      // a slow flicker so they read as flame rather than as an LED
      const flick = 0.86 + Math.sin(performance.now() * 0.004 + g.id * 0.7) * 0.14;
      for (const b of lamps) {
        // EMISSIVE, not opacity. The bulb is a physical object in daylight and
        // a light source at night; fading its alpha made it vanish instead, and
        // because the mesh cache hands out SHARED materials it also dragged
        // every other object of that colour along with it. lampBulb() gives
        // each one a private material precisely so this is safe.
        b.material.emissiveIntensity = on * flick * 1.6;
      }
      if (g.userData.light) g.userData.light.intensity = on * flick * 1.8;
    }
  }

  function update(dt, time) {
    for (const m of Object.values(state.moored)) {
      if (state.active === m.id) continue;
      // moored craft ride the same swell as everything else, so a boat at the
      // pier is never left hanging above a trough or buried under a crest
      const mw = waveAt(m.x, m.z, time, terrain.inOcean(m.x, m.z));
      m.mesh.position.y = WATER_Y + mw.h - WATERLINE;
      const s2 = Math.sin(m.dir), c2 = Math.cos(m.dir);
      m.mesh.rotation.z = (mw.dx * c2 - mw.dz * s2) * 0.5;
      m.mesh.rotation.x = -(mw.dx * s2 + mw.dz * c2) * 0.6;
      m.mesh.rotation.z = Math.sin(time * 1.1 + m.z) * 0.05;
      m.mesh.rotation.x = Math.cos(time * 0.9 + m.x) * 0.035;
      if (m.mesh.userData.lamp) {
        m.mesh.userData.lamp.material.emissiveIntensity = 0.5 + Math.sin(time * 2.2) * 0.2;
      }
    }
  }

  function dispose() {
    disposeObject(group, true);
    scene.remove(group);
  }

  /**
   * LAUNCH STATIONS. A boat that lives at one fixed berth on the far side of the
   * map is a boat you walk past on foot. Every pier registers a station, and you
   * summon your craft to whichever one you are standing on — which is also the
   * shape multiplayer needs, since each player has to be able to put their own
   * hull in the water without fighting over one berth.
   */
  const stations = [];
  function addStation(st) { stations.push(st); return st; }
  /** The station within `r` of a point, or null. */
  function nearestStation(pos, r = 3.2) {
    let best = null, bd = r * r;
    for (const st of stations) {
      const d = (st.x - pos.x) ** 2 + (st.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = st; }
    }
    return best;
  }
  /** Re-berth an owned craft at a station and return it, or null if not owned. */
  function summon(id, st) {
    if (!hooks.owns?.(CRAFT_DEFS[id].item)) return null;
    if (state.active === id) return null;               // already riding it
    const m = state.moored[id];
    // Walk out from the station along its heading until the hull floats, then
    // step SIDEWAYS until the berth is clear of any other craft. Summoning both
    // boats to one post used to drop them in the same spot, and two hulls
    // occupying the same water is the "ketumpuk" in the report.
    const CLEAR = 2.6;                    // hulls are 3.4 long; this is beam-ish
    const occupied = (x, z) => Object.values(state.moored)
      .some((o) => o.id !== id && Math.hypot(o.x - x, o.z - z) < CLEAR);
    let bx = st.x, bz = st.z, found = false;
    const side = st.dir + Math.PI / 2;
    for (let d = 0; d <= 12 && !found; d += 0.5) {
      const fx = st.x + Math.sin(st.dir) * d, fz = st.z + Math.cos(st.dir) * d;
      if (!floats(fx, fz)) continue;
      // dead ahead first, then alternating left and right along the pier
      for (const off of [0, 1.6, -1.6, 3.2, -3.2, 4.8, -4.8]) {
        const x = fx + Math.sin(side) * off, z = fz + Math.cos(side) * off;
        if (floats(x, z) && !occupied(x, z)) { bx = x; bz = z; found = true; break; }
      }
    }
    if (!found) return null;              // no clear water: better than stacking
    if (!m) return moor(id, bx, bz, st.dir);
    m.x = bx; m.z = bz; m.dir = st.dir;
    m.mesh.position.set(bx, WATER_Y, bz);
    m.mesh.rotation.set(0, st.dir, 0);
    state.homeBerth[id] = { x: bx, z: bz, dir: st.dir };
    particles?.burst(new THREE.Vector3(bx, WATER_Y + 0.1, bz), '#dff6ff', 16, 3, 4.5, 0.5);
    return m;
  }
  /** Which craft the player owns, for the launch prompt. */
  const owned = () => Object.keys(CRAFT_DEFS).filter((k) => hooks.owns?.(CRAFT_DEFS[k].item));

  return {
    state, moor, nearest, board, leave, drive, update, tickLamps, dispose, CRAFT_DEFS,
    addStation, nearestStation, summon, owned, stations,
  };
}
