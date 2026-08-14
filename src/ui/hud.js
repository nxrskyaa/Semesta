// Semesta HUD — character plate, skill bar with cooldowns, minimap, quest
// tracker, interact prompt, pickup toasts, damage vignette. Compact, doesn't
// smother the world.
import { ITEMS, RARITY, RARITY_ORDER } from '../systems/items.js';
import { itemIconUrl, skillIconUrl, makePlayerFaceTexture } from '../gfx/textures.js';
import { SKILLS } from '../systems/skills.js';
import { CLASSES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, BALD_STYLE } from '../systems/classes.js';

const CSS = `
#hud { font-family: inherit; }
#hud .frame {
  background:
    var(--dither) 0 0/4px 4px,
    linear-gradient(180deg, var(--panel-1), var(--panel-2));
  border: 0;
  box-shadow: var(--pix-frame);
  margin: 6px; /* room for the stepped pixel border */
}

/* ---- character plate (top left) ---- */
#hud .plate {
  position: absolute; top: 10px; left: 10px; display: flex; gap: 8px;
  padding: 7px 12px 7px 7px; align-items: center; border-radius: 2px;
}
#hud .plate .portrait {
  width: 46px; height: 46px; border: 2px solid var(--cc, #5a7a4a);
  background: #10160f; image-rendering: pixelated; position: relative;
}
#hud .plate .portrait canvas { width: 100%; height: 100%; image-rendering: pixelated; }
#hud .plate .portrait .lv {
  position: absolute; bottom: -7px; right: -7px; background: #202a20;
  border: 1px solid var(--cc, #5a7a4a); color: #ffe27a; font-size: 9px; padding: 1px 4px;
}
#hud .plate .bars { display: flex; flex-direction: column; gap: 3px; min-width: 148px; }
#hud .plate .pname { font-size: 11px; color: #e8e8d8; display: flex; justify-content: space-between; gap: 8px; }
#hud .plate .pname .cls { color: var(--cc, #9ab86a); font-size: 9px; letter-spacing: 1px; }
#hud .bar { height: 10px; background: #17120f; border: 1px solid #0a0f0a; position: relative; }
#hud .bar > div { height: 100%; transition: width 0.12s; }
#hud .bar.hp > div { background: linear-gradient(180deg, #8fe062, #4f9f34 60%, #3d7a28); }
#hud .bar.st { height: 7px; }
#hud .bar.st > div { background: linear-gradient(180deg, #ffd27a, #e0941e); }
#hud .bar .txt {
  position: absolute; inset: 0; font-size: 8px; text-align: center; line-height: 10px;
  color: #fff; text-shadow: 1px 1px 0 #000;
}
#hud .buffs { position: absolute; top: 74px; left: 12px; display: flex; gap: 4px; }
#hud .buffs .bf {
  width: 24px; height: 24px; border: 1px solid #6a7a5a; background: #141a12 center/80% no-repeat;
  image-rendering: pixelated; position: relative;
}
#hud .buffs .bf i {
  position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #9ab86a;
}

/* ---- minimap + clock (top right) ---- */
/* THE HOLLOW HAS NO MAP OF ANAVELA IN IT. The minimap draws the overworld from
   the terrain grid, and underground it went on cheerfully showing the village,
   the lakes and the coastline while you were sealed in a stone room five
   hundred units above them. A map that is confidently wrong is worse than no
   map: it tells you where you are, and you are not there. */
body.inhollow #hud .mapbox { display: none; }
#hud .mapbox { position: absolute; top: 10px; right: 10px; width: 148px; }
#hud .mapbox .minimap { width: 148px; height: 148px; position: relative; overflow: hidden; }
#hud .mapbox canvas { width: 100%; height: 100%; display: block; }
#hud .mapbox .compass {
  position: absolute; top: 3px; left: 6px; font-size: 9px; color: #ffe27a; text-shadow: 1px 1px 0 #000;
}
#hud .mapbox .under {
  display: flex; justify-content: space-between; align-items: center; margin-top: 4px;
  padding: 3px 8px;
}
#hud .mapbox .clock { font-size: 13px; color: #e5ead8; }
#hud .mapbox .daynight { font-size: 11px; }
#hud .iconbtn {
  pointer-events: auto; cursor: pointer;
  background: linear-gradient(180deg, #2a3522, #1a2215);
  border: 0; box-shadow: var(--pix-btn), 0 0 0 1px var(--ink);
  color: #c2cbb0; font-family: inherit; font-size: 11px; padding: 5px 9px;
  margin: 2px;
}
#hud .iconbtn:hover { color: #ffe9b0; filter: brightness(1.2); }
#hud .iconbtn:active { transform: translateY(2px); }
#hud .iconbtn small { color: var(--gold-dim); }
#hud .iconbtn.autobtn.on {
  border-color: #e8574a; color: #ffd0c0;
  background: linear-gradient(180deg, #5a2622, #3a1a16);
  box-shadow: 0 0 8px rgba(232,87,74,0.5), 0 0 0 1px var(--ink);
}

/* ---- quest tracker (right, under minimap) ---- */
/* The WRAPPER owns the position, on desktop as well as touch. It used to be
   positioned only under body.touch, so on desktop the tracker flowed to the top
   left of the HUD and sat straight on top of the player plate. */
/* ONLINE COUNT. Only ever shown in a shared world, and it sits with the clock
   under the minimap because "how many people are here" is the same kind of
   ambient fact as "what time is it". A toast on connect was the only thing
   saying it before, and a toast is gone in four seconds. */
#hud .online {
  /* under the minimap BLOCK, which ends at y=211 — 164 put it straight over
     the clock bar */
  position: absolute; top: 215px; right: 10px; display: none;
  align-items: center; gap: 6px; padding: 4px 9px;
  font-size: 9.5px; letter-spacing: 1px; color: #cfe8ff;
  background: rgba(12,18,24,0.86);
  box-shadow: inset 0 0 0 1px rgba(120,180,255,0.32);
  z-index: 5;
}
#hud .online.show { display: flex; }
#hud .online .dot {
  width: 7px; height: 7px; border-radius: 50%; background: #8ad86e;
  box-shadow: 0 0 6px rgba(138,216,110,0.8);
}
#hud .online.off .dot { background: #e8574a; box-shadow: 0 0 6px rgba(232,87,74,0.8); }
#hud .online b { color: #ffffff; font-weight: normal; }
body.touch #hud .online { top: 163px; right: 6px; font-size: 8.5px; padding: 3px 7px; }
/* and the tracker steps down out of its way — ONLY in a shared world, so a solo
   HUD keeps the tighter stack it already had */
body.online #hud .qtrack { top: 243px; }
body.online.touch #hud .qtrack { top: 187px; }
#hud .qtrack .qway {
  display: block; font-size: 8.5px; letter-spacing: 1px; color: #8fd8f8; margin-top: 2px;
}
#hud .qtrack .q { cursor: pointer; }
#hud .qtrack .q:hover { filter: brightness(1.3); }
#hud .qtrack {
  /* below the minimap BLOCK (map + clock bar ends at y=211 on desktop), not
     just below the map canvas — 196 left a 15px overlap */
  position: absolute; top: 222px; right: 10px; width: 168px;
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 4px; pointer-events: none; max-height: 46vh;
}
#hud .quests {
  width: 100%; display: flex; flex-direction: column; gap: 4px; pointer-events: none;
}
/* the tracker header doubles as a COLLAPSE button. On a phone the quest list
   grows down the right edge and covers the minimap, so it has to be foldable. */
/* STORY CARD — a chapter of the arc, shown once when it unlocks. Parchment and
   gold to match the temple language, and it waits for a click so nobody misses
   a beat while fighting. */
#hud .story {
  position: absolute; left: 50%; bottom: 14vh; transform: translateX(-50%);
  display: none; z-index: 60; pointer-events: none;
}
#hud .story.show { display: block; animation: st-in 0.45s cubic-bezier(0.2, 1.2, 0.4, 1); }
@keyframes st-in { from { opacity: 0; transform: translateX(-50%) translateY(16px); } }
#hud .story.out { animation: st-out 0.5s ease-in forwards; }
@keyframes st-out { to { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
#hud .story .card {
  width: min(440px, 84vw); max-height: 40vh; overflow-y: auto; padding: 14px 18px 12px;
  pointer-events: auto;
  background:
    var(--dither) 0 0/4px 4px,
    linear-gradient(180deg, #efe6cc, #ddd0ac);
  box-shadow: var(--pix-frame), 0 0 40px rgba(0,0,0,0.6);
  text-align: center;
  animation: st-card 0.45s cubic-bezier(0.2, 1.3, 0.5, 1);
}
@keyframes st-card { from { transform: translateY(18px) scale(0.96); } }
#hud .story .ch {
  font-family: var(--font-display, inherit); font-size: 8px; letter-spacing: 5px;
  color: #8a6f36; margin-bottom: 4px;
}
#hud .story h2 {
  font-family: var(--font-display, inherit); font-size: 12px; letter-spacing: 2px;
  color: #4a3a18; margin: 0 0 14px; text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
#hud .story .rule { height: 2px; background: linear-gradient(90deg, transparent, #b99a52, transparent); margin: 0 0 14px; }
#hud .story p {
  font-size: 10px; line-height: 1.85; color: #3c3222; margin: 0 0 8px; text-align: left;
}
#hud .story p:last-of-type { margin-bottom: 16px; }
#hud .story .rw {
  display: inline-block; font-size: 9px; letter-spacing: 2px; color: #6a5220;
  padding: 6px 12px; margin-bottom: 14px; box-shadow: inset 0 0 0 2px #b99a52;
}
/* CATCH CARD — what you actually pulled out of the water. A toast reading
   "+1 item" told the player nothing: not the species, not the rarity, not
   whether it was worth keeping. */
#hud .catch {
  position: absolute; left: 50%; top: 26%; transform: translateX(-50%);
  display: none; z-index: 58; pointer-events: none; text-align: center;
}
#hud .catch.show { display: block; }
#hud .catch .cbox {
  position: relative; padding: 12px 22px 10px; min-width: 170px;
  background: linear-gradient(180deg, rgba(12,20,26,0.95), rgba(6,10,14,0.96));
  box-shadow: inset 0 0 0 2px var(--rc), 0 0 26px color-mix(in srgb, var(--rc) 55%, transparent);
  animation: c-pop 0.42s cubic-bezier(0.2, 1.9, 0.4, 1);
}
#hud .catch.out { animation: c-out 0.45s ease-in forwards; }
@keyframes c-pop { from { transform: scale(0.4) rotate(-5deg); opacity: 0; } }
@keyframes c-out { to { opacity: 0; transform: translateX(-50%) translateY(-22px); } }
#hud .catch .cr {
  font-size: 8px; letter-spacing: 4px; color: var(--rc); margin-bottom: 7px;
  text-shadow: 0 0 8px var(--rc);
}
#hud .catch img {
  width: 54px; height: 54px; image-rendering: pixelated; display: block; margin: 0 auto 6px;
  animation: c-flip 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
}
@keyframes c-flip { from { transform: rotateY(180deg) scale(0.5); } }
#hud .catch .cn { font-size: 11px; color: #f0f4e6; margin-bottom: 5px; }
#hud .catch .cs { font-size: 8px; letter-spacing: 1px; color: #9fb08c; }
#hud .catch .cs b { color: #ffe27a; }
#hud .catch .spark {
  position: absolute; width: 5px; height: 5px; background: var(--rc);
  pointer-events: none; animation: c-spark 0.8s ease-out forwards;
}
@keyframes c-spark { to { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; } }

#hud .mtile .lbadge, #hud .mtile .xbadge {
  display: none; position: absolute; top: 3px; right: 3px;
  width: 7px; height: 7px; background: #ffd23e; box-shadow: 0 0 6px #ffd23e;
}
#hud .mtile .lbadge.on, #hud .mtile .xbadge.on { display: block; }

#hud .story .nx {
  font-size: 8px; letter-spacing: 2px; color: #7a6330; margin-bottom: 12px;
  padding-top: 10px; border-top: 1px solid rgba(138,111,54,0.35);
}
#hud .story .more {
  font-size: 8.5px; letter-spacing: 1px; color: #8a7a52; font-style: italic;
  margin: 6px 0 10px;
}
#hud .story button {
  width: 100%; font-family: var(--font-display, inherit); font-size: 9px; letter-spacing: 3px;
  cursor: pointer; padding: 8px 4px; border: 0; color: #f4ecd4;
  background: linear-gradient(180deg, #6a5430, #46381e);
  box-shadow: 0 -2px 0 0 #c8a03a, 0 2px 0 0 #2a2210, -2px 0 0 0 #8a744a, 2px 0 0 0 #8a744a;
}
#hud .story button:hover { filter: brightness(1.18); }

#hud .qhead {
  display: none; align-items: center; gap: 5px; pointer-events: auto; cursor: pointer;
  font-size: 8px; letter-spacing: 3px; color: var(--gold-dim);
  text-shadow: 1px 1px 0 var(--ink); margin-bottom: 3px;
  background: rgba(14,18,12,0.82); box-shadow: var(--pix-frame);
  padding: 4px 7px; align-self: flex-end;
}
#hud .qhead.show { display: flex; }
#hud .qhead .qcaret { color: var(--gold); font-size: 9px; }
#hud .qhead .qn { color: #cfd8c8; }
#hud .quests::before {
  content: '◆ QUESTS'; display: block; font-size: 8px; letter-spacing: 3px;
  color: var(--gold-dim); margin-bottom: 2px; text-shadow: 1px 1px 0 var(--ink);
}
#hud .quests:empty::before { display: none; }
#hud .quests.folded { display: none; }
/* on touch the header replaces the inline caption, so it never doubles up */
body.touch #hud .quests::before { display: none; }
#hud .quests .q {
  padding: 5px 8px; font-size: 9px; line-height: 1.6;
  background: linear-gradient(90deg, rgba(20,25,15,0.9), rgba(14,18,12,0.6));
  border-left: 3px solid #7da05e; color: #cfd8c8;
}
#hud .quests .q .qn { color: var(--gold); font-size: 10px; display: block; }
#hud .quests .q.done { border-left-color: #ffd23e; }
#hud .quests .q.done .qp { color: #ffd23e; }
#hud .quests .q .qp { color: #b8d89a; }

/* ---- interact prompt (bottom center, above skill bar) ---- */
/* THE CENTRE COLUMN, stacked bottom-up: weapon chip (106) -> secondary prompt
   (142) -> primary prompt (176). These three were positioned independently and
   never checked together, which put .prompt2 at bottom:108 directly on top of
   .weapon-chip at bottom:106 — a 2px offset, so the interact button and the
   weapon name drew straight through each other. Measured heights are ~26px, so
   each step is height + 10px of air. */
#hud .prompt {
  position: absolute; left: 50%; bottom: 176px; transform: translateX(-50%);
  font-size: 12px; color: #f0ead8; background: rgba(14,18,12,0.85);
  border: 2px solid #4a5a42; padding: 6px 14px; display: none; white-space: nowrap;
  letter-spacing: 1px;
}
#hud .prompt.show { display: block; animation: prompt-in 0.12s; }
#hud .prompt b { color: #ffe27a; background: #202a20; border: 1px solid #4a5a42; padding: 0 5px; margin-right: 5px; }
@keyframes prompt-in { from { transform: translateX(-50%) translateY(4px); opacity: 0; } }
/* secondary interact prompt sits just under the primary */
#hud .prompt2 {
  position: absolute; left: 50%; bottom: 142px; transform: translateX(-50%);
  font-size: 11px; color: #cfd8c8; background: rgba(14,18,12,0.7);
  border: 2px solid #3a463a; padding: 4px 12px; display: none; white-space: nowrap;
  letter-spacing: 1px;
}
#hud .prompt2.show { display: block; }
#hud .prompt2 b { color: #b8e89a; background: #1a2216; border: 1px solid #3a463a; padding: 0 5px; margin-right: 5px; }

/* ---- skill bar (bottom center) ---- */
#hud .actionbar {
  position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
#hud .xpline { display: flex; align-items: center; gap: 7px; }
#hud .xpbar {
  width: 300px; height: 6px; background: #141a12; border: 1px solid #0a0f0a; box-shadow: 0 0 0 1px #39443a;
}
#hud .xpbar > div { height: 100%; background: linear-gradient(180deg, #8fe062, #58c93f); }
#hud .xplvl { font-size: 10px; color: #b8e89a; text-shadow: 1px 1px 0 #000; }
#hud .skillrow { display: flex; gap: 6px; padding: 6px 8px; border-radius: 3px; }
#hud .skill {
  width: 52px; height: 52px; position: relative; cursor: pointer; pointer-events: auto;
  background: #141a12 center/72% no-repeat; border: 2px solid #3a463a;
  image-rendering: pixelated;
}
#hud .skill:hover { border-color: #9ab86a; }
#hud .skill .key {
  position: absolute; top: 1px; left: 3px; font-size: 9px; color: #9aa890; text-shadow: 1px 1px 0 #000;
}
#hud .skill .cd {
  position: absolute; inset: 0; background: conic-gradient(rgba(6,8,6,0.85) 0turn, rgba(6,8,6,0.85) 0turn, transparent 0turn);
  display: none;
}
#hud .skill .cdt {
  position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  font-size: 15px; color: #fff; text-shadow: 1px 1px 0 #000;
}
#hud .skill.oncd .cd, #hud .skill.oncd .cdt { display: flex; }
#hud .skill .cnt {
  position: absolute; bottom: 1px; right: 3px; font-size: 10px; color: #e8e8d8; text-shadow: 1px 1px 0 #000;
}
#hud .skill .slv {
  position: absolute; bottom: 1px; left: 3px; font-size: 8px; color: var(--gold); text-shadow: 1px 1px 0 #000;
}
#hud .skill.empty { opacity: 0.45; }
#hud .weapon-chip {
  position: absolute; left: 50%; bottom: 106px; transform: translateX(-50%);
  display: flex; gap: 6px; align-items: center; font-size: 10px; color: #cfd8c8;
  background: rgba(12,16,11,0.7); padding: 3px 9px; border: 1px solid #35422f;
}
#hud .weapon-chip img { width: 18px; height: 18px; image-rendering: pixelated; }
#hud .weapon-chip .plus { color: #ffd23e; }

/* ---- menu: ONE button that opens a popup grid (no more button soup) ---- */
#hud .menubar { position: absolute; right: 10px; bottom: 10px; }
#hud .menubtn {
  pointer-events: auto; cursor: pointer;
  background: linear-gradient(180deg, #2a3522, #1a2215);
  border: 0; box-shadow: var(--pix-btn), 0 0 0 1px var(--ink);
  color: #ffe9b0; font-family: inherit; font-size: 13px; padding: 9px 16px;
  letter-spacing: 2px; margin: 2px;
}
#hud .menubtn:hover { filter: brightness(1.25); }
#hud .menubtn:active { transform: translateY(2px); }
#hud .menubtn .badge {
  display: none; margin-left: 6px; font-size: 9px; color: #241c0a; background: #e8574a;
  padding: 1px 5px; border-radius: 2px; vertical-align: 1px;
}
#hud .menubtn.hasnew .badge { display: inline-block; animation: badge-pop 1.2s ease-in-out infinite; }
@keyframes badge-pop { 50% { filter: brightness(1.35); } }
#hud .menupop .mtile .dbadge {
  margin-left: 4px; font-size: 8px; color: #241c0a; background: #e8574a; padding: 0 4px;
}
#hud .menupop {
  position: absolute; right: 8px; bottom: 54px; width: 264px;
  display: none; grid-template-columns: 1fr 1fr; gap: 7px; padding: 12px;
  background:
    var(--dither) 0 0/4px 4px,
    linear-gradient(180deg, var(--panel-1), var(--panel-2));
  box-shadow: var(--pix-frame);
  pointer-events: auto; z-index: 35;
}
#hud .menupop.show { display: grid; animation: pop-in 0.12s ease-out; }
@keyframes pop-in { from { transform: translateY(6px); opacity: 0; } }
#hud .menupop .mtile {
  display: flex; align-items: center; gap: 8px; padding: 9px 10px; cursor: pointer;
  background: #141a12; border: 0; box-shadow: inset 0 0 0 2px #2c352c;
  color: #cfd8c8; font-family: inherit; font-size: 10px; letter-spacing: 1px; text-align: left;
}
#hud .menupop .mtile:hover { box-shadow: inset 0 0 0 2px var(--gold); color: #ffe9b0; }
#hud .menupop .mtile .mi { font-size: 14px; width: 18px; text-align: center; }
#hud .menupop .mtile small { margin-left: auto; color: var(--gold-dim); font-size: 8px; }
#hud .autoflag {
  position: absolute; left: 50%; top: 58px; transform: translateX(-50%) translateY(-6px);
  display: none; align-items: center; gap: 8px;
  padding: 6px 14px; font-size: 10px; letter-spacing: 2px; color: #ffd0c0;
  background: rgba(40,14,10,0.86);
  box-shadow: inset 0 0 0 1px rgba(232,87,74,0.6);
  pointer-events: none; z-index: 6;
}
#hud .autoflag.show { display: flex; animation: af-in 0.3s ease-out; }
#hud .autoflag .dot {
  width: 7px; height: 7px; background: #e8574a; border-radius: 50%;
  animation: af-pulse 1.1s ease-in-out infinite;
}
#hud .autoflag small { color: #c09080; font-size: 8px; letter-spacing: 1px; }
@keyframes af-in { from { opacity: 0; transform: translateX(-50%) translateY(-14px); } }
@keyframes af-pulse { 50% { opacity: 0.25; } }
body.touch #hud .autoflag { top: 200px; font-size: 9px; padding: 5px 10px; }
#hud .menupop .mtile.quit { color: #c08880; box-shadow: inset 0 0 0 1px rgba(200,90,80,0.3); }
#hud .menupop .mtile.quit:hover { color: #ffb0a0; }
/* the one tile that leaves the world — coloured apart so it is never a mis-tap */
#hud .menupop .mtile.quit { color: #c08880; box-shadow: inset 0 0 0 1px rgba(200,90,80,0.3); }
#hud .menupop .mtile.quit:hover { color: #ffb0a0; }
#hud .menupop .mtile.auto-on { box-shadow: inset 0 0 0 2px #e8574a; color: #ffd0c0; }

/* ---- toasts (bottom left) ---- */
#hud .toasts { position: absolute; left: 10px; bottom: 10px; display: flex; flex-direction: column-reverse; gap: 3px; }
#hud .toast {
  display: flex; align-items: center; gap: 6px; font-size: 11px;
  background: rgba(14,18,12,0.85); border-left: 3px solid #7da05e;
  padding: 3px 9px 3px 5px; color: #dde5d5; width: max-content;
  animation: toast-in 0.15s;
}
#hud .toast img { width: 15px; height: 15px; image-rendering: pixelated; }
#hud .toast.quest { border-left-color: #ffd23e; color: #ffe9a8; }
@keyframes toast-in { from { transform: translateX(-8px); opacity: 0; } }

/* ---- overlays ---- */
#hud .vignette {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.15s;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(160,20,10,0.5) 100%);
}
#hud .lowhp {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(140,10,5,0.42) 100%);
  animation: lowhp-pulse 1.1s infinite;
}
@keyframes lowhp-pulse { 50% { opacity: 0.9; } }
#hud .banner {
  position: absolute; left: 50%; top: 24%; transform: translateX(-50%);
  font-family: var(--font-display); font-size: 24px; color: #ffe27a; text-shadow: 0 2px 0 #5e3c10, 0 4px 10px #000, 0 0 24px var(--gold-glow);
  letter-spacing: 3px; opacity: 0; transition: opacity 0.3s; white-space: nowrap;
}
#hud .banner::before, #hud .banner::after {
  content: '◆'; font-size: 14px; color: var(--gold-dim); vertical-align: 4px; margin: 0 12px;
}
/* ---- first-run onboarding overlay ---- */
#hud .onboard {
  position: absolute; inset: 0; z-index: 60; display: none;
  align-items: center; justify-content: center; pointer-events: auto;
  background: rgba(6,9,6,0.82);
}
#hud .onboard.show { display: flex; animation: ob-in 0.2s; }
@keyframes ob-in { from { opacity: 0; } }
#hud .onboard .card {
  width: min(440px, 90vw); max-height: 86vh; overflow-y: auto; padding: 20px;
  background: var(--dither) 0 0/4px 4px, linear-gradient(180deg, var(--panel-1), var(--panel-2));
  box-shadow: var(--pix-frame), inset 0 0 50px rgba(0,0,0,0.45);
}
#hud .onboard h2 {
  font-family: var(--font-display); font-size: 15px; letter-spacing: 3px; color: var(--gold);
  text-align: center; margin-bottom: 4px; text-shadow: 0 0 12px var(--gold-glow);
  word-break: break-word;
}
#hud .onboard .sub { text-align: center; font-size: 9px; color: var(--muted); letter-spacing: 2px; margin-bottom: 14px; word-break: break-word; }
#hud .onboard h3 {
  font-size: 10px; letter-spacing: 2px; color: var(--gold-dim); margin: 12px 0 6px;
  border-bottom: 1px solid var(--line-soft); padding-bottom: 4px;
}
#hud .onboard .step { display: flex; gap: 9px; align-items: flex-start; font-size: 11px; color: #cfd8c8; margin-bottom: 7px; line-height: 1.6; }
#hud .onboard .step .n {
  flex-shrink: 0; width: 18px; height: 18px; line-height: 18px; text-align: center; font-size: 10px;
  color: #241c0a; background: var(--gold); border-radius: 3px;
}
#hud .onboard .ctrls { display: grid; grid-template-columns: auto 1fr; gap: 5px 10px; font-size: 11px; color: #cfd8c8; }
#hud .onboard .ctrls b {
  color: #ffe27a; background: #202a20; border: 1px solid #4a5a42; padding: 1px 6px; font-weight: normal;
  text-align: center; white-space: nowrap;
}
#hud .onboard .go {
  display: block; width: 100%; margin-top: 16px; padding: 12px; text-align: center; cursor: pointer;
  font-family: var(--font-display); font-size: 12px; letter-spacing: 3px; color: #ffe9b0; border: 0;
  background: linear-gradient(180deg, #6a5430, #46381e);
  box-shadow: 0 -3px 0 0 #c8a03a, 0 3px 0 0 #2a2210, -3px 0 0 0 #8a744a, 3px 0 0 0 #8a744a, 0 0 0 3px var(--ink) inset;
}
#hud .onboard .go:hover { filter: brightness(1.18); }
/* phones: shrink type & spacing so the welcome card never gets clipped */
body.touch #hud .onboard .card { width: 94vw; padding: 14px 13px; max-height: 92vh; }
body.touch #hud .onboard h2 { font-size: 12px; letter-spacing: 1px; }
body.touch #hud .onboard .sub { font-size: 8px; letter-spacing: 1px; }
body.touch #hud .onboard h3 { font-size: 9px; }
body.touch #hud .onboard .step { font-size: 10px; gap: 7px; }
body.touch #hud .onboard .ctrls { grid-template-columns: auto 1fr auto 1fr; gap: 4px 6px; font-size: 9px; }
body.touch #hud .onboard .ctrls b { padding: 1px 4px; }
body.touch #hud .onboard .go { font-size: 11px; padding: 11px; letter-spacing: 2px; }

/* ---- waypoint beacon (from the world-map mark) ---- */
#hud .pinbeacon {
  position: absolute; left: 50%; top: 12px; transform: translateX(-50%);
  display: none; align-items: center; gap: 8px;
  font-size: 11px; color: #ffb896; letter-spacing: 1px;
  background: rgba(20,14,10,0.85); padding: 5px 12px;
  box-shadow: 0 0 0 2px #8a4a34, 0 0 0 4px var(--ink);
  pointer-events: none;
}
#hud .pinbeacon.show { display: flex; }
#hud .pinbeacon .arr { font-size: 14px; color: #ff8a5e; display: inline-block; transition: transform 0.12s linear; }

/* ---- level up celebration ---- */
#hud .lvlup {
  position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%);
  display: none; flex-direction: column; align-items: center; gap: 10px;
  pointer-events: none; z-index: 40;
}
#hud .lvlup.show { display: flex; }
#hud .lvlup .rays {
  position: absolute; width: 340px; height: 340px; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: conic-gradient(from 0deg,
    transparent 0deg 14deg, rgba(255,210,62,0.18) 14deg 22deg,
    transparent 22deg 50deg, rgba(255,210,62,0.14) 50deg 58deg,
    transparent 58deg 86deg, rgba(255,226,122,0.18) 86deg 94deg,
    transparent 94deg 122deg, rgba(255,210,62,0.14) 122deg 130deg,
    transparent 130deg 158deg, rgba(255,226,122,0.16) 158deg 166deg,
    transparent 166deg 194deg, rgba(255,210,62,0.16) 194deg 202deg,
    transparent 202deg 230deg, rgba(255,226,122,0.14) 230deg 238deg,
    transparent 238deg 266deg, rgba(255,210,62,0.18) 266deg 274deg,
    transparent 274deg 302deg, rgba(255,226,122,0.14) 302deg 310deg,
    transparent 310deg 338deg, rgba(255,210,62,0.16) 338deg 346deg, transparent 346deg);
  border-radius: 50%; animation: lvl-rays 6s linear infinite;
  -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 68%);
  mask-image: radial-gradient(circle, #000 30%, transparent 68%);
}
@keyframes lvl-rays { to { transform: translate(-50%, -50%) rotate(360deg); } }
#hud .lvlup .lu-ribbon {
  font-size: 11px; letter-spacing: 5px; color: #241c0a; padding: 4px 18px;
  background: linear-gradient(180deg, #ffe27a, #e8b93e);
  box-shadow: 0 0 0 2px #5e3c10, 0 0 0 4px var(--ink), 0 0 18px var(--gold-glow);
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%);
  animation: lvl-pop 0.4s cubic-bezier(0.2, 2.4, 0.4, 1);
  text-shadow: none;
}
#hud .lvlup .lu-num {
  font-family: var(--font-display);
  font-size: 60px; line-height: 1; color: var(--gold); margin-top: 2px;
  text-shadow: 0 3px 0 #5e3c10, 0 6px 14px #000, 0 0 34px var(--gold-glow);
  animation: lvl-bounce 0.6s cubic-bezier(0.2, 2.6, 0.4, 1);
}
#hud .lvlup .lu-ring {
  position: absolute; width: 60px; height: 60px; top: 50%; left: 50%;
  margin: -30px 0 0 -30px; border: 3px solid var(--gold); border-radius: 50%;
  opacity: 0; animation: lvl-ring 0.9s ease-out 0.15s;
}
@keyframes lvl-ring { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(5); opacity: 0; } }
#hud .lvlup .lu-rewards { display: flex; flex-direction: column; gap: 5px; align-items: center; margin-top: 8px; }
#hud .lvlup .lu-r {
  display: flex; align-items: center; gap: 7px; font-size: 11px; color: #ffe9a8;
  background: rgba(16,14,6,0.9); padding: 5px 14px;
  box-shadow: 0 0 0 2px #6a5a2a, 0 0 0 4px var(--ink);
  animation: lvl-rise 0.4s backwards;
  text-shadow: 1px 1px 0 #000;
}
#hud .lvlup .lu-r img { width: 18px; height: 18px; image-rendering: pixelated; }
@keyframes lvl-pop { from { transform: scale(0.2); opacity: 0; } }
@keyframes lvl-bounce {
  0% { transform: scale(0.1); opacity: 0; }
  55% { transform: scale(1.25); opacity: 1; }
  75% { transform: scale(0.94); }
  100% { transform: scale(1); }
}
@keyframes lvl-rise { from { transform: translateY(12px); opacity: 0; } }

#hud .deadwrap {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, #300606aa 30%, #1a0303dd 100%);
  display: none; align-items: center; justify-content: center; flex-direction: column; gap: 16px;
}
#hud .deadwrap.show { display: flex; pointer-events: auto; }
#hud .deadwrap h2 { font-size: 34px; color: #ffb0a0; letter-spacing: 7px; text-shadow: 0 3px 0 #400; }
#hud .deadwrap button {
  font-family: inherit; font-size: 14px; padding: 10px 26px; cursor: pointer;
  background: #2a332a; color: #e8e8d8; border: 2px solid #46534a;
}
#hud .hint-desktop {
  position: absolute; right: 10px; bottom: 46px; font-size: 9px; color: #8fa584;
  text-align: right; line-height: 1.9; text-shadow: 1px 1px 0 #000;
}
#hud .hint-desktop b { background: #202a20; border: 1px solid #39443a; padding: 0 4px; color: #c5cdbd; }

/* touch devices: skills live on the right-hand buttons. The ENTIRE bottom of
   the screen belongs to the thumb buttons — every status readout (XP bar,
   weapon chip) stacks in a tidy column under the character plate instead,
   so nothing ever collides with the action cluster. */
body.touch #hud .skillrow { display: none; }
body.touch #hud .hint-desktop { display: none; }
body.touch #hud .prompt { display: none !important; } /* mobile uses the context button */
/* left column: plate (top 10) → XP bar → ☰ MENU → weapon chip */
body.touch #hud .actionbar {
  left: 12px; right: unset; bottom: unset; top: 74px;
  transform: none; align-items: flex-start; gap: 0;
}
body.touch #hud .xpline { gap: 5px; }
body.touch #hud .xpbar { width: 132px; height: 5px; }
body.touch #hud .xplvl { font-size: 8px; }
body.touch #hud .menubar { right: unset; left: 10px; bottom: unset; top: 92px; }
body.touch #hud .menupop { right: unset; left: 0; bottom: unset; top: 46px; width: min(264px, calc(100vw - 40px)); }
body.touch #hud .weapon-chip {
  left: 12px; right: unset; bottom: unset; top: 138px; transform: none;
  font-size: 9px; padding: 2px 7px; max-width: 44vw;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
body.touch #hud .weapon-chip img { width: 14px; height: 14px; }
body.touch #hud .buffs { top: 168px; left: 12px; bottom: unset; }
body.touch #hud .buffs .bf { width: 20px; height: 20px; }
/* toasts float above the button cluster so pickups never hide behind thumbs */
body.touch #hud .toasts { bottom: 235px; }
body.touch #hud .toast { font-size: 10px; }

@media (max-width: 760px) {
  #hud .mapbox { width: 96px; }
  #hud .mapbox .minimap { width: 96px; height: 96px; }
  #hud .plate .bars { min-width: 104px; }
  #hud .plate .portrait { width: 38px; height: 38px; }
  #hud .skill { width: 46px; height: 46px; }
  #hud .xpbar { width: 180px; }
  #hud .hint-desktop { display: none; }
  /* clear of the minimap block, which runs to y=159 on a 375px screen once the
     clock bar under it is counted — 150 left a 9px overlap, which is exactly
     the "quest list covers the map" report */
  #hud .qtrack { top: 172px; right: 6px; width: 132px; max-height: 42vh; }
  #hud .quests { max-height: 34vh; overflow-y: auto; }
  #hud .quests .q { font-size: 8px; padding: 4px 6px; }
  #hud .banner { font-size: 18px; }
}
`;

