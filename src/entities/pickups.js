// Drop item di dunia: sprite ikon yang berputar & melayang, magnet ke player.
import * as THREE from 'three';
import { itemIconTexture } from '../gfx/textures.js';

const MAGNET_R = 2.6;
const PICKUP_R = 0.8;

export function createPickups(scene, terrain) {
  const items = [];
  const texCache = new Map();

  function tex(id) {
    if (!texCache.has(id)) texCache.set(id, itemIconTexture(id));
    return texCache.get(id);
  }

  function spawn(id, count, pos) {
    const mat = new THREE.SpriteMaterial({ map: tex(id), transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.5, 0.5, 1);
    const a = Math.random() * Math.PI * 2;
    spr.position.set(
      pos.x + Math.cos(a) * 0.4,
      terrain.surfaceY(pos.x, pos.z) + 0.4,
      pos.z + Math.sin(a) * 0.4
    );
    scene.add(spr);
    items.push({ id, count, spr, t: Math.random() * 10, vy: 2.2 });
  }

  function update(dt, playerPos, onPickup, magnetMult = 1) {
    const magnetR = MAGNET_R * magnetMult;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      const p = it.spr.position;
      const base = terrain.surfaceY(p.x, p.z) + 0.35;

      // lompatan kecil saat muncul
      if (it.vy !== 0) {
        p.y += it.vy * dt;
        it.vy -= 9 * dt;
        if (p.y <= base) { p.y = base; it.vy = 0; }
      } else {
        p.y = base + Math.sin(it.t * 3) * 0.07;
      }

      const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < magnetR && d > 0.01) {
        const pull = (1 - d / magnetR) * 7;
        p.x += (dx / d) * pull * dt;
        p.z += (dz / d) * pull * dt;
      }
      if (d < PICKUP_R) {
        onPickup(it.id, it.count);
        scene.remove(it.spr);
        it.spr.material.dispose(); // icon texture is cached & shared — keep it
        items.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}
