// THE DESCENT.
//
// Going down should feel like going down. A teleport chime and a banner is a
// state change, not an arrival — you were in a sunlit plaza, then you were in a
// stone room, and nothing in between told you that you had travelled.
//
// So the transition IS the travel: the light above closes over you, you fall
// past stonework for a beat, and the band's name resolves out of the dark as
// you land. It is deliberately short (about 2.2s) because you will see it every
// five floors and a cutscene you cannot skip becomes a toll.
//
// Everything is drawn on one 320x180 canvas in the same pixel idiom as the
// prologue and the loading screen, upscaled `pixelated`. No asset files.
//
// TWO RULES CARRIED OVER FROM THE PROLOGUE, both learned the hard way:
//   · glows are radial gradients, never fillRect — a square halo is the one
//     thing that instantly breaks the illusion of light;
//   · rAF only DRAWS. It stops dead in a background tab, and a transition that
//     never finishes leaves the player staring at a black screen with the game
//     running underneath it. A timer drives the clock and can always finish.

const W = 320, H = 180;

const CSS = `
.descent { position: fixed; inset: 0; z-index: 80; background: #000;
  display: flex; align-items: center; justify-content: center; overflow: hidden; }
.descent canvas { width: 100%; height: 100%; object-fit: cover;
  image-rendering: pixelated; }
.descent .cap { position: absolute; left: 0; right: 0; bottom: 16%;
  text-align: center; font-family: var(--font-display, monospace);
  letter-spacing: 3px; color: #fff; opacity: 0; text-shadow: 0 2px 0 #000; }
.descent .cap .t { font-size: clamp(18px, 3.4vw, 34px); }
.descent .cap .s { font-size: clamp(9px, 1.2vw, 12px); letter-spacing: 4px;
  margin-top: 7px; opacity: 0.75; }
`;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/**
 * Play the descent.
 *
 * @param theme  a THEMES entry — its colours are the whole palette
 * @param label  what resolves out of the dark ("The Frost Crypt")
 * @param sub    the line under it ("FLOOR 12 · WARDEN")
 * @param onMid  called once at the darkest point, for the caller to actually
 *               move the hero. Doing the teleport here means the world never
 *               changes while the player can see it.
 */
export function playDescent({ theme, label, sub, onMid, dur = 2200 }) {
  return new Promise((resolve) => {
    if (!document.getElementById('descent-css')) {
      const st = document.createElement('style');
      st.id = 'descent-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const el = document.createElement('div');
    el.className = 'descent';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.innerHTML = `<div class="t"></div><div class="s"></div>`;
    cap.querySelector('.t').textContent = label;
    cap.querySelector('.s').textContent = sub;
    el.append(cv, cap);
    document.body.appendChild(el);

    const ctx = cv.getContext('2d');
    const t0 = performance.now();
    let midDone = false;
    let raf = 0, timer = 0, lastDraw = 0;

    // the shaft: bands of masonry that stream upward past the camera, each with
    // its own width and speed so it reads as depth rather than as a scrolling
    // texture
    const bands = [];
    for (let i = 0; i < 26; i++) {
      bands.push({ y: Math.random() * H, h: 3 + Math.random() * 9,
        w: 0.24 + Math.random() * 0.5, spd: 0.55 + Math.random() * 1.5,
        shade: 0.25 + Math.random() * 0.5 });
    }
    // sparks torn off the walls as you fall
    const motes = [];
    for (let i = 0; i < 34; i++) {
      motes.push({ x: Math.random() * W, y: Math.random() * H,
        spd: 40 + Math.random() * 130, r: 0.6 + Math.random() * 1.5,
        ph: Math.random() * 7 });
    }

    const glow = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    };

    function draw(p, now) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // ---- the mouth above, closing ----
      // 0 -> 0.45 : the daylight you left shrinks to nothing
      const close = Math.min(1, p / 0.45);
      const mouthR = lerp(96, 0, ease(close));
      if (mouthR > 0.5) {
        glow(W / 2, lerp(H * 0.34, -20, ease(close)), mouthR, '#cfe6c0', 0.85 * (1 - close * 0.5));
      }

      // ---- the shaft, streaming up ----
      // fastest in the middle of the fall, easing in and out at both ends
      const fall = Math.sin(Math.min(1, p / 0.9) * Math.PI) * 1.0 + 0.12;
      for (const b of bands) {
        b.y -= b.spd * fall * 6;
        if (b.y + b.h < 0) { b.y = H + Math.random() * 20; b.w = 0.24 + Math.random() * 0.5; }
        const half = (b.w * W) / 2;
        const c = Math.round(lerp(10, 90, b.shade));
        ctx.fillStyle = `rgb(${c},${Math.round(c * 0.9)},${Math.round(c * 0.82)})`;
        ctx.fillRect(W / 2 - half, b.y, half * 2, b.h);
        // a lit top edge, so each course has a lip
        ctx.fillStyle = `rgba(255,255,255,${0.05 + b.shade * 0.06})`;
        ctx.fillRect(W / 2 - half, b.y, half * 2, 1);
      }

      // ---- sparks ----
      for (const m of motes) {
        m.y -= m.spd * fall * 0.028;
        if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.004 + m.ph));
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = tw * 0.75 * Math.min(1, p * 3);
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.r, m.r);
        ctx.globalAlpha = 1;
      }

      // ---- the floor's own light rising to meet you ----
      // 0.55 -> 1 : the band's colour blooms from below and takes the frame
      const rise = Math.max(0, (p - 0.5) / 0.5);
      if (rise > 0) {
        glow(W / 2, lerp(H + 30, H * 0.58, ease(rise)), lerp(30, 190, ease(rise)),
          theme.light, 0.9 * ease(rise));
      }

      // a vignette on everything, always
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.78);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

      // the name resolves late, and fades as the room arrives
      const capIn = Math.max(0, Math.min(1, (p - 0.52) / 0.22));
      const capOut = Math.max(0, (p - 0.9) / 0.1);
      cap.style.opacity = String(capIn * (1 - capOut));
      cap.style.transform = `translateY(${lerp(10, 0, ease(capIn))}px)`;
      cap.querySelector('.t').style.color = theme.accent;
    }

    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      // THE HERO MOVES AT THE DARKEST POINT, never on screen
      if (!midDone && p >= 0.46) { midDone = true; try { onMid?.(); } catch {} }
      lastDraw = now;
      draw(p, now);
      if (p >= 1) return finish();
      raf = requestAnimationFrame(step);
    }

    function finish() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      if (!midDone) { midDone = true; try { onMid?.(); } catch {} }
      el.style.transition = 'opacity 0.28s';
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); resolve(); }, 300);
    }

    raf = requestAnimationFrame(step);
    // The watchdog. rAF is dead in a hidden tab and this overlay covers the
    // whole screen, so without it an alt-tab mid-descent leaves you looking at
    // black when you come back — with the game running underneath.
    timer = setInterval(() => {
      const now = performance.now();
      if (now - lastDraw > 260) step(now);
      if (now - t0 > dur + 400) finish();
    }, 120);
  });
}
