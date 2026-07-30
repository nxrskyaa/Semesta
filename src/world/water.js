// Water: a rippling surface that reads as DEPTH, not as a blue sheet.
//
// Four things do the work, in order of how much they matter:
//   1. per-vertex depth tint — pale turquoise wherever land is nearby, sinking
//      to a deep blue offshore. This is what makes lagoons and reefs read.
//   2. Phong shading with an analytic normal — the swell faces catch a real
//      specular glint from the sun, so the surface has form instead of being
//      flat colour. The normal is derived from the same wave sum that moves the
//      vertices, which is both exact and far cheaper than recomputing it.
//   3. two-layer shore foam — a soft wash plus a brighter crest line running on
//      an offset rhythm, so surf reads as motion rather than a static outline.
//   4. sun glitter — a scrolling sparkle texture, doubled up out at sea.
//
// NOTE: `vertexColors` is safe HERE because this is a plain Mesh. It must never
// be used on the InstancedMeshes in decor.js — that renders them black.
import * as THREE from 'three';
import { getQuality } from '../gfx/quality.js';
import { WATER_Y, WATER_LEVEL } from './terrain.js';
import { makeWaterNoiseTexture, PALETTE } from '../gfx/textures.js';

// [freqX, freqZ, speed, amplitude] — a few crossing waves beat one big sine
const SWELL = [
  [0.35, 0.00, 1.40, 0.055],
  [0.00, 0.30, -1.10, 0.050],
  [0.18, 0.18, 0.70, 0.030],
  [0.075, -0.075, 0.50, 0.070],   // the long ocean ground swell
];

export function buildWater(terrain, scene) {
  const S = terrain.size;
  const group = new THREE.Group();

  const tex = makeWaterNoiseTexture();
  tex.repeat.set(S / 8, S / 8);
  // Phong, not Lambert: the sun needs something to glint off
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    vertexColors: true,
    specular: new THREE.Color('#cfeef7'),
    shininess: 72,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  // WORLD DETAIL: every vertex is rewritten each frame, so subdivision is a
  // straight per-frame cost — 84x84 touches 7,225 vertices a tick, 28x28 is 841
  const SEG = getQuality().waterSegments;
  // The sea runs WELL past the terrain. The land rim eases up into distant
  // highlands, but the ocean used to stop dead at the map bound — a visible
  // straight edge with sky under it, which is exactly what made the world read
  // as a tray. Three times the grid puts the horizon beyond anything the camera
  // can reach, so the sea just goes on.
  const SEA_SPAN = S * 3;
  const geo = new THREE.PlaneGeometry(SEA_SPAN, SEA_SPAN, SEG, SEG);
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = WATER_Y;
  group.add(plane);

  // cache the flat grid positions (plane-local space, pre-rotation)
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const baseX = new Float32Array(pos.count);
  const baseY = new Float32Array(pos.count);
  const amp = new Float32Array(pos.count);      // open sea heaves, ponds ripple
  for (let i = 0; i < pos.count; i++) {
    baseX[i] = pos.getX(i); baseY[i] = pos.getY(i);
    // anything outside the terrain grid is open ocean, so it heaves too
    const outside = Math.abs(baseX[i]) > S / 2 || Math.abs(baseY[i]) > S / 2;
    amp[i] = (outside || terrain.inOcean(baseX[i], -baseY[i])) ? 2.1 : 0.85;
  }

  // --- per-vertex depth tint -------------------------------------------------
  // "shallowness" = how much land sits in the neighbourhood. Plane-local (x, y)
  // maps to world (x, -y) because the plane is rotated -90deg about X.
  const deepC = new THREE.Color('#12557f');    // offshore: deep blue
  const midC = new THREE.Color('#2f95b8');     // the shelf
  const shoalC = new THREE.Color('#86e0dd');   // shallows: pale turquoise
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const R = 3;
  for (let i = 0; i < pos.count; i++) {
    const cx = Math.round(baseX[i] + S / 2);
    const cz = Math.round(-baseY[i] + S / 2);
    let land = 0, n = 0;
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const ix = cx + dx, iz = cz + dz;
        if (ix < 0 || iz < 0 || ix >= S || iz >= S) continue;
        n++;
        if (!terrain.isWaterCell(ix, iz)) land++;
      }
    }
    // off the grid entirely = deep open sea
    const shallow = n ? Math.min(1, (land / n) * 2.4) : 0;
    // three-stop ramp so the shelf gets its own colour instead of a flat blend
    if (shallow < 0.5) tmp.copy(deepC).lerp(midC, shallow * 2);
    else tmp.copy(midC).lerp(shoalC, (shallow - 0.5) * 2);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // --- shore foam: a soft wash + a brighter crest on an offset rhythm --------
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
  let foamMat = null, crestMat = null;
  if (vi > 0) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(foamPos, 3));
    g.setIndex(foamIdx);
    foamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.foam), transparent: true, opacity: 0.3, depthWrite: false,
    });
    group.add(new THREE.Mesh(g, foamMat));

    // the crest sits a hair higher on the same footprint, scaled in slightly so
    // the wash still shows around it
    const g2 = g.clone();
    const p2 = g2.attributes.position;
    for (let i = 0; i < p2.count; i++) p2.setY(i, p2.getY(i) + 0.012);
    crestMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'), transparent: true, opacity: 0.16, depthWrite: false,
    });
    const crest = new THREE.Mesh(g2, crestMat);
    crest.scale.set(0.9, 1, 0.9);
    group.add(crest);
  }

  // --- sun glitter: a second scrolling sparkle sheet over the ocean only -----
  let glitterMat = null;
  {
    const gt = makeWaterNoiseTexture();
    gt.repeat.set(S / 3.5, S / 3.5);
    glitterMat = new THREE.MeshBasicMaterial({
      map: gt, color: new THREE.Color('#ffffff'),
      transparent: true, opacity: 0.09, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(S, S, 1, 1), glitterMat);
    gp.rotation.x = -Math.PI / 2;
    gp.position.y = WATER_Y + 0.045;
    group.add(gp);
    glitterMat.userData.tex = gt;
  }

  scene.add(group);

  function update(dt, time) {
    // scroll the sparkle texture two ways for a shimmering surface
    tex.offset.x = Math.sin(time * 0.08) * 0.3 + time * 0.01;
    tex.offset.y = time * 0.014;
    if (glitterMat) {
      const gt = glitterMat.userData.tex;
      gt.offset.x = -time * 0.023;
      gt.offset.y = Math.sin(time * 0.11) * 0.2 + time * 0.008;
      glitterMat.opacity = 0.06 + (Math.sin(time * 0.7) * 0.5 + 0.5) * 0.06;
    }

    // Roll the surface and derive the normal ANALYTICALLY from the same wave
    // sum — exact, and far cheaper than computeVertexNormals(). Without this
    // the Phong specular has nothing to catch and the sea looks like paper.
    for (let i = 0; i < pos.count; i++) {
      const x = baseX[i], y = baseY[i], a = amp[i];
      let h = 0, dhdx = 0, dhdy = 0;
      for (let k = 0; k < SWELL.length; k++) {
        const [fx, fy, sp, A] = SWELL[k];
        const aA = A * a;
        const phase = x * fx + y * fy + time * sp;
        h += Math.sin(phase) * aA;
        const c = Math.cos(phase) * aA;
        dhdx += c * fx;
        dhdy += c * fy;
      }
      pos.setZ(i, h);
      const inv = 1 / Math.hypot(dhdx, dhdy, 1);
      nrm.setXYZ(i, -dhdx * inv, -dhdy * inv, inv);
    }
    pos.needsUpdate = true;
    nrm.needsUpdate = true;

    if (foamMat) {
      // wash and crest breathe on offset rhythms so the surf never pulses flat
      foamMat.opacity = 0.24 + (Math.sin(time * 1.7) * 0.5 + 0.5) * 0.2;
      crestMat.opacity = 0.10 + (Math.sin(time * 1.7 - 0.9) * 0.5 + 0.5) * 0.18;
    }
  }

  return { group, update };
}
