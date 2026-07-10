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

  function update(playerPos, facing, enemies) {
    const px = playerPos.x + S / 2, pz = playerPos.z + S / 2;
    ctx.fillStyle = '#10160f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = Math.max(0, Math.min(S - VIEW, px - VIEW / 2));
    const sz = Math.max(0, Math.min(S - VIEW, pz - VIEW / 2));
    ctx.drawImage(base, sx, sz, VIEW, VIEW, 0, 0, canvas.width, canvas.height);

    const k = canvas.width / VIEW;
    // titik musuh
    ctx.fillStyle = '#d1372c';
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = (e.mesh.position.x + S / 2 - sx) * k;
      const ez = (e.mesh.position.z + S / 2 - sz) * k;
      if (ex < 0 || ez < 0 || ex > canvas.width || ez > canvas.height) continue;
      ctx.fillRect(ex - 1.5, ez - 1.5, 3, 3);
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

  return { update };
}
