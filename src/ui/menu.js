// THE TITLE: a short cinematic, then the main menu.
//
// It opens on black and letterbox bars, a "presents" card, then the camera
// tilts down out of the night sky onto Anavela (src/ui/titlescene.js — the
// village lit on its hill, sky lanterns rising, the hero and Spider on a cliff
// looking at it). The logo sweeps in, the bars ease back, and the menu slides
// in from the left as a list you can drive with the mouse, a finger, or the
// arrow keys. Any click or key during the intro skips straight to the end.
//
// The logo & mascot are the only image assets in the game (everything else
// stays procedural).
import logoUrl from '../../logoasset/semesta.png';
import mascotUrl from '../../logoasset/nxrmascott.png';
import { paintRialoMark } from '../world/landmarks.js';
import { aboutInner, paintAboutRialo } from './about.js';
import { docsInner, wireDocs, DOCS_CSS } from './docs.js';
import {
  cloudConfigured, currentUser, signInWithGoogle, signOut, onAuthChange,
  enabledProviders, mountGoogleButton, deleteCloudSave,
} from '../net/auth.js';
import { deleteSlot, MAX_SLOTS } from '../systems/profiles.js';
import { serverConfigured } from '../net/client.js';
import { createGfxPanel } from './gfxpanel.js';
import { cleanImage } from '../gfx/logo.js';
import { createTitleScene } from './titlescene.js';

export { logoUrl, mascotUrl };

const CSS = `
#opening {
  position: fixed; inset: 0; z-index: 120; overflow: hidden; background: #05060d;
  font-family: inherit; color: #e8f0f8; user-select: none;
}
#opening.fadeout { transition: opacity 0.8s ease; opacity: 0; pointer-events: none; }
#opening canvas.scene {
  position: absolute; inset: 0; width: 100%; height: 100%;
  image-rendering: pixelated; object-fit: cover;
}
/* film: a soft vignette and the faintest scanline, so the upscaled pixels read
   as a picture on a screen rather than a blur */
#opening .film {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 42%, transparent 46%, rgba(2,2,8,0.72) 100%),
    repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 3px);
}
/* the menu side gets its own shade so the type always reads over the sky */
#opening .shade {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s ease;
  background: linear-gradient(90deg, rgba(4,4,12,0.86) 0%, rgba(4,4,12,0.55) 30%, rgba(4,4,12,0) 56%);
}
#opening.ready .shade { opacity: 1; }
/* letterbox: full cinema during the intro, gone once the menu is up */
#opening .lbx { position: absolute; left: 0; right: 0; height: 13vh; background: #000; z-index: 6;
  transition: height 1.3s cubic-bezier(.6,0,.2,1); pointer-events: none; }
#opening .lbx.top { top: 0; }
#opening .lbx.bot { bottom: 0; }
#opening.ready .lbx { height: 0; }
#opening .black { position: absolute; inset: 0; background: #000; z-index: 5; pointer-events: none;
  transition: opacity 1.6s ease; }
#opening.lit .black { opacity: 0; }
#opening .presents {
  position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); z-index: 7;
  text-align: center; font-family: var(--font-display, monospace); pointer-events: none;
  opacity: 0; transition: opacity 0.9s ease, letter-spacing 2.4s ease;
  font-size: 11px; letter-spacing: 4px; color: #cfc8ee;
}
#opening .presents b { display: block; font-size: 16px; color: #ffe9b0; margin-bottom: 8px; letter-spacing: inherit; font-weight: normal; }
#opening.p-on .presents { opacity: 1; letter-spacing: 7px; }
#opening.p-off .presents { opacity: 0; }

/* the logo: top-left on wide screens, sweeping in with a light pass */
/* ONE COLUMN holds the logo and the list, so the list always starts where the
   logo actually ends — positioning the two separately put the tagline on top
   of the first menu item as soon as the logo's real height differed */
#opening .col {
  position: absolute; left: max(5vw, 28px); top: 0; bottom: 0; width: min(400px, 40vw); z-index: 4;
  display: flex; flex-direction: column; justify-content: center; gap: 4vh; padding: 5vh 0 8vh;
  pointer-events: none;
}
#opening .col > * { pointer-events: auto; }
#opening .logo-wrap {
  position: relative; width: 100%;
  pointer-events: none; opacity: 0; transform: translateY(10px) scale(0.97);
  transition: opacity 1.2s ease, transform 1.4s cubic-bezier(.2,.8,.2,1);
}
#opening.logo-on .logo-wrap { opacity: 1; transform: none; }
#opening .logo-wrap .lg { position: relative; animation: op-logo 6s ease-in-out infinite; }
#opening .logo-wrap img {
  width: 100%; image-rendering: pixelated; display: block;
  filter: drop-shadow(0 6px 0 rgba(0,0,0,0.45)) drop-shadow(0 0 26px rgba(140,160,255,0.35));
}
/* a light pass across the wordmark, masked to the logo's own shape */
#opening .logo-wrap .sweep { position: absolute; inset: 0; overflow: hidden; pointer-events: none;
  -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
#opening .logo-wrap .sweep::after { content: ''; position: absolute; top: 0; bottom: 0; width: 26%; left: -40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.7), transparent);
  animation: op-sweep 6s ease-in-out 0.8s infinite; }
@keyframes op-sweep { 0% { left: -40%; } 28%, 100% { left: 130%; } }
@keyframes op-logo { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
#opening .tagline {
  font-family: var(--font-display, monospace); font-size: 9px; letter-spacing: 5px; color: #b9b2e0;
  margin: 10px 0 0 4px; text-shadow: 0 2px 0 #000;
}

/* menu: a list, not a stack of signboards */
#opening .menu {
  position: relative; width: 100%;
  display: flex; visibility: hidden; flex-direction: column; gap: 1px;
}
#opening .menu.show { visibility: visible; }
#opening .menu:not(.show) > * { animation: none; }
#opening .menu > * { opacity: 0; transform: translateX(-18px); animation: op-itemin 0.55s cubic-bezier(.2,.8,.2,1) forwards; }
${Array.from({ length: 12 }, (_, i) => `#opening .menu > *:nth-child(${i + 1}) { animation-delay: ${(0.05 + i * 0.06).toFixed(2)}s; }`).join('\n')}
@keyframes op-itemin { to { opacity: 1; transform: none; } }
#opening .menu button[data-m] {
  position: relative; display: grid; grid-template-columns: 24px 1fr; align-items: baseline;
  column-gap: 8px; text-align: left; width: 100%; isolation: isolate;
  font-family: var(--font-display, monospace); font-size: 15px; letter-spacing: 3px;
  padding: 8px 12px 8px 14px; cursor: pointer; color: #d9d4f2; background: transparent; border: 0;
  text-shadow: 0 2px 0 rgba(0,0,0,0.8); transition: color .15s, padding .2s ease;
}
#opening .menu button[data-m] i { font-style: normal; font-size: 9px; color: #6f6a9c; letter-spacing: 1px; }
#opening .menu button[data-m] small { grid-column: 2; display: block; font-family: var(--font-body, inherit);
  font-size: 10px; letter-spacing: 1px; color: #8d88b8; margin-top: 3px; }
