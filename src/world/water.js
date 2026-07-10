// Air: plane bertekstur noise yang bergeser + buih di tepian danau.
import * as THREE from 'three';
import { WATER_Y, WATER_LEVEL } from './terrain.js';
import { makeWaterNoiseTexture, PALETTE } from '../gfx/textures.js';

export function buildWater(terrain, scene) {
  const S = terrain.size;
  const group = new THREE.Group();

  const tex = makeWaterNoiseTexture();
  tex.repeat.set(S / 8, S / 8);
  const mat = new THREE.MeshLambertMaterial({
    map: tex, transparent: true, opacity: 0.82, depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(S, S), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = WATER_Y;
  group.add(plane);

  // buih: quad kecil di sel air yang bersebelahan dengan daratan
  const foamPos = [], foamIdx = [];
  let vi = 0;
  for (let iz = 1; iz < S - 1; iz++) {
    for (let ix = 1; ix < S - 1; ix++) {
      if (!terrain.isWaterCell(ix, iz)) continue;
      const shore =
        !terrain.isWaterCell(ix + 1, iz) || !terrain.isWaterCell(ix - 1, iz) ||
        !terrain.isWaterCell(ix, iz + 1) || !terrain.isWaterCell(ix, iz - 1);
      if (!shore) continue;
      const x = ix - S / 2, z = iz - S / 2, y = WATER_Y + 0.02;
      foamPos.push(x, y, z + 1, x + 1, y, z + 1, x + 1, y, z, x, y, z);
      foamIdx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
  }
  let foamMat = null;
  if (vi > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(foamPos, 3));
    g.setIndex(foamIdx);
    foamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.foam), transparent: true, opacity: 0.28, depthWrite: false,
    });
    group.add(new THREE.Mesh(g, foamMat));
  }

  scene.add(group);

  function update(dt, time) {
    tex.offset.x = Math.sin(time * 0.08) * 0.3 + time * 0.008;
    tex.offset.y = time * 0.012;
    if (foamMat) foamMat.opacity = 0.2 + (Math.sin(time * 1.7) * 0.5 + 0.5) * 0.18;
  }

  return { group, update };
}
