// ACCOUNTS AND CLOUD SAVES.
//
// The design goal, in the user's words: simple, free, everyone can use it, and
// the save loads back whole. That rules out anything with a password to forget.
//
// Supabase gives all three in one free product: Google sign-in (one click,
// everybody already has the account), a magic-link fallback for people without
// one, and a Postgres row to keep the save in. It is loaded from a CDN at
// runtime rather than bundled, so the game still builds and runs with no
// dependency and no keys at all.
//
// THREE RULES this file follows, and they matter:
//
// 1. LOCAL FIRST, ALWAYS. localStorage stays the primary save. The cloud is a
//    copy. If Supabase is unconfigured, down, blocked, or the player is offline,
//    the game must be exactly as playable as it is today. Nobody should ever
//    lose a session because a server had a bad night.
//
// 2. NEWEST WINS, AND WE ASK WHEN IT IS CLOSE. On login the local and cloud
//    saves are compared by their timestamp. A clearly newer one wins silently;
//    if they are close together the player is asked, because silently eating
//    someone's afternoon is the worst thing a sync can do.
//
// 3. THE DATABASE ENFORCES PRIVACY, NOT US. Row Level Security means a row can
//    only be read or written by the user who owns it, checked by Postgres. The
//    anon key in the client is designed to be public; it is not a secret and
//    does not need hiding. See MULTIPLAYER.md for the exact SQL.

/**
 * The Supabase dashboard shows the REST endpoint (`.../rest/v1/`) far more
 * prominently than the plain project URL, so pasting the wrong one is the
 * normal mistake rather than a careless one. The client appends its own paths,
 * so a trailing `/rest/v1/` produces requests to `/rest/v1/auth/v1/otp` and the
 * only thing the player sees is `PGRST125: Invalid path specified in request
 * URL` — which tells them nothing at all.
 *
 * So it is normalised here instead of being a trap. Cheap to do, and it turns a
 * confusing dead end into nothing happening.
 */
function normaliseProjectUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  u = u.replace(/\/+$/, '');                 // trailing slashes
  u = u.replace(/\/rest\/v1$/i, '');          // the REST endpoint
  u = u.replace(/\/auth\/v1$/i, '');          // and the auth one, same trap
  return u;
}

const SUPABASE_URL = normaliseProjectUrl(import.meta.env?.VITE_SUPABASE_URL);
const SUPABASE_ANON = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
const CDN = 'https://esm.sh/@supabase/supabase-js@2';

if (import.meta.env?.VITE_SUPABASE_URL
    && SUPABASE_URL !== String(import.meta.env.VITE_SUPABASE_URL).trim().replace(/\/+$/, '')) {
  console.info('[semesta] trimmed the endpoint path off VITE_SUPABASE_URL — using', SUPABASE_URL);
}

/** True when the project has been configured. Everything degrades if not. */
export const cloudConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON);

let client = null;
let loading = null;

async function getClient() {
  if (!cloudConfigured()) return null;
  if (client) return client;
  if (!loading) {
    loading = import(/* @vite-ignore */ CDN)
      .then((m) => {
        client = m.createClient(SUPABASE_URL, SUPABASE_ANON, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        return client;
      })
      .catch((e) => {
        // A CDN that will not load is not a crash: the game carries on offline.
        console.warn('[semesta] cloud unavailable, staying local:', e.message);
        return null;
      });
  }
  return loading;
}

/**
 * Which sign-in methods this project actually has switched on.
 *
 * The menu used to offer Google whether or not the provider existed, so the
 * button was there to be clicked and then fail with a message nobody can act
 * on. Supabase publishes what is enabled at /auth/v1/settings, so the menu can
 * simply not draw a door that does not open.
 *
 * Cached, and it fails soft: if the probe cannot be reached we assume email
 * works, because that is on by default and being wrong in that direction only
 * costs one error message instead of hiding the only way in.
 */
let providersCache = null;
export async function enabledProviders() {
  if (providersCache) return providersCache;
  if (!cloudConfigured()) return { google: false, email: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON },
    });
    const d = await res.json();
    providersCache = { google: !!d?.external?.google, email: !!d?.external?.email };
  } catch {
    providersCache = { google: false, email: true };
  }
  return providersCache;
}

