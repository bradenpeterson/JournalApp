-- §6.3 — Email notification toggles (workers read before sending).
alter table public.users
  add column if not exists notify_weekly_digest boolean not null default true;

alter table public.users
  add column if not exists notify_capsule_unlock boolean not null default true;

comment on column public.users.notify_weekly_digest is 'When false, weekly digest worker skips this user (no AI/email/weekly_insights for that run).';
comment on column public.users.notify_capsule_unlock is 'When false, time capsule still unlocks but unlock email is not sent.';
