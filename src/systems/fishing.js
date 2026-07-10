// Fishing: stand at a lake shore, cast, wait for the "!", strike in time.
// Catches feed quests and grant XP. The Golden Koi is the rare prize.
import * as THREE from 'three';
import { WATER_Y } from '../world/terrain.js';

const BITE_WINDOW = 0.9;

const CATCH_TABLE = [
  { id: 'fish_minnow', w: 0.58, xp: 6 },
  { id: 'fish_perch', w: 0.32, xp: 12 },
  { id: 'fish_koi', w: 0.10, xp: 40 },
];

export function createFishing({ scene, terrain, player, particles, audio, hooks }) {
  // hooks: { onCatch(fishId, xp), onMiss() }
  const state = {
    phase: 'idle', // idle | waiting | bite
    t: 0,
    spot: null,    // Vector3 on the water surface
  };

  // bobber: little red-white float
  const bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xd84040 }));
  top.position.y = 0.06;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xf0f0e8 }));
  bottom.position.y = -0.01;
  bobber.add(top, bottom);
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

  let bobT = 0;

  // find a water cell in front of the player (within ~2.5)
  function findSpot() {
    const p = player.state.pos;
    const f = player.state.facing;
    for (let d = 1.0; d <= 2.6; d += 0.4) {
      const x = p.x + Math.sin(f) * d;
      const z = p.z + Math.cos(f) * d;
      if (terrain.isWater(x, z)) return new THREE.Vector3(x, WATER_Y + 0.03, z);
    }
    // also check the 4 cardinal directions so shore fishing is forgiving
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const x = p.x + Math.sin(f + a) * 1.4;
      const z = p.z + Math.cos(f + a) * 1.4;
      if (terrain.isWater(x, z)) return new THREE.Vector3(x, WATER_Y + 0.03, z);
    }
    return null;
  }

  function canFish() {
    return state.phase === 'idle' && !player.state.dead && player.state.rolling <= 0 && !!findSpot();
  }

  // start casting; returns false if there's no water nearby
  function cast() {
    const spot = findSpot();
    if (!spot || state.phase !== 'idle') return false;
    state.spot = spot;
    state.phase = 'waiting';
    state.t = 1.2 + Math.random() * 3.2;
    player.state.busy = true;
    player.state.facing = Math.atan2(spot.x - player.state.pos.x, spot.z - player.state.pos.z);
    player.playCast();
    bobber.position.copy(spot);
    bobber.visible = true;
    audio.sfx('cast');
    particles.burst(spot.clone(), '#aac8e0', 5, 1, 4, 0.35);
    return true;
  }

  // player pressed the action key while fishing
  function strike() {
    if (state.phase === 'bite') {
      // caught one!
      let r = Math.random(), acc = 0, caught = CATCH_TABLE[0];
      for (const c of CATCH_TABLE) { acc += c.w; if (r <= acc) { caught = c; break; } }
      end();
      audio.sfx('catch');
      particles.burst(bobber.position.clone(), '#7ab8e8', 14, 2.6, 4, 0.5);
      particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#7ab8e8', 10);
      hooks.onCatch(caught.id, caught.xp);
      return 'caught';
    }
    if (state.phase === 'waiting') {
      // yanked too early
      end();
      audio.sfx('splash');
      hooks.onMiss('You pulled too early...');
      return 'early';
    }
    return null;
  }

  function cancel() {
    if (state.phase !== 'idle') end();
  }

  function end() {
    state.phase = 'idle';
    state.spot = null;
    bobber.visible = false;
    alert.visible = false;
    player.state.busy = false;
  }

  function update(dt, time) {
    if (state.phase === 'idle') return;
    bobT += dt;

    if (state.phase === 'waiting') {
      bobber.position.y = WATER_Y + 0.03 + Math.sin(bobT * 2.4) * 0.03;
      state.t -= dt;
      // small teasing ripples
      if (Math.random() < dt * 0.7) {
        particles.burst(bobber.position.clone(), '#d8f0f4', 2, 0.5, 3, 0.3);
      }
      if (state.t <= 0) {
        state.phase = 'bite';
        state.t = BITE_WINDOW;
        bobber.position.y = WATER_Y - 0.08; // plunge
        alert.position.set(bobber.position.x, WATER_Y + 0.7, bobber.position.z);
        alert.visible = true;
        audio.sfx('bite');
        particles.burst(bobber.position.clone(), '#7ab8e8', 8, 1.8, 4, 0.4);
      }
    } else if (state.phase === 'bite') {
      state.t -= dt;
      alert.scale.setScalar(0.5 + Math.sin(time * 18) * 0.07);
      if (state.t <= 0) {
        // it got away
        end();
        audio.sfx('splash');
        hooks.onMiss('It got away!');
      }
    }
  }

  return { state, canFish, cast, strike, cancel, update };
}
