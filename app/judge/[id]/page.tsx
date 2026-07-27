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
import { deleteDisciplineResult, saveDisciplineResult } from "@/app/actions";

export default async function JudgeDisciplinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();

  if (profile.role === "judge") {
    const { data: assignment } = await supabase
      .from("judge_assignments")
      .select("id")
      .eq("user_id", profile.id)
      .eq("discipline_id", id)
      .maybeSingle();

    if (!assignment) notFound();
  }

  const [{ data: discipline }, { data: teams }, { data: results }] =
    await Promise.all([
      supabase.from("disciplines").select("*").eq("id", id).single(),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("discipline_results").select("*").eq("discipline_id", id),
    ]);

  if (!discipline) notFound();

  const resultMap = new Map((results ?? []).map((r) => [r.team_id, r]));

  return (
    <AppShell
      title={discipline.name}
      role={profile.role}
      links={[
        { href: "/judge", label: "Мои дисциплины" },
        { href: "/tablo", label: "Табло" },
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
        <p className="text-sm text-slate-400">
          Для каждой команды в этой дисциплине — одна запись: укажите{" "}
          <span className="text-slate-200">место</span> (1, 2, 3…). Общий зачёт
          на табло = сумма мест по всем дисциплинам (меньше — лучше).
        </p>
      </Card>

      <div className="space-y-4">
        {(teams ?? []).map((team) => {
          const existing = resultMap.get(team.id);

          return (
            <Card key={team.id}>
              <form
                action={saveDisciplineResult}
                className="grid items-end gap-3 md:grid-cols-4"
              >
                <input type="hidden" name="discipline_id" value={discipline.id} />
                <input type="hidden" name="team_id" value={team.id} />
                <input type="hidden" name="return_to" value={`/judge/${discipline.id}`} />
                {/* score hidden for now — overall tablo uses place only */}
                <input type="hidden" name="score" value={existing?.score ?? ""} />
                <div className="md:col-span-2">
                  <Label>Команда</Label>
                  <p className="text-lg font-medium">{team.name}</p>
                </div>
                <div>
                  <Label>Место в дисциплине</Label>
                  <Input
                    name="place"
                    type="number"
                    min={1}
                    defaultValue={existing?.place ?? ""}
                    required
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select
                    name="status"
                    defaultValue={existing?.status ?? "published"}
                  >
                    <option value="published">На табло</option>
                    <option value="draft">Черновик (скрыть)</option>
                  </Select>
                </div>
                <div className="md:col-span-4">
                  <Button type="submit">Сохранить</Button>
                </div>
              </form>
              {existing ? (
                <form action={deleteDisciplineResult} className="mt-3">
                  <input type="hidden" name="id" value={existing.id} />
                  <input
                    type="hidden"
                    name="return_to"
                    value={`/judge/${discipline.id}`}
                  />
                  <Button type="submit" variant="danger">
                    Удалить с табло
                  </Button>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
