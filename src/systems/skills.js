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
  // --- Fighter ---
  // All three are built round the same idea: a Fighter has no reach and no
  // ranged option, so every ability either closes a gap, punishes standing in
  // one place, or buys the seconds it takes to survive being there.
  flurry: {
    name: 'Flurry', cd: 6, cost: 20,
    desc: 'Six punches in under a second, 90% each, on everything in front of you.',
    icon: { shape: 'burst', color: '#e8b45a' },
  },
  risingknee: {
    name: 'Rising Knee', cd: 8, cost: 22,
    desc: 'Dash to the nearest enemy and launch it: 260% damage and a hard knock-up.',
    icon: { shape: 'bolt', color: '#f0a850' },
  },
  ironbody: {
    name: 'Iron Body', cd: 18, cost: 24,
    desc: 'Brace for 6s: incoming damage halved, and you cannot be knocked back.',
    icon: { shape: 'shield', color: '#c8a05a' },
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
  // --- Berserker ---
  rage: {
    name: 'Rage', cd: 14, cost: 18,
    desc: '+45% damage & +30% attack speed for 8 seconds. Get angry.',
    icon: { shape: 'shout', color: '#e8574a' },
  },
  cleave: {
    name: 'Cleave', cd: 6, cost: 20,
    desc: 'A savage wide swing: 220% damage to everything in front + knockback.',
    icon: { shape: 'slash', color: '#c8ccd0' },
  },
  leapslam: {
    name: 'Leap Slam', cd: 9, cost: 24,
    desc: 'Leap to the nearest enemy and slam down: 260% damage + 1.4s stun.',
    icon: { shape: 'burst', color: '#d0553a' },
  },
  // --- Hunter ---
  volley: {
    name: 'Volley', cd: 8, cost: 24,
    desc: 'Loose a fan of 7 arrows, 120% damage each.',
    icon: { shape: 'fan', color: '#8aac5a' },
  },
  snipe: {
    name: 'Snipe', cd: 6, cost: 18,
    desc: 'A piercing shot through everyone in a line, 320% damage.',
    icon: { shape: 'arrow', color: '#a8d86a' },
  },
  beasttrap: {
    name: 'Beast Trap', cd: 9, cost: 20,
    desc: 'Snap-trap at the target: 180% damage + roots enemies for 2.5s.',
    icon: { shape: 'star', color: '#b0894a' },
  },
  // --- Priest ---
  heal: {
    name: 'Heal', cd: 8, cost: 22,
    desc: 'Restore 40% of your max HP in holy light.',
    icon: { shape: 'orb', color: '#7dff8a' },
  },
  smite: {
    name: 'Smite', cd: 5, cost: 16,
    desc: 'Call down a holy bolt on the nearest foe: 260% damage.',
    icon: { shape: 'burst', color: '#f8e8a8' },
  },
  bless: {
    name: 'Bless', cd: 16, cost: 20,
    desc: '+30% damage and steady regen for 9 seconds.',
    icon: { shape: 'wind', color: '#f0e0a0' },
  },

  // --- Warrior (extra tree nodes) ---
  shieldcharge: {
    name: 'Shield Charge', cd: 7, cost: 18,
    desc: 'Barge forward 6m behind your guard: 200% damage and everything you hit is knocked flat.',
    icon: { shape: 'burst', color: '#d8b866' },
  },
  ironstance: {
    name: 'Iron Stance', cd: 18, cost: 22,
    desc: 'Root yourself for 8s: incoming damage halved, and you cannot be knocked back.',
    icon: { shape: 'shout', color: '#9aa4b0' },
  },
  earthsplitter: {
    name: 'Earthsplitter', cd: 16, cost: 34,
    desc: 'Drive the blade into the ground. A widening fissure deals 420% along its length.',
    icon: { shape: 'spiral', color: '#c07a3a' },
  },
  lastbastion: {
    name: 'Last Bastion', cd: 40, cost: 30,
    desc: 'For 6s you cannot drop below 1 HP, and every hit taken returns 90% to its owner.',
    icon: { shape: 'star', color: '#ffd23e' },
  },

  // --- Archer (extra) ---
  arrowstorm: {
    name: 'Arrow Storm', cd: 20, cost: 36,
    desc: 'Loose into the sky. Arrows rain over a wide circle for 4s, 90% a hit.',
    icon: { shape: 'fan', color: '#b8e86e' },
  },

  // --- Mage (extra) ---
  chainbolt: {
    name: 'Chain Bolt', cd: 8, cost: 22,
    desc: 'Lightning that leaps between up to 5 enemies, 190% and falling.',
    icon: { shape: 'arrow', color: '#8fd8f0' },
  },
  gravitywell: {
    name: 'Gravity Well', cd: 14, cost: 28,
    desc: 'A collapsing singularity drags everything nearby into the middle and holds it.',
    icon: { shape: 'spiral', color: '#8a6ad0' },
  },
  meteor: {
    name: 'Meteor', cd: 22, cost: 40,
    desc: 'A falling rock lands where you aim: 620% in a wide crater, plus lingering fire.',
    icon: { shape: 'orb', color: '#ff5a22' },
  },
  infernoshell: {
    name: 'Inferno Shell', cd: 24, cost: 32,
    desc: 'Wrap yourself in fire for 8s: anything that touches you burns for 120% a second.',
    icon: { shape: 'star', color: '#ff9a3a' },
  },

  // --- Priest (extra) ---
  sanctuary: {
    name: 'Sanctuary', cd: 22, cost: 30,
    desc: 'A ring of light for 8s: allies inside heal steadily, enemies inside are slowed.',
    icon: { shape: 'orb', color: '#fff2b8' },
  },
  chastise: {
    name: 'Chastise', cd: 9, cost: 22,
    desc: 'A shockwave of light: 210% and a 1.6s stun to everything around you.',
    icon: { shape: 'shout', color: '#f8e8a8' },
  },
  judgement: {
    name: 'Judgement', cd: 20, cost: 38,
    desc: 'Three hammers of light on the three nearest foes, 380% each.',
    icon: { shape: 'burst', color: '#ffe27a' },
  },
  lightpillar: {
    name: 'Pillar of Light', cd: 26, cost: 40,
    desc: 'A column of dawn where you aim: 500%, and it keeps burning for 3s.',
    icon: { shape: 'star', color: '#fffbe0' },
  },

  // --- Assassin (extra) ---
  cyclonestrike: {
    name: 'Cyclone Strike', cd: 11, cost: 28,
    desc: 'Spin through everything within 4m three times over: 130% a pass, 1s stun.',
    icon: { shape: 'spiral', color: '#a8c4e0' },
  },
  smokebomb: {
    name: 'Smoke Bomb', cd: 16, cost: 20,
    desc: 'Vanish in smoke: 3s untargetable, and enemies caught in it are blinded.',
    icon: { shape: 'shadow', color: '#6a6a86' },
  },
  thousandcuts: {
    name: 'Thousand Cuts', cd: 24, cost: 42,
    desc: 'Blink between every enemy within 8m, 260% each, ending where you started.',
    icon: { shape: 'knives', color: '#e0e8f4' },
  },
  vanish: {
    name: 'Vanish', cd: 30, cost: 26,
    desc: 'Gone for 5s. Untouchable, faster, and the strike that breaks it is a guaranteed crit for 400%.',
    icon: { shape: 'shadow', color: '#4a4a6a' },
  },

  // --- Summoner ---
  summonbeast: {
    name: 'Summon Beast', cd: 14, cost: 26,
    desc: 'Call a stone beast to fight beside you for 20s.',
    icon: { shape: 'orb', color: '#8ad86e' },
  },
  turretdrop: {
    name: 'Turret Drop', cd: 12, cost: 24,
    desc: 'Drop an auto-firing turret that shoots the nearest enemy for 18s.',
    icon: { shape: 'burst', color: '#6ec8d8' },
  },
  rocketrain: {
    name: 'Rocket Rain', cd: 15, cost: 32,
    desc: 'A rocket barrage from above: 8 warheads over a wide circle, 180% each.',
    icon: { shape: 'arrow', color: '#ff8a4a' },
  },
  summonbot: {
    name: 'Summon Bot', cd: 18, cost: 30,
    desc: 'A walking battle robot for 22s. Slower than the beast, hits far harder.',
    icon: { shape: 'star', color: '#c8ccd4' },
  },
  repairfield: {
    name: 'Repair Field', cd: 20, cost: 24,
    desc: 'A field of drones for 8s: mends you and every summon you own.',
    icon: { shape: 'wind', color: '#7dff8a' },
  },
  siegemode: {
    name: 'Siege Mode', cd: 26, cost: 36,
    desc: 'Brace the cannon for 7s: it cannot move, and every shot is a 320% explosion.',
    icon: { shape: 'shout', color: '#ffb055' },
  },
  legion: {
    name: 'Legion', cd: 50, cost: 48,
    desc: 'Everything at once — three beasts, two bots and a rocket barrage.',
    icon: { shape: 'spiral', color: '#6ec8d8' },
  },
};

export const MAX_SKILL_LEVEL = 5;
const LVL_DMG = 0.22;   // +22% skill power per level
const LVL_CD = 0.06;    // -6% cooldown per level
const LVL_DUR = 0.15;   // +15% buff duration per level

// deps: { player, enemyMgr, projectiles, particles, dmgNums, audio, terrain,
//         aimPoint(), shake(), summons }
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
    // --- Fighter ---
    flurry() {
      const p = deps.player.state;
      deps.audio.sfx('swing');
      deps.player.playSwing(1.1);
      // six punches on their own timers. Staggering them is the whole point:
      // one lump of damage would be a Bash, and a flurry has to be heard as
      // separate impacts.
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (p.dead) return;
          const at = p.pos.clone().add(new THREE.Vector3(
            Math.sin(p.facing) * 1.1, 0.7, Math.cos(p.facing) * 1.1));
          deps.particles.burst(at, '#ffd88a', 4, 2.4, 2, 0.4);
          const hit = enemiesWithin(1.9, at);
          for (const e of hit) hitEnemy(e, 0.9);
          if (hit.length) { deps.audio.sfx('hit'); deps.shake?.(0.06); }
        }, i * 95);
      }
      deps.particles.runeCircle?.(p.pos, '#e8b45a', 2.2, 0.5);
    },
    risingknee() {
      const p = deps.player.state;
      // CLOSE THE GAP FIRST. A melee-only class needs a way to reach something,
      // and a knee that only works when you are already touching the target is
      // a knee nobody presses.
      const target = deps.aimPoint?.();
      if (target) {
        const dx = target.x - p.pos.x, dz = target.z - p.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const step = Math.min(d - 1.1, 6);
        if (step > 0) {
          const nx = p.pos.x + (dx / d) * step, nz = p.pos.z + (dz / d) * step;
          if (deps.terrain.walkable(nx, nz, p.pos.y)) {
            p.pos.x = nx; p.pos.z = nz;
            p.pos.y = deps.terrain.surfaceY(nx, nz);
          }
        }
        p.facing = Math.atan2(dx, dz);
      }
      const at = p.pos.clone().add(new THREE.Vector3(
        Math.sin(p.facing) * 1.0, 0.8, Math.cos(p.facing) * 1.0));
      deps.audio.sfx('bash');
      deps.shake?.(0.4);
      deps.particles.burst(at, '#f0a850', 18, 3.6, 5, 0.6);
      deps.particles.shockwave(p.pos, '#f0a850', 2.8, 0.4);
      for (const e of enemiesWithin(2.2, at)) {
        hitEnemy(e, 2.6, { stun: 0.7 });
        // launched, not pushed: the knock goes UP as well as away
        const dx = e.mesh.position.x - p.pos.x, dz = e.mesh.position.z - p.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        e.knock.set((dx / l) * 7, (dz / l) * 7);
      }
      deps.player.playSwing(1.3);
    },
    ironbody() {
      const p = deps.player.state;
      deps.player.addBuff({
        id: 'ironbody', t: 6 * durMult(),
        armor: 0.5 + 0.03 * (castLvl - 1),
        noKnock: true,
      });
      deps.audio.sfx('warcry');
      deps.particles.shockwave(p.pos, '#c8a05a', 3.2, 0.5);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#e8d0a0', 18);
      deps.particles.runeCircle?.(p.pos, '#c8a05a', 2.6, 0.9);
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

    // --- Berserker ---
    rage() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'rage', t: 8 * durMult(), dmg: 0.45, atkSpeed: 0.3 });
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#e8574a', 26);
      deps.particles.shockwave(p.pos, '#e8574a', 3.5, 0.5);
      deps.particles.flash(p.pos, '#e8574a', 7, 0.4);
      deps.audio.sfx('warcry');
      deps.shake?.(0.3);
    },
    cleave() {
      const p = deps.player.state;
      const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
      const at = p.pos.clone().add(dir.multiplyScalar(1.6));
      deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.6, 0)), '#c8ccd0', 18, 3.6);
      deps.particles.shockwave(at, '#c8ccd0', 3, 0.4);
      deps.audio.sfx('whirl');
      deps.shake?.(0.28);
      for (const e of enemiesWithin(3.0)) {
        const dx = e.mesh.position.x - p.pos.x, dz = e.mesh.position.z - p.pos.z;
        const ang = Math.atan2(dx, dz);
        let diff = ang - p.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 1.4) continue; // frontal arc only
        hitEnemy(e, 2.2);
        const l = Math.hypot(dx, dz) || 1;
        e.knock.set((dx / l) * 9, (dz / l) * 9);
      }
      deps.player.playSwing(1.2);
    },
    leapslam() {
      const p = deps.player.state;
      let nearest = null, best = 12 * 12;
      for (const e of deps.enemyMgr.enemies) {
        if (e.dead) continue;
        const d = (e.mesh.position.x - p.pos.x) ** 2 + (e.mesh.position.z - p.pos.z) ** 2;
        if (d < best) { best = d; nearest = e; }
      }
      const target = nearest ? nearest.mesh.position : p.pos.clone().add(facingDir().multiplyScalar(5));
      const dir = target.clone().sub(p.pos); dir.y = 0;
      const dist = Math.min(6, dir.length()); dir.normalize();
      for (let d = dist; d > 0.5; d -= 0.5) {
        const nx = p.pos.x + dir.x * d, nz = p.pos.z + dir.z * d;
        if (deps.terrain.walkable(nx, nz, deps.terrain.surfaceY(nx, nz))) {
          p.pos.x = nx; p.pos.z = nz; p.pos.y = deps.terrain.surfaceY(nx, nz); break;
        }
      }
      if (nearest) { p.facing = Math.atan2(nearest.mesh.position.x - p.pos.x, nearest.mesh.position.z - p.pos.z); }
      deps.audio.sfx('bash');
      deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#d0553a', 24, 4);
      deps.particles.shockwave(p.pos, '#d0553a', 3.2, 0.45);
      deps.particles.flash(p.pos, '#e8574a', 7, 0.3);
      deps.shake?.(0.4);
      for (const e of enemiesWithin(2.6)) hitEnemy(e, 2.6, { stun: 1.4 });
      deps.player.playSwing(1.3);
    },

    // --- Hunter ---
    volley() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('multishot');
      for (let i = -3; i <= 3; i++) {
        const a = p.facing + i * 0.14;
        deps.projectiles.spawn({
          pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
          dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), speed: 22, range: 15, radius: 0.55,
          kind: 'arrow', color: '#a8d86a',
          onHitEnemy: (e) => hitEnemy(e, 1.2),
        });
      }
      deps.player.playBowDraw();
    },
    snipe() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('powershot');
      deps.particles.flash(p.pos, '#a8d86a', 4, 0.2);
      deps.projectiles.spawn({
        pos: p.pos.clone().add(new THREE.Vector3(0, 0.75, 0)),
        dir: facingDir(), speed: 34, range: 24, radius: 0.8,
        kind: 'arrow', color: '#c8f090', scale: 1.7, pierce: true, trail: '#a8d86a',
        onHitEnemy: (e) => hitEnemy(e, 3.2),
      });
      deps.player.playBowDraw();
    },
    beasttrap() {
      const target = deps.aimPoint() || deps.player.state.pos.clone().add(facingDir().multiplyScalar(5));
      deps.audio.sfx('fanknives');
      deps.particles.shockwave(target, '#b0894a', 2.6, 0.5);
      deps.particles.burst(target.clone().add(new THREE.Vector3(0, 0.3, 0)), '#b0894a', 20, 3, 3);
      deps.particles.flash(target, '#e8c060', 5, 0.3);
      deps.shake?.(0.2);
      for (const e of enemiesWithin(2.6, target)) hitEnemy(e, 1.8, { freeze: 2.5 });
    },

    // --- Priest ---
    heal() {
      const p = deps.player.state;
      const amt = Math.round(p.maxHp * 0.4);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      p.sinceHurt = 999;
      deps.dmgNums.spawn(p.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), `+${amt}`, 'heal');
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#7dff8a', 24);
      deps.particles.shockwave(p.pos, '#7dff8a', 2.4, 0.5);
      deps.particles.flash(p.pos, '#aaffb0', 5, 0.35);
      deps.audio.sfx('potion');
      deps.player.playStaffCast();
    },
    smite() {
      const p = deps.player.state;
      let nearest = null, best = 16 * 16;
      for (const e of deps.enemyMgr.enemies) {
        if (e.dead) continue;
        const d = (e.mesh.position.x - p.pos.x) ** 2 + (e.mesh.position.z - p.pos.z) ** 2;
        if (d < best) { best = d; nearest = e; }
      }
      deps.audio.sfx('fireball');
      if (nearest) {
        const at = nearest.mesh.position;
        p.facing = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
        deps.particles.flash(at, '#fff2c0', 8, 0.35);
        deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.8, 0)), '#f8e8a8', 26, 4, 5);
        deps.particles.shockwave(at, '#f8e8a8', 2.2, 0.4);
        deps.shake?.(0.25);
        for (const e of enemiesWithin(1.8, at)) hitEnemy(e, 2.6);
      }
      deps.player.playStaffCast();
    },
    bless() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'bless', t: 9 * durMult(), dmg: 0.3, regen: 2 });
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#f0e0a0', 22);
      deps.particles.shockwave(p.pos, '#f0e0a0', 2.6, 0.5);
      deps.particles.flash(p.pos, '#fff2c0', 5, 0.4);
      deps.audio.sfx('swiftness');
      deps.player.playStaffCast();
    },

    // ================= WARRIOR =================
    shieldcharge() {
      const p = deps.player.state;
      aimAtCursor();
      const dir = facingDir();
      const from = p.pos.clone();
      // Move FIRST, then hit what the path crossed. A charge that resolves its
      // damage from where you started is the classic "why did that miss".
      const dest = from.clone().add(dir.clone().multiplyScalar(6));
      deps.player.dashTo?.(dest, 0.28);
      deps.audio.sfx('bash');
      deps.shake?.(0.4);
      const hit = new Set();
      for (let i = 0; i <= 6; i++) {
        const at = from.clone().lerp(dest, i / 6);
        deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.5, 0)), '#d8b866', 5, 2.4);
        for (const e of enemiesWithin(1.9, at)) {
          if (hit.has(e)) continue;
          hit.add(e);
          hitEnemy(e, 2.0, { stun: 1.4 });
          const dx = e.mesh.position.x - at.x, dz = e.mesh.position.z - at.z;
          const l = Math.hypot(dx, dz) || 1;
          e.knock.set((dx / l) * 13, (dz / l) * 13);
        }
      }
      deps.particles.shockwave(dest, '#d8b866', 2.6, 0.35);
    },
    ironstance() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'ironstance', t: 8 * durMult(), armor: 0.5, rooted: true });
      deps.particles.shockwave(p.pos, '#9aa4b0', 2.8, 0.5);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#9aa4b0', 20);
      deps.audio.sfx('warcry');
    },
    earthsplitter() {
      const p = deps.player.state;
      aimAtCursor();
      const dir = facingDir();
      deps.audio.sfx('bash');
      deps.shake?.(0.6);
      deps.player.playSwing(1.6);
      // The fissure WIDENS with distance, so the tell is readable and landing
      // the far end is a real reward rather than a lucky overlap.
      for (let i = 1; i <= 7; i++) {
        const at = p.pos.clone().add(dir.clone().multiplyScalar(i * 1.25));
        const w = 1.0 + i * 0.22;
        setTimeout(() => {
          deps.particles.shockwave(at, '#c07a3a', w, 0.3);
          deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.3, 0)), '#8a5a2a', 9, 3.2);
          for (const e of enemiesWithin(w, at)) hitEnemy(e, 0.6);
        }, i * 45);
      }
    },
    lastbastion() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'lastbastion', t: 6 * durMult(), immortal: true, thorns: 0.9 });
      deps.particles.shockwave(p.pos, '#ffd23e', 4.5, 0.6);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#ffd23e', 34);
      deps.particles.flash(p.pos, '#fff0a0', 9, 0.5);
      deps.audio.sfx('warcry');
      deps.shake?.(0.35);
    },

    // ================= ARCHER =================
    arrowstorm() {
      const p = deps.player.state;
      aimAtCursor();
      const centre = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(7));
      deps.audio.sfx('multishot');
      deps.particles.runeCircle?.(centre, '#b8e86e', 9, 1.2);
      // Ten waves over four seconds, so it reads as rain rather than as one
      // lump of damage that happens to be spread out.
      for (let w = 0; w < 10; w++) {
        setTimeout(() => {
          for (let k = 0; k < 3; k++) {
            const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 4.5;
            const at = new THREE.Vector3(centre.x + Math.cos(a) * r, 0, centre.z + Math.sin(a) * r);
            at.y = deps.terrain.surfaceY(at.x, at.z);
            deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.3, 0)), '#b8e86e', 5, 2.2);
            for (const e of enemiesWithin(1.2, at)) hitEnemy(e, 0.9);
          }
        }, w * 400);
      }
      deps.player.playBowDraw();
    },

    // ================= MAGE =================
    chainbolt() {
      const p = deps.player.state;
      aimAtCursor();
      deps.audio.sfx('fireball');
      let from = p.pos.clone().add(new THREE.Vector3(0, 0.8, 0));
      const struck = new Set();
      let mult = 1.9;
      for (let i = 0; i < 5; i++) {
        let best = null, bd = 9;
        for (const e of deps.enemyMgr.enemies) {
          if (e.dead || struck.has(e)) continue;
          const d = Math.hypot(e.mesh.position.x - from.x, e.mesh.position.z - from.z);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) break;
        struck.add(best);
        const to = best.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
        // The arc is drawn as a jittered line of sparks. A bolt with no visible
        // path just looks like unrelated things taking damage at once.
        const steps = Math.max(3, Math.round(bd * 2));
        for (let k = 0; k <= steps; k++) {
          const at = from.clone().lerp(to, k / steps);
          at.x += (Math.random() - 0.5) * 0.35;
          at.z += (Math.random() - 0.5) * 0.35;
          deps.particles.burst(at, '#8fd8f0', 2, 1.2);
        }
        deps.particles.flash(to, '#c8f0ff', 3.4, 0.18);
        hitEnemy(best, mult);
        mult *= 0.78;
        from = to;
      }
      deps.player.playStaffCast();
    },
    gravitywell() {
      const p = deps.player.state;
      aimAtCursor();
      const centre = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(6));
      centre.y = deps.terrain.surfaceY(centre.x, centre.z);
      deps.audio.sfx('icenova');
      deps.particles.runeCircle?.(centre, '#8a6ad0', 6, 1.1);
      for (let t = 0; t < 8; t++) {
        setTimeout(() => {
          deps.particles.shockwave(centre, '#8a6ad0', Math.max(0.6, 3.4 - t * 0.3), 0.28);
          for (const e of enemiesWithin(5, centre)) {
            // knock TOWARD the middle: the pull is a negative knockback
            const dx = centre.x - e.mesh.position.x, dz = centre.z - e.mesh.position.z;
            const l = Math.hypot(dx, dz) || 1;
            e.knock.set((dx / l) * 7, (dz / l) * 7);
            e.stunT = Math.max(e.stunT || 0, 0.4);
            if (t % 2 === 0) hitEnemy(e, 0.42);
          }
        }, t * 190);
      }
      deps.player.playStaffCast();
    },
    meteor() {
      const p = deps.player.state;
      aimAtCursor();
      const at = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(8));
      at.y = deps.terrain.surfaceY(at.x, at.z);
      // TELEGRAPH FIRST. A 620% hit with no warning is not a skill, it is a
      // dice roll on whatever happened to be standing there.
      deps.particles.runeCircle?.(at, '#ff5a22', 7, 0.9);
      deps.audio.sfx('fireball');
      for (let i = 0; i < 14; i++) {
        setTimeout(() => deps.particles.burst(
          at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 7 - i * 0.45, (Math.random() - 0.5) * 4)),
          '#ff8a3a', 4, 2.2), i * 32);
      }
      setTimeout(() => {
        deps.audio.sfx('explosion');
        deps.shake?.(0.9);
        explode(at, 4.2, 6.2);
        for (let k = 0; k < 4; k++) {
          setTimeout(() => {
            deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ff7722', 10, 3);
            for (const e of enemiesWithin(3.6, at)) hitEnemy(e, 0.4);
          }, 400 + k * 380);
        }
      }, 520);
      deps.player.playStaffCast();
    },
    infernoshell() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'infernoshell', t: 8 * durMult(), aura: { r: 2.6, mult: 1.2, color: '#ff9a3a' } });
      deps.particles.shockwave(p.pos, '#ff9a3a', 3.2, 0.5);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ff9a3a', 28);
      deps.audio.sfx('fireball');
      deps.player.playStaffCast();
    },

    // ================= PRIEST =================
    sanctuary() {
      const p = deps.player.state;
      const centre = p.pos.clone();
      deps.particles.runeCircle?.(centre, '#fff2b8', 7, 1.4);
      deps.audio.sfx('heal');
      deps.player.addBuff({ id: 'sanctuary', t: 8 * durMult(), regen: 3.5 });
      for (let t = 0; t < 8; t++) {
        setTimeout(() => {
          deps.particles.shockwave(centre, '#fff2b8', 3.5, 0.3);
          for (const e of enemiesWithin(3.5, centre)) e.slowT = Math.max(e.slowT || 0, 1.2);
        }, t * 1000);
      }
      deps.player.playStaffCast();
    },
    chastise() {
      const p = deps.player.state;
      deps.particles.shockwave(p.pos, '#f8e8a8', 4.0, 0.42);
      deps.particles.flash(p.pos, '#fffbe0', 8, 0.35);
      deps.audio.sfx('smite');
      deps.shake?.(0.3);
      for (const e of enemiesWithin(4.0)) hitEnemy(e, 2.1, { stun: 1.6 });
      deps.player.playStaffCast();
    },
    judgement() {
      const p = deps.player.state;
      const targets = deps.enemyMgr.enemies
        .filter((e) => !e.dead)
        .map((e) => ({ e, d: Math.hypot(e.mesh.position.x - p.pos.x, e.mesh.position.z - p.pos.z) }))
        .filter((t) => t.d < 12)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      deps.audio.sfx('smite');
      targets.forEach((t, i) => setTimeout(() => {
        if (t.e.dead) return;
        const at = t.e.mesh.position.clone();
        deps.particles.flash(at.clone().add(new THREE.Vector3(0, 1.4, 0)), '#ffe27a', 7, 0.3);
        deps.particles.shockwave(at, '#ffe27a', 2.2, 0.32);
        deps.particles.burst(at.clone().add(new THREE.Vector3(0, 1, 0)), '#fffbe0', 18, 4);
        hitEnemy(t.e, 3.8);
        deps.shake?.(0.22);
      }, i * 180));
      deps.player.playStaffCast();
    },
    lightpillar() {
      const p = deps.player.state;
      aimAtCursor();
      const at = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(6));
      at.y = deps.terrain.surfaceY(at.x, at.z);
      deps.particles.runeCircle?.(at, '#fffbe0', 5, 1.0);
      deps.audio.sfx('smite');
      // A real column: stacked bursts up the Y axis, not one puff on the floor.
      for (let i = 0; i < 10; i++) {
        deps.particles.burst(at.clone().add(new THREE.Vector3(0, i * 0.55, 0)), '#fffbe0', 6, 1.4);
      }
      deps.particles.flash(at.clone().add(new THREE.Vector3(0, 1.5, 0)), '#ffffff', 10, 0.4);
      for (const e of enemiesWithin(2.6, at)) hitEnemy(e, 5.0);
      for (let k = 1; k <= 3; k++) {
        setTimeout(() => {
          for (let i = 0; i < 6; i++) {
            deps.particles.burst(at.clone().add(new THREE.Vector3(0, i * 0.5, 0)), '#fff2b8', 3, 1.2);
          }
          for (const e of enemiesWithin(2.6, at)) hitEnemy(e, 0.7);
        }, k * 900);
      }
      deps.player.playStaffCast();
    },

    // ================= ASSASSIN =================
    cyclonestrike() {
      const p = deps.player.state;
      deps.audio.sfx('whirl');
      deps.shake?.(0.3);
      for (let pass = 0; pass < 3; pass++) {
        setTimeout(() => {
          deps.particles.shockwave(p.pos, '#a8c4e0', 4.0, 0.3);
          deps.player.playSpin();
          for (const e of enemiesWithin(4.0)) hitEnemy(e, 1.3, { stun: pass === 2 ? 1.0 : 0 });
        }, pass * 170);
      }
    },
    smokebomb() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'smokebomb', t: 3 * durMult(), untargetable: true });
      deps.audio.sfx('shadowstep');
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 2.4;
        deps.particles.burst(
          p.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.2 + Math.random() * 1.2, Math.sin(a) * r)),
          '#6a6a86', 3, 1.1);
      }
      deps.particles.shockwave(p.pos, '#6a6a86', 3.0, 0.5);
      for (const e of enemiesWithin(3.0)) e.stunT = Math.max(e.stunT || 0, 1.4);
    },
    thousandcuts() {
      const p = deps.player.state;
      const start = p.pos.clone();
      const targets = deps.enemyMgr.enemies.filter((e) => !e.dead
        && Math.hypot(e.mesh.position.x - start.x, e.mesh.position.z - start.z) < 8);
      deps.audio.sfx('dashstrike');
      if (!targets.length) {
        deps.particles.shockwave(start, '#e0e8f4', 2.4, 0.3);
        return;
      }
      targets.forEach((e, i) => setTimeout(() => {
        if (e.dead) return;
        const at = e.mesh.position.clone();
        deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.9, 0)), '#e0e8f4', 14, 3.4);
        deps.particles.flash(at, '#ffffff', 4, 0.14);
        hitEnemy(e, 2.6, { crit: true });
        deps.player.playSwing(1.1);
      }, i * 90));
      // Return to where you started. A skill must never leave you somewhere you
      // did not choose to be.
      setTimeout(() => {
        deps.player.dashTo?.(start, 0.2);
        deps.particles.shockwave(start, '#e0e8f4', 2.6, 0.35);
      }, targets.length * 90 + 60);
    },
    vanish() {
      const p = deps.player.state;
      deps.player.addBuff({
        id: 'vanish', t: 5 * durMult(), untargetable: true, speed: 0.35,
        ambush: 4.0,   // the strike that breaks it
      });
      deps.audio.sfx('shadowstep');
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#4a4a6a', 26);
      deps.particles.shockwave(p.pos, '#4a4a6a', 2.6, 0.45);
    },

    // ================= SUMMONER =================
    summonbeast() {
      const p = deps.player.state;
      deps.summons?.spawn('beast', p.pos.clone().add(facingDir().multiplyScalar(1.8)));
      deps.audio.sfx('summon');
      deps.player.playStaffCast();
    },
    turretdrop() {
      const p = deps.player.state;
      deps.summons?.spawn('turret', p.pos.clone().add(facingDir().multiplyScalar(1.6)));
      deps.audio.sfx('summon');
      deps.shake?.(0.2);
    },
    summonbot() {
      const p = deps.player.state;
      deps.summons?.spawn('bot', p.pos.clone().add(facingDir().multiplyScalar(2.0)));
      deps.audio.sfx('summon');
      deps.shake?.(0.28);
      deps.player.playStaffCast();
    },
    rocketrain() {
      const p = deps.player.state;
      aimAtCursor();
      const centre = deps.aimPoint() || p.pos.clone().add(facingDir().multiplyScalar(7));
      centre.y = deps.terrain.surfaceY(centre.x, centre.z);
      deps.audio.sfx('powershot');
      deps.particles.runeCircle?.(centre, '#ff8a4a', 7, 0.9);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 3.6;
          const at = new THREE.Vector3(centre.x + Math.cos(a) * r, 0, centre.z + Math.sin(a) * r);
          at.y = deps.terrain.surfaceY(at.x, at.z);
          // a visible descent, so the barrage reads as coming FROM somewhere
          for (let k = 0; k < 5; k++) {
            deps.particles.burst(at.clone().add(new THREE.Vector3(0, 3.4 - k * 0.7, 0)), '#ffb055', 3, 1.4);
          }
          deps.particles.burst(at.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ff8a4a', 16, 4);
          deps.particles.shockwave(at, '#ff8a4a', 2.0, 0.28);
          deps.shake?.(0.16);
          for (const e of enemiesWithin(1.9, at)) hitEnemy(e, 1.8);
        }, i * 130);
      }
    },
    repairfield() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'repairfield', t: 8 * durMult(), regen: 3 });
      deps.summons?.extendAll(8);
      deps.particles.runeCircle?.(p.pos, '#7dff8a', 5, 1.1);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#7dff8a', 22);
      deps.audio.sfx('heal');
    },
    siegemode() {
      const p = deps.player.state;
      deps.player.addBuff({ id: 'siegemode', t: 7 * durMult(), rooted: true, dmg: 2.2, splash: 2.2 });
      deps.particles.shockwave(p.pos, '#ffb055', 3.0, 0.5);
      deps.particles.fountain(p.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffb055', 24);
      deps.audio.sfx('warcry');
      deps.shake?.(0.3);
    },
    legion() {
      const p = deps.player.state;
      deps.audio.sfx('summon');
      deps.shake?.(0.5);
      deps.particles.runeCircle?.(p.pos, '#6ec8d8', 8, 1.6);
      // Staggered: six bodies appearing on one frame reads as a glitch.
      const plan = ['beast', 'beast', 'bot', 'beast', 'bot'];
      plan.forEach((kind, i) => setTimeout(() => {
        const a = (i / plan.length) * Math.PI * 2;
        deps.summons?.spawn(kind, p.pos.clone().add(new THREE.Vector3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2)));
      }, i * 150));
      setTimeout(() => FX.rocketrain(), 700);
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
    // every cast blooms a rotating rune sigil + spark ring in the skill's
    // color under the hero — the per-skill FX layers on top of this
    deps.particles.runeCircle?.(p.pos, def.icon.color, 2.4 + castLvl * 0.15, 0.7);
    deps.particles.burst(p.pos.clone().add(new THREE.Vector3(0, 0.25, 0)), def.icon.color, 8, 2.2, 2, 0.5);
    deps.particles.flash(p.pos, def.icon.color, 3.5, 0.25);
    FX[id]();
    return true;
  }

  function update(dt) {
    for (const k of Object.keys(cooldowns)) {
      if (cooldowns[k] > 0) cooldowns[k] -= dt;
    }
  }

  /**
   * Take every skill back to level 1 and report how many upgrades that undoes.
   *
   * It returns the COUNT rather than refunding anything itself: the points live
   * in main.js, which is the only place that knows what an upgrade cost, and a
   * system that hands out currency it does not own is how ledgers drift apart.
   */
  function resetLevels() {
    let freed = 0;
    for (const id of Object.keys(levels)) {
      freed += Math.max(0, (levels[id] || 1) - 1);
      delete levels[id];
    }
    return freed;
  }

  function serialize() { return { levels: { ...levels } }; }
  function load(data) {
    if (data?.levels) Object.assign(levels, data.levels);
  }

  return { cast, update, ready, cdFrac, levelOf, upgrade, effCd, resetLevels, serialize, load, SKILLS };
}
