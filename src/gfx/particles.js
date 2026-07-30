// Pixel-cube particles: hit sparks, water splash, slime pops, level-up glitter.
// Plus juicy combat FX: expanding shockwave rings and pooled light flashes.
import * as THREE from 'three';
import { getQuality, onQualityChange } from './quality.js';

const MAX = 800;
const MAX_RINGS = 10;
const MAX_FLASH = 6;

export function createParticles(scene) {
  // VISUAL FX scales every emitter's count. Kept live so the setting takes
  // effect the moment it changes, without rebuilding the world.
  let fxScale = getQuality().particleScale;
  onQualityChange((nq) => { fxScale = nq.particleScale; });
  const nOf = (n) => Math.max(1, Math.round(n * fxScale));
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // soft round glow sprite for each particle (nicer than hard squares)
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 32;
  {
    const c = dotCanvas.getContext('2d');
    const g2 = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.fillRect(0, 0, 32, 32);
  }
  const dotTex = new THREE.CanvasTexture(dotCanvas);
  const mat = new THREE.PointsMaterial({
    size: 0.2, map: dotTex, vertexColors: true, transparent: true, opacity: 1,
    depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 1 });
  let cursor = 0;

  function burst(pos, colorHex, count = 10, speed = 2.4, grav = 6, life = 0.55) {
    const c = new THREE.Color(colorHex);
    count = nOf(count);
    for (let i = 0; i < count; i++) {
      const p = pool[cursor]; cursor = (cursor + 1) % MAX;
      p.life = life * (0.6 + Math.random() * 0.6);
      p.x = pos.x; p.y = pos.y; p.z = pos.z;
      const a = Math.random() * Math.PI * 2, up = Math.random();
      p.vx = Math.cos(a) * speed * (0.3 + Math.random() * 0.7);
      p.vz = Math.sin(a) * speed * (0.3 + Math.random() * 0.7);
      p.vy = up * speed * 1.1;
      p.r = c.r; p.g = c.g; p.b = c.b;
      p.grav = grav;
    }
  }

  function fountain(pos, colorHex, count = 14) {
    burst(pos, colorHex, count, 1.6, -1.5, 0.9); // negative gravity: rises (level up)
  }

  function ring(pos, colorHex, count = 20, radius = 2.6) {
    const c = new THREE.Color(colorHex);
    count = nOf(count);
    for (let i = 0; i < count; i++) {
      const p = pool[cursor]; cursor = (cursor + 1) % MAX;
      const a = (i / count) * Math.PI * 2;
      p.life = 0.45;
      p.x = pos.x; p.y = pos.y + 0.5; p.z = pos.z;
      p.vx = Math.cos(a) * radius * 2.4;
      p.vz = Math.sin(a) * radius * 2.4;
      p.vy = 0.6;
      p.r = c.r; p.g = c.g; p.b = c.b;
      p.grav = 2;
    }
  }

  // --- shockwave: flat expanding ring mesh that fades out ---
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.72, 1.0, 26);
  for (let i = 0; i < MAX_RINGS; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, m, t: 0, dur: 0, from: 0.3, to: 3 });
  }
  let ringCursor = 0;

  function shockwave(pos, colorHex, radius = 3, dur = 0.4) {
    const r = rings[ringCursor]; ringCursor = (ringCursor + 1) % MAX_RINGS;
    r.m.color.set(colorHex);
    r.mesh.position.set(pos.x, pos.y + 0.12, pos.z);
    r.t = dur; r.dur = dur; r.from = radius * 0.2; r.to = radius;
    r.mesh.visible = true;
  }

  // --- rune circle: a rotating magic sigil that blooms under skill casts ---
  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = runeCanvas.height = 128;
  {
    const c = runeCanvas.getContext('2d');
    c.strokeStyle = '#ffffff';
    c.translate(64, 64);
    c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, 56, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.stroke();
    // tick notches + orbiting diamonds + inner triangle — reads as a sigil
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
      c.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.save();
      c.translate(Math.cos(a) * 50, Math.sin(a) * 50);
      c.rotate(a);
      c.fillRect(-4, -4, 8, 8);
      c.restore();
    }
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 34, y = Math.sin(a) * 34;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  const runeTex = new THREE.CanvasTexture(runeCanvas);
  const runes = [];
  const MAX_RUNES = 5;
  for (let i = 0; i < MAX_RUNES; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, map: runeTex, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    runes.push({ mesh, m, t: 0, dur: 0, size: 2, spin: 1 });
  }
  let runeCursor = 0;

  function runeCircle(pos, colorHex, size = 2.6, dur = 0.7) {
    const r = runes[runeCursor]; runeCursor = (runeCursor + 1) % MAX_RUNES;
    r.m.color.set(colorHex);
    r.mesh.position.set(pos.x, pos.y + 0.1, pos.z);
    r.t = dur; r.dur = dur; r.size = size;
    r.spin = Math.random() < 0.5 ? -1 : 1;
    r.mesh.visible = true;
  }

  // --- flash: pooled point light for casts/explosions ---
  const flashes = [];
  for (let i = 0; i < MAX_FLASH; i++) {
    const L = new THREE.PointLight(0xffffff, 0, 9, 1.6);
    scene.add(L);
    flashes.push({ L, t: 0, dur: 0, peak: 0 });
  }
  let flashCursor = 0;

  function flash(pos, colorHex, intensity = 6, dur = 0.3) {
    const f = flashes[flashCursor]; flashCursor = (flashCursor + 1) % MAX_FLASH;
    f.L.color.set(colorHex);
    f.L.position.set(pos.x, pos.y + 0.8, pos.z);
    f.t = dur; f.dur = dur; f.peak = intensity;
  }

  function update(dt) {
    for (let i = 0; i < MAX; i++) {
      const p = pool[i];
      if (p.life <= 0) { positions[i * 3 + 1] = -999; continue; }
      p.life -= dt;
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
      colors[i * 3] = p.r; colors[i * 3 + 1] = p.g; colors[i * 3 + 2] = p.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    for (const r of rings) {
      if (r.t <= 0) { r.mesh.visible = false; continue; }
      r.t -= dt;
      const k = 1 - Math.max(0, r.t / r.dur); // 0..1
      const s = r.from + (r.to - r.from) * (1 - (1 - k) * (1 - k)); // ease-out
      r.mesh.scale.setScalar(s);
      r.m.opacity = 0.75 * (1 - k);
    }

    for (const f of flashes) {
      if (f.t <= 0) { f.L.intensity = 0; continue; }
      f.t -= dt;
      f.L.intensity = f.peak * Math.max(0, f.t / f.dur);
    }

    for (const r of runes) {
      if (r.t <= 0) { r.mesh.visible = false; continue; }
      r.t -= dt;
      const k = 1 - Math.max(0, r.t / r.dur); // 0..1
      const grow = 0.4 + 0.6 * (1 - (1 - k) * (1 - k));
      r.mesh.scale.setScalar(r.size * grow);
      r.mesh.rotation.z += dt * 2.6 * r.spin;
      r.m.opacity = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
    }
  }

  return { burst, fountain, ring, shockwave, flash, runeCircle, update };
}
