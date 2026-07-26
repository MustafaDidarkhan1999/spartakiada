-- ВЫПОЛНИТЬ В SUPABASE → SQL Editor (один раз)
-- Все недостающие изменения для текущего продакшена

-- 1) Счёт матчей в расписании
alter table public.schedule_events
  add column if not exists score_a numeric,
  add column if not exists score_b numeric,
  add column if not exists result_text text;

-- 2) Удаление результатов судьёй по своей дисциплине
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'discipline_results'
      and policyname = 'Judge delete assigned results'
  ) then
    create policy "Judge delete assigned results" on public.discipline_results
      for delete using (public.is_judge_for_discipline(discipline_id));
  end if;
end $$;
