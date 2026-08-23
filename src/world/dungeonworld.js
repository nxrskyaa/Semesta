// THE HOLLOW, BUILT.
//
// A dungeon floor is one sealed hall: a slab, four walls, a door you came in by
// and a stair you open by killing everything. That is the whole geometry, and
// keeping it that simple is what lets the floor be about the FIGHT rather than
// about finding your way.
//
// ---------------------------------------------------------------------------
// THE ONE IDEA THAT MADE THIS BUILDABLE
//
// Everything in Semesta asks the same object where the ground is. The player's
// gravity, its walk collision, its swim check; every monster's footing; the
// wildlife, the boats, the decor. All of it is `terrain.surfaceY(x, z)` and
// `terrain.walkable(x, z, y)` on one shared instance.
//
// So the dungeon does NOT build a second world engine, and it does not swap a
// reference that a dozen modules captured at construction time and would go on
// holding. It installs an OVERRIDE on the terrain object itself: while a run is
// active, those few methods answer for the hall instead of for Anavela, and
// every system in the game follows without knowing a dungeon exists. Take the
// override off and the overworld is exactly as it was — nothing was mutated,
// nothing has to be rebuilt, and the hero is standing where they left.
//
// The hall is built at DUNGEON_Y, five hundred units above the map. Not for
// tidiness: it means the overworld's monsters, pickups, boats and NPCs are all
// hundreds of units away, so every existing distance check — aggro, interest,
// interaction, the light culler — excludes them for free. There is no "disable
// the overworld" pass to write, and therefore none to get wrong.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { boxMesh, cylMesh, sphereMesh, sharedMat, sharedBox } from '../gfx/meshcache.js';
import { bakeStatic } from '../gfx/bake.js';
import { THEMES } from '../systems/dungeon.js';
import { drawText, textWidth } from '../gfx/signs.js';

/**
 * A LIT PLAQUE OVER A DOORWAY.
 *
 * The stair and the way out were both "a box frame with a glowing disc in it",
 * one of them the way DOWN and the other the way HOME, and nothing on either
 * said which. In a dark room with tight fog, where the minimap is deliberately
 * hidden, the only way to tell them apart was to walk up to one and read the
 * interact prompt — which is exactly why people could not find the exit.
 *
 * The lettering uses the same 5x7 bitmap font the village signboards use, for
 * the same reason: it upscales to crisp blocks, and it does not depend on a
 * webfont having loaded. Painted onto an unlit additive plane so it reads at a
 * distance in a room lit only by braziers.
 */
function buildPlaque(label, color) {
  const scale = 4, pad = 12;
  const w = pad * 2 + textWidth(label) * scale;
  const h = pad * 2 + 7 * scale;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  // a soft dark backing so the letters hold against a bright brazier behind
  ctx.fillStyle = 'rgba(6,4,10,0.72)';
  ctx.fillRect(0, 0, w, h);
  drawText(ctx, label, pad, pad, scale, color);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, toneMapped: false,
  });
  const aspect = w / h;
  const height = 0.62;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
  m.userData.dynamic = true;          // never bake it: it must keep facing us
  return m;
}

/** Far above Anavela. Nothing down there can reach up here, or vice versa. */
export const DUNGEON_Y = 500;
/** Half-width of a hall's floor slab, in world units. */
const HALF = 17;
/** A warden's room is tighter — nowhere to kite, which is the point of it. */
const HALF_WARDEN = 13;
/** A great boss needs room to use its area attacks and for you to leave them. */
const HALF_GREAT = 22;
// TALL WALLS FIGHT THE CAMERA. Semesta looks down over the hero's shoulder, so
// anything above about five units on the near side of the room is standing
// between you and your own character. At nine the near wall simply covered the
// bottom of the view. The room is closed by the dark above it and by fog, not by
// building higher — which is the trade every top-down dungeon makes.
const WALL_H = 4.6;
/**
 * THE ROOM IS A REGULAR OCTAGON, described by ONE number: the apothem, the
 * distance from the middle to the middle of any face. Every other quantity --
 * the side length, the corner radius, where collision stops -- is derived from
 * it, which is the whole reason the walls can no longer disagree with the
 * collision or with each other.
 *
 * There used to be a CHAMFER knob that pulled the four diagonal faces closer in
 * than the four flats. It produced an irregular eight-sided shape nobody had
 * measured: at 0.30 you could walk to 16.05 along the axes but only 13.30 on
 * the diagonals, so the playable area was a plus-sign rather than a room. A
 * regular octagon reaches the same distance in all eight directions, which is
 * what a room is supposed to do.
 */
export const apothem = (half) => half + 0.7;

export function halfFor(kind) {
  return kind === 'warden' ? HALF_WARDEN : kind === 'great' ? HALF_GREAT : HALF;
}

// ---------------------------------------------------------------------------
// GEOMETRY
// ---------------------------------------------------------------------------

/** A flagged floor slab: real courses, not one flat plane. */
/**
 * True inside the octagon, with `pad` of margin. The room's real shape.
 *
 * Derived from where buildWalls actually PUTS the faces, not from a tidy guess.
 * A first version used half*(2-CHAMFER) as the diagonal limit, which is far
 * looser than the real chamfer wall: measured, you could stand at the cut
 * corner and walk straight through it. Collision has to be read off the same
 * numbers the geometry is built from or the two drift apart silently.
 *
 * ONE PAD WAS DOING TWO DIFFERENT JOBS, and that is the invisible wall people
 * kept walking into. The flats and the chamfers are seated at different radii,
 * so a single `pad` cannot leave the same clearance at both: measured on a hall
 * you were stopped **1.3 units short of the stone on the axes** -- with 0.7 of
 * lit floor tile still ahead of you that you simply could not stand on -- while
 * on the diagonals you were flush against it. Floor you can see and cannot walk
 * on IS a wall; it is just an invisible one, which is worse.
 *
 * `diagPad` defaults to `pad` so the tile and prop callers are unchanged; only
 * collision passes both, each derived from its own plinth face.
 */
function insideRoom(x, z, half, pad = 0) {
  // A regular octagon with apothem A is exactly these three constraints. One
  // pad now leaves the SAME clearance on all eight faces, which the old
  // two-radius shape made impossible -- it needed a second pad to stop you
  // being held 1.3 units off the stone on the axes and flush against it on the
  // diagonals, and even then the two edges never matched.
  const A = apothem(half) - pad;
  if (A <= 0) return false;
  if (Math.abs(x) > A || Math.abs(z) > A) return false;
  return Math.abs(x) + Math.abs(z) <= A * Math.SQRT2;
}

/** A flagged floor: real courses, a border band and an inlaid centre. */
function buildFloor(g, half, t) {
  // THE BED SITS FULLY BELOW THE TILES. It used to span -0.33..-0.03 while the
  // tiles spanned -0.13..0.09, so the two solids overlapped and the shared
  // surfaces flickered against each other as the camera moved. That is the
  // "kedip-kedip" — z-fighting, not a texture problem.
  // wide enough to reach under the CORNERS, not just the faces: a regular
  // octagon's vertices sit at A / cos(PI/8), about 8% further out than its
  // apothem, and a bed cut to the apothem leaves eight triangles of nothing
  const bed = boxMesh(half * 2 + 5, 0.5, half * 2 + 5, shade(t.wall, 0.8));
  // Top at -0.20, a clear 0.07 BELOW the tiles underside at -0.13. Ending it
  // exactly level with them would leave two coplanar faces, and coplanar is
  // precisely what z-fighting needs — "touching" is not "separated".
  bed.position.y = -0.45;                     // top at -0.13, the tiles' underside
  bed.receiveShadow = true;
  g.add(bed);

  const step = 2.4;
  const n = Math.ceil((half * 2) / step);
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const x = -half + step * (ix + 0.5), z = -half + step * (iz + 0.5);
      if (!insideRoom(x, z, half, 0.4)) continue;
      const r = Math.hypot(x, z);
      // three courses rather than a checkerboard: an inlaid medallion at the
      // centre, a plain field, and a darker border band at the wall line. A
      // floor with a middle has somewhere to stand and fight over.
      const inner = r < 4.2;
      const border = !insideRoom(x, z, half, 3.4);
      // A 10% checker step is invisible from the game camera -- the floor read
      // as one flat grid, which is most of what "terlalu sederhana" was. The
      // step is 22% now, and one flag in seven is a WORN one, dressed darker,
      // picked deterministically so the pattern is the same on every machine.
      const worn = ((ix * 7 + iz * 13) % 7) === 0;
      const col = inner ? shade(t.trim, 0.75)
        : border ? shade(t.floor, 0.8)
          : worn ? shade(t.floor, 0.72)
            : ((ix + iz) % 2 === 0 ? shade(t.floor, 0.9) : shade(t.floor, 1.12));
      const f = boxMesh(step - 0.22, 0.22, step - 0.22, col);
      f.position.set(x, -0.02, z);
      f.receiveShadow = true;
      g.add(f);
    }
  }

  // the medallion's ring, sitting proud of the flags so it catches the light
  const ring = cylMesh(4.5, 4.5, 0.06, t.trim, 8);
  ring.position.y = 0.11;
  g.add(ring);
  const eye = cylMesh(1.15, 1.15, 0.08, shade(t.accent, 0.55), 8);
  eye.position.y = 0.13;
  g.add(eye);
}

function shade(hex, mul) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(mul);
  return `#${c.getHexString()}`;
}

/**
 * AN EIGHT-SIDED HALL, and this time it is actually an octagon.
 *
 * THE DOUBLE WALL AT THE CORNERS WAS A GEOMETRY BUG, not a style choice. Each
 * face was placed on its own plane and then given an ARBITRARY length: the four
 * flats got `half * 1.5` and the four chamfers `half * CHAMFER * 2.5`. Neither
 * has anything to do with where the faces actually meet. Measured on a hall,
 * against the true vertices of the polygon those eight planes describe:
 *
 *     flat side    true 8.46   built 25.50   3.02x too long
 *     chamfer side true 19.05  built  8.50   0.45x, less than half
 *
 * So every flat overhung its corner by nine units while the chamfer beside it
 * fell four units short of meeting it — and because the chamfer plane also sat
 * closer in, you saw the short slab in front and the overhanging flat behind it
 * at a different depth. Two walls, one corner, no join. That is the "tembok
 * penghalang double di sisi ujung-ujungnya", and it is also most of why the
 * room read as crude: the walls never actually enclosed anything.
 *
 * It is a REGULAR octagon now — one apothem for all eight faces — so the shape
 * is described by a single number and the sides cannot drift apart again. The
 * side length is derived, never chosen: `2 * A * tan(PI/8)`.
 *
 * On top of the fix, the architecture the room was missing. A face is now a
 * plinth, the wall, a string course at mid height, a blind arcade of two
 * stepped arches, and a cornice; the eight corners carry engaged PILASTERS with
 * a base and a capital, which is what a real octagonal hall does and which also
 * puts something deliberate on the join instead of a seam.
 */
function buildWalls(g, half, t) {
  const A = apothem(half);
  const SIDES = 8;
  const SIDE_L = 2 * A * Math.tan(Math.PI / SIDES);   // derived, never chosen
  const VERT = A / Math.cos(Math.PI / SIDES);         // corner radius

  for (let i = 0; i < SIDES; i++) {
    // NO offset: this puts the four FLAT faces on the axes (0/90/180/270) and
    // the four chamfers on the diagonals. The stair and the way out sit on the
    // -Z and +Z flats, so a door is always centred on a wall rather than
    // straddling a cut corner, and the alcoves land on the diagonals.
    const a = (i / SIDES) * Math.PI * 2;
    const cx = Math.cos(a), cz = Math.sin(a);
    const diag = i % 2 === 1;
    // a hair of overlap at each end so the joins never show a hairline gap
    const L = SIDE_L + 0.5;

    const put = (w, h, dep, col, y, out, side = 0) => {
      const m = boxMesh(w, h, dep, col);
      m.position.set(cx * (A + out) - Math.sin(a) * side, y, cz * (A + out) + Math.cos(a) * side);
      m.rotation.y = -a + Math.PI / 2;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };

    // EIGHT PLANES PAINTED ONE COLOUR READ AS ONE PLANE. Faceted geometry is
    // legible because each face catches the light differently; with a single
    // flat tone the octagon collapsed into a continuous tan band and the room
    // looked like a tub. A small deterministic step per side (0.94 / 1.00 /
    // 1.06) is enough for the eye to count the faces, and costs no meshes.
    const faceTone = 1 + ((i % 3) - 1) * 0.06;
    const faceCol = shade(t.wall, faceTone);
    put(L, 0.55, 1.5, shade(t.wall, 1.25 * faceTone), 0.27, 0);   // plinth
    put(L, WALL_H, 1.0, faceCol, WALL_H / 2 + 0.4, 0.2);          // the wall
    // two coursing bands: stone laid in courses, not poured as a slab
    put(L, 0.14, 1.06, shade(t.wall, faceTone * 0.86), WALL_H * 0.32, 0.19);
    put(L, 0.14, 1.06, shade(t.wall, faceTone * 0.86), WALL_H * 0.86, 0.19);
    // A BLIND ARCADE. One flat recessed rectangle per face read as a panel;
    // two arched recesses read as a wall somebody built. The heads are stepped
    // rather than curved because every other surface in this game is pixel art
    // and a smooth arc beside a blocky one looks like a mistake.
    const bays = diag ? 2 : 1;
    const bayW = Math.min(2.6, (SIDE_L - 1.2) / bays);
    if (bayW > 1.1) {
      for (let b = 0; b < bays; b++) {
        const off = (b - (bays - 1) / 2) * (bayW + 0.9);
        const H = WALL_H * 0.52;
        // deep and dark, or it is a painted rectangle rather than a hole
        put(bayW, H, 0.3, shade(t.wall, 0.34), 0.55 + H / 2, -0.42, off);
        // three shortening courses make the head read as an arch
        for (let k = 0; k < 3; k++) {
          put(bayW - 0.28 * (k + 1), 0.2, 0.3, shade(t.wall, 0.42),
            0.55 + H + 0.1 + k * 0.2, -0.42, off);
        }
        // a lit reveal down each jamb, so the recess has an edge to catch
        for (const sx of [-1, 1]) {
          put(0.16, H + 0.5, 0.34, shade(t.wall, faceTone * 1.3),
            0.55 + (H + 0.5) / 2, -0.3, off + sx * (bayW / 2 + 0.08));
        }
      }
    }
    put(L, 0.26, 1.22, shade(t.trim, 0.9), WALL_H * 0.62, 0.02);   // string course
    put(L, 0.42, 1.35, t.trim, WALL_H + 0.6, 0);                    // cornice

    // ALCOVES on the chamfers only: a lit niche is worth more than eight of
    // them, and putting them on the diagonals means they never fight a door.
    if (diag) {
      const niche = boxMesh(1.5, 2.1, 0.4, '#0a0810');
      niche.position.set(cx * (A - 0.32), 1.6, cz * (A - 0.32));
      niche.rotation.y = -a + Math.PI / 2;
      g.add(niche);
      const arch = boxMesh(1.9, 0.3, 0.6, t.trim);
      arch.position.set(cx * (A - 0.3), 2.8, cz * (A - 0.3));
      arch.rotation.y = -a + Math.PI / 2;
      g.add(arch);
    }
  }

  // ---- ENGAGED PILASTERS ON THE EIGHT CORNERS ----
  // A corner is where two planes meet at 135 degrees; left bare it is a seam.
  // A pilaster is what actually stands there in a stone hall, and it turns the
  // join into the thing you were meant to be looking at.
  for (let i = 0; i < SIDES; i++) {
    const a = ((i + 0.5) / SIDES) * Math.PI * 2;        // halfway between faces
    const px = Math.cos(a) * (VERT - 0.35), pz = Math.sin(a) * (VERT - 0.35);
    const base = boxMesh(1.15, 0.7, 1.15, shade(t.trim, 0.82));
    base.position.set(px, 0.35, pz); base.rotation.y = -a;
    const shaft = boxMesh(0.9, WALL_H + 0.5, 0.9, shade(t.wall, 1.12));
    shaft.position.set(px, 0.7 + (WALL_H + 0.5) / 2, pz); shaft.rotation.y = -a;
    const collar = boxMesh(1.02, 0.18, 1.02, shade(t.trim, 0.95));
    shaft.receiveShadow = true;
    collar.position.set(px, WALL_H * 0.62, pz); collar.rotation.y = -a;
    const cap = boxMesh(1.28, 0.5, 1.28, t.trim);
    cap.position.set(px, WALL_H + 1.35, pz); cap.rotation.y = -a;
    g.add(base, shaft, collar, cap);
  }
}

/** A brazier: bowl, coals and a real flame that flickers on its own phase. */
function buildBrazier(t, seed) {
  const b = new THREE.Group();
  const post = cylMesh(0.26, 0.34, 1.5, t.trim, 8);
  post.position.y = 0.75;
  b.add(post);
  const bowl = cylMesh(0.72, 0.44, 0.44, shade(t.trim, 0.8), 10);
  bowl.position.y = 1.65;
  b.add(bowl);
  const flame = new THREE.Group();
  flame.position.y = 1.9;
  // three tongues at different heights and phases — one blob reads as a bulb
  for (let i = 0; i < 3; i++) {
    const f = cylMesh(0.02, 0.2 - i * 0.05, 0.5 + i * 0.22, i === 0 ? '#fff2c0' : t.accent, 6,
      { unique: true, opacity: 0.9 });
    f.material.transparent = true;
    f.material.blending = THREE.AdditiveBlending;
    f.material.depthWrite = false;
    f.position.y = 0.25 + i * 0.1;
    f.userData.phase = seed * 2.1 + i * 1.7;
    flame.add(f);
  }
  flame.userData.dynamic = true;
  b.add(flame);
  // Reach matters more than brightness here: at 16 units a brazier lit its own
  // plinth and nothing else, so the room between them stayed black.
  const light = new THREE.PointLight(t.light, 2.4, 30, 2);
  light.position.y = 2.1;
  b.add(light);
  b.userData = { flame, light, seed };
  return b;
}

/** The stair down. Sealed until the hall is clear — that IS the floor's lock. */
function buildStair(t) {
  const g = new THREE.Group();
  const frame = boxMesh(4.4, 5.2, 0.9, t.trim);
  frame.position.y = 2.6;
  g.add(frame);
  const mouth = boxMesh(3.0, 3.9, 1.2, '#08060a');
  mouth.position.set(0, 2.1, 0.05);
  g.add(mouth);
  // the seal: a slab of stone with the band's glyph cut into it, which lifts
  const seal = boxMesh(3.0, 3.9, 0.5, shade(t.wall, 1.35), { unique: true });
  seal.position.set(0, 2.1, 0.35);
  seal.userData.dynamic = true;
  g.add(seal);
  const rune = cylMesh(0.9, 0.9, 0.12, t.accent, 6, { unique: true });
  rune.material.transparent = true;
  rune.material.blending = THREE.AdditiveBlending;
  rune.material.depthWrite = false;
  rune.rotation.x = Math.PI / 2;
  rune.position.set(0, 2.1, 0.66);
  rune.userData.dynamic = true;
  g.add(rune);
  // the light behind it, which only burns once the way is open
  const glow = new THREE.PointLight(t.accent, 0, 12, 2);
  glow.position.set(0, 2.2, 1.2);
  g.add(glow);
  // says what it is, and only lights up once it will actually take you
  // WELL CLEAR OF THE SEAL'S TRAVEL. The slab grinds up to y 6.7 (spanning
  // 4.75-8.65) and its z range is 0.10-0.60, so a plaque at z 0.7 was sliced in
  // half by it the moment the way opened — "DESCEND" read "DESCE". Sitting it
  // forward at 1.3 also leaves room for the billboard to swing without a corner
  // clipping back through the stone.
  const plaque = buildPlaque('DESCEND', '#ffe9a8');
  plaque.position.set(0, 5.55, 1.3);
  plaque.material.opacity = 0.28;                 // dim while the way is sealed
  g.add(plaque);
  g.userData = { seal, rune, glow, plaque, open: false, t: 0 };
  return g;
}

/**
 * The way back to Anavela. Always open — nobody is locked in.
 *
 * IT HAS TO LOOK NOTHING LIKE THE STAIR. Both used to be a frame with a glowing
 * disc, in a dark room, with no label — so "how do I get out of here" was a
 * fair question and the answer was to walk up to each one and read the prompt.
 * This is now unmistakably a doorway home: a wider arch, a warm daylight pane
 * rather than a cold rune, a step up to it, and DAYLIGHT written over it.
 */
function buildExit(t) {
  const g = new THREE.Group();
  const arch = boxMesh(4.6, 5.2, 0.8, t.trim);
  arch.position.y = 2.6;
  g.add(arch);
  // a step, so it reads as somewhere you walk INTO rather than a wall panel
  const step = boxMesh(3.4, 0.32, 1.5, shade(t.wall, 1.25));
  step.position.set(0, 0.16, 0.95);
  g.add(step);
  // the pane of daylight — warm, because everything else down here is not
  const pane = boxMesh(2.9, 3.6, 0.12, '#ffe6b0', { unique: true });
  pane.material.transparent = true;
  pane.material.opacity = 0.5;
  pane.material.blending = THREE.AdditiveBlending;
  pane.material.depthWrite = false;
  pane.position.set(0, 2.1, 0.42);
  pane.userData.dynamic = true;
  g.add(pane);
  const swirl = cylMesh(1.25, 1.25, 0.14, '#fff0cc', 12, { unique: true });
  swirl.material.transparent = true;
  swirl.material.opacity = 0.7;
  swirl.material.blending = THREE.AdditiveBlending;
  swirl.material.depthWrite = false;
  swirl.rotation.x = Math.PI / 2;
  swirl.position.set(0, 2.1, 0.56);
  swirl.userData.dynamic = true;
  g.add(swirl);
  const light = new THREE.PointLight('#ffd79a', 1.6, 16, 2);
  light.position.set(0, 2.2, 1.2);
  g.add(light);
  const plaque = buildPlaque('WAY OUT', '#fff0cc');
  plaque.position.set(0, 5.75, 1.3);              // matched to the stair's, so both read the same
  g.add(plaque);
  g.userData = { swirl, pane, light, plaque };
  return g;
}

/**
 * PILLARS — the single biggest thing an empty room was missing.
 *
 * Walls define where a room ENDS; pillars are what make it feel like it has an
 * inside. They also give the fight geometry: something to break line of sight
 * on, to put between you and a ranged monster, to circle a boss around. A flat
 * open box is the same fight from every position in it.
 *
 * Four of them, set inside the chamfers so they frame the middle without ever
 * standing in a doorway. Each is a base, a tapered shaft with a carved band, a
 * capital, and a hanging chain-brazier above.
 */
function buildPillar(t, half, a) {
  const g = new THREE.Group();
  const H = 5.6;
  const base = cylMesh(0.62, 0.78, 0.5, shade(t.trim, 0.85), 8);
  base.position.y = 0.25;
  const shaft = cylMesh(0.42, 0.54, H, t.wall, 8);
  shaft.position.y = 0.5 + H / 2;
  // a carved band two thirds up: one detail at the right height stops a
  // cylinder reading as a pipe
  const band = cylMesh(0.5, 0.5, 0.34, t.trim, 8);
  band.position.y = 0.5 + H * 0.66;
  const cap = cylMesh(0.8, 0.5, 0.42, shade(t.trim, 0.9), 8);
  cap.position.y = 0.5 + H + 0.2;
  g.add(base, shaft, band, cap);
  // rubble collected at the foot, so it looks stood rather than placed
  for (let i = 0; i < 3; i++) {
    const r = boxMesh(0.3 + i * 0.12, 0.2, 0.26, shade(t.wall, 1.2));
    const ra = a + (i - 1) * 0.9;
    r.position.set(Math.cos(ra) * 0.85, 0.1, Math.sin(ra) * 0.85);
    r.rotation.y = ra;
    g.add(r);
  }
  return g;
}

/**
 * A brazier hung on chains from the dark above.
 *
 * There is no ceiling to hang it from and that is fine — the chains simply run
 * up out of the light, which says "there is more room above you" far better
 * than a lid ever did. It sways, slowly and on its own phase.
 */
function buildHangingLamp(t, seed) {
  const g = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.position.y = 8.4;
  // three chains, drawn as a ladder of small links
  for (let c = 0; c < 3; c++) {
    const ca = (c / 3) * Math.PI * 2;
    for (let i = 0; i < 7; i++) {
      const link = boxMesh(0.055, 0.18, 0.055, shade(t.trim, 0.6));
      link.position.set(Math.cos(ca) * 0.3, -0.28 - i * 0.28, Math.sin(ca) * 0.3);
      pivot.add(link);
    }
  }
  const bowl = cylMesh(0.66, 0.34, 0.36, shade(t.trim, 0.75), 10);
  bowl.position.y = -2.3;
  pivot.add(bowl);
  const fire = new THREE.Group();
  fire.position.y = -2.05;
  for (let i = 0; i < 3; i++) {
    const f = cylMesh(0.02, 0.19 - i * 0.05, 0.46 + i * 0.2, i === 0 ? '#fff2c0' : t.accent, 6,
      { unique: true, opacity: 0.9 });
    f.material.transparent = true;
    f.material.blending = THREE.AdditiveBlending;
    f.material.depthWrite = false;
    f.position.y = 0.2 + i * 0.09;
    f.userData.phase = seed * 3.1 + i * 2.2;
    fire.add(f);
  }
  fire.userData.dynamic = true;
  pivot.add(fire);
  const light = new THREE.PointLight(t.light, 2.0, 26, 2);
  light.position.y = -2.1;
  pivot.add(light);
  pivot.userData.dynamic = true;
  g.add(pivot);
  g.userData = { pivot, fire, light, seed };
  return g;
}

