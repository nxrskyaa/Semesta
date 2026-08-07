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
#chat {
  position: absolute; left: 10px; bottom: 96px; width: min(360px, 46vw);
  display: flex; flex-direction: column; gap: 3px;
  pointer-events: none; z-index: 40; font-size: 10px;
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
#chat .hintkey {
  align-self: flex-start; font-size: 8px; letter-spacing: 2px; color: #7d8a70;
  background: rgba(8,12,8,0.6); padding: 2px 6px;
}
#chat.typing .hintkey, #chat.hidehint .hintkey { display: none; }
body.touch #chat { bottom: 150px; width: 52vw; }
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
  el.innerHTML = `
    <div class="log"></div>
    <div class="hintkey">↵ CHAT</div>
    <div class="box"><input maxlength="140" placeholder="Say something…" autocomplete="off"></div>`;
  root.appendChild(el);

  const log = el.querySelector('.log');
  const input = el.querySelector('input');
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
    hideHint: () => el.classList.add('hidehint'),
  };
}