// ---------------------------------------------------------------------------
// SESSION
// ---------------------------------------------------------------------------

/** The signed-in user, or null. Never throws. */
export async function currentUser() {
  const c = await getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  const u = data?.session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email || null,
    name: u.user_metadata?.full_name || u.user_metadata?.name
      || (u.email ? u.email.split('@')[0] : 'Wanderer'),
    avatar: u.user_metadata?.avatar_url || null,
    token: data.session.access_token,
  };
}

// ---------------------------------------------------------------------------
// GOOGLE
//
// Two routes, and which one runs decides what the player reads on Google's own
// consent screen.
//
// The REDIRECT route (signInWithOAuth) sends the browser to Google, Google
// answers to Supabase, and Supabase bounces back here. Because Supabase is the
// address receiving the answer, Google shows the player
// `xxxx.supabase.co` — which is honest of Google, and meaningless to the player.
// It cannot be changed from our side: that callback URL is built by Supabase
// from its own project address.
//
// The ID-TOKEN route (Google Identity Services) never leaves our page. Google
// hands the ID token straight to us, we pass it to Supabase, and Supabase is
// not part of the conversation the player sees — so Google shows OUR origin
// instead. It is also faster, has no full-page redirect, and costs nothing.
//
// So: use the ID-token route when a client ID is configured, and keep the
// redirect route as the fallback so login never depends on a script from
// another host loading.
// ---------------------------------------------------------------------------
const GOOGLE_CLIENT_ID = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    // `hl=en` on the SCRIPT is what actually fixes the language. The `locale`
    // option on renderButton is documented but does not override a script that
    // has already picked up the browser's language, and Semesta is entirely in
    // English — one Indonesian button in the middle of it reads as a bug.
    s.src = 'https://accounts.google.com/gsi/client?hl=en';
    s.async = true;
    s.onload = () => resolve(true);
    // A blocked or slow script is not an error — we simply fall back.
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.google?.accounts?.id), 6000);
  });
  return gisPromise;
}

/** The redirect route. Kept as the fallback. */
async function googleRedirect() {
  const c = await getClient();
  if (!c) return { ok: false, error: 'Cloud saves are not set up on this build.' };
  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Mount Google's own sign-in button inside `container`.
 *
 * This is used in preference to One Tap. One Tap is prettier when it appears,
 * but Google suppresses it aggressively — a previous dismissal, blocked
 * third-party cookies, incognito — and every suppression would drop the player
 * back onto the redirect route showing the Supabase URL, which is the exact
 * thing this route exists to avoid. A rendered button always appears.
 *
 * Returns false if it could not be mounted, so the caller can draw its own.
 */
export async function mountGoogleButton(container, onResult) {
  if (!GOOGLE_CLIENT_ID) return false;
  const c = await getClient();
  if (!c) return false;
  if (!(await loadGis())) return false;
  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        if (!resp?.credential) return onResult?.({ ok: false, error: 'No credential from Google.' });
        const { error } = await c.auth.signInWithIdToken({
          provider: 'google', token: resp.credential,
        });
        onResult?.(error ? { ok: false, error: error.message } : { ok: true });
      },
    });
    window.google.accounts.id.renderButton(container, {
      theme: 'filled_blue', size: 'medium', shape: 'rectangular',
      text: 'signin_with', logo_alignment: 'left',
      // Pinned to English. Google localises this button from the browser's
      // language by default, which left the one Indonesian string sitting in an
      // otherwise entirely English game — see the note in CLAUDE.md.
      locale: 'en',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback sign-in: the redirect route. Used when no client id is configured or
 * Google's script cannot be reached. Works everywhere; the only cost is that
 * Google names the Supabase project on its consent screen.
 */
export async function signInWithGoogle() {
  return googleRedirect();
}

export async function signOut() {
  const c = await getClient();
  await c?.auth.signOut();
}

/** Fires whenever the session changes, so the menu can redraw itself. */
export async function onAuthChange(fn) {
  const c = await getClient();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange(() => { currentUser().then(fn); });
  return () => data?.subscription?.unsubscribe();
}

// ---------------------------------------------------------------------------
// SAVES
// ---------------------------------------------------------------------------
// THE ACTIVE SLOT, never a fixed key.
//
// This module used to hardcode 'semesta.save.v3'. That was correct when there
// was one save; it became a data-loss bug the moment slots existed, because
// slot 0 IS that key — so a player on slot 1 had their new hero pushed to the
// cloud and then written straight back down over the hero in slot 0. Making a
// second character deleted the first.
//
// Cloud sync only ever touches the slot you are actually playing.
import { activeKey, activeSlot, loadSlot, saveSlot, MAX_SLOTS } from '../systems/profiles.js';

export const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(activeKey()) || 'null'); } catch { return null; }
};
export const writeLocal = (save) => {
  try { localStorage.setItem(activeKey(), JSON.stringify(save)); } catch {}
};

