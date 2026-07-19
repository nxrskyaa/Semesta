// Semesta player: cute chibi voxel character (big expressive head, small body)
// with deep customization (12 hair styles, face accessories, 4 outfit cuts,
// capes), detailed per-class weapons, jump physics, mount support, and juicy
// per-weapon attack animations.
import * as THREE from 'three';
import { makePlayerFaceTexture, makeBladeTexture, PALETTE } from '../gfx/textures.js';
import { ITEMS } from '../systems/items.js';
import {
  CLASSES, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, EYE_COLORS, CAPE_COLORS, BALD_STYLE,
} from '../systems/classes.js';

const ROLL_TIME = 0.42;
const ROLL_SPEED = 8.5;
const ROLL_COST = 22;
const SHIELD_DRAIN = 9;
const SHIELD_BLOCK = 0.8;
const STAM_REGEN = 26;
const GRAVITY = 16;
const JUMP_V = 5.6;

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
}

// ---------------------------------------------------------------------------
// Character mesh builder — used by the game & the character creation preview.
// ---------------------------------------------------------------------------
export function buildCharacterMesh(config) {
  const skin = SKIN_TONES[(config.skin ?? 0) % SKIN_TONES.length];
  const hairC = HAIR_COLORS[(config.hairColor ?? 0) % HAIR_COLORS.length];
  const outfit = OUTFIT_COLORS[(config.outfit ?? 0) % OUTFIT_COLORS.length];
  const eyeC = EYE_COLORS[(config.eyes ?? 0) % EYE_COLORS.length];
  const style = (config.outfitStyle ?? 0) % 6; // 0 tunic 1 robe 2 leather 3 plate 4 knight 5 coat
  const female = config.gender === 'female';
  const hairStyle = config.hairStyle ?? 0;
  const bald = hairStyle === BALD_STYLE;
  const accessory = config.accessory ?? 0;

  const skinMat = lam(skin);
  const clothMat = lam(outfit);
  const clothDark = new THREE.MeshLambertMaterial({ color: shadeHex(outfit, -0.38) });
  const clothLight = new THREE.MeshLambertMaterial({ color: shadeHex(outfit, 0.22) });
  const hairMat = lam(hairC);
  const hairDark = new THREE.MeshLambertMaterial({ color: shadeHex(hairC, -0.22) });
  const bootMat = lam('#4a3a2c');
  const leatherMat = lam('#6e5438');
  const goldMat = lam('#c8a03a');

  const group = new THREE.Group();          // root (at the feet)
  const vis = new THREE.Group();            // pivot at the waist
  vis.position.y = 0.55;
  group.add(vis);
  const at = (obj, x, y, z) => { obj.position.set(x, y - 0.55, z); vis.add(obj); return obj; };

  // --- legs (short, with boots) ---
  const legGeo = new THREE.BoxGeometry(0.13, 0.3, 0.16);
  const legL = new THREE.Mesh(legGeo, clothDark);
  at(legL, -0.09, 0.15, 0);
  const legR = new THREE.Mesh(legGeo, clothDark);
  at(legR, 0.09, 0.15, 0);
  legL.castShadow = legR.castShadow = true;
  const bootGeo = new THREE.BoxGeometry(0.15, 0.11, 0.19);
  const bootL = new THREE.Mesh(bootGeo, bootMat); bootL.position.y = -0.11; legL.add(bootL);
  const bootR = new THREE.Mesh(bootGeo, bootMat); bootR.position.y = -0.11; legR.add(bootR);

  // --- torso (varies per outfit style) ---
  const bw = female ? 0.32 : 0.36;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.38, 0.22), clothMat);
  at(body, 0, 0.49, 0);
  body.castShadow = true;

  if (style === 0) { // tunic: collar, belt w/ buckle, skirt flare, side trim
    const collar = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.04, 0.05, 0.24), clothLight);
    at(collar, 0, 0.66, 0);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.03, 0.06, 0.25), clothDark);
    at(belt, 0, 0.33, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), goldMat);
    buckle.position.set(0, 0, 0.13); belt.add(buckle);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.07, 0.1, 0.28), clothMat);
    at(skirt, 0, 0.27, 0);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.03, 0.29), clothLight);
    at(trim, 0, 0.22, 0);
  } else if (style === 1) { // robe: long skirt, sash, hood resting behind the head
    const robe = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.32, 0.28), clothMat);
    at(robe, 0, 0.17, 0);
    robe.castShadow = true;
    const hem = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.04, 0.3), clothLight);
    at(hem, 0, 0.03, 0);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.05, 0.05, 0.26), clothLight);
    at(sash, 0, 0.34, 0);
    const sashKnot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), clothDark);
    at(sashKnot, 0.1, 0.32, 0.12);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.14), clothDark);
    at(hood, 0, 0.68, -0.16);
  } else if (style === 2) { // leather: bandolier, belt pouches, knee pads
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.24), leatherMat);
    strap.rotation.z = 0.5;
    at(strap, 0, 0.5, 0.005);
    const strapStud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), goldMat);
    at(strapStud, 0.06, 0.55, 0.12);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.03, 0.07, 0.25), leatherMat);
    at(belt, 0, 0.32, 0);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), lam('#8a6a48'));
    pouch.position.set(0.12, -0.04, 0.11); belt.add(pouch);
    const pouch2 = pouch.clone(); pouch2.position.x = -0.12; belt.add(pouch2);
    const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.18), leatherMat);
    kneeL.position.y = 0.02; legL.add(kneeL);
    const kneeR = kneeL.clone(); legR.add(kneeR);
  } else if (style === 3) { // plate: layered chest plates, gold trim, tasset skirt
    const chest = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.05, 0.22, 0.26), clothLight);
    at(chest, 0, 0.57, 0);
    const chestLow = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.03, 0.1, 0.25), clothMat);
    at(chestLow, 0, 0.42, 0);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.06, 0.03, 0.27), goldMat);
    at(trim, 0, 0.48, 0);
    const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), goldMat);
    at(emblem, 0, 0.58, 0.135);
    const tasset = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.09, 0.09, 0.28), clothDark);
    at(tasset, 0, 0.28, 0);
  } else if (style === 4) { // knight: heavy segmented plate, gorget, ridged breastplate + fauld
    const gorget = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.02, 0.07, 0.25), goldMat);
    at(gorget, 0, 0.665, 0);
    const breast = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.07, 0.26, 0.28), clothLight);
    at(breast, 0, 0.55, 0);
    breast.castShadow = true;
    // central keel ridge + rivets
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.31), goldMat);
    at(ridge, 0, 0.55, 0);
    for (const sy of [0.62, 0.5]) {
      for (const sx of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), goldMat);
        at(rivet, sx * (bw / 2), sy, 0.145);
      }
    }
    const abs = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.02, 0.12, 0.25), clothMat);
    at(abs, 0, 0.38, 0);
    // fauld: two overlapping skirt plates
    const fauld1 = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.08, 0.29), clothDark);
    at(fauld1, 0, 0.3, 0);
    const fauld2 = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.12, 0.07, 0.3), clothLight);
    at(fauld2, 0, 0.24, 0);
    const faTrim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.13, 0.02, 0.31), goldMat);
    at(faTrim, 0, 0.205, 0);
  } else { // coat: long ranger duster with lapels, buttons & split tails
    const coat = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.06, 0.4, 0.26), clothMat);
    at(coat, 0, 0.44, 0);
    coat.castShadow = true;
    // open V-lapels
    for (const sx of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.02), clothLight);
      at(lapel, sx * 0.09, 0.58, 0.13);
      lapel.rotation.z = sx * 0.3;
    }
    // brass buttons down the front
    for (const by of [0.52, 0.44, 0.36]) {
      const btn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), goldMat);
      at(btn, 0, by, 0.135);
    }
    const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.07, 0.05, 0.27), leatherMat);
    at(belt, 0, 0.33, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), goldMat);
    at(buckle, 0, 0.33, 0.14);
    // two coat-tails hanging past the waist
    for (const sx of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(bw / 2 + 0.02, 0.22, 0.06), clothDark);
      at(tail, sx * (bw / 4 + 0.02), 0.13, -0.11);
    }
  }

  // --- arms (pivot at the shoulder) ---
  function makeArm(x) {
    const pivot = new THREE.Group();
    at(pivot, x, 0.64, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.12), skinMat);
    arm.position.y = -0.14;
    arm.castShadow = true;
    pivot.add(arm);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.14),
      (style === 3 || style === 4) ? clothLight : clothMat);
    sleeve.position.y = -0.04;
    pivot.add(sleeve);
    if (style === 1) { // wide robe sleeves
      const wide = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.17), clothMat);
      wide.position.y = -0.14;
      pivot.add(wide);
    }
    return pivot;
  }
  const armL = makeArm(-(bw / 2 + 0.06));
  const armR = makeArm(bw / 2 + 0.06);

  if (style === 3) { // plate pauldrons
    for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.19), clothDark);
      pad.position.set(sx * 0.02, 0.05, 0);
      pivot.add(pad);
      const padTrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.2), goldMat);
      padTrim.position.set(sx * 0.01, -0.01, 0);
      pivot.add(padTrim);
    }
  } else if (style === 4) { // knight: big ridged pauldrons with a spike
    for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.22), clothLight);
      pad.position.set(sx * 0.03, 0.06, 0);
      pivot.add(pad);
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.06), goldMat);
      ridge.position.set(sx * 0.03, 0.12, 0);
      pivot.add(ridge);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), goldMat);
      spike.position.set(sx * 0.11, 0.13, 0);
      spike.rotation.z = sx * 0.5;
      pivot.add(spike);
    }
  } else if (style === 2) { // leather shoulder straps
    for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.16), leatherMat);
      pad.position.set(sx * 0.01, 0.07, 0);
      pivot.add(pad);
    }
  }

  // weapon pivots at the hands
  const handR = new THREE.Group();
  handR.position.set(0, -0.28, 0.02);
  armR.add(handR);
  const handL = new THREE.Group();
  handL.position.set(0, -0.28, 0.02);
  armL.add(handL);

  // --- big chibi head ---
  const faceTex = makePlayerFaceTexture(skin, hairC, eyeC, female, bald, accessory);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
  const headSideMat = bald ? skinMat : hairMat;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.48),
    [headSideMat, headSideMat, bald ? skinMat : hairMat, skinMat, faceMat, headSideMat]);
  at(head, 0, 0.95, 0);
  head.castShadow = true;

  // --- hair styles ---
  const hairParts = [];
  const addHair = (geo, mat, x, y, z, rx = 0, rz = 0) => {
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x, y, z);
    p.rotation.x = rx; p.rotation.z = rz;
    head.add(p);
    hairParts.push(p);
    return p;
  };
  if (!bald) {
    if (hairStyle === 0) { // short
      addHair(new THREE.BoxGeometry(0.54, 0.22, 0.14), hairMat, 0, 0.1, -0.22);
    } else if (hairStyle === 1) { // spiky
      for (const [dx, dz, s] of [[-0.14, 0.02, 0.13], [0.02, 0.1, 0.15], [0.14, -0.04, 0.12], [-0.02, -0.12, 0.14], [0.1, 0.12, 0.11]]) {
        addHair(new THREE.BoxGeometry(s, 0.16, s), hairMat, dx, 0.28, dz);
      }
    } else if (hairStyle === 2) { // long
      addHair(new THREE.BoxGeometry(0.5, 0.62, 0.14), hairMat, 0, -0.14, -0.26);
      addHair(new THREE.BoxGeometry(0.12, 0.4, 0.1), hairDark, -0.26, -0.04, -0.1);
      addHair(new THREE.BoxGeometry(0.12, 0.4, 0.1), hairDark, 0.26, -0.04, -0.1);
    } else if (hairStyle === 3) { // ponytail
      addHair(new THREE.BoxGeometry(0.14, 0.42, 0.14), hairMat, 0, -0.02, -0.3, 0.4);
      addHair(new THREE.BoxGeometry(0.1, 0.08, 0.1), hairDark, 0, 0.16, -0.27);
    } else if (hairStyle === 4) { // twin tails
      addHair(new THREE.BoxGeometry(0.12, 0.4, 0.12), hairMat, -0.28, -0.1, -0.14, 0.25);
      addHair(new THREE.BoxGeometry(0.12, 0.4, 0.12), hairMat, 0.28, -0.1, -0.14, 0.25);
      addHair(new THREE.BoxGeometry(0.09, 0.06, 0.09), hairDark, -0.28, 0.1, -0.13);
      addHair(new THREE.BoxGeometry(0.09, 0.06, 0.09), hairDark, 0.28, 0.1, -0.13);
    } else if (hairStyle === 5) { // bob
      addHair(new THREE.BoxGeometry(0.56, 0.34, 0.16), hairMat, 0, -0.02, -0.2);
      addHair(new THREE.BoxGeometry(0.1, 0.3, 0.42), hairMat, -0.28, 0, 0);
      addHair(new THREE.BoxGeometry(0.1, 0.3, 0.42), hairMat, 0.28, 0, 0);
    } else if (hairStyle === 6) { // topknot
      addHair(new THREE.BoxGeometry(0.14, 0.14, 0.14), hairMat, 0, 0.3, -0.02);
      addHair(new THREE.BoxGeometry(0.08, 0.1, 0.08), hairDark, 0, 0.38, -0.02);
    } else if (hairStyle === 7) { // buns
      addHair(new THREE.BoxGeometry(0.14, 0.14, 0.14), hairMat, -0.2, 0.26, -0.06);
      addHair(new THREE.BoxGeometry(0.14, 0.14, 0.14), hairMat, 0.2, 0.26, -0.06);
      addHair(new THREE.BoxGeometry(0.08, 0.06, 0.08), hairDark, -0.2, 0.34, -0.06);
      addHair(new THREE.BoxGeometry(0.08, 0.06, 0.08), hairDark, 0.2, 0.34, -0.06);
    } else if (hairStyle === 8) { // braid
      addHair(new THREE.BoxGeometry(0.13, 0.2, 0.12), hairMat, 0, 0.05, -0.28, 0.25);
      addHair(new THREE.BoxGeometry(0.11, 0.18, 0.1), hairDark, 0, -0.14, -0.33, 0.3);
      addHair(new THREE.BoxGeometry(0.09, 0.16, 0.09), hairMat, 0, -0.3, -0.36, 0.32);
      addHair(new THREE.BoxGeometry(0.06, 0.08, 0.06), hairDark, 0, -0.42, -0.38, 0.32);
    } else if (hairStyle === 9) { // mohawk
      for (let k = 0; k < 4; k++) {
        addHair(new THREE.BoxGeometry(0.1, 0.2 - k * 0.02, 0.12), k % 2 ? hairDark : hairMat, 0, 0.3, 0.14 - k * 0.13);
      }
    } else if (hairStyle === 10) { // waves
      addHair(new THREE.BoxGeometry(0.56, 0.3, 0.18), hairMat, 0, -0.06, -0.2);
      addHair(new THREE.BoxGeometry(0.12, 0.24, 0.14), hairMat, -0.26, -0.16, -0.12, 0, 0.3);
      addHair(new THREE.BoxGeometry(0.12, 0.24, 0.14), hairMat, 0.26, -0.16, -0.12, 0, -0.3);
      addHair(new THREE.BoxGeometry(0.5, 0.1, 0.12), hairDark, 0, -0.3, -0.24);
    }
  }

  // --- cape ---
  let capeMesh = null;
  if ((config.cape ?? -1) >= 0) {
    const capeC = CAPE_COLORS[config.cape % CAPE_COLORS.length];
    const capeCloth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.04), lam(capeC));
    capeCloth.position.set(0, -0.26, -0.15);
    const capeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.045), lam(shadeHex(capeC, -0.35)));
    capeTrim.position.set(0, -0.5, -0.15);
    const capePivot = new THREE.Group();
    at(capePivot, 0, 0.66, -0.02);
    capePivot.add(capeCloth, capeTrim);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), goldMat);
    at(clasp, 0, 0.67, 0.12);
    capeMesh = capePivot;
  }

  // shield (Knight)
  const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.07), lam('#8a6a48'));
  shieldMesh.position.set(-0.02, 0.02, 0.06);
  const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.03), lam('#5a4432'));
  shieldRim.position.z = -0.03;
  shieldMesh.add(shieldRim);
  const shieldEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), clothMat);
  shieldEmblem.position.z = 0.04;
  shieldMesh.add(shieldEmblem);
  shieldMesh.visible = false;
  handL.add(shieldMesh);

  // --- weapons (detailed, tiered) ---
  let weaponGroup = null;
  let bowArrow = null;
  let staffOrb = null;

  function setWeapon(id) {
    if (weaponGroup) { weaponGroup.parent.remove(weaponGroup); weaponGroup = null; }
    // clear any old offhand dagger
    for (const h of [handL]) {
      for (let i = h.children.length - 1; i >= 0; i--) {
        if (h.children[i].userData.isWeapon) h.remove(h.children[i]);
      }
    }
    bowArrow = null; staffOrb = null;
    const def = ITEMS[id];
    if (!def) return;
    const s = def.scale || 1;
    const tier = def.tier || 0;
    const g = new THREE.Group();
    g.userData.isWeapon = true;
    const [darkC, lightC] = def.blade;

    if (def.model) {
      // gacha exclusives get whole custom silhouettes (see buildExoticWeapon)
      const ex = buildExoticWeapon(g, def, s);
      if (def.type === 'bow') {
        bowArrow = ex.arrow || null;
        g.rotation.y = Math.PI / 2;
        handL.add(g);
      } else {
        if (def.type === 'staff' && ex.orb) staffOrb = ex.orb;
        handR.add(g);
        if (ex.off) {
          ex.off.rotation.z = 0.15;
          handL.add(ex.off);
          g.userData.offhand = ex.off;
        }
      }
      if (ex.anim && (ex.anim.ring || ex.anim.orb || ex.anim.floaters?.length)) {
        g.userData.anim = ex.anim;
      }
    } else if (def.type === 'sword' || !def.type) {
      // tapered blade: wide base, narrow top, pyramid tip + fuller line
      const bladeMat = new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) });
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.55 * s, 0.24 * s), bladeMat);
      lower.position.y = 0.42 * s;
      lower.castShadow = true;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.4 * s, 0.18 * s), bladeMat);
      upper.position.y = 0.88 * s;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.14 * s, 0.1 * s), lam(lightC));
      tip.position.y = 1.14 * s;
      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.085 * s, 0.7 * s, 0.03 * s), lam(shadeHex(darkC, -0.25)));
      fuller.position.y = 0.55 * s;
      // curved guard (3 pieces) + gold pommel
      const guardMid = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.06, 0.3 * s), lam('#5a4630'));
      guardMid.position.y = 0.15;
      const guardL = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.05, 0.08 * s), goldMat);
      guardL.position.set(0, 0.18, 0.16 * s);
      const guardR = guardL.clone(); guardR.position.z = -0.16 * s;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.07), lam(PALETTE.torchWood));
      grip.position.y = 0.02;
      const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.09), goldMat);
      pommel.position.y = -0.09;
      g.add(lower, upper, tip, fuller, guardMid, guardL, guardR, grip, pommel);
      // bright cutting edge — a thin glint strip along the blade's front
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.92 * s, 0.02),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC), transparent: true, opacity: 0.85 }));
      edge.position.set(0, 0.62 * s, 0.115 * s);
      g.add(edge);
      if (tier >= 2) { // rune glow stripe
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 0.5 * s, 0.02),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC) }));
        rune.position.set(0, 0.6 * s, 0);
        g.add(rune);
      }
      if (def.glow) { // gacha blade: glowing guard gem + twin rune notches
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(def.glow) }));
        gem.position.set(0, 0.16, 0.17 * s);
        g.add(gem);
        for (const sy of [0.38, 0.82]) {
          const notch = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.05, 0.03),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(def.glow), transparent: true, opacity: 0.9 }));
          notch.position.set(0, sy * s, 0.1 * s);
          g.add(notch);
        }
      }
      handR.add(g);
    } else if (def.type === 'dagger') {
      const mk = (isOff) => {
        const d = new THREE.Group();
        d.userData.isWeapon = true;
        const bladeMat = new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) });
        // curved blade: two offset segments
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28 * (s / 0.72), 0.11), bladeMat);
        b1.position.y = 0.22;
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2 * (s / 0.72), 0.08), bladeMat);
        b2.position.set(0, 0.42, 0.03);
        b2.rotation.x = -0.3;
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.05), lam(lightC));
        tip.position.set(0, 0.54, 0.06);
        tip.rotation.x = -0.4;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.13), goldMat);
        guard.position.y = 0.08;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), lam('#4a3626'));
        d.add(b1, b2, tip, guard, grip);
        // glinting edge along the curve
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26 * (s / 0.72), 0.02),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC), transparent: true, opacity: 0.85 }));
        edge.position.set(0, 0.24, 0.065);
        d.add(edge);
        if (tier >= 2 && !isOff) {
          const rune = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.02),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC) }));
          rune.position.set(0, 0.24, 0.055);
          d.add(rune);
        }
        if (def.glow) { // gacha fangs: glowing venom bead on each guard
          const bead = new THREE.Mesh(new THREE.OctahedronGeometry(0.035),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(def.glow) }));
          bead.position.set(0, 0.09, 0.09);
          d.add(bead);
        }
        return d;
      };
      g.add(mk(false));
      handR.add(g);
      const off = mk(true);
      off.rotation.z = 0.15;
      handL.add(off);
      g.userData.offhand = off;
    } else if (def.type === 'bow') {
      const limbMat = lam(darkC);
      // smooth curved limbs (9 segments) with curled tips
      for (let i = 0; i < 9; i++) {
        const t = i / 8 - 0.5;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13 * s, 0.055), i === 4 ? lam(lightC) : limbMat);
        seg.position.set(Math.cos(t * Math.PI) * 0.16 * s, t * 0.86 * s, 0);
        seg.rotation.z = -t * 1.1;
        g.add(seg);
      }
      for (const sy of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.04),
          def.glow ? new THREE.MeshBasicMaterial({ color: new THREE.Color(def.glow) }) : goldMat);
        if (def.glow) tip.scale.setScalar(1.5); // gacha bows: glowing limb tips
        tip.position.set(-0.06 * s, sy * 0.47 * s, 0);
        g.add(tip);
      }
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14 * s, 0.075), lam('#8a6a48'));
      wrap.position.set(0.16 * s, 0, 0);
      g.add(wrap);
      const stringGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.06 * s, 0.47 * s, 0), new THREE.Vector3(-0.13 * s, 0, 0), new THREE.Vector3(-0.06 * s, -0.47 * s, 0),
      ]);
      g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xd8d8c8 })));
      bowArrow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC) }));
      bowArrow.position.set(-0.06, 0, 0.12);
      bowArrow.visible = false;
      g.add(bowArrow);
      g.rotation.y = Math.PI / 2;
      handL.add(g);
    } else if (def.type === 'staff') {
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.3 * s, 0.055), lam('#5a4630'));
      rod.position.y = 0.38;
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.07), leatherMat);
      wrap.position.y = 0.05;
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.1), goldMat);
      collar.position.y = 0.96;
      // twin prongs cradling the orb
      const prongL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), lam(darkC));
      prongL.position.set(-0.08, 1.1, 0); prongL.rotation.z = 0.35;
      const prongR = prongL.clone(); prongR.position.x = 0.08; prongR.rotation.z = -0.35;
      staffOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 * s, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC) }));
      staffOrb.position.y = 1.18;
      g.add(rod, wrap, collar, prongL, prongR, staffOrb);
      if (tier >= 2) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16 * s, 0.015, 4, 10),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(lightC), transparent: true, opacity: 0.7 }));
        ring.position.y = 1.18;
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
        g.userData.anim = { ring, orb: staffOrb }; // spins & pulses in update
      }
      handR.add(g);
    }
    // gacha-exclusive weapons carry a living aura: colored light + orbiting sparks
    if (def.glow) {
      const auraY = def.type === 'bow' ? 0 : def.type === 'staff' ? 1.1 : 0.7 * s;
      const aura = new THREE.PointLight(new THREE.Color(def.glow), 0.9, 3.5, 2);
      aura.position.y = auraY;
      g.add(aura);
      const sparks = new THREE.Group();
      const sMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(def.glow), transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.022 + (i % 3) * 0.011), sMat);
        sp.userData.a0 = (i / 6) * Math.PI * 2;
        sparks.add(sp);
      }
      sparks.position.y = auraY;
      g.add(sparks);
      g.userData.sparks = sparks;
      g.userData.auraLight = aura; // breathes in update
    }
    weaponGroup = g;
  }

  return {
    group, vis,
    parts: { head, body, legL, legR, armL, armR, handR, handL, shieldMesh, hairParts, capeMesh },
    setWeapon,
    getBowArrow: () => bowArrow,
    getStaffOrb: () => staffOrb,
    getWeaponSparks: () => weaponGroup?.userData.sparks || null,
    getWeaponAnim: () => weaponGroup?.userData.anim || null,
  };
}

