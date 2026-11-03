// AMBIENCE — the small signs that somebody lives here.
//
// CHIMNEY SMOKE. Every hut in the plaza and the cottage on Lanternhome had a
// chimney and none of them ever smoked, so the village read as a set that had
// been built and left. A thin curl of smoke off a roof is the cheapest way
// there is to say "home", and it leans with the SAME wind every banner,
// lantern and flower bed leans with, which ties it into the weather.
//
// All of it is ONE mesh: every puff is a camera-facing quad in a single
// buffer with RGBA vertex colours, so each puff fades on its own alpha while
// the whole lot costs one draw call. Sprites would have been one draw call per
// puff — forty of them on top of the busiest area of the map.
import * as THREE from 'three';

const PUFFS = 7;            // per chimney
const LIFE = 4.6;           // seconds
const RANGE = 70;           // chimneys further than this do not smoke

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createAmbience({ scene, wind, sources }) {
  // sources(): array of world Vector3 chimney tops (may change: houses upgrade)
  const MAX = 10 * PUFFS;
  const pos = new Float32Array(MAX * 4 * 3);
  const col = new Float32Array(MAX * 4 * 4);
  const uv = new Float32Array(MAX * 4 * 2);
  const idx = [];
  for (let i = 0; i < MAX; i++) {
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    const a = i * 4;
    idx.push(a, a + 1, a + 2, a, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({
    map: softTexture(), vertexColors: true, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  scene.add(mesh);

  // per chimney: a ring of puffs at staggered ages, so it never starts empty
  let chimneys = [];
  const puffs = [];          // { ci, age, ox, oz, spin }
  function sync() {
    const src = sources().filter(Boolean).slice(0, 10);
    if (src.length === chimneys.length && src.every((v, i) => v.distanceToSquared(chimneys[i]) < 0.01)) return;
    chimneys = src.map((v) => v.clone());
    puffs.length = 0;
    chimneys.forEach((_, ci) => {
      for (let k = 0; k < PUFFS; k++) {
        puffs.push({ ci, age: (k / PUFFS) * LIFE, ox: 0, oz: 0, wob: Math.random() * 6.28 });
      }
    });
  }
  let syncT = 0;

  const right = new THREE.Vector3(), up = new THREE.Vector3();
  const smokeDay = new THREE.Color('#e4e0d8'), smokeNight = new THREE.Color('#6c7288'), c = new THREE.Color();

  function update(dt, playerPos, camera, night = 0) {
    syncT -= dt;
    if (syncT <= 0) { syncT = 2; sync(); }
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    c.copy(smokeDay).lerp(smokeNight, night);
    const ws = wind?.state;
    const wx = ws ? Math.sin(ws.dir) * (0.25 + ws.strength * 0.7 + ws.gust * 0.6) : 0.3;
    const wz = ws ? Math.cos(ws.dir) * (0.25 + ws.strength * 0.7 + ws.gust * 0.6) : 0.1;
    let n = 0;
    for (const p of puffs) {
      const ch = chimneys[p.ci];
      if ((ch.x - playerPos.x) ** 2 + (ch.z - playerPos.z) ** 2 > RANGE * RANGE) continue;
      p.age += dt;
      if (p.age >= LIFE) { p.age -= LIFE; p.wob = Math.random() * 6.28; }
      const k = p.age / LIFE;
      // rises fast off the pot and slows; the wind takes more of it as it goes
      const rise = 2.6 * (1 - (1 - k) * (1 - k));
      const drift = k * k * 2.2;
      const x = ch.x + wx * drift + Math.sin(p.age * 1.3 + p.wob) * 0.12 * k;
      const y = ch.y + rise;
      const z = ch.z + wz * drift + Math.cos(p.age * 1.1 + p.wob) * 0.12 * k;
      const size = 0.28 + k * 1.15;
      const alpha = Math.min(1, p.age / 0.5) * (1 - k) * 0.5;
      const o = n * 12;
      const rx = right.x * size, ry = right.y * size, rz = right.z * size;
      const ux = up.x * size, uy = up.y * size, uz = up.z * size;
      pos[o] = x - rx - ux; pos[o + 1] = y - ry - uy; pos[o + 2] = z - rz - uz;
      pos[o + 3] = x + rx - ux; pos[o + 4] = y + ry - uy; pos[o + 5] = z + rz - uz;
      pos[o + 6] = x + rx + ux; pos[o + 7] = y + ry + uy; pos[o + 8] = z + rz + uz;
      pos[o + 9] = x - rx + ux; pos[o + 10] = y - ry + uy; pos[o + 11] = z - rz + uz;
      const q = n * 16;
      for (let v = 0; v < 4; v++) { col[q + v * 4] = c.r; col[q + v * 4 + 1] = c.g; col[q + v * 4 + 2] = c.b; col[q + v * 4 + 3] = alpha; }
      n++;
    }
    geo.setDrawRange(0, n * 6);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    mesh.visible = n > 0;
  }

  function dispose() {
    scene.remove(mesh);
    geo.dispose(); mat.map.dispose(); mat.dispose();
  }
  return { update, dispose, mesh, get count() { return puffs.length; } };
}
