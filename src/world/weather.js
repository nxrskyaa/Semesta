// Weather: rain showers that roll in and out. Raindrops are slim streaks
// (instanced-ish line segments around the player), plus ground splashes.
// Drives lighting.state.weatherDim and the audio rain loop.
import * as THREE from 'three';

const DROPS = 420;
const AREA = 26;     // rain box half-size around the player
const TOP = 14;

export function createWeather(scene, terrain, particles) {
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

  const state = {
    raining: false,
    intensity: 0,      // 0..1, eases in/out
    timer: 60 + Math.random() * 120, // seconds until next weather flip
  };

  function update(dt, playerPos, time) {
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
