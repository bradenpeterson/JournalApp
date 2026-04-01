-- §4.4 — Time capsules; `body` is plain Tiptap JSON (same model as `entries`; §4.5 encryption omitted).

create table if not exists public.time_capsules (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  unlock_at timestamptz not null,
  is_unlocked boolean not null default false,
  notification_sent boolean not null default false,
  bull_job_id text null,
  created_at timestamptz not null default now(),
  constraint time_capsules_pkey primary key (id)
);

comment on table public.time_capsules is
  'User time capsules; body is Tiptap JSON (RLS; no app-level encryption).';

comment on column public.time_capsules.body is
  'Tiptap/ProseMirror document JSON (same shape as entries.body).';

create index if not exists time_capsules_unlock_at_idx
  on public.time_capsules using btree (unlock_at);

create index if not exists time_capsules_user_id_is_unlocked_idx
  on public.time_capsules using btree (user_id, is_unlocked);

grant select, insert, update, delete on public.time_capsules to authenticated;
grant all on public.time_capsules to service_role;

alter table public.time_capsules enable row level security;

drop policy if exists "Users can select own time_capsules" on public.time_capsules;
drop policy if exists "Users can insert own time_capsules" on public.time_capsules;
drop policy if exists "Users can update own time_capsules" on public.time_capsules;
drop policy if exists "Users can delete own time_capsules" on public.time_capsules;

create policy "Users can select own time_capsules"
  on public.time_capsules
  for select
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can insert own time_capsules"
  on public.time_capsules
  for insert
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can update own time_capsules"
  on public.time_capsules
  for update
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  )
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can delete own time_capsules"
  on public.time_capsules
  for delete
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );
