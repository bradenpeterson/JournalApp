-- App users synced from Clerk (webhook uses service role; clients use JWT + RLS).
-- Matches existing dashboard DDL; safe to apply on a fresh project. If `users` already
-- exists from the SQL editor, `create table if not exists` is a no-op; policies are
-- recreated only when you run this file (drop + create).

create table if not exists public.users (
  id uuid not null default gen_random_uuid(),
  clerk_id text not null,
  email text not null,
  display_name text null,
  theme text null default 'light',
  created_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_clerk_id_key unique (clerk_id)
);

comment on table public.users is 'One row per Clerk user; clerk_id matches JWT sub for RLS.';

grant select, insert, update, delete on public.users to authenticated;
grant all on public.users to service_role;

alter table public.users enable row level security;

drop policy if exists "Users can select own row" on public.users;
drop policy if exists "Users can insert own row" on public.users;
drop policy if exists "Users can update own row" on public.users;
drop policy if exists "Users can delete own row" on public.users;

create policy "Users can select own row"
  on public.users
  for select
  using (clerk_id = (auth.jwt()->>'sub'));

create policy "Users can insert own row"
  on public.users
  for insert
  with check (clerk_id = (auth.jwt()->>'sub'));

create policy "Users can update own row"
  on public.users
  for update
  using (clerk_id = (auth.jwt()->>'sub'))
  with check (clerk_id = (auth.jwt()->>'sub'));

create policy "Users can delete own row"
  on public.users
  for delete
  using (clerk_id = (auth.jwt()->>'sub'));
