// Minimap: peta dasar dirender sekali, tiap frame crop mengikuti player + panah arah.
import { WATER_LEVEL } from '../world/terrain.js';

const TYPE_COLOR = {
  0: '#5e9448', 1: '#b3925c', 2: '#8a654a', 3: '#8d9294', 4: '#568a42', 5: '#41a0c8', 6: '#6aa84f',
};

export function createMinimap(canvas, terrain, decor) {
  const S = terrain.size;
  const base = document.createElement('canvas');
  base.width = S; base.height = S;
  const bctx = base.getContext('2d');

  for (let iz = 0; iz < S; iz++) {
    for (let ix = 0; ix < S; ix++) {
      const i = terrain.idx(ix, iz);
      const h = terrain.height[i];
      let col;
      if (h <= WATER_LEVEL) col = h <= WATER_LEVEL - 2 ? '#2f7fa6' : '#41a0c8';
      else col = TYPE_COLOR[terrain.type[i]] || '#5e9448';
      bctx.fillStyle = col;
      bctx.fillRect(ix, iz, 1, 1);
      // shading ketinggian ringan
      if (h > WATER_LEVEL) {
        bctx.fillStyle = `rgba(${h > 7 ? '255,255,255' : '0,0,0'},${Math.abs(h - 5) * 0.03})`;
        bctx.fillRect(ix, iz, 1, 1);
      }
    }
  }
  // titik pohon
  bctx.fillStyle = '#2c4230';
  for (const t of decor.trees) {
    bctx.fillRect(Math.floor(t.x + S / 2), Math.floor(t.z + S / 2), 1, 1);
  }

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const VIEW = 64; // sel yang terlihat

  function update(playerPos, facing, enemies, extras = null) {
    const px = playerPos.x + S / 2, pz = playerPos.z + S / 2;
    ctx.fillStyle = '#10160f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = Math.max(0, Math.min(S - VIEW, px - VIEW / 2));
    const sz = Math.max(0, Math.min(S - VIEW, pz - VIEW / 2));
    ctx.drawImage(base, sx, sz, VIEW, VIEW, 0, 0, canvas.width, canvas.height);

    const k = canvas.width / VIEW;
    // enemy dots
    ctx.fillStyle = '#d1372c';
    for (const e of enemies) {
      if (e.dead || e.isWorldBoss) continue;
      const ex = (e.mesh.position.x + S / 2 - sx) * k;
      const ez = (e.mesh.position.z + S / 2 - sz) * k;
      if (ex < 0 || ez < 0 || ex > canvas.width || ez > canvas.height) continue;
      ctx.fillRect(ex - 1.5, ez - 1.5, 3, 3);
    }
    // village (basecamp) marker: little gold house, clamped to the edge so
    // you can always walk back home
    {
      let hx = (terrain.spawn.x + S / 2 - sx) * k;
      let hz = (terrain.spawn.z + S / 2 - sz) * k;
      hx = Math.max(7, Math.min(canvas.width - 7, hx));
      hz = Math.max(7, Math.min(canvas.height - 7, hz));
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(hx - 3, hz - 1, 6, 4);
      ctx.beginPath();
      ctx.moveTo(hx - 5, hz - 1); ctx.lineTo(hx, hz - 6); ctx.lineTo(hx + 5, hz - 1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5e3c10';
      ctx.strokeRect(hx - 3, hz - 1, 6, 4);
    }
    // land parcels & your built houses (so home is easy to find)
    if (extras?.lands) {
      for (const l of extras.lands) {
        let lx = (l.x + S / 2 - sx) * k, lz = (l.z + S / 2 - sz) * k;
        const off = lx < 4 || lz < 4 || lx > canvas.width - 4 || lz > canvas.height - 4;
        lx = Math.max(6, Math.min(canvas.width - 6, lx));
        lz = Math.max(6, Math.min(canvas.height - 6, lz));
        if (l.built) { // your home — bright gold house icon
          ctx.fillStyle = '#ffd23e';
          ctx.fillRect(lx - 2.5, lz - 1, 5, 4);
          ctx.beginPath();
          ctx.moveTo(lx - 4, lz - 1); ctx.lineTo(lx, lz - 5); ctx.lineTo(lx + 4, lz - 1);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#5e3c10'; ctx.lineWidth = 1; ctx.strokeRect(lx - 2.5, lz - 1, 5, 4);
        } else { // for-sale plot — hollow amber diamond
          ctx.strokeStyle = l.owned ? '#a8e06a' : '#c8b060';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(lx, lz - 3.5); ctx.lineTo(lx + 3.5, lz); ctx.lineTo(lx, lz + 3.5); ctx.lineTo(lx - 3.5, lz);
          ctx.closePath(); ctx.stroke();
        }
      }
    }
    // world boss: big pulsing gold marker, clamped to the map edge if far
    for (const e of enemies) {
      if (e.dead || !e.isWorldBoss) continue;
      let ex = (e.mesh.position.x + S / 2 - sx) * k;
      let ez = (e.mesh.position.z + S / 2 - sz) * k;
      ex = Math.max(6, Math.min(canvas.width - 6, ex));
      ez = Math.max(6, Math.min(canvas.height - 6, ez));
      const pulse = 4 + Math.sin(performance.now() / 180) * 1.5;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(ex, ez - pulse); ctx.lineTo(ex + pulse, ez);
      ctx.lineTo(ex, ez + pulse); ctx.lineTo(ex - pulse, ez);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5e3c10';
      ctx.stroke();
    }
    // panah player
    const cx = (px - sx) * k, cz = (pz - sz) * k;
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(-facing);
    ctx.fillStyle = '#f0f0e0';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-4.5, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  return { update, base };
}