// ---------------------------------------------------------------------------
// Gacha-exclusive weapon silhouettes — whole different SHAPES per family,
// not recolors: STARFORGED = faceted floating crystal, DRAGONFANG = curved
// fangs & horns with serrated teeth, CELESTIUM = slim halos & crescents.
// Builds into `g` (blade along +y) and returns { arrow, orb, off, anim }.
// ---------------------------------------------------------------------------
function buildExoticWeapon(g, def, s) {
  const [darkC, lightC] = def.blade;
  const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), ...o });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const octa = (r, mat) => new THREE.Mesh(new THREE.OctahedronGeometry(r), mat);
  const grip = () => { const m = box(0.055, 0.2, 0.07, lam('#3a3040')); m.position.y = 0.02; return m; };
  const out = { anim: { floaters: [] } };
  const float = (mesh) => { mesh.userData.by = mesh.position.y; out.anim.floaters.push(mesh); g.add(mesh); };
  const key = `${def.model}_${def.type}`;

  if (key === 'star_sword') {
    // a faceted crystal greatblade with shard fragments orbiting loose
    const core = octa(0.16, lam(lightC));
    core.scale.set(0.7, 4.2, 1.3); core.position.y = 0.72 * s;
    const inner = octa(0.09, B(def.glow));
    inner.scale.set(0.6, 3.4, 0.9); inner.position.y = 0.72 * s;
    for (const sx of [-1, 1]) {
      const wing = octa(0.07, lam(darkC));
      wing.scale.set(0.6, 2.0, 0.8);
      wing.position.set(0, 0.34 * s, sx * 0.16);
      wing.rotation.x = sx * 0.35;
      g.add(wing);
      const gd = box(0.07, 0.06, 0.16, lam(darkC));
      gd.position.set(0, 0.15, sx * 0.11); gd.rotation.x = -sx * 0.5;
      g.add(gd);
    }
    for (let i = 0; i < 3; i++) {
      const fr = octa(0.045, B(def.glow, { transparent: true, opacity: 0.9 }));
      fr.position.set(0.14 * (i % 2 ? 1 : -1), (0.4 + i * 0.3) * s, 0.1 * (i - 1));
      float(fr);
    }
    g.add(core, inner, grip());
  } else if (key === 'star_bow') {
    // an arc of five detached floating crystal shards
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5;
      const shard = octa(0.075, i === 2 ? B(def.glow) : lam(lightC));
      shard.scale.set(0.7, 1.9, 0.7);
      shard.position.set(Math.cos(t * Math.PI) * 0.22 * s, t * 0.95 * s, 0);
      shard.rotation.z = -t * 1.2;
      float(shard);
    }
    const handle = box(0.07, 0.16 * s, 0.08, lam(darkC));
    handle.position.x = 0.2 * s;
    g.add(handle);
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.08 * s, 0.46 * s, 0), new THREE.Vector3(-0.15 * s, 0, 0), new THREE.Vector3(-0.08 * s, -0.46 * s, 0),
    ]);
    g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xd8c8f5 })));
    out.arrow = octa(0.05, B(def.glow));
    out.arrow.scale.set(0.5, 0.5, 4.5);
    out.arrow.position.set(-0.08, 0, 0.14);
    out.arrow.visible = false;
    g.add(out.arrow);
  } else if (key === 'star_staff') {
    // a dark monolith rod crowned by a huge levitating crystal
    const rod = box(0.06, 1.25 * s, 0.06, lam('#2c2c4a'));
    rod.position.y = 0.36;
    for (const ry of [0.5, 0.8]) {
      const band = box(0.1, 0.05, 0.1, B(def.glow, { transparent: true, opacity: 0.85 }));
      band.position.y = ry;
      g.add(band);
    }
    const crystal = octa(0.17, lam(lightC));
    crystal.scale.set(0.8, 1.9, 0.8); crystal.position.y = 1.32;
    const heart = octa(0.08, B(def.glow));
    heart.position.y = 1.32;
    float(crystal); float(heart);
    out.orb = heart;
    for (let i = 0; i < 2; i++) {
      const star2 = octa(0.04, B('#ffffff'));
      star2.position.set(i ? 0.16 : -0.16, 1.2 + i * 0.24, 0);
      float(star2);
    }
    g.add(rod, grip());
  } else if (key === 'star_fangs') {
    const mk = () => {
      const d = new THREE.Group();
      d.userData.isWeapon = true;
      for (let i = 0; i < 3; i++) { // a fan of three loose shards
        const sh = octa(0.055, i === 1 ? B(def.glow) : lam(lightC));
        sh.scale.set(0.55, 2.5 - i * 0.5, 0.7);
        sh.position.set(0, 0.3, (i - 1) * 0.09);
        sh.rotation.x = (i - 1) * 0.35;
        d.add(sh);
      }
      const gr = grip(); d.add(gr);
      return d;
    };
    g.add(mk());
    out.off = mk();
  } else if (key === 'dragon_sword') {
    // a forward-curved fang with serrated teeth along the spine
    let ang = 0;
    for (let i = 0; i < 4; i++) {
      const seg = box(0.07 * s, 0.34 * s, 0.2 * s - i * 0.03, lam(i % 2 ? darkC : lightC));
      ang += 0.16;
      seg.position.set(0, (0.32 + i * 0.3) * s, (i * i) * 0.022 * s);
      seg.rotation.x = -ang;
      g.add(seg);
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), B(def.glow));
      tooth.position.set(0, (0.36 + i * 0.3) * s, (-0.1 - i * i * 0.01) * s);
      tooth.rotation.x = Math.PI - ang;
      g.add(tooth);
    }
    const eye = octa(0.06, B('#ff4a2e'));
    eye.position.set(0, 0.16, 0.1);
    const jaw = box(0.16 * s, 0.08, 0.3 * s, lam('#5a2a18'));
    jaw.position.y = 0.14;
    g.add(eye, jaw, grip());
  } else if (key === 'dragon_bow') {
    // twin horns lashed to a scaled grip, ember tips smoldering
    for (const sy of [-1, 1]) {
      let ang = 0;
      for (let i = 0; i < 3; i++) {
        const seg = box(0.06, 0.3 * s, 0.07 + (2 - i) * 0.02, lam(i === 2 ? darkC : lightC));
        ang += 0.4;
        seg.position.set(Math.sin(ang) * 0.16 * s, sy * (0.16 + i * 0.26) * s, 0);
        seg.rotation.z = -sy * ang * 0.5;
        g.add(seg);
      }
      const ember = octa(0.055, B('#ff6a2e'));
      ember.position.set(0.14 * s, sy * 0.72 * s, 0);
      float(ember);
    }
    const gripm = box(0.09, 0.2 * s, 0.1, lam('#5a2a18'));
    g.add(gripm);
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.05 * s, 0.7 * s, 0), new THREE.Vector3(-0.12 * s, 0, 0), new THREE.Vector3(0.05 * s, -0.7 * s, 0),
    ]);
    g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xffd8a8 })));
    out.arrow = box(0.035, 0.035, 0.6, B(def.glow));
    out.arrow.position.set(-0.06, 0, 0.12);
    out.arrow.visible = false;
    g.add(out.arrow);
  } else if (key === 'dragon_staff') {
    // ribbed shaft ending in a three-clawed talon gripping a molten orb
    const rod = box(0.065, 1.3 * s, 0.065, lam('#5a2a18'));
    rod.position.y = 0.38;
    for (const ry of [0.35, 0.6, 0.85]) {
      const rib = box(0.11, 0.045, 0.11, lam(darkC));
      rib.position.y = ry;
      g.add(rib);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), lam(lightC));
      claw.position.set(Math.cos(a) * 0.13, 1.16, Math.sin(a) * 0.13);
      claw.rotation.x = Math.sin(a) * 0.5;
      claw.rotation.z = -Math.cos(a) * 0.5;
      g.add(claw);
    }
    out.orb = octa(0.12 * s, B('#ffb055'));
    out.orb.position.y = 1.24;
    float(out.orb);
    g.add(rod, grip());
  } else if (key === 'dragon_dagger' || key === 'dragon_fangs' || (def.model === 'dragon' && def.type === 'dagger')) {
    const mk = () => {
      const d = new THREE.Group();
      d.userData.isWeapon = true;
      let ang = 0;
      for (let i = 0; i < 3; i++) { // a karambit talon curling hard forward
        const seg = box(0.05, 0.2, 0.09 - i * 0.02, lam(i % 2 ? darkC : lightC));
        ang += 0.45;
        seg.position.set(0, 0.16 + i * 0.16, i * i * 0.035);
        seg.rotation.x = -ang;
        d.add(seg);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 4, 10), lam('#5a2a18'));
      ring.position.y = -0.04;
      const spur = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), B(def.glow));
      spur.position.set(0, 0.1, -0.07);
      spur.rotation.x = Math.PI;
      d.add(ring, spur, grip());
      return d;
    };
    g.add(mk());
    out.off = mk();
  } else if (key === 'celestial_sword') {
    // a slim moonlit saber ringed by a great halo at the guard
    const blade = box(0.045 * s, 1.1 * s, 0.13 * s, lam(lightC));
    blade.position.y = 0.68 * s;
    const gleam = box(0.02, 1.0 * s, 0.03, B('#ffffff', { transparent: true, opacity: 0.9 }));
    gleam.position.set(0, 0.66 * s, 0.055 * s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.2 * s, 4), B(def.glow));
    tip.position.y = 1.3 * s;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2 * s, 0.02, 6, 20), B(def.glow, { transparent: true, opacity: 0.9 }));
    halo.position.y = 0.2;
    out.anim.ring = halo;
    const star = octa(0.05, B('#ffffff'));
    star.position.y = 1.46 * s;
    float(star);
    g.add(blade, gleam, tip, halo, grip());
  } else if (key === 'celestial_bow') {
    // winged limbs of layered feathers around a radiant core
    for (const sy of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const feather = box(0.045, 0.4 * s - i * 0.07, 0.1 - i * 0.02, i === 0 ? lam(lightC) : i === 1 ? lam('#e8b8d8') : B(def.glow, { transparent: true, opacity: 0.8 }));
        feather.position.set(0.05 + i * 0.08, sy * (0.3 + i * 0.14) * s, 0);
        feather.rotation.z = -sy * (0.5 + i * 0.3);
        g.add(feather);
      }
    }
    const core = octa(0.08, B(def.glow));
    float(core);
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.02, 0.62 * s, 0), new THREE.Vector3(-0.14 * s, 0, 0), new THREE.Vector3(-0.02, -0.62 * s, 0),
    ]);
    g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xffe0f0 })));
    out.arrow = box(0.03, 0.03, 0.6, B('#ffffff'));
    out.arrow.position.set(-0.06, 0, 0.12);
    out.arrow.visible = false;
    g.add(out.arrow);
  } else if (key === 'celestial_staff') {
    // a crescent moon cradling a pearl, stars adrift around it
    const rod = box(0.055, 1.3 * s, 0.055, lam('#4a2a44'));
    rod.position.y = 0.38;
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 14, Math.PI * 1.25), lam(lightC));
    crescent.position.y = 1.18;
    crescent.rotation.z = Math.PI * 0.88;
    out.orb = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), B('#fff0f8'));
    out.orb.position.y = 1.2;
    float(out.orb);
    for (let i = 0; i < 3; i++) {
      const star = octa(0.035, B(def.glow));
      star.position.set(Math.cos(i * 2.1) * 0.22, 1.05 + i * 0.16, Math.sin(i * 2.1) * 0.22);
      float(star);
    }
    g.add(rod, crescent, grip());
  } else { // celestial daggers: paired crescent moon blades
    const mk = () => {
      const d = new THREE.Group();
      d.userData.isWeapon = true;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 12, Math.PI * 1.1), lam(lightC));
      arc.position.y = 0.3;
      arc.rotation.z = Math.PI * 0.95;
      const edge = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 4, 12, Math.PI * 1.1), B('#ffffff', { transparent: true, opacity: 0.9 }));
      edge.position.set(0, 0.3, 0.03);
      edge.rotation.z = Math.PI * 0.95;
      const gem = octa(0.04, B(def.glow));
      gem.position.y = 0.12;
      d.add(arc, edge, gem, grip());
      return d;
    };
    g.add(mk());
    out.off = mk();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Player runtime