// ---------------------------------------------------------------------------
// THE ACCOUNT CARRIES EVERY SLOT, NOT ONE SAVE.
//
// This used to store a single save per user, which quietly failed the one thing
// signing in is FOR. Two separate faults, and together they did not just fail to
// sync — they destroyed the older hero:
//
//   1. The cloud was only ever consulted after CONTINUE was pressed, and
//      CONTINUE is drawn from localStorage. A phone that has never run the game
//      has no local save, so no CONTINUE button is drawn, so the cloud save can
//      never be asked for. Signing in on a new device did nothing at all.
//
//   2. With no way in but NEW ADVENTURE, the fresh hero made there was uploaded
//      a minute later — over the row holding the hero from the other device.
//
// So: the row holds a BUNDLE of all three slots, every write MERGES against
// what is already up there newest-wins per slot, and a device never deletes a
// slot it simply doesn't know about. Signing in on a new device brings your
// heroes down; signing in on a device that already has one takes it up.
// ---------------------------------------------------------------------------

const BUNDLE_V = 4;

/** Old rows held one save object. Read both shapes; only ever write the new. */
export function normalise(payload) {
  const slots = new Array(MAX_SLOTS).fill(null);
  if (!payload || typeof payload !== 'object') return slots;
  if (payload.v === BUNDLE_V && payload.slots && typeof payload.slots === 'object') {
    for (let i = 0; i < MAX_SLOTS; i++) slots[i] = payload.slots[i] || payload.slots[String(i)] || null;
    return slots;
  }
  // a v3 single save: it was always whatever lived in slot 0
  if (payload.character || payload.level) slots[0] = payload;
  return slots;
}

const stamp = (s) => Number(s?.at || 0);

/**
 * What should happen to one slot, given both copies. Pure, exported, and the
 * ONLY place the rule lives — both the download and the upload ask it, so they
 * cannot drift apart and start fighting each other over the same hero.
 *
 * Returns 'take' (cloud wins), 'keep' (local wins), 'same', or 'ask'.
 */
export function decideSlot(mine, theirs, closeMs = 5 * 60 * 1000) {
  if (!theirs) return mine ? 'keep' : 'same';
  if (!mine) return 'take';
  const a = stamp(mine); const b = stamp(theirs);
  // the same save that has been round-tripped: timestamps land within a beat
  if (Math.abs(a - b) < 1500) return 'same';
  if (Math.abs(a - b) > closeMs) return b > a ? 'take' : 'keep';
  return 'ask';
}

const sameHero = (a, b) => !!a && !!b
  && (a.character?.name || '') === (b.character?.name || '')
  && (a.character?.cls || '') === (b.character?.cls || '');

/**
 * Work out what a download should do to this device, without touching it.
 *
 * Pure and exported so the rule can be tested directly — this code can destroy
 * somebody's character, so "it looked right" is not good enough.
 *
 * TWO DIFFERENT HEROES ARE NOT TWO VERSIONS OF ONE HERO. A timestamp only ever
 * answers "which is newer", which is the right question for one character saved
 * twice and completely the wrong one for two different characters that happen
 * to share a slot number. Someone who plays as a guest for ten minutes and THEN
 * signs in has a brand new Lv2 in slot 0 that is genuinely newer than the Lv30
 * in the cloud — newest-wins would throw the Lv30 away, and that is exactly the
 * shape of loss people never forgive.
 *
 * They are not in competition, so nothing has to lose: the incoming hero is
 * moved to a free slot and both survive. Only when all three are full is there
 * a real choice to make, and then the player is the one who makes it.
 *
 * @returns { writes: [{slot, save}], asks: [{slot}] }
 */
