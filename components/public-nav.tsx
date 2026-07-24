import Link from "next/link";
import { getProfile, roleHomePath } from "@/lib/auth";

export async function PublicNav({
  extraLinks = [],
}: {
  extraLinks?: { href: string; label: string }[];
}) {
  const profile = await getProfile();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {extraLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-amber-500/50"
        >
          {link.label}
        </Link>
      ))}
      {profile ? (
        <Link
          href={roleHomePath(profile.role)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          Кабинет
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-amber-500/50"
        >
          Вход
        </Link>
      )}
    </div>
  );
}
