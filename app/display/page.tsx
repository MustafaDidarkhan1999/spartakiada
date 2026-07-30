import { createClient } from "@/lib/supabase/server";
import { DisplaySlideshow } from "@/components/display-slideshow";
import type { OverallMode } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const supabase = await createClient();

  const [
    teamsRes,
    disciplinesRes,
    resultsRes,
    eventsRes,
    overallPlacesRes,
    modeSettingRes,
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("discipline_results").select("*").eq("status", "published"),
    supabase.from("schedule_events").select("*").order("starts_at"),
    supabase.from("overall_places").select("*"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "overall_mode")
      .maybeSingle(),
  ]);

  const overallMode: OverallMode =
    !modeSettingRes.error && modeSettingRes.data?.value === "manual"
      ? "manual"
      : "auto";

  return (
    <DisplaySlideshow
      teams={teamsRes.data ?? []}
      disciplines={disciplinesRes.data ?? []}
      results={resultsRes.data ?? []}
      events={eventsRes.data ?? []}
      overallPlaces={overallPlacesRes.error ? [] : (overallPlacesRes.data ?? [])}
      overallMode={overallMode}
    />
  );
}