/** Band-specific dressing, so the three depths are not one room recoloured. */
function dressHall(g, half, theme, t, rnd) {
  // ---- shared: pillars and hanging lamps, the room's own interior ----
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const d = half * 0.56;
    const pil = buildPillar(t, half, a);
    pil.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    g.add(pil);
    const lamp = buildHangingLamp(t, i);
    lamp.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    g.add(lamp);
    lamps.push(lamp);
  }

  // ---- banners on the flat walls: cloth breaks a stone room up ----
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) > 0.9) continue;        // leave the two doorways clear
    const d = half + 0.1;
    const cloth = boxMesh(1.5, 3.2, 0.08, shade(t.accent, 0.5));
    cloth.position.set(Math.cos(a) * d, 3.0, Math.sin(a) * d);
    cloth.rotation.y = -a + Math.PI / 2;
    g.add(cloth);
    const rod = boxMesh(1.9, 0.14, 0.16, t.trim);
    rod.position.set(Math.cos(a) * d, 4.65, Math.sin(a) * d);
    rod.rotation.y = -a + Math.PI / 2;
    g.add(rod);
  }

  if (theme === 'stone') {
    // fallen Lanternkeeper masonry, and their dead lamps lying where they fell
    for (let i = 0; i < 9; i++) {
      const r = boxMesh(0.8 + rnd() * 1.5, 0.4 + rnd() * 0.9, 0.8 + rnd() * 1.2, shade(t.wall, 1.25));
      const a = rnd() * 6.28, d = 6 + rnd() * (half - 8);
      r.position.set(Math.cos(a) * d, 0.25, Math.sin(a) * d);
      r.rotation.y = rnd() * 3.14;
      g.add(r);
    }
    for (let i = 0; i < 4; i++) {
      const post = cylMesh(0.13, 0.17, 2.4, shade(t.trim, 0.65), 6);
      const a = rnd() * 6.28, d = 7 + rnd() * (half - 9);
      post.position.set(Math.cos(a) * d, 0.7, Math.sin(a) * d);
      post.rotation.z = 1.1 + rnd() * 0.4;          // snapped and leaning, not standing
      g.add(post);
      const box = boxMesh(0.34, 0.36, 0.34, shade(t.wall, 1.4));
      box.position.set(Math.cos(a) * d + 0.9, 0.18, Math.sin(a) * d);
      g.add(box);
    }
  } else if (theme === 'frost') {
    // ice grown THROUGH the room: columns floor-to-dark, and sheets on the walls
    for (let i = 0; i < 8; i++) {
      const h = 3 + rnd() * 6;
      const col = cylMesh(0.22 + rnd() * 0.3, 0.55 + rnd() * 0.4, h, '#cfeeff', 6,
        { unique: true, opacity: 0.5 });
      col.material.transparent = true;
      const a = rnd() * 6.28, d = 5 + rnd() * (half - 7);
      col.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      col.rotation.z = (rnd() - 0.5) * 0.3;
      g.add(col);
    }
    // frozen spikes bursting up out of the floor
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.18 + rnd() * 0.22, 0.7 + rnd() * 1.4, 5),
        sharedMat('#dff4ff', { unique: true, opacity: 0.72 }));
      sp.material.transparent = true;
      const a = rnd() * 6.28, d = 4 + rnd() * (half - 6);
      sp.position.set(Math.cos(a) * d, 0.35, Math.sin(a) * d);
      sp.rotation.z = (rnd() - 0.5) * 0.5;
      g.add(sp);
    }
  } else {
    // molten seams running across the floor, and cracked slabs heaved up
    for (let i = 0; i < 10; i++) {
      const seam = boxMesh(0.6 + rnd() * 4, 0.05, 0.28, '#ff8a3c', { unique: true });
      seam.material.transparent = true;
      seam.material.opacity = 0.9;
      seam.material.blending = THREE.AdditiveBlending;
      seam.material.depthWrite = false;
      const a = rnd() * 6.28, d = 3 + rnd() * (half - 5);
      seam.position.set(Math.cos(a) * d, 0.15, Math.sin(a) * d);
      seam.rotation.y = rnd() * 3.14;
      g.add(seam);
    }
    for (let i = 0; i < 7; i++) {
      const r = boxMesh(1.4 + rnd() * 1.8, 0.5 + rnd() * 1.2, 1.4 + rnd() * 1.4, '#2a1a16');
      const a = rnd() * 6.28, d = 6 + rnd() * (half - 8);
      r.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d);
      r.rotation.set((rnd() - 0.5) * 0.3, rnd() * 3.14, (rnd() - 0.5) * 0.3);
      g.add(r);
    }
  }
  return lamps;
}

/**
 * DUST IN THE LIGHT. A hall with nothing moving in the air is a diorama. These
 * are additive point-sprites drifting UPWARD on their own speeds — embers in
 * the Ember Core, snow settling in the Frost Crypt, plain dust in the Halls —
 * and they are what make the space read as air rather than as vacuum.
 */
function buildMotes(t, half, theme, budget = 1) {
  const n = Math.round((theme === 'ember' ? 90 : 70) * budget);
  const pos = new Float32Array(n * 3);
  const spd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, d = Math.random() * half;
    pos[i * 3] = Math.cos(a) * d;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = Math.sin(a) * d;
    spd[i] = 0.16 + Math.random() * 0.55;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(theme === 'frost' ? '#dff4ff' : t.accent),
    size: theme === 'ember' ? 0.16 : 0.12,
    transparent: true, opacity: 0.7, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData = { dynamic: true, spd, n, half, down: theme === 'frost' };
  return pts;
}

// ---------------------------------------------------------------------------
// THE HALL
// ---------------------------------------------------------------------------

/**
 * THE GATE, standing in Anavela.
 *
 * It has to read as a way DOWN from a top-down camera, which a hole in the
 * ground does not — from above a hole is a dark circle and dark circles are
 * everywhere. So it is a stair with a lintel over it: the steps descend into
 * shadow, the frame gives it a silhouette against the paving, and the
 * Lanternkeeper glyph over the door says whose door it was.
 */
/**
 * THE GATE IN THE PLAZA, rebuilt.
 *
 * The first one was a slab, two square posts and a lintel — plainly a stack of
 * boxes next to a temple square full of carved stone, and the name stood three
 * metres away on its own signboard so the two never read as one thing. People
 * walked past it.
 *
 * Two changes carry the redesign. THE NAME IS ON THE BUILDING: a lit plaque set
 * into the lintel, so the structure introduces itself instead of being labelled
 * by a post beside it. And the stone is BUILT rather than extruded — stepped
 * plinth courses, pillars that taper in three stages, corbels carrying the
 * lintel, a keystone with the order's mark, hanging chains and two live
 * braziers. Depth here comes from layering boxes, which is this game's whole
 * vocabulary, not from more triangles.
 */
