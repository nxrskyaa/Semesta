// Proyektil: panah, bolt sihir, pisau lempar, ludah spora (musuh).
import * as THREE from 'three';

export function createProjectiles(scene, terrain) {
  const list = [];

  const arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
  const knifeGeo = new THREE.BoxGeometry(0.1, 0.03, 0.32);
  const orbGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);

  function spawn(opts) {
    const {
      pos, dir, speed = 16, range = 12, radius = 0.6,
      kind = 'arrow', color = '#ffffff', scale = 1,
      pierce = false, aoe = 0, fromEnemy = false,
      onHitEnemy = null, onHitPlayer = null, onExpire = null,
    } = opts;

    let mesh;
    if (kind === 'orb') {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
      mesh = new THREE.Mesh(orbGeo, mat);
      mesh.scale.setScalar(scale);
    } else if (kind === 'knife') {
      mesh = new THREE.Mesh(knifeGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
    } else { // arrow / spore
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
      mesh = new THREE.Mesh(arrowGeo, mat);
      mesh.scale.setScalar(scale);
    }
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(dir));
    scene.add(mesh);

    list.push({
      mesh, dir: dir.clone().normalize(), speed, left: range, radius,
      pierce, aoe, fromEnemy, onHitEnemy, onHitPlayer, onExpire,
      hitSet: pierce ? new Set() : null,
      kind, spin: kind === 'knife' || kind === 'orb',
      t: 0, trailColor: opts.trail || null,
    });
  }

  function update(dt, enemies, playerState, particles) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const step = p.speed * dt;
      p.left -= step;
      p.t += dt;
      p.mesh.position.addScaledVector(p.dir, step);
      if (p.spin) p.mesh.rotation.y += dt * 14;
      if (p.trailColor && particles && Math.random() < 0.6) {
        particles.burst(p.mesh.position, p.trailColor, 1, 0.4, 0.5, 0.3);
      }

      const pos = p.mesh.position;
      let dead = false;

      // tabrak terrain (dinding/tanah)
      const ground = terrain.surfaceY(pos.x, pos.z);
      if (pos.y < ground - 0.05) dead = true;

      if (!dead && !p.fromEnemy && enemies) {
        for (const e of enemies) {
          if (e.dead) continue;
          if (p.hitSet && p.hitSet.has(e)) continue;
          const dx = e.mesh.position.x - pos.x, dz = e.mesh.position.z - pos.z;
          const rr = p.radius + (e.type === 'golem' || e.type === 'treant' ? 0.6 : 0.35);
          if (dx * dx + dz * dz < rr * rr) {
            p.onHitEnemy?.(e, pos);
            if (p.pierce) { p.hitSet.add(e); continue; }
            dead = true;
            break;
          }
        }
      }

      if (!dead && p.fromEnemy && playerState && !playerState.dead) {
        const dx = playerState.pos.x - pos.x, dz = playerState.pos.z - pos.z;
        const rr = p.radius + 0.35;
        if (dx * dx + dz * dz < rr * rr && Math.abs(playerState.pos.y + 0.6 - pos.y) < 1.2) {
          p.onHitPlayer?.(pos);
          dead = true;
        }
      }

      if (p.left <= 0 && !dead) { dead = true; p.onExpire?.(pos.clone()); }

      if (dead) {
        scene.remove(p.mesh);
        list.splice(i, 1);
      }
    }
  }

  return { spawn, update, list };
}
