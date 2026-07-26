import { createClient } from "@/lib/supabase/server";
import { DisplaySlideshow } from "@/components/display-slideshow";

export default async function DisplayPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: disciplines }, { data: results }, { data: events }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("discipline_results").select("*").eq("status", "published"),
      supabase.from("schedule_events").select("*").order("starts_at"),
    ]);

  return (
    <DisplaySlideshow
      teams={teams ?? []}
      disciplines={disciplines ?? []}
      results={results ?? []}
      events={events ?? []}
    />
  );
}