#opening .menu button[data-m]::before {
  content: ''; position: absolute; inset: 0; z-index: -1; opacity: 0; transition: opacity .2s;
  background: linear-gradient(90deg, rgba(255,214,120,0.2), rgba(255,214,120,0) 85%);
  box-shadow: inset 2px 0 0 #ffd36a;
}
#opening .menu button[data-m]::after {
  content: '◆'; position: absolute; left: -8px; top: 10px; font-size: 9px; color: #ffd36a; opacity: 0;
  transform: translateX(-6px); transition: opacity .2s, transform .2s; text-shadow: 0 0 8px #ffb84a;
}
#opening .menu button[data-m]:hover, #opening .menu button[data-m]:focus-visible {
  color: #ffe9b0; padding-left: 20px; outline: none;
}
#opening .menu button[data-m]:hover::before, #opening .menu button[data-m]:focus-visible::before { opacity: 1; }
#opening .menu button[data-m]:hover::after, #opening .menu button[data-m]:focus-visible::after { opacity: 1; transform: none; }
#opening .menu button[data-m]:hover i, #opening .menu button[data-m]:focus-visible i { color: #ffd36a; }
#opening .menu button.primary { font-size: 18px; color: #ffe9b0; }
#opening .menu button.online small { color: #8fc8e8; }
#opening .menu button.online:hover, #opening .menu button.online:focus-visible { color: #cfeeff; }
#opening .menu .sep { height: 1px; margin: 5px 0 5px 14px; background: linear-gradient(90deg, rgba(200,190,255,0.25), transparent); }

