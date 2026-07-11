// Gathering nodes — the resource trees & rocks you CAN harvest look clearly
// different from scenery:
//  • Birch trees: pale bark with dark bands + golden-green canopy + sparkle
//  • Ore nodes: dark boulders shot through with glowing orange veins
// Interact (F) to chop/mine — 3 hits, drops pop out, node respawns later.
import * as THREE from 'three';
import { WATER_LEVEL } from './terrain.js';

const BIRCH_COUNT = 46;
const ORE_COUNT = 30;
const RESPAWN_S = 150;
const HITS = 3;

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

function buildBirch(seed) {
  const g = new THREE.Group();
  // pale banded trunk — unmistakably "the choppable one"
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.4, 6), lam('#e8e0d0'));
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.155 + (i % 2) * 0.02, 0.16 + (i % 2) * 0.02, 0.1, 6), lam('#4a4640'));
    band.position.y = 0.5 + i * 0.5 + (seed % 0.3);
    g.add(band);
  }
  // golden-green canopy (distinct from the deep green scenery trees)
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), lam('#a8c85a'));
  canopy.position.y = 2.7;
  canopy.scale.set(1.15, 0.95, 1.15);
  canopy.castShadow = true;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), lam('#c8dc6a'));
  crown.position.y = 3.35;
  g.add(canopy, crown);
  g.userData.body = trunk;
  return g;
}

function buildStump() {
  const g = new THREE.Group();
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 6), lam('#d8d0c0'));
  stump.position.y = 0.15;
  const rings = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.31, 6), lam('#b8a888'));
  rings.position.y = 0.155;
  g.add(stump, rings);
  return g;
}

function buildOreNode() {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), lam('#3e4246'));
  rock.position.y = 0.3;
  rock.scale.set(1.2, 0.85, 1.1);
  rock.castShadow = true;
  g.add(rock);
  // glowing veins — you can spot a mining node at night from far away
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xffa04a }));
    vein.position.set(Math.cos(a) * 0.32, 0.25 + (i % 2) * 0.18, Math.sin(a) * 0.3);
    vein.rotation.y = a;
    g.add(vein);
  }
  const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), lam('#4e5256'));
  chunk.position.set(0.5, 0.12, 0.25);
  g.add(chunk);
  g.userData.body = rock;
  return g;
}

export function createGathering(scene, terrain, decorBlocked, particles) {
  const nodes = [];

  function findSpot(minH, maxH, minSpawnDist) {
    for (let tries = 0; tries < 60; tries++) {
      const ix = 6 + Math.floor(Math.random() * (terrain.size - 12));
      const iz = 6 + Math.floor(Math.random() * (terrain.size - 12));
      const h = terrain.heightCell(ix, iz);
      if (h <= Math.max(WATER_LEVEL, minH - 1) || h < minH || h > maxH) continue;
      if (decorBlocked.has(`${ix},${iz}`)) continue;
      const x = ix - terrain.size / 2 + 0.5, z = iz - terrain.size / 2 + 0.5;
      if (Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z) < minSpawnDist) continue;
      return { x, z, y: terrain.surfaceY(x, z), ix, iz };
    }
    return null;
  }

  function spawnNode(kind) {
    const spot = kind === 'birch' ? findSpot(3, 7, 8) : findSpot(4, 10, 10);
    if (!spot) return;
    const mesh = kind === 'birch' ? buildBirch(Math.random()) : buildOreNode();
    mesh.position.set(spot.x, spot.y, spot.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    decorBlocked.add(`${spot.ix},${spot.iz}`);
    nodes.push({
      kind, mesh, spot, hits: HITS, respawnT: 0, depleted: false, stump: null,
      wobble: 0,
    });
  }

  for (let i = 0; i < BIRCH_COUNT; i++) spawnNode('birch');
  for (let i = 0; i < ORE_COUNT; i++) spawnNode('ore');

  // one player hit on a node; returns drops when it breaks, [] otherwise, null if depleted
  function hit(node) {
    if (node.depleted) return null;
    node.hits--;
    node.wobble = 0.25;
    const at = node.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    particles.burst(at, node.kind === 'birch' ? '#d8c8a8' : '#8a8e92', 8, 2.4);
    if (node.hits > 0) return [];

    // node breaks
    node.depleted = true;
    node.respawnT = RESPAWN_S;
    particles.burst(at, node.kind === 'birch' ? '#a8c85a' : '#ffa04a', 16, 3.2);
    particles.shockwave?.(node.mesh.position, node.kind === 'birch' ? '#a8c85a' : '#ffa04a', 1.6, 0.35);
    scene.remove(node.mesh);
    if (node.kind === 'birch') {
      node.stump = buildStump();
      node.stump.position.copy(node.mesh.position);
      scene.add(node.stump);
      const drops = [{ id: 'hardwood', count: 2 + Math.floor(Math.random() * 2) }];
      if (Math.random() < 0.3) drops.push({ id: 'wheat_seed', count: 1 });
      return drops;
    }
    const drops = [{ id: 'iron_ore', count: 1 + Math.floor(Math.random() * 2) }];
    if (Math.random() < 0.5) drops.push({ id: 'forge_stone', count: 1 });
    return drops;
  }

  function update(dt) {
    for (const n of nodes) {
      if (n.wobble > 0) {
        n.wobble -= dt;
        const target = n.depleted ? null : n.mesh;
        if (target) target.rotation.z = Math.sin(n.wobble * 40) * 0.06 * (n.wobble / 0.25);
      }
      if (n.depleted) {
        n.respawnT -= dt;
        if (n.respawnT <= 0) {
          if (n.stump) { scene.remove(n.stump); n.stump = null; }
          n.depleted = false;
          n.hits = HITS;
          n.mesh.rotation.z = 0;
          scene.add(n.mesh);
        }
      }
    }
  }

  function nearest(pos, radius) {
    let best = null, bd = radius * radius;
    for (const n of nodes) {
      if (n.depleted) continue;
      const d = (n.mesh.position.x - pos.x) ** 2 + (n.mesh.position.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  return { nodes, hit, update, nearest };
}
