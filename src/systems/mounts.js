// Mounts — cute rideable critters earned from villager quests. The mount mesh
// attaches under the player; the player sits on top and rides faster.
import * as THREE from 'three';
import { makeCritterFaceTexture } from '../gfx/textures.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }); }

export const MOUNT_DEFS = {
  trotter: {
    name: 'Trotter', item: 'mount_trotter', color: '#b0704a',
    desc: 'A round, huffy little boar-pony. Unstoppable at snack time.',
    speedMult: 1.5, jumpMult: 1.1, seatH: 0.62,
  },
  clucky: {
    name: 'Clucky', item: 'mount_clucky', color: '#f0e8d0',
    desc: 'A giant hen with springy legs. Jumps like she means it.',
    speedMult: 1.55, jumpMult: 1.45, seatH: 0.66,
  },
  shellsworth: {
    name: 'Shellsworth', item: 'mount_shellsworth', color: '#6aa86a',
    desc: 'A dignified great-turtle. Slower gallop, but you feel invincible.',
    speedMult: 1.35, jumpMult: 1.0, seatH: 0.58, armor: 0.15,
  },
  nimbus: {
    name: 'Nimbus', item: 'mount_nimbus', color: '#b8d0f0',
    desc: 'A cloud-cat that drifts above the grass. The dream mount.',
    speedMult: 1.8, jumpMult: 1.3, seatH: 0.7, floats: true,
  },
};

const faceCache = new Map();
function mountFace(key, opts) {
  if (!faceCache.has(key)) faceCache.set(key, makeCritterFaceTexture(opts));
  return faceCache.get(key);
}

function addFace(parent, key, opts, w, h, x, y, z) {
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: mountFace(key, opts), transparent: true }));
  face.position.set(x, y, z);
  parent.add(face);
}

const BUILDERS = {
  trotter() {
    const g = new THREE.Group();
    const fur = lam('#b0704a');
    const furDark = lam('#8a5638');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.85), fur);
    body.position.y = 0.42;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.32), fur);
    head.position.set(0, 0.56, 0.5);
    addFace(head, 'trotter', { eyeW: 3, eyeH: 4, gap: 6, eyeY: 1, mouth: 'none' }, 0.4, 0.3, 0, 0.05, 0.17);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.09), lam('#d89aa0'));
    snout.position.set(0, -0.06, 0.19); head.add(snout);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.5), furDark);
    mane.position.set(0, 0.66, 0.06);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), furDark);
      ear.position.set(sx * 0.15, 0.24, -0.04); head.add(ear);
    }
    // saddle
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.34), lam('#a83a34'));
    saddle.position.y = 0.66;
    const saddleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.36), lam('#c8a03a'));
    saddleTrim.position.y = 0.62;
    const legs = [];
    for (const [dx, dz] of [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), furDark);
      leg.position.set(dx, 0.15, dz);
      g.add(leg); legs.push(leg);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), furDark);
    tail.position.set(0, 0.5, -0.46); tail.rotation.x = -0.5;
    g.add(body, head, mane, saddle, saddleTrim, tail);
    g.userData.legs = legs;
    return g;
  },
  clucky() {
    const g = new THREE.Group();
    const feather = lam('#f0e8d0');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.75), feather);
    body.position.y = 0.5;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.3), feather);
    head.position.set(0, 0.86, 0.42);
    addFace(head, 'clucky', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'none' }, 0.34, 0.26, 0, 0.03, 0.16);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), lam('#f0a83d'));
    beak.position.set(0, -0.04, 0.2); head.add(beak);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), lam('#d84040'));
    comb.position.set(0, 0.24, 0); head.add(comb);
    const wattle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), lam('#d84040'));
    wattle.position.set(0, -0.14, 0.16); head.add(wattle);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.5), lam('#e0d4b8'));
      wing.position.set(sx * 0.34, 0.5, -0.02);
      g.add(wing);
    }
    const tailF = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), lam('#e0d4b8'));
    tailF.position.set(0, 0.66, -0.4); tailF.rotation.x = 0.5;
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.32), lam('#3f6fb0'));
    saddle.position.y = 0.76;
    const legs = [];
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), lam('#e8a33d'));
      leg.position.set(sx * 0.15, 0.15, 0.05);
      g.add(leg); legs.push(leg);
    }
    g.add(body, head, tailF, saddle);
    g.userData.legs = legs;
    return g;
  },
  shellsworth() {
    const g = new THREE.Group();
    const skin = lam('#8ac86a');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), skin);
    body.position.y = 0.3;
    body.castShadow = true;
    // big dome shell with plates
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), lam('#5a8a52'));
    shell.position.y = 0.52;
    shell.scale.set(1, 0.68, 1.15);
    shell.castShadow = true;
    for (const [dx, dz] of [[0, 0], [-0.18, 0.15], [0.18, 0.15], [0, -0.22]]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), lam('#c8b464'));
      plate.position.set(dx, 0.74, dz);
      g.add(plate);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.26), skin);
    head.position.set(0, 0.42, 0.56);
    addFace(head, 'shellsworth', { eyeW: 3, eyeH: 4, gap: 4, eyeY: 2, mouth: 'smile' }, 0.28, 0.22, 0, 0.02, 0.14);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.3), lam('#a83a34'));
    saddle.position.y = 0.78;
    const legs = [];
    for (const [dx, dz] of [[-0.26, 0.26], [0.26, 0.26], [-0.26, -0.26], [0.26, -0.26]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), skin);
      leg.position.set(dx, 0.12, dz);
      g.add(leg); legs.push(leg);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), skin);
    tail.position.set(0, 0.3, -0.46);
    g.add(body, shell, head, saddle, tail);
    g.userData.legs = legs;
    return g;
  },
  nimbus() {
    const g = new THREE.Group();
    const fur = lam('#b8d0f0');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.8), fur);
    body.position.y = 0.5;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.3), fur);
    head.position.set(0, 0.68, 0.48);
    addFace(head, 'nimbus', { eyeW: 3, eyeH: 4, gap: 5, eyeY: 2, mouth: 'w', cheeks: 'rgba(240,150,170,0.5)' }, 0.34, 0.26, 0, 0.02, 0.16);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.06), fur);
      ear.position.set(sx * 0.13, 0.22, 0); head.add(ear);
    }
    // cloud puffs instead of legs
    const puffs = [];
    for (const [dx, dz, s] of [[-0.16, 0.25, 0.2], [0.16, 0.25, 0.19], [-0.16, -0.2, 0.21], [0.16, -0.2, 0.2], [0, 0.02, 0.24]]) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0),
        new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      puff.position.set(dx, 0.22, dz);
      g.add(puff); puffs.push(puff);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.34), fur);
    tail.position.set(0, 0.62, -0.5); tail.rotation.x = 0.4;
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.3), lam('#6a4a8a'));
    saddle.position.y = 0.7;
    const glow = new THREE.PointLight(0xb8d0f0, 0.7, 3.5, 2);
    glow.position.y = 0.4;
    g.add(body, head, tail, saddle, glow);
    g.userData.puffs = puffs;
    g.userData.legs = [];
    return g;
  },
};

export function createMounts(particles) {
  const state = { active: null, mesh: null, anim: 0 };

  function summon(mountId, player) {
    dismiss(player);
    const def = MOUNT_DEFS[mountId];
    if (!def) return false;
    state.active = mountId;
    state.mesh = BUILDERS[mountId]();
    player.state.group.add(state.mesh);
    player.setMountState({
      speedMult: def.speedMult, jumpMult: def.jumpMult, seatH: def.seatH,
    });
    if (def.armor) player.addBuff({ id: 'mountarmor', t: 1e9, armor: def.armor });
    particles.fountain(player.state.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), def.color, 14);
    return true;
  }

  function dismiss(player) {
    if (state.mesh) {
      player.state.group.remove(state.mesh);
      particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffffff', 8, 1.5);
    }
    player.state.buffs = player.state.buffs.filter((b) => b.id !== 'mountarmor');
    state.active = null;
    state.mesh = null;
    player.setMountState(null);
  }

  function update(dt, player, terrain) {
    if (!state.mesh) return;
    state.anim += dt;
    const def = MOUNT_DEFS[state.active];
    const moving = player.state.isMoving;

    // gallop: legs scissor while moving
    const legs = state.mesh.userData.legs || [];
    legs.forEach((leg, i) => {
      leg.rotation.x = moving ? Math.sin(state.anim * 12 + (i % 2) * Math.PI) * 0.7 : 0;
    });
    // cloud mounts bob & pulse
    if (def.floats) {
      state.mesh.position.y = 0.12 + Math.sin(state.anim * 2.2) * 0.06;
      const puffs = state.mesh.userData.puffs || [];
      puffs.forEach((p, i) => {
        p.scale.setScalar(1 + Math.sin(state.anim * 3 + i) * 0.08);
      });
    }
    // dust trail while galloping
    if (moving && !def.floats && Math.random() < dt * 8 && player.state.grounded) {
      particles.burst(player.state.pos.clone().add(new THREE.Vector3(0, 0.08, 0)), '#c8b494', 2, 1.4, 5, 0.35);
    }
  }

  function serialize() { return { active: state.active }; }

  return { state, MOUNT_DEFS, summon, dismiss, update, serialize };
}
