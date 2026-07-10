// Resolusi serangan player + angka damage melayang (DOM overlay diproyeksi ke layar).
import * as THREE from 'three';

export function createDamageNumbers(hudEl, camera) {
  const nums = [];
  const v = new THREE.Vector3();

  function spawn(worldPos, text, cls = '') {
    const el = document.createElement('div');
    el.className = `dmg-num ${cls}`;
    el.textContent = text;
    hudEl.appendChild(el);
    nums.push({ el, pos: worldPos.clone(), life: 0.9, vy: 1.6 });
  }

  function update(dt) {
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i];
      n.life -= dt;
      n.pos.y += n.vy * dt;
      n.vy *= 1 - dt * 2;
      if (n.life <= 0) { n.el.remove(); nums.splice(i, 1); continue; }
      v.copy(n.pos).project(camera);
      if (v.z > 1) { n.el.style.display = 'none'; continue; }
      n.el.style.display = '';
      n.el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      n.el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
      n.el.style.opacity = String(Math.min(1, n.life * 2.2));
    }
  }

  return { spawn, update };
}

// Cek musuh yang kena ayunan: dalam radius senjata & dalam busur arah hadap.
export function resolveMeleeHit(playerState, weaponDef, enemies, dmgMult) {
  const hits = [];
  const px = playerState.pos.x, pz = playerState.pos.z;
  const facing = playerState.facing;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.mesh.position.x - px, dz = e.mesh.position.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > weaponDef.range) continue;
    const ang = Math.atan2(dx, dz);
    let diff = ang - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > weaponDef.arc / 2 && d > 0.7) continue;
    const base = weaponDef.dmg * dmgMult;
    const crit = Math.random() < 0.12;
    const dmg = Math.max(1, Math.round(base * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2)));
    hits.push({ enemy: e, dmg, crit });
  }
  return hits;
}
