// ITEM SHOWCASE — the pulled prize, in 3D, turning.
//
// The gacha reveal used to enlarge the item's 16-pixel bag icon. At the size a
// reveal card wants it, a 16px sprite is sixteen fat squares: it tells you
// nothing about the thing you just won, and it is the same picture whether the
// pull was a common tonic or a mythic blade. The one moment the game has your
// full attention was spending it on a scaled-up thumbnail.
//
// So the reveal now builds the ACTUAL object — the same weapon mesh the hand
// holds, the same cosmetic the head wears — and turns it under a rarity-tinted
// light. Nothing here is new art; it is the art the game already had, finally
// shown at a size where the work on it is visible.
//
// One renderer, created on first reveal and reused. Weapons and wearables are
// the only things worth this: a stack of forge stones has no model, and the
// icon is the honest picture of it.
import * as THREE from 'three';
import { ITEMS, RARITY } from '../systems/items.js';
import { buildCosmetic } from '../systems/cosmetics.js';
import { buildCharacterMesh } from '../entities/player.js';
import { disposeObject } from '../util/dispose.js';
import { SHARED } from '../gfx/meshcache.js';

let ctx = null;

const TILT = 0.26;   // ~15 degrees of look-down; enough to open a ring up

// The scratch rig exists only to be armed and stripped, so its looks are
// irrelevant -- but buildCharacterMesh indexes into the option tables, so the
// values have to be in range.
const scratchLook = {
  name: '', cls: 'warrior', gender: 0, skin: 0, hair: 0, hairColor: 0,
  eyes: 0, face: 0, outfit: 0, outfitColor: 0, cape: -1,
};

function ensure() {
  if (ctx) return ctx;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 320;
  canvas.className = 'g-3d';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
  cam.position.set(0, 0, 2.6);
  cam.lookAt(0, 0, 0);   // dead-on, so the fit maths in showItem is exact
  scene.add(new THREE.HemisphereLight(0xffffff, 0x30303a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.8, 2.4, 2.2);
  const rim = new THREE.DirectionalLight(0xffffff, 2.6); rim.position.set(-1.6, 0.8, -2.2);
  scene.add(key, rim);
  // TWO GROUPS, NOT ONE. Flat pieces -- a halo, a wreath, a crown's ring -- are
  // invisible edge-on, and a single group spinning about Y presents every one of
  // them edge-on twice a turn: the Radiant Halo rendered as a horizontal LINE.
  // The fix is the oldest rule in product photography, a 3/4 view: look down on
  // the subject a little. `tilt` is fixed and `spinner` turns inside it, so the
  // object still rotates about its own vertical axis and a ring always reads as
  // an ellipse. Setting both angles on one object instead would make the tilt
  // wobble as the spin swept through it.
  const tilt = new THREE.Group();
  tilt.rotation.x = TILT;
  const pivot = new THREE.Group();
  tilt.add(pivot);
  scene.add(tilt);
  ctx = { canvas, renderer, scene, cam, key, rim, tilt, pivot, raf: 0, spin: 0, alive: false };
  return ctx;
}

/**
 * Free `root`'s GPU resources, except anything `keep` still references.
 *
 * The throwaway rig has to be thrown away -- measured, 60 reveals leaked 20 MB
 * of JS heap plus a fresh blade CanvasTexture each time, because nothing was
 * ever disposed. But it cannot simply be handed to disposeObject: player.js
 * builds its materials with a local `lam()` that neither caches nor carries the
 * SHARED tag, so `goldMat` and friends are ONE instance used by both the body
 * and the weapon still on display. Disposing the body would pull the material
 * out from under the piece the player is looking at.
 */
function disposeExcept(root, keep) {
  const keptGeo = new Set(), keptMat = new Set(), keptTex = new Set();
  keep?.traverse((o) => {
    if (o.geometry) keptGeo.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      keptMat.add(m);
      if (m.map) keptTex.add(m.map);
    }
  });
  root.traverse((o) => {
    if (o.geometry && !o.geometry[SHARED] && !keptGeo.has(o.geometry)) o.geometry.dispose();
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      if (m[SHARED] || keptMat.has(m)) continue;
      if (m.map && !keptTex.has(m.map)) m.map.dispose();
      m.dispose();
    }
  });
}

/** Does this id have a real model worth turning, or only an icon? */
export function hasModel(id) {
  const d = ITEMS[id];
  if (!d) return false;
  return !!(d.weapon || d.cosmetic === 'hat' || d.cosmetic === 'back');
}

/**
 * Build `id` into the showcase and start it turning.
 * @returns the canvas, already sized, for the caller to place in the DOM.
 */
export function showItem(id, rarity) {
  const c = ensure();
  // clear whatever was in there -- and FREE it. Everything the outgoing piece
  // references is its own by now (its rig was disposed around it when it was
  // built), so a plain disposal is right; meshcache's SHARED tag protects the
  // cosmetics that do use pooled materials.
  for (let i = c.pivot.children.length - 1; i >= 0; i--) {
    const old = c.pivot.children[i];
    c.pivot.remove(old);
    disposeObject(old, true);
  }

  const d = ITEMS[id];
  let obj = null;
  try {
    if (d?.weapon) {
      // player.js has no standalone weapon builder -- the mesh is assembled
      // inside the rig's setWeapon and parented to a HAND. Rather than fork that
      // code (two builders for one weapon is how they drift apart), build a
      // throwaway rig, arm it, and lift the tagged groups off it.
      //
      // BOTH HANDS, and this is not defensive coding: a BOW goes to handL only,
      // a dagger pair and a Fighter's wraps put one piece in each. Reading
      // handR alone would have silently shown nothing for every bow in the game
      // and half of every pair -- and `hasModel` would still have said yes, so
      // the card would have been an empty lit box.
      const rig = buildCharacterMesh(scratchLook);
      rig.setWeapon(id);
      rig.group.updateMatrixWorld(true);   // rig is a plain object; the Object3D is .group
      const held = [];
      for (const hand of [rig.parts.handR, rig.parts.handL]) {
        for (const o of [...hand.children]) {
          if (!o.userData.isWeapon) continue;
          // bake the hand's world transform in, so a pair keeps the spacing it
          // is actually held at instead of collapsing onto one origin
          o.applyMatrix4(hand.matrixWorld);
          hand.remove(o);
          held.push(o);
        }
      }
      if (held.length === 1) obj = held[0];
      else if (held.length > 1) { obj = new THREE.Group(); for (const h of held) obj.add(h); }
      // the rest of the hero was scaffolding; it goes now, sparing whatever the
      // weapon we just lifted still points at
      disposeExcept(rig.group, obj);
    } else if (d?.cosmetic === 'hat' || d?.cosmetic === 'back') {
      obj = buildCosmetic(id)?.mesh || null;
    }
  } catch (err) {
    // A silent catch here is how six cosmetics once shipped unwearable: the
    // build throws, the caller sees a tidy null, and nothing anywhere says why.
    console.warn('[itemshow] could not build', id, err);
    obj = null;
  }
  if (!obj) return null;

  // A weapon reads best held at a slight lean, not stood bolt upright. The lean
  // goes on the OBJECT, not on the spinning pivot, so the box measured below
  // already includes it and the fit maths stays exact.
  obj.rotation.z = d?.weapon ? 0.42 : 0;

  // FRAME IT BY ITS OWN SIZE, AND FIT IT FOR EVERY ANGLE IT WILL TURN THROUGH.
  // A dagger and a two-handed axe are wildly different lengths, so a fixed
  // camera makes one fill the frame and the other a speck. But scaling the
  // longest axis to a constant is not enough either: the frame is only 1.43
  // units tall at the subject's depth, so "longest = 1.5" was over-sizing
  // EVERYTHING, and a chunky cloak spun round to its diagonal and burst out of
  // the box -- measured at 93% of the frame lit.
  //
  // The pivot only ever turns about Y, so the horizontal extent at the worst
  // angle is the diagonal of the x/z footprint, and the vertical extent never
  // changes. Fit both and take the smaller.
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const centre = new THREE.Vector3(); box.getCenter(centre);
  obj.position.sub(centre);

  // The camera is PERSPECTIVE, so the frame is narrower closer in -- and the
  // half of the object that swings toward the lens is exactly the part that
  // clips. Fitting against the frame size at the pivot plane ignored that and
  // cut the corner off 15 of 102 pieces. Solve it at the NEAREST depth the
  // object can ever reach, which under a Y spin is the spin radius:
  //
  //   half-frame at that depth = T * (camZ - s*R)
  //   need  s*H/2 <= M*T*(camZ - s*R)   and   s*R <= M*T*(camZ - s*R)
  //
  // Both are linear in s, so there is a closed form and no iteration.
  const T = Math.tan((c.cam.fov * Math.PI / 180) / 2);
  const camZ = c.cam.position.z;
  const M = 0.86;                                    // room for the idle bob
  const R = Math.hypot(size.x, size.z) / 2 || 1e-3;  // spin radius, model units
  const H = size.y || 1e-3;
  // ...and the tilt above leans the whole silhouette, which makes it taller and
  // deeper, so the extents are taken AFTER it rather than before.
  const ca = Math.cos(TILT), sa = Math.sin(TILT);
  const halfH = (H / 2) * ca + R * sa;      // worst vertical half-extent
  const halfW = R;                          // the tilt is about X; width is free
  const depth = (H / 2) * sa + R * ca;      // nearest approach to the lens
  const s = Math.min(
    M * T * camZ / (halfH + M * T * depth),   // top and bottom stay in frame
    M * T * camZ / (halfW + M * T * depth),   // and so do the sides, at any angle
  );

  c.pivot.add(obj);
  c.pivot.scale.setScalar(s);
  c.pivot.rotation.z = 0;

  const col = RARITY[rarity]?.color || '#ffffff';
  c.rim.color.set(col);
  c.spin = 0;
  if (!c.alive) { c.alive = true; loop(); }
  return c.canvas;
}

/**
 * Advance and draw one frame. Split out of the loop so a frame can be forced --
 * rAF is throttled to nothing in a hidden tab, so anything that needs to LOOK at
 * the showcase (a verification sweep, a capture) has to be able to ask for one.
 */
export function renderNow(step = 0.016) {
  const c = ctx;
  if (!c) return;
  c.spin += step;
  c.pivot.rotation.y = c.spin;
  // a slow bob, so it reads as floating rather than mounted on a stick
  c.pivot.position.y = Math.sin(c.spin * 1.7) * 0.04;
  c.renderer.render(c.scene, c.cam);
}

function loop() {
  const c = ctx;
  if (!c || !c.alive) return;
  c.raf = requestAnimationFrame(loop);
  renderNow();
}

/**
 * Live GPU resource counts for the showcase renderer.
 *
 * This exists because the leak it guards against is invisible to every other
 * measurement: JS heap without a forced GC reports garbage rather than
 * retention, and a leaked geometry is by definition unreachable from the scene,
 * so walking the graph cannot find it either. `renderer.info.memory` is the
 * only honest count. Follows the project's `window.__semesta` convention of
 * exposing live state for automated verification.
 */
export function showcaseStats() {
  if (!ctx) return { geometries: 0, textures: 0, programs: 0 };
  const m = ctx.renderer.info.memory;
  return { geometries: m.geometries, textures: m.textures,
    programs: ctx.renderer.info.programs?.length ?? 0 };
}

/** Stop turning when the reveal closes — a hidden canvas must not hold a frame. */
export function stopItem() {
  if (!ctx) return;
  ctx.alive = false;
  cancelAnimationFrame(ctx.raf);
}
