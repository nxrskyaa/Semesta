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

/** Google sign-in. Redirects away and comes back to the same page. */
export async function signInWithGoogle() {
  const c = await getClient();
  if (!c) return { ok: false, error: 'Cloud saves are not set up on this build.' };
  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Magic link, for anyone who would rather not use Google. */
export async function signInWithEmail(email) {
  const c = await getClient();
  if (!c) return { ok: false, error: 'Cloud saves are not set up on this build.' };
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { ok: false, error: error.message }
    : { ok: true, message: 'Check your email for the sign-in link.' };
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
const LOCAL_KEY = 'semesta.save.v3';

export const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { return null; }
};
export const writeLocal = (save) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(save)); } catch {}
};

/** Pull this account's save. Returns null when there is none or no session. */
export async function loadCloud() {
  const c = await getClient();
  if (!c) return null;
  const u = await currentUser();
  if (!u) return null;
  const { data, error } = await c.from('saves')
    .select('payload, updated_at').eq('user_id', u.id).maybeSingle();
  if (error) { console.warn('[semesta] cloud load failed:', error.message); return null; }
  if (!data) return null;
  return { save: data.payload, at: Date.parse(data.updated_at) || 0 };
}

/** Push the save up. Silently no-ops when signed out — the local copy is the
 *  one that matters, and a failed upload must never interrupt play. */
export async function saveCloud(save) {
  const c = await getClient();
  if (!c) return false;
  const u = await currentUser();
  if (!u) return false;
  const { error } = await c.from('saves').upsert({
    user_id: u.id,
    payload: save,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) { console.warn('[semesta] cloud save failed:', error.message); return false; }
  return true;
}

/**
 * Decide which save to actually play, on sign-in.
 *
 * @param ask  async (info) => 'local' | 'cloud'  — only called when it is a
 *             genuinely close call, so the player is never nagged for nothing.
 */
export async function reconcile(ask) {
  const local = readLocal();
  const cloud = await loadCloud();
  if (!cloud) { if (local) await saveCloud(local); return { save: local, from: 'local' }; }
  if (!local) return { save: cloud.save, from: 'cloud' };

  const localAt = Number(local.at || 0);
  const cloudAt = cloud.at;
  const gap = Math.abs(localAt - cloudAt);
  // more than five minutes apart is not ambiguous — take the newer one
  if (gap > 5 * 60 * 1000) {
    const useCloud = cloudAt > localAt;
    return { save: useCloud ? cloud.save : local, from: useCloud ? 'cloud' : 'local' };
  }
  const pick = ask ? await ask({
    localLevel: local?.leveling?.level ?? 1, cloudLevel: cloud.save?.leveling?.level ?? 1,
    localAt, cloudAt,
  }) : 'cloud';
  return { save: pick === 'local' ? local : cloud.save, from: pick };
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
  const flush = async () => { if (dirty) { dirty = false; await saveCloud(getSave()); } };
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