export function createHUD(root, { inventory, character, forge, audio }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const cls = CLASSES[character.cls];
  let skillIds = cls.skills;

  /** One cell per loadout slot. An unfilled slot is drawn as a LOCKED plate
   *  rather than omitted: an Origin has no skills at all, and a skill row that
   *  silently shrinks to nothing looks broken instead of looking earned. */
  function skillCells(ids) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const id = ids[i];
      if (id && SKILLS[id]) {
        out.push(`<div class="skill" data-skill="${id}"
          style="background-image:url(${skillIconUrl(id, SKILLS[id].icon)})"
          title="${SKILLS[id].name} — ${SKILLS[id].desc}">
          <span class="key">${i + 1}</span><span class="slv"></span><div class="cd"></div><span class="cdt"></span>
        </div>`);
      } else {
        out.push(`<div class="skill empty" title="No skill yet — the Grand Master awakens your class at Lv10.">
          <span class="key">${i + 1}</span><span class="lock">·</span>
        </div>`);
      }
    }
    return out.join('');
  }

  root.innerHTML = `
    <div class="vignette"></div>
    <div class="lowhp"></div>
    <div class="plate frame" style="--cc:${cls.color}">
      <div class="portrait"><canvas width="16" height="16"></canvas><span class="lv"></span></div>
      <div class="bars">
        <div class="pname"><span>${character.name}</span><span class="cls">${cls.name.toUpperCase()}</span></div>
        <div class="bar hp"><div></div><span class="txt"></span></div>
        <div class="bar st"><div></div></div>
      </div>
    </div>
    <div class="buffs"></div>
    <div class="mapbox">
      <div class="minimap frame"><canvas width="150" height="150"></canvas><span class="compass">N</span></div>
      <div class="under frame">
        <span class="clock">10:00</span><span class="daynight">☀</span>
        <button class="iconbtn mute">${audio.isMuted() ? '🔇' : '🔊'}</button>
      </div>
    </div>
    <div class="story"><div class="card"></div></div>
    <div class="catch"><div class="cbox"></div></div>
    <div class="qtrack">
      <button class="qhead"><span class="qcaret">▾</span>QUESTS<span class="qn"></span></button>
      <div class="quests"></div>
    </div>
    <div class="pinbeacon"><span class="arr">➤</span><span class="txt"></span></div>
    <div class="prompt"></div>
    <div class="prompt2"></div>
    <div class="onboard"></div>
    <div class="online"><span class="dot"></span><b>1</b> online</div>
    <div class="weapon-chip"></div>
    <div class="actionbar">
      <div class="xpline"><span class="xplvl"></span><div class="xpbar"><div></div></div></div>
      <div class="skillrow frame">
        ${skillCells(skillIds)}
        <div class="skill potion" data-potion="1" style="background-image:url(${itemIconUrl('tonic')})" title="Health Tonic">
          <span class="key">4</span><span class="cnt">0</span>
        </div>
      </div>
    </div>
    <div class="menubar">
      <div class="menupop">
        <button class="mtile" data-menu="inv"><span class="mi">🎒</span>BAG<small>Tab</small></button>
        <button class="mtile" data-menu="cra"><span class="mi">🔧</span>CRAFT<small>C</small></button>
        <button class="mtile" data-menu="forge"><span class="mi">⚒</span>FORGE<small>V</small></button>
        <button class="mtile" data-menu="pets"><span class="mi">🐾</span>PETS<small>P</small></button>
        <button class="mtile" data-menu="ward"><span class="mi">🧢</span>WARDROBE<small>O</small></button>
        <button class="mtile" data-menu="tree"><span class="mi">✦</span>SKILL TREE<small>K</small></button>
        <button class="mtile" data-menu="skills"><span class="mi">◆</span>SKILL LEVELS<small></small></button>
        <button class="mtile" data-menu="map"><span class="mi">🗺</span>MAP<small>N</small></button>
        <button class="mtile" data-menu="home"><span class="mi">⌂</span>GO HOME<small>T</small></button>
        <button class="mtile" data-menu="village"><span class="mi">⛺</span>BASECAMP<small>Y</small></button>
        <button class="mtile autobtn" data-menu="auto"><span class="mi">⚔</span>AUTO-BATTLE<small>B</small></button>
        <button class="mtile" data-menu="help"><span class="mi">?</span>GUIDE<small>H</small></button>
        <button class="mtile" data-menu="index"><span class="mi">📕</span>THE INDEX<small>X</small><i class="xbadge"></i></button>
        <button class="mtile" data-menu="friends"><span class="mi">👥</span>FRIENDS<small></small></button>
        <button class="mtile" data-menu="life"><span class="mi">🎣</span>LIFE SKILLS<small>L</small><i class="lbadge"></i></button>
        <button class="mtile" data-menu="daily"><span class="mi">🎁</span>DAILY<small>J</small></button>
        <button class="mtile" data-menu="pass"><span class="mi">★</span>GAMEPASS<small>U</small></button>
        <button class="mtile" data-menu="gfx"><span class="mi">⚙</span>GRAPHICS<small></small></button>
        <button class="mtile" data-menu="about"><span class="mi">✦</span>ABOUT<small></small></button>
        <button class="mtile" data-menu="stats"><span class="mi">◈</span>STATS<small>Z</small></button>
        <button class="mtile quit" data-menu="quit"><span class="mi">⏻</span>MAIN MENU<small></small></button>
      </div>
      <button class="menubtn">☰ MENU<span class="badge">!</span></button>
    </div>
    <div class="hint-desktop">
      <b>LMB</b> Attack (auto-aim) · <b>RMB / Shift</b> Roll ${cls.hasShield ? '· <b>Shift</b> Block' : ''} · <b>Space</b> Jump · <b>F</b> Interact<br>
      <b>1-3</b> Skills · <b>4</b> Tonic · <b>M</b> Mount · <b>N</b> Map · <b>O</b> Wardrobe · <b>Z</b> Stats · <b>T</b> Home · <b>Y</b> Basecamp · <b>G</b> AFK Fish · <b>B</b> Auto-Battle · <b>Q/E</b> Turn · <b>↑↓</b> Tilt
    </div>
    <div class="toasts"></div>
    <div class="banner"></div>
    <div class="lvlup"><div class="rays"></div><div class="lu-ring"></div><span class="lu-ribbon">LEVEL UP!</span><span class="lu-num"></span><div class="lu-rewards"></div></div>
    <div class="deadwrap"><h2>YOU FELL</h2><button>RISE AT THE VILLAGE</button></div>
  `;

  const els = {
    hpFill: root.querySelector('.bar.hp > div'),
    hpTxt: root.querySelector('.bar.hp .txt'),
    stFill: root.querySelector('.bar.st > div'),
    lv: root.querySelector('.plate .lv'),
    buffs: root.querySelector('.buffs'),
    xpFill: root.querySelector('.xpbar > div'),
    xpLvl: root.querySelector('.xplvl'),
    weaponChip: root.querySelector('.weapon-chip'),
    skillEls: [...root.querySelectorAll('[data-skill]')],
    potionEl: root.querySelector('[data-potion]'),
    toasts: root.querySelector('.toasts'),
    clock: root.querySelector('.clock'),
    daynight: root.querySelector('.daynight'),
    banner: root.querySelector('.banner'),
    dead: root.querySelector('.deadwrap'),
    deadBtn: root.querySelector('.deadwrap button'),
    minimapCanvas: root.querySelector('.minimap canvas'),
    vignette: root.querySelector('.vignette'),
    lowhp: root.querySelector('.lowhp'),
    muteBtn: root.querySelector('.mute'),
    quests: root.querySelector('.quests'),
    prompt: root.querySelector('.prompt'),
    prompt2: root.querySelector('.prompt2'),
  };

  // pixel portrait from the character's face texture (redrawn after a
  // wardrobe appearance edit)
  function refreshPortrait() {
    const skin = SKIN_TONES[(character.skin ?? 0) % SKIN_TONES.length];
    const hairC = HAIR_COLORS[(character.hairColor ?? 0) % HAIR_COLORS.length];
    const eyeC = EYE_COLORS[(character.eyes ?? 0) % EYE_COLORS.length];
    const faceTex = makePlayerFaceTexture(skin, hairC, eyeC, character.gender === 'female',
      character.hairStyle === BALD_STYLE, character.accessory ?? 0);
    const pc = root.querySelector('.portrait canvas');
    pc.getContext('2d').clearRect(0, 0, pc.width, pc.height);
    pc.getContext('2d').drawImage(faceTex.image, 0, 0);
  }
  refreshPortrait();

  let bannerT = null;
  let vignetteT = 0;
  let raining = false;

  const callbacks = { onSkill: null, onPotion: null, onMenu: null, onRespawn: null };
  function bind(cb) { Object.assign(callbacks, cb); }

  root.querySelector('.skillrow').addEventListener('click', (e) => {
    const sk = e.target.closest('[data-skill]');
    if (sk) callbacks.onSkill?.(sk.dataset.skill);
    if (e.target.closest('[data-potion]')) callbacks.onPotion?.();
  });
  const menuPop = root.querySelector('.menupop');
  root.querySelector('.menubtn').addEventListener('click', () => {
    menuPop.classList.toggle('show');
  });
  root.querySelector('.menubar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]');
    if (b) {
      menuPop.classList.remove('show');
      callbacks.onMenu?.(b.dataset.menu);
    }
  });
  // QUEST TRACKER FOLD. On a phone the list runs down the right edge straight
  // over the minimap, so the header is a toggle. Desktop has the room and keeps
  // the list open, but the button works there too if it is ever shown.
  const questsEl = root.querySelector('.quests');
  const qHead = root.querySelector('.qhead');
  // On a phone the tracker starts FOLDED: the screen is small and the list is
  // opt-in. Desktop has the room, so it stays open.
  let questsFolded = document.body.classList.contains('touch')
    || matchMedia('(pointer: coarse)').matches;
  if (questsFolded) {
    questsEl.classList.add('folded');
    qHead.querySelector('.qcaret').textContent = '▸';
  }
  qHead.addEventListener('click', () => {
    questsFolded = !questsFolded;
    questsEl.classList.toggle('folded', questsFolded);
    qHead.querySelector('.qcaret').textContent = questsFolded ? '▸' : '▾';
  });

  /**
   * Show one story chapter as a CARD, not a modal. A full-screen overlay in the
   * middle of play is the wrong shape for an ambient beat — it hid the game and
   * demanded a click. This slides in low on the screen, never takes input away
   * from the world, and gets out of the way on its own.
   */
  const storyEl = root.querySelector('.story');
  const storyLog = [];              // every chapter shown, for the journal
  function hideStory() {
    storyEl.classList.add('out');
    setTimeout(() => { storyEl.classList.remove('show', 'out'); }, 480);
  }
  function showStory(ch) {
    // IT WAITS. This used to dismiss itself after 16 seconds, which meant the
    // card vanished mid-sentence — a story beat that deletes itself while you
    // are reading it is worse than no story at all. It now stays until the
    // player closes it, and every chapter is kept in the journal (☰ > GUIDE)
    // so anything missed can be read again.
    // SHORTER ON SCREEN, WHOLE IN THE JOURNAL.
    //
    // Four paragraphs of prose stopping the game dead was too much to be handed
    // mid-session, however good the writing is — people skip a wall of text and
    // then feel they missed something. The card shows the OPENING line and what
    // to do next; the full chapter is always in ☰ → GUIDE, and the card says so.
    storyLog.push(ch);
    const rw = ch.reward ? `<div class="rw">◆ ${ch.reward.label.toUpperCase()}</div>` : '';
    const rest = ch.lines.length > 1
      ? `<div class="more">+${ch.lines.length - 1} more — read the full chapter in ☰ GUIDE</div>` : '';
    storyEl.querySelector('.card').innerHTML = `
      <div class="ch">ANAVELA · ${ch.title.split(' · ')[0]}</div>
      <h2>${ch.title.split(' · ')[1] || ch.title}</h2>
      <div class="rule"></div>
      <p>${ch.lines[0]}</p>
      ${rest}
      ${rw}
      ${ch.hint ? `<div class="nx">NEXT · ${ch.hint}</div>` : ''}
      <button>CONTINUE</button>`;
    storyEl.classList.remove('out');
    storyEl.classList.add('show');
    storyEl.querySelector('button').addEventListener('click', hideStory);
  }
  const getStoryLog = () => storyLog;

  // --- CATCH CARD -----------------------------------------------------------
  const catchEl = root.querySelector('.catch');
  let catchTimer = null;
  function showCatch(fishId, rarity, xp, sell) {
    clearTimeout(catchTimer);
    const R = RARITY[rarity] || RARITY.common;
    const big = rarity === 'legendary' || rarity === 'mythic' || rarity === 'epic';
    const sparks = big ? Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<i class="spark" style="left:50%;top:44%;--dx:${Math.cos(a) * 70}px;--dy:${Math.sin(a) * 70}px;animation-delay:${i * 0.02}s"></i>`;
    }).join('') : '';
    catchEl.style.setProperty('--rc', R.color);
    catchEl.querySelector('.cbox').innerHTML = `
      ${sparks}
      <div class="cr">${'◆'.repeat(RARITY_ORDER.indexOf(rarity) + 1)} ${R.name.toUpperCase()}</div>
      <img src="${itemIconUrl(fishId)}">
      <div class="cn">${ITEMS[fishId].name}</div>
      <div class="cs">+<b>${xp}</b> XP · worth <b>${sell}c</b></div>`;
    catchEl.classList.remove('out');
    catchEl.classList.add('show');
    // longer for a rare fish — it is the payoff for the cast
    catchTimer = setTimeout(() => {
      catchEl.classList.add('out');
      setTimeout(() => catchEl.classList.remove('show', 'out'), 460);
    }, big ? 3400 : 2000);
  }

  function closeMenu() { menuPop.classList.remove('show'); }
  // pulsing "!" on the ☰ button + a count on the DAILY tile whenever a
  // check-in or a finished daily quest is waiting to be claimed
  const menuBtn = root.querySelector('.menubtn');
  const dailyTile = root.querySelector('[data-menu="daily"]');
  let badgeN = -1;
  /** A dot on the LIFE SKILLS tile whenever a point is waiting to be spent. */
  function setLifeBadge(n) {
    const b = root.querySelector('.mtile[data-menu="life"] .lbadge');
    if (b) b.classList.toggle('on', n > 0);
  }

  /** A dot on THE INDEX tile whenever a completed category can be cashed in. */
  function setIndexBadge(n) {
    const b = root.querySelector('.mtile[data-menu="index"] .xbadge');
    if (b) b.classList.toggle('on', n > 0);
  }

  function setMenuBadge(n) {
    if (n === badgeN) return;
    badgeN = n;
    menuBtn.classList.toggle('hasnew', n > 0);
    let db = dailyTile.querySelector('.dbadge');
    if (n > 0) {
      if (!db) { db = document.createElement('span'); db.className = 'dbadge'; dailyTile.appendChild(db); }
      db.textContent = n;
    } else db?.remove();
  }
  // any HUD-level overlay that must block the mobile joystick/camera zones
  function isMenuPopOpen() {
    return menuPop.classList.contains('show')
      || root.querySelector('.onboard').classList.contains('show');
  }
  els.deadBtn.addEventListener('click', () => callbacks.onRespawn?.());
  els.muteBtn.addEventListener('click', () => {
    const m = audio.toggleMute();
    els.muteBtn.textContent = m ? '🔇' : '🔊';
  });

  function updateVitals(player, leveling, dt) {
    const s = player.state;
    els.hpFill.style.width = `${(s.hp / s.maxHp) * 100}%`;
    els.hpTxt.textContent = `${Math.ceil(s.hp)} / ${s.maxHp}`;
    els.stFill.style.width = `${(s.stamina / s.maxStamina) * 100}%`;
    els.lv.textContent = `Lv${leveling.state.level}`;
    els.xpFill.style.width = `${leveling.progress() * 100}%`;
    els.xpLvl.textContent = `Lv${leveling.state.level}`;
    els.lowhp.style.opacity = s.hp / s.maxHp < 0.3 && !s.dead ? '0.7' : '0';
    if (vignetteT > 0) {
      vignetteT -= dt;
      if (vignetteT <= 0) els.vignette.style.opacity = '0';
    }
    // buffs
    const html = s.buffs.filter((b) => b.t < 9000).map((b) => {
      const sk = SKILLS[b.id];
      const url = sk ? skillIconUrl(b.id, sk.icon) : '';
      return `<div class="bf" style="background-image:url(${url})" title="${sk?.name || b.id}"><i style="width:${Math.min(100, b.t * 16)}%"></i></div>`;
    }).join('');
    if (els.buffs.innerHTML !== html) els.buffs.innerHTML = html;
  }

  function updateSkills(skillSys) {
    for (const el of els.skillEls) {
      const id = el.dataset.skill;
      const frac = skillSys.cdFrac(id);
      if (frac > 0) {
        el.classList.add('oncd');
        const deg = (1 - frac) * 360;
        el.querySelector('.cd').style.background =
          `conic-gradient(transparent ${deg}deg, rgba(6,8,6,0.85) ${deg}deg)`;
        el.querySelector('.cdt').textContent = Math.ceil(frac * SKILLS[id].cd);
      } else {
        el.classList.remove('oncd');
      }
      if (skillSys.levelOf) {
        const lvl = skillSys.levelOf(id);
        const chip = el.querySelector('.slv');
        const txt = lvl > 1 ? `Lv${lvl}` : '';
        if (chip.textContent !== txt) chip.textContent = txt;
      }
    }
    const n = inventory.count('tonic');
    els.potionEl.querySelector('.cnt').textContent = n;
    els.potionEl.classList.toggle('empty', n === 0);
  }

  function updateWeaponChip() {
    const id = inventory.state.equipped;
    const d = ITEMS[id];
    const plus = forge.plusOf(id);
    els.weaponChip.innerHTML =
      `<img src="${itemIconUrl(id)}"> ${d.name} ${plus > 0 ? `<span class="plus">+${plus}</span>` : ''}`;
  }
  inventory.onChange(updateWeaponChip);
  updateWeaponChip();

  // quest tracker: [{name, label, p, n, done}]
  const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

  function updateQuests(lines) {
    // DISTANCE AND DIRECTION on every row. `dist` and `dir` are filled in by
    // the caller from the objective's resolved position — without them a
    // tracker is a list of chores with no map, which is exactly how a new
    // player ends up holding a finished quest they cannot find the owner of.
    const html = lines.map((l) => {
      const arrow = l.dir != null ? ARROWS[Math.round((((l.dir % 360) + 360) % 360) / 45) % 8] : '';
      const way = l.dist != null
        ? `<span class="qway">${arrow} ${l.dist < 3 ? 'you are here' : `${Math.round(l.dist)}m away`}</span>`
        : '';
      return `<div class="q ${l.done ? 'done' : ''}" data-quest="${l.id}" title="Click to mark it on your map">
        <span class="qn">${l.name}</span>
        <span class="qp">${l.done ? `✔ Return to ${l.giverName}` : `${l.label} — ${l.p}/${l.n}`}</span>
        ${way}
      </div>`;
    }).join('');
    if (els.quests.innerHTML !== html) els.quests.innerHTML = html;
    // the fold button only appears when there is something to fold
    qHead.classList.toggle('show', lines.length > 0);
    qHead.querySelector('.qn').textContent = lines.length ? ` (${lines.length})` : '';
  }

  // interact prompts: primary { key, label }, optional secondary { key, label }
  function setPrompt(p, p2 = null) {
    if (!p) { els.prompt.classList.remove('show'); }
    else {
      const html = `<b>${p.key}</b>${p.label}`;
      if (els.prompt.innerHTML !== html) els.prompt.innerHTML = html;
      els.prompt.classList.add('show');
    }
    if (!p2) { els.prompt2.classList.remove('show'); }
    else {
      const html2 = `<b>${p2.key}</b>${p2.label}`;
      if (els.prompt2.innerHTML !== html2) els.prompt2.innerHTML = html2;
      els.prompt2.classList.add('show');
    }
  }

  function showHurt() {
    els.vignette.style.opacity = '1';
    vignetteT = 0.35;
  }

  function toast(id, count) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<img src="${itemIconUrl(id)}"> ${ITEMS[id].name}${count > 1 ? ` x${count}` : ''}`;
    els.toasts.appendChild(el);
    while (els.toasts.childElementCount > 6) els.toasts.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 2600);
    setTimeout(() => el.remove(), 3100);
  }

  function toastText(text) {
    const el = document.createElement('div');
    el.className = 'toast quest';
    el.textContent = text;
    els.toasts.appendChild(el);
    while (els.toasts.childElementCount > 6) els.toasts.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 3200);
    setTimeout(() => el.remove(), 3700);
  }

  function banner(text) {
    els.banner.textContent = text;
    els.banner.style.opacity = '1';
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { els.banner.style.opacity = '0'; }, 2200);
  }

  function setClock(text, isNight) {
    els.clock.textContent = text;
    els.daynight.textContent = raining ? '🌧' : (isNight ? '🌙' : '☀');
  }
  function setWeather(r) { raining = r; }
  function showDead(show) { els.dead.classList.toggle('show', show); }
  const autoBtn = root.querySelector('.autobtn');

  /** Auto-battle needs a marker that STAYS. A toast that fades leaves the
   *  player watching their character fight on its own with nothing on screen
   *  explaining why — which reads as losing control, not as a feature. The
   *  menu tile also flips its label to STOP, so the way out is the same button
   *  that got you in. */
  const autoFlag = document.createElement('div');
  autoFlag.className = 'autoflag';
  autoFlag.innerHTML = '<span class="dot"></span>AUTO BATTLE ACTIVATED<small>B / ⚔ to stop</small>';
  root.appendChild(autoFlag);

  function setAuto(on) {
    autoBtn?.classList.toggle('auto-on', !!on);
    autoFlag.classList.toggle('show', !!on);
    const tile = root.querySelector('.mtile[data-menu="auto"]');
    if (tile) {
      const label = tile.childNodes[1];
      if (label) label.textContent = on ? 'STOP AUTO' : 'AUTO-BATTLE';
      tile.classList.toggle('auto-on', !!on);
    }
  }

  // live rename support (Wardrobe → APPEARANCE): refresh the plate name
  function setName(name) {
    const el = root.querySelector('.plate .pname span');
    if (el) el.textContent = name;
  }

  // waypoint beacon: arrow rotates toward the mark, shows remaining distance
  const beaconEl = root.querySelector('.pinbeacon');
  const beaconArr = beaconEl.querySelector('.arr');
  const beaconTxt = beaconEl.querySelector('.txt');
  function setBeacon(b) {
    if (!b) { beaconEl.classList.remove('show'); return; }
    beaconEl.classList.add('show');
    beaconArr.style.transform = `rotate(${b.angle}rad)`;
    const txt = `MARK · ${Math.round(b.dist)}m`;
    if (beaconTxt.textContent !== txt) beaconTxt.textContent = txt;
  }

  // level-up celebration: golden rays + big level number + reward chips
  const lvlEl = root.querySelector('.lvlup');
  let lvlT = null;
  function levelUp(lv, rewards = []) {
    lvlEl.querySelector('.lu-num').textContent = lv; // just the number — the ribbon already says LEVEL UP
    lvlEl.querySelector('.lu-rewards').innerHTML = rewards.map((r, i) =>
      `<div class="lu-r" style="animation-delay:${0.35 + i * 0.18}s">
        ${r.icon ? `<img src="${itemIconUrl(r.icon)}">` : '✦'} ${r.label}
      </div>`).join('');
    // retrigger the pop animations
    lvlEl.classList.remove('show');
    void lvlEl.offsetWidth;
    lvlEl.classList.add('show');
    clearTimeout(lvlT);
    lvlT = setTimeout(() => lvlEl.classList.remove('show'), 3400);
  }

  // first-run "how to play" overlay — platform-aware controls + first steps
  const onboardEl = root.querySelector('.onboard');
  function showOnboarding(touch, onDone) {
    const steps = [
      touch ? 'Use the left stick to move; drag the right side to look around.'
        : 'Move with WASD. Move the mouse to aim — attacks auto-target the nearest foe.',
      touch ? 'Tap ⚔ to attack, the skill buttons to cast, ↺ to dodge-roll.'
        : 'Left-click to attack, 1-3 for skills, right-click to dodge-roll.',
      `Walk up to villagers, chests, trees & shops and press ${touch ? 'the ★ button' : 'F'} to interact${touch ? ' (a green ✦ button appears for a 2nd nearby action)' : ' (R does a 2nd nearby action)'}.`,
      'Chase the "!" over villagers for quests. Hunt monsters for XP & loot, then craft & forge stronger gear.',
      `Open the ${touch ? '☰ menu (top-left)' : '☰ menu (bottom-right)'} anytime for Bag, Wardrobe, Map, Guide & more.`,
    ];
    const controls = touch ? [
      ['Left stick', 'Move'], ['⚔', 'Attack'], ['1·2·3', 'Skills'], ['↺', 'Roll'],
      ['⤒', 'Jump'], ['★ / ✦', 'Interact'], ['💤', 'AFK fish'], ['☰', 'Menu'],
    ] : [
      ['WASD', 'Move'], ['LMB', 'Attack'], ['RMB', 'Roll'], ['Space', 'Jump'],
      ['1-3', 'Skills'], ['4', 'Tonic'], ['F / R', 'Interact'], ['M', 'Mount'],
      ['N', 'Map'], ['O', 'Wardrobe'], ['T', 'Home'], ['H', 'Guide'],
    ];
    onboardEl.innerHTML = `<div class="card">
      <h2>WELCOME, ADVENTURER</h2>
      <div class="sub">◆ ANAVELA UNIVERSE · BUILD FOR RIALO ◆</div>
      <h3>HOW TO PLAY</h3>
      ${steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><span>${s}</span></div>`).join('')}
      <h3>CONTROLS</h3>
      <div class="ctrls">${controls.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')}</div>
      <button class="go">⚔ &nbsp;LET'S GO&nbsp; ⚔</button>
    </div>`;
    onboardEl.classList.add('show');
    const close = () => { onboardEl.classList.remove('show'); onDone?.(); };
    onboardEl.querySelector('.go').addEventListener('click', close);
    onboardEl.addEventListener('click', (e) => { if (e.target === onboardEl) close(); });
  }

  /** Rebuild the three action cells. Called when a skill is learned, slotted
   *  or unslotted — the bar is a view of the loadout, never its own state. */
  /** Repaint the class chip. Awakening changes what you ARE, and the plate was
   *  still reading ORIGIN afterwards — the one label whose whole job is to say
   *  what you are. */
  /**
   * Show the shared-world population. `n` is the total including you; pass
   * null to hide the chip entirely, which is what a solo world does — a
   * "1 online" badge in a single-player game is just noise.
   */
  const onlineEl = root.querySelector('.online');
  function setOnline(n, connected = true) {
    if (n == null) {
      onlineEl.classList.remove('show');
      document.body.classList.remove('online');
      return;
    }
    onlineEl.classList.add('show');
    document.body.classList.add('online');
    onlineEl.classList.toggle('off', !connected);
    onlineEl.querySelector('b').textContent = String(n);
    onlineEl.lastChild.textContent = connected ? ' online' : ' offline';
  }

  function setClassName(name) {
    const el = root.querySelector('.pname .cls');
    if (el) el.textContent = String(name || '').toUpperCase();
  }

  function setSkills(ids) {
    skillIds = ids || [];
    const row = root.querySelector('.skillrow');
    if (!row) return;
    const potion = row.querySelector('.potion');
    row.innerHTML = skillCells(skillIds);
    if (potion) row.appendChild(potion);
    // els.skillEls is a CACHED node list that the cooldown loop walks every
    // frame. Replacing the markup without refreshing it leaves the loop ticking
    // detached elements — the bar would draw but never show a cooldown.
    els.skillEls = [...root.querySelectorAll('[data-skill]')];
    els.potionEl = root.querySelector('[data-potion]');
    // No re-binding needed: the click handler is delegated on `.skillrow`.
  }

  return {
    setSkills, setClassName, setOnline,
    updateVitals, updateSkills, toast, toastText, banner, setClock, setWeather,
    showDead, showHurt, bind, els, updateQuests, setPrompt, setAuto, levelUp, closeMenu, setBeacon,
    refreshPortrait, setName, showOnboarding, isMenuPopOpen, setMenuBadge, showStory, getStoryLog, showCatch, setLifeBadge, setIndexBadge,
  };
}