export function planSync(mineIn, theirsIn) {
  const mine = mineIn.slice();
  const theirs = theirsIn.slice();
  const writes = [];
  const asks = [];

  for (let i = 0; i < MAX_SLOTS; i++) {
    if (!theirs[i] || !mine[i] || sameHero(mine[i], theirs[i])) continue;
    // free in BOTH places, or we would land on another hero still to come down
    const free = mine.findIndex((s, j) => !s && !theirs[j]);
    if (free < 0) continue;                    // no room: fall through and ask
    writes.push({ slot: free, save: theirs[i] });
    mine[free] = theirs[i];
    theirs[i] = null;                          // rehomed; leave the local one be
  }

  for (let i = 0; i < MAX_SLOTS; i++) {
    const v = decideSlot(mine[i], theirs[i]);
    if (v === 'take') writes.push({ slot: i, save: theirs[i] });
    else if (v === 'ask') asks.push({ slot: i });
  }
  return { writes, asks };
}

/** Every slot on this device, as a plain array. */
function localSlots() {
  const out = new Array(MAX_SLOTS).fill(null);
  for (let i = 0; i < MAX_SLOTS; i++) out[i] = loadSlot(i);
  return out;
}

/** Pull this account's slots. `null` means "could not ask", which is NOT the
 *  same as "the account is empty" — the caller must not treat it as empty and
 *  overwrite anything on the strength of it. */
export async function pullCloudSlots() {
  const c = await getClient();
  if (!c) return null;
  const u = await currentUser();
  if (!u) return null;
  const { data, error } = await c.from('saves')
    .select('payload').eq('user_id', u.id).maybeSingle();
  if (error) { console.warn('[semesta] cloud load failed:', error.message); return null; }
  return normalise(data?.payload);
}

/**
 * Push every local slot up, merged against what is already there.
 *
 * The merge is the whole point. Without it a phone that only knows slot 0
 * uploads a bundle of one and erases the two heroes it has never seen.
 */
