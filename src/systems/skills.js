// Skill per class: definisi + runtime (cooldown, buff, eksekusi efek).
import * as THREE from 'three';

export const SKILLS = {
  // --- Ksatria ---
  bash: {
    name: 'Bash', cd: 5, cost: 16,
    desc: 'Hantaman berat 250% damage + stun 1.2 detik.',
    icon: { shape: 'burst', color: '#e8a33d' },
  },
  whirlwind: {
    name: 'Whirlwind', cd: 8, cost: 24,
    desc: 'Putaran pedang 360°, 170% damage + dorong semua musuh sekitar.',
    icon: { shape: 'spiral', color: '#c76b4a' },
  },
  warcry: {
    name: 'War Cry', cd: 14, cost: 20,
    desc: '+35% damage selama 7 detik dan menggetarkan musuh terdekat.',
    icon: { shape: 'shout', color: '#e8574a' },
  },
  // --- Pemanah ---
  powershot: {
    name: 'Power Shot', cd: 6, cost: 18,
    desc: 'Panah menembus semua musuh dalam garis lurus, 300% damage.',
    icon: { shape: 'arrow', color: '#9fe86e' },
  },
  multishot: {
    name: 'Multishot', cd: 9, cost: 24,
    desc: 'Tembakan kipas 5 panah sekaligus, masing-masing 130% damage.',
    icon: { shape: 'fan', color: '#6fa05a' },
  },
  swiftness: {
    name: 'Swiftness', cd: 12, cost: 15,
    desc: '+40% kecepatan gerak & serang selama 5 detik.',
    icon: { shape: 'wind', color: '#a8d8b8' },
  },
  // --- Penyihir ---
  fireball: {
    name: 'Fireball', cd: 7, cost: 24,
    desc: 'Bola api meledak dalam area luas, 280% damage.',
    icon: { shape: 'orb', color: '#ff7722' },
  },
  icenova: {
    name: 'Ice Nova', cd: 10, cost: 26,
    desc: 'Ledakan es di sekeliling: 160% damage + bekukan 2 detik.',
    icon: { shape: 'star', color: '#8fd8f0' },
  },
  blink: {
    name: 'Blink', cd: 8, cost: 14,
    desc: 'Teleportasi sejauh 6 meter ke arah kursor.',
    icon: { shape: 'blink', color: '#b89af0' },
  },
  // --- Pembunuh ---
  dashstrike: {
    name: 'Dash Strike', cd: 6, cost: 18,
    desc: 'Melesat menembus musuh sejauh 5 meter, 220% damage.',
    icon: { shape: 'slash', color: '#c8d8e8' },
  },
  fanknives: {
    name: 'Fan of Knives', cd: 9, cost: 24,
    desc: 'Lempar 8 pisau ke segala arah, 140% damage.',
    icon: { shape: 'knives', color: '#8a9ab0' },
  },
  shadowstep: {
    name: 'Shadow Step', cd: 10, cost: 16,
    desc: 'Muncul di belakang musuh terdekat; serangan berikutnya pasti kritikal.',
    icon: { shape: 'shadow', color: '#5a5a7a' },
  },
};

// deps: { player, enemyMgr, projectiles, particles, dmgNums, audio, terrain, aimPoint() }
export function createSkillSystem(deps) {
  const cooldowns = {}; // id -> sisa detik

  function ready(id) { return (cooldowns[id] || 0) <= 0; }
  function cdFrac(id) { return Math.max(0, (cooldowns[id] || 0)) / SKILLS[id].cd; }

  function damageOf(mult, crit = false) {
    const p = deps.player.state;
    const w = deps.weaponDef();
    const base = w.dmg * p.dmgMult * mult * deps.forgeMult();
    const isCrit = crit || Math.random() < 0.12;
    return {
      dmg: Math.max(1, Math.round(base * (isCrit ? 1.6 : 1) * (0.9 + Math.random() * 0.2))),
      crit: isCrit,
    };
  }

  function hitEnemy(e, mult, opts = {}) {
    const { dmg, crit } = damageOf(mult, opts.crit);
    deps.dmgNums.spawn(e.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)), dmg, crit ? 'crit' : '');
    deps.enemyMgr.damage(e, dmg, deps.player.state.pos, deps.onKill);
    if (opts.stun) e.stunT = Math.max(e.stunT || 0, opts.stun);
    if (opts.freeze) e.frozenT = Math.max(e.frozenT || 0, opts.freeze);
  }

  function enemiesWithin(r, fromPos = deps.player.state.pos) {
    return deps.enemyMgr.enemies.filter((e) => {
      if (e.dead) return false;
      const d = Math.hypot(e.mesh.position.x - fromPos.x, e.mesh.position.z - fromPos.z);
      return d <= r;
    });
  }

  const FX = {
    bash() {
      const p = deps.player.state;
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      const at = p.pos.clone().add(dir.multiplyScalar(1.4));
      deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.6, 0)), '#e8a33d', 16, 3.4);
      deps.audio.sfx('bash');
      for (const e of enemiesWithin(2.4, at)) hitEnemy(e, 2.5, { stun: 1.2 });
      deps.player.playSwing(1.4);
    },
    whirlwind() {
      const p = deps.player.state;
      deps.particles.ring?.(p.pos, '#c76b4a');
      deps.audio.sfx('whirl');
      for (const e of enemiesWithin(3.0)) {
        hitEnemy(e, 1.7);
        const dx = e.mesh.position.x - p.pos.x, dz = e.mesh.position.z - p.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        e.knock.set((dx / l) * 11, (dz / l) * 11);
      }
      deps.player.playSpin();
    },
    warcry() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'warcry', t: 7, dmg: 0.35 });
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#e8574a', 20);
      deps.audio.sfx('warcry');
      for (const e of enemiesWithin(4.5)) e.stunT = Math.max(e.stunT || 0, 0.6);
    },
    powershot() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('powershot');
      deps.projectiles.spawn({
        pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
        dir: facingDir(), speed: 30, range: 22, radius: 0.8,
        kind: 'arrow', color: '#d8f0a0', scale: 1.6, pierce: true,
        onHitEnemy: (e) => hitEnemy(e, 3.0),
      });
      deps.player.playBowDraw();
    },
    multishot() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('multishot');
      for (let i = -2; i <= 2; i++) {
        const a = p.facing + i * 0.16;
        deps.projectiles.spawn({
          pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
          dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), speed: 22, range: 15, radius: 0.55,
          kind: 'arrow', color: '#c3d4e2',
          onHitEnemy: (e) => hitEnemy(e, 1.3),
        });
      }
      deps.player.playBowDraw();
    },
    swiftness() {
      deps.player.addBuff({ id: 'swiftness', t: 5, speed: 0.4, atkSpeed: 0.4 });
      deps.particles.fountain(deps.player.state.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#a8d8b8', 14);
      deps.audio.sfx('swiftness');
    },
    fireball() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('fireball');
      deps.projectiles.spawn({
        pos: p.pos.clone().add(new THREE.Vector3(0, 0.85, 0)),
        dir: facingDir(), speed: 12, range: 15, radius: 0.7,
        kind: 'orb', color: '#ff7722', scale: 1.5, trail: '#ff9944',
        onHitEnemy: (e) => explode(e.mesh.position, 2.6, 2.8),
        onExpire: (pos) => explode(pos, 2.6, 2.8),
      });
      deps.player.playStaffCast();
    },
    icenova() {
      const p = deps.player.state;
      deps.audio.sfx('icenova');
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#8fd8f0', 30, 4.5, 3);
      for (const e of enemiesWithin(3.2)) hitEnemy(e, 1.6, { freeze: 2 });
      deps.player.playStaffCast();
    },
    blink() {
      const p = deps.player.state;
      const target = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(6));
      const dir = target.clone().sub(p.pos); dir.y = 0;
      const dist = Math.min(6, dir.length());
      dir.normalize();
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#b89af0', 14, 2.5);
      // cari titik walkable terjauh di sepanjang garis
      for (let d = dist; d > 0.5; d -= 0.5) {
        const nx = p.pos.x + dir.x * d, nz = p.pos.z + dir.z * d;
        if (deps.terrain.walkable(nx, nz, deps.terrain.surfaceY(nx, nz))) {
          p.pos.x = nx; p.pos.z = nz;
          p.pos.y = deps.terrain.surfaceY(nx, nz);
          break;
        }
      }
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#b89af0', 18, 2.5);
      deps.audio.sfx('blink');
    },
    dashstrike() {
      const p = deps.player.state;
      aimAtCursor();
      const dir = facingDir();
      deps.audio.sfx('dash');
      const hitSet = new Set();
      for (let d = 0.5; d <= 5; d += 0.5) {
        const nx = p.pos.x + dir.x * d, nz = p.pos.z + dir.z * d;
        for (const e of enemiesWithin(1.2, new THREE.Vector3(nx, 0, nz))) {
          if (!hitSet.has(e)) { hitSet.add(e); hitEnemy(e, 2.2); }
        }
        if (!deps.terrain.walkable(nx, nz, deps.terrain.surfaceY(nx, nz))) break;
        p.pos.x = nx; p.pos.z = nz;
      }
      p.pos.y = deps.terrain.surfaceY(p.pos.x, p.pos.z);
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#c8d8e8', 12, 3);
      deps.player.playSwing(1.1);
    },
    fanknives() {
      const p = deps.player.state;
      deps.audio.sfx('fanknives');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        deps.projectiles.spawn({
          pos: p.pos.clone().add(new THREE.Vector3(0, 0.7, 0)),
          dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), speed: 16, range: 7, radius: 0.5,
          kind: 'knife', color: '#c8d8e8',
          onHitEnemy: (e) => hitEnemy(e, 1.4),
        });
      }
      deps.player.playSpin();
    },
    shadowstep() {
      const p = deps.player.state;
      let nearest = null, best = 7 * 7;
      for (const e of deps.enemyMgr.enemies) {
        if (e.dead) continue;
        const d = (e.mesh.position.x - p.pos.x) ** 2 + (e.mesh.position.z - p.pos.z) ** 2;
        if (d < best) { best = d; nearest = e; }
      }
      deps.audio.sfx('blink');
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#5a5a7a', 12, 2);
      if (nearest) {
        const behind = nearest.mesh.position.clone()
          .add(new THREE.Vector3(Math.sin(nearest.mesh.rotation.y + Math.PI), 0, Math.cos(nearest.mesh.rotation.y + Math.PI)).multiplyScalar(1.0));
        if (deps.terrain.walkable(behind.x, behind.z, deps.terrain.surfaceY(behind.x, behind.z))) {
          p.pos.x = behind.x; p.pos.z = behind.z;
          p.pos.y = deps.terrain.surfaceY(behind.x, behind.z);
        }
        const dx = nearest.mesh.position.x - p.pos.x, dz = nearest.mesh.position.z - p.pos.z;
        p.facing = Math.atan2(dx, dz);
        deps.player.addBuff({ id: 'shadowstep', t: 4, guaranteedCrit: true });
      }
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#8a7ad0', 14, 2);
    },
  };

  function explode(pos, radius, mult) {
    deps.particles.burst(pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ff7722', 26, 5, 4);
    deps.particles.burst(pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#ffdd55', 14, 3.5, 2);
    deps.audio.sfx('explosion');
    for (const e of enemiesWithin(radius, pos)) hitEnemy(e, mult);
  }

  function facingDir() {
    const f = deps.player.state.facing;
    return new THREE.Vector3(Math.sin(f), 0, Math.cos(f));
  }

  function aimAtCursor() {
    const target = deps.aimPoint();
    if (!target) return;
    const p = deps.player.state;
    const dx = target.x - p.pos.x, dz = target.z - p.pos.z;
    if (dx * dx + dz * dz > 0.04) p.facing = Math.atan2(dx, dz);
  }

  function cast(id) {
    const p = deps.player.state;
    const def = SKILLS[id];
    if (!def || !ready(id) || p.dead || p.rolling > 0) return false;
    if (p.stamina < def.cost) { deps.audio.sfx('deny'); return false; }
    p.stamina -= def.cost;
    cooldowns[id] = def.cd;
    FX[id]();
    return true;
  }

  function update(dt) {
    for (const k of Object.keys(cooldowns)) {
      if (cooldowns[k] > 0) cooldowns[k] -= dt;
    }
  }

  return { cast, update, ready, cdFrac, SKILLS };
}
