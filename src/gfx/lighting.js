// Lighting: sun + hemisphere + fog with a running in-game clock.
// Full day cycle grading: golden dawn, bright noon, orange dusk, blue night.
// Weather can dim everything via state.weatherDim (0..1).
import * as THREE from 'three';

export function setupLighting(scene) {
  scene.fog = new THREE.FogExp2(new THREE.Color('#9ec49a'), 0.022);

  const hemi = new THREE.HemisphereLight(new THREE.Color('#bcd8b2'), new THREE.Color('#4a5a48'), 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(new THREE.Color('#fff2dc'), 1.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(3072, 3072);   // sharper shadows
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  const EXT = 30;                        // tighter frustum = crisper shadows
  sun.shadow.camera.left = -EXT; sun.shadow.camera.right = EXT;
  sun.shadow.camera.top = EXT; sun.shadow.camera.bottom = -EXT;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2.2;               // soft PCF edge
  scene.add(sun);
  scene.add(sun.target);

  // in-game clock: starts at 10:00, 1 game-minute per real second
  const state = { minutes: 10 * 60, weatherDim: 0 };

  // sky / fog / sun colors along the day
  // brighter, moonlit night — a deep blue you can actually see & play in
  const nightSky = new THREE.Color('#3a4c74');
  const dawnSky = new THREE.Color('#e8a86a');
  const daySky = new THREE.Color('#9ed4e8');
  const duskSky = new THREE.Color('#e8935a');

  const nightFog = new THREE.Color('#37456a');
  const dawnFog = new THREE.Color('#c49a74');
  const dayFog = new THREE.Color('#a8cca2');
  const duskFog = new THREE.Color('#c48a64');

  const nightHemi = new THREE.Color('#7286b4');
  const dayHemi = new THREE.Color('#bcd8b2');

  const daySun = new THREE.Color('#fff2dc');
  const warmSun = new THREE.Color('#ffb977');
  const moonSun = new THREE.Color('#b6ccf0');

  const _sky = new THREE.Color();
  const _fog = new THREE.Color();

  // blend 4 keyframes (night/dawn/day/dusk) by hour
  function gradeColor(out, hr, night, dawn, day, dusk) {
    // key hours: 0 night, 6 dawn, 12 day, 18.5 dusk, 24 night
    if (hr < 4.5) out.copy(night);
    else if (hr < 7) out.lerpColors(night, dawn, (hr - 4.5) / 2.5);
    else if (hr < 10) out.lerpColors(dawn, day, (hr - 7) / 3);
    else if (hr < 17) out.copy(day);
    else if (hr < 19.5) out.lerpColors(day, dusk, (hr - 17) / 2.5);
    else if (hr < 21.5) out.lerpColors(dusk, night, (hr - 19.5) / 2);
    else out.copy(night);
    return out;
  }

  function update(dt, playerPos) {
    state.minutes = (state.minutes + dt) % (24 * 60);
    const hr = state.minutes / 60;

    // 0 = midnight .. 1 = midday
    const dayness = Math.max(0, Math.min(1, (Math.cos(((hr - 13) / 24) * Math.PI * 2) + 0.6) / 1.3));
    const dim = 1 - state.weatherDim * 0.45;

    // raised night floors so moonlit nights stay readable (was 0.22 / 0.38)
    sun.intensity = (0.42 + dayness * 1.05) * dim;
    hemi.intensity = (0.62 + dayness * 0.45) * (1 - state.weatherDim * 0.25);

    gradeColor(_sky, hr, nightSky, dawnSky, daySky, duskSky);
    gradeColor(_fog, hr, nightFog, dawnFog, dayFog, duskFog);
    if (state.weatherDim > 0) {
      _sky.lerp(new THREE.Color('#5c6a74'), state.weatherDim * 0.6);
      _fog.lerp(new THREE.Color('#5c6a74'), state.weatherDim * 0.55);
    }
    scene.background = scene.background || new THREE.Color();
    scene.background.copy(_sky);
    scene.fog.color.copy(_fog);
    hemi.color.lerpColors(nightHemi, dayHemi, dayness);

    // warm sun near dawn/dusk, moonlight at night
    const warm = Math.max(0, 1 - Math.abs(dayness - 0.32) * 3.2);
    if (dayness < 0.12) sun.color.copy(moonSun);
    else sun.color.lerpColors(daySun, warmSun, Math.min(1, warm));

    // thicker fog around dawn (morning mist)
    const mist = hr > 4.5 && hr < 8.5 ? Math.sin(((hr - 4.5) / 4) * Math.PI) : 0;
    scene.fog.density = 0.022 + mist * 0.014 + state.weatherDim * 0.012;

    // sun follows the player so the shadow frustum stays relevant
    const ang = ((hr - 6) / 12) * Math.PI; // rise -> set
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
