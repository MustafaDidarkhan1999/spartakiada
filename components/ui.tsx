import Link from "next/link";
import type { UserRole } from "@/types";
import { ROLE_LABELS } from "@/types";

export function AppShell({
  title,
  role,
  children,
  links,
}: {
  title: string;
  role?: UserRole;
  children: React.ReactNode;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400">
              Integra Construction KZ
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
            {role ? (
              <p className="text-sm text-slate-400">{ROLE_LABELS[role]}</p>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-amber-500/50 hover:text-amber-300"
              >
                {link.label}
              </Link>
            ))}
            {role ? (
              <Link
                href="/settings/password"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-amber-500/50 hover:text-amber-300"
              >
                Пароль
              </Link>
            ) : null}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
              >
                Выйти
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}
    >
      {title ? (
        <h2 className="mb-4 text-base font-semibold text-amber-300">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };

  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-500 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm text-slate-300">{children}</label>;
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-slate-700 text-slate-200",
    live: "bg-emerald-600 text-white",
    finished: "bg-blue-700 text-white",
    postponed: "bg-amber-600 text-slate-950",
    cancelled: "bg-rose-700 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-700"}`}
    >
      {status}
    </span>
  );
}
