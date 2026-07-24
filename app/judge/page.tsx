import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, Card } from "@/components/ui";

export default async function JudgePage() {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();

  let disciplinesQuery = supabase.from("disciplines").select("*").order("sort_order");

  if (profile.role === "judge") {
    const { data: assignments } = await supabase
      .from("judge_assignments")
      .select("discipline_id")
      .eq("user_id", profile.id);

    const ids = (assignments ?? []).map((a) => a.discipline_id);
    if (ids.length === 0) {
      return (
        <AppShell
          title="Панель судьи"
          role={profile.role}
          links={[{ href: "/live", label: "Live" }]}
        >
          <Card>
            <p className="text-slate-300">
              Вам ещё не назначены дисциплины. Обратитесь к администратору.
            </p>
          </Card>
        </AppShell>
      );
    }

    disciplinesQuery = disciplinesQuery.in("id", ids);
  }

  const { data: disciplines } = await disciplinesQuery;

  return (
    <AppShell
      title="Панель судьи"
      role={profile.role}
      links={[
        { href: "/live", label: "Live" },
        ...(profile.role === "admin"
          ? [{ href: "/admin", label: "Админ" }]
          : profile.role === "moderator"
            ? [{ href: "/moderator", label: "Модератор" }]
            : []),
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(disciplines ?? []).map((discipline) => (
          <Card key={discipline.id}>
            <h3 className="text-lg font-semibold">{discipline.name}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {discipline.counts_to_overall
                ? "Входит в общий зачёт"
                : "Вне общего зачёта (Белка)"}
            </p>
            <Link
              href={`/judge/${discipline.id}`}
              className="mt-4 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950"
            >
              Ввести баллы и места
            </Link>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
