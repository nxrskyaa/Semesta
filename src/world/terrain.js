// Semesta terrain: fBm heightmap -> SMOOTH heightfield mesh (bilinear corners,
// faceted low-poly shading). Rolling hills and soft lake basins instead of
// blocky minecraft steps. Cell data still drives gameplay (water, paths, types).
import * as THREE from 'three';
import { fbm2, valueNoise2, mulberry32 } from '../util/noise.js';
import { TILE } from '../gfx/textures.js';

export const WORLD_SIZE = 160;          // cells per side
export const BLOCK_H = 0.45;            // height unit
export const WATER_LEVEL = 2;           // cells with h <= this are submerged
export const WATER_Y = (WATER_LEVEL + 1) * BLOCK_H + 0.07;

const SEED = 20240612;
const CHUNK = 16;
const MAX_H = 11;

export class Terrain {
  constructor() {
    const S = WORLD_SIZE;
    this.size = S;
    this.height = new Int8Array(S * S);
    this.type = new Uint8Array(S * S); // 0 grass,1 path,2 dirt,3 stone,4 moss,5 shore,6 flowers
    this._generate();
    this._buildCorners();
  }

  idx(ix, iz) { return iz * this.size + ix; }
  inBounds(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.size && iz < this.size; }

  cellOf(x, z) {
    return [Math.floor(x + this.size / 2), Math.floor(z + this.size / 2)];
  }

  heightCell(ix, iz) {
    if (!this.inBounds(ix, iz)) return MAX_H; // world wall
    return this.height[this.idx(ix, iz)];
  }

  // corner grid (S+1)^2 in block units — each corner averages its 4 cells,
  // giving a continuous smooth surface
  _buildCorners() {
    const S = this.size;
    this.corner = new Float32Array((S + 1) * (S + 1));
    for (let iz = 0; iz <= S; iz++) {
      for (let ix = 0; ix <= S; ix++) {
        let sum = 0, n = 0;
        for (let dz = -1; dz <= 0; dz++) {
          for (let dx = -1; dx <= 0; dx++) {
            const cx = ix + dx, cz = iz + dz;
            if (cx < 0 || cz < 0 || cx >= S || cz >= S) { sum += MAX_H * 0.8; n++; }
            else { sum += this.height[this.idx(cx, cz)]; n++; }
          }
        }
        this.corner[iz * (S + 1) + ix] = sum / n;
      }
    }
    // paths & village area get flattened harder toward their cell height
    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        if (this.type[this.idx(ix, iz)] !== 1) continue;
        const h = this.height[this.idx(ix, iz)];
        for (const [cx, cz] of [[ix, iz], [ix + 1, iz], [ix, iz + 1], [ix + 1, iz + 1]]) {
          const ci = cz * (S + 1) + cx;
          this.corner[ci] = this.corner[ci] * 0.4 + h * 0.6;
        }
      }
    }
  }

  cornerAt(ix, iz) {
    const S = this.size;
    ix = Math.max(0, Math.min(S, ix)); iz = Math.max(0, Math.min(S, iz));
    return this.corner[iz * (S + 1) + ix];
  }

  // world-space surface height — bilinear over the smooth corner grid
  surfaceY(x, z) {
    const S = this.size;
    const gx = Math.max(0, Math.min(S - 0.001, x + S / 2));
    const gz = Math.max(0, Math.min(S - 0.001, z + S / 2));
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const c00 = this.cornerAt(ix, iz), c10 = this.cornerAt(ix + 1, iz);
    const c01 = this.cornerAt(ix, iz + 1), c11 = this.cornerAt(ix + 1, iz + 1);
    const h = c00 * (1 - fx) * (1 - fz) + c10 * fx * (1 - fz) + c01 * (1 - fx) * fz + c11 * fx * fz;
    return h * BLOCK_H + BLOCK_H;
  }

  isWaterCell(ix, iz) { return this.heightCell(ix, iz) <= WATER_LEVEL; }
  isWater(x, z) { const [ix, iz] = this.cellOf(x, z); return this.isWaterCell(ix, iz); }

  typeAt(x, z) {
    const [ix, iz] = this.cellOf(x, z);
    if (!this.inBounds(ix, iz)) return 3;
    return this.type[this.idx(ix, iz)];
  }

  // Walkable: in bounds, not submerged, and not too steep a climb from yFrom.
  walkable(x, z, yFrom) {
    const [ix, iz] = this.cellOf(x, z);
    if (!this.inBounds(ix, iz)) return false;
    if (this.heightCell(ix, iz) <= WATER_LEVEL) return false; // water — blocked
    return this.surfaceY(x, z) - yFrom <= BLOCK_H * 1.8;
  }

  _generate() {
    const S = this.size;
    const lakes = [
      { x: S * 0.30, z: S * 0.62, r: 13 },
      { x: S * 0.68, z: S * 0.30, r: 9 },
    ];
    this.lakes = lakes;

    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        const nx = ix / S, nz = iz / S;
        let e = fbm2(nx * 5.5, nz * 5.5, SEED, 4);
        e = Math.pow(e, 1.25) * (MAX_H - 1) + 1.2;

        for (const L of lakes) {
          const d = Math.hypot(ix - L.x, iz - L.z);
          if (d < L.r * 1.8) {
            const t = Math.max(0, 1 - d / (L.r * 1.8));
            e -= t * t * 7.5;
          }
        }
        const edge = Math.min(ix, iz, S - 1 - ix, S - 1 - iz);
        if (edge < 6) e += (6 - edge) * 1.1;

        let h = Math.max(0, Math.min(MAX_H, Math.round(e)));
        this.height[this.idx(ix, iz)] = h;
      }
    }

    this._carvePath(SEED + 5, true);
    this._carvePath(SEED + 9, false);

    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        const i = this.idx(ix, iz);
        if (this.type[i] === 1) continue;
        const h = this.height[i];
        const nx = ix / S, nz = iz / S;
        if (h <= WATER_LEVEL) { this.type[i] = 5; continue; }
        if (h >= MAX_H - 2) { this.type[i] = 3; continue; }
        const patch = fbm2(nx * 19, nz * 19, SEED + 31, 3);
        if (patch < 0.34) { this.type[i] = 2; continue; }
        const moss = valueNoise2(nx * 17, nz * 17, SEED + 41);
        if (moss > 0.78) { this.type[i] = 4; continue; }
        const flowers = valueNoise2(nx * 23, nz * 23, SEED + 63);
        if (flowers > 0.72) { this.type[i] = 6; continue; }
        this.type[i] = 0;
      }
    }

    // flatten a cozy pocket for the village around the spawn point
    this.spawn = this._findSpawn();
    const [sx, sz] = this.cellOf(this.spawn.x, this.spawn.z);
    const sh = this.heightCell(sx, sz);
    const R = 11;
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const ix = sx + dx, iz = sz + dz;
        if (!this.inBounds(ix, iz)) continue;
        const d = Math.hypot(dx, dz);
        if (d > R) continue;
        const i = this.idx(ix, iz);
        if (this.height[i] <= WATER_LEVEL) continue;
        const t = Math.max(0, 1 - d / R);
        this.height[i] = Math.round(this.height[i] * (1 - t * 0.8) + sh * t * 0.8);
      }
    }
    this.spawn = new THREE.Vector3(
      sx - this.size / 2 + 0.5,
      this.heightCell(sx, sz) * BLOCK_H + BLOCK_H,
      sz - this.size / 2 + 0.5,
    );
  }

  _carvePath(seed, horizontal) {
    const S = this.size;
    let cross = S * (0.35 + valueNoise2(seed, 0, seed) * 0.3);
    for (let a = 0; a < S; a++) {
      cross += (fbm2(a * 0.035, 0, seed, 3) - 0.5) * 2.6;
      cross = Math.max(8, Math.min(S - 8, cross));
      const bc = Math.round(cross);
      for (let w = -1; w <= 1; w++) {
        const ix = horizontal ? a : bc + w;
        const iz = horizontal ? bc + w : a;
        if (!this.inBounds(ix, iz)) continue;
        const i = this.idx(ix, iz);
        if (this.height[i] <= WATER_LEVEL) continue;
        if (w === 0 && a > 0) {
          const pi = horizontal ? this.idx(ix - 1, iz) : this.idx(ix, iz - 1);
          const ph = this.height[pi];
          if (Math.abs(this.height[i] - ph) > 1) {
            this.height[i] = ph + Math.sign(this.height[i] - ph);
          }
        }
        this.type[i] = 1;
      }
    }
  }

  _findSpawn() {
    const S = this.size;
    for (let r = 0; r < S / 2; r++) {
      for (let dz = -r; dz <= r; dz += Math.max(1, r)) {
        for (let dx = -r; dx <= r; dx++) {
          const ix = Math.floor(S / 2) + dx, iz = Math.floor(S / 2) + dz;
          const i = this.idx(ix, iz);
          if (this.height[i] > WATER_LEVEL + 1 && this.height[i] < MAX_H - 3) {
            return new THREE.Vector3(ix - S / 2 + 0.5, this.height[i] * BLOCK_H + BLOCK_H, iz - S / 2 + 0.5);
          }
        }
      }
    }
    return new THREE.Vector3(0, 4, 0);
  }
}

