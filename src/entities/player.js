// Player Semesta: karakter voxel hasil kustomisasi (gender, kulit, rambut, outfit)
// dengan senjata per class dan animasi (windup+slash+trail, roll pivot tengah, dsb).
import * as THREE from 'three';
import { makePlayerFaceTexture, makeBladeTexture, PALETTE } from '../gfx/textures.js';
import { ITEMS } from '../systems/items.js';
import { CLASSES, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS } from '../systems/classes.js';

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
// Pembangun mesh karakter — dipakai game & preview character creation.
// ---------------------------------------------------------------------------
export function buildCharacterMesh(config) {
  const skin = SKIN_TONES[config.skin % SKIN_TONES.length];
  const hairC = HAIR_COLORS[config.hairColor % HAIR_COLORS.length];
  const outfit = OUTFIT_COLORS[config.outfit % OUTFIT_COLORS.length];
  const female = config.gender === 'female';
  const bald = config.hairStyle === 4;

  const skinMat = lam(skin);
  const clothMat = lam(outfit);
  const clothDark = new THREE.MeshLambertMaterial({ color: shadeHex(outfit, -0.35) });
  const hairMat = lam(hairC);

  const group = new THREE.Group();          // akar (di kaki)
  const vis = new THREE.Group();            // pivot di pinggang -> roll berputar di tengah badan
  vis.position.y = 0.62;
  group.add(vis);
  const at = (obj, x, y, z) => { obj.position.set(x, y - 0.62, z); vis.add(obj); return obj; };

  // kepala
  const faceTex = makePlayerFaceTexture(skin, hairC, female, bald);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
  const headTop = bald ? skinMat : hairMat;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4),
    [bald ? skinMat : hairMat, bald ? skinMat : hairMat, headTop, skinMat, faceMat, bald ? skinMat : hairMat]);
  at(head, 0, 1.08, 0);
  head.castShadow = true;

  // gaya rambut ekstra
  const hairParts = [];
  if (!bald) {
    if (config.hairStyle === 1) { // jabrik
      for (const [dx, dz] of [[-0.1, 0], [0.08, 0.08], [0, -0.09], [0.14, -0.05]]) {
        const spike = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), hairMat);
        at(spike, dx, 1.34, dz);
        hairParts.push(spike);
      }
    } else if (config.hairStyle === 2) { // panjang
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.12), hairMat);
      at(back, 0, 0.92, -0.24);
      hairParts.push(back);
    } else if (config.hairStyle === 3) { // kuncir
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.13), hairMat);
      at(tail, 0, 1.02, -0.26);
      tail.rotation.x = 0.35;
      hairParts.push(tail);
    }
  }

  // badan (wanita sedikit lebih ramping)
  const bw = female ? 0.36 : 0.42;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.44, female ? 0.24 : 0.27), clothMat);
  at(body, 0, 0.64, 0);
  body.castShadow = true;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.02, 0.08, (female ? 0.24 : 0.27) + 0.02), clothDark);
  at(belt, 0, 0.44, 0);

  // kaki
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.18), clothDark);
  at(legL, -0.1, 0.21, 0);
  const legR = legL.clone();
  at(legR, 0.1, 0.21, 0);
  legL.castShadow = legR.castShadow = true;

  // lengan (pivot di bahu supaya ayunan natural)
  function makeArm(x) {
    const pivot = new THREE.Group();
    at(pivot, x, 0.85, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.14), skinMat);
    arm.position.y = -0.18;
    arm.castShadow = true;
    pivot.add(arm);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.16), clothMat);
    sleeve.position.y = -0.06;
    pivot.add(sleeve);
    return pivot;
  }
  const armL = makeArm(-(bw / 2 + 0.07));
  const armR = makeArm(bw / 2 + 0.07);

  // tangan kanan: pivot senjata
  const handR = new THREE.Group();
  handR.position.set(0, -0.38, 0.02);
  armR.add(handR);
  const handL = new THREE.Group();
  handL.position.set(0, -0.38, 0.02);
  armL.add(handL);

  // perisai (Ksatria)
  const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.08), lam('#6e5438'));
  shieldMesh.position.set(-0.02, 0.02, 0.06);
  const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.04), lam('#4a3a2a'));
  shieldRim.position.z = -0.03;
  shieldMesh.add(shieldRim);
  shieldMesh.visible = false;
  handL.add(shieldMesh);

  // --- senjata ---
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
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 1.1 * s, 0.28 * s),
        new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) }));
      blade.position.y = 0.72 * s;
      blade.castShadow = true;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.07, 0.38 * s), lam('#5a4630'));
      guard.position.y = 0.16;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.09), lam(PALETTE.torchWood));
      grip.position.y = 0.02;
      g.add(blade, guard, grip);
      handR.add(g);
    } else if (def.type === 'dagger') {
      const mk = () => {
        const d = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5 * (s / 0.72), 0.14),
          new THREE.MeshLambertMaterial({ map: makeBladeTexture(def.blade) }));
        blade.position.y = 0.32;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), lam('#5a4630'));
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
      // busur dari segmen kotak melengkung
      for (let i = 0; i < 7; i++) {
        const t = i / 6 - 0.5;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16 * s, 0.07), i === 3 ? lam(light) : limbMat);
        seg.position.set(Math.cos(t * Math.PI) * 0.16 * s, t * 0.9 * s, 0);
        seg.rotation.z = -t * 1.0;
        g.add(seg);
      }
      // tali
      const stringGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.05, 0.45 * s, 0), new THREE.Vector3(-0.14 * s, 0, 0), new THREE.Vector3(-0.05, -0.45 * s, 0),
      ]);
      g.add(new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xd8d8c8 })));
      // panah siap tembak
      bowArrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(light) }));
      bowArrow.position.set(-0.06, 0, 0.12);
      bowArrow.visible = false;
      g.add(bowArrow);
      g.rotation.y = Math.PI / 2;
      handL.add(g);
    } else if (def.type === 'staff') {
      const [dark, light] = def.blade;
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5 * s, 0.07), lam('#5a4630'));
      rod.position.y = 0.45;
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), lam(dark));
      collar.position.y = 1.1;
      staffOrb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(light) }));
      staffOrb.position.y = 1.26;
      g.add(rod, collar, staffOrb);
      handR.add(g);
    }
    weaponGroup = g;
  }

  return {
    group, vis,
    parts: { head, body, legL, legR, armL, armR, handR, handL, shieldMesh, hairParts },
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

  // trail ayunan (sektor cincin) untuk melee
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
    return { x: (mx * cos - mz * sin) / len, z: (mx * sin + mz * cos) / len };
  }

  function update(dt, input, camYaw) {
    if (state.dead) return;

    // buff timer
    for (let i = state.buffs.length - 1; i >= 0; i--) {
      state.buffs[i].t -= dt;
      if (state.buffs[i].t <= 0) state.buffs.splice(i, 1);
    }
    state.dmgBonusBuff = buffVal('dmg');

    const mv = state.rolling <= 0 ? moveVec(input, camYaw) : null;
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

    // shield (hanya class dengan perisai)
    state.shielding = cls.hasShield && input.keys.has('ShiftLeft') && state.stamina > 1 && state.rolling <= 0;
    parts.shieldMesh.visible = state.shielding;
    if (state.shielding) {
      state.stamina = Math.max(0, state.stamina - SHIELD_DRAIN * dt);
      parts.armL.rotation.x = -1.2;
    }
    if (!state.shielding) state.stamina = Math.min(state.maxStamina, state.stamina + STAM_REGEN * dt);

    // === ANIMASI ===
    group.rotation.y = state.facing;
    state.idleT += dt;

    if (state.rolling > 0) {
      // salto di pivot pinggang + sedikit lompatan — tidak lagi "masuk tanah"
      const t = 1 - state.rolling / ROLL_TIME;
      vis.rotation.x = t * Math.PI * 2;
      vis.position.y = 0.62 + Math.sin(t * Math.PI) * 0.22;
      vis.scale.setScalar(1 - Math.sin(t * Math.PI) * 0.12);
      if (t < 0.15 && Math.random() < 0.5) {
        particles?.burst(state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#8a7a62', 2, 1.2, 4, 0.4);
      }
    } else {
      vis.rotation.x = 0;
      vis.position.y = 0.62;
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
      vis.position.y = 0.62 + Math.abs(Math.sin(state.walkPhase)) * 0.045;
    } else if (state.rolling <= 0) {
      parts.legL.rotation.x = parts.legR.rotation.x = 0;
      if (state.attackT <= 0) {
        // idle: napas halus + lengan sway
        const br = Math.sin(state.idleT * 2.2) * 0.03;
        parts.armL.rotation.x = state.shielding ? -1.2 : br;
        parts.armR.rotation.x = -br;
        parts.body.scale.y = 1 + br * 0.5;
      }
    }

    // animasi serangan per tipe senjata
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

    // kedip saat kena hit
    if (state.hurtT > 0) {
      state.hurtT -= dt;
      vis.visible = Math.sin(state.hurtT * 40) > 0 || state.hurtT <= 0;
    } else vis.visible = true;
  }

  function animateAttack(t) {
    const kind = state.attackKind;
    if (kind === 'sword') {
      // windup (0..0.3) lalu slash cepat (0.3..0.65)
      if (t < 0.3) {
        const w = t / 0.3;
        parts.armR.rotation.x = -1.6 * w;
        parts.armR.rotation.z = -0.5 * w;
        vis.rotation.y = 0.35 * w;
      } else if (t < 0.7) {
        const w = (t - 0.3) / 0.4;
        parts.armR.rotation.x = -1.6 + 2.6 * w;
        parts.armR.rotation.z = -0.5 + 1.1 * w;
        vis.rotation.y = 0.35 - 0.8 * w;
        if (w > 0.2 && trailMat.opacity <= 0.01) flashTrail();
      } else {
        const w = (t - 0.7) / 0.3;
        parts.armR.rotation.x = 1.0 * (1 - w);
        parts.armR.rotation.z = 0.6 * (1 - w);
        vis.rotation.y = -0.45 * (1 - w);
      }
    } else if (kind === 'dagger') {
      // dua tusukan bergantian
      const stab = (w) => 1.9 * Math.sin(w * Math.PI);
      if (t < 0.5) {
        parts.armR.rotation.x = -stab(t / 0.5);
        vis.rotation.y = 0.2 * Math.sin(t * Math.PI * 2);
      } else {
        parts.armL.rotation.x = -stab((t - 0.5) / 0.5);
        vis.rotation.y = -0.2 * Math.sin(t * Math.PI * 2);
      }
    } else if (kind === 'bow') {
      const arrow = rig.getBowArrow();
      if (t < 0.55) {
        const w = t / 0.55;
        parts.armL.rotation.x = -1.5;                 // pegang busur ke depan
        parts.armR.rotation.x = -1.5 + 0.001;
        parts.armR.rotation.z = 0.6 * w;              // tarik tali
        if (arrow) arrow.visible = true;
      } else {
        parts.armR.rotation.z = 0;
        if (arrow) arrow.visible = false;
        parts.armL.rotation.x = -1.5 * (1 - (t - 0.55) / 0.45);
        parts.armR.rotation.x = parts.armL.rotation.x;
      }
    } else if (kind === 'staff') {
      const orb = rig.getStaffOrb();
      if (t < 0.4) {
        const w = t / 0.4;
        parts.armR.rotation.x = -1.7 * w;
        if (orb) orb.scale.setScalar(1 + w * 0.8);
      } else {
        const w = (t - 0.4) / 0.6;
        parts.armR.rotation.x = -1.7 + 0.9 * w;
        if (orb) orb.scale.setScalar(1.8 - w * 0.8);
      }
    } else if (kind === 'spin') {
      vis.rotation.y = t * Math.PI * 2;
      parts.armR.rotation.x = -1.4;
      parts.armL.rotation.x = -1.4;
      if (t > 0.15 && trailMat.opacity <= 0.01) flashTrail(Math.PI * 2);
    }
  }

  function endAttackPose() {
    parts.armR.rotation.set(0, 0, 0);
    parts.armL.rotation.set(0, 0, 0);
    vis.rotation.y = 0;
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

  // mulai animasi serangan; damage dieksekusi main lewat setTimeout terpisah
  function tryAttack(def) {
    if (state.attackT > 0 || state.rolling > 0 || state.dead) return false;
    const atkSpd = 1 + buffVal('atkSpeed');
    state.attackDur = (1 / def.speed) * 0.62 / atkSpd;
    state.attackKind = def.type || 'sword';
    state.attackT = state.attackDur;
    return true;
  }

  // helper untuk skills
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

  function tryRoll(input, camYaw) {
    if (state.rolling > 0 || state.stamina < ROLL_COST || state.dead) return false;
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
    state.buffs = [];
    state.pos.copy(terrain.spawn);
  }

  return {
    state, update, tryAttack, tryRoll, takeDamage, respawn,
    addBuff, consumeCritBuff,
    playSwing, playSpin, playBowDraw, playStaffCast,
  };
}
