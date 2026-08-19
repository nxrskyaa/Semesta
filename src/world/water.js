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

/**
 * The EXACT surface height and slope of the sea at a world point, from the same
 * wave sum the mesh is displaced by.
 *
 * Without this, anything that floats has to guess. The watercraft were pinned to
 * the mean waterline while the surface swung +-0.4 around them, so every crest
 * rose almost half a unit above the keel and swallowed the hull — the boats read
 * as sinking. Ride this instead and they sit ON the swell.
 *
 * Plane space maps to the world as x = wx, y = -wz, which is why dz is negated.
 *
 * @returns {{h:number, dx:number, dz:number}} height above WATER_Y and the
 *   surface gradient, for pitching a hull along the wave it is sitting on.
 */
export function waveAt(x, z, time, ocean = true) {
  const a = ocean ? 2.1 : 0.85;
  const y = -z;
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
  return { h, dx: dhdx, dz: -dhdy };
}

export function buildWater(terrain, scene) {
  const S = terrain.size;
  const group = new THREE.Group();

  const tex = makeWaterNoiseTexture();
  tex.repeat.set(S / 8, S / 8);
  // Phong, not Lambert: the sun needs something to glint off.
  //
  // THE GLINT HAS TO BE A PATH, NOT A WALL. A near-white specular (#cfeef7) at
  // a low shininess (72) spreads its lobe across a plane that is almost flat
  // and almost fills the frame — so at midday on the coast the highlight
  // saturated, cleared the bloom threshold and smeared into a featureless
  // white sheet. Measured at the ordinary gameplay camera, 14.66% of the
  // frame was blown to pure white at noon, and the sea's colour, wave banding
  // and shoreline all vanished inside it. Nothing about the fog or the AO was
  // involved; hiding this one mesh took the blown fraction to 0.
  //
  // The specular term is ADDED after diffuse and is multiplied by neither the
  // vertex colour nor the map, which is why no amount of tinting the water
  // helped. The fix is to dim the highlight and tighten the lobe: swept
  // against the real frame at a pinned camera and sun, #cfeef7/72 -> 14.66%,
  // /220 -> 10.87%, #8fc4d4/140 -> 8.85%, #6a9aa8/180 -> 5.31%, and
  // #4a737f/220 -> 2.14%, which still reads as a bright sun path on the water
  // with the swell visible through it. Black would be 0 and is not the goal.
  //
  // MEASURE THIS AT A PINNED CAMERA. A first sweep moved the framing between
  // trials and reported the identical figure for six very different materials,
  // which is the same trap as A/B-ing a post pass with `pass.enabled`.
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    vertexColors: true,
    specular: new THREE.Color('#4a737f'),
    shininess: 220,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  // WORLD DETAIL: every vertex is rewritten each frame, so subdivision is a
  // straight per-frame cost — 84x84 touches 7,225 vertices a tick, 28x28 is 841
  const SEG = getQuality().waterSegments;
  // The DETAILED plane covers exactly the map. Stretching it to 3x the grid
  // while keeping the same segment count dropped the vertex density to one
  // point every ~17 units at LOW — a 13-unit lake then had barely a single
  // vertex, so its swell and depth tint were meaningless and the surface
  // flickered as those few vertices moved. The far water is a SEPARATE, cheap
  // plane added below.
  const geo = new THREE.PlaneGeometry(S, S, SEG, SEG);
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
  // Tint by ACTUAL DEPTH — how far the floor sits below the waterline — sampled
  // and smoothed over a small neighbourhood. The previous version keyed off how
  // much LAND was nearby, which meant a village pond (land on all sides) came
  // out one flat colour with no gradient at all. Depth is what the eye reads as
  // depth, in a lake exactly as much as in the sea.
  // Plane-local (x, y) maps to world (x, -y): the plane is rotated -90deg on X.
  const sandC = new THREE.Color('#b9e6d2');    // ankle-deep over pale sand
  const shoalC = new THREE.Color('#79dcd8');   // wadeable turquoise
  const midC = new THREE.Color('#2b90b6');     // the shelf
  const deepC = new THREE.Color('#0f4a76');    // offshore, and the lake basins
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const MAXD = 1.9;                             // depth at which it is fully deep
  for (let i = 0; i < pos.count; i++) {
    const wx = baseX[i], wz = -baseY[i];
    // average the depth over a few samples so the ramp is smooth rather than
    // stepping cell to cell
    let sum = 0, n = 0;
    for (const [ox, oz] of [[0, 0], [-1.2, 0], [1.2, 0], [0, -1.2], [0, 1.2]]) {
      const sx = wx + ox, sz = wz + oz;
      const [cx, cz] = terrain.cellOf(sx, sz);
      if (!terrain.inBounds(cx, cz)) { sum += MAXD; n++; continue; }  // open sea past the map
      sum += Math.max(0, WATER_Y - terrain.surfaceY(sx, sz));
      n++;
    }
    const d = Math.min(1, (sum / n) / MAXD);
    // four stops: sand -> shoal -> shelf -> deep
    if (d < 0.2) tmp.copy(sandC).lerp(shoalC, d / 0.2);
    else if (d < 0.5) tmp.copy(shoalC).lerp(midC, (d - 0.2) / 0.3);
    else tmp.copy(midC).lerp(deepC, (d - 0.5) / 0.5);
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

  // --- the OUTER SEA: a cheap flat ring beyond the detailed plane, so the
  // ocean still runs past the map bound without costing vertex density where it
  // actually matters. It does not animate; at that distance nothing reads.
  {
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(S * 0.706, S * 2.2, 32, 1),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color('#175f8c'), transparent: true, opacity: 0.9, depthWrite: false,
      }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = WATER_Y - 0.02;
    group.add(outer);
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
