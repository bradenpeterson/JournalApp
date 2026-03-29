-- Journal entries: Tiptap JSON + plain text for FTS, RLS via Clerk JWT -> users.clerk_id
-- Apply in Supabase: SQL Editor (paste) or `supabase db push` / linked project.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default 'Untitled',
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  body_text text,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(body_text, '')
    )
  ) stored
);

comment on table public.entries is 'Journal entries; body is Tiptap/ProseMirror JSON, body_text for search and word count.';

grant select, insert, update, delete on public.entries to authenticated;
grant all on public.entries to service_role;

-- ---------------------------------------------------------------------------
-- updated_at (reuse function if you already created it for another table)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_fts_idx on public.entries using gin (fts);

-- ---------------------------------------------------------------------------
-- RLS: row belongs to JWT user (Clerk sub -> users.clerk_id -> users.id)
-- ---------------------------------------------------------------------------
alter table public.entries enable row level security;

create policy "Users can select own entries"
  on public.entries
  for select
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can insert own entries"
  on public.entries
  for insert
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can update own entries"
  on public.entries
  for update
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  )
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can delete own entries"
  on public.entries
  for delete
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );
