// Pixel-cube particles: hit sparks, water splash, slime pops, level-up glitter.
// Plus juicy combat FX: expanding shockwave rings and pooled light flashes.
import * as THREE from 'three';
import { getQuality, onQualityChange } from './quality.js';

const MAX = 800;
const MAX_RINGS = 10;
const MAX_FLASH = 6;

export function createParticles(scene) {
  // VISUAL FX scales every emitter's count. Kept live so the setting takes
  // effect the moment it changes, without rebuilding the world.
  let fxScale = getQuality().particleScale;
  onQualityChange((nq) => { fxScale = nq.particleScale; });
  const nOf = (n) => Math.max(1, Math.round(n * fxScale));
  // THREE SIZE LAYERS, NOT ONE.
  //
  // Every particle in the game was the same 0.2 dot, because PointsMaterial has
  // ONE size for the whole system. That is most of why a burst read as a
  // handful of specks rather than an impact: real sparks come in a range of
  // sizes, and a uniform grid of identical dots is the one thing that reads as
  // "computer generated". Three Points systems at different sizes give that
  // range for two extra draw calls and no custom shader -- and this project
  // deliberately has NO custom shaders anywhere, which is what made the three
  // upgrade safe, so a ShaderMaterial was not on the table.
  const LAYERS = [
    { size: 0.10, share: 0.42 },   // fine grit
    { size: 0.22, share: 0.38 },   // the body of the effect
    { size: 0.46, share: 0.20 },   // a few fat embers
  ];
  // soft round glow sprite for each particle (nicer than hard squares)
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 32;
  {
    const c = dotCanvas.getContext('2d');
    const g2 = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.fillRect(0, 0, 32, 32);
  }
  const dotTex = new THREE.CanvasTexture(dotCanvas);

  const layers = LAYERS.map((L) => {
    const cap = Math.max(16, Math.round(MAX * L.share));
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3);
    const col = new Float32Array(cap * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: L.size, map: dotTex, vertexColors: true, transparent: true, opacity: 1,
      depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    const pool = [];
    for (let i = 0; i < cap; i++) {
      pool.push({ life: 0, life0: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 1, drag: 0 });
    }
    return { cap, g, pos, col, pool, cursor: 0 };
  });

  /** Put one particle into a size layer. `drag` bleeds speed, so fast sparks
   *  slow as they die instead of flying at full speed until they blink out. */
  function emit(li, x, y, z, vx, vy, vz, c, life, grav, drag = 2.2) {
    const L = layers[li];
    const p = L.pool[L.cursor]; L.cursor = (L.cursor + 1) % L.cap;
    p.life = life; p.life0 = life;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.r = c.r; p.g = c.g; p.b = c.b;
    p.grav = grav; p.drag = drag;
  }
  /** Pick a layer: mostly medium, some fine, a few fat. */
  const pickLayer = () => { const r = Math.random(); return r < 0.42 ? 0 : r < 0.8 ? 1 : 2; };

  function burst(pos, colorHex, count = 10, speed = 2.4, grav = 6, life = 0.55) {
    const c = new THREE.Color(colorHex);
    // MORE OF THEM, AND SPREAD OVER SIZES. The old count produced a countable
    // handful of identical specks; an impact wants a cloud you cannot count.
    count = nOf(Math.round(count * 2.2));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      // sqrt so speeds bunch toward the FAST end -- an even spread reads as a
      // fog expanding, not as something thrown outward
      const sp = speed * (0.35 + Math.sqrt(Math.random()) * 0.9);
      emit(pickLayer(),
        pos.x, pos.y, pos.z,
        Math.cos(a) * sp, Math.random() * speed * 1.15, Math.sin(a) * sp,
        c, life * (0.55 + Math.random() * 0.7), grav);
    }
    // a bright core, so the origin is the brightest thing rather than the gap
    // between the specks flying away from it
    for (let i = 0; i < nOf(3); i++) {
      emit(2, pos.x, pos.y, pos.z,
        (Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5,
        c, life * 0.45, grav * 0.25, 5);
    }
  }

  function fountain(pos, colorHex, count = 14) {
    burst(pos, colorHex, count, 1.6, -1.5, 0.9); // negative gravity: rises (level up)
  }

  function ring(pos, colorHex, count = 20, radius = 2.6) {
    const c = new THREE.Color(colorHex);
    count = nOf(count);
    count = Math.round(count * 1.8);
    for (let i = 0; i < count; i++) {
      // jittered off the exact circle: a ring of evenly spaced dots reads as a
      // dotted outline, which is precisely what this looked like
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const sp = radius * 2.4 * (0.86 + Math.random() * 0.28);
      emit(pickLayer(), pos.x, pos.y + 0.5, pos.z,
        Math.cos(a) * sp, 0.5 + Math.random() * 0.9, Math.sin(a) * sp,
        c, 0.45 * (0.75 + Math.random() * 0.5), 2);
    }
  }

  // --- shockwave: flat expanding ring mesh that fades out ---
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.72, 1.0, 26);
  for (let i = 0; i < MAX_RINGS; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, m, t: 0, dur: 0, from: 0.3, to: 3 });
  }
  let ringCursor = 0;

  function shockwave(pos, colorHex, radius = 3, dur = 0.4) {
    // the blast leaves a mark on the floor as well as a ring in the air
    decal(pos, colorHex, radius * 1.05, dur * 1.9, 'ring', 1);
    const r = rings[ringCursor]; ringCursor = (ringCursor + 1) % MAX_RINGS;
    r.m.color.set(colorHex);
    r.mesh.position.set(pos.x, pos.y + 0.12, pos.z);
    r.t = dur; r.dur = dur; r.from = radius * 0.2; r.to = radius;
    r.mesh.visible = true;
  }

  // --- rune circle: a rotating magic sigil that blooms under skill casts ---
  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = runeCanvas.height = 128;
  {
    const c = runeCanvas.getContext('2d');
    c.strokeStyle = '#ffffff';
    c.translate(64, 64);
    c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, 56, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.stroke();
    // tick notches + orbiting diamonds + inner triangle — reads as a sigil
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
      c.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.save();
      c.translate(Math.cos(a) * 50, Math.sin(a) * 50);
      c.rotate(a);
      c.fillRect(-4, -4, 8, 8);
      c.restore();
    }
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 34, y = Math.sin(a) * 34;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  const runeTex = new THREE.CanvasTexture(runeCanvas);
  const runes = [];
  const MAX_RUNES = 5;
  for (let i = 0; i < MAX_RUNES; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, map: runeTex, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    runes.push({ mesh, m, t: 0, dur: 0, size: 2, spin: 1 });
  }
  let runeCursor = 0;

  function runeCircle(pos, colorHex, size = 2.6, dur = 0.7) {
    // the sigil belongs on the GROUND, where a caster would draw it
    decal(pos, colorHex, size * 1.15, dur * 1.5, 'rune', 0);
    const r = runes[runeCursor]; runeCursor = (runeCursor + 1) % MAX_RUNES;
    r.m.color.set(colorHex);
    r.mesh.position.set(pos.x, pos.y + 0.1, pos.z);
    r.t = dur; r.dur = dur; r.size = size;
    r.spin = Math.random() < 0.5 ? -1 : 1;
    r.mesh.visible = true;
  }

  // --- flash: pooled point light for casts/explosions ---
  const flashes = [];
  for (let i = 0; i < MAX_FLASH; i++) {
    const L = new THREE.PointLight(0xffffff, 0, 9, 1.6);
    scene.add(L);
    flashes.push({ L, t: 0, dur: 0, peak: 0 });
  }
  let flashCursor = 0;

  function flash(pos, colorHex, intensity = 6, dur = 0.3) {
    const f = flashes[flashCursor]; flashCursor = (flashCursor + 1) % MAX_FLASH;
    f.L.color.set(colorHex);
    f.L.position.set(pos.x, pos.y + 0.8, pos.z);
    f.t = dur; f.dur = dur; f.peak = intensity;
  }

  // =====================================================================
  // SHAPE VOCABULARY
  //
  // WHY THIS EXISTS. Before it, 48 skills fired 110 effect calls drawn from
  // six primitives, and shockwave + burst + flash alone accounted for 86 of
  // them. Heal was fountain+shockwave+flash in green; Bless was
  // fountain+shockwave+flash in gold; Smite was flash+burst+shockwave in gold.
  // Every spell in the game was the same flat ring, the same cloud of dots and
  // the same point light, recoloured. That is what "generic" was: no spell had
  // a SHAPE of its own, only a hue.
  //
  // Colour is the weakest way to tell two things apart — it is the first thing
  // fog, bloom and a dark dungeon take away. Silhouette is the strongest. So
  // these four are chosen to be different in OUTLINE, not palette, and
  // specifically to cover the directions the old set never used: the game had
  // nothing vertical, nothing that erupted, nothing that swept, and nothing
  // that travelled from A to B.
  //
  //   beam    a standing column          — vertical
  //   spikes  shards out of the floor    — eruption
  //   slash   a crescent that tapers     — sweep
  //   bolt    a jagged line A to B       — travel
  //
  // All four follow the file's existing discipline: pooled meshes with shared
  // geometry so a cast allocates nothing, additive, depthWrite off, and low
  // segment counts because everything else in this game is 16px pixel art and
  // a smooth NURBS-looking arc next to a faceted rock reads as a mistake.
  // =====================================================================

  // ---- BEAM: a column of light standing on the ground -------------------
  // Two nested open cylinders — a hot near-white core inside a wider coloured
  // shell — because a single cylinder reads as a plastic tube. The core is
  // what the eye reads as "bright"; the shell is what bloom catches.
  const MAX_BEAMS = 6;
  const beams = [];
  const beamGeo = new THREE.CylinderGeometry(1, 0.62, 1, 8, 1, true);
  for (let i = 0; i < MAX_BEAMS; i++) {
    const shellM = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const coreM = shellM.clone();
    const g = new THREE.Group();
    const shell = new THREE.Mesh(beamGeo, shellM);
    const core = new THREE.Mesh(beamGeo, coreM);
    core.scale.set(0.42, 1, 0.42);
    g.add(shell, core);
    g.visible = false;
    scene.add(g);
    beams.push({ g, shell, core, shellM, coreM, t: 0, dur: 0, r: 1, h: 6 });
  }
  let beamCursor = 0;

  /** A vertical column: holy strikes, meteors, anything that arrives from above. */
  function beam(pos, colorHex, radius = 0.9, height = 6.5, dur = 0.42) {
    // where the column LANDS, which is the half of a pillar that reads
    decal(pos, colorHex, radius * 3.4, dur * 2.2, 'ring', 1);
    const b = beams[beamCursor]; beamCursor = (beamCursor + 1) % MAX_BEAMS;
    b.shellM.color.set(colorHex);
    b.coreM.color.set(0xffffff);
    b.g.position.set(pos.x, pos.y, pos.z);
    b.t = dur; b.dur = dur; b.r = radius; b.h = height;
    b.g.visible = true;
  }

  // ---- SPIKES: shards punched up out of the floor -----------------------
  // Four-sided cones, so they read as crystal rather than as a smooth horn,
  // and each one carries its OWN delay, height and lean. A ring of spikes on
  // one shared timer is a single object that happens to have gaps in it; the
  // per-shard phase is what makes it read as ground breaking.
  const MAX_SPIKE_SETS = 4;
  const SPIKES_PER = 9;
  const spikeSets = [];
  const spikeGeo = new THREE.ConeGeometry(0.3, 1, 4);
  for (let i = 0; i < MAX_SPIKE_SETS; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const g = new THREE.Group();
    const parts = [];
    for (let k = 0; k < SPIKES_PER; k++) {
      const s = new THREE.Mesh(spikeGeo, m);
      g.add(s);
      parts.push({ mesh: s, delay: 0, h: 1, lean: 0 });
    }
    g.visible = false;
    scene.add(g);
    spikeSets.push({ g, m, parts, t: 0, dur: 0 });
  }
  let spikeCursor = 0;

  /** Shards erupting in a ring: earth, ice, thorns — anything that comes UP. */
  function spikes(pos, colorHex, radius = 2.4, dur = 0.62) {
    // shards come OUT of something: the ground has to break first
    decal(pos, colorHex, radius * 1.2, dur * 1.7, 'crack', 1);
    const s = spikeSets[spikeCursor]; spikeCursor = (spikeCursor + 1) % MAX_SPIKE_SETS;
    s.m.color.set(colorHex);
    s.g.position.set(pos.x, pos.y, pos.z);
    const n = Math.max(3, nOf(SPIKES_PER));
    for (let k = 0; k < SPIKES_PER; k++) {
      const p = s.parts[k];
      const on = k < n;
      p.mesh.visible = on;
      if (!on) continue;
      // deliberately irregular: a perfect ring reads as a machine part
      const a = (k / n) * Math.PI * 2 + (k % 3) * 0.21;
      const r = radius * (0.55 + ((k * 37) % 10) / 20);
      p.mesh.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.h = 1.1 + ((k * 53) % 10) / 8;
      p.lean = ((k % 5) - 2) * 0.16;
      p.delay = ((k * 29) % 10) / 10 * 0.22;      // own phase, never one sine
      p.mesh.rotation.set(p.lean, a, p.lean * 0.6);
    }
    s.t = dur; s.dur = dur;
    s.g.visible = true;
  }

  // ---- RIBBONS: slash and bolt -----------------------------------------
  // Both are a strip of quads whose WIDTH varies along the run, so the shape
  // comes to a real point instead of ending in a blunt cap. A constant-radius
  // tube cannot do that — it reads as a noodle laid on the floor, which is
  // exactly what a torus-based "slash" looked like.
  const RIB_ST = 14;                     // stations along the ribbon
  function makeRibbon() {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(RIB_ST * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const idx = [];
    for (let i = 0; i < RIB_ST - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setIndex(idx);
    return { g, pos };
  }

  const MAX_RIBBONS = 8;
  const ribbons = [];
  for (let i = 0; i < MAX_RIBBONS; i++) {
    const { g, pos } = makeRibbon();
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    ribbons.push({ mesh, m, g, pos, t: 0, dur: 0 });
  }
  let ribCursor = 0;

  function takeRibbon(colorHex, dur) {
    const r = ribbons[ribCursor]; ribCursor = (ribCursor + 1) % MAX_RIBBONS;
    r.m.color.set(colorHex);
    r.t = dur; r.dur = dur;
    r.mesh.visible = true;
    return r;
  }

  /**
   * A crescent sweep. Width follows sin(t*PI), so it is fat through the middle
   * of the swing and comes to nothing at both tips — the shape a blade leaves,
   * rather than a segment of a ring with two blunt ends.
   */
  function slash(pos, facing, colorHex, radius = 2.4, arc = Math.PI * 0.85, dur = 0.3) {
    const r = takeRibbon(colorHex, dur);
    const p = r.pos;
    for (let i = 0; i < RIB_ST; i++) {
      const t = i / (RIB_ST - 1);
      const a = facing - arc / 2 + arc * t;
      const w = Math.sin(t * Math.PI) * 0.42 + 0.04;   // taper to points
      const ri = radius - w * 0.5, ro = radius + w * 0.5;
      const sx = Math.sin(a), cz = Math.cos(a);
      // a slight lift through the middle so it is not glued flat to the floor
      const y = pos.y + 0.55 + Math.sin(t * Math.PI) * 0.5;
      p[i * 6 + 0] = pos.x + sx * ri; p[i * 6 + 1] = y; p[i * 6 + 2] = pos.z + cz * ri;
      p[i * 6 + 3] = pos.x + sx * ro; p[i * 6 + 4] = y; p[i * 6 + 5] = pos.z + cz * ro;
    }
    r.g.attributes.position.needsUpdate = true;
    r.g.computeBoundingSphere();
  }

  /**
   * A jagged line from A to B. The lateral offset is pseudo-random per station
   * but SEEDED off the endpoints, so the same cast draws the same bolt on every
   * machine — and two bolts fired at once do not sit on top of each other.
   */
  function bolt(from, to, colorHex, dur = 0.22, jag = 0.55) {
    const r = takeRibbon(colorHex, dur);
    const p = r.pos;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len, pz = dx / len;              // perpendicular, in-plane
    const seed = Math.abs(Math.round(from.x * 7 + to.z * 13)) % 97;
    for (let i = 0; i < RIB_ST; i++) {
      const t = i / (RIB_ST - 1);
      // ends pinned, middle allowed to wander
      const wob = Math.sin(t * Math.PI) * jag * (((seed + i * 41) % 21) / 10 - 1);
      const w = (0.16 + Math.sin(t * Math.PI) * 0.1) * (1 - t * 0.55);   // thins toward the target
      const cx = from.x + dx * t + px * wob;
      const cy = from.y + dy * t + Math.sin(t * Math.PI) * 0.25;
      const cz2 = from.z + dz * t + pz * wob;
      p[i * 6 + 0] = cx - px * w; p[i * 6 + 1] = cy; p[i * 6 + 2] = cz2 - pz * w;
      p[i * 6 + 3] = cx + px * w; p[i * 6 + 4] = cy; p[i * 6 + 5] = cz2 + pz * w;
    }
    r.g.attributes.position.needsUpdate = true;
    r.g.computeBoundingSphere();
  }

  // ---- GROUND DECALS ------------------------------------------------------
  //
  // The thing every skill was missing. A cast was particles in mid-air and
  // nothing else, so it never belonged to a PLACE -- which is what "gak terarah"
  // means: you cannot tell from the screen where the skill is happening or how
  // far it reaches. In every game this is being compared to, the floor is where
  // a skill is announced: a bright glyph marks the ground, and the particles are
  // the garnish on top of it.
  //
  // Painted once per kind and shared. Additive with `polygonOffset`, the same
  // treatment the world's lantern light-pools use, so it lies ON the ground
  // instead of z-fighting into a hard painted circle.
  const decalTex = {};
  function decalTexture(kind) {
    if (decalTex[kind]) return decalTex[kind];
    const N = 128, cv2 = document.createElement('canvas');
    cv2.width = cv2.height = N;
    const c = cv2.getContext('2d');
    const R = N / 2;
    c.translate(R, R);
    const soft = (r0, r1, a0) => {
      const gr = c.createRadialGradient(0, 0, r0, 0, 0, r1);
      gr.addColorStop(0, `rgba(255,255,255,${a0})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r1, 0, 6.283); c.fill();
    };
    c.lineCap = 'round';
    if (kind === 'rune') {
      soft(0, R * 0.9, 0.16);
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R * 0.86, 0, 6.283); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 0.66, 0, 6.283); c.stroke();
      // notches round the outer band, and a triangle inside: it has to look
      // WRITTEN, not printed, or it is just another circle
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * 6.283;
        c.lineWidth = i % 3 === 0 ? 4 : 2;
        c.beginPath();
        c.moveTo(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68);
        c.lineTo(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84);
        c.stroke();
      }
      c.lineWidth = 2.5; c.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -1.5708 + (i / 3) * 6.283;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5);
      }
      c.closePath(); c.stroke();
    } else if (kind === 'crack') {
      soft(0, R * 0.7, 0.3);
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * 6.283 + Math.random() * 0.2;
        c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(0, 0);
        let x = 0, y = 0;
        for (let k = 0; k < 4; k++) {
          const step = R * 0.24 * (0.7 + Math.random() * 0.6);
          const aa = a + (Math.random() - 0.5) * 0.5;
          x += Math.cos(aa) * step; y += Math.sin(aa) * step;
          c.lineWidth *= 0.72;
          c.lineTo(x, y);
        }
        c.stroke();
      }
    } else {                                    // 'ring' — the default
      soft(0, R * 0.95, 0.14);
      c.strokeStyle = 'rgba(255,255,255,1)';
      c.lineWidth = 7; c.beginPath(); c.arc(0, 0, R * 0.78, 0, 6.283); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 0.6, 0, 6.283); c.stroke();
    }
    const t = new THREE.CanvasTexture(cv2);
    decalTex[kind] = t;
    return t;
  }

  const MAX_DECALS = 8;
  const decals = [];
  for (let i = 0; i < MAX_DECALS; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    decals.push({ mesh, m, t: 0, dur: 1, from: 1, to: 1, spin: 0 });
  }
  let decalCursor = 0;

  /**
   * Mark the ground. `grow` 0 holds its size (a glyph), >0 expands it (a blast).
   * @param kind 'ring' | 'rune' | 'crack'
   */
  function decal(pos, colorHex, radius = 3, dur = 0.6, kind = 'ring', grow = 0) {
    const d = decals[decalCursor]; decalCursor = (decalCursor + 1) % MAX_DECALS;
    d.m.map = decalTexture(kind);
    d.m.color.set(colorHex);
    d.m.needsUpdate = true;
    d.t = dur; d.dur = dur;
    d.from = grow ? radius * 0.35 : radius;
    d.to = grow ? radius : radius;
    d.spin = kind === 'rune' ? (Math.random() < 0.5 ? 1 : -1) : 0;
    d.mesh.position.set(pos.x, pos.y + 0.06, pos.z);
    d.mesh.rotation.z = Math.random() * 6.283;
    d.mesh.visible = true;
  }

  function update(dt) {
    for (const d of decals) {
      if (d.t <= 0) { d.mesh.visible = false; continue; }
      d.t -= dt;
      const k = 1 - Math.max(0, d.t / d.dur);
      const sz = d.from + (d.to - d.from) * (1 - (1 - k) * (1 - k));
      d.mesh.scale.set(sz * 2, sz * 2, 1);
      d.mesh.rotation.z += dt * 1.1 * d.spin;
      // snap in, linger, then fall away -- a decal that fades symmetrically
      // never has a moment of being simply THERE
      d.m.opacity = k < 0.12 ? k / 0.12 : 0.95 * (1 - (k - 0.12) / 0.88);
    }

    for (const L of layers) {
      const { pool, pos, col, cap } = L;
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (p.life <= 0) { pos[i * 3 + 1] = -999; continue; }
        p.life -= dt;
        p.vy -= p.grav * dt;
        // DRAG. Without it a spark travels at full speed right up to the frame
        // it disappears, which is what makes a burst look like it was switched
        // off rather than like it settled.
        if (p.drag) {
          const k = Math.max(0, 1 - p.drag * dt);
          p.vx *= k; p.vz *= k; p.vy *= (1 - (p.drag * 0.35) * dt);
        }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        // AND THEY FADE. The colour used to be written at full strength every
        // frame and the particle then vanished the instant its life ran out --
        // a hard pop, on every spark in the game. Under additive blending
        // dimming the colour IS the fade, so this costs three multiplies:
        // a fast fade-in over the first tenth, then an eased fade-out.
        const t = Math.max(0, p.life / p.life0);
        const a = t > 0.9 ? (1 - t) * 10 : t * t * (3 - 2 * t) / 0.729;
        const f = Math.min(1, a);
        col[i * 3] = p.r * f; col[i * 3 + 1] = p.g * f; col[i * 3 + 2] = p.b * f;
      }
      L.g.attributes.position.needsUpdate = true;
      L.g.attributes.color.needsUpdate = true;
    }

    for (const r of rings) {
      if (r.t <= 0) { r.mesh.visible = false; continue; }
      r.t -= dt;
      const k = 1 - Math.max(0, r.t / r.dur); // 0..1
      const s = r.from + (r.to - r.from) * (1 - (1 - k) * (1 - k)); // ease-out
      r.mesh.scale.setScalar(s);
      r.m.opacity = 0.75 * (1 - k);
    }

    for (const f of flashes) {
      if (f.t <= 0) { f.L.intensity = 0; continue; }
      f.t -= dt;
      f.L.intensity = f.peak * Math.max(0, f.t / f.dur);
    }

    for (const r of runes) {
      if (r.t <= 0) { r.mesh.visible = false; continue; }
      r.t -= dt;
      const k = 1 - Math.max(0, r.t / r.dur); // 0..1
      const grow = 0.4 + 0.6 * (1 - (1 - k) * (1 - k));
      r.mesh.scale.setScalar(r.size * grow);
      r.mesh.rotation.z += dt * 2.6 * r.spin;
      r.m.opacity = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
    }

    // BEAM: snaps to full height in the first eighth of its life and then only
    // fades. A column that grows over its whole duration reads as a lift rising
    // out of the floor; an arrival has to already be there by the time you look.
    for (const b of beams) {
      if (b.t <= 0) { b.g.visible = false; continue; }
      b.t -= dt;
      const k = 1 - Math.max(0, b.t / b.dur);
      const rise = Math.min(1, k / 0.12);
      const fade = k < 0.12 ? 1 : 1 - (k - 0.12) / 0.88;
      b.g.scale.set(b.r * (1 + k * 0.35), b.h * rise, b.r * (1 + k * 0.35));
      b.g.position.y = b.g.position.y;             // base stays on the floor
      b.shell.position.y = 0.5;
      b.core.position.y = 0.5;
      b.shellM.opacity = 0.55 * fade;
      b.coreM.opacity = 0.9 * fade * fade;
      b.g.rotation.y += dt * 1.4;
    }

    // SPIKES: each shard runs its own delayed punch-and-sink.
    for (const s of spikeSets) {
      if (s.t <= 0) { s.g.visible = false; continue; }
      s.t -= dt;
      const k = 1 - Math.max(0, s.t / s.dur);
      s.m.opacity = 0.85 * (k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5);
      for (const p2 of s.parts) {
        if (!p2.mesh.visible) continue;
        const kk = Math.max(0, Math.min(1, (k - p2.delay) / (1 - p2.delay)));
        // out fast, back slow — the asymmetry is what reads as impact
        const up = kk < 0.3 ? kk / 0.3 : 1 - (kk - 0.3) / 0.7 * 0.35;
        p2.mesh.scale.set(1, p2.h * up, 1);
        p2.mesh.position.y = p2.h * up * 0.5 - 0.25;
      }
    }

    // RIBBONS: slash and bolt both just fade; their shape is already final.
    for (const r of ribbons) {
      if (r.t <= 0) { r.mesh.visible = false; continue; }
      r.t -= dt;
      const k = 1 - Math.max(0, r.t / r.dur);
      r.m.opacity = k < 0.14 ? k / 0.14 : 1 - (k - 0.14) / 0.86;
    }
  }

  return { burst, fountain, ring, shockwave, flash, runeCircle,
           beam, spikes, slash, bolt, decal, update };
}
