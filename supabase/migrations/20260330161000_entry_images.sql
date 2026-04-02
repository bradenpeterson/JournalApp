-- §5.2 — Image metadata for Storage uploads (`entry-images` bucket paths).
-- RLS: Clerk JWT `sub` → `users.clerk_id` → `users.id` = `entry_images.user_id`.

create table if not exists public.entry_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  entry_id uuid null references public.entries (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now(),
  constraint entry_images_file_size_positive check (file_size > 0)
);

comment on table public.entry_images is
  'Uploaded entry images; files live in Storage at storage_path; RLS by user_id.';

comment on column public.entry_images.entry_id is
  'Optional link to an entry (e.g. set after save); null while drafting.';

grant select, insert, update, delete on public.entry_images to authenticated;
grant all on public.entry_images to service_role;

create index if not exists entry_images_user_id_idx on public.entry_images (user_id);
create index if not exists entry_images_entry_id_idx on public.entry_images (entry_id);

alter table public.entry_images enable row level security;

drop policy if exists "Users can select own entry_images" on public.entry_images;
drop policy if exists "Users can insert own entry_images" on public.entry_images;
drop policy if exists "Users can update own entry_images" on public.entry_images;
drop policy if exists "Users can delete own entry_images" on public.entry_images;

create policy "Users can select own entry_images"
  on public.entry_images
  for select
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can insert own entry_images"
  on public.entry_images
  for insert
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can update own entry_images"
  on public.entry_images
  for update
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  )
  with check (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );

create policy "Users can delete own entry_images"
  on public.entry_images
  for delete
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );
