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

// The sea starts where nx + nz crosses this — the south-east corner, diagonally
// opposite the winter biome. ~19% of the map is open water.
const OCEAN_EDGE = 1.34;

// Hand-placed archipelago (normalised map coords, cell radius, height above the
// waterline). Placed by hand rather than scattered so each island reads as a
// destination with its own silhouette, and so none of them merge.
// `seed` drives the coastline wobble and where the peak sits, so no two
// islands share a silhouette.
const ISLANDS = [
  { name: 'Palmspit',    kind: 'palm',    x: 0.795, z: 0.640, r: 9.5, h: 3.4, seed: 0.4 },
  { name: 'Coral Rest',  kind: 'palm',    x: 0.640, z: 0.845, r: 8.0, h: 2.8, seed: 2.1 },
  { name: 'Torii Rock',  kind: 'shrine',  x: 0.905, z: 0.795, r: 7.0, h: 4.4, seed: 3.9 },
  { name: 'Wreck Bar',   kind: 'wreck',   x: 0.700, z: 0.720, r: 6.5, h: 2.4, seed: 5.2 },
  { name: 'Lantern Cay', kind: 'lantern', x: 0.885, z: 0.590, r: 6.0, h: 2.8, seed: 1.3 },
  { name: 'Bone Reef',   kind: 'rock',    x: 0.760, z: 0.925, r: 6.5, h: 3.2, seed: 4.6 },
];

export class Terrain {
  constructor() {
    const S = WORLD_SIZE;
    this.size = S;
    this.height = new Int8Array(S * S);
    this.type = new Uint8Array(S * S); // 0 grass,1 path,2 dirt,3 stone,4 moss,5 shore,6 flowers,7 snow,8 plaza
    this.snow = new Uint8Array(S * S); // 1 = inside the winter biome (drives decor/weather/FX)
    this.ocean = new Uint8Array(S * S); // 1 = open sea (south-east, opposite the snow)
    this.island = new Uint8Array(S * S); // 1 = an island above the sea (tropical decor)
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
        // out-of-bounds cells normally contribute a tall wall so the world has
        // a rim — but a wall rising out of the sea would look like a bathtub,
        // so a corner that touches open water averages only its real cells
        let sum = 0, n = 0, oob = 0, sea = false;
        for (let dz = -1; dz <= 0; dz++) {
          for (let dx = -1; dx <= 0; dx++) {
            const cx = ix + dx, cz = iz + dz;
            if (cx < 0 || cz < 0 || cx >= S || cz >= S) { oob++; continue; }
            sum += this.height[this.idx(cx, cz)]; n++;
            if (this.ocean[this.idx(cx, cz)]) sea = true;
          }
        }
        if (!sea) { sum += oob * MAX_H * 0.8; n += oob; }
        this.corner[iz * (S + 1) + ix] = n ? sum / n : MAX_H * 0.8;
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

  // --- the sea ---------------------------------------------------------------
  isOceanCell(ix, iz) { return this.inBounds(ix, iz) && this.ocean[this.idx(ix, iz)] === 1; }
  inOcean(x, z) { const [ix, iz] = this.cellOf(x, z); return this.isOceanCell(ix, iz); }
  isIslandCell(ix, iz) { return this.inBounds(ix, iz) && this.island[this.idx(ix, iz)] === 1; }

  /** Any water you can actually get into — sea or lake, in bounds. */
  swimmable(x, z) {
    const [ix, iz] = this.cellOf(x, z);
    return this.inBounds(ix, iz) && this.heightCell(ix, iz) <= WATER_LEVEL;
  }

  /** Deep water: the sea floor is 2+ blocks under the surface. Drives the
   *  darker offshore tint and stops the jetski beaching itself in a puddle. */
  deepWater(x, z) {
    const [ix, iz] = this.cellOf(x, z);
    return this.inBounds(ix, iz) && this.heightCell(ix, iz) <= WATER_LEVEL - 1;
  }

  /** Nearest walkable cell centre, searched in widening rings — used to wash an
   *  exhausted swimmer ashore and to drop a rider off their craft. */
  nearestShore(x, z, maxR = 90) {
    const [cx, cz] = this.cellOf(x, z);
    for (let r = 1; r <= maxR; r++) {
      let best = null, bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // ring only
          const ix = cx + dx, iz = cz + dz;
          if (!this.inBounds(ix, iz)) continue;
          if (this.heightCell(ix, iz) <= WATER_LEVEL) continue;
          const wx = ix - this.size / 2 + 0.5, wz = iz - this.size / 2 + 0.5;
          if (this.surfaceY(wx, wz) < WATER_Y) continue;   // still under water
          const d = (wx - x) ** 2 + (wz - z) ** 2;
          if (d < bestD) { bestD = d; best = new THREE.Vector3(wx, this.surfaceY(wx, wz), wz); }
        }
      }
      if (best) return best;
    }
    return this.spawn.clone();
  }

  isSnowCell(ix, iz) { return this.inBounds(ix, iz) && this.snow[this.idx(ix, iz)] === 1; }
  inSnow(x, z) { const [ix, iz] = this.cellOf(x, z); return this.isSnowCell(ix, iz); }

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
        // THE SEA occupies the south-east corner, mirroring the snow biome in
        // the north-west. A wobbled diagonal coastline keeps it organic, and the
        // floor ramps down from a wadeable shelf at the beach to open water.
        const seaWave = (fbm2(nx * 5.5, nz * 5.5, SEED + 131, 3) - 0.5) * 0.2;
        const sea = nx + nz + seaWave - OCEAN_EDGE;
        if (sea > 0) {
          // The floor has to drop FAST. A gentle shelf sounds realistic but it
          // meant ~18 cells of ankle-deep water: you could wade forever and
          // never be deep enough to swim. This reaches real depth about two or
          // three cells past the sand, leaving a thin wading fringe.
          const depth = Math.min(1, sea / 0.03);            // 0 at the beach, 1 offshore
          e = Math.min(e, WATER_LEVEL + 0.45 - depth * 3.6);
          this.ocean[this.idx(ix, iz)] = 1;
        }

        // Islands rise back out of the sea. A plain radial dome reads as a
        // muffin — real islands have a wandering coastline, a spit or a bay, and
        // a peak that isn't dead centre. So the radius itself is warped by an
        // angular fBm, the dome is offset toward a per-island peak, and a second
        // noise breaks up the surface.
        for (const I of ISLANDS) {
          const dx = ix - I.x * S, dz = iz - I.z * S;
          const ang = Math.atan2(dz, dx);
          // wobble the outline: lobes and inlets instead of a circle
          const wob = 1
            + Math.sin(ang * 3 + I.seed) * 0.22
            + Math.sin(ang * 5 - I.seed * 1.7) * 0.12
            + (valueNoise2(Math.cos(ang) * 2 + I.seed, Math.sin(ang) * 2, SEED + 300) - 0.5) * 0.3;
          const R = I.r * wob;
          // the peak sits off-centre, so one side is a cliff and the other a beach
          const pdx = dx - Math.cos(I.seed) * I.r * 0.22;
          const pdz = dz - Math.sin(I.seed) * I.r * 0.22;
          const d = Math.hypot(pdx, pdz);
          if (d > R) continue;
          const t = Math.cos((d / R) * Math.PI * 0.5);
          const lump = (valueNoise2(ix * 0.3, iz * 0.3, SEED + 200 + I.r) - 0.3) * 1.6;
          e = Math.max(e, WATER_LEVEL - 0.3 + t * t * (I.h + lump));
        }

        const edge = Math.min(ix, iz, S - 1 - ix, S - 1 - iz);
        // the rim wall is LAND only — a hill rising out of the sea would look
        // like a bathtub, so the ocean just runs to the map bound instead
        if (edge < 6 && sea <= 0) e += (6 - edge) * 1.1;

        let h = Math.max(0, Math.min(MAX_H, Math.round(e)));
        this.height[this.idx(ix, iz)] = h;
        if (h > WATER_LEVEL && this.ocean[this.idx(ix, iz)]) {
          this.island[this.idx(ix, iz)] = 1;   // dry land inside the sea
          this.ocean[this.idx(ix, iz)] = 0;
        }
      }
    }

    // island world-space records for the map, spawns and decor
    this.islands = ISLANDS.map((I) => {
      const wx = I.x * S - S / 2 + 0.5, wz = I.z * S - S / 2 + 0.5;
      const [cx, cz] = this.cellOf(wx, wz);
      return { name: I.name, kind: I.kind, x: wx, z: wz, r: I.r, y: this.heightCell(cx, cz) * BLOCK_H + BLOCK_H };
    });

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

    // WINTER BIOME — the far north-west corner is blanketed in snow. A wavy
    // fBm boundary keeps the treeline organic; paths stay visible so roads
    // still read, water stays water. Everything else turns snowy.
    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        const nx = ix / S, nz = iz / S;
        const wave = (fbm2(nx * 6, nz * 6, SEED + 77, 3) - 0.5) * 0.18;
        if (nx + nz + wave >= 0.66) continue;
        const i = this.idx(ix, iz);
        this.snow[i] = 1;
        const t = this.type[i];
        if (t === 1 || t === 5) continue; // roads & shoreline keep their tile
        this.type[i] = 7;
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

    // the town centre is PAVED — warm terracotta plaza tiles instead of dirt,
    // with a wobbled edge so the paving melts organically into the grass
    const PR = 7.5;
    for (let dz = -9; dz <= 9; dz++) {
      for (let dx = -9; dx <= 9; dx++) {
        const ix = sx + dx, iz = sz + dz;
        if (!this.inBounds(ix, iz)) continue;
        const i = this.idx(ix, iz);
        if (this.height[i] <= WATER_LEVEL) continue;
        const wobble = valueNoise2(ix * 0.6, iz * 0.6, SEED + 91) * 1.6;
        if (Math.hypot(dx, dz) > PR + wobble - 0.8) continue;
        this.type[i] = 8;
      }
    }
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

const TOP_TILE = [TILE.GRASS_A, TILE.PATH, TILE.DIRT, TILE.STONE, TILE.MOSS, TILE.SHORE, TILE.FLOWER_A, TILE.SNOW, TILE.PLAZA];

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
          else if (steep > BLOCK_H * 1.5 && t !== 7) tile = TILE.DIRT_SIDE;

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
