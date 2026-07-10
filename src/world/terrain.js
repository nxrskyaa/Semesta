// Semesta voxel terrain: fBm heightmap -> chunked mesh with face culling.
// Half-height blocks (0.45) keep slopes smooth and stair-steppy.
import * as THREE from 'three';
import { fbm2, valueNoise2, mulberry32 } from '../util/noise.js';
import { TILE } from '../gfx/textures.js';

export const WORLD_SIZE = 160;          // cells per side
export const BLOCK_H = 0.45;            // height of one step
export const WATER_LEVEL = 2;           // cells with h <= this are submerged
export const WATER_Y = (WATER_LEVEL + 1) * BLOCK_H + 0.07; // slightly above shore-cell tops

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

  // world-space surface height at a continuous position
  surfaceY(x, z) {
    const [ix, iz] = this.cellOf(x, z);
    return this.heightCell(ix, iz) * BLOCK_H + BLOCK_H;
  }

  isWaterCell(ix, iz) { return this.heightCell(ix, iz) <= WATER_LEVEL; }
  isWater(x, z) { const [ix, iz] = this.cellOf(x, z); return this.isWaterCell(ix, iz); }

  typeAt(x, z) {
    const [ix, iz] = this.cellOf(x, z);
    if (!this.inBounds(ix, iz)) return 3;
    return this.type[this.idx(ix, iz)];
  }

  // Can we walk from elevation yFrom onto the target cell?
  // Water cells are fully blocked (no walking on lakes), max climb ~1.5 steps.
  walkable(x, z, yFrom) {
    const [ix, iz] = this.cellOf(x, z);
    if (!this.inBounds(ix, iz)) return false;
    const h = this.heightCell(ix, iz);
    if (h <= WATER_LEVEL) return false;                  // submerged — blocked
    const y = h * BLOCK_H + BLOCK_H;
    return y - yFrom <= BLOCK_H * 1.6;
  }

  _generate() {
    const S = this.size;
    // lake basins are deterministic
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

        // lake depressions
        for (const L of lakes) {
          const d = Math.hypot(ix - L.x, iz - L.z);
          if (d < L.r * 1.8) {
            const t = Math.max(0, 1 - d / (L.r * 1.8));
            e -= t * t * 7.5;
          }
        }
        // world edges rise into cliffs
        const edge = Math.min(ix, iz, S - 1 - ix, S - 1 - iz);
        if (edge < 6) e += (6 - edge) * 1.1;

        let h = Math.max(0, Math.min(MAX_H, Math.round(e)));
        this.height[this.idx(ix, iz)] = h;
      }
    }

    // winding footpaths: 2 routes crossing the world
    this._carvePath(SEED + 5, true);
    this._carvePath(SEED + 9, false);

    // surface types
    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        const i = this.idx(ix, iz);
        if (this.type[i] === 1) continue; // path already marked
        const h = this.height[i];
        const nx = ix / S, nz = iz / S;
        if (h <= WATER_LEVEL) { this.type[i] = 5; continue; }
        if (h >= MAX_H - 2) { this.type[i] = 3; continue; }
        const patch = fbm2(nx * 19, nz * 19, SEED + 31, 3);
        if (patch < 0.34) { this.type[i] = 2; continue; }       // dirt litter
        const moss = valueNoise2(nx * 17, nz * 17, SEED + 41);
        if (moss > 0.78) { this.type[i] = 4; continue; }
        const flowers = valueNoise2(nx * 23, nz * 23, SEED + 63);
        if (flowers > 0.72) { this.type[i] = 6; continue; }     // flower meadow
        this.type[i] = 0;
      }
    }

    // spawn point: find grass near the center
    this.spawn = this._findSpawn();
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
        if (this.height[i] <= WATER_LEVEL) continue; // don't pave the lakes
        // flatten path against previous path cell
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
          if (this.height[i] > WATER_LEVEL && this.height[i] < MAX_H - 2) {
            return new THREE.Vector3(ix - S / 2 + 0.5, this.height[i] * BLOCK_H + BLOCK_H, iz - S / 2 + 0.5);
          }
        }
      }
    }
    return new THREE.Vector3(0, 4, 0);
  }
}

const TOP_TILE = [TILE.GRASS_A, TILE.PATH, TILE.DIRT, TILE.STONE, TILE.MOSS, TILE.SHORE, TILE.FLOWER_A];
const SIDE_TILE = [TILE.GRASS_SIDE, TILE.PATH_SIDE, TILE.DIRT_SIDE, TILE.STONE_SIDE, TILE.GRASS_SIDE, TILE.SHORE, TILE.GRASS_SIDE];

export function buildTerrainMesh(terrain, atlas) {
  const S = terrain.size;
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ map: atlas.texture });

  const grassVariants = [TILE.GRASS_A, TILE.GRASS_B, TILE.GRASS_C];
  const flowerVariants = [TILE.FLOWER_A, TILE.FLOWER_B];

  for (let cz = 0; cz < S / CHUNK; cz++) {
    for (let cx = 0; cx < S / CHUNK; cx++) {
      const pos = [], norm = [], uv = [], idx = [];
      let vi = 0;

      const quad = (verts, normal, tile) => {
        const r = atlas.uv(tile);
        for (const v of verts) pos.push(...v);
        for (let k = 0; k < 4; k++) norm.push(...normal);
        uv.push(r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1);
        idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        vi += 4;
      };

      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const ix = cx * CHUNK + lx, iz = cz * CHUNK + lz;
          const h = terrain.heightCell(ix, iz);
          const t = terrain.type[terrain.idx(ix, iz)];
          const x = ix - S / 2, z = iz - S / 2;
          const y = h * BLOCK_H + BLOCK_H;

          let topTile = TOP_TILE[t];
          if (t === 0) topTile = grassVariants[(ix * 7 + iz * 13) % 3];
          if (t === 6) topTile = flowerVariants[(ix * 5 + iz * 11) % 2];

          // top face (CCW seen from above)
          quad(
            [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z]],
            [0, 1, 0], topTile
          );

          // side faces per step — vertex order: bottom-A, bottom-B, top-B, top-A (CCW from outside)
          const sides = [
            { dx: 1, dz: 0, n: [1, 0, 0], c: (yy0, yy1) => [[x + 1, yy0, z + 1], [x + 1, yy0, z], [x + 1, yy1, z], [x + 1, yy1, z + 1]] },
            { dx: -1, dz: 0, n: [-1, 0, 0], c: (yy0, yy1) => [[x, yy0, z], [x, yy0, z + 1], [x, yy1, z + 1], [x, yy1, z]] },
            { dx: 0, dz: 1, n: [0, 0, 1], c: (yy0, yy1) => [[x, yy0, z + 1], [x + 1, yy0, z + 1], [x + 1, yy1, z + 1], [x, yy1, z + 1]] },
            { dx: 0, dz: -1, n: [0, 0, -1], c: (yy0, yy1) => [[x + 1, yy0, z], [x, yy0, z], [x, yy1, z], [x + 1, yy1, z]] },
          ];
          for (const s of sides) {
            const nh = terrain.heightCell(ix + s.dx, iz + s.dz);
            if (nh >= h) continue;
            for (let k = h; k > nh; k--) {
              const y1 = k * BLOCK_H + BLOCK_H;
              const y0 = y1 - BLOCK_H;
              const tile = (k === h) ? SIDE_TILE[t] : (k <= WATER_LEVEL + 1 ? TILE.SHORE : TILE.DIRT_SIDE);
              quad(s.c(y0, y1), s.n, tile);
            }
          }
        }
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, material);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      group.add(mesh);
    }
  }
  return group;
}
