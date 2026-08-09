// WORLD CHAT.
//
// Deliberately quiet: a small stack of lines in the bottom-left that fades out
// when nothing is happening, and an input that only exists while you are typing.
// A permanent chat box in an action game is a permanent chunk of the screen you
// cannot see through, and Semesta is played on phones where that matters twice.
//
// The one rule that is not negotiable: messages from other people are inserted
// with textContent, never innerHTML. The server strips angle brackets as well,
// but two independent layers is the right number for something a stranger types.

const CSS = `
/* A LAYER OF ITS OWN, at body level.
   This lived inside #hud, which carries z-index: 10 and therefore its own
   stacking context — so #chat's z-index: 40 was scoped INSIDE that context and
   could never rise above #touchui at 20. The button was drawn, sat under the
   joystick zone, and every tap on it moved the character instead. Position in
   the tree, not the number, was the whole problem.
   30 puts it over the touch controls and under dialogs (40) and the map (60). */
#chat {
  position: fixed; left: 10px; bottom: 96px; width: min(360px, 46vw);
  display: flex; flex-direction: column; gap: 3px;
  pointer-events: none; z-index: 30; font-size: 10px;
}
#chat .log { display: flex; flex-direction: column; gap: 2px; max-height: 26vh; overflow: hidden; }
#chat .ln {
  background: rgba(8, 12, 8, 0.72); padding: 3px 7px; align-self: flex-start;
  max-width: 100%; word-break: break-word; line-height: 1.55;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  animation: chat-in 0.22s ease-out;
  transition: opacity 0.6s;
}
@keyframes chat-in { from { opacity: 0; transform: translateX(-8px); } }
#chat .ln .who { color: var(--gold, #d8b866); }
#chat .ln .who.me { color: #8ad86e; }
#chat .ln .msg { color: #dfe6d4; }
#chat .ln.sys .msg { color: #9fb08c; font-style: italic; }
#chat.idle .ln { opacity: 0.28; }
#chat .box { display: none; pointer-events: auto; }
#chat.typing .box { display: flex; gap: 6px; }
#chat.typing .ln { opacity: 1; }
#chat .box input {
  flex: 1; font-family: inherit; font-size: 11px; color: #eaf2df;
  background: rgba(8, 12, 8, 0.94); border: 0; outline: 0; padding: 6px 8px;
  box-shadow: inset 0 0 0 1px var(--gold-dim, #7d8a70);
}
/* THE WAY IN.
   This was a line of text reading "↵ CHAT" and nothing else — which meant chat
   could only be opened with a keyboard, and on a phone there was no way in at
   all. It is a real button now, on both platforms. */
#chat .open {
  align-self: flex-start; pointer-events: auto; cursor: pointer;
  font-family: inherit; font-size: 9px; letter-spacing: 2px; color: #cfd8c8;
  padding: 6px 10px; border: 0;
  background: rgba(8, 12, 8, 0.82);
  box-shadow: inset 0 0 0 1px rgba(216,184,102,0.4);
}
#chat .open:hover { color: #ffe9b0; filter: brightness(1.3); }
#chat .open .k { color: var(--gold-dim, #7d8a70); }
#chat.typing .open { display: none; }
#chat .box .send {
  pointer-events: auto; cursor: pointer; font-family: inherit; font-size: 10px;
  padding: 6px 10px; border: 0; color: #10160f; background: var(--gold, #d8b866);
}
body.touch #chat { bottom: 210px; width: 60vw; }
body.touch #chat .k { display: none; }
/* On a phone the bottom belongs to the joystick and the action cluster, and the
   log has to keep its distance from both. The BUTTON goes up top instead, into
   the measured gap between the HP plate (ends x=188) and the minimap (starts
   x=269) — the one patch of screen no gesture zone claims. */
body.touch #chat .open {
  position: fixed; left: 198px; top: 14px; width: 46px; height: 46px;
  padding: 0; font-size: 20px; line-height: 46px; text-align: center;
  background: rgba(8, 12, 8, 0.86);
}
/* And while typing, the box pins to the TOP. Left where it was, the on-screen
   keyboard covers the bottom ~300px of the screen and you would be typing into
   a box you cannot see. */
body.touch #chat.typing .box {
  position: fixed; left: 8px; right: 8px; top: 8px;
}
body.touch #chat.typing .box input { font-size: 16px; padding: 10px; }
body.touch #chat.typing .box .send { font-size: 12px; padding: 10px 14px; }
`;

