-- Allow judges to delete results for their assigned disciplines
-- (moderators/admins already have full access via "Moderator manage all results")

create policy "Judge delete assigned results" on public.discipline_results
  for delete using (public.is_judge_for_discipline(discipline_id));
