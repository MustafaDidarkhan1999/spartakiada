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
import { saveDisciplineResult } from "@/app/actions";

export default async function JudgeDisciplinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <Card className="mb-6">
        <p className="text-sm text-slate-400">
          Введите баллы и место вручную. Автоматический расчёт победителей —
          в следующей версии.
        </p>
      </Card>

      <div className="space-y-4">
        {(teams ?? []).map((team) => {
          const existing = resultMap.get(team.id);

          return (
            <Card key={team.id}>
              <form
                action={saveDisciplineResult}
                className="grid items-end gap-3 md:grid-cols-5"
              >
                <input type="hidden" name="discipline_id" value={discipline.id} />
                <input type="hidden" name="team_id" value={team.id} />
                <div className="md:col-span-2">
                  <Label>Команда</Label>
                  <p className="text-lg font-medium">{team.name}</p>
                </div>
                <div>
                  <Label>Баллы</Label>
                  <Input
                    name="score"
                    type="number"
                    step="0.01"
                    defaultValue={existing?.score ?? ""}
                  />
                </div>
                <div>
                  <Label>Место</Label>
                  <Input
                    name="place"
                    type="number"
                    min={1}
                    defaultValue={existing?.place ?? ""}
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select
                    name="status"
                    defaultValue={existing?.status ?? "published"}
                  >
                    <option value="published">На табло</option>
                    <option value="draft">Черновик</option>
                  </Select>
                </div>
                <div>
                  <Button type="submit" className="w-full">
                    Сохранить
                  </Button>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
