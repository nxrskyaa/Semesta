import { SHARED } from '../gfx/meshcache.js';
// GPU-resource cleanup for despawned objects. Long sessions were leaking
// thousands of geometries/materials (every dead enemy, arrow and drop kept
// its buffers alive), which slowly ground the browser down.
// NOTE: textures are only disposed when explicitly asked — most maps
// (critter faces, item icons) are cached and shared across many objects.
/**
 * Free an object's GPU resources — but NEVER the ones handed out by
 * gfx/meshcache.js. Those are shared by every prop and every monster of the
 * same shape; disposing one on a single enemy's death would blank out all the
 * others. Shared resources carry the SHARED tag and are skipped.
 */
export function disposeObject(root, disposeMaps = false) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry[SHARED]) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m[SHARED]) continue;
      if (disposeMaps && m.map) m.map.dispose();
      m.dispose();
    }
  });
}