export function buildHollowGate() {
  const g = new THREE.Group();
  const stone = '#3f3a4e';
  const dark = '#2b2739';
  const trim = '#57506c';

  // --- a stepped plinth, so it stands ON the plaza the way the stations do ---
  const courses = [[5.2, 0.22, 4.6], [4.7, 0.20, 4.2], [4.2, 0.18, 3.8]];
  let py = 0;
  for (const [w, h, d] of courses) {
    const c = boxMesh(w, h, d, shade(stone, 1 + (py * 0.5)));
    c.position.y = py + h / 2;
    c.receiveShadow = true;
    g.add(c);
    py += h;
  }

  // --- the descent: four steps down into a mouth that has depth in it -------
  for (let i = 0; i < 4; i++) {
    const st = boxMesh(2.4 - i * 0.12, 0.26, 0.52, shade(stone, 1 - i * 0.17));
    st.position.set(0, py - 0.05 - i * 0.17, 1.0 - i * 0.5);
    g.add(st);
  }
  // the mouth is two boxes: a throat and a darker void behind it, so the hole
  // reads as going somewhere rather than as a black rectangle painted on stone
  const throat = boxMesh(2.3, 1.1, 1.6, '#141020');
  throat.position.set(0, py - 0.1, -0.5);
  g.add(throat);
  const voidBox = boxMesh(1.9, 0.9, 0.6, '#05040a');
  voidBox.position.set(0, py - 0.1, -1.25);
  g.add(voidBox);

  // --- pillars that taper in three stages, with a base and a collar ---------
  for (const sx of [-1, 1]) {
    const foot = boxMesh(0.86, 0.3, 0.94, trim);
    foot.position.set(sx * 1.62, py + 0.15, -0.2);
    g.add(foot);
    const seg = [[0.68, 1.05, 0.76], [0.6, 0.95, 0.68], [0.52, 0.85, 0.6]];
    let sy = py + 0.3;
    for (const [w, h, d] of seg) {
      const b = boxMesh(w, h, d, stone);
      b.position.set(sx * 1.62, sy + h / 2, -0.2);
      b.castShadow = true;
      g.add(b);
      sy += h;
      // a collar between stages catches the light and breaks the taper up
      const collar = boxMesh(w + 0.1, 0.09, d + 0.1, trim);
      collar.position.set(sx * 1.62, sy, -0.2);
      g.add(collar);
    }
    // a corbel bracket carrying the lintel
    const corbel = boxMesh(0.44, 0.3, 0.9, trim);
    corbel.position.set(sx * 1.28, sy + 0.16, -0.2);
    g.add(corbel);
  }

  const LY = py + 0.3 + 2.85;                  // top of the pillars

  // --- the lintel, in two courses with a keystone in the middle -------------
  const lintel = boxMesh(4.1, 0.5, 0.96, stone);
  lintel.position.set(0, LY + 0.42, -0.2);
  lintel.castShadow = true;
  g.add(lintel);
  const cornice = boxMesh(4.5, 0.22, 1.12, trim);
  cornice.position.set(0, LY + 0.78, -0.2);
  g.add(cornice);
  const keystone = boxMesh(0.7, 0.72, 1.06, trim);
  keystone.position.set(0, LY + 0.42, -0.2);
  g.add(keystone);

  // the order's mark, still burning after everything, set into the keystone
  const glyph = cylMesh(0.26, 0.26, 0.08, '#ffb45c', 6, { unique: true });
  glyph.material.transparent = true;
  glyph.material.opacity = 0.85;
  glyph.material.blending = THREE.AdditiveBlending;
  glyph.material.depthWrite = false;
  glyph.rotation.x = Math.PI / 2;
  glyph.position.set(0, LY + 0.42, 0.34);
  glyph.userData.dynamic = true;
  g.add(glyph);

  // --- THE NAME, ON THE BUILDING -------------------------------------------
  // This is the fix for "the writing is off on its own": the plaque is part of
  // the gate, mounted across the lintel, so the two are one object to look at.
  const plaque = buildPlaque('THE HOLLOW', '#e8d8ff');
  plaque.scale.setScalar(1.45);
  plaque.position.set(0, LY + 1.12, 0.1);
  plaque.userData.dynamic = false;             // fixed to the stone, never billboarded
  g.add(plaque);
  const plaqueBack = boxMesh(3.5, 0.62, 0.14, dark);
  plaqueBack.position.set(0, LY + 1.12, -0.02);
  g.add(plaqueBack);

  // --- chains hanging from the corbels --------------------------------------
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const link = boxMesh(0.07, 0.16, 0.07, '#6a627e');
      link.position.set(sx * 1.05, LY + 0.08 - i * 0.2, 0.22);
      link.rotation.y = i * 0.5;
      g.add(link);
    }
  }

  // --- two live braziers, because a dark arch needs something burning -------
  const fires = [];
  for (const sx of [-1, 1]) {
    const bowlLeg = boxMesh(0.18, 0.62, 0.18, trim);
    bowlLeg.position.set(sx * 2.05, py + 0.31, 1.15);
    const bowl = cylMesh(0.36, 0.24, 0.26, dark, 8);
    bowl.position.set(sx * 2.05, py + 0.74, 1.15);
    g.add(bowlLeg, bowl);
    const fire = new THREE.Group();
    fire.position.set(sx * 2.05, py + 0.88, 1.15);
    for (let i = 0; i < 3; i++) {
      const t = cylMesh(0.02, 0.15 - i * 0.03, 0.34 + i * 0.12,
        i === 0 ? '#ffd88a' : i === 1 ? '#ff9a3c' : '#ff6a28', 6, { unique: true });
      t.material.transparent = true;
      t.material.blending = THREE.AdditiveBlending;
      t.material.depthWrite = false;
      t.position.y = 0.17 + i * 0.06;
      t.userData.phase = Math.random() * 6.28;
      t.userData.dynamic = true;
      fire.add(t);
    }
    fire.userData.dynamic = true;
    g.add(fire);
    fires.push({ fire, seed: Math.random() * 10 });
  }

  const light = new THREE.PointLight('#ffb45c', 1.1, 12, 2);
  light.position.set(0, py + 1.6, 0.9);
  g.add(light);

  g.userData = { glyph, light, fires, dynamic: true };
  return g;
}

export function createDungeonWorld(scene, terrain, opts = {}) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  // ==========================================================================
  // ANAVELA IS SWITCHED OFF, NOT MOVED AWAY FROM.
  //
  // The first version stacked the halls five hundred units above the map and
  // called that a separate world. It is not, and every symptom came from the
  // same place: the villagers' nameplates floated in the dark because they
  // were still in the scene, the minimap still drew the overworld, the fog and
  // the sun were still Anavela's, the ambient spawner still seeded the room.
  // Each of those is a different patch and there is always another one.
  //
  // A dungeon is a DIFFERENT PLACE. So entering hides the whole overworld and
  // installs the Hollow's own fog and light, and leaving puts back exactly what
  // was there — nothing else in the game has to know.
  //
  // The set to hide is a SNAPSHOT taken the moment Anavela finished building,
  // rather than a hand-written list of modules. A list has to be maintained,
  // and the day somebody adds a new landmark and forgets it, one building hangs
  // in the void. A snapshot cannot be forgotten. Anything born later — particle
  // bursts, arrows, dropped loot, the hall itself — is simply not in it and
  // keeps working, which matters because the FX systems add loose meshes
  // straight to the scene with no group of their own.
  //
  // Lights are excluded: hiding those would black out the hero as well.
  // ==========================================================================
  const keep = new Set([root, ...(opts.keep || [])]);
  // the portal plaques billboard toward this; without it they sit edge-on to a
  // camera that looks down from thirty units and cannot be read at all
  const camera = opts.camera || null;
  const _pv = new THREE.Vector3();
  const overworld = scene.children.filter((o) => !o.isLight && !keep.has(o));
  const shown = new Map();          // object -> its visibility before we hid it
  let stashedFog = null;
  const stashedLights = new Map();

  function hideOverworld(theme) {
    if (shown.size) return;
    for (const o of overworld) { shown.set(o, o.visible); o.visible = false; }
    stashedFog = scene.fog;
    // The Hollow's own air: the band's colour, and close enough that the far
    // wall fades into it. This is most of what makes a room read as underground.
    // Near/far measured against the CAMERA, which sits about thirty units from
    // the floor it is looking at — not fourteen, because the tilt pushes it back
    // as well as up. At 6/46 the entire room was already sixty per cent fogged
    // toward a near-black colour before anything else dimmed it, which is how a
    // lit hall came out looking like an empty void.
    scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 22, 105);
    scene.background = new THREE.Color(theme.fog);
    for (const o of scene.children) {
      if (!o.isLight || o.isPointLight) continue;
      stashedLights.set(o, { i: o.intensity, c: o.color.getHex() });
      // A dungeon has no sun. What is left is a dim cold bounce so the hero and
      // the monsters are not pure silhouettes, and the braziers do the rest.
      // Intensity carries the darkness; the COLOUR must stay usable. Tinting
      // the ambient to the fog — which is nearly black by design — multiplied
      // every Lambert surface by almost nothing and the room stayed invisible
      // even once the roof was gone.
      // A dungeon should be MOODY, not unreadable. The fires do the character;
      // this is the floor of light that keeps the room legible under them. At
      // 0.75 of a dark brown it was neither — you could not see the walls you
      // were fighting against.
      o.intensity = o.isAmbientLight || o.isHemisphereLight ? 1.45 : 0.7;
      o.color.set(theme.trim);
      if (o.isHemisphereLight && o.groundColor) o.groundColor.set(theme.floor);
    }
  }

  function showOverworld() {
    if (!shown.size) return;
    for (const [o, v] of shown) o.visible = v;
    shown.clear();
    scene.fog = stashedFog;
    scene.background = null;
    for (const [o, s] of stashedLights) { o.intensity = s.i; o.color.setHex(s.c); }
    stashedLights.clear();
  }

  let hall = null;             // the built floor currently in the scene
  let override = null;         // what we installed on `terrain`
  const state = { active: false, half: HALF, theme: 'stone', kind: 'hall', anim: 0 };

  /** Seeded, so the same floor looks the same every time you walk into it. */
  function rngFor(floor, diff) {
    let s = (floor * 9301 + (diff.length * 49297) + 233280) >>> 0;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  function disposeHall() {
    if (!hall) return;
    root.remove(hall);
    hall.traverse((o) => {
      if (o.isMesh) {
        // shared geometry and materials are tagged and must survive — freeing
        // them would take every other object built from the cache with them
        if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.();
        if (o.material && o.material.userData?.owned) o.material.dispose?.();
      }
    });
    hall = null;
  }

  /** Build one floor. Returns where the hero should stand. */
  function buildFloorHall(plan) {
    disposeHall();
    const t = THEMES[plan.theme] || THEMES.stone;
    const half = halfFor(plan.kind);
    const rnd = rngFor(plan.floor, plan.difficulty);
    const g = new THREE.Group();

    buildFloor(g, half, t);
    buildWalls(g, half, t);
    const lamps = dressHall(g, half, plan.theme, t, rnd);
    const motes = buildMotes(t, half, plan.theme);
    motes.position.y = 0;
    g.add(motes);

    // braziers around the room: the only light down here, and the reason the
    // walls read as stone rather than as a flat colour
    const braziers = [];
    // FOUR in the alcoves, on the chamfered corners, so the light comes from
    // somewhere the architecture actually put it -- plus two flanking the
    // stair. Six lamps standing in a circle in the middle of a room is set
    // dressing; lamps in niches is a building.
    const ring = 4;
    for (let i = 0; i < ring; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const b = buildBrazier(t, i);
      b.position.set(Math.cos(a) * (half - 2.4), 0, Math.sin(a) * (half - 2.4));
      braziers.push(b);
      g.add(b);
    }

    const stair = buildStair(t);
    stair.position.set(0, 0, -half - 0.2);
    g.add(stair);

    const exit = buildExit(t);
    exit.position.set(0, 0, half + 0.2);
    exit.rotation.y = Math.PI;
    g.add(exit);

    // THE HALL IS NOT BAKED, and that is deliberate.
    //
    // Baking it looked like an obvious win — a hall is ~250 little boxes and
    // every one is a draw call. What it actually did was DELETE the room. The
    // merge detached the originals and produced nothing in their place, and
    // because the only parts marked dynamic are the flames, the seal and the
    // two portals, those were the only things left: a pitch-black void with six
    // fires burning in it. Measured, the hall was down to 23 meshes and every
    // one of them was a flame colour. No error, no warning, nothing in the
    // console — the geometry simply stopped existing.
    //
    // It is one room at a time, the props are shared-geometry instances
    // already, and the village carries more than this. Correct and unmerged
    // beats fast and invisible; if the draw calls ever matter, the fix is to
    // find out why bake drops these buckets, not to bake blind.
    braziers.forEach((b) => { b.userData.flame.userData.dynamic = true; });

    g.position.set(0, DUNGEON_Y, 0);
    root.add(g);
    hall = g;
    hall.userData = { braziers, lamps, motes, stair, exit, half, theme: plan.theme };

    state.half = half;
    state.theme = plan.theme;
    state.kind = plan.kind;
    return { x: 0, y: DUNGEON_Y, z: half - 3.5 };   // just inside the exit arch
  }

  // -------------------------------------------------------------------------
  // THE TERRAIN OVERRIDE
  //
  // Installed on enter, removed on leave. Only the handful of methods that
  // answer "where is the ground and may I stand on it" are replaced; everything
  // else on the terrain object is untouched, so nothing that reads the world
  // grid for any other reason is disturbed.
  // -------------------------------------------------------------------------
  function installOverride() {
    if (override) return;
    const keep = {
      surfaceY: terrain.surfaceY, walkable: terrain.walkable,
      swimmable: terrain.swimmable, deepWater: terrain.deepWater,
      isWater: terrain.isWater, inOcean: terrain.inOcean, inSnow: terrain.inSnow,
      nearestShore: terrain.nearestShore, inBounds: terrain.inBounds,
      cellOf: terrain.cellOf, typeAt: terrain.typeAt,
    };
    override = keep;

    // The hall is dead flat. That is not laziness: a dungeon floor is a built
    // surface and the whole point of a boss arena is that the ground never
    // decides a fight.
    terrain.surfaceY = () => DUNGEON_Y;
    // Inside the walls, minus a body's width so you cannot clip into masonry.
    // Follows the octagon, not a square: with a box test you could stand inside
    // the chamfered corners, which is outside the visible room.
    //
    // AND THE PILLARS ARE SOLID. Keeping them out of the spawn picker was not
    // enough — measured, a warden's guard walked into one on its own, because
    // the AI only asks whether the ground is walkable and the ground under a
    // pillar was. A monster standing inside stone reads exactly as one that is
    // hiding, and it is one you cannot hit. Collision is the only place this
    // can be fixed once for the player and everything that hunts them.
    // ONE PAD, MEASURED OFF THE PLINTH. Every face is now the same distance
    // out, so a single margin leaves the same clearance everywhere: the plinth
    // is 1.5 deep centred on the apothem, so its inner face is A - 0.75, and
    // 1.1 leaves the hero's body 0.35 against it and no more.
    terrain.walkable = (x, z) => insideRoom(x, z, state.half, 1.1)
      && !nearPillar(x, z, state.half, 1.15);
    // There is no water in the Hollow, and saying so switches off swimming, the
    // boats, the shore rescue and the weather in one line each.
    terrain.swimmable = () => false;
    terrain.deepWater = () => false;
    terrain.isWater = () => false;
    terrain.inOcean = () => false;
    terrain.inSnow = () => false;
    terrain.nearestShore = () => new THREE.Vector3(0, DUNGEON_Y, 0);
    // Everything inside the hall is in bounds; nothing outside it is. This is
    // what keeps main.js's out-of-world rescue from firing five hundred units up.
    terrain.inBounds = () => true;
    terrain.cellOf = () => [0, 0];
    terrain.typeAt = () => 3;                       // stone, for footstep sounds
  }

  function removeOverride() {
    if (!override) return;
    Object.assign(terrain, override);
    override = null;
  }

  function enter(plan) {
    const at = buildFloorHall(plan);
    installOverride();
    hideOverworld(THEMES[plan.theme] || THEMES.stone);
    root.visible = true;
    state.active = true;
    return at;
  }

  function leave() {
    removeOverride();
    showOverworld();
    root.visible = false;
    state.active = false;
    disposeHall();
  }

  /** Re-dress the air when the band changes on the way down. */
  function retheme(plan) {
    const t = THEMES[plan.theme] || THEMES.stone;
    if (scene.fog) scene.fog.color.set(t.fog);
    if (scene.background?.set) scene.background.set(t.fog);
    for (const o of scene.children) {
      if (o.isLight && !o.isPointLight) o.color.set(t.trim);
    }
  }

  /** Lift the seal. Called when the last thing in the hall dies. */
  function openStair() {
    if (!hall) return null;
    hall.userData.stair.userData.open = true;
    return stairSpot();
  }

  const stairSpot = () => hall
    ? { x: 0, y: DUNGEON_Y, z: -hall.userData.half + 2.2 } : null;
  const exitSpot = () => hall
    ? { x: 0, y: DUNGEON_Y, z: hall.userData.half - 2.2 } : null;

  /** A clear spot to put a monster: on the floor, away from both doors. */
  function spawnPoint(rnd = Math.random) {
    const half = state.half;
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * (half - 3) * 2;
      const z = (rnd() - 0.5) * (half - 3) * 2;
      // keep them off the arrival pad so nothing is standing on you when you land
      if (Math.hypot(x - 0, z - (half - 3.5)) < 6) continue;
      // NOTHING SPAWNS INSIDE A PILLAR. I added four of them for the fight to
      // have geometry and forgot that this picker predates them, so a monster
      // could arrive standing in solid stone — which from the camera reads
      // exactly as "it is hiding" and, worse, as one you cannot hit.
      if (nearPillar(x, z, half, 1.5)) continue;
      // and inside the OCTAGON, not the square it is inscribed in: the cut
      // corners are wall now, so a spawn there is a monster in the masonry
      if (!insideRoom(x, z, half, 1.6)) continue;
      return { x, y: DUNGEON_Y, z };
    }
    // Last resort is the middle of the floor rather than (0,0) blindly: it is
    // always inside the room, always clear of the pillars, and always somewhere
    // you can reach.
    return { x: 0, y: DUNGEON_Y, z: 0 };
  }

  /** The four pillars sit on the diagonals at 0.56 of the half-width. */
  function nearPillar(x, z, half, pad = 1.2) {
    const d = half * 0.56;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      if (Math.hypot(x - Math.cos(a) * d, z - Math.sin(a) * d) < pad) return true;
    }
    return false;
  }

  function update(dt, time) {
    if (!state.active || !hall) return;
    state.anim += dt;
    const u = hall.userData;
    // flames: each tongue on its own phase and its own rhythm, so the brazier
    // never pulses as one object — the same rule the lanterns follow above
    for (const b of u.braziers) {
      const f = b.userData.flame;
      const s = b.userData.seed;
      for (const tongue of f.children) {
        const p = tongue.userData.phase;
        const k = 0.8 + Math.sin(time * 7.3 + p) * 0.16 + Math.sin(time * 17.1 + p * 2.3) * 0.08;
        tongue.scale.set(1, k, 1);
        tongue.material.opacity = 0.72 + Math.sin(time * 11 + p) * 0.2;
      }
      b.userData.light.intensity = 1.35 + Math.sin(time * 6.1 + s) * 0.22
        + Math.sin(time * 15.7 + s * 1.7) * 0.1;
    }
    // hanging lamps: each swings on its own phase and its own axis, so four of
    // them never look like one object nodding in time
    for (const l of u.lamps || []) {
      const p = l.userData.pivot, sd = l.userData.seed;
      p.rotation.z = Math.sin(time * 0.55 + sd * 1.7) * 0.055;
      p.rotation.x = Math.cos(time * 0.42 + sd * 2.3) * 0.045;
      for (const f of l.userData.fire.children) {
        const ph = f.userData.phase;
        f.scale.set(1, 0.82 + Math.sin(time * 8.1 + ph) * 0.17, 1);
        f.material.opacity = 0.7 + Math.sin(time * 12 + ph) * 0.22;
      }
      l.userData.light.intensity = 1.9 + Math.sin(time * 5.3 + sd) * 0.25;
    }
    // dust rising through the light, each speck on its own speed, wrapping at
    // the top so the column never empties
    if (u.motes) {
      const a = u.motes.geometry.attributes.position;
      const { spd, n, half: hh, down } = u.motes.userData;
      for (let i = 0; i < n; i++) {
        let y = a.array[i * 3 + 1] + (down ? -1 : 1) * spd[i] * dt;
        if (down && y < 0) y = 8;
        if (!down && y > 8) y = 0;
        a.array[i * 3 + 1] = y;
        a.array[i * 3] += Math.sin(time * 0.4 + i) * dt * 0.16;
      }
      a.needsUpdate = true;
    }

    // the seal: grinds upward once the hall is clear, and the rune turns
    const st = u.stair.userData;
    st.t += dt * (st.open ? 0.7 : 0);
    const lift = Math.min(1, st.t);
    st.seal.position.y = 2.1 + lift * 4.6;
    st.rune.rotation.z += dt * (st.open ? 2.2 : 0.35);
    st.rune.material.opacity = st.open ? 0.9 : 0.25 + Math.sin(time * 2) * 0.06;
    st.glow.intensity = lift * 1.6;
    // DESCEND only lights up when it will actually take you, so the sign is
    // telling you the truth about whether the floor is finished
    st.plaque.material.opacity = 0.26 + lift * 0.74;
    // the way home turns slowly the whole time
    const ex = u.exit.userData;
    ex.swirl.rotation.z -= dt * 0.9;
    ex.swirl.material.opacity = 0.62 + Math.sin(time * 1.7) * 0.12;
    ex.pane.material.opacity = 0.42 + Math.sin(time * 1.1) * 0.09;
    ex.light.intensity = 1.5 + Math.sin(time * 1.4) * 0.22;
    // BOTH PLAQUES FACE THE CAMERA. A flat label on a wall is unreadable from
    // the angle you actually approach it — the camera looks down from ~30 units
    // and the arches sit against the walls, so a fixed plane is edge-on for
    // most of the room. Billboarding is what makes them legible from anywhere.
    if (camera) {
      for (const p of [st.plaque, ex.plaque]) {
        p.getWorldPosition(_pv);
        p.lookAt(camera.position.x, _pv.y, camera.position.z);
      }
    }
  }

  function dispose() {
    removeOverride();
    disposeHall();
    scene.remove(root);
  }

  return {
    state, enter, leave, retheme, update, openStair, nearPillar, stairSpot, exitSpot, spawnPoint,
    dispose, DUNGEON_Y, halfFor,
    isActive: () => state.active,
  };
}