#opening .foot {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; padding: 10px max(5vw, 28px) 12px; pointer-events: none;
  font-family: var(--font-display, monospace); font-size: 8px; letter-spacing: 3px; color: rgba(220,214,255,0.62);
  text-shadow: 0 1px 0 #000; opacity: 0; transition: opacity 1s ease 0.6s;
}
#opening.ready .foot { opacity: 1; }
#opening .foot .rialoline { display: flex; align-items: center; gap: 8px; }
#opening .foot canvas { width: 18px; height: 18px; image-rendering: pixelated; border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(232,226,210,0.35); }
#opening .foot .keys b { color: #ffe9b0; font-weight: normal; padding: 1px 4px; box-shadow: inset 0 0 0 1px rgba(255,233,176,0.35); }
#opening .skiphint { position: absolute; right: 18px; bottom: calc(13vh + 10px); z-index: 7; pointer-events: none;
  font-family: var(--font-display, monospace); font-size: 8px; letter-spacing: 3px; color: rgba(255,255,255,0.45);
  transition: opacity .5s; }
#opening.ready .skiphint { opacity: 0; }
#opening .gfxp { z-index: 8; transition: opacity .8s ease .4s; }
/* folded, the tab lives in the corner: mid-right is where the Hub island is */
#opening .gfxp.collapsible.folded { top: 14px; transform: none; }
#opening:not(.ready) .gfxp { opacity: 0; pointer-events: none; }

/* NARROW SCREENS: logo centred at the top, the list at the bottom, and the
   shade comes up from below instead of across */
@media (max-width: 720px) {
  #opening .shade { background: linear-gradient(0deg, rgba(4,4,12,0.94) 0%, rgba(4,4,12,0.62) 48%, rgba(4,4,12,0) 74%); }
  #opening .col { left: 50%; width: min(380px, 90vw); margin-left: calc(min(380px, 90vw) / -2);
    justify-content: space-between; padding: 6vh 0 38px; }
  #opening .logo-wrap { width: min(330px, 78vw); align-self: center; }
  #opening .tagline { text-align: center; margin-left: 0; font-size: 8px; letter-spacing: 3px; }
  #opening .foot .keys, #opening .foot .by { display: none; }
  #opening .foot { justify-content: center; padding-bottom: 10px; }
}
@media (max-height: 760px) {
  #opening .menu button[data-m] { padding-top: 5px; padding-bottom: 5px; font-size: 13px; }
  #opening .menu button.primary { font-size: 15px; }
  #opening .menu button[data-m] small { font-size: 9px; margin-top: 1px; }
  #opening .col { gap: 2vh; padding-top: 3vh; }
  #opening .logo-wrap { width: min(340px, 34vw); }
}
@media (max-height: 640px) {
  #opening .menu button[data-m] small { display: none; }
  #opening .acct .note { display: none; }
}
@media (max-width: 720px) and (max-height: 760px) {
  #opening .logo-wrap { width: min(280px, 70vw); }
}
@media (prefers-reduced-motion: reduce) {
  #opening .logo-wrap .lg, #opening .logo-wrap .sweep::after { animation: none; }
}

/* ACCOUNT STRIP.
   Deliberately small and above the buttons: signing in is optional, so it must
   never look like a gate in front of the game. Someone who ignores it entirely
   gets exactly the game they have today. */
#opening .acct {
  display: flex; align-items: center; justify-content: flex-start; gap: 8px;
  flex-wrap: wrap; min-height: 26px; margin: 0 0 8px 14px;
  font-size: 9px; letter-spacing: 1px; color: #dce8f4;
  text-shadow: 0 1px 0 #2a4a7a;
}
#opening .acct .who { color: #ffe27a; }
#opening .acct button {
  font-family: inherit; font-size: 9px; letter-spacing: 1px; cursor: pointer;
  padding: 5px 10px; border: 0; color: #f0f4ff;
  background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28);
}
#opening .acct button:hover { filter: brightness(1.25); }
#opening .acct .note { color: #b8d0e8; width: 100%; }
/* Google renders its own button here; it brings its own styling and must not
   be fought with, so this only reserves the space. */
#opening .acct .gbtn { display: flex; align-items: center; min-height: 32px; }

/* THE MENU HAS TO FIT. The column is sized from the logo above it and steps
   down by viewport HEIGHT (the dimension that actually runs out — a short
   landscape window has the same problem as a tall narrow phone): subtitles go
   first, then padding. See the max-height blocks in the layout above. */
#opening .acct { font-size: 9px; }
#opening .menu .continfo { font-size: 9px; letter-spacing: 1px; color: #b9b2e0; margin: 4px 0 0 14px; }

