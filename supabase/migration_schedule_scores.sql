-- Run in Supabase SQL Editor
-- Match scores on schedule events

alter table public.schedule_events
  add column if not exists score_a numeric,
  add column if not exists score_b numeric,
  add column if not exists result_text text;
