-- Weight category for schedule events (combat sports)
-- Run in Supabase SQL Editor

-- Ensure match scores exist (needed to save счёт)
alter table public.schedule_events
  add column if not exists score_a numeric,
  add column if not exists score_b numeric,
  add column if not exists result_text text;

-- Weight + absolute category
alter table public.schedule_events
  add column if not exists weight_kg numeric,
  add column if not exists is_absolute boolean not null default false;
