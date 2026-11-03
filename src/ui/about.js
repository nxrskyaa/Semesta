// Shared "About" content — used by both the main-menu modal and the in-game
// panel so the credits & Rialo badge stay identical everywhere.
//
// It was a heading, two sentences, three name rows and a QR — accurate, and
// the least designed screen in a game that is otherwise all pixel art. It is a
// small page now: a painted night-sky banner with the logo, the game's own
// numbers COUNTED from its data tables (so they can never drift from what is
// actually in the build), team cards with generated pixel avatars, what it is
// made with, the play-here QR, the Rialo badge and the live season.
//
// Its CSS is injected once into the document by `paintAboutRialo`, so the two
// surfaces cannot disagree about how it looks.
import { paintRialoMark } from '../world/landmarks.js';
import { makeQrCanvas } from '../gfx/qr.js';
import { SKILLS } from '../systems/skills.js';
import { ENEMY_TYPES, WORLD_BOSSES } from '../entities/enemies.js';
import { PET_DEFS } from '../systems/pets.js';
import { MOUNT_DEFS } from '../systems/mounts.js';
import { ITEMS } from '../systems/items.js';
import { ADVANCED_CLASSES } from '../systems/classes.js';
import { MAX_FLOOR } from '../systems/dungeon.js';
import { seasonNow } from '../systems/gamepass.js';

export const TEAM = [
  { name: 'Nxrskyaa', role: 'GAME DEVELOPER', x: 'https://x.com/nxrskyaa', hue: 42 },
  { name: 'Dikzzy', role: 'GAME TESTER & BUG HUNTER', x: 'https://x.com/diikzzyy__', hue: 190 },
  { name: 'Baster', role: 'TECHNICAL GAME DEVELOPER', x: 'https://x.com/Bas_Basterx', hue: 285 },
];

/** Where the built game lives. The QR in About points here. */
export const GAME_URL = 'https://semesta-gray.vercel.app/';

/** The build in numbers, counted from the tables themselves. */
function counts() {
  const n = (o) => Object.keys(o || {}).length;
  try {
    const fish = Object.values(ITEMS).filter((d) => d.fish).length;
    const wear = Object.values(ITEMS).filter((d) => d.cosmetic).length;
    return [
      [ADVANCED_CLASSES.length + 1, 'CLASSES'],
      [n(SKILLS), 'SKILLS'],
      [n(ENEMY_TYPES), 'MONSTERS'],
      [n(WORLD_BOSSES), 'BOSSES'],
      [MAX_FLOOR, 'HOLLOW FLOORS'],
      [n(PET_DEFS), 'PETS'],
      [n(MOUNT_DEFS), 'MOUNTS'],
      [fish, 'FISH'],
      [wear, 'WEARABLES'],
      [0, 'ASSET FILES'],
    ];
  } catch {
    return [[0, 'ASSET FILES']];
  }
}

