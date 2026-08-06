// STATIC BAKING.
//
// Every prop in this game is assembled from little boxes and cylinders, which is
// how the art style works — but it means a single palm tree is 20 meshes and an
// island is 90. Those meshes never move relative to each other, so paying a draw
// call for each one buys nothing at all.
//
// bakeStatic() walks a subtree, finds every mesh that is NOT animated, groups
// them by material, transforms their geometry into the subtree's local space and
// merges each group into ONE mesh. A 90-mesh island collapses to a handful.
//
// The safety rule is opt-OUT, and it has to be, because merging something that
// is animated later would freeze it in place: anything a module still holds a
// reference to and poses per frame must be marked `obj.userData.dynamic = true`
// (which protects that object AND everything under it). Materials whose state
// changes at runtime — emissive pulses, hit flashes — must be marked the same
// way, since merged meshes share one material instance.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHARED } from './meshcache.js';

/** Everything about a material that has to match for two meshes to merge. */
function matKey(m) {
  return [
    m.type, m.color?.getHexString(), m.map?.uuid || '-', m.side, m.transparent,
    m.opacity, m.alphaTest, m.flatShading, m.emissive?.getHexString() || '-',
    m.emissiveIntensity, m.depthWrite, m.depthTest, m.blending, m.wireframe,
    m.vertexColors,
  ].join('|');
}

/**
 * Merge the static meshes under `root` in place.
 *
 * @param root  the subtree to bake. Its own transform is untouched, so the
 *              caller can still move/rotate the whole thing afterwards.
 * @returns {{before:number, after:number}} mesh counts, for measurement.
 */
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const groups = new Map();   // matKey -> { mat, geos[], meshes[] }
  const dynRoots = [];        // posed pivots, baked separately in their own frame
  let before = 0;

  const walk = (obj, dynamic) => {
    // `dynamic` is inherited: a posed pivot protects the whole limb under it.
    // The first object that turns it on is remembered — a swaying frond still
    // has three static blades under it, and merging those inside the pivot's OWN
    // frame is free: the pivot goes on rotating and draws one mesh instead of
    // three. That recursion is where most of the win is, because the props that
    // animate (palms, flower beds, dancers) are also the densest ones.
    if (!dynamic && obj.userData?.dynamic === true && obj !== root) {
      dynRoots.push(obj);
      return;
    }
    // NOTE the `obj !== root`: when the recursion descends INTO a posed pivot,
    // that pivot is now the root, and its own dynamic mark must not apply to
    // itself — otherwise the flag propagates to every child and the subtree we
    // came here to merge stays untouched. That single missing condition is why
    // a 20-petal rose head merged to nothing.
    const dyn = dynamic || (obj !== root && obj.userData?.dynamic === true);
    if (obj.isMesh && !obj.isInstancedMesh && !obj.isSkinnedMesh) {
      before++;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      // multi-material meshes carry groups; not worth the complexity here
      if (!dyn && mats.length === 1 && obj.material && obj.geometry
          && obj.visible && !obj.material.userData?.dynamic) {
        const k = matKey(obj.material);
        let g = groups.get(k);
        if (!g) groups.set(k, (g = { mat: obj.material, geos: [], meshes: [] }));
        // into the ROOT's frame, so the merged mesh sits at the root's origin.
        // NON-INDEXED, always: mergeGeometries refuses a batch that mixes
        // indexed and non-indexed inputs, and this world mixes them constantly
        // (BoxGeometry and LatheGeometry are indexed, a hand-built sweep is not).
        // It fails by logging and returning null, so the whole bucket silently
        // stayed unmerged — which is exactly what happened to the flower beds.
        const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
        geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, obj.matrixWorld));
        // merging needs identical attribute sets — drop anything exotic
        for (const name of Object.keys(geo.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') {
            geo.deleteAttribute(name);
          }
        }
        if (!geo.attributes.uv) {
          const n = geo.attributes.position.count;
          geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
        }
        if (!geo.attributes.normal) geo.computeVertexNormals();
        g.geos.push(geo);
        g.meshes.push(obj);
      }
    }
    for (const c of [...obj.children]) walk(c, dyn);
  };
  walk(root, false);

  let after = 0;
  for (const g of groups.values()) {
    // one mesh is already one draw call — merging it buys nothing and would
    // only cost us a geometry clone
    if (g.geos.length < 2) { g.geos.forEach((x) => x.dispose()); continue; }
    const merged = mergeGeometries(g.geos, false);
    g.geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const src = g.meshes[0];
    const out = new THREE.Mesh(merged, g.mat);
    out.castShadow = src.castShadow;
    out.receiveShadow = src.receiveShadow;
    out.renderOrder = src.renderOrder;
    out.name = 'baked';
    // the originals go, but their geometry is only disposed when it is NOT a
    // shared cache entry — freeing that would blank every other prop using it
    for (const m of g.meshes) {
      m.parent?.remove(m);
      if (m.geometry && !m.geometry[SHARED]) m.geometry.dispose();
    }
    root.add(out);
    after++;
  }
  // now the posed pivots, each in its own local frame
  for (const d of dynRoots) {
    const r = bakeStatic(d);
    before += r.before; after += r.after;
  }
  return { before, after };
}

/** Bake each child of `parent` separately, so they stay independently cullable. */
export function bakeChildren(parent) {
  let before = 0, after = 0;
  for (const c of [...parent.children]) {
    if (!c.isObject3D || c.userData?.dynamic === true) continue;
    const r = bakeStatic(c);
    before += r.before; after += r.after;
  }
  return { before, after };
}
