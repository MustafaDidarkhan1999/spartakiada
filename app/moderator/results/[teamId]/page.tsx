import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AppShell,
  Button,
  Card,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { saveTeamResults } from "@/app/actions";

export default async function ModeratorTeamResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { teamId } = await params;
  const flash = await searchParams;
  const profile = await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const [{ data: team }, { data: disciplines }, { data: results }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
      supabase
        .from("disciplines")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("discipline_results").select("*").eq("team_id", teamId),
    ]);

  if (!team) notFound();

  const resultByDiscipline = new Map(
    (results ?? []).map((r) => [r.discipline_id, r]),
  );

  const placeSum = (results ?? [])
    .filter((r) => r.status === "published" && r.place != null)
    .filter((r) => {
      const d = (disciplines ?? []).find((x) => x.id === r.discipline_id);
      return d?.counts_to_overall;
    })
    .reduce((sum, r) => sum + (r.place ?? 0), 0);

  const filledCount = (results ?? []).filter(
    (r) => r.status === "published" && r.place != null,
  ).length;

  return (
    <AppShell
      title={team.name}
      role={profile.role}
      links={[
        { href: "/moderator/results", label: "Все команды" },
        { href: "/moderator", label: "Модератор" },
        { href: "/tablo", label: "Публичное табло" },
      ]}
    >
      {flash.message ? (
        <p className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {flash.message}
        </p>
      ) : null}
      {flash.error ? (
        <p className="mb-4 rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-300">
          {flash.error}
        </p>
      ) : null}

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Карточка команды</p>
            <p className="text-2xl font-bold">{team.name}</p>
            <p className="mt-1 text-sm text-slate-400">
              Дисциплин с местом: {filledCount} · сумма мест в общем зачёте:{" "}
              <span className="font-semibold text-emerald-400">
                {placeSum || "—"}
              </span>
            </p>
          </div>
          <Link
            href="/moderator/results"
            className="text-sm text-amber-300 hover:underline"
          >
            ← К списку команд
          </Link>
        </div>
      </Card>

      <form action={saveTeamResults} className="space-y-4">
        <input type="hidden" name="team_id" value={team.id} />

        {(disciplines ?? []).map((discipline) => {
          const existing = resultByDiscipline.get(discipline.id);
          return (
            <Card key={discipline.id}>
              {existing ? (
                <input
                  type="hidden"
                  name={`result_id_${discipline.id}`}
                  value={existing.id}
                />
              ) : null}
              <div className="grid items-end gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label>Дисциплина</Label>
                  <p className="text-lg font-medium">{discipline.name}</p>
                  <p className="text-xs text-slate-500">
                    {discipline.counts_to_overall
                      ? "Входит в общий зачёт"
                      : "Вне общего зачёта"}
                  </p>
                </div>
                <div>
                  <Label>Место</Label>
                  <Input
                    name={`place_${discipline.id}`}
                    type="number"
                    min={1}
                    placeholder="—"
                    defaultValue={existing?.place ?? ""}
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select
                    name={`status_${discipline.id}`}
                    defaultValue={existing?.status ?? "published"}
                  >
                    <option value="published">На табло</option>
                    <option value="draft">Черновик</option>
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Сохранить все места</Button>
          <Link
            href="/moderator/results"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Отмена
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Пустое место = запись по этой дисциплине будет удалена.
        </p>
      </form>
    </AppShell>
  );
}
