// FISHING — cast, read the float, set the hook, fight the fish, land it.
//
// It used to be cast -> wait -> "!" -> press -> a spinning icon flies into your
// hands. Every fish in the game, from a minnow to the Leviathan, was the same
// single button press, so the rarity of what you caught was something that
// happened TO you rather than something you did.
//
// Now it runs the way fishing actually goes:
//   CAST     the float flies out on an arc and lands as far out as the water
//            allows, not at your feet
//   WAIT     a fish circles in; it may NIBBLE (small dips) before it takes —
//            strike on a nibble and you spook it
//   BITE     the float goes under: strike now
//   FIGHT    hold to reel. The fish alternates between RUNS and rests; reel
//            through a run and the line tension climbs until it snaps, let it
//            run and it takes line back. Reel on the rests, ease off on the
//            runs. A rare fish may LEAP — keep the line slack while it is in
//            the air or it throws the hook. Bigger fish pull harder and longer.
//   LAND     it comes out of the water into your hands and you hold it up.
// Every catch has a size and a weight, and the biggest of each species is
// kept as a record.
//
// AFK fishing skips the fight (it is hands-free) and keeps its poor odds.
import * as THREE from 'three';
import { WATER_Y } from '../world/terrain.js';
import { waveAt } from '../world/water.js';
import { ITEMS } from './items.js';
import { buildFishModel, rollFishSize, fishWorldLen } from '../gfx/fishmodel.js';

const BITE_WINDOW = 0.9;
// how hard a fish of each tier pulls, before its own size is applied
const RARITY_STR = { common: 0.26, uncommon: 0.38, rare: 0.52, epic: 0.66, legendary: 0.82, mythic: 1.0 };
const LAND_D = 1.1;        // the fish is at your feet
const MAX_CAST = 6.5;

