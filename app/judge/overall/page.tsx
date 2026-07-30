import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AppShell,
  Button,
  Card,
  Input,
  Label,
} from "@/components/ui";
import {
  saveOverallPlaces,
  setOverallModeAuto,
  setOverallModeManual,
} from "@/app/actions";
import { computeOverallStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function JudgeOverallPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [
    { data: teams },
    { data: disciplines },
    { data: results },
    { data: overallPlaces },
    { data: modeSetting },
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("disciplines").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("discipline_results").select("*").eq("status", "published"),
    supabase.from("overall_places").select("*"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "overall_mode")
      .maybeSingle(),
  ]);

  const mode = modeSetting?.value === "manual" ? "manual" : "auto";
  const placeMap = new Map((overallPlaces ?? []).map((p) => [p.team_id, p.place]));
  const autoStandings = computeOverallStandings(
    teams ?? [],
    disciplines ?? [],
    results ?? [],
  );
  const autoByTeam = new Map(autoStandings.map((r) => [r.team_id, r]));

  return (
    <AppShell
      title="Общий зачёт"
      role={profile.role}
      links={[
        { href: "/judge", label: "Дисциплины" },
        { href: "/tablo", label: "Табло" },
        { href: "/moderator", label: "Модератор" },
      ]}
    >
      {params.message ? (
        <p className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {params.message}
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-4 rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {params.error}
        </p>
      ) : null}

      <Card className="mb-6">
        <p className="text-sm text-slate-400">
          Здесь можно задать <span className="text-slate-200">окончательные места</span>{" "}
          команд в общем зачёте вручную. Автоподсчёт по сумме мест дисциплин
          сохраняется и включается обратно в любой момент.
        </p>
        <p className="mt-3 text-sm">
          Сейчас на табло:{" "}
          <span className="font-semibold text-amber-300">
            {mode === "manual" ? "ручные места" : "автоподсчёт (сумма мест)"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={setOverallModeManual}>
            <Button type="submit" variant={mode === "manual" ? "primary" : "secondary"}>
              Показать ручные места на табло
            </Button>
          </form>
          <form action={setOverallModeAuto}>
            <Button type="submit" variant={mode === "auto" ? "primary" : "secondary"}>
              Вернуться к автоподсчёту
            </Button>
          </form>
          <Link href="/tablo" className="rounded-lg border border-slate-700 px-4 py-2 text-sm">
            Открыть табло
          </Link>
        </div>
      </Card>

      <form action={saveOverallPlaces} className="space-y-4">
        {(teams ?? []).map((team) => {
          const auto = autoByTeam.get(team.id);
          return (
            <Card key={team.id}>
              <div className="grid items-end gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label>Команда</Label>
                  <p className="text-lg font-medium">{team.name}</p>
                  <p className="text-xs text-slate-500">
                    {auto
                      ? `Авто: сумма мест ${auto.place_sum}, дисциплин ${auto.disciplines_count}`
                      : "Авто: пока нет мест по дисциплинам"}
                  </p>
                </div>
                <div>
                  <Label>Место в общем зачёте</Label>
                  <Input
                    name={`place_${team.id}`}
                    type="number"
                    min={1}
                    placeholder="—"
                    defaultValue={placeMap.get(team.id) ?? ""}
                  />
                </div>
              </div>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Сохранить ручные места</Button>
        </div>
        <p className="text-xs text-slate-500">
          Пустое поле = место для этой команды будет удалено из ручного зачёта.
          После сохранения нажмите «Показать ручные места на табло», если ещё не
          включено.
        </p>
      </form>
    </AppShell>
  );
}
