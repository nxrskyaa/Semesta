// World Map overlay (N key / tap the minimap) — the whole island at a glance:
// village, rest camps, land for sale, quest-giving villagers, world bosses,
// and you. No more getting lost on the way home.
import { WORLD_SIZE } from '../world/terrain.js';

const CSS = `
#worldmap {
  position: fixed; inset: 0; z-index: 60; display: none;
  background: rgba(6, 9, 6, 0.82);
  align-items: center; justify-content: center; flex-direction: column;
  pointer-events: auto;
}
#worldmap.show { display: flex; animation: wm-in 0.15s; }
@keyframes wm-in { from { opacity: 0; } }
#worldmap .frame {
  background: linear-gradient(180deg, var(--panel-1), var(--panel-2));
  border: 2px solid var(--line);
  box-shadow: inset 0 0 0 1px var(--gold-glow), 0 0 0 1px var(--ink);
  clip-path: var(--cut);
  padding: 14px;
}
#worldmap h3 {
  font-size: 14px; letter-spacing: 4px; color: var(--gold); margin-bottom: 10px;
  text-align: center;
}
#worldmap canvas {
  display: block; image-rendering: pixelated;
  width: min(70vh, calc(100vw - 60px), 520px);
  height: min(70vh, calc(100vw - 60px), 520px);
  border: 1px solid var(--line-soft);
}
#worldmap .legend {
  display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;
  margin-top: 10px; font-size: 9px; color: var(--muted); letter-spacing: 1px;
}
#worldmap .legend span b { font-size: 11px; margin-right: 4px; }
#worldmap .hint { text-align: center; font-size: 9px; color: var(--muted); margin-top: 8px; letter-spacing: 2px; }
#worldmap .frame { position: relative; }
#worldmap .wm-close {
  position: absolute; top: 8px; right: 8px; width: 34px; height: 34px; cursor: pointer;
  font-family: inherit; font-size: 15px; color: #ffd8d0; border: 0;
  background: linear-gradient(180deg, #5a2622, #3a1a16);
  box-shadow: 0 0 0 2px #c88, 0 0 0 4px var(--ink);
}
#worldmap .wm-close:hover { filter: brightness(1.3); }
#worldmap canvas { cursor: crosshair; }
`;

