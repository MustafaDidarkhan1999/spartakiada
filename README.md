# Спартакиада 2026 — Integra Construction KZ

Система судейства, расписания и live-табло.

## Стек

- Next.js 16 + TypeScript + Tailwind
- Supabase (Auth, PostgreSQL, Realtime)

## Локальный запуск

```bash
npm install
npm run dev
```

Открой http://localhost:3000

## Первичная настройка Supabase

1. Открой [Supabase Dashboard](https://supabase.com/dashboard) → твой проект
2. **SQL Editor** → выполни весь файл `supabase/schema.sql`
3. **Settings → API** — скопируй в `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, для админки пользователей)
4. **Authentication → URL Configuration** → Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - (после деплоя) `https://твой-домен/auth/callback`
5. Создай первого админа в **Authentication → Users** или через `/admin` после входа
6. Если пользователь создан до `schema.sql`, добавь профиль вручную:

```sql
insert into public.profiles (id, full_name, role)
values ('ТВОЙ-UUID', 'Админ', 'admin')
on conflict (id) do update set role = 'admin';
```

## Пользователи и пароли

| Действие | Где |
|----------|-----|
| Создать судью/модератора | `/admin` → форма «Создать пользователя» |
| Сбросить пароль пользователю | `/admin` → «Сбросить пароль» у нужного человека |
| Сменить свой пароль | «Пароль» в шапке или `/settings/password` |
| Забыл пароль | `/login` → «Забыли пароль?» (письмо на email) |

Админ создаёт аккаунт с **временным паролем** → передаёт судье → судья меняет в «Пароль» или по ссылке из email.

## Роли

| Роль | Доступ |
|------|--------|
| admin | Пользователи, назначение судей, всё остальное |
| moderator | Команды, расписание |
| judge | Ввод баллов и мест по своим дисциплинам |

## Публичные страницы

- `/live` — общий зачёт (сумма мест, меньше = лучше)
- `/live/schedule` — расписание в реальном времени

## Переменные окружения

Скопируй `.env.example` в `.env.local` и заполни ключи из Supabase → Settings → API.

## Деплой

1. Залей репозиторий на GitHub
2. Подключи проект в [Vercel](https://vercel.com)
3. Добавь те же env-переменные в Vercel
4. Для live-экрана открой `/live` в полноэкранном режиме (F11)
