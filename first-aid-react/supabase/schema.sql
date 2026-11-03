-- Run this once in Supabase → SQL Editor → New query.

-- 1) Health profile: one row per user. `health` holds the whole form as JSON.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  health      jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Emergency contacts: many rows per user.
create table if not exists public.emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name          text not null,
  relationship  text not null default 'Family',
  phone         text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, phone)
);

-- 3) Row Level Security: every user can only see and change their OWN rows.
alter table public.profiles           enable row level security;
alter table public.emergency_contacts enable row level security;

drop policy if exists "profiles: own row select" on public.profiles;
drop policy if exists "profiles: own row insert" on public.profiles;
drop policy if exists "profiles: own row update" on public.profiles;
create policy "profiles: own row select" on public.profiles for select using (auth.uid() = id);
create policy "profiles: own row insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own row update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "contacts: own rows select" on public.emergency_contacts;
drop policy if exists "contacts: own rows insert" on public.emergency_contacts;
drop policy if exists "contacts: own rows delete" on public.emergency_contacts;
create policy "contacts: own rows select" on public.emergency_contacts for select using (auth.uid() = user_id);
create policy "contacts: own rows insert" on public.emergency_contacts for insert with check (auth.uid() = user_id);
create policy "contacts: own rows delete" on public.emergency_contacts for delete using (auth.uid() = user_id);
