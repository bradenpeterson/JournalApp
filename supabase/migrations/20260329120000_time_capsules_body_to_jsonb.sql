-- One-time upgrade if `20260329110000_time_capsules.sql` was applied earlier with `body text`.
-- Skips automatically when `body` is already jsonb. Fails if `body` contains non-JSON text (e.g. old ciphertext).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_capsules'
      and column_name = 'body'
      and data_type = 'text'
  ) then
    alter table public.time_capsules
      alter column body type jsonb
      using (
        case
          when trim(body) = '' then '{"type":"doc","content":[]}'::jsonb
          else body::jsonb
        end
      );

    alter table public.time_capsules
      alter column body set default '{"type":"doc","content":[]}'::jsonb;

    comment on column public.time_capsules.body is
      'Tiptap/ProseMirror document JSON (same shape as entries.body).';
  end if;
end $$;