export function createWorldMap({ minimap, terrain }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'worldmap';
  root.innerHTML = `
    <div class="frame">
      <h3>◆ WORLD MAP ◆</h3>
      <button class="wm-close">✕</button>
      <canvas width="480" height="480"></canvas>
      <div class="legend">
        <span><b style="color:#ffe27a">⌂</b>Village</span>
        <span><b style="color:#a8e06a">$</b>Shop</span>
        <span><b style="color:#f0a8c8">◈</b>Gacha</span>
        <span><b style="color:#e8a35d">⚒</b>Forge</span>
        <span><b style="color:#8ac86a">▲</b>Rest Camp</span>
        <span><b style="color:#6ad0e8">⚓</b>Fish Dock</span>
        <span><b style="color:#5ad8a8">≈</b>Island</span>
        <span><b style="color:#ff9a5e">⛵</b>Marina</span>
        <span><b style="color:#f0c455">⌂</b>Your Home</span>
        <span><b style="color:#c8b494">◎</b>Land</span>
        <span><b style="color:#ffd23e">◆</b>Boss</span>
        <span><b style="color:#ff8a5e">⚑</b>Your Mark</span>
        <span><b style="color:#f0f0e0">▸</b>You</span>
      </div>
      <div class="hint">TAP THE MAP TO DROP A ⚑ MARK (TAP IT AGAIN TO CLEAR) · [N] / ✕ CLOSES</div>
    </div>
  `;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const S = WORLD_SIZE;
  let open = false;
  let refs = null; // { player, npcs, camps, lands, enemies, quests }
  let pin = null;  // { x, z } — player-placed waypoint mark

  // click the dimmed backdrop or ✕ to close; clicking the MAP drops a mark
  root.addEventListener('click', (e) => { if (e.target === root) hide(); });
  root.querySelector('.wm-close').addEventListener('click', () => hide());
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) / r.width) * S - S / 2;
    const wz = ((e.clientY - r.top) / r.height) * S - S / 2;
    // tapping on (or near) the current mark clears it
    if (pin && Math.hypot(pin.x - wx, pin.z - wz) < 7) pin = null;
    else pin = { x: wx, z: wz };
    draw();
  });

  function toXY(wx, wz) {
    return [((wx + S / 2) / S) * canvas.width, ((wz + S / 2) / S) * canvas.height];
  }

  function draw() {
    if (!open || !refs) return;
    ctx.drawImage(minimap.base, 0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    // rest camps
    ctx.font = 'bold 15px monospace';
    for (const c of refs.camps.camps) {
      const [x, y] = toXY(c.x, c.z);
      ctx.fillStyle = '#0a0f0a'; ctx.fillText('▲', x + 1, y + 1);
      ctx.fillStyle = '#8ac86a'; ctx.fillText('▲', x, y);
    }
    // land plots / built homes — big glyphs with a text label so your home is
    // impossible to miss
    for (const l of refs.lands.lands) {
      const [x, y] = toXY(l.x, l.z);
      if (l.built) {
        const pulse = 22 + Math.sin(performance.now() / 300) * 2;
        ctx.font = `bold ${pulse}px monospace`;
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('⌂', x + 1.5, y + 1.5);
        ctx.fillStyle = '#ffd23e'; ctx.fillText('⌂', x, y);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('YOUR HOME', x + 1, y + 13);
        ctx.fillStyle = '#ffe9a8'; ctx.fillText('YOUR HOME', x, y + 12);
      } else {
        // the one buildable plot in the world — it is always yours, so it is
        // never advertised for sale
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('⌂', x + 1, y + 1);
        ctx.fillStyle = '#a8e06a';
        ctx.fillText('⌂', x, y);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('HOMESTEAD', x + 1, y + 12);
        ctx.fillStyle = '#c8e8a8';
        ctx.fillText('HOMESTEAD', x, y + 11);
      }
      ctx.font = 'bold 15px monospace';
    }
    // villagers with quests get a gold !
    ctx.font = 'bold 13px monospace';
    for (const n of refs.npcs.npcs) {
      const [x, y] = toXY(n.mesh.position.x, n.mesh.position.z);
      ctx.fillStyle = '#e8e4d0';
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      if (n.questMark) {
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('!', x + 1, y - 3);
        ctx.fillStyle = '#ffd23e'; ctx.fillText('!', x, y - 4);
      }
    }
    // lakeside fish markets
    if (refs.docks) {
      ctx.font = 'bold 14px monospace';
      for (const d of refs.docks) {
        const [x, y] = toXY(d.x, d.z);
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('⚓', x + 1, y + 1);
        ctx.fillStyle = '#6ad0e8'; ctx.fillText('⚓', x, y);
      }
    }
    // the archipelago: named islands out at sea + the marina you launch from
    if (refs.isles) {
      ctx.font = 'bold 15px monospace';
      for (const isl of refs.isles.islands) {
        const [x, y] = toXY(isl.x, isl.z);
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('≈', x + 1, y + 1);
        ctx.fillStyle = '#5ad8a8'; ctx.fillText('≈', x, y);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#0a0f0a'; ctx.fillText(isl.name.toUpperCase(), x - 16, y + 13);
        ctx.fillStyle = '#bff0dc'; ctx.fillText(isl.name.toUpperCase(), x - 17, y + 12);
        ctx.font = 'bold 15px monospace';
      }
      if (refs.isles.marina) {
        const [x, y] = toXY(refs.isles.marina.x, refs.isles.marina.z);
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('⛵', x + 1, y + 1);
        ctx.fillStyle = '#ff9a5e'; ctx.fillText('⛵', x, y);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#0a0f0a'; ctx.fillText('MARINA', x - 12, y + 13);
        ctx.fillStyle = '#ffd0b0'; ctx.fillText('MARINA', x - 13, y + 12);
      }
    }
    // shop, gacha & forge landmarks in the village
    ctx.font = 'bold 13px monospace';
    const landmark = (spot, glyph, col) => {
      if (!spot) return;
      const [x, y] = toXY(spot.x, spot.z);
      ctx.fillStyle = '#0a0f0a'; ctx.fillText(glyph, x + 1, y + 1);
      ctx.fillStyle = col; ctx.fillText(glyph, x, y);
    };
    landmark(refs.npcs.stallSpot, '$', '#a8e06a');
    landmark(refs.npcs.gachaSpot, '◈', '#f0a8c8');
    landmark(refs.npcs.forgeSpot, '⚒', '#e8a35d');
    // village
    ctx.font = 'bold 20px monospace';
    const [vx, vy] = toXY(terrain.spawn.x, terrain.spawn.z);
    ctx.fillStyle = '#0a0f0a'; ctx.fillText('⌂', vx + 1, vy + 1);
    ctx.fillStyle = '#ffe27a'; ctx.fillText('⌂', vx, vy);
    // world bosses
    for (const e of refs.enemies) {
      if (e.dead || !e.isWorldBoss) continue;
      const [x, y] = toXY(e.mesh.position.x, e.mesh.position.z);
      const pulse = 16 + Math.sin(performance.now() / 160) * 3;
      ctx.font = `bold ${pulse}px monospace`;
      ctx.fillStyle = '#0a0f0a'; ctx.fillText('◆', x + 1, y + 1);
      ctx.fillStyle = '#ffd23e'; ctx.fillText('◆', x, y);
    }
    // player-placed mark: bouncing flag + ping ring
    if (pin) {
      const [x, y] = toXY(pin.x, pin.z);
      const t = performance.now() / 1000;
      const ring = 6 + ((t % 1.2) / 1.2) * 14;
      ctx.strokeStyle = `rgba(255,138,94,${1 - (t % 1.2) / 1.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
      const bob = Math.sin(t * 5) * 2;
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#0a0f0a'; ctx.fillText('⚑', x + 1.5, y - 3 + bob + 1.5);
      ctx.fillStyle = '#ff8a5e'; ctx.fillText('⚑', x, y - 3 + bob);
      ctx.font = 'bold 15px monospace';
    }
    // player arrow
    const p = refs.player.state;
    const [px, py] = toXY(p.pos.x, p.pos.z);
    // SAME 180-DEGREE FAULT THE MINIMAP ALREADY FIXED, and it survived here
    // because this file draws its own arrow. `toXY` maps world z straight to
    // canvas y exactly as the minimap does, the tip is authored at (0,-1) —
    // canvas UP — and `rotate(-facing)` sends it to (-sin f, -cos f), which is
    // the exact negative of the heading (sin f, cos f). Checked against all
    // four cardinals: every one pointed backwards. The correct angle is
    // PI - facing, for the reason spelled out in minimap.js.
    //
    // The casing is a stroke under the fill rather than the old offset shadow:
    // an offset only darkens two edges, so the arrow still merged into pale
    // ground — the snow biome and the beaches — on the side the offset missed.
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI - p.facing);
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 6); ctx.lineTo(0, 2.5); ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a0f0a';
    ctx.stroke();
    ctx.fillStyle = '#fdfbef';
    ctx.fill();
    ctx.restore();
  }

  function show(r) {
    refs = r;
    open = true;
    root.classList.add('show');
    draw();
  }
  function hide() {
    open = false;
    root.classList.remove('show');
  }
  function toggle(r) {
    if (open) hide(); else show(r);
    return open;
  }

  // light periodic refresh while open (player/boss move, pin ping animates)
  setInterval(() => { if (open) draw(); }, 120);

  return {
    show, hide, toggle, isOpen: () => open,
    getPin: () => pin, clearPin: () => { pin = null; },
    // used by the quest tracker: clicking a quest marks its objective, which is
    // the same beacon a hand-placed map pin drives
    setPin: (x, z) => { pin = { x, z }; },
  };
}
