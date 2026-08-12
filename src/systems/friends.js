// FRIENDS.
//
// Scope, stated plainly because it matters: this list lives on YOUR device and
// is not yet reciprocal. Adding someone puts them on your list and shows you
// when they are in the world with you; it does not send them a request, because
// the server does not carry one yet. Everything here is written so that when
// the server does, only `add()` changes — the storage, the panel, the online
// check and the save format are all already in the right shape.
//
// The reason to ship the local half first is that it is the half that makes the
// world feel populated: you meet someone, you remember them, and next session
// you can see whether they are around. A request/accept handshake adds
// permission to something that currently needs none.

const MAX_FRIENDS = 60;

/**
 * @param onChange fired whenever the list changes, so the panel can redraw.
 */
export function createFriends({ onChange } = {}) {
  // id -> { id, name, lv, addedAt, note }
  const list = new Map();

  /**
   * Remember somebody.
   *
   * `id` is the server's player id, which is stable for a session but NOT
   * across sessions — so the name is stored too and used to re-link them when
   * they come back with a new id. That is deliberately loose: two people with
   * the same display name will be treated as one, and for a friends list whose
   * only power is "show me a dot when they are online", that is an acceptable
   * trade against demanding accounts before you can wave at someone.
   */
  function add(player) {
    if (!player?.id) return false;
    if (list.size >= MAX_FRIENDS) return false;
    if (isFriend(player)) return false;
    list.set(player.id, {
      id: player.id,
      name: player.name || 'Wanderer',
      lv: player.lv || 1,
      addedAt: Date.now(),
    });
    onChange?.();
    return true;
  }

  function remove(id) {
    // match by id OR by name, since a returning friend arrives with a new id
    const entry = list.get(id) || [...list.values()].find((f) => f.name === id);
    if (!entry) return false;
    list.delete(entry.id);
    onChange?.();
    return true;
  }

  /** Are they on the list? Checks the live id first, then the remembered name. */
  function isFriend(player) {
    if (!player) return false;
    if (player.id && list.has(player.id)) return true;
    const n = player.name;
    return !!n && [...list.values()].some((f) => f.name === n);
  }

  /**
   * The list, annotated with who is here right now.
   *
   * `livePlayers` is net.state.players — the same map the population count
   * reads, so "online" here means exactly what the chip on the HUD means.
   */
  function rows(livePlayers) {
    const online = new Map();
    for (const p of (livePlayers?.values?.() || [])) {
      if (p?.name) online.set(p.name, p);
    }
    return [...list.values()]
      .map((f) => {
        const live = online.get(f.name) || null;
        // a friend seen online refreshes their id and level, so the entry stays
        // useful across sessions instead of decaying into a stale name
        if (live) { f.lv = live.lv || f.lv; }
        return { ...f, online: !!live, live };
      })
      .sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }

  function onlineCount(livePlayers) {
    return rows(livePlayers).filter((r) => r.online).length;
  }

  return {
    list,
    add,
    remove,
    isFriend,
    rows,
    onlineCount,
    count: () => list.size,
    serialize: () => [...list.values()],
    load: (d) => {
      if (!Array.isArray(d)) return;
      list.clear();
      for (const f of d.slice(0, MAX_FRIENDS)) {
        if (f?.id && f?.name) list.set(f.id, { ...f });
      }
    },
  };
}