export async function pushCloudSlots() {
  const c = await getClient();
  if (!c) return false;
  const u = await currentUser();
  if (!u) return false;

  const mine = localSlots();
  const theirs = (await pullCloudSlots()) || new Array(MAX_SLOTS).fill(null);
  const tombs = readTombstones();

  const slots = {};
  for (let i = 0; i < MAX_SLOTS; i++) {
    // a slot deleted on this device stays deleted, even though the cloud still
    // has it — otherwise DELETE would be undone by the next sync
    if (tombs[i] && tombs[i] >= stamp(theirs[i])) continue;
    // Same rule as the download, so the two halves can never disagree and start
    // trading the slot back and forth. A cloud copy that is clearly newer means
    // another device is mid-session: leave it alone rather than stamp on it.
    const best = decideSlot(mine[i], theirs[i]) === 'take' ? theirs[i] : (mine[i] || theirs[i]);
    if (best) slots[i] = best;
  }

  const { error } = await c.from('saves').upsert({
    user_id: u.id,
    payload: { v: BUNDLE_V, slots },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) { console.warn('[semesta] cloud save failed:', error.message); return false; }
  clearTombstones();
  return true;
}

// A delete has to survive one sync round-trip, or the cloud copy walks straight
// back in. The tombstone is cleared once a push has actually landed.
const TOMB_KEY = 'semesta.tomb.v1';
function readTombstones() {
  try { return JSON.parse(localStorage.getItem(TOMB_KEY) || '{}') || {}; } catch { return {}; }
}
function clearTombstones() { try { localStorage.removeItem(TOMB_KEY); } catch {} }
/** Call when a slot is deleted locally, so the deletion propagates. */
export function markSlotDeleted(i) {
  try {
    const t = readTombstones();
    t[i] = Date.now();
    localStorage.setItem(TOMB_KEY, JSON.stringify(t));
  } catch {}
}

/**
 * Bring the account's heroes onto this device.
 *
 * Called when the menu opens signed in, and again the moment a sign-in lands —
 * BEFORE anything is offered, because a player who cannot see their hero will
 * make a new one and that is how the old one used to die.
 *
 * @param ask  async(info) => 'local'|'cloud', consulted only for a slot that
 *             exists in both places with timestamps too close to call.
 * @returns    { pulled, asked } — pulled counts slots that changed locally.
 */
export async function syncSlotsFromCloud(ask) {
  if (!cloudConfigured()) return { pulled: 0 };
  const theirs = await pullCloudSlots();
  if (!theirs) return { pulled: 0 };            // offline: change nothing
  const mine = localSlots();
  let pulled = 0;

  const plan = planSync(mine, theirs);
  for (const w of plan.writes) { saveSlot(w.slot, w.save); pulled++; }
  for (const q of plan.asks) {
    const a = mine[q.slot]; const b = theirs[q.slot];
    const pick = ask ? await ask({
      slot: q.slot,
      localLevel: a?.level ?? 1, cloudLevel: b?.level ?? 1,
      localName: a?.character?.name, cloudName: b?.character?.name,
      localAt: stamp(a), cloudAt: stamp(b),
    }) : (stamp(b) > stamp(a) ? 'cloud' : 'local');
    if (pick === 'cloud') { saveSlot(q.slot, b); pulled++; }
  }

  // whatever this device knows that the cloud does not now goes up
  await pushCloudSlots();
  return { pulled };
}

/** Back-compat shim: the save loop calls this on its slow beat. */
export async function saveCloud() { return pushCloudSlots(); }

/**
 * Wipe the WHOLE account: every slot, gone. This is DELETE PROFILE.
 *
 * Deliberately does NOT touch localStorage: "delete my profile" means the copy
 * kept on the server, and quietly destroying what is on the device as well
 * would be an unrecoverable surprise. The caller decides separately whether to
 * clear local, and asks first.
 */
export async function deleteCloudSave() {
  const c = await getClient();
  if (!c) return false;
  const u = await currentUser();
  if (!u) return false;
  const { error } = await c.from('saves').delete().eq('user_id', u.id);
  if (error) { console.warn('[semesta] delete failed:', error.message); return false; }
  for (let i = 0; i < MAX_SLOTS; i++) markSlotDeleted(i);
  return true;
}

/**
 * Delete ONE hero from the account, leaving the others alone.
 *
 * The select screen used to call `deleteCloudSave()` for slot 0, which was
 * right when the row held a single save and became "delete all three heroes"
 * the moment it held a bundle.
 */
export async function deleteCloudSlot(i) {
  markSlotDeleted(i);
  return pushCloudSlots();
}

/**
 * Decide which save to actually play, on sign-in.
 *
 * Now a thin wrapper: syncing pulls every slot, so by the time this returns the
 * chosen slot on disk is already the right one.
 */
export async function reconcile(ask) {
  await syncSlotsFromCloud(ask);
  return { save: loadSlot(activeSlot()), from: 'local' };
}

/**
 * Autosave to the cloud, throttled.
 *
 * Called on the same beat as the local save. Uploading every few seconds would
 * be pointless traffic and would burn through a free tier for nothing, so it
 * batches: at most one write a minute, plus one final write when the tab closes
 * so the last minute of play is never the part that gets lost.
 */
export function startCloudAutosave(getSave, everyMs = 60000) {
  let timer = null;
  let dirty = false;
  // `getSave` is no longer read: the uploader takes every slot straight off
  // localStorage, which the game has already written by the time it is marked
  // dirty. Passing one save up was how a second character used to erase the
  // first. The argument stays for callers that still pass it.
  const flush = async () => { if (dirty) { dirty = false; await pushCloudSlots(); } };
  const mark = () => { dirty = true; };
  timer = setInterval(flush, everyMs);
  // `visibilitychange` rather than `beforeunload`: mobile browsers frequently
  // never fire the latter at all, and a phone player closing the tab is the
  // most likely person to lose progress.
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', onHide);
  return {
    mark,
    stop: () => { clearInterval(timer); document.removeEventListener('visibilitychange', onHide); flush(); },
  };
}