export function createFishing({ scene, terrain, player, particles, audio, hooks, camera }) {
  // hooks: { onCatch(fishId, xp, rarity, extra, info), onMiss(msg), isReeling(),
  //          gauge(data|null), camYaw(), isNight(), skillBonus(key) }
  const state = {
    phase: 'idle', // idle | casting | waiting | bite | fight | landing | showing
    t: 0,
    spot: null,
    afk: false,   // auto-fishing: hands-free, but worse rarity odds
    afkT: 0,
    records: {},  // species id -> longest catch, cm
    fight: null,
  };

  // --- the rod: grip, reel, butt, and a TIP on its own pivot so it can bend
  const rod = new THREE.Group();
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const tipPivot = new THREE.Group();
  const crank = new THREE.Group();
  {
    const wood = lam(0x8a6a48);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.22, 6), lam(0x4a3626));
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.56, 5), wood);
    butt.position.y = 0.38;
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.035, 10), lam(0xc8a03a));
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0, 0.14, 0.05);
    crank.position.set(0.024, 0.14, 0.05);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.06), lam(0x6a5030));
    arm.position.z = 0.025;
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), lam(0xf0e6d0));
    knob.position.set(0.012, 0, 0.055);
    crank.add(arm, knob);
    tipPivot.position.y = 0.66;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.014, 0.52, 4), wood);
    tip.position.y = 0.26;
    // guides along the rod — tiny rings are what make a stick read as tackle
    for (const y of [0.3, 0.52]) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 3, 6), lam(0xd8d0c0));
      g.position.set(0, y, 0.02);
      rod.add(g);
    }
    tipPivot.add(tip);
    rod.add(grip, butt, reel, crank, tipPivot);
    rod.rotation.x = -0.5;
  }
  rod.visible = false;
  const rodTip = new THREE.Object3D();
  rodTip.position.set(0, 0.52, 0);
  tipPivot.add(rodTip);

  // --- the line: 12 points so a slack line can SAG and a tight one can't.
  // A RIBBON turned to face the camera, not a GL line: a line is one device
  // pixel whatever the distance, and at the gameplay camera it simply was not
  // there — the float hung in the water attached to nothing.
  const LINE_N = 12;
  const LINE_W = 0.016;
  const lineGeo = new THREE.BufferGeometry();
  const ribbon = new Float32Array(3 * LINE_N * 2);
  const pts = Array.from({ length: LINE_N }, () => new THREE.Vector3());
  lineGeo.setAttribute('position', new THREE.BufferAttribute(ribbon, 3));
  {
    const idx = [];
    for (let i = 0; i < LINE_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    lineGeo.setIndex(idx);
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2ecd8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const line = new THREE.Mesh(lineGeo, lineMat);
  line.frustumCulled = false;
  line.renderOrder = 2;
  line.visible = false;
  scene.add(line);

  // --- the float: a real two-tone float with a quill, not three boxes
  const bobber = new THREE.Group();
  {
    const red = new THREE.MeshBasicMaterial({ color: 0xe04848 });
    const white = new THREE.MeshBasicMaterial({ color: 0xf6f2e8 });
    const topH = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), red);
    topH.position.y = 0.02;
    const botH = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white);
    botH.position.y = 0.02;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.014, 10), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
    band.position.y = 0.02;
    const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 4), red);
    quill.position.y = 0.16;
    bobber.add(topH, botH, band, quill);
  }
  bobber.visible = false;
  scene.add(bobber);

  // "!" alert sprite
  const alertC = document.createElement('canvas');
  alertC.width = 32; alertC.height = 32;
  {
    const ctx = alertC.getContext('2d');
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 5;
    ctx.strokeText('!', 16, 27);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText('!', 16, 27);
  }
  const alertTex = new THREE.CanvasTexture(alertC);
  alertTex.magFilter = THREE.NearestFilter;
  const alert = new THREE.Sprite(new THREE.SpriteMaterial({ map: alertTex, transparent: true, depthTest: false }));
  alert.scale.set(0.5, 0.5, 1);
  alert.visible = false;
  scene.add(alert);

  // the fish's SHADOW circling in while you wait — the real fish only shows
  // itself once it is hooked
  const shadow = new THREE.Group();
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x16242e, transparent: true, opacity: 0.38, depthWrite: false });
  {
    const body = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), shadowMat);
    body.rotation.x = -Math.PI / 2;
    body.scale.set(1, 1.8, 1);
    shadow.add(body);
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), shadowMat);
      fin.rotation.x = -Math.PI / 2;
      fin.scale.set(1, 1.6, 1);
      fin.position.set(sx * 0.2, 0, 0.05);
      fin.rotation.z = sx * 0.7;
      shadow.add(fin);
    }
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.4);
  const tailFin = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), shadowMat);
  tailFin.rotation.x = -Math.PI / 2;
  tailFin.scale.set(1, 1.5, 1);
  tailFin.position.z = -0.1;
  tailPivot.add(tailFin);
  shadow.add(tailPivot);
  shadow.visible = false;
  scene.add(shadow);
  let shadowAng = 0;
  const setShadowHeading = (dx, dz) => { shadow.rotation.y = Math.atan2(dx, dz); };

  // the fish itself, swapped in per catch
  const fishHolder = new THREE.Group();
  fishHolder.visible = false;
  scene.add(fishHolder);
  let model = null;

  const ROD_REST = -0.5;
  let bobT = 0, rippleT = 0, reelTick = 0, splashT = 0;
  const _tip = new THREE.Vector3();
  const _v = new THREE.Vector3();
  let hooked = null;   // { id, xp, rarity, cm, kg, k }
  let nibbles = [];
  let nibbleT = 0;     // >0 while the float is dipping on a nibble
  let fly = null;      // casting / landing flight

  const isOcean = (x, z) => !!terrain.inOcean?.(x, z);
  const surfaceY = (x, z, time) => WATER_Y + waveAt(x, z, time, isOcean(x, z)).h;

  /** Nearest water in front of you, then as far out as it stays water. */
  function findSpot() {
    const p = player.state.pos;
    const f = player.state.facing;
    const tryDir = (a) => {
      let first = -1;
      for (let d = 0.8; d <= 3.0; d += 0.2) {
        if (terrain.isWater(p.x + Math.sin(a) * d, p.z + Math.cos(a) * d)) { first = d; break; }
      }
      if (first < 0) return null;
      let far = first;
      for (let d = first; d <= Math.min(MAX_CAST, first + 4.6); d += 0.35) {
        if (terrain.isWater(p.x + Math.sin(a) * d, p.z + Math.cos(a) * d)) far = d; else break;
      }
      const d = first + (far - first) * (0.72 + Math.random() * 0.2);
      return { spot: new THREE.Vector3(p.x + Math.sin(a) * d, WATER_Y, p.z + Math.cos(a) * d), dir: a, d };
    };
    return tryDir(f) || tryDir(f + Math.PI / 2) || tryDir(f - Math.PI / 2) || tryDir(f + Math.PI);
  }

  function canFish() {
    return state.phase === 'idle' && !fly && !player.state.dead && player.state.rolling <= 0
      && !player.state.mount && !player.state.swimming && !!findSpot();
  }

  function cast() {
    const found = findSpot();
    if (!found || state.phase !== 'idle' || fly) return false;
    state.spot = found.spot;
    state.phase = 'casting';
    // koko (fishing pet) makes bites come faster
    const luck = player.buffVal?.('fish') || 0;
    state.t = (2.0 + Math.random() * 4.2) * (luck > 0 ? 0.55 : 1);
    // NIBBLES: the fish tests the bait first. Up to three, spread before the
    // real take — they are the thing you learn NOT to strike at.
    const n = state.afk ? 0 : [0, 1, 1, 2, 2, 3][Math.floor(Math.random() * 6)];
    nibbles = Array.from({ length: n }, () => 0.6 + Math.random() * Math.max(0.4, state.t - 0.9)).sort((a, b) => b - a);
    player.state.busy = true;
    player.state.facing = found.dir;
    player.playCast();
    // THE SWORD GOES AWAY — the rod lives in the same hand
    player.setWeaponVisible?.(false);
    player.setFishPose?.(true);
    player.parts.handR.add(rod);
    rod.visible = true;
    rod.rotation.x = ROD_REST + 0.7;      // drawn back over the shoulder
    tipPivot.rotation.x = 0;
    audio.sfx('cast');
    fly = { kind: 'cast', t: -0.2, dur: 0.42 + found.d * 0.05, from: null, to: found.spot.clone(), h: 0.9 + found.d * 0.14 };
    return true;
  }

  /**
   * The catch table for WHERE AND WHEN you are fishing. Species declare the
   * water they live in and, some of them, the condition they only appear
   * under; this filters ITEMS down to what could plausibly be on your hook
   * right now and weights it by rarity.
   */
  const RARITY_W = { common: 1, uncommon: 0.52, rare: 0.2, epic: 0.062, legendary: 0.017, mythic: 0.0035 };
  const RARITY_XP = { common: 6, uncommon: 13, rare: 26, epic: 46, legendary: 90, mythic: 220 };
  function catchTable() {
    const p = player.state.pos;
    const sea = isOcean(p.x, p.z) || (state.spot && isOcean(state.spot.x, state.spot.z));
    const snow = !!terrain.inSnow?.(p.x, p.z);
    const night = !!hooks.isNight?.();
    const rows = [];
    for (const [id, def] of Object.entries(ITEMS)) {
      if (!def.fish) continue;
      if (def.water === 'sea' && !sea) continue;
      if (def.water === 'lake' && sea) continue;
      if (def.only === 'night' && !night) continue;
      if (def.only === 'snow' && !snow) continue;
      // MYTHIC is gated behind the Deep Water node
      if (def.rarity === 'mythic' && !(hooks.skillBonus?.('mythicUnlock') > 0)) continue;
      let w = RARITY_W[def.rarity || 'common'] ?? 1;
      const rareLuck = hooks.skillBonus?.('rareLuck') || 0;
      if (rareLuck && def.rarity && def.rarity !== 'common' && def.rarity !== 'uncommon') w *= 1 + rareLuck;
      if (state.afk) {
        const setLines = hooks.skillBonus?.('afkQuality') || 0;
        w *= (def.rarity === 'common' ? 1.6 : def.rarity === 'uncommon' ? 0.5 : 0.06 * (1 + setLines * 4));
      } else if (player.buffVal?.('fish')) w *= (def.rarity === 'common' ? 0.6 : 1.9);
      rows.push({ id, w, xp: RARITY_XP[def.rarity || 'common'], rarity: def.rarity || 'common' });
    }
    if (!rows.length) rows.push({ id: 'fish_bitterling', w: 1, xp: 6, rarity: 'common' });
    const total = rows.reduce((a, b) => a + b.w, 0);
    for (const row of rows) row.w /= total;
    return rows;
  }

  function rollCatch() {
    const table = catchTable();
    let r = Math.random(), acc = 0, c = table[table.length - 1];
    for (const row of table) { acc += row.w; if (r <= acc) { c = row; break; } }
    const sea = state.spot ? isOcean(state.spot.x, state.spot.z) : false;
    return { ...c, ...rollFishSize(c.id, c.rarity, sea) };
  }

  function showModel(id, cm) {
    if (model) fishHolder.remove(model.root);
    model = buildFishModel(id);
    model.root.position.set(0, 0, 0);
    model.root.rotation.set(0, 0, 0);
    fishHolder.add(model.root);
    fishHolder.scale.setScalar(fishWorldLen(cm));
    fishHolder.rotation.set(0, 0, 0);
    fishHolder.visible = true;
  }

  function strike() {
    if (state.phase === 'bite') {
      hooked = rollCatch();
      alert.visible = false;
      shadow.visible = false;
      audio.sfx('hookset');
      const b = bobber.position;
      particles.burst(b.clone(), '#d8f0f4', 12, 2.6, 4, 0.45);
      particles.shockwave?.(new THREE.Vector3(b.x, b.y + 0.04, b.z), '#d8f0f4', 1.3, 0.4);
      showModel(hooked.id, hooked.cm);
      fishHolder.position.copy(b);
      if (state.afk) {
        // hands-free: no fight, straight out of the water
        startLanding();
        return 'caught';
      }
      // THE FIGHT. Strength is the tier, scaled by the size of THIS fish.
      const s = (RARITY_STR[hooked.rarity] || 0.3) * (0.72 + hooked.k * 0.4);
      const p = player.state.pos;
      const dx = b.x - p.x, dz = b.z - p.z;
      const D = Math.max(LAND_D + 0.8, Math.hypot(dx, dz));
      state.fight = {
        s, stam: 1, D, D0: D, Dmax: Math.min(MAX_CAST + 3.5, D + 4),
        T: 0.3, run: false, runT: 0, wind: 0, restT: 0.7 + Math.random() * 0.6,
        lat: 0, latTarget: 0, dirX: dx / Math.hypot(dx, dz), dirZ: dz / Math.hypot(dx, dz),
        jump: 0, jumpDur: 0, reeling: false, heading: Math.atan2(-dx, -dz), time: 0,
      };
      bobber.visible = false;
      state.phase = 'fight';
      return 'hooked';
    }
    if (state.phase === 'waiting') {
      const spooked = nibbleT > 0;
      end();
      audio.sfx('splash');
      hooks.onMiss(spooked ? 'Only a nibble — you spooked it. Wait for the float to go UNDER.' : 'You pulled too early…');
      return 'early';
    }
    return null;
  }

  function startLanding() {
    state.phase = 'landing';
    hooks.gauge?.(null);
    state.fight = null;
    bobber.visible = false;
    audio.sfx('fishjump');
    const from = fishHolder.position.clone();
    particles.burst(from.clone(), '#bfe6f4', 16, 3, 4, 0.5);
    particles.shockwave?.(new THREE.Vector3(from.x, from.y + 0.05, from.z), '#d8f0f4', 1.5, 0.45);
    fly = { kind: 'land', t: 0, dur: 0.62, from, h: 1.4 };
  }

  function lose(msg, snap = false) {
    const at = (fishHolder.visible ? fishHolder.position : bobber.position).clone();
    end();
    audio.sfx(snap ? 'linesnap' : 'splash');
    particles.burst(at, '#d8f0f4', 10, 2.2, 4, 0.4);
    hooks.onMiss(msg);
  }

  function cancel() {
    state.afk = false;
    if (state.phase === 'landing' || state.phase === 'showing') return;
    if (state.phase === 'fight') { lose('You let the line go — it swam off.'); return; }
    if (state.phase !== 'idle') end();
  }

  // toggle hands-free fishing (auto casts & auto reels with worse odds)
  function toggleAfk() {
    if (state.afk) { cancel(); return false; }
    if (!canFish()) return false;
    state.afk = true;
    cast();
    return true;
  }

  function end() {
    state.phase = 'idle';
    state.spot = null;
    state.fight = null;
    fly = null;
    hooked = null;
    nibbleT = 0;
    bobber.visible = false;
    alert.visible = false;
    rod.visible = false;
    line.visible = false;
    shadow.visible = false;
    fishHolder.visible = false;
    rod.rotation.x = ROD_REST;
    tipPivot.rotation.x = 0;
    if (rod.parent) rod.parent.remove(rod);
    hooks.gauge?.(null);
    player.state.fishStrain = 0;
    player.state.fishReel = false;
    player.state.fishLift = false;
    player.setFishPose?.(false);
    player.setWeaponVisible?.(true);
    player.state.busy = false;
  }

  /** Between the hero's hands (or above the head if a hand is missing). */
  const _h2 = new THREE.Vector3();
  function holdPoint(out) {
    const L = player.parts.handL, R = player.parts.handR;
    if (L && R) {
      L.getWorldPosition(out); R.getWorldPosition(_h2);
      out.add(_h2).multiplyScalar(0.5);
      out.y += 0.16;
    } else {
      player.parts.head.getWorldPosition(out);
      out.y += 0.62;
    }
    return out;
  }

  /** Line from the rod tip to `to`, sagging by `sag` in the middle. */
  const _tan = new THREE.Vector3(), _view = new THREE.Vector3(), _side = new THREE.Vector3();
  function drawLine(to, sag) {
    rodTip.getWorldPosition(_tip);
    for (let i = 0; i < LINE_N; i++) {
      const t = i / (LINE_N - 1);
      pts[i].set(
        _tip.x + (to.x - _tip.x) * t,
        _tip.y + (to.y - _tip.y) * t - Math.sin(t * Math.PI) * sag,
        _tip.z + (to.z - _tip.z) * t);
    }
    const eye = camera ? camera.position : null;
    for (let i = 0; i < LINE_N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(LINE_N - 1, i + 1)];
      _tan.subVectors(b, a);
      if (eye) _view.subVectors(eye, pts[i]); else _view.set(0, 1, 0);
      _side.crossVectors(_tan, _view);
      const l = _side.length();
      if (l > 1e-6) _side.multiplyScalar(LINE_W * 0.5 / l); else _side.set(LINE_W * 0.5, 0, 0);
      const o = i * 6;
      ribbon[o] = pts[i].x - _side.x; ribbon[o + 1] = pts[i].y - _side.y; ribbon[o + 2] = pts[i].z - _side.z;
      ribbon[o + 3] = pts[i].x + _side.x; ribbon[o + 4] = pts[i].y + _side.y; ribbon[o + 5] = pts[i].z + _side.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    line.visible = true;
  }

  // the float flies from the rod tip, the fish flies to your hands
  function updateFlight(dt, time) {
    fly.t += dt;
    if (fly.kind === 'cast') {
      if (fly.t < 0) { rod.rotation.x += ((ROD_REST + 0.7) - rod.rotation.x) * Math.min(1, dt * 12); return; }
      // the flick: rod snaps forward, a little past rest, and settles
      rod.rotation.x += ((ROD_REST - 0.12) - rod.rotation.x) * Math.min(1, dt * 16);
      if (!fly.from) { rodTip.getWorldPosition(_tip); fly.from = _tip.clone(); bobber.visible = true; }
      const k = Math.min(1, fly.t / fly.dur);
      const e = 1 - (1 - k) * (1 - k);   // fast off the rod, slowing as it drops
      const x = fly.from.x + (fly.to.x - fly.from.x) * e;
      const z = fly.from.z + (fly.to.z - fly.from.z) * e;
      const sy = surfaceY(fly.to.x, fly.to.z, time);
      const y = fly.from.y + (sy - fly.from.y) * k + Math.sin(k * Math.PI) * fly.h;
      bobber.position.set(x, y, z);
      bobber.rotation.z = (1 - k) * 2.4;
      drawLine(bobber.position, 0.05);
      if (k >= 1) {
        fly = null;
        bobber.rotation.z = 0;
        state.phase = 'waiting';
        audio.sfx('splash');
        const b = bobber.position;
        particles.burst(b.clone(), '#d8f0f4', 8, 1.4, 4, 0.35);
        particles.shockwave?.(new THREE.Vector3(b.x, b.y + 0.04, b.z), '#d8f0f4', 1.0, 0.5);
        // a fish takes notice somewhere nearby and starts circling in
        shadowAng = Math.random() * Math.PI * 2;
        shadow.position.set(b.x + Math.cos(shadowAng) * 2.6, WATER_Y - 0.04, b.z + Math.sin(shadowAng) * 2.6);
        setShadowHeading(b.x - shadow.position.x, b.z - shadow.position.z);
        shadow.visible = true;
      }
      return;
    }
    // LANDING: out of the water on an arc, thrashing, into the hands
    const k = Math.min(1, fly.t / fly.dur);
    holdPoint(_v);
    const hx = _v.x, hy = _v.y, hz = _v.z;
    const e = k * k * (3 - 2 * k);
    fishHolder.position.set(
      fly.from.x + (hx - fly.from.x) * e,
      fly.from.y + (hy - fly.from.y) * e + Math.sin(k * Math.PI) * fly.h,
      fly.from.z + (hz - fly.from.z) * e);
    fishHolder.rotation.z = Math.sin(k * Math.PI * 3) * 0.6;
    fishHolder.rotation.x = -Math.sin(k * Math.PI) * 0.8;
    model?.update(time, 1);
    rod.rotation.x += ((ROD_REST + 0.5) - rod.rotation.x) * Math.min(1, dt * 8);
    drawLine(fishHolder.position, 0.02);
    if (Math.random() < dt * 22) particles.burst(fishHolder.position.clone(), '#aee0f0', 1, 0.6, 3, 0.25);
    if (k >= 1) {
      fly = null;
      if (state.afk) { deliver(); end(); return; }
      // HOLD IT UP. The single best beat in any fishing game.
      state.phase = 'showing';
      state.t = hooked.rarity === 'common' || hooked.rarity === 'uncommon' ? 1.5 : 2.3;
      rod.visible = false;
      line.visible = false;
      player.state.fishLift = true;
      player.state.fishStrain = 0;
      const big = ['epic', 'legendary', 'mythic'].includes(hooked.rarity);
      particles.fountain(fishHolder.position.clone(), big ? '#ffd36a' : '#bfe6f4', big ? 26 : 12);
      if (big) particles.shockwave?.(player.state.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#ffd36a', 2.4, 0.6);
      audio.sfx('catch');
      deliver();
    }
  }

  function deliver() {
    const h = hooked;
    if (!h) return;
    const prev = state.records[h.id] || 0;
    const record = !state.afk && h.cm > prev;
    if (h.cm > prev) state.records[h.id] = h.cm;
    hooks.onCatch(h.id, h.xp, h.rarity, false, { cm: h.cm, kg: h.kg, record: record && prev > 0, first: prev === 0 });
    // DOUBLE HOOK: a second fish of the same species on the same cast
    if (Math.random() < (hooks.skillBonus?.('doubleCatch') || 0)) {
      hooks.onCatch(h.id, Math.round(h.xp * 0.6), h.rarity, true);
    }
  }

  function updateFight(dt, time) {
    const f = state.fight;
    f.time += dt;
    const reeling = !!hooks.isReeling?.();
    f.reeling = reeling;
    const tough = 1 / (1 + (hooks.skillBonus?.('biteWindow') || 0) * 0.6);

    // the fish: runs, rests, tires
    if (f.jump > 0) {
      f.jump -= dt;
      if (f.jump <= 0) {
        audio.sfx('splash');
        particles.burst(fishHolder.position.clone(), '#d8f0f4', 14, 2.8, 4, 0.45);
        particles.shockwave?.(new THREE.Vector3(fishHolder.position.x, WATER_Y + 0.05, fishHolder.position.z), '#d8f0f4', 1.4, 0.45);
      }
    } else if (f.run) {
      f.runT -= dt;
      if (f.runT <= 0) { f.run = false; f.restT = (0.9 + Math.random() * 1.0) * (1.25 - f.stam * 0.35); }
    } else if (f.wind > 0) {
      // THE TELL. A run used to start on the frame it was decided, and against
      // a mythic that gave a human with a 300ms reaction no chance at all —
      // measured, 5 of 5 lost in a second. The fish now thrashes and the gauge
      // warns for a beat first, the same rule every monster's swing follows.
      f.wind -= dt;
      if (f.wind <= 0) {
        f.run = true;
        f.runT = (0.6 + Math.random() * 0.9) * (0.45 + f.stam * 0.75) * (0.8 + f.s * 0.5);
        f.latTarget = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.4) * Math.min(1, f.D / 3);
        audio.sfx('reelrun');
        // A LEAP: rare fish and up, now and then, while they still have fight
        if (['rare', 'epic', 'legendary', 'mythic'].includes(hooked.rarity) && f.stam > 0.25 && Math.random() < 0.34) {
          f.jump = f.jumpDur = 0.75;
          audio.sfx('fishjump');
          particles.burst(fishHolder.position.clone(), '#d8f0f4', 12, 2.6, 4, 0.4);
        }
      }
    } else {
      f.restT -= dt;
      if (f.restT <= 0 && f.stam > 0.04) {
        f.wind = 0.45;
        audio.sfx('nibble');
        particles.burst(fishHolder.position.clone(), '#d8f0f4', 6, 1.6, 4, 0.3);
      }
    }
    const pull = f.run ? f.s * (0.4 + f.stam * 0.8) : f.s * 0.06;

    // the line
    if (reeling) {
      // Reeling a RESTING fish holds the line at a steady working tension;
      // reeling through a RUN is what climbs, and it climbs with the fish's
      // pull to a power — so a minnow forgives a beginner who just holds the
      // button, an uncommon makes them let go now and then, and anything rare
      // or better snaps unless the runs are given line. Measured with a held
      // button: common lands, everything above it breaks.
      if (f.run) f.T += dt * Math.pow(pull, 1.6) * 2.4 * tough;
      else f.T += (0.35 - f.T) * Math.min(1, dt * 1.2);
      f.D -= dt * (f.run ? 0.3 : 1.9 + (1 - f.s) * 0.6);
    } else {
      f.T -= dt * (f.run ? 0.55 : 0.9);
      if (f.run) f.D += dt * pull * 2.3;
    }
    if (f.D > f.Dmax) { f.D = f.Dmax; f.T += dt * pull * 1.6; }   // the spool is empty
    f.T = Math.max(f.run && !reeling ? pull * 0.25 : 0, Math.min(1.05, f.T));
    // fighting the line wears the fish down
    f.stam = Math.max(0, f.stam - dt * (f.run ? 0.06 + f.T * 0.2 : reeling ? 0.025 : 0.008));

    if (f.T >= 1) { lose('SNAP! The line broke — ease off when it runs.', true); return; }
    if (f.jump > 0 && f.T > 0.8) { lose('It threw the hook mid-air! Slack the line when it jumps.'); return; }

    // where the fish is: out along the line, swinging side to side on a run
    f.lat += (f.run ? f.latTarget : f.lat * 0.4 - f.lat) * Math.min(1, dt * (f.run ? 1.4 : 0.8));
    const p = player.state.pos;
    const px = -f.dirZ, pz = f.dirX;
    let fx = p.x + f.dirX * f.D + px * f.lat;
    let fz = p.z + f.dirZ * f.D + pz * f.lat;
    if (!terrain.isWater(fx, fz)) {
      // never drag a fish onto the grass: pull the swing back to the line
      f.lat *= 0.5; f.latTarget *= -0.5;
      fx = p.x + f.dirX * f.D + px * f.lat;
      fz = p.z + f.dirZ * f.D + pz * f.lat;
      if (!terrain.isWater(fx, fz)) {
        if (f.D < 3.2) { startLanding(); return; }    // it is in the shallows
        f.D += dt * 1.5;                               // back out to open water
      }
    }
    const sy = surfaceY(fx, fz, time);
    const vx = fx - fishHolder.position.x, vz = fz - fishHolder.position.z;
    // at the surface, back out of the water — a hooked fish fights up top,
    // and a fish you cannot see is a gauge with nothing behind it
    let fy = sy - (f.run || f.wind > 0 ? 0.015 : 0.05) * fishHolder.scale.x;
    if (f.jump > 0) {
      const k = 1 - f.jump / f.jumpDur;
      fy = sy + Math.sin(k * Math.PI) * (0.9 + f.s * 0.6);
      fishHolder.rotation.z = Math.sin(k * Math.PI * 2) * 0.5;
      fishHolder.rotation.x = -Math.cos(k * Math.PI) * 0.9;
    } else {
      fishHolder.rotation.z = Math.sin(time * (f.run || f.wind > 0 ? 13 : 5)) * (f.run ? 0.35 : f.wind > 0 ? 0.5 : 0.12);
      fishHolder.rotation.x = 0;
    }
    fishHolder.position.set(fx, fy, fz);
    if (Math.hypot(vx, vz) > 0.002) {
      const want = Math.atan2(vx, vz);
      // running away it faces away; dragged in it faces you, tail first
      const target = f.run ? want : Math.atan2(-f.dirX, -f.dirZ) + Math.sin(time * 2) * 0.3;
      let d = target - f.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.heading += d * Math.min(1, dt * 6);
    }
    fishHolder.rotation.y = f.heading;
    model?.update(time, f.run ? 1 : 0.35);

    // splashes on a run, ripples on a rest
    splashT -= dt;
    if (splashT <= 0 && f.jump <= 0) {
      splashT = f.run ? 0.12 : 0.6;
      particles.burst(new THREE.Vector3(fx, sy + 0.04, fz), '#d8f0f4', f.run ? 3 : 1, f.run ? 1.8 : 0.8, 4, 0.3);
      if (!f.run) particles.shockwave?.(new THREE.Vector3(fx, sy + 0.04, fz), '#c8e8f0', 0.7, 0.8);
    }

    // the rod bends with the tension, the reel clicks while you crank
    const bend = Math.min(1, f.T * 1.1 + (f.run ? 0.15 : 0));
    rod.rotation.x += ((ROD_REST + 0.25 - bend * 0.45) - rod.rotation.x) * Math.min(1, dt * 10);
    tipPivot.rotation.x += ((-bend * 0.95) - tipPivot.rotation.x) * Math.min(1, dt * 12);
    if (reeling) {
      crank.rotation.x -= dt * 16;
      reelTick -= dt;
      if (reelTick <= 0) { reelTick = 0.085; audio.sfx('reel'); }
    }
    player.state.fishStrain = bend;
    player.state.fishReel = reeling;
    player.state.facing = Math.atan2(fx - p.x, fz - p.z);

    // the line: tight under tension, sagging when slack
    _v.set(fx + Math.sin(f.heading) * 0.2 * fishHolder.scale.x, fy, fz + Math.cos(f.heading) * 0.2 * fishHolder.scale.x);
    drawLine(_v, (1 - Math.min(1, f.T * 1.4)) * 0.35 * Math.min(1, f.D / 2.5));
    lineMat.color.setHex(f.T > 0.85 ? 0xffb0a0 : 0xece6d2);

    // the gauge
    const touch = !!hooks.touch?.();
    let hint, tone;
    if (f.jump > 0) { hint = 'IT’S JUMPING — EASE OFF!'; tone = 'warn'; }
    else if (f.T > 0.85) { hint = 'LINE STRAINING!'; tone = 'bad'; }
    else if (f.run) { hint = reeling ? 'LET IT RUN!' : 'IT’S RUNNING…'; tone = reeling ? 'bad' : 'warn'; }
    else if (f.wind > 0) { hint = 'IT’S ABOUT TO RUN!'; tone = 'warn'; }
    else { hint = touch ? 'REEL IN — HOLD ★' : 'REEL IN — HOLD F'; tone = 'good'; }
    const title = f.s < 0.3 ? 'A LITTLE ONE' : f.s < 0.45 ? 'SOMETHING ON THE LINE' : f.s < 0.62 ? 'IT’S PULLING HARD'
      : f.s < 0.85 ? 'A HEAVY FISH!' : 'A MONSTER!';
    hooks.gauge?.({
      title, hint, tone, tension: Math.min(1, f.T), stam: f.stam,
      progress: Math.max(0, Math.min(1, 1 - (f.D - LAND_D) / (f.Dmax - LAND_D))),
      running: f.run || f.jump > 0 || f.wind > 0,
    });

    if (f.D <= LAND_D) startLanding();
  }

  function update(dt, time) {
    // AFK loop: auto-strike bites (slowly), auto-recast after each catch
    if (state.afk) {
      if (state.phase === 'bite') {
        state.afkT += dt;
        if (state.afkT > 0.5) { state.afkT = 0; strike(); }
      } else if (state.phase === 'idle' && !fly) {
        state.afkT += dt;
        if (state.afkT > 1.6) {
          state.afkT = 0;
          if (!cast()) state.afk = false;
        }
      } else state.afkT = 0;
    }

    if (fly) { updateFlight(dt, time); return; }

    if (state.phase === 'showing') {
      state.t -= dt;
      // hold the fish up across the screen, flapping, IN the two hands
      holdPoint(_v);
      fishHolder.position.set(_v.x, _v.y + Math.sin(time * 6) * 0.02, _v.z);
      const yaw = hooks.camYaw?.() ?? player.state.facing;
      fishHolder.rotation.set(0, yaw + Math.PI / 2, Math.sin(time * 9) * 0.12);
      model?.update(time, 0.7);
      if (Math.random() < dt * 5) particles.burst(fishHolder.position.clone(), '#fff3cf', 1, 0.8, 3, 0.4);
      if (state.t <= 0) end();
      return;
    }
    if (state.phase === 'fight') { updateFight(dt, time); return; }
    if (state.phase === 'idle' || state.phase === 'landing') return;

    bobT += dt;
    const b = bobber.position;
    const sy = surfaceY(b.x, b.z, time);

    if (state.phase === 'waiting') {
      rod.rotation.x += (ROD_REST - rod.rotation.x) * Math.min(1, dt * 6);
      tipPivot.rotation.x += (0 - tipPivot.rotation.x) * Math.min(1, dt * 6);
      // NIBBLE: a small dip, a tiny ring, a soft tick — and not the real thing
      if (nibbles.length && state.t <= nibbles[0]) {
        nibbles.shift();
        nibbleT = 0.32;
        audio.sfx('nibble');
        particles.shockwave?.(new THREE.Vector3(b.x, sy + 0.04, b.z), '#c8e8f0', 0.55, 0.5);
      }
      let dip = 0;
      if (nibbleT > 0) {
        nibbleT -= dt;
        dip = Math.sin((1 - nibbleT / 0.32) * Math.PI) * 0.06;
        tipPivot.rotation.x = -dip * 2.2;
      }
      b.y = sy + 0.01 + Math.sin(bobT * 2.4) * 0.012 - dip;
      bobber.rotation.z = Math.sin(bobT * 1.7) * 0.08;
      drawLine(b, 0.3);
      // the fish shadow glides in with a lazy S-curve, tail wagging
      if (shadow.visible) {
        tailPivot.rotation.y = Math.sin(bobT * 6) * 0.55;
        const dx = b.x - shadow.position.x;
        const dz = b.z - shadow.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.35) {
          const sp = Math.max(0.25, d / Math.max(0.4, state.t));
          const wob = Math.sin(bobT * 2.2) * 0.35;
          const nx = dx / d, nz = dz / d;
          shadow.position.x += (nx + -nz * wob) * sp * dt;
          shadow.position.z += (nz + nx * wob) * sp * dt;
          setShadowHeading(nx + -nz * wob, nz + nx * wob);
        } else {
          shadowAng += dt * 1.3;
          shadow.position.x = b.x + Math.cos(shadowAng) * 0.32;
          shadow.position.z = b.z + Math.sin(shadowAng) * 0.32;
          setShadowHeading(-Math.sin(shadowAng), Math.cos(shadowAng));
        }
        shadow.position.y = sy - 0.05;
      }
      rippleT -= dt;
      if (rippleT <= 0) {
        rippleT = 1.4 + Math.random() * 0.8;
        particles.shockwave?.(new THREE.Vector3(b.x, sy + 0.04, b.z), '#c8e8f0', 0.7, 0.9);
      }
      state.t -= dt;
      if (state.t <= 0) {
        state.phase = 'bite';
        nibbleT = 0;
        state.t = BITE_WINDOW * (1 + (hooks.skillBonus?.('biteWindow') || 0));
        alert.position.set(b.x, sy + 0.75, b.z);
        alert.visible = true;
        audio.sfx('bite');
        particles.burst(b.clone(), '#7ab8e8', 10, 2.2, 4, 0.4);
        particles.shockwave?.(new THREE.Vector3(b.x, sy + 0.05, b.z), '#aee0f0', 1.2, 0.35);
      }
    } else if (state.phase === 'bite') {
      state.t -= dt;
      // THE FLOAT GOES UNDER — that is the take, and it is unmistakable
      const cycle = (time * 1.6) % 1;
      const tug = cycle < 0.4 ? Math.sin((cycle / 0.4) * Math.PI) : 0;
      b.y = sy - 0.1 - tug * 0.1;
      alert.position.y = sy + 0.75;
      alert.scale.setScalar(0.5 + Math.sin(time * 3.2) * 0.05);
      rod.rotation.x += ((ROD_REST - 0.18 - tug * 0.3) - rod.rotation.x) * Math.min(1, dt * 10);
      tipPivot.rotation.x += ((-0.3 - tug * 0.5) - tipPivot.rotation.x) * Math.min(1, dt * 12);
      tailPivot.rotation.y = Math.sin(time * 5.5) * 0.6;
      shadow.position.x = b.x + Math.sin(time * 5) * 0.1;
      shadow.position.z = b.z + Math.cos(time * 4.2) * 0.1;
      drawLine(b, 0.08);
      if (Math.random() < dt * 3) particles.burst(b.clone(), '#d8f0f4', 2, 1.2, 4, 0.3);
      if (state.t <= 0) {
        end();
        audio.sfx('splash');
        hooks.onMiss('It got away! Strike the moment the float goes under.');
      }
    }
  }

  const serialize = () => ({ records: { ...state.records } });
  function load(d) {
    if (d?.records && typeof d.records === 'object') {
      for (const [k, v] of Object.entries(d.records)) if (ITEMS[k] && Number.isFinite(v)) state.records[k] = v;
    }
  }

  return { state, canFish, cast, strike, cancel, toggleAfk, update, serialize, load };
}
