// Water: a gently rippling turquoise surface. The plane is subdivided so its
// vertices roll in a soft double-sine swell (no longer a stiff flat sheet),
// with a scrolling sparkle texture on top and animated shore foam.
import * as THREE from 'three';
import { getQuality } from '../gfx/quality.js';
import { WATER_Y, WATER_LEVEL } from './terrain.js';
import { makeWaterNoiseTexture, PALETTE } from '../gfx/textures.js';

export function buildWater(terrain, scene) {
  const S = terrain.size;
  const group = new THREE.Group();

  const tex = makeWaterNoiseTexture();
  tex.repeat.set(S / 8, S / 8);
  const mat = new THREE.MeshLambertMaterial({
    map: tex, color: new THREE.Color('#8fd6e8'),
    transparent: true, opacity: 0.86, depthWrite: false,
  });
  // subdivided plane so we can actually undulate the surface
  // WORLD DETAIL: the sea plane's vertices are rewritten every frame, so its
  // subdivision is a real per-frame cost
  const SEG = getQuality().waterSegments;
  const geo = new THREE.PlaneGeometry(S, S, SEG, SEG);
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = WATER_Y;
  group.add(plane);

  // cache the flat grid positions (in plane-local space, pre-rotation)
  const pos = geo.attributes.position;
  const baseX = new Float32Array(pos.count);
  const baseY = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { baseX[i] = pos.getX(i); baseY[i] = pos.getY(i); }

  // foam: small quads on water cells adjacent to land
  const foamPos = [], foamIdx = [];
  let vi = 0;
  for (let iz = 1; iz < S - 1; iz++) {
    for (let ix = 1; ix < S - 1; ix++) {
      if (!terrain.isWaterCell(ix, iz)) continue;
      const shore =
        !terrain.isWaterCell(ix + 1, iz) || !terrain.isWaterCell(ix - 1, iz) ||
        !terrain.isWaterCell(ix, iz + 1) || !terrain.isWaterCell(ix, iz - 1);
      if (!shore) continue;
      const x = ix - S / 2, z = iz - S / 2, y = WATER_Y + 0.03;
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
      color: new THREE.Color(PALETTE.foam), transparent: true, opacity: 0.3, depthWrite: false,
    });
    group.add(new THREE.Mesh(g, foamMat));
  }

  scene.add(group);

  function update(dt, time) {
    // scroll the sparkle texture two ways for a shimmering surface
    tex.offset.x = Math.sin(time * 0.08) * 0.3 + time * 0.01;
    tex.offset.y = time * 0.014;

    // roll the surface with a soft double swell (local Z is world height here)
    for (let i = 0; i < pos.count; i++) {
      const x = baseX[i], y = baseY[i];
      const wave = Math.sin(x * 0.35 + time * 1.4) * 0.055
        + Math.cos(y * 0.3 - time * 1.1) * 0.05
        + Math.sin((x + y) * 0.18 + time * 0.7) * 0.03;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;

    if (foamMat) foamMat.opacity = 0.24 + (Math.sin(time * 1.7) * 0.5 + 0.5) * 0.2;
  }

  return { group, update };
}
