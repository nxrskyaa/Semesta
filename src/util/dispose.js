// GPU-resource cleanup for despawned objects. Long sessions were leaking
// thousands of geometries/materials (every dead enemy, arrow and drop kept
// its buffers alive), which slowly ground the browser down.
// NOTE: textures are only disposed when explicitly asked — most maps
// (critter faces, item icons) are cached and shared across many objects.
export function disposeObject(root, disposeMaps = false) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (disposeMaps && m.map) m.map.dispose();
      m.dispose();
    }
  });
}