// inner HTML for an About card. `logoSrc` is the cleaned Semesta logo data-URL
// (menu) or empty (in-game panel, which shows the wordmark instead).
export function aboutInner(logoSrc) {
  const members = TEAM.map((m) => `
    <div class="ab-mem" style="--h:${m.hue}">
      <canvas class="ab-av" width="16" height="16" data-name="${m.name}" data-hue="${m.hue}"></canvas>
      <div class="ab-who"><b>${m.name}</b><small>${m.role}</small></div>
      <a class="ab-x" href="${m.x}" target="_blank" rel="noopener">𝕏 FOLLOW</a>
    </div>`).join('');
  const stats = counts().map(([v, k]) => `<div class="ab-st"><b>${v}</b><small>${k}</small></div>`).join('');
  let season = '';
  try { const S = seasonNow(); season = `SEASON ${S.number} · ${S.name}`; } catch { /* no season: no line */ }
  const tech = ['three.js', 'WebAudio', '16px canvas', 'Vite', 'Supabase', 'zero asset files']
    .map((t) => `<span>${t}</span>`).join('');
  return `
    <div class="ab">
      <div class="ab-hero">
        <canvas class="ab-sky" width="240" height="96"></canvas>
        ${logoSrc ? `<img class="ab-logo" src="${logoSrc}" alt="Semesta">` : '<div class="ab-word">SEMESTA</div>'}
        <div class="ab-tag">A COZY VOXEL ACTION RPG · ANAVELA UNIVERSE</div>
      </div>
      <p class="ab-blurb">Every texture, sound, creature and spell in here is made by code —
        no asset packs, no audio files, just pixels, maths and vibes.</p>
      <div class="ab-stats">${stats}</div>
      <div class="ab-sec"><i></i>THE TEAM<i></i></div>
      <div class="ab-team">${members}</div>
      <div class="ab-sec"><i></i>MADE WITH<i></i></div>
      <div class="ab-tech">${tech}</div>
      <div class="playqr">
        <canvas class="qr-about"></canvas>
        <div class="qrtext">
          <b>PLAY IT NOW</b>
          <small>Point a phone camera at this square — it opens the game, no install.</small>
          <a class="qrlink" href="${GAME_URL}" target="_blank" rel="noopener">${GAME_URL.replace(/^https?:\/\//, '')}</a>
        </div>
      </div>
      <div class="rialo-badge">
        <canvas class="rlogo-about" width="44" height="44"></canvas>
        <span>BUILD FOR RIALO</span>
      </div>
      ${season ? `<div class="ab-foot">${season}</div>` : ''}
    </div>`;
}

/** A night sky over Anavela's hills, with lanterns rising — painted once. */
function paintSky(cv) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#120e2a'); sky.addColorStop(0.6, '#2c2050'); sky.addColorStop(1, '#5a3a5e');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  let s = 11;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(255,255,240,${0.3 + rnd() * 0.7})`;
    g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H * 0.7), 1, 1);
  }
  // moon
  const mx = W * 0.82, my = H * 0.26;
  const glow = g.createRadialGradient(mx, my, 2, mx, my, 26);
  glow.addColorStop(0, 'rgba(255,240,200,0.5)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow; g.fillRect(mx - 30, my - 30, 60, 60);
  g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(mx, my, 7, 0, Math.PI * 2); g.fill();
  // two rows of hills
  for (const [y0, col, amp, f] of [[H * 0.74, '#2a1e3a', 7, 0.045], [H * 0.86, '#181226', 5, 0.07]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) g.lineTo(x, y0 - Math.sin(x * f) * amp - Math.sin(x * f * 2.3 + 1) * amp * 0.4);
    g.lineTo(W, H); g.fill();
  }
  // village windows on the near hill
  for (let i = 0; i < 9; i++) {
    g.fillStyle = 'rgba(255,200,110,0.9)';
    g.fillRect(Math.floor(W * 0.12 + rnd() * W * 0.4), Math.floor(H * 0.8 + rnd() * H * 0.08), 2, 1);
  }
  // sky lanterns drifting up
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W, y = H * 0.2 + rnd() * H * 0.5;
    const lg = g.createRadialGradient(x, y, 0, x, y, 5);
    lg.addColorStop(0, 'rgba(255,190,90,0.7)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg; g.fillRect(x - 6, y - 6, 12, 12);
    g.fillStyle = '#ffd38a'; g.fillRect(Math.floor(x), Math.floor(y), 2, 2);
  }
}

/** A little pixel portrait per member, seeded by their name. */
function paintAvatar(cv) {
  const g = cv.getContext('2d');
  const name = cv.dataset.name || '';
  const hue = Number(cv.dataset.hue) || 0;
  let s = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = `hsl(${hue},45%,22%)`; g.fillRect(0, 0, 16, 16);
  const hair = `hsl(${(hue + 180 + Math.floor(rnd() * 60)) % 360},${30 + Math.floor(rnd() * 40)}%,${20 + Math.floor(rnd() * 25)}%)`;
  const skin = ['#f2d0b0', '#e0b090', '#c89070', '#a87050'][Math.floor(rnd() * 4)];
  g.fillStyle = skin; g.fillRect(3, 4, 10, 9);                  // face
  g.fillStyle = hair; g.fillRect(2, 2, 12, 4); g.fillRect(2, 4, 2, 5); g.fillRect(12, 4, 2, 5);
  if (rnd() < 0.5) g.fillRect(4, 6, 3, 1);                        // fringe
  g.fillStyle = '#1a1418'; g.fillRect(5, 8, 2, 3); g.fillRect(9, 8, 2, 3);   // big eyes
  g.fillStyle = '#ffffff'; g.fillRect(5, 8, 1, 1); g.fillRect(9, 8, 1, 1);
  g.fillStyle = 'rgba(240,140,140,0.7)'; g.fillRect(4, 11, 1, 1); g.fillRect(11, 11, 1, 1);
  g.fillStyle = `hsl(${hue},60%,55%)`; g.fillRect(3, 13, 10, 3);  // collar in their colour
}

const ABOUT_CSS = `
  .ab { text-align: center; }
  .ab-hero { position: relative; height: 128px; margin: -2px 0 12px; overflow: hidden;
    box-shadow: inset 0 0 0 2px rgba(216,184,102,0.35), 0 4px 0 rgba(0,0,0,0.35); }
  .ab-sky { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
  .ab-logo { position: relative; max-width: 66%; max-height: 64px; margin-top: 16px; image-rendering: pixelated;
    filter: drop-shadow(0 3px 0 rgba(0,0,0,0.6)) drop-shadow(0 0 14px rgba(255,200,110,0.35)); }
  .ab-word { position: relative; margin-top: 26px; font-family: var(--font-display, monospace); font-size: 30px;
    letter-spacing: 8px; color: #fff3cf; text-shadow: 0 3px 0 #5e3c10, 0 0 18px rgba(255,200,110,0.6); }
  .ab-tag { position: absolute; left: 0; right: 0; bottom: 9px; font-family: var(--font-display, monospace);
    font-size: 8px; letter-spacing: 3px; color: #e9d8ff; text-shadow: 0 2px 0 #000; }
  .ab-blurb { font-size: 10px; line-height: 1.9; color: #cfd8c8; letter-spacing: 0.5px; margin: 0 6px 12px; }
  .ab-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-bottom: 14px; }
  .ab-st { padding: 7px 2px 6px; background: rgba(10,14,9,0.6); box-shadow: inset 0 0 0 1px rgba(216,184,102,0.2); }
  .ab-st b { display: block; font-family: var(--font-display, monospace); font-size: 16px; color: #ffe9b0;
    text-shadow: 0 2px 0 #5e3c10; }
  .ab-st small { display: block; margin-top: 3px; font-size: 6.5px; letter-spacing: 1px; color: #8a967f; }
  .ab-st:last-child b { color: #9fe79a; }
  .ab-sec { display: flex; align-items: center; gap: 10px; margin: 6px 0 9px; font-family: var(--font-display, monospace);
    font-size: 9px; letter-spacing: 4px; color: #d8b866; }
  .ab-sec i { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(216,184,102,0.5), transparent); }
  .ab-team { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
  .ab-mem { display: flex; align-items: center; gap: 11px; padding: 8px 10px; text-align: left;
    background: linear-gradient(90deg, hsla(var(--h),45%,30%,0.35), rgba(10,14,9,0.6) 60%);
    box-shadow: inset 2px 0 0 hsl(var(--h),60%,58%), inset 0 0 0 1px rgba(216,184,102,0.14); }
  .ab-av { width: 40px; height: 40px; flex: 0 0 40px; image-rendering: pixelated;
    box-shadow: 0 0 0 2px #0a0d08, 0 0 0 3px hsl(var(--h),55%,55%); }
  .ab-who { flex: 1; min-width: 0; }
  .ab-who b { display: block; font-size: 12px; color: #ffe9b0; letter-spacing: 1px; }
  .ab-who small { display: block; margin-top: 2px; font-size: 8px; color: #9aa68f; letter-spacing: 1px; }
  .ab-x { flex-shrink: 0; font-family: inherit; font-size: 9px; letter-spacing: 1px; padding: 7px 11px; color: #e8f0f8;
    text-decoration: none; background: linear-gradient(180deg, #1c2732, #10161e); box-shadow: var(--pix-btn, 0 0 0 1px #3a4652); }
  .ab-x:hover { filter: brightness(1.3); }
  .ab-tech { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; margin-bottom: 4px; }
  .ab-tech span { font-size: 8px; letter-spacing: 1px; color: #cfe4f0; padding: 4px 8px;
    background: rgba(40,60,80,0.35); box-shadow: inset 0 0 0 1px rgba(143,216,248,0.3); }
  .ab-tech span:last-child { color: #9fe79a; box-shadow: inset 0 0 0 1px rgba(159,231,154,0.4); }
  .ab-foot { margin-top: 10px; font-size: 8px; letter-spacing: 3px; color: #c08aff; }
  @media (max-width: 520px) {
    .ab-stats { grid-template-columns: repeat(3, 1fr); }
    .ab-st:nth-child(10) { grid-column: span 3; }
    .ab-x { padding: 6px 8px; font-size: 8px; }
  }

  .playqr { display: flex; align-items: center; gap: 14px; margin-top: 16px; padding: 12px;
    background: rgba(216,184,102,0.07); border: 1px solid rgba(216,184,102,0.3); text-align: left; }
  .playqr canvas { width: 108px; height: 108px; flex: 0 0 108px; image-rendering: pixelated;
    background: #f4f1e4; padding: 0; }
  .playqr.noqr canvas { display: none; }
  .playqr .qrtext b { display: block; font-family: var(--font-display, monospace);
    font-size: 11px; letter-spacing: 3px; color: var(--gold, #d8b866); margin-bottom: 5px; }
  .playqr .qrtext small { display: block; font-size: 10px; line-height: 1.7; color: #b9c4ad; }
  .playqr .qrlink { display: inline-block; margin-top: 7px; font-size: 10px; letter-spacing: 1px;
    color: #8fd8f8; text-decoration: none; word-break: break-all; }
  .playqr .qrlink:hover { text-decoration: underline; }
  @media (max-width: 520px) {
    .playqr { flex-direction: column; text-align: center; }
    .playqr .qrtext small { text-align: center; }
  }

  .rialo-badge { display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25);
    font-family: var(--font-display, monospace); font-size: 11px; letter-spacing: 3px; color: #e8e3d5; }
  .rialo-badge canvas { width: 26px; height: 26px; image-rendering: pixelated; border-radius: 5px;
    box-shadow: 0 0 0 1px rgba(232,227,213,0.4), 0 2px 8px rgba(0,0,0,0.4); }
`;
// kept for callers that inline it; the canonical copy is injected once below
export const ABOUT_BADGE_CSS = ABOUT_CSS;

// paint the little Rialo mark into any freshly-inserted `.rlogo-about` canvases,
// the play-here QR beside it, the banner sky and the team avatars
export function paintAboutRialo(root) {
  if (!document.getElementById('about-css')) {
    const st = document.createElement('style');
    st.id = 'about-css';
    st.textContent = ABOUT_CSS;
    document.head.appendChild(st);
  }
  root.querySelectorAll('.rlogo-about').forEach((cv) => {
    paintRialoMark(cv.getContext('2d'), cv.width);
  });
  root.querySelectorAll('.ab-sky').forEach(paintSky);
  root.querySelectorAll('.ab-av').forEach(paintAvatar);
  root.querySelectorAll('.qr-about').forEach((cv) => {
    try {
      const q = makeQrCanvas(GAME_URL, { scale: 4, dark: '#141a12', light: '#f4f1e4' });
      cv.width = q.width; cv.height = q.height;
      cv.getContext('2d').drawImage(q, 0, 0);
    } catch (e) {
      // a missing QR must never take the About panel down with it
      console.warn('[semesta] QR render failed:', e);
      cv.closest('.playqr')?.classList.add('noqr');
    }
  });
}
