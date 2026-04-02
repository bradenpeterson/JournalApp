-- §5.1 — Public `entry-images` bucket + Storage RLS (Clerk: `auth.jwt()->>'sub'` = first path segment).
-- Idempotent: safe if the bucket or policies were created manually in the dashboard first.

insert into storage.buckets (id, name, public)
values ('entry-images', 'entry-images', true)
on conflict (id) do nothing;

drop policy if exists "entry-images public read" on storage.objects;
drop policy if exists "entry-images insert own folder" on storage.objects;
drop policy if exists "entry-images update own folder" on storage.objects;
drop policy if exists "entry-images delete own folder" on storage.objects;

create policy "entry-images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'entry-images');

create policy "entry-images insert own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'entry-images'
  and split_part(name, '/', 1) = (auth.jwt() ->> 'sub')
);

create policy "entry-images update own folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'entry-images'
  and split_part(name, '/', 1) = (auth.jwt() ->> 'sub')
)
with check (
  bucket_id = 'entry-images'
  and split_part(name, '/', 1) = (auth.jwt() ->> 'sub')
);

create policy "entry-images delete own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'entry-images'
  and split_part(name, '/', 1) = (auth.jwt() ->> 'sub')
);