// ---------------------------------------------------------------------------
export function createPlayer(terrain, decorBlocked, config, particles) {
  const cls = CLASSES[config.cls];
  let rig = buildCharacterMesh(config);
  const group = rig.group;   // persistent root: scene/mounts/trail attach here
  let vis = rig.vis;         // swapped when the appearance is rebuilt
  const parts = rig.parts;   // shared object — mutated in place on rebuild
  group.position.copy(terrain.spawn);

  // swing trail (ring sector) for melee
  const trailGeo = new THREE.RingGeometry(0.5, 1.0, 14, 1, 0, 2.1);
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.y = 0.55;
  group.add(trail);

  let visBase = 0.55; // waist height; raised while mounted

  const state = {
    group,
    pos: group.position,
    facing: 0,
    cls: config.cls,
    config,
    hp: cls.baseHp, maxHp: cls.baseHp,
    stamina: cls.baseStam, maxStamina: cls.baseStam,
    dmgMult: 1,
    rolling: 0,
    rollDir: new THREE.Vector2(),
    shielding: false,
    attackT: 0,
    attackDur: 0.3,
    attackKind: 'sword',
    hurtT: 0,
    dead: false,
    walkPhase: 0,
    idleT: Math.random() * 10,
    equipped: cls.startWeapon,
    buffs: [],
    busy: false,
    isMoving: false,
    // vertical physics
    vy: 0, grounded: true, landSquash: 0,
    // mount
    mount: null, // { speedMult, jumpMult, seatH }
    equipWeapon: (id) => {
      state.equipped = id;
      rig.setWeapon(id);
      const def = ITEMS[id];
      trailMat.color = new THREE.Color(def.blade?.[1] || '#ffffff');
    },
  };
  rig.setWeapon(cls.startWeapon);
  trailMat.color = new THREE.Color(ITEMS[cls.startWeapon].blade[1]);

  // rebuild the hero visuals in place after a wardrobe appearance edit —
  // the persistent group (position, mounts, trail) and the shared `parts`
  // object survive; only the visual pivot is swapped out
  function applyAppearance() {
    const fresh = buildCharacterMesh(config);
    fresh.group.remove(fresh.vis);
    group.remove(vis);
    vis = fresh.vis;
    vis.position.y = visBase;
    group.add(vis);
    Object.assign(parts, fresh.parts);
    rig = fresh;
    rig.setWeapon(state.equipped); // re-attach the current weapon to the new hands
  }

  function addBuff(b) {
    state.buffs = state.buffs.filter((x) => x.id !== b.id);
    state.buffs.push({ ...b });
  }
  function buffVal(key) {
    let v = 0;
    for (const b of state.buffs) v += b[key] || 0;
    return v;
  }
  function consumeCritBuff() {
    const i = state.buffs.findIndex((b) => b.guaranteedCrit);
    if (i >= 0) { state.buffs.splice(i, 1); return true; }
    return false;
  }

  const tryMove = (nx, nz) => {
    const [ix, iz] = terrain.cellOf(nx, nz);
    if (decorBlocked.has(`${ix},${iz}`)) return false;
    return terrain.walkable(nx, nz, state.pos.y);
  };

  // camera-relative input -> world direction.
  // forward (W) moves AWAY from the camera: fwd = (-sin yaw, -cos yaw).
  function moveVec(input, camYaw) {
    let mx = 0, mz = 0;
    if (input.joy?.active) {
      mx = input.joy.x; mz = input.joy.y;
    } else {
      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) mz -= 1;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) mz += 1;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
    }
    if (!mx && !mz) return null;
    const len = Math.hypot(mx, mz) || 1;
    const cos = Math.cos(camYaw), sin = Math.sin(camYaw);
    return {
      x: (mx * cos + mz * sin) / len,
      z: (-mx * sin + mz * cos) / len,
    };
  }

  // mount hook — mounts.js attaches its mesh to group, then calls this
  function setMountState(mountDef) {
    state.mount = mountDef;
    visBase = 0.55 + (mountDef?.seatH || 0);
  }

  function tryJump() {
    if (!state.grounded || state.dead || state.busy || state.rolling > 0) return false;
    state.vy = JUMP_V * (state.mount?.jumpMult || 1);
    state.grounded = false;
    return true;
  }

  function update(dt, input, camYaw) {
    if (state.dead) return;

    // buff timers
    for (let i = state.buffs.length - 1; i >= 0; i--) {
      state.buffs[i].t -= dt;
      if (state.buffs[i].t <= 0) state.buffs.splice(i, 1);
    }
    state.dmgBonusBuff = buffVal('dmg');

    const regen = buffVal('regen');
    if (regen > 0) state.hp = Math.min(state.maxHp, state.hp + regen * dt);

    // natural recovery: every 5s out of combat, heal a chunk — no class
    // should have to chug tonics just to explore
    state.sinceHurt = (state.sinceHurt || 0) + dt;
    state.healTick = (state.healTick || 0) + dt;
    if (state.healTick >= 5) {
      state.healTick = 0;
      if (state.sinceHurt > 5 && state.hp < state.maxHp && !state.dead) {
        state.hp = Math.min(state.maxHp, state.hp + Math.max(3, state.maxHp * 0.06));
      }
    }

    const mv = (state.rolling <= 0 && !state.busy) ? moveVec(input, camYaw) : null;
    const moving = !!mv;
    state.isMoving = moving;

    let vx = 0, vz = 0;
    if (state.rolling > 0) {
      state.rolling -= dt;
      vx = state.rollDir.x * ROLL_SPEED;
      vz = state.rollDir.y * ROLL_SPEED;
    } else if (moving) {
      let sp = cls.speed * (1 + buffVal('speed')) * (state.mount?.speedMult || 1);
      if (state.shielding) sp *= 0.45;
      if (state.attackT > 0) sp *= 0.55;
      vx = mv.x * sp; vz = mv.z * sp;
      state.facing = Math.atan2(mv.x, mv.z);
    }

    if (vx || vz) {
      const nx = state.pos.x + vx * dt, nz = state.pos.z + vz * dt;
      if (tryMove(nx, nz)) { state.pos.x = nx; state.pos.z = nz; }
      else if (tryMove(nx, state.pos.z)) { state.pos.x = nx; }
      else if (tryMove(state.pos.x, nz)) { state.pos.z = nz; }
    }

    // --- vertical: jump / gravity / ground follow ---
    const targetY = terrain.surfaceY(state.pos.x, state.pos.z);
    if (state.grounded) {
      if (state.pos.y - targetY > 0.4) {
        state.grounded = false; // walked off a ledge
        state.vy = 0;
      } else {
        state.pos.y += (targetY - state.pos.y) * Math.min(1, dt * 14);
      }
    }
    if (!state.grounded) {
      state.vy -= GRAVITY * dt;
      state.pos.y += state.vy * dt;
      if (state.vy <= 0 && state.pos.y <= targetY) {
        state.pos.y = targetY;
        state.grounded = true;
        state.vy = 0;
        state.landSquash = 0.16;
        particles?.burst(state.pos.clone().add(new THREE.Vector3(0, 0.05, 0)), '#b8a888', 5, 1.6, 5, 0.3);
      }
    }

    // shield
    state.shielding = cls.hasShield && input.keys.has('ShiftLeft') && state.stamina > 1
      && state.rolling <= 0 && !state.mount;
    parts.shieldMesh.visible = state.shielding;
    if (state.shielding) {
      state.stamina = Math.max(0, state.stamina - SHIELD_DRAIN * dt);
      parts.armL.rotation.x = -1.2;
    }
    if (!state.shielding) {
      state.stamina = Math.min(state.maxStamina, state.stamina + STAM_REGEN * (1 + buffVal('stamRegen')) * dt);
    }

    // === ANIMATION ===
    group.rotation.y = state.facing;
    state.idleT += dt;
    if (state.landSquash > 0) state.landSquash = Math.max(0, state.landSquash - dt * 0.8);

    // gacha-weapon aura: sparks orbit the blade, the light breathes
    const sparks = rig.getWeaponSparks?.();
    if (sparks) {
      sparks.children.forEach((sp, i) => {
        const a = sp.userData.a0 + state.idleT * (1.6 + (i % 2) * 0.7);
        const r = 0.15 + (i % 3) * 0.035;
        sp.position.set(Math.cos(a) * r, Math.sin(state.idleT * 2.2 + i * 1.7) * 0.13, Math.sin(a) * r);
        sp.rotation.y = state.idleT * 3;
      });
      const aura = sparks.parent?.userData.auraLight;
      if (aura) aura.intensity = 0.75 + Math.sin(state.idleT * 3.1) * 0.3;
    }
    // weapon jewelry: rings precess (a flat torus spinning on its own axis
    // would be invisible), orbs breathe, loose fragments hover & twirl
    const wAnim = rig.getWeaponAnim?.();
    if (wAnim) {
      if (wAnim.ring) {
        wAnim.ring.rotation.x = Math.PI / 2 + Math.sin(state.idleT * 2.0) * 0.35;
        wAnim.ring.rotation.z = state.idleT * 1.4;
      }
      if (wAnim.orb) wAnim.orb.scale.setScalar(1 + Math.sin(state.idleT * 3.4) * 0.1);
      if (wAnim.floaters) {
        wAnim.floaters.forEach((f, i) => {
          f.position.y = f.userData.by + Math.sin(state.idleT * 2.6 + i * 1.9) * 0.045;
          f.rotation.y = state.idleT * 2 + i;
        });
      }
    }

    if (state.rolling > 0) {
      const t = 1 - state.rolling / ROLL_TIME;
      vis.rotation.x = t * Math.PI * 2;
      vis.position.y = visBase + Math.sin(t * Math.PI) * 0.22;
      vis.scale.setScalar(1 - Math.sin(t * Math.PI) * 0.12);
      if (t < 0.15 && Math.random() < 0.5) {
        particles?.burst(state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#a08a6a', 2, 1.2, 4, 0.4);
      }
    } else {
      vis.rotation.x = 0;
      vis.position.y = visBase;
      const squash = state.landSquash > 0 ? Math.sin((state.landSquash / 0.16) * Math.PI) * 0.14 : 0;
      vis.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
    }

    const mounted = !!state.mount;

    if (!state.grounded && state.rolling <= 0) {
      // airborne pose: legs tucked, arms out
      parts.legL.rotation.x = mounted ? 1.25 : -0.55;
      parts.legR.rotation.x = mounted ? 1.25 : -0.75;
      if (state.attackT <= 0) {
        parts.armL.rotation.x = -0.5;
        parts.armR.rotation.x = -0.5;
        parts.armL.rotation.z = 0.35;
        parts.armR.rotation.z = -0.35;
      }
    } else if (moving && state.rolling <= 0) {
      state.walkPhase += dt * (mounted ? 13 : 11);
      const sw = Math.sin(state.walkPhase) * 0.6;
      if (mounted) {
        parts.legL.rotation.x = 1.25; parts.legR.rotation.x = 1.25; // saddle pose
        if (state.attackT <= 0) {
          parts.armL.rotation.x = -0.4; parts.armR.rotation.x = -0.4; // holding reins
          parts.armL.rotation.z = 0; parts.armR.rotation.z = 0;
        }
        vis.position.y = visBase + Math.abs(Math.sin(state.walkPhase)) * 0.06;
      } else {
        parts.legL.rotation.x = sw;
        parts.legR.rotation.x = -sw;
        if (state.attackT <= 0) {
          parts.armL.rotation.x = state.shielding ? -1.2 : -sw * 0.8;
          parts.armR.rotation.x = sw * 0.8;
          parts.armL.rotation.z = 0; parts.armR.rotation.z = 0;
        }
        vis.position.y = visBase + Math.abs(Math.sin(state.walkPhase)) * 0.045;
      }
      parts.head.rotation.z = Math.sin(state.walkPhase) * 0.03;
      if (parts.capeMesh) parts.capeMesh.rotation.x = 0.35 + Math.sin(state.walkPhase * 0.5) * 0.08;
    } else if (state.rolling <= 0) {
      parts.legL.rotation.x = mounted ? 1.25 : 0;
      parts.legR.rotation.x = mounted ? 1.25 : 0;
      if (state.attackT <= 0) {
        const br = Math.sin(state.idleT * 2.2) * 0.03;
        parts.armL.rotation.x = state.shielding ? -1.2 : (mounted ? -0.4 : br);
        parts.armR.rotation.x = mounted ? -0.4 : -br;
        parts.armL.rotation.z = 0; parts.armR.rotation.z = 0;
        parts.body.scale.y = 1 + br * 0.5;
        parts.head.rotation.z = Math.sin(state.idleT * 0.9) * 0.02;
      }
      if (parts.capeMesh) parts.capeMesh.rotation.x = 0.12 + Math.sin(state.idleT * 1.4) * 0.03;
    }

    if (state.attackT > 0) {
      state.attackT -= dt;
      const t = Math.min(1, Math.max(0, 1 - state.attackT / state.attackDur));
      animateAttack(t);
      if (state.attackT <= 0) endAttackPose();
    }

    if (trailMat.opacity > 0) {
      trailMat.opacity = Math.max(0, trailMat.opacity - dt * 5);
      trail.scale.setScalar(trail.scale.x + dt * 2.4);
    }

    if (state.hurtT > 0) {
      state.hurtT -= dt;
      vis.visible = Math.sin(state.hurtT * 40) > 0 || state.hurtT <= 0;
    } else vis.visible = true;
  }

  // Attack anims: anticipation -> strike with forward lunge -> recover.
  function animateAttack(t) {
    const kind = state.attackKind;
    if (kind === 'sword') {
      if (t < 0.28) {
        const w = t / 0.28;
        parts.armR.rotation.x = -2.0 * w;
        parts.armR.rotation.z = -0.55 * w;
        vis.rotation.y = 0.5 * w;
        vis.position.z = -0.06 * w;
        parts.head.rotation.x = -0.12 * w;
      } else if (t < 0.62) {
        const w = (t - 0.28) / 0.34;
        parts.armR.rotation.x = -2.0 + 3.2 * w;
        parts.armR.rotation.z = -0.55 + 1.2 * w;
        vis.rotation.y = 0.5 - 1.1 * w;
        vis.position.z = -0.06 + 0.3 * Math.sin(w * Math.PI);
        parts.head.rotation.x = -0.12 + 0.2 * w;
        if (w > 0.15 && trailMat.opacity <= 0.01) flashTrail();
      } else {
        const w = (t - 0.62) / 0.38;
        parts.armR.rotation.x = 1.2 * (1 - w);
        parts.armR.rotation.z = 0.65 * (1 - w);
        vis.rotation.y = -0.6 * (1 - w);
        vis.position.z = 0.06 * (1 - w);
        parts.head.rotation.x = 0.08 * (1 - w);
      }
    } else if (kind === 'dagger') {
      // fluid cross-slash: crouch -> diagonal right slash -> diagonal left
      // slash -> flourish. Body leans and darts with every cut.
      const ease = (w) => 1 - (1 - w) * (1 - w); // ease-out
      if (t < 0.18) { // coil: crouch low, blades crossed behind
        const w = t / 0.18;
        vis.position.y = visBase - 0.07 * w;
        vis.rotation.y = 0.45 * w;
        vis.rotation.x = 0.1 * w;
        parts.armR.rotation.x = -0.4 * w; parts.armR.rotation.z = -0.9 * w;
        parts.armL.rotation.x = -0.4 * w; parts.armL.rotation.z = 0.9 * w;
      } else if (t < 0.45) { // slash 1: right blade sweeps down-left, dart in
        const w = ease((t - 0.18) / 0.27);
        vis.position.y = visBase - 0.07 + 0.03 * w;
        vis.rotation.y = 0.45 - 1.0 * w;
        vis.rotation.x = 0.1 - 0.06 * w;
        vis.position.z = 0.3 * Math.sin(w * Math.PI);
        parts.armR.rotation.x = -0.4 - 1.5 * w + 2.6 * w * w;
        parts.armR.rotation.z = -0.9 + 1.6 * w;
        if (w > 0.2 && trailMat.opacity <= 0.01) flashTrail();
      } else if (t < 0.72) { // slash 2: left blade mirrors, second dart
        const w = ease((t - 0.45) / 0.27);
        vis.rotation.y = -0.55 + 1.05 * w;
        vis.position.z = 0.3 * Math.sin(w * Math.PI);
        parts.armL.rotation.x = -0.4 - 1.5 * w + 2.6 * w * w;
        parts.armL.rotation.z = 0.9 - 1.6 * w;
        parts.armR.rotation.x = 0.3 * (1 - w);
        parts.armR.rotation.z = 0.7 * (1 - w) - 0.7;
        if (w > 0.2 && trailMat.opacity <= 0.3) flashTrail();
      } else { // flourish: spin blades back to reverse guard
        const w = (t - 0.72) / 0.28;
        vis.position.y = visBase - 0.04 * (1 - w);
        vis.rotation.y = 0.5 * (1 - w) * Math.sin(w * Math.PI * 2) * 0.4;
        vis.rotation.x = 0;
        vis.position.z = 0.05 * (1 - w);
        parts.armL.rotation.x = (1.1 - 1.1 * w) - 1.1 + 1.1 * w;
        parts.armL.rotation.z = -0.3 * (1 - w);
        parts.armR.rotation.x = -0.5 * (1 - w) * Math.sin(w * Math.PI);
        parts.armR.rotation.z = -0.3 * (1 - w);
      }
    } else if (kind === 'bow') {
      const arrow = rig.getBowArrow();
      if (t < 0.55) {
        const w = t / 0.55;
        parts.armL.rotation.x = -1.5;
        parts.armR.rotation.x = -1.5 + 0.001;
        parts.armR.rotation.z = 0.7 * w;
        vis.rotation.y = -0.25 * w;
        if (arrow) arrow.visible = true;
      } else {
        const w = (t - 0.55) / 0.45;
        parts.armR.rotation.z = 0;
        if (arrow) arrow.visible = false;
        parts.armL.rotation.x = -1.5 * (1 - w);
        parts.armR.rotation.x = parts.armL.rotation.x;
        vis.rotation.y = -0.25 * (1 - w);
        vis.position.z = -0.05 * Math.sin(w * Math.PI);
      }
    } else if (kind === 'staff') {
      const orb = rig.getStaffOrb();
      if (t < 0.4) {
        const w = t / 0.4;
        parts.armR.rotation.x = -1.9 * w;
        vis.rotation.y = 0.3 * w;
        if (orb) orb.scale.setScalar(1 + w * 1.1);
      } else {
        const w = (t - 0.4) / 0.6;
        parts.armR.rotation.x = -1.9 + 1.2 * w;
        vis.rotation.y = 0.3 - 0.5 * w;
        vis.position.z = 0.18 * Math.sin(w * Math.PI);
        if (orb) orb.scale.setScalar(2.1 - w * 1.1);
      }
    } else if (kind === 'spin') {
      vis.rotation.y = t * Math.PI * 2;
      parts.armR.rotation.x = -1.4;
      parts.armL.rotation.x = -1.4;
      vis.position.y = visBase + Math.sin(t * Math.PI) * 0.1;
      if (t > 0.15 && trailMat.opacity <= 0.01) flashTrail(Math.PI * 2);
    } else if (kind === 'cast') { // fishing rod cast
      if (t < 0.4) {
        parts.armR.rotation.x = -2.4 * (t / 0.4);
      } else {
        parts.armR.rotation.x = -2.4 + 2.0 * ((t - 0.4) / 0.6);
      }
    }
  }

  function endAttackPose() {
    parts.armR.rotation.set(0, 0, 0);
    parts.armL.rotation.set(0, 0, 0);
    vis.rotation.y = 0;
    vis.rotation.x = 0;
    vis.position.z = 0;
    parts.head.rotation.x = 0;
    const arrow = rig.getBowArrow();
    if (arrow) arrow.visible = false;
    const orb = rig.getStaffOrb();
    if (orb) orb.scale.setScalar(1);
  }

  function flashTrail(arc = null) {
    const def = ITEMS[state.equipped];
    trail.geometry.dispose();
    const range = Math.min(3, def.range || 2.2);
    trail.geometry = new THREE.RingGeometry(range * 0.35, range * 0.85, 16, 1,
      0, arc || (def.arc || 2.0));
    // ring local +Y maps to world -Z after the x-rotation, so center the
    // sector on local -Y to make the arc appear IN FRONT of the character
    trail.rotation.z = -(arc ? Math.PI * 2 : (def.arc || 2)) / 2 - Math.PI / 2;
    trailMat.opacity = 0.55;
    trail.scale.setScalar(1);
  }

  function tryAttack(def) {
    if (state.attackT > 0 || state.rolling > 0 || state.dead || state.busy) return false;
    const atkSpd = 1 + buffVal('atkSpeed');
    state.attackDur = (1 / def.speed) * 0.62 / atkSpd;
    state.attackKind = def.type || 'sword';
    state.attackT = state.attackDur;
    return true;
  }

  // helpers for skills & fishing
  function playSwing(mult = 1) {
    state.attackKind = ITEMS[state.equipped].type || 'sword';
    state.attackDur = 0.32 * mult;
    state.attackT = state.attackDur;
  }
  function playSpin() {
    state.attackKind = 'spin';
    state.attackDur = 0.45;
    state.attackT = state.attackDur;
  }
  function playBowDraw() {
    state.attackKind = 'bow';
    state.attackDur = 0.3;
    state.attackT = state.attackDur;
  }
  function playStaffCast() {
    state.attackKind = 'staff';
    state.attackDur = 0.35;
    state.attackT = state.attackDur;
  }
  function playCast() {
    state.attackKind = 'cast';
    state.attackDur = 0.5;
    state.attackT = state.attackDur;
  }

  function tryRoll(input, camYaw) {
    if (state.rolling > 0 || state.stamina < ROLL_COST || state.dead || state.busy || state.mount) return false;
    const mv = moveVec(input, camYaw);
    let dx, dz;
    if (mv) { dx = mv.x; dz = mv.z; }
    else { dx = Math.sin(state.facing); dz = Math.cos(state.facing); }
    state.rollDir.set(dx, dz);
    state.facing = Math.atan2(dx, dz);
    state.rolling = ROLL_TIME;
    state.stamina -= ROLL_COST;
    endAttackPose();
    state.attackT = 0;
    return true;
  }

  function takeDamage(amount) {
    if (state.rolling > 0 || state.dead) return 0;
    let dmg = amount * (1 - Math.min(0.6, buffVal('armor')));
    if (state.shielding && state.stamina > 0) {
      dmg = dmg * (1 - SHIELD_BLOCK);
      state.stamina = Math.max(0, state.stamina - amount * 1.2);
    }
    dmg = Math.max(1, Math.round(dmg));
    state.hp = Math.max(0, state.hp - dmg);
    state.hurtT = 0.5;
    state.sinceHurt = 0;
    if (state.hp <= 0) state.dead = true;
    return dmg;
  }

  function respawn() {
    state.hp = state.maxHp;
    state.stamina = state.maxStamina;
    state.dead = false;
    state.busy = false;
    state.buffs = state.buffs.filter((b) => b.id === 'petperk');
    state.pos.copy(terrain.spawn);
    state.vy = 0; state.grounded = true;
  }

  return {
    state, parts, update, tryAttack, tryRoll, tryJump, takeDamage, respawn,
    addBuff, consumeCritBuff, buffVal, setMountState, applyAppearance,
    playSwing, playSpin, playBowDraw, playStaffCast, playCast,
  };
}
