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
      <canvas width="480" height="480"></canvas>
      <div class="legend">
        <span><b style="color:#ffe27a">⌂</b>Village</span>
        <span><b style="color:#8ac86a">▲</b>Rest Camp</span>
        <span><b style="color:#f0c455">◎</b>Land / Home</span>
        <span><b style="color:#ffd23e">!</b>Quest</span>
        <span><b style="color:#ffd23e">◆</b>World Boss</span>
        <span><b style="color:#f0f0e0">▸</b>You</span>
      </div>
      <div class="hint">[N] OR TAP MAP TO CLOSE</div>
    </div>
  `;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const S = WORLD_SIZE;
  let open = false;
  let refs = null; // { player, npcs, camps, lands, enemies, quests }

  root.addEventListener('click', () => hide());

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
    // land plots / built homes
    for (const l of refs.lands.lands) {
      const [x, y] = toXY(l.x, l.z);
      ctx.fillStyle = '#0a0f0a'; ctx.fillText(l.built ? '⌂' : '◎', x + 1, y + 1);
      ctx.fillStyle = l.built ? '#f0c455' : (l.owned ? '#c8dc6a' : '#c8b494');
      ctx.fillText(l.built ? '⌂' : '◎', x, y);
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
    // player arrow
    const p = refs.player.state;
    const [px, py] = toXY(p.pos.x, p.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-p.facing);
    ctx.fillStyle = '#0a0f0a';
    ctx.beginPath();
    ctx.moveTo(1, -8); ctx.lineTo(7, 7); ctx.lineTo(1, 3.5); ctx.lineTo(-5, 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0f0e0';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 6); ctx.lineTo(0, 2.5); ctx.lineTo(-6, 6);
    ctx.closePath(); ctx.fill();
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

  // light periodic refresh while open (player/boss move)
  setInterval(() => { if (open) draw(); }, 400);

  return { show, hide, toggle, isOpen: () => open };
}
