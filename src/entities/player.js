// Semesta player: cute chibi voxel character (big expressive head, small body —
// Stardew-inspired, deliberately NOT minecraft-proportioned) with full
// customization (gender, skin, hair style/color, eyes, outfit style/color, cape),
// per-class weapons and juicy attack animations (windup + lunge + trail).
import * as THREE from 'three';
import { makePlayerFaceTexture, makeBladeTexture, PALETTE } from '../gfx/textures.js';
import { ITEMS } from '../systems/items.js';
import {
  CLASSES, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, EYE_COLORS, CAPE_COLORS,
} from '../systems/classes.js';

const ROLL_TIME = 0.42;
const ROLL_SPEED = 8.5;
const ROLL_COST = 22;
const SHIELD_DRAIN = 9;
const SHIELD_BLOCK = 0.8;
const STAM_REGEN = 26;

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
  const style = (config.outfitStyle ?? 0) % 4; // 0 tunic, 1 robe, 2 leather, 3 plate
  const female = config.gender === 'female';
  const hairStyle = config.hairStyle ?? 0;
  const bald = hairStyle === 7;

  const skinMat = lam(skin);
  const clothMat = lam(outfit);
  const clothDark = new THREE.MeshLambertMaterial({ color: shadeHex(outfit, -0.38) });
  const clothLight = new THREE.MeshLambertMaterial({ color: shadeHex(outfit, 0.22) });
  const hairMat = lam(hairC);
  const hairDark = new THREE.MeshLambertMaterial({ color: shadeHex(hairC, -0.22) });
  const bootMat = lam('#4a3a2c');
  const leatherMat = lam('#6e5438');

  const group = new THREE.Group();          // root (at the feet)
  const vis = new THREE.Group();            // pivot at the waist -> rolls spin around center
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

  if (style === 0) { // tunic: belt + small skirt flare
    const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.03, 0.06, 0.25), clothDark);
    at(belt, 0, 0.33, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), lam('#c8a03a'));
    buckle.position.set(0, 0, 0.13); belt.add(buckle);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.06, 0.09, 0.27), clothMat);
    at(skirt, 0, 0.28, 0);
  } else if (style === 1) { // robe: long flowing skirt over the legs
    const robe = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.3, 0.28), clothMat);
    at(robe, 0, 0.18, 0);
    robe.castShadow = true;
    const sash = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.05, 0.05, 0.26), clothLight);
    at(sash, 0, 0.34, 0);
  } else if (style === 2) { // leather: chest strap + shoulder straps
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.24), leatherMat);
    strap.rotation.z = 0.5;
    at(strap, 0, 0.5, 0.005);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.03, 0.07, 0.25), leatherMat);
    at(belt, 0, 0.32, 0);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), lam('#8a6a48'));
    pouch.position.set(0.12, -0.04, 0.11); belt.add(pouch);
  } else { // plate: chestplate + gold trim
    const chest = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.05, 0.24, 0.26), clothLight);
    at(chest, 0, 0.55, 0);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.06, 0.04, 0.27), lam('#c8a03a'));
    at(trim, 0, 0.42, 0);
  }

  // --- arms (pivot at the shoulder for natural swings) ---
  function makeArm(x) {
    const pivot = new THREE.Group();
    at(pivot, x, 0.64, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.12), skinMat);
    arm.position.y = -0.14;
    arm.castShadow = true;
    pivot.add(arm);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.14),
      style === 3 ? clothLight : clothMat);
    sleeve.position.y = -0.04;
    pivot.add(sleeve);
    return pivot;
  }
  const armL = makeArm(-(bw / 2 + 0.06));
  const armR = makeArm(bw / 2 + 0.06);

  // plate shoulder pads
  if (style === 3) {
    for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.18), clothDark);
      pad.position.set(sx * 0.02, 0.04, 0);
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
  const faceTex = makePlayerFaceTexture(skin, hairC, eyeC, female, bald);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
  const headSideMat = bald ? skinMat : hairMat;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.48),
    [headSideMat, headSideMat, bald ? skinMat : hairMat, skinMat, faceMat, headSideMat]);
  at(head, 0, 0.95, 0);
  head.castShadow = true;

  // --- hair styles: extra geometry on the head so styles read clearly ---
  const hairParts = [];
  const addHair = (geo, mat, x, y, z, rx = 0) => {
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x, y, z);
    p.rotation.x = rx;
    head.add(p);
    hairParts.push(p);
    return p;
  };
  if (!bald) {
    if (hairStyle === 0) { // short: neat back volume
      addHair(new THREE.BoxGeometry(0.54, 0.22, 0.14), hairMat, 0, 0.1, -0.22);
    } else if (hairStyle === 1) { // spiky
      for (const [dx, dz, s] of [[-0.14, 0.02, 0.13], [0.02, 0.1, 0.15], [0.14, -0.04, 0.12], [-0.02, -0.12, 0.14], [0.1, 0.12, 0.11]]) {
        addHair(new THREE.BoxGeometry(s, 0.16, s), hairMat, dx, 0.28, dz);
      }
    } else if (hairStyle === 2) { // long: flowing back panel
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
    }
  }

  // --- cape ---
  let capeMesh = null;
  if ((config.cape ?? -1) >= 0) {
    const capeC = CAPE_COLORS[config.cape % CAPE_COLORS.length];
    capeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.04), lam(capeC));
    capeMesh.position.set(0, -0.26, -0.15);
    const capePivot = new THREE.Group();
    at(capePivot, 0, 0.66, -0.02);
    capePivot.add(capeMesh);
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

  // --- weapons ---
  let weaponGroup = null;
  let bowArrow = null;
  let staffOrb = null;

  function setWeapon(id) {
    if (weaponGroup) { weaponGroup.parent.remove(weaponGroup); weaponGroup = null; }
    bowArrow = null; staffOrb = null;
    const def = ITEMS[id];
    if (!def) return;
    const s = def.scale || 1;
    const g = new THREE.Group();

    if (def.type === 'sword' || !def.type) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 1.0 * s, 0.26 * s),
        new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) }));
      blade.position.y = 0.66 * s;
      blade.castShadow = true;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.06, 0.34 * s), lam('#5a4630'));
      guard.position.y = 0.14;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.08), lam(PALETTE.torchWood));
      grip.position.y = 0.02;
      g.add(blade, guard, grip);
      handR.add(g);
    } else if (def.type === 'dagger') {
      const mk = () => {
        const d = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46 * (s / 0.72), 0.12),
          new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) }));
        blade.position.y = 0.3;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), lam('#5a4630'));
        d.add(blade, grip);
        return d;
      };
      g.add(mk());
      handR.add(g);
      const off = mk();
      off.rotation.z = 0.15;
      handL.add(off);
      g.userData.offhand = off;
    } else if (def.type === 'bow') {
      const [dark, light] = def.blade;
      const limbMat = lam(dark);
      // bow made from curved box segments
      for (let i = 0; i < 7; i++) {
        const t = i / 6 - 0.5;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15 * s, 0.06), i === 3 ? lam(light) : limbMat);
        seg.position.set(Math.cos(t * Math.PI) * 0.15 * s, t * 0.82 * s, 0);
        seg.rotation.z = -t * 1.0;
        g.add(seg);
      }
      const stringGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.05, 0.42 * s, 0), new THREE.Vector3(-0.13 * s, 0, 0), new THREE.Vector3(-0.05, -0.42 * s, 0),
      ]);
      g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xd8d8c8 })));
      bowArrow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(light) }));
      bowArrow.position.set(-0.06, 0, 0.12);
      bowArrow.visible = false;
      g.add(bowArrow);
      g.rotation.y = Math.PI / 2;
      handL.add(g);
    } else if (def.type === 'staff') {
      const [dark, light] = def.blade;
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35 * s, 0.06), lam('#5a4630'));
      rod.position.y = 0.4;
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.11), lam(dark));
      collar.position.y = 1.0;
      staffOrb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(light) }));
      staffOrb.position.y = 1.14;
      g.add(rod, collar, staffOrb);
      handR.add(g);
    }
    weaponGroup = g;
  }

  return {
    group, vis,
    parts: { head, body, legL, legR, armL, armR, handR, handL, shieldMesh, hairParts, capeMesh },
    setWeapon,
    getBowArrow: () => bowArrow,
    getStaffOrb: () => staffOrb,
  };
}

