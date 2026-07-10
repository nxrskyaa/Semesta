// Pencahayaan: matahari + hemisphere + kabut, dengan jam in-game yang berjalan.
import * as THREE from 'three';

export function setupLighting(scene) {
  scene.fog = new THREE.FogExp2(new THREE.Color('#465448'), 0.028);

  const hemi = new THREE.HemisphereLight(new THREE.Color('#93a68e'), new THREE.Color('#353f36'), 0.78);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(new THREE.Color('#e8e0c8'), 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  const EXT = 34;
  sun.shadow.camera.left = -EXT; sun.shadow.camera.right = EXT;
  sun.shadow.camera.top = EXT; sun.shadow.camera.bottom = -EXT;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  // jam in-game: mulai 10:00, 1 menit game per detik nyata
  const state = { minutes: 10 * 60 };

  const daySky = new THREE.Color('#9fb39a'), nightSky = new THREE.Color('#3d4a58');
  const dayFog = new THREE.Color('#48584a'), nightFog = new THREE.Color('#232c34');
  const daySun = new THREE.Color('#f2ead6'), duskSun = new THREE.Color('#e8b077');

  function update(dt, playerPos) {
    state.minutes = (state.minutes + dt) % (24 * 60);
    const hr = state.minutes / 60;

    // 0 = tengah malam .. 1 = tengah hari
    const dayness = Math.max(0, Math.min(1, (Math.cos(((hr - 13) / 24) * Math.PI * 2) + 0.6) / 1.3));

    sun.intensity = 0.22 + dayness * 1.05;
    hemi.intensity = 0.32 + dayness * 0.5;
    hemi.color.lerpColors(nightSky, daySky, dayness);
    scene.fog.color.lerpColors(nightFog, dayFog, dayness);
    const dusk = 1 - Math.abs(dayness - 0.35) * 2.2;
    sun.color.lerpColors(daySun, duskSun, Math.max(0, Math.min(1, dusk)));

    // matahari mengikuti player supaya shadow frustum selalu relevan
    const ang = ((hr - 6) / 12) * Math.PI; // terbit->terbenam
    const sx = Math.cos(ang) * 30, sy = 18 + Math.sin(Math.max(0.15, ang)) * 26;
    sun.position.set(playerPos.x + sx, sy, playerPos.z + 14);
    sun.target.position.set(playerPos.x, 0, playerPos.z);
  }

  function clockText() {
    const h = Math.floor(state.minutes / 60);
    const m = Math.floor(state.minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return { update, clockText, state };
}
