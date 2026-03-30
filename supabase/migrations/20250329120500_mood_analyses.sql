-- Mood analyses (Phase 3 logic); table required for GET /api/entries/[id] embed.

create table if not exists public.mood_analyses (
  id uuid not null default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  mood_label text not null,
  score smallint not null check (score between 1 and 10),
  summary text,
  prompt_suggestion text,
  created_at timestamptz not null default now(),
  constraint mood_analyses_pkey primary key (id)
);

create index if not exists mood_analyses_entry_id_idx on public.mood_analyses (entry_id);
create index if not exists mood_analyses_user_id_idx on public.mood_analyses (user_id);

grant select, insert, update, delete on public.mood_analyses to authenticated;
grant all on public.mood_analyses to service_role;

alter table public.mood_analyses enable row level security;

drop policy if exists "Users can select own mood_analyses" on public.mood_analyses;
drop policy if exists "Users can insert own mood_analyses" on public.mood_analyses;
drop policy if exists "Users can update own mood_analyses" on public.mood_analyses;
drop policy if exists "Users can delete own mood_analyses" on public.mood_analyses;

create policy "Users can select own mood_analyses"
  on public.mood_analyses for select
  using (user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub')));

create policy "Users can insert own mood_analyses"
  on public.mood_analyses for insert
  with check (user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub')));

create policy "Users can update own mood_analyses"
  on public.mood_analyses for update
  using (user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub')))
  with check (user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub')));

create policy "Users can delete own mood_analyses"
  on public.mood_analyses for delete
  using (user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub')));