const TOP_TILE = [TILE.GRASS_A, TILE.PATH, TILE.DIRT, TILE.STONE, TILE.MOSS, TILE.SHORE, TILE.FLOWER_A];

export function buildTerrainMesh(terrain, atlas) {
  const S = terrain.size;
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ map: atlas.texture });

  const grassVariants = [TILE.GRASS_A, TILE.GRASS_B, TILE.GRASS_C];
  const flowerVariants = [TILE.FLOWER_A, TILE.FLOWER_B];

  for (let cz = 0; cz < S / CHUNK; cz++) {
    for (let cx = 0; cx < S / CHUNK; cx++) {
      const pos = [], uv = [], idx = [];
      let vi = 0;

      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const ix = cx * CHUNK + lx, iz = cz * CHUNK + lz;
          const t = terrain.type[terrain.idx(ix, iz)];
          const x = ix - S / 2, z = iz - S / 2;

          // smooth corner heights (block units -> world Y)
          const y00 = terrain.cornerAt(ix, iz) * BLOCK_H + BLOCK_H;
          const y10 = terrain.cornerAt(ix + 1, iz) * BLOCK_H + BLOCK_H;
          const y01 = terrain.cornerAt(ix, iz + 1) * BLOCK_H + BLOCK_H;
          const y11 = terrain.cornerAt(ix + 1, iz + 1) * BLOCK_H + BLOCK_H;

          // pick tile: steep faces read as dirt/stone so cliffs feel earthy
          const steep = Math.max(y00, y10, y01, y11) - Math.min(y00, y10, y01, y11);
          let tile = TOP_TILE[t];
          if (t === 0) tile = grassVariants[(ix * 7 + iz * 13) % 3];
          if (t === 6) tile = flowerVariants[(ix * 5 + iz * 11) % 2];
          if (t === 1) { // path cells bordering grass get a soft grassy fringe
            const n = (dx2, dz2) => {
              const jx = ix + dx2, jz = iz + dz2;
              return terrain.inBounds(jx, jz) ? terrain.type[terrain.idx(jx, jz)] : 1;
            };
            if (n(1, 0) !== 1 || n(-1, 0) !== 1 || n(0, 1) !== 1 || n(0, -1) !== 1) {
              tile = TILE.PATH_EDGE;
            }
          }
          if (steep > BLOCK_H * 2.6) tile = TILE.STONE_SIDE;
          else if (steep > BLOCK_H * 1.5) tile = TILE.DIRT_SIDE;

          const r = atlas.uv(tile);
          // two triangles, duplicated verts => faceted low-poly shading
          pos.push(
            x, y00, z, x, y01, z + 1, x + 1, y11, z + 1,
            x, y00, z, x + 1, y11, z + 1, x + 1, y10, z,
          );
          uv.push(
            r.u0, r.v1, r.u0, r.v0, r.u1, r.v0,
            r.u0, r.v1, r.u1, r.v0, r.u1, r.v1,
          );
          idx.push(vi, vi + 1, vi + 2, vi + 3, vi + 4, vi + 5);
          vi += 6;
        }
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, material);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      group.add(mesh);
    }
  }
  return group;
}
