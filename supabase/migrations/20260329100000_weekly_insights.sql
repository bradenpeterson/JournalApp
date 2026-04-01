-- §4.2 — Weekly digest rows (written by service-role worker; users read via RLS).

create table if not exists public.weekly_insights (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  avg_score numeric(4, 1) not null,
  entry_count integer not null,
  top_mood text not null,
  created_at timestamptz not null default now(),
  constraint weekly_insights_pkey primary key (id),
  constraint weekly_insights_week_order check (week_start <= week_end),
  constraint weekly_insights_entry_count_nonnegative check (entry_count >= 0),
  constraint weekly_insights_avg_score_range check (avg_score >= 1 and avg_score <= 10),
  constraint weekly_insights_top_mood_check check (
    top_mood in (
      'joyful',
      'content',
      'neutral',
      'anxious',
      'sad',
      'angry',
      'reflective'
    )
  )
);

comment on table public.weekly_insights is
  'AI-generated weekly journal digest per user (§4.3 worker inserts via service role).';

create unique index if not exists weekly_insights_user_week_start_key
  on public.weekly_insights (user_id, week_start);

create index if not exists weekly_insights_user_id_created_at_idx
  on public.weekly_insights (user_id, created_at desc);

grant select on public.weekly_insights to authenticated;
grant all on public.weekly_insights to service_role;

alter table public.weekly_insights enable row level security;

drop policy if exists "Users can select own weekly_insights" on public.weekly_insights;

create policy "Users can select own weekly_insights"
  on public.weekly_insights
  for select
  using (
    user_id = (select id from public.users where clerk_id = (auth.jwt()->>'sub'))
  );
