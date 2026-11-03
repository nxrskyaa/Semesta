// CHUNKED INSTANCING — one scattered prop type split into a grid of meshes.
//
// Every tree, rock, bush, grass tuft and flower in Anavela was ONE InstancedMesh
// per type, spanning the whole 200-unit map. An InstancedMesh is frustum-tested
// as a single object, so each of them was drawn in full from everywhere: 1,908
// canopy blobs at 108 triangles each — 206k triangles — whether you were in a
// forest or out at sea, and the scene sat at ~500k triangles in every location
// measured. The GPU still transforms every vertex of an instance the camera
// cannot see.
//
// Split into a grid, each cell is its own InstancedMesh with an HONEST bounding
// sphere, and three's ordinary frustum culling skips the cells off screen —
// for the main view and for the shadow map alike. The object below keeps the
// InstancedMesh calls the decor code already makes (`setMatrixAt`,
// `setColorAt`, `instanceMatrix.needsUpdate`) keyed by the original GLOBAL
// index, so `clearArea` and every other caller work unchanged.
//
// Hidden instances are parked at y = -9999 (decor's GONE matrix). They are left
// out of the bounding sphere, or one hidden tree would stretch its cell's
// sphere 10,000 units down and the cell would never be culled again.
import * as THREE from 'three';

const PARKED_Y = -1000;
const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Sphere();

export class ChunkedInstanced extends THREE.Group {
  /**
   * @param points  [{x, z}] — where instance i will sit, by GLOBAL index
   * @param cell    grid size in world units
   */
  constructor(geo, mat, points, cell = 48) {
    super();
    this.isChunkedInstanced = true;
    const buckets = new Map();
    this.chunkOf = new Int32Array(points.length);
    this.localOf = new Int32Array(points.length);
    points.forEach((p, i) => {
      const k = `${Math.floor(p.x / cell)},${Math.floor(p.z / cell)}`;
      let b = buckets.get(k);
      if (!b) { b = []; buckets.set(k, b); }
      this.localOf[i] = b.length;
      b.push(i);
    });
    this.chunks = [];
    for (const list of buckets.values()) {
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      for (const gi of list) this.chunkOf[gi] = this.chunks.length;
      this.chunks.push(m);
      this.add(m);
    }
    const self = this;
    // stand-ins for the InstancedMesh attributes the decor code flags dirty
    this.instanceMatrix = { set needsUpdate(v) { if (v) for (const c of self.chunks) c.instanceMatrix.needsUpdate = true; } };
    this.instanceColor = null;
  }

  setMatrixAt(i, m) { this.chunks[this.chunkOf[i]].setMatrixAt(this.localOf[i], m); }

  setColorAt(i, c) {
    this.chunks[this.chunkOf[i]].setColorAt(this.localOf[i], c);
    if (!this.instanceColor) {
      const self = this;
      this.instanceColor = { set needsUpdate(v) { if (v) for (const ch of self.chunks) if (ch.instanceColor) ch.instanceColor.needsUpdate = true; } };
    }
  }

  setShadows(cast, receive) {
    for (const c of this.chunks) { c.castShadow = cast; c.receiveShadow = receive; }
    return this;
  }

  /** Recompute each cell's bounding sphere from its visible instances. Call
   *  once after the matrices are written. */
  finalize() {
    const g = this.chunks[0]?.geometry;
    if (!g) return this;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const local = g.boundingSphere;
    for (const c of this.chunks) {
      const box = new THREE.Box3();
      const spheres = [];
      for (let i = 0; i < c.count; i++) {
        c.getMatrixAt(i, tmpM);
        tmpV.setFromMatrixPosition(tmpM);
        if (tmpV.y < PARKED_Y) continue;
        tmpS.copy(local).applyMatrix4(tmpM);
        spheres.push(tmpS.clone());
        box.expandByPoint(tmpS.center);
      }
      const s = new THREE.Sphere();
      if (!spheres.length) { s.set(new THREE.Vector3(0, PARKED_Y * 10, 0), 0.01); c.visible = false; }
      else {
        box.getCenter(s.center);
        for (const sp of spheres) s.radius = Math.max(s.radius, s.center.distanceTo(sp.center) + sp.radius);
      }
      c.boundingSphere = s;
    }
    return this;
  }
}
