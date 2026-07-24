import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, Card } from "@/components/ui";

export default async function ModeratorPage() {
  const profile = await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const [{ count: teamsCount }, { count: eventsCount }, { count: resultsCount }] =
    await Promise.all([
      supabase.from("teams").select("*", { count: "exact", head: true }),
      supabase.from("schedule_events").select("*", { count: "exact", head: true }),
      supabase
        .from("discipline_results")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <AppShell
      title="Панель модератора"
      role={profile.role}
      links={[
        { href: "/moderator/teams", label: "Команды" },
        { href: "/moderator/schedule", label: "Расписание" },
        { href: "/live", label: "Live" },
        ...(profile.role === "admin" ? [{ href: "/admin", label: "Админ" }] : []),
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Команды</p>
          <p className="text-3xl font-bold">{teamsCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">События в расписании</p>
          <p className="text-3xl font-bold">{eventsCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Записей результатов</p>
          <p className="text-3xl font-bold">{resultsCount ?? 0}</p>
        </Card>
      </div>

      <Card title="Что можно делать" className="mt-6">
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>Редактировать названия команд</li>
          <li>Добавлять и менять расписание матчей</li>
          <li>Менять статусы событий (ожидается / идёт / завершён)</li>
          <li>Вручную править места команд по дисциплинам (через судейскую панель)</li>
        </ul>
        <div className="mt-4 flex gap-3">
          <Link
            href="/moderator/teams"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950"
          >
            Управление командами
          </Link>
          <Link
            href="/moderator/schedule"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Управление расписанием
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