/* the guide's own styles are appended below via DOCS_CSS */
/* about modal */
#opening .about {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  background: rgba(8, 14, 26, 0.72); pointer-events: auto; z-index: 9;
}
#opening .about.show { display: flex; }
#opening .about .card {
  /* the About page is taller than it was: it scrolls inside the card rather
     than running off a short screen, and a phone can scroll it (body is
     touch-action: none for pinch zoom, so the card has to opt back in) */
  width: min(480px, 92vw); max-height: 90vh; overflow-y: auto; touch-action: pan-y;
  padding: 18px 20px; text-align: center; scrollbar-width: thin; scrollbar-color: #6a5a3a transparent;
  background: linear-gradient(180deg, rgba(26,31,20,0.97), rgba(14,18,11,0.97));
  border: 2px solid #46523c;
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.25), 0 14px 40px rgba(0,0,0,0.6);
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
}
#opening .about img.mascot {
  width: min(230px, 62%); image-rendering: pixelated; margin-bottom: 10px;
  filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));
  animation: op-bob 3s ease-in-out infinite;
}
#opening .about h4 { font-size: 13px; letter-spacing: 4px; color: #d8b866; margin-bottom: 8px; }
#opening .about p { font-size: 10px; line-height: 1.9; color: #cfd8c8; margin-bottom: 14px; letter-spacing: 1px; }
#opening .about .xbtn {
  display: inline-block; font-family: inherit; font-size: 12px; letter-spacing: 2px;
  padding: 10px 22px; cursor: pointer; color: #e8f0f8; text-decoration: none;
  background: linear-gradient(180deg, #1c2732, #10161e); border: 2px solid #4a6a8a;
  box-shadow: inset 0 0 0 1px rgba(140,190,255,0.2);
}
#opening .about .xbtn:hover { filter: brightness(1.3); }
#opening .about .crew {
  margin: 14px 0 2px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25);
  display: flex; flex-direction: column; gap: 8px;
}
#opening .about .crew .ct { font-size: 9px; letter-spacing: 3px; color: #8a967f; margin-bottom: 2px; }
#opening .about .crew .member {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 7px 10px; background: rgba(10,14,9,0.6);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.16);
}
#opening .about .crew .who { text-align: left; }
#opening .about .crew .who b { display: block; font-size: 11px; color: #ffe9b0; letter-spacing: 1px; }
#opening .about .crew .who small { font-size: 8px; color: #8a967f; letter-spacing: 1px; }
#opening .about .crew a.xmini {
  flex-shrink: 0; font-family: inherit; font-size: 9px; letter-spacing: 1px;
  padding: 7px 12px; cursor: pointer; color: #e8f0f8; text-decoration: none;
  background: linear-gradient(180deg, #1c2732, #10161e); border: 2px solid #4a6a8a;
  box-shadow: inset 0 0 0 1px rgba(140,190,255,0.2);
}
#opening .about .crew a.xmini:hover { filter: brightness(1.3); }
#opening .about .closebtn {
  display: block; margin: 12px auto 0; font-family: inherit; font-size: 10px; letter-spacing: 2px;
  padding: 7px 18px; cursor: pointer; color: #c2cbb0;
  background: #1a2215; border: 1px solid #5a6a4a;
}
#opening .about .rialo-badge { display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(216,184,102,0.25);
  font-family: var(--font-display, monospace); font-size: 11px; letter-spacing: 3px; color: #e8e3d5; }
#opening .about .rialo-badge canvas { width: 26px; height: 26px; image-rendering: pixelated; border-radius: 5px;
  box-shadow: 0 0 0 1px rgba(232,227,213,0.4), 0 2px 8px rgba(0,0,0,0.4); }
