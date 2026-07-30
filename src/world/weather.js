// Weather: rain showers that roll in and out. Raindrops are slim streaks
// (instanced-ish line segments around the player), plus ground splashes.
// Drives lighting.state.weatherDim and the audio rain loop.
import * as THREE from 'three';
import { getQuality } from '../gfx/quality.js';

const DROPS_MAX = 420;
const AREA = 26;     // rain box half-size around the player
const TOP = 14;

export function createWeather(scene, terrain, particles) {
  // VISUAL FX thins out rain & snow (particle-heavy full-screen effects)
  const DROPS = Math.max(40, Math.round(DROPS_MAX * getQuality().weatherScale));
  // rain streaks as line segments
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(DROPS * 2 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#aac8e0'), transparent: true, opacity: 0,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);

  const drops = [];
  for (let i = 0; i < DROPS; i++) {
    drops.push({
      x: (Math.random() - 0.5) * AREA * 2,
      y: Math.random() * TOP,
      z: (Math.random() - 0.5) * AREA * 2,
      v: 16 + Math.random() * 8,
    });
  }

  // gentle snowfall inside the winter biome — always-on ambience, fades in
  // as the player crosses the treeline
  const FLAKES = 260;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(FLAKES * 3);
  const flakes = [];
  for (let i = 0; i < FLAKES; i++) {
    flakes.push({
      x: (Math.random() - 0.5) * AREA * 2,
      y: Math.random() * TOP,
      z: (Math.random() - 0.5) * AREA * 2,
      v: 0.9 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2,
    });
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.13, transparent: true, opacity: 0, depthWrite: false,
  });
  const snowPts = new THREE.Points(snowGeo, snowMat);
  snowPts.frustumCulled = false;
  snowPts.visible = false;
  scene.add(snowPts);

  const state = {
    raining: false,
    intensity: 0,      // 0..1, eases in/out
    snowAmt: 0,        // 0..1, eases in when the player is in the winter biome
    timer: 60 + Math.random() * 120, // seconds until next weather flip
  };

  function update(dt, playerPos, time) {
    // --- snowfall (biome-driven, independent of rain) ---
    const inSnow = terrain.inSnow ? terrain.inSnow(playerPos.x, playerPos.z) : false;
    state.snowAmt += ((inSnow ? 1 : 0) - state.snowAmt) * Math.min(1, dt * 0.8);
    if (state.snowAmt > 0.02) {
      snowPts.visible = true;
      snowMat.opacity = 0.9 * state.snowAmt;
      for (let i = 0; i < FLAKES; i++) {
        const f = flakes[i];
        f.y -= f.v * dt;
        f.sway += dt;
        if (f.y < 0) {
          f.y = TOP * (0.5 + Math.random() * 0.5);
          f.x = (Math.random() - 0.5) * AREA * 2;
          f.z = (Math.random() - 0.5) * AREA * 2;
        }
        snowPos[i * 3] = playerPos.x + f.x + Math.sin(f.sway) * 0.6;
        snowPos[i * 3 + 1] = playerPos.y + f.y;
        snowPos[i * 3 + 2] = playerPos.z + f.z + Math.cos(f.sway * 0.7) * 0.6;
      }
      snowGeo.attributes.position.needsUpdate = true;
    } else {
      snowPts.visible = false;
    }
    state.timer -= dt;
    if (state.timer <= 0) {
      state.raining = !state.raining;
      state.timer = state.raining
        ? 90 + Math.random() * 90     // rain lasts 1.5-3 min
        : 150 + Math.random() * 210;  // clear lasts 2.5-6 min
    }

    const target = state.raining ? 1 : 0;
    state.intensity += (target - state.intensity) * Math.min(1, dt * 0.7);
    if (state.intensity < 0.02) {
      lines.visible = false;
      return;
    }

    lines.visible = true;
    mat.opacity = 0.4 * state.intensity;
    const activeN = Math.floor(DROPS * state.intensity);

    for (let i = 0; i < DROPS; i++) {
      const d = drops[i];
      if (i < activeN) {
        d.y -= d.v * dt;
        if (d.y < 0) {
          // occasional ground splash near the player
          if (Math.random() < 0.05) {
            const wx = playerPos.x + d.x, wz = playerPos.z + d.z;
            const gy = terrain.surfaceY(wx, wz);
            particles.burst(new THREE.Vector3(wx, gy + 0.05, wz), '#aac8e0', 2, 0.8, 5, 0.25);
          }
          d.y = TOP * (0.6 + Math.random() * 0.4);
          d.x = (Math.random() - 0.5) * AREA * 2;
          d.z = (Math.random() - 0.5) * AREA * 2;
        }
      }
      const wx = playerPos.x + d.x;
      const wy = playerPos.y + d.y;
      const wz = playerPos.z + d.z;
      const j = i * 6;
      const vis = i < activeN;
      pos[j] = wx; pos[j + 1] = vis ? wy : -999; pos[j + 2] = wz;
      pos[j + 3] = wx - 0.06; pos[j + 4] = vis ? wy - 0.55 : -999; pos[j + 5] = wz;
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { state, update };
}
