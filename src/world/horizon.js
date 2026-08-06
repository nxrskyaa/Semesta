// THE HORIZON RING.
//
// The terrain mesh stops at the map bound. Raising the rim into highlands helped,
// but it does not fix the actual problem: you can still see the exact line where
// the world ends, with sky underneath it. That reads as a box, and no amount of
// terrain work inside the box will hide the edge of the box.
//
// The answer every open-world game uses is a BACKDROP: distant landforms placed
// outside the playable area, far enough that you can never reach them, tinted
// toward the fog so they dissolve into the sky rather than ending. Three rings at
// different distances give parallax as you move, which is what sells depth.
//
// It is cheap: a few dozen low-poly cones and slabs, no shadows, no lighting
// updates, and it never animates.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * @param scene        the world scene
 * @param fogColor     the fog colour the far ranges blend toward
 * @param drawDistance the camera's far plane. The rings MUST sit inside it or
 *   they are culled and the edge of the world is bare again — at the LOW preset
 *   the far plane is 110, so a ring parked at 259 simply never renders.
 */
export function buildHorizon(scene, fogColor = '#9ec49a', drawDistance = 220) {
  const group = new THREE.Group();
  group.name = 'horizon';

  // deterministic, so the skyline is the same shape every boot
  let seed = 90210;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  const fog = new THREE.Color(fogColor);

  /**
   * One ring of peaks. Further rings are smaller in contrast (more fog blended
   * in), taller, and slower to slide past — that difference IS the parallax.
   */
  function ring(radius, count, minH, maxH, baseColor, fogMix, spread) {
    const base = new THREE.Color(baseColor).lerp(fog, fogMix);
    // every peak in a range is baked into ONE geometry: they share a colour and
    // never move, so 40-odd separate meshes bought nothing but draw calls
    const parts = [];
    // one shared material per ring: nothing here needs its own
    // A TRUE BACKDROP, not distant scenery. depthTest off + a negative
    // renderOrder means it is painted first and everything in the world draws
    // over it, so it can never occlude a tree or appear to stand in a field —
    // which is exactly what happened when these were ordinary meshes with fog
    // switched off. The ring can then sit close enough to survive the LOW
    // preset's 110-unit far plane without ever intruding.
    const mat = new THREE.MeshBasicMaterial({
      color: base, fog: false, depthTest: false, depthWrite: false,
    });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI * 2 / count) * 0.8;
      const r = radius + (rnd() - 0.5) * spread;
      const h = minH + rnd() * (maxH - minH);
      const w = h * (0.85 + rnd() * 0.9);
      // a cone with few sides reads as a ridge, not a party hat
      const pg = new THREE.ConeGeometry(w, h, 5 + Math.floor(rnd() * 3));
      pg.scale(1, 1, 0.55 + rnd() * 0.7);
      pg.rotateY(rnd() * Math.PI);
      pg.translate(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r);
      parts.push(pg);

      // a shoulder alongside most peaks, so ridges read as connected massifs
      if (rnd() < 0.7) {
        // The offset is a fraction of the RING, not of the peak. Scaling it by
        // the peak width flung shoulders up to 250 units out — past the far
        // plane, where they simply vanished and left gaps in the skyline.
        const off = (rnd() - 0.5) * radius * 0.14;
        const sg = new THREE.ConeGeometry(w * 0.7, h * 0.62, 5);
        sg.scale(1, 1, 0.6);
        sg.translate(
          Math.cos(a) * r - Math.sin(a) * off,
          h * 0.31 - 6,
          Math.sin(a) * r + Math.cos(a) * off,
        );
        parts.push(sg);
      }
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((g2) => g2.dispose());
    if (!merged) return;
    const range = new THREE.Mesh(merged, mat);
    range.renderOrder = -10;
    range.frustumCulled = false;
    group.add(range);
  }

  // Three ranges. The near one is only just outside the rim so it continues the
  // highlands; the far one is a pale wash barely distinct from the sky.
  // Radii are a fraction of the DRAW DISTANCE, not of the map, so every ring
  // stays inside the far plane at any preset. The ring group also follows the
  // player at 0.55x, so the effective distance never collapses.
  const D = drawDistance;
  ring(D * 0.55, 26, 26, 52, '#5e8a52', 0.35, D * 0.05);   // near: still green
  ring(D * 0.68, 22, 44, 82, '#6a8296', 0.55, D * 0.06);   // mid: hazy blue-grey
  ring(D * 0.80, 18, 70, 120, '#8fa6bc', 0.78, D * 0.05);  // far: almost sky

  // A skirt that closes the gap between the terrain edge and the first range, so
  // there is never a slot of empty sky under the mountains.
  const skirtMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#5e8a52').lerp(fog, 0.3), fog: false, side: THREE.DoubleSide,
    depthTest: false, depthWrite: false,
  });
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(D * 0.60, D * 0.50, 30, 40, 1, true), skirtMat);
  skirt.position.y = 4;
  skirt.renderOrder = -11;          // behind even the peaks
  skirt.frustumCulled = false;
  group.add(skirt);

  scene.add(group);

  /**
   * The ring is LOCKED to the player, one to one. A partial follow (0.55x) gives
   * you parallax, but it also means that once you walk toward the map edge the
   * ring slides the other way and a near peak ends up standing INSIDE the
   * playable world. Locking it means the ranges sit at a constant distance in
   * every direction — which is exactly how something genuinely far away
   * behaves, and it can never intrude or be reached.
   */
  function update(playerPos) {
    group.position.x = playerPos.x;
    group.position.z = playerPos.z;
  }

  return { group, update };
}
