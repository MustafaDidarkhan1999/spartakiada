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
        { href: "/moderator/groups", label: "Группы" },
        { href: "/moderator/schedule", label: "Расписание" },
        { href: "/judge", label: "Оценки / места" },
        { href: "/moderator/results", label: "Табло: правки" },
        { href: "/tablo", label: "Табло" },
        { href: "/schedule", label: "Публ. расписание" },
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

      <Card title="Возможности модератора" className="mt-6">
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>Команды и расписание матчей</li>
          <li>Группы A/B/C/D (и A1, A2…) для футбола и волейбола</li>
          <li>Счёт матча прямо в расписании (отображается на ТВ)</li>
          <li>
            <strong className="text-amber-300">Оценки и места по дисциплинам</strong>{" "}
            — как у судьи (для возрастных судей можно вводить самому)
          </li>
          <li>Статусы: ожидается / идёт / завершён</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/moderator/results"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950"
          >
            Редактировать / удалить с табло
          </Link>
          <Link
            href="/judge"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Ввести оценки и места
          </Link>
          <Link
            href="/moderator/groups"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Группы футбол / волейбол
          </Link>
          <Link
            href="/moderator/schedule"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Расписание и счёт
          </Link>
          <Link
            href="/moderator/teams"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Команды
          </Link>
          <Link
            href="/display"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            ТВ-режим (слайды)
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
