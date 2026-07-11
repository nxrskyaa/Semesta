// Fishing: stand at a lake shore, cast, wait for the "!", strike in time.
// Full visual kit: rod in hand, fishing line, bobber with ripples, splash on
// bite, and the catch arcs out of the water into your hands.
import * as THREE from 'three';
import { WATER_Y } from '../world/terrain.js';
import { itemIconTexture } from '../gfx/textures.js';

const BITE_WINDOW = 0.9;

const CATCH_TABLE = [
  { id: 'fish_minnow', w: 0.58, xp: 6 },
  { id: 'fish_perch', w: 0.32, xp: 12 },
  { id: 'fish_koi', w: 0.10, xp: 40 },
];

export function createFishing({ scene, terrain, player, particles, audio, hooks }) {
  // hooks: { onCatch(fishId, xp), onMiss(msg) }
  const state = {
    phase: 'idle', // idle | waiting | bite | catching
    t: 0,
    spot: null,
    afk: false,   // auto-fishing: hands-free, but worse rarity odds
    afkT: 0,
  };

  // --- fishing rod (attached to the player's right hand while fishing) ---
  const rod = new THREE.Group();
  {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.028, 1.0, 5),
      new THREE.MeshLambertMaterial({ color: 0x8a6a48 }));
    stick.position.y = 0.42;
    stick.rotation.x = 0.0;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x4a3626 }));
    grip.position.y = 0;
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8),
      new THREE.MeshLambertMaterial({ color: 0xc8a03a }));
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0, 0.14, 0.045);
    rod.add(stick, grip, reel);
    rod.rotation.x = -0.5; // tilt forward over the water
  }
  rod.visible = false;

  // rod tip marker for the line start
  const rodTip = new THREE.Object3D();
  rodTip.position.set(0, 0.94, 0);
  rod.add(rodTip);

  // --- fishing line (rod tip -> bobber, slight sag) ---
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(3 * 8); // 8-point polyline
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8e4d0, transparent: true, opacity: 0.8 }));
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);

  // --- bobber ---
  const bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xd84040 }));
  top.position.y = 0.06;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xf0f0e8 }));
  bottom.position.y = -0.01;
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xf0f0e8 }));
  antenna.position.y = 0.14;
  bobber.add(top, bottom, antenna);
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

  // flying caught-fish sprite (bobber -> player arc)
  const fishSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
  fishSpr.scale.set(0.5, 0.5, 1);
  fishSpr.visible = false;
  scene.add(fishSpr);
  const fishTexCache = new Map();

  // fish shadow — a dark shape circles in, then strikes the bobber
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 10),
    new THREE.MeshBasicMaterial({ color: 0x16242e, transparent: true, opacity: 0.4, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1, 1.7, 1); // fish-shaped ellipse
  shadow.visible = false;
  scene.add(shadow);
  let shadowAng = 0;

  const ROD_REST = -0.5;
  let bobT = 0, rippleT = 0;
  let catchAnim = null; // { from, t, id, xp }
  const _tipWorld = new THREE.Vector3();

  function findSpot() {
    const p = player.state.pos;
    const f = player.state.facing;
    for (let d = 1.0; d <= 2.8; d += 0.4) {
      const x = p.x + Math.sin(f) * d;
      const z = p.z + Math.cos(f) * d;
      if (terrain.isWater(x, z)) return new THREE.Vector3(x, WATER_Y + 0.03, z);
    }
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const x = p.x + Math.sin(f + a) * 1.4;
      const z = p.z + Math.cos(f + a) * 1.4;
      if (terrain.isWater(x, z)) return new THREE.Vector3(x, WATER_Y + 0.03, z);
    }
    return null;
  }

  function canFish() {
    return state.phase === 'idle' && !player.state.dead && player.state.rolling <= 0
      && !player.state.mount && !!findSpot();
  }

  function cast() {
    const spot = findSpot();
    if (!spot || state.phase !== 'idle') return false;
    state.spot = spot;
    state.phase = 'waiting';
    // koko (fishing pet) makes bites come faster
    const luck = player.buffVal?.('fish') || 0;
    state.t = (1.2 + Math.random() * 3.2) * (luck > 0 ? 0.55 : 1);
    player.state.busy = true;
    player.state.facing = Math.atan2(spot.x - player.state.pos.x, spot.z - player.state.pos.z);
    player.playCast();
    // rod into the hand
    player.parts.handR.add(rod);
    rod.visible = true;
    line.visible = true;
    bobber.position.copy(spot);
    bobber.position.y += 0.8; // drops in
    bobber.visible = true;
    // a fish takes notice somewhere nearby and starts circling in
    shadowAng = Math.random() * Math.PI * 2;
    shadow.position.set(
      spot.x + Math.cos(shadowAng) * 2.4, WATER_Y - 0.02, spot.z + Math.sin(shadowAng) * 2.4);
    shadow.rotation.z = -shadowAng;
    shadow.visible = true;
    audio.sfx('cast');
    particles.burst(spot.clone(), '#aac8e0', 5, 1, 4, 0.35);
    return true;
  }

  function strike() {
    if (state.phase === 'bite') {
      let r = Math.random(), acc = 0, caught = CATCH_TABLE[0];
      const luck = player.buffVal?.('fish') || 0;
      // manual fishing rewards attention with better rarity; AFK mode is
      // hands-free but heavily skewed toward common fish
      let table;
      if (state.afk) {
        table = [{ id: 'fish_minnow', w: 0.82, xp: 4 }, { id: 'fish_perch', w: 0.17, xp: 9 }, { id: 'fish_koi', w: 0.01, xp: 30 }];
      } else if (luck > 0) {
        table = [{ id: 'fish_minnow', w: 0.45, xp: 6 }, { id: 'fish_perch', w: 0.38, xp: 12 }, { id: 'fish_koi', w: 0.17, xp: 40 }];
      } else {
        table = CATCH_TABLE;
      }
      for (const c of table) { acc += c.w; if (r <= acc) { caught = c; break; } }
      // play the catch arc, deliver the fish when it lands
      state.phase = 'catching';
      alert.visible = false;
      catchAnim = { from: bobber.position.clone(), t: 0, id: caught.id, xp: caught.xp };
      if (!fishTexCache.has(caught.id)) fishTexCache.set(caught.id, itemIconTexture(caught.id));
      fishSpr.material.map = fishTexCache.get(caught.id);
      fishSpr.material.needsUpdate = true;
      fishSpr.visible = true;
      bobber.visible = false;
      shadow.visible = false;
      rod.rotation.x = ROD_REST;
      audio.sfx('catch');
      particles.burst(catchAnim.from, '#7ab8e8', 16, 3, 4, 0.5);
      particles.shockwave?.(new THREE.Vector3(catchAnim.from.x, WATER_Y + 0.05, catchAnim.from.z), '#d8f0f4', 1.4, 0.4);
      return 'caught';
    }
    if (state.phase === 'waiting') {
      end();
      audio.sfx('splash');
      hooks.onMiss('You pulled too early...');
      return 'early';
    }
    return null;
  }

  function cancel() {
    state.afk = false;
    if (state.phase !== 'idle' && state.phase !== 'catching') end();
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
    bobber.visible = false;
    alert.visible = false;
    rod.visible = false;
    line.visible = false;
    shadow.visible = false;
    rod.rotation.x = ROD_REST;
    if (rod.parent) rod.parent.remove(rod);
    player.state.busy = false;
  }

  function updateLine() {
    rodTip.getWorldPosition(_tipWorld);
    const b = bobber.position;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const x = _tipWorld.x + (b.x - _tipWorld.x) * t;
      const z = _tipWorld.z + (b.z - _tipWorld.z) * t;
      // sag in the middle
      const y = _tipWorld.y + (b.y - _tipWorld.y) * t - Math.sin(t * Math.PI) * 0.25;
      linePos[i * 3] = x; linePos[i * 3 + 1] = y; linePos[i * 3 + 2] = z;
    }
    lineGeo.attributes.position.needsUpdate = true;
  }

  function update(dt, time) {
    // AFK loop: auto-strike bites (slowly), auto-recast after each catch
    if (state.afk) {
      if (state.phase === 'bite') {
        state.afkT += dt;
        if (state.afkT > 0.5) { state.afkT = 0; strike(); }
      } else if (state.phase === 'idle' && !catchAnim) {
        state.afkT += dt;
        if (state.afkT > 1.6) {
          state.afkT = 0;
          if (!cast()) state.afk = false; // water gone / mounted etc.
        }
      } else {
        state.afkT = 0;
      }
    }

    // catch arc plays even after "busy" ends
    if (catchAnim) {
      catchAnim.t += dt * 1.8;
      const t = Math.min(1, catchAnim.t);
      const p = player.state.pos;
      fishSpr.position.set(
        catchAnim.from.x + (p.x - catchAnim.from.x) * t,
        catchAnim.from.y + (p.y + 0.9 - catchAnim.from.y) * t + Math.sin(t * Math.PI) * 1.4,
        catchAnim.from.z + (p.z - catchAnim.from.z) * t,
      );
      fishSpr.material.rotation += dt * 6;
      if (t >= 1) {
        fishSpr.visible = false;
        particles.fountain(p.clone().add(new THREE.Vector3(0, 0.9, 0)), '#7ab8e8', 10);
        hooks.onCatch(catchAnim.id, catchAnim.xp);
        catchAnim = null;
        end();
      }
    }

    if (state.phase === 'idle' || state.phase === 'catching') return;
    bobT += dt;
    updateLine();

    if (state.phase === 'waiting') {
      // bobber drops in, then floats with gentle bobbing
      if (bobber.position.y > WATER_Y + 0.03) {
        bobber.position.y = Math.max(WATER_Y + 0.03, bobber.position.y - dt * 3);
        if (bobber.position.y <= WATER_Y + 0.04) {
          audio.sfx('splash');
          particles.burst(bobber.position.clone(), '#d8f0f4', 6, 1.2, 4, 0.35);
          particles.shockwave?.(new THREE.Vector3(bobber.position.x, WATER_Y + 0.05, bobber.position.z), '#d8f0f4', 0.9, 0.5);
        }
      } else {
        bobber.position.y = WATER_Y + 0.03 + Math.sin(bobT * 2.4) * 0.03;
      }
      // the fish shadow spirals in, timed to arrive right at the bite
      if (shadow.visible) {
        const dx = bobber.position.x - shadow.position.x;
        const dz = bobber.position.z - shadow.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.35) {
          const sp = Math.max(0.25, d / Math.max(0.4, state.t));
          shadow.position.x += (dx / d) * sp * dt + Math.cos(bobT * 5) * 0.15 * dt;
          shadow.position.z += (dz / d) * sp * dt + Math.sin(bobT * 5) * 0.15 * dt;
          shadow.rotation.z = -Math.atan2(dx, dz);
        } else {
          // lurking under the bobber — slow menacing circle
          shadowAng += dt * 1.6;
          shadow.position.x = bobber.position.x + Math.cos(shadowAng) * 0.3;
          shadow.position.z = bobber.position.z + Math.sin(shadowAng) * 0.3;
          shadow.rotation.z = -(shadowAng + Math.PI / 2);
        }
      }
      // ripple rings spreading from the bobber
      rippleT -= dt;
      if (rippleT <= 0) {
        rippleT = 1.4 + Math.random() * 0.8;
        particles.shockwave?.(new THREE.Vector3(bobber.position.x, WATER_Y + 0.04, bobber.position.z), '#c8e8f0', 0.7, 0.9);
      }
      state.t -= dt;
      if (state.t <= 0) {
        state.phase = 'bite';
        state.t = BITE_WINDOW;
        bobber.position.y = WATER_Y - 0.1; // plunge!
        alert.position.set(bobber.position.x, WATER_Y + 0.75, bobber.position.z);
        alert.visible = true;
        audio.sfx('bite');
        particles.burst(bobber.position.clone(), '#7ab8e8', 10, 2.2, 4, 0.4);
        particles.shockwave?.(new THREE.Vector3(bobber.position.x, WATER_Y + 0.05, bobber.position.z), '#aee0f0', 1.2, 0.35);
      }
    } else if (state.phase === 'bite') {
      state.t -= dt;
      bobber.position.y = WATER_Y - 0.1 + Math.sin(time * 22) * 0.04; // struggling
      alert.scale.setScalar(0.5 + Math.sin(time * 18) * 0.07);
      // the rod bends hard & the shadow thrashes under the float
      rod.rotation.x = ROD_REST - 0.4 + Math.sin(time * 24) * 0.08;
      shadow.position.x = bobber.position.x + Math.sin(time * 20) * 0.12;
      shadow.position.z = bobber.position.z + Math.cos(time * 17) * 0.12;
      if (Math.random() < dt * 4) {
        particles.burst(bobber.position.clone(), '#d8f0f4', 2, 1.4, 5, 0.3);
      }
      if (state.t <= 0) {
        end();
        audio.sfx('splash');
        hooks.onMiss('It got away!');
      }
    }
  }

  return { state, canFish, cast, strike, cancel, toggleAfk, update };
}
