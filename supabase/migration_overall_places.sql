-- Manual overall places for the public tablo
-- Run in Supabase SQL Editor

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.overall_places (
  team_id uuid primary key references public.teams (id) on delete cascade,
  place int not null check (place > 0),
  entered_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.overall_places enable row level security;

drop policy if exists "Public read app settings" on public.app_settings;
create policy "Public read app settings" on public.app_settings
  for select using (true);

drop policy if exists "Moderator manage app settings" on public.app_settings;
create policy "Moderator manage app settings" on public.app_settings
  for all using (public.is_moderator_or_admin());

drop policy if exists "Public read overall places" on public.overall_places;
create policy "Public read overall places" on public.overall_places
  for select using (true);

drop policy if exists "Moderator manage overall places" on public.overall_places;
create policy "Moderator manage overall places" on public.overall_places
  for all using (public.is_moderator_or_admin());

insert into public.app_settings (key, value)
values ('overall_mode', 'auto')
on conflict (key) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.overall_places;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.app_settings;
exception
  when duplicate_object then null;
end $$;
