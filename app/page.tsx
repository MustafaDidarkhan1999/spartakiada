import Link from "next/link";
import { getProfile, roleHomePath } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getProfile();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-amber-400">
          Integra Construction KZ
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Спартакиада 2026
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          Система судейства, расписания и табло общего зачёта.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/tablo"
            className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Табло
          </Link>
          <Link
            href="/schedule"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-amber-500/50"
          >
            Расписание
          </Link>
          <Link
            href="/groups"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-amber-500/50"
          >
            Группы
          </Link>
          <Link
            href="/display"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-amber-500/50"
          >
            ТВ-режим
          </Link>
          {profile ? (
            <Link
              href={roleHomePath(profile.role)}
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-amber-500/50"
            >
              Кабинет ({profile.full_name ?? "панель"})
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:border-amber-500/50"
            >
              Вход для сотрудников
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