/**
 * @param root   the HUD root element
 * @param onSend (text) => void
 * @param opts.isBusy () => bool — true when a panel or dialog owns the keyboard,
 *        so Enter does not open chat on top of a shop
 */
export function createChat(root, onSend, opts = {}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'chat';
  // `root` is kept in the signature for callers, but the element is deliberately
  // NOT parented to it — see the CSS note above.
  void root;
  el.innerHTML = `
    <div class="log"></div>
    <button class="open">💬 CHAT <span class="k">↵</span></button>
    <div class="box">
      <input maxlength="140" placeholder="Say something…" autocomplete="off">
      <button class="send">SEND</button>
    </div>`;
  document.body.appendChild(el);

  const log = el.querySelector('.log');
  const input = el.querySelector('input');
  const openBtn = el.querySelector('.open');
  const sendBtn = el.querySelector('.send');
  let idleTimer = null;
  let typing = false;
  const MAX_LINES = 8;

  function touch() {
    el.classList.remove('idle');
    clearTimeout(idleTimer);
    // fade the backlog out after a while so it stops competing with the game
    idleTimer = setTimeout(() => { if (!typing) el.classList.add('idle'); }, 9000);
  }

  /** @param msg { id, name, text } — id 0 means a system line. */
  function push(msg, selfId) {
    const ln = document.createElement('div');
    ln.className = 'ln' + (msg.id === 0 ? ' sys' : '');
    if (msg.id !== 0) {
      const who = document.createElement('span');
      who.className = 'who' + (msg.id === selfId ? ' me' : '');
      who.textContent = `${msg.name}: `;
      ln.appendChild(who);
    }
    const m = document.createElement('span');
    m.className = 'msg';
    // textContent, ALWAYS. This is a stranger's keyboard.
    m.textContent = msg.text;
    ln.appendChild(m);
    log.appendChild(ln);
    while (log.children.length > MAX_LINES) log.removeChild(log.firstChild);
    touch();
  }

  function open() {
    if (typing) return;
    typing = true;
    el.classList.add('typing');
    touch();
    // the delay lets the keydown that opened chat finish, or the Enter that
    // opened it lands in the box as a submit
    setTimeout(() => input.focus(), 0);
  }
  function close() {
    typing = false;
    el.classList.remove('typing');
    input.value = '';
    input.blur();
    touch();
  }

  openBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  // A phone has no Enter to submit with while the on-screen keyboard is up in
  // some browsers, so SEND is not decoration.
  sendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = input.value.trim();
    if (text) onSend(text);
    close();
  });
  // stop taps inside the chat from reaching the game (attack, camera drag)
  for (const ev of ['pointerdown', 'mousedown', 'touchstart']) {
    el.addEventListener(ev, (e) => e.stopPropagation());
  }

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();     // movement keys must not leak into the game
    if (e.key === 'Enter') {
      const text = input.value.trim();
      if (text) onSend(text);
      close();
    } else if (e.key === 'Escape') close();
  });

  window.addEventListener('keydown', (e) => {
    if (typing) return;
    if (opts.isBusy?.()) return;
    if (e.key === 'Enter') { e.preventDefault(); open(); }
  });

  return {
    push, open, close,
    isTyping: () => typing,
    setVisible: (v) => { el.style.display = v ? 'flex' : 'none'; },
    hideHint: () => openBtn.classList.add('hidden'),
  };
}
