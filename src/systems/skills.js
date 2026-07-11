// Per-class skills: definitions + runtime (cooldowns, buffs, effect execution).
import * as THREE from 'three';

export const SKILLS = {
  // --- Knight ---
  bash: {
    name: 'Bash', cd: 5, cost: 16,
    desc: 'Heavy smash for 250% damage + 1.2s stun.',
    icon: { shape: 'burst', color: '#e8a33d' },
  },
  whirlwind: {
    name: 'Whirlwind', cd: 8, cost: 24,
    desc: '360° blade spin, 170% damage + knocks everything back.',
    icon: { shape: 'spiral', color: '#c76b4a' },
  },
  warcry: {
    name: 'War Cry', cd: 14, cost: 20,
    desc: '+35% damage for 7s and rattles nearby enemies.',
    icon: { shape: 'shout', color: '#e8574a' },
  },
  // --- Archer ---
  powershot: {
    name: 'Power Shot', cd: 6, cost: 18,
    desc: 'Piercing arrow through every enemy in a line, 300% damage.',
    icon: { shape: 'arrow', color: '#9fe86e' },
  },
  multishot: {
    name: 'Multishot', cd: 9, cost: 24,
    desc: 'Fan of 5 arrows at once, 130% damage each.',
    icon: { shape: 'fan', color: '#6fa05a' },
  },
  swiftness: {
    name: 'Swiftness', cd: 12, cost: 15,
    desc: '+40% move & attack speed for 5s.',
    icon: { shape: 'wind', color: '#a8d8b8' },
  },
  // --- Mage ---
  fireball: {
    name: 'Fireball', cd: 7, cost: 24,
    desc: 'Fireball that explodes in a wide area, 280% damage.',
    icon: { shape: 'orb', color: '#ff7722' },
  },
  icenova: {
    name: 'Ice Nova', cd: 10, cost: 26,
    desc: 'Frost burst around you: 160% damage + 2s freeze.',
    icon: { shape: 'star', color: '#8fd8f0' },
  },
  blink: {
    name: 'Blink', cd: 8, cost: 14,
    desc: 'Teleport 6 meters toward the cursor.',
    icon: { shape: 'blink', color: '#b89af0' },
  },
  // --- Assassin ---
  dashstrike: {
    name: 'Dash Strike', cd: 6, cost: 18,
    desc: 'Dash 5 meters through enemies, 220% damage.',
    icon: { shape: 'slash', color: '#c8d8e8' },
  },
  fanknives: {
    name: 'Fan of Knives', cd: 9, cost: 24,
    desc: 'Throw 8 knives in every direction, 140% damage.',
    icon: { shape: 'knives', color: '#8a9ab0' },
  },
  shadowstep: {
    name: 'Shadow Step', cd: 10, cost: 16,
    desc: 'Appear behind the nearest enemy; next hit is a guaranteed crit.',
    icon: { shape: 'shadow', color: '#5a5a7a' },
  },
};

export const MAX_SKILL_LEVEL = 5;
const LVL_DMG = 0.22;   // +22% skill power per level
const LVL_CD = 0.06;    // -6% cooldown per level
const LVL_DUR = 0.15;   // +15% buff duration per level

// deps: { player, enemyMgr, projectiles, particles, dmgNums, audio, terrain, aimPoint(), shake() }
export function createSkillSystem(deps) {
  const cooldowns = {}; // id -> seconds remaining
  const levels = {};    // id -> skill level (1..MAX_SKILL_LEVEL)
  let castLvl = 1;      // level of the skill currently executing (for FX scaling)

  function levelOf(id) { return levels[id] || 1; }
  function upgrade(id) {
    if (levelOf(id) >= MAX_SKILL_LEVEL) return false;
    levels[id] = levelOf(id) + 1;
    return true;
  }
  function effCd(id) { return SKILLS[id].cd * (1 - LVL_CD * (levelOf(id) - 1)); }
  function durMult() { return 1 + LVL_DUR * (castLvl - 1); }

  function ready(id) { return (cooldowns[id] || 0) <= 0; }
  function cdFrac(id) { return Math.max(0, (cooldowns[id] || 0)) / effCd(id); }

  function damageOf(mult, crit = false) {
    const p = deps.player.state;
    const w = deps.weaponDef();
    const lvlMult = 1 + LVL_DMG * (castLvl - 1);
    const base = w.dmg * p.dmgMult * mult * lvlMult * deps.forgeMult();
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
      deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.6, 0)), '#e8a33d', 20, 3.8);
      deps.particles.shockwave(at, '#e8a33d', 2.6, 0.35);
      deps.particles.flash(at, '#ffb055', 7, 0.25);
      deps.audio.sfx('bash');
      deps.shake?.(0.35);
      for (const e of enemiesWithin(2.4, at)) hitEnemy(e, 2.5, { stun: 1.2 });
      deps.player.playSwing(1.4);
    },
    whirlwind() {
      const p = deps.player.state;
      deps.particles.ring?.(p.pos, '#c76b4a');
      deps.particles.shockwave(p.pos, '#e08a5a', 3.4, 0.45);
      deps.audio.sfx('whirl');
      deps.shake?.(0.3);
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
      deps.player.addBuff({ id: 'warcry', t: 7 * durMult(), dmg: 0.35 + 0.04 * (castLvl - 1) });
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#e8574a', 24);
      deps.particles.shockwave(p.pos, '#e8574a', 4.5, 0.5);
      deps.particles.flash(p.pos, '#e8574a', 6, 0.4);
      deps.audio.sfx('warcry');
      deps.shake?.(0.25);
      for (const e of enemiesWithin(4.5)) e.stunT = Math.max(e.stunT || 0, 0.6);
    },
    powershot() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('powershot');
      deps.particles.flash(p.pos, '#d8f0a0', 4, 0.2);
      deps.projectiles.spawn({
        pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
        dir: facingDir(), speed: 30, range: 22, radius: 0.8,
        kind: 'arrow', color: '#d8f0a0', scale: 1.6, pierce: true, trail: '#d8f0a0',
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
      deps.player.addBuff({ id: 'swiftness', t: 5 * durMult(), speed: 0.4, atkSpeed: 0.4 });
      deps.particles.fountain(deps.player.state.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#a8d8b8', 16);
      deps.particles.shockwave(deps.player.state.pos, '#a8d8b8', 2, 0.35);
      deps.audio.sfx('swiftness');
    },
    fireball() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('fireball');
      deps.particles.flash(p.pos, '#ff9944', 5, 0.25);
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
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#8fd8f0', 34, 5, 3);
      deps.particles.shockwave(p.pos, '#8fd8f0', 3.6, 0.5);
      deps.particles.flash(p.pos, '#aee0f0', 6, 0.35);
      deps.shake?.(0.25);
      for (const e of enemiesWithin(3.2)) hitEnemy(e, 1.6, { freeze: 2 });
      deps.player.playStaffCast();
    },
    blink() {
      const p = deps.player.state;
      const target = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(6));
      const dir = target.clone().sub(p.pos); dir.y = 0;
      const maxDist = 6 + (castLvl - 1) * 0.8; // blink reaches farther per level
      const dist = Math.min(maxDist, dir.length());
      dir.normalize();
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#b89af0', 16, 2.5);
      deps.particles.shockwave(p.pos, '#b89af0', 1.6, 0.3);
      // find the farthest walkable point along the line
      for (let d = dist; d > 0.5; d -= 0.5) {
        const nx = p.pos.x + dir.x * d, nz = p.pos.z + dir.z * d;
        if (deps.terrain.walkable(nx, nz, deps.terrain.surfaceY(nx, nz))) {
          p.pos.x = nx; p.pos.z = nz;
          p.pos.y = deps.terrain.surfaceY(nx, nz);
          break;
        }
      }
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#b89af0', 20, 2.5);
      deps.particles.flash(p.pos, '#b89af0', 5, 0.3);
      deps.audio.sfx('blink');
    },
    dashstrike() {
      const p = deps.player.state;
      aimAtCursor();
      const dir = facingDir();
      deps.audio.sfx('dash');
      const hitSet = new Set();
      const from = p.pos.clone();
      for (let d = 0.5; d <= 5; d += 0.5) {
        const nx = p.pos.x + dir.x * d, nz = p.pos.z + dir.z * d;
        for (const e of enemiesWithin(1.2, new THREE.Vector3(nx, 0, nz))) {
          if (!hitSet.has(e)) { hitSet.add(e); hitEnemy(e, 2.2); }
        }
        if (!deps.terrain.walkable(nx, nz, deps.terrain.surfaceY(nx, nz))) break;
        p.pos.x = nx; p.pos.z = nz;
      }
      p.pos.y = deps.terrain.surfaceY(p.pos.x, p.pos.z);
      // afterimage streak along the dash
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        deps.particles.burst(new THREE.Vector3(
          from.x + (p.pos.x - from.x) * t, from.y + 0.4, from.z + (p.pos.z - from.z) * t,
        ), '#c8d8e8', 4, 1.6, 2, 0.35);
      }
      deps.particles.shockwave(p.pos, '#c8d8e8', 1.8, 0.3);
      deps.shake?.(0.2);
      deps.player.playSwing(1.1);
    },
    fanknives() {
      const p = deps.player.state;
      deps.audio.sfx('fanknives');
      deps.particles.shockwave(p.pos, '#8a9ab0', 2.2, 0.35);
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
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#5a5a7a', 14, 2);
      deps.particles.shockwave(p.pos, '#5a5a7a', 1.4, 0.3);
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
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#8a7ad0', 16, 2);
      deps.particles.flash(p.pos, '#8a7ad0', 4, 0.25);
    },
  };

  function explode(pos, radius, mult) {
    deps.particles.burst(pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ff7722', 30, 5.5, 4);
    deps.particles.burst(pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#ffdd55', 16, 3.8, 2);
    deps.particles.shockwave(pos, '#ff9944', radius + 0.6, 0.45);
    deps.particles.flash(pos, '#ff9944', 8, 0.35);
    deps.audio.sfx('explosion');
    deps.shake?.(0.4);
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
    if (!def || !ready(id) || p.dead || p.rolling > 0 || p.busy) return false;
    if (p.stamina < def.cost) { deps.audio.sfx('deny'); return false; }
    p.stamina -= def.cost;
    castLvl = levelOf(id);
    cooldowns[id] = effCd(id);
    FX[id]();
    return true;
  }

  function update(dt) {
    for (const k of Object.keys(cooldowns)) {
      if (cooldowns[k] > 0) cooldowns[k] -= dt;
    }
  }

  function serialize() { return { levels: { ...levels } }; }
  function load(data) {
    if (data?.levels) Object.assign(levels, data.levels);
  }

  return { cast, update, ready, cdFrac, levelOf, upgrade, effCd, serialize, load, SKILLS };
}
