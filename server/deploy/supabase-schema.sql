-- Semesta — Supabase schema.
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.

-- One row per player. `payload` is the entire save blob as-is, so adding a
-- feature to the game never requires a database migration.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY is the most important part of this file.
-- Without it, anyone holding the public anon key could read every player's
-- save. With it, Postgres itself refuses — it is not our code being polite.
alter table public.saves enable row level security;

drop policy if exists "read own save"   on public.saves;
drop policy if exists "insert own save" on public.saves;
drop policy if exists "update own save" on public.saves;

create policy "read own save"   on public.saves
  for select using (auth.uid() = user_id);
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional public profile, for a leaderboard. Numbers only, no personal data:
-- a display name the player chose and a level. Deliberately does NOT carry the
-- email, because this table is readable by everyone.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default 'Wanderer',
  level      int  not null default 1,
  playtime   int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "write own profile"   on public.profiles;

create policy "profiles are public" on public.profiles for select using (true);
create policy "write own profile"   on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at honest without trusting the client to send it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before insert or update on public.saves
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated_at();