// ---------------------------------------------------------------------------
// Player runtime
// ---------------------------------------------------------------------------
export function createPlayer(terrain, decorBlocked, config, particles) {
  const cls = CLASSES[config.cls];
  const rig = buildCharacterMesh(config);
  const { group, vis, parts } = rig;
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
    busy: false, // true while fishing / in dialog — blocks combat input
    equipWeapon: (id) => {
      state.equipped = id;
      rig.setWeapon(id);
      const def = ITEMS[id];
      trailMat.color = new THREE.Color(def.blade?.[1] || '#ffffff');
    },
  };
  rig.setWeapon(cls.startWeapon);
  trailMat.color = new THREE.Color(ITEMS[cls.startWeapon].blade[1]);

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
  // forward (W) must move AWAY from the camera: fwd = (-sin(yaw), -cos(yaw)),
  // right (D) = (cos(yaw), -sin(yaw)).
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

  function update(dt, input, camYaw) {
    if (state.dead) return;

    // buff timers
    for (let i = state.buffs.length - 1; i >= 0; i--) {
      state.buffs[i].t -= dt;
      if (state.buffs[i].t <= 0) state.buffs.splice(i, 1);
    }
    state.dmgBonusBuff = buffVal('dmg');

    // hp regen buff (pets)
    const regen = buffVal('regen');
    if (regen > 0) state.hp = Math.min(state.maxHp, state.hp + regen * dt);

    const mv = (state.rolling <= 0 && !state.busy) ? moveVec(input, camYaw) : null;
    const moving = !!mv;

    let vx = 0, vz = 0;
    if (state.rolling > 0) {
      state.rolling -= dt;
      vx = state.rollDir.x * ROLL_SPEED;
      vz = state.rollDir.y * ROLL_SPEED;
    } else if (moving) {
      let sp = cls.speed * (1 + buffVal('speed'));
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

    const targetY = terrain.surfaceY(state.pos.x, state.pos.z);
    state.pos.y += (targetY - state.pos.y) * Math.min(1, dt * 14);

    // shield (only classes with one)
    state.shielding = cls.hasShield && input.keys.has('ShiftLeft') && state.stamina > 1 && state.rolling <= 0;
    parts.shieldMesh.visible = state.shielding;
    if (state.shielding) {
      state.stamina = Math.max(0, state.stamina - SHIELD_DRAIN * dt);
      parts.armL.rotation.x = -1.2;
    }
    if (!state.shielding) state.stamina = Math.min(state.maxStamina, state.stamina + STAM_REGEN * dt);

    // === ANIMATION ===
    group.rotation.y = state.facing;
    state.idleT += dt;

    if (state.rolling > 0) {
      // flip around the waist pivot + a little hop
      const t = 1 - state.rolling / ROLL_TIME;
      vis.rotation.x = t * Math.PI * 2;
      vis.position.y = 0.55 + Math.sin(t * Math.PI) * 0.22;
      vis.scale.setScalar(1 - Math.sin(t * Math.PI) * 0.12);
      if (t < 0.15 && Math.random() < 0.5) {
        particles?.burst(state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#a08a6a', 2, 1.2, 4, 0.4);
      }
    } else {
      vis.rotation.x = 0;
      vis.position.y = 0.55;
      vis.scale.setScalar(1);
    }

    if (moving && state.rolling <= 0) {
      state.walkPhase += dt * 11;
      const sw = Math.sin(state.walkPhase) * 0.6;
      parts.legL.rotation.x = sw;
      parts.legR.rotation.x = -sw;
      if (state.attackT <= 0) {
        parts.armL.rotation.x = state.shielding ? -1.2 : -sw * 0.8;
        parts.armR.rotation.x = sw * 0.8;
      }
      vis.position.y = 0.55 + Math.abs(Math.sin(state.walkPhase)) * 0.045;
      parts.head.rotation.z = Math.sin(state.walkPhase) * 0.03;
      if (parts.capeMesh) parts.capeMesh.rotation.x = 0.35 + Math.sin(state.walkPhase * 0.5) * 0.08;
    } else if (state.rolling <= 0) {
      parts.legL.rotation.x = parts.legR.rotation.x = 0;
      if (state.attackT <= 0) {
        // idle: gentle breathing + arm sway + head tilt
        const br = Math.sin(state.idleT * 2.2) * 0.03;
        parts.armL.rotation.x = state.shielding ? -1.2 : br;
        parts.armR.rotation.x = -br;
        parts.body.scale.y = 1 + br * 0.5;
        parts.head.rotation.z = Math.sin(state.idleT * 0.9) * 0.02;
      }
      if (parts.capeMesh) parts.capeMesh.rotation.x = 0.12 + Math.sin(state.idleT * 1.4) * 0.03;
    }

    // per-weapon attack animation
    if (state.attackT > 0) {
      state.attackT -= dt;
      const t = Math.min(1, Math.max(0, 1 - state.attackT / state.attackDur)); // 0..1
      animateAttack(t);
      if (state.attackT <= 0) endAttackPose();
    }

    // trail fade
    if (trailMat.opacity > 0) {
      trailMat.opacity = Math.max(0, trailMat.opacity - dt * 5);
      trail.scale.setScalar(trail.scale.x + dt * 2.4);
    }

    // blink while hurt
    if (state.hurtT > 0) {
      state.hurtT -= dt;
      vis.visible = Math.sin(state.hurtT * 40) > 0 || state.hurtT <= 0;
    } else vis.visible = true;
  }

  // Attack anims: windup -> strike WITH a forward lunge -> recover.
  // vis.position.z is local forward (the group itself is rotated to `facing`).
  function animateAttack(t) {
    const kind = state.attackKind;
    if (kind === 'sword') {
      if (t < 0.28) { // windup: raise high, coil body back
        const w = t / 0.28;
        parts.armR.rotation.x = -2.0 * w;
        parts.armR.rotation.z = -0.55 * w;
        vis.rotation.y = 0.5 * w;
        vis.position.z = -0.06 * w;
        parts.head.rotation.x = -0.12 * w;
      } else if (t < 0.62) { // slash: fast arc + lunge forward
        const w = (t - 0.28) / 0.34;
        parts.armR.rotation.x = -2.0 + 3.2 * w;
        parts.armR.rotation.z = -0.55 + 1.2 * w;
        vis.rotation.y = 0.5 - 1.1 * w;
        vis.position.z = -0.06 + 0.3 * Math.sin(w * Math.PI);
        parts.head.rotation.x = -0.12 + 0.2 * w;
        if (w > 0.15 && trailMat.opacity <= 0.01) flashTrail();
      } else { // recover
        const w = (t - 0.62) / 0.38;
        parts.armR.rotation.x = 1.2 * (1 - w);
        parts.armR.rotation.z = 0.65 * (1 - w);
        vis.rotation.y = -0.6 * (1 - w);
        vis.position.z = 0.06 * (1 - w);
        parts.head.rotation.x = 0.08 * (1 - w);
      }
    } else if (kind === 'dagger') {
      // two alternating stabs, whole body darting forward on each
      const stab = (w) => 2.1 * Math.sin(w * Math.PI);
      const dart = (w) => 0.22 * Math.sin(w * Math.PI);
      if (t < 0.5) {
        const w = t / 0.5;
        parts.armR.rotation.x = -stab(w);
        vis.rotation.y = 0.25 * Math.sin(w * Math.PI);
        vis.position.z = dart(w);
      } else {
        const w = (t - 0.5) / 0.5;
        parts.armL.rotation.x = -stab(w);
        vis.rotation.y = -0.25 * Math.sin(w * Math.PI);
        vis.position.z = dart(w);
      }
    } else if (kind === 'bow') {
      const arrow = rig.getBowArrow();
      if (t < 0.55) { // draw
        const w = t / 0.55;
        parts.armL.rotation.x = -1.5;
        parts.armR.rotation.x = -1.5 + 0.001;
        parts.armR.rotation.z = 0.7 * w;
        vis.rotation.y = -0.25 * w; // turn side-on like a real archer
        if (arrow) arrow.visible = true;
      } else { // release: snap + slight recoil
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
      if (t < 0.4) { // charge: orb swells, body coils
        const w = t / 0.4;
        parts.armR.rotation.x = -1.9 * w;
        vis.rotation.y = 0.3 * w;
        if (orb) orb.scale.setScalar(1 + w * 1.1);
      } else { // thrust forward
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
      vis.position.y = 0.55 + Math.sin(t * Math.PI) * 0.1;
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
    trail.rotation.z = -(arc ? 0 : (def.arc || 2) / 2) + Math.PI / 2;
    trailMat.opacity = 0.55;
    trail.scale.setScalar(1);
  }

  // start the attack animation; damage itself is applied by main via timeouts
  function tryAttack(def) {
    if (state.attackT > 0 || state.rolling > 0 || state.dead || state.busy) return false;
    const atkSpd = 1 + buffVal('atkSpeed');
    state.attackDur = (1 / def.speed) * 0.62 / atkSpd;
    state.attackKind = def.type || 'sword';
    state.attackT = state.attackDur;
    return true;
  }

  // helpers for skills
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
    if (state.rolling > 0 || state.stamina < ROLL_COST || state.dead || state.busy) return false;
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
    let dmg = amount;
    if (state.shielding && state.stamina > 0) {
      dmg = Math.max(1, Math.round(amount * (1 - SHIELD_BLOCK)));
      state.stamina = Math.max(0, state.stamina - amount * 1.2);
    }
    state.hp = Math.max(0, state.hp - dmg);
    state.hurtT = 0.5;
    if (state.hp <= 0) state.dead = true;
    return dmg;
  }

  function respawn() {
    state.hp = state.maxHp;
    state.stamina = state.maxStamina;
    state.dead = false;
    state.busy = false;
    state.buffs = [];
    state.pos.copy(terrain.spawn);
  }

  return {
    state, update, tryAttack, tryRoll, takeDamage, respawn,
    addBuff, consumeCritBuff, buffVal,
    playSwing, playSpin, playBowDraw, playStaffCast, playCast,
  };
}
