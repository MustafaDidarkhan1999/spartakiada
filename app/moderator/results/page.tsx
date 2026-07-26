import Link from "next/link";
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

export default async function ModeratorResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const profile = await requireProfile(["admin", "moderator"]);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: results }, { data: teams }, { data: disciplines }] =
    await Promise.all([
      supabase
        .from("discipline_results")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("teams").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("disciplines").select("*").order("sort_order"),
    ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const disciplineMap = new Map((disciplines ?? []).map((d) => [d.id, d.name]));

  return (
    <AppShell
      title="Результаты табло"
      role={profile.role}
      links={[
        { href: "/moderator", label: "Модератор" },
        { href: "/judge", label: "По дисциплинам" },
        { href: "/tablo", label: "Табло" },
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
          Здесь все записи, которые влияют на табло. Можно изменить баллы/место
          или удалить строку — она сразу пропадёт из общего зачёта.
        </p>
        <Link
          href="/judge"
          className="mt-3 inline-block text-sm text-amber-300 hover:underline"
        >
          Добавить результат по дисциплине →
        </Link>
      </Card>

      {(results ?? []).length === 0 ? (
        <Card>
          <p className="text-slate-400">Записей пока нет.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(results ?? []).map((result) => (
            <Card key={result.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {teamMap.get(result.team_id) ?? "Команда"}
                  </p>
                  <p className="text-sm text-slate-400">
                    {disciplineMap.get(result.discipline_id) ?? "Дисциплина"}
                    {" · "}
                    {result.status === "published" ? "На табло" : "Черновик"}
                  </p>
                </div>
                <form action={deleteDisciplineResult}>
                  <input type="hidden" name="id" value={result.id} />
                  <input type="hidden" name="return_to" value="/moderator/results" />
                  <Button type="submit" variant="danger">
                    Удалить с табло
                  </Button>
                </form>
              </div>

              <form
                action={saveDisciplineResult}
                className="grid items-end gap-3 md:grid-cols-5"
              >
                <input
                  type="hidden"
                  name="discipline_id"
                  value={result.discipline_id}
                />
                <input type="hidden" name="team_id" value={result.team_id} />
                <input type="hidden" name="return_to" value="/moderator/results" />
                <div>
                  <Label>Баллы</Label>
                  <Input
                    name="score"
                    type="number"
                    step="0.01"
                    defaultValue={result.score ?? ""}
                  />
                </div>
                <div>
                  <Label>Место</Label>
                  <Input
                    name="place"
                    type="number"
                    min={1}
                    defaultValue={result.place ?? ""}
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select name="status" defaultValue={result.status}>
                    <option value="published">На табло</option>
                    <option value="draft">Черновик (скрыть)</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full">
                    Сохранить изменения
                  </Button>
                </div>
              </form>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
