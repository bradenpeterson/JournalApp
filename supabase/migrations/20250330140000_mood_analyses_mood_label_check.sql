-- §3.1: Lock allowed mood_label values (matches app + OpenAI JSON schema in Phase 3.2).

alter table public.mood_analyses
  drop constraint if exists mood_analyses_mood_label_check;

alter table public.mood_analyses
  add constraint mood_analyses_mood_label_check
  check (
    mood_label in (
      'joyful',
      'content',
      'neutral',
      'anxious',
      'sad',
      'angry',
      'reflective'
    )
  );

comment on column public.mood_analyses.mood_label is
  'One of: joyful, content, neutral, anxious, sad, angry, reflective (enforced by CHECK).';
