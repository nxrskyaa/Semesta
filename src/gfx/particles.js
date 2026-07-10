// Partikel kotak pixel: percikan hit, splash air, ledakan slime, kilau level-up.
import * as THREE from 'three';

const MAX = 600;

export function createParticles(scene) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.14, vertexColors: true, transparent: true, opacity: 0.95,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 1 });
  let cursor = 0;

  function burst(pos, colorHex, count = 10, speed = 2.4, grav = 6, life = 0.55) {
    const c = new THREE.Color(colorHex);
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
    burst(pos, colorHex, count, 1.6, -1.5, 0.9); // gravitasi negatif: naik (level up)
  }

  function ring(pos, colorHex, count = 20, radius = 2.6) {
    const c = new THREE.Color(colorHex);
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
  }

  return { burst, fountain, ring, update };
}
