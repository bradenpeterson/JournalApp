-- Private bucket for full-journal PDFs built by the BullMQ worker (service-role upload; users download via signed URL).
insert into storage.buckets (id, name, public)
values ('journal-exports', 'journal-exports', false)
on conflict (id) do nothing;