/* roadmap modal: numbered milestone plates */
#opening .roadmap .card { width: min(470px, 92vw); max-height: 88vh; overflow-y: auto; text-align: left; }
#opening .roadmap h4 { text-align: center; }
#opening .roadmap .rm-phases { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 2px; }
#opening .roadmap .rm {
  padding: 10px 12px; background: rgba(10,14,9,0.6);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.18), inset 3px 0 0 rgba(216,184,102,0.55);
}
#opening .roadmap .rm-h {
  display: flex; align-items: center; gap: 8px; font-family: var(--font-display, inherit);
  font-size: 10px; letter-spacing: 2px; color: #ffe9b0; margin-bottom: 5px;
}
#opening .roadmap .rm-n {
  font-size: 9px; color: #241c0a; background: var(--gold, #d8b866);
  padding: 2px 5px; letter-spacing: 0;
}
#opening .roadmap .rm p { font-size: 10px; line-height: 1.85; color: #cfd8c8; margin: 0; letter-spacing: 0.5px; }
#opening .roadmap .rm p b { color: #ffe9b0; }
`;

// ---------------------------------------------------------------------------
// showOpening(saved, syncAccount) -> Promise<{ action: 'new'|'continue'|'online' }>
//
// `syncAccount` pulls the signed-in account's heroes down and hands back
// whichever one belongs in the active slot. It is called again the moment a
// sign-in lands, because that is the whole reason somebody signs in HERE: they
// are on a second device and want their character. Without it the menu would go
// on offering nothing but NEW ADVENTURE to a player who already has three.
// ---------------------------------------------------------------------------
const escapeText = (t) => String(t).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Crop an image to the bounding box of its non-transparent pixels. */
function trimTransparent(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) {
          for (let xx = 0; xx < c.width; xx++) {
            if (d[(y * c.width + xx) * 4 + 3] > 12) {
              if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) { res(src); return; }
        const o = document.createElement('canvas');
        o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(c, -x0, -y0);
        res(o.toDataURL());
      } catch { res(src); }
    };
    img.onerror = () => res(src);
    img.src = src;
  });
}

export function showOpening(saved, syncAccount) {
  return new Promise(async (resolve) => {
    // key out the solid PNG backgrounds so the logo/mascot float cleanly
    const [logoRaw, mascot] = await Promise.all([cleanImage(logoUrl), cleanImage(mascotUrl)]);
    // the wordmark PNG carries a lot of empty margin; trimmed, the column lays
    // out around what you can actually see
    const logo = await trimTransparent(logoRaw);

    const style = document.createElement('style');
    style.textContent = CSS + DOCS_CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'opening';
    document.body.appendChild(root);

    // --- the scene ---
    const sceneCv = document.createElement('canvas');
    sceneCv.className = 'scene';
    root.appendChild(sceneCv);
    const scene = createTitleScene(sceneCv);
    root.insertAdjacentHTML('beforeend', `
      <div class="film"></div>
      <div class="shade"></div>
      <div class="black"></div>
      <div class="lbx top"></div><div class="lbx bot"></div>
      <div class="presents"><b>NXRSKYAA</b>PRESENTS · A RIALO COMMUNITY GAME</div>
      <div class="skiphint">${matchMedia('(pointer: coarse)').matches ? 'TAP' : 'CLICK'} TO SKIP</div>`);

    // --- logo, with a light pass masked to its own shape ---
    const logoWrap = document.createElement('div');
    logoWrap.className = 'logo-wrap';
    logoWrap.innerHTML = `<div class="lg"><img src="${logo}" alt="SEMESTA"><div class="sweep"></div></div>
      <div class="tagline">THE LANTERNKEEPER'S CHRONICLE</div>`;
    const col = document.createElement('div');
    col.className = 'col';
    root.appendChild(col);
    col.appendChild(logoWrap);
    const sweep = logoWrap.querySelector('.sweep');
    sweep.style.webkitMaskImage = `url("${logo}")`;
    sweep.style.maskImage = `url("${logo}")`;

    // --- footer: who made it, what it is built for, and the keys ---
    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.innerHTML = `<div class="rialoline"><canvas class="rlogo" width="40" height="40"></canvas>
      <span>BUILD FOR RIALO<span class="by"> · A WORLD BY NXRSKYAA</span></span></div>
      <div class="keys"><b>↑</b> <b>↓</b> SELECT &nbsp; <b>ENTER</b> CONFIRM</div>`;
    root.appendChild(foot);
    paintRialoMark(foot.querySelector('.rlogo').getContext('2d'), 40);

    // SOLO AND ONLINE ARE SEPARATE CHOICES.
    //
    // Having a server configured must not mean everybody is pushed into a shared
    // world — plenty of people want their own quiet Anavela, and a world you
    // share is a different thing to walk into, not a setting on the same one.
    // So there are two doors, and the solo ones say so on the label.
    //
    // `saved` is re-read rather than captured: deleting the profile has to make
    // CONTINUE disappear without a page reload.
    let savedRef = saved;
    const menu = document.createElement('div');
    menu.className = 'menu';

    function menuHTML() {
      const online = serverConfigured();
      // numbering follows what is actually on the list, so it never skips
      const n = (k) => String(savedRef ? k : k - 1).padStart(2, '0');
      return `
      <div class="acct"></div>
      ${savedRef ? `<button class="primary" data-m="continue"><i>01</i>CONTINUE
        <small>${escapeText(savedRef.character?.name || 'Adventurer')} · Lv${
          Number(savedRef.level) || 1} — pick up where you left off</small></button>` : ''}
      <button class="${savedRef ? '' : 'primary'}" data-m="new"><i>${savedRef ? '02' : '01'}</i>NEW ADVENTURE
        <small>Begin a new life in Anavela</small></button>
      ${online ? `<button class="online" data-m="online"><i>${n(3)}</i>PLAY ONLINE
        <small>Shared world · other players, chat, one clock</small></button>` : ''}
      <div class="sep"></div>
      <button data-m="docs"><i>${n(online ? 4 : 3)}</i>HOW TO PLAY<small>The Semesta guide</small></button>
      <button data-m="roadmap"><i>${n(online ? 5 : 4)}</i>ROADMAP<small>Where Semesta is headed</small></button>
      <button data-m="about"><i>${n(online ? 6 : 5)}</i>ABOUT<small>The team behind the world</small></button>
    `;
    }
    menu.innerHTML = menuHTML();
    col.appendChild(menu);

    // the account strip is rebuilt with the buttons, so it has to be re-found
    function rebuildMenuButtons() {
      menu.innerHTML = menuHTML();
      acct = menu.querySelector('.acct');
      renderAccount();
    }

    // graphics settings live on the opening screen — pinned to the RIGHT edge,
    // so someone on a slow machine can turn things down before the world builds
    // (no sfx here: audio only starts on the first menu click)
    const gfx = createGfxPanel({ collapsible: true });
    root.appendChild(gfx.el);

    // --- about modal ---
    const about = document.createElement('div');
    about.className = 'about';
    about.innerHTML = `<div class="card">${aboutInner(logo)}<button class="closebtn">BACK</button></div>`;
    root.appendChild(about);
    paintAboutRialo(about);
    about.querySelector('.closebtn').addEventListener('click', () => about.classList.remove('show'));
    about.addEventListener('click', (e) => { if (e.target === about) about.classList.remove('show'); });

    // --- ACCOUNT STRIP ------------------------------------------------------
    // Optional, always. If the project has no Supabase keys the strip explains
    // that saves are local and stops there — the game is fully playable either
    // way and must never look like it is asking permission.
    let acct = menu.querySelector('.acct');
    async function renderAccount() {
      if (!cloudConfigured()) {
        acct.innerHTML = '<span class="note">Progress saves to this browser.</span>';
        return;
      }
      const u = await currentUser();
      if (u) {
        acct.innerHTML = `<span>Signed in as <b class="who"></b></span>
          <button data-a="out">SIGN OUT</button>
          <button data-a="wipe" class="danger">DELETE PROFILE</button>`;
        // textContent: the display name comes from Google and is not ours
        acct.querySelector('.who').textContent = u.name;
      } else {
        // Only draw the doors that actually open. Offering a Google button on a
        // project where the provider is switched off just produces an error the
        // player can do nothing about.
        // GOOGLE ONLY, on purpose.
        //
        // The magic-link route was removed rather than kept as a backup. It
        // fails in the worst possible way: Supabase's built-in mail allows
        // roughly three or four sends an HOUR across the whole project, so at a
        // demo the fourth person to try it silently gets nothing and concludes
        // the game is broken. A door that is sometimes locked is worse than no
        // door — especially one you cannot unlock while people are watching.
        const prov = await enabledProviders();
        acct.innerHTML = prov.google
          ? `<div class="gbtn"></div>
             <span class="note">Optional — it just carries your save between devices.</span>`
          : '<span class="note">Progress saves to this browser.</span>';
        if (prov.google) {
          // Google's OWN button, rendered in the page. It keeps Supabase out of
          // the conversation Google narrates, so the consent screen names this
          // site instead of the database behind it. If it cannot be mounted —
          // script blocked, no client id — fall back to our own button and the
          // redirect route, which always works.
          const slot = acct.querySelector('.gbtn');
          const mounted = await mountGoogleButton(slot, (r) => {
            if (r.ok) afterSignIn();
            else { acct.innerHTML = `<span class="note">${r.error}</span>`; setTimeout(renderAccount, 2600); }
          });
          if (!mounted) slot.outerHTML = '<button data-a="google">▶ SIGN IN WITH GOOGLE</button>';
        }
      }
    }
    // DELEGATED ON `menu`, NOT ON `.acct` — and that is not a style choice.
    //
    // `rebuildMenuButtons` sets `menu.innerHTML`, which DESTROYS the `.acct`
    // div and builds a new one. Binding the handler to that div meant the
    // listener died with it: the variable was reassigned to the new element,
    // the listener was not, and SIGN OUT and DELETE PROFILE became painted
    // rectangles that did nothing. It was only reachable after a delete until
    // the sign-in flow started rebuilding too, at which point the strip was
    // dead from the moment the menu appeared for anyone already signed in.
    //
    // `menu` survives its own innerHTML, which is exactly why the NEW /
    // CONTINUE handler below has always worked. Same trick, same reason.
    menu.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'google') {
        b.textContent = 'OPENING…';
        const r = await signInWithGoogle();
        if (!r.ok) { acct.innerHTML = `<span class="note">${r.error}</span>`; setTimeout(renderAccount, 2600); }
      } else if (a === 'out') {
        // say something immediately: a button that goes quiet for a second
        // while a network call runs is indistinguishable from a broken one
        b.textContent = 'SIGNING OUT…';
        b.disabled = true;
        try { await signOut(); } finally { renderAccount(); }
      } else if (a === 'wipe') {
        // TWO steps, on purpose. This is the one action in the menu that cannot
        // be undone, so a mis-tap must not be enough to do it — the button has
        // to change into a different button and be pressed again.
        if (b.dataset.armed !== '1') {
          b.dataset.armed = '1';
          b.textContent = 'REALLY DELETE?';
          setTimeout(() => {
            if (!b.isConnected) return;
            b.dataset.armed = '';
            b.textContent = 'DELETE PROFILE';
          }, 4000);
          return;
        }
        b.textContent = 'DELETING…';
        const ok = await deleteCloudSave();
        // The local saves go too, or CONTINUE would resurrect what was just
        // deleted the next time the page loads — which is not what anybody
        // means by "delete my profile". ALL of them: this is the account-wide
        // button, and it used to clear only the slot-0 key, leaving two heroes
        // on the device that the next sync would happily upload again.
        for (let i = 0; i < MAX_SLOTS; i++) deleteSlot(i);
        savedRef = null;               // so CONTINUE goes away with it
        acct.innerHTML = `<span class="note">${ok
          ? 'Profile deleted. Start a new adventure whenever you like.'
          : 'This device was cleared, but the cloud copy could not be deleted — try again later.'}</span>`;
        setTimeout(() => { renderAccount(); rebuildMenuButtons(); }, 2600);
      }
    });
    /**
     * A sign-in has landed. Fetch the account's heroes and redraw the menu
     * around them.
     *
     * Signing in used to only repaint the account strip, so a player on a
     * second device watched it say "Signed in as ..." next to a menu still
     * offering nothing but NEW ADVENTURE — and making one there is what
     * overwrote the hero they had signed in to reach.
     */
    let syncing = false;
    async function afterSignIn() {
      renderAccount();
      // onAuthChange fires for SIGNING OUT too, and there is nothing to fetch
      // then — without this the menu cheerfully announced "Fetching your
      // characters…" to somebody who had just left.
      if (!syncAccount || syncing || !(await currentUser())) return;
      syncing = true;
      const note = document.createElement('div');
      note.className = 'continfo';
      note.textContent = 'Fetching your characters…';
      menu.appendChild(note);
      try {
        const fresh = await syncAccount();
        if (fresh) savedRef = fresh;
      } catch { /* offline: the local save is still the truth */ }
      note.remove();
      syncing = false;
      rebuildMenuButtons();
    }
    renderAccount();
    // ONLY WHEN THE PERSON CHANGES, not on every auth event.
    //
    // Supabase fires onAuthStateChange for TOKEN_REFRESHED too, and it
    // refreshes the token whenever the tab regains focus. So every alt-tab was
    // running a full account sync and re-showing the "two saves found" prompt.
    // Nothing about the player changed; only their token did.
    let lastUserId = null;
    currentUser().then((u) => { lastUserId = u?.id ?? null; });
    onAuthChange(async (u) => {
      const id = u?.id ?? null;
      if (id === lastUserId) { renderAccount(); return; }
      lastUserId = id;
      afterSignIn();
    });

    // --- the GUIDE: everything the game can teach, before you commit to a
    // character. New players' questions all arrive before NEW ADVENTURE, not
    // after, so the guide belongs here rather than only in the in-game menu.
    const docs = document.createElement('div');
    docs.className = 'about docs';
    docs.innerHTML = docsInner();
    root.appendChild(docs);
    const docsNav = wireDocs(docs);
    docs.querySelector('.closebtn').addEventListener('click', () => docs.classList.remove('show'));
    docs.addEventListener('click', (e) => { if (e.target === docs) docs.classList.remove('show'); });

    // --- roadmap modal: where Semesta is headed ---
    const roadmap = document.createElement('div');
    roadmap.className = 'about roadmap';
    roadmap.innerHTML = `<div class="card">
      <h4>◆ SEMESTA ROADMAP ◆</h4>
      <div class="rm-phases">
        <div class="rm">
          <div class="rm-h"><span class="rm-n">01</span>TOKEN LAUNCHPAD</div>
          <p>Semesta launches its own token on the <b>Semesta Launchpad</b> with a
          total supply of <b>1,000,000,000 (1B)</b>.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">02</span>HOLD TO PLAY</div>
          <p>After launch, playing Semesta requires holding a minimum of
          <b>1,000 SEMESTA</b> in your wallet.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">03</span>TOKEN GACHA</div>
          <p>The in-game gacha accepts <b>SEMESTA token</b> alongside in-game
          <b>gold</b> — two ways to chase the same wonders.</p>
        </div>
        <div class="rm">
          <div class="rm-h"><span class="rm-n">04</span>GENESIS NFT</div>
          <p>Once the game is live, a <b>free-mint Genesis NFT</b> drops for
          players who actively play Semesta.</p>
        </div>
      </div>
      <div class="rialo-badge">
        <canvas class="rlogo-about" width="44" height="44"></canvas>
        <span>BUILD FOR RIALO</span>
      </div>
      <button class="closebtn">BACK</button>
    </div>`;
    root.appendChild(roadmap);
    paintAboutRialo(roadmap);
    roadmap.querySelector('.closebtn').addEventListener('click', () => roadmap.classList.remove('show'));
    roadmap.addEventListener('click', (e) => { if (e.target === roadmap) roadmap.classList.remove('show'); });

    // THE INTRO. Black -> "presents" -> the camera tilts down out of the sky ->
    // the logo -> the bars ease back and the list slides in. Every step is a
    // timeout on a class, so skipping is simply "run all of them now".
    const timers = [];
    let introK = 0, introRaf = 0, ready = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function finishIntro() {
      if (ready) return;
      ready = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(introRaf);
      scene.setIntro(1);
      root.classList.remove('p-on');
      root.classList.add('p-off', 'lit', 'logo-on', 'ready');
      menu.classList.add('show');
      removeEventListener('keydown', skipKey, true);
      root.removeEventListener('pointerdown', skipClick, true);
      // land focus on the first choice so ENTER works straight away
      setTimeout(() => menu.querySelector('button[data-m]')?.focus({ preventScroll: true }), 650);
    }
    // a click or key during the intro skips it, and is swallowed so the same
    // press does not also pick a menu item that has not appeared yet
    const skipClick = (e) => { if (!ready) { e.stopPropagation(); e.preventDefault(); finishIntro(); } };
    const skipKey = (e) => { if (!ready) { e.stopPropagation(); e.preventDefault(); finishIntro(); } };
    root.addEventListener('pointerdown', skipClick, true);
    addEventListener('keydown', skipKey, true);
    if (reduced) finishIntro();
    else {
      at(250, () => root.classList.add('p-on'));
      at(1900, () => { root.classList.remove('p-on'); root.classList.add('p-off'); });
      at(2300, () => {
        root.classList.add('lit');
        // the tilt runs on its own clock so it is smooth whatever the timers do
        const t0 = performance.now();
        const step = () => {
          introK = Math.min(1, (performance.now() - t0) / 3200);
          scene.setIntro(introK);
          if (introK < 1 && !ready) introRaf = requestAnimationFrame(step);
        };
        step();
        // a hidden tab gets no rAF; never leave the camera pointing at the sky
        at(3600, () => scene.setIntro(1));
      });
      at(4300, () => root.classList.add('logo-on'));
      at(5600, finishIntro);
    }

    // ARROW KEYS walk the list (wrapping), ENTER is the button's own
    function onNavKey(e) {
      if (!ready || document.querySelector('#opening .about.show')) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...menu.querySelectorAll('button[data-m]')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      const d = e.key === 'ArrowDown' ? 1 : -1;
      items[(i + d + items.length) % items.length].focus();
    }
    addEventListener('keydown', onNavKey);
    // the mouse and the keyboard should agree on which item is "current"
    menu.addEventListener('pointerover', (e) => {
      const b = e.target.closest('button[data-m]');
      if (b && document.activeElement !== b) b.focus({ preventScroll: true });
    });

    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'about') { about.classList.add('show'); return; }
      if (b.dataset.m === 'docs') { docs.classList.add('show'); docsNav.reset(); return; }
      if (b.dataset.m === 'roadmap') { roadmap.classList.add('show'); return; }
      const action = b.dataset.m;
      gfx.dispose();
      removeEventListener('keydown', onNavKey);
      root.classList.add('fadeout');
      setTimeout(() => { scene.stop(); root.remove(); }, 820);
      resolve({ action });
    });
  });
}
