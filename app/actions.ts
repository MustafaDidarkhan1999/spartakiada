"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { ScheduleStatus, UserRole } from "@/types";
import { almatyLocalInputToUtcIso } from "@/lib/datetime";

async function getAppOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function adminRedirect(path: string, type: "message" | "error", text: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(text)}`);
}

async function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/tablo");
  revalidatePath("/schedule");
  revalidatePath("/display");
  revalidatePath("/live");
  revalidatePath("/moderator");
  revalidatePath("/moderator/results");
  revalidatePath("/moderator/teams");
  revalidatePath("/moderator/schedule");
  revalidatePath("/moderator/groups");
  revalidatePath("/groups");
  revalidatePath("/judge");
  revalidatePath("/admin");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Нужно, чтобы cookie сессии успели записаться до редиректа
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function upsertTeam(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("short_name") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!name) {
    redirect(
      `/moderator/teams?error=${encodeURIComponent("Укажите название команды.")}`,
    );
  }

  const { error } = id
    ? await supabase
        .from("teams")
        .update({ name, short_name: shortName, sort_order: sortOrder })
        .eq("id", id)
    : await supabase.from("teams").insert({
        name,
        short_name: shortName,
        sort_order: sortOrder,
      });

  if (error) {
    redirect(`/moderator/teams?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/teams?message=${encodeURIComponent(id ? "Команда обновлена." : "Команда добавлена.")}`,
  );
}

export async function deleteTeam(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase
    .from("teams")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    redirect(`/moderator/teams?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/teams?message=${encodeURIComponent("Команда скрыта.")}`,
  );
}

export async function upsertScheduleEvent(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const disciplineId = String(formData.get("discipline_id") ?? "") || null;
  const groupId = String(formData.get("group_id") ?? "") || null;
  const teamAId = String(formData.get("team_a_id") ?? "") || null;
  const teamBId = String(formData.get("team_b_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const startsAt = String(formData.get("starts_at") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "scheduled") as ScheduleStatus;
  const roundLabel = String(formData.get("round_label") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const scoreARaw = String(formData.get("score_a") ?? "").trim();
  const scoreBRaw = String(formData.get("score_b") ?? "").trim();
  const resultText = String(formData.get("result_text") ?? "").trim() || null;

  if (!startsAt) {
    redirect(
      `/moderator/schedule?error=${encodeURIComponent("Укажите дату и время.")}`,
    );
  }

  let startsAtIso: string;
  try {
    startsAtIso = almatyLocalInputToUtcIso(startsAt);
  } catch {
    redirect(
      `/moderator/schedule?error=${encodeURIComponent("Некорректная дата/время.")}`,
    );
  }

  const basePayload = {
    discipline_id: disciplineId,
    group_id: groupId,
    team_a_id: teamAId,
    team_b_id: teamBId,
    title,
    starts_at: startsAtIso,
    location,
    status,
    round_label: roundLabel,
    notes,
  };

  const payloadWithScores = {
    ...basePayload,
    score_a: scoreARaw === "" ? null : Number(scoreARaw),
    score_b: scoreBRaw === "" ? null : Number(scoreBRaw),
    result_text: resultText,
  };

  let errorMessage: string | null = null;

  if (id) {
    const { error } = await supabase
      .from("schedule_events")
      .update(payloadWithScores)
      .eq("id", id);
    errorMessage = error?.message ?? null;

    // Fallback if score/group columns were not migrated yet
    if (
      errorMessage &&
      /score_a|score_b|result_text|group_id|column/i.test(errorMessage)
    ) {
      const { error: fallbackError } = await supabase
        .from("schedule_events")
        .update(basePayload)
        .eq("id", id);
      errorMessage = fallbackError?.message ?? null;
    }
  } else {
    const { error } = await supabase
      .from("schedule_events")
      .insert(payloadWithScores);
    errorMessage = error?.message ?? null;

    if (errorMessage && /score_a|score_b|result_text|group_id|column/i.test(errorMessage)) {
      const { error: fallbackError } = await supabase
        .from("schedule_events")
        .insert(basePayload);
      errorMessage = fallbackError?.message ?? null;
      if (errorMessage && /group_id|column/i.test(errorMessage)) {
        const { group_id: _removed, ...withoutGroup } = basePayload;
        const { error: fallback2 } = await supabase
          .from("schedule_events")
          .insert(withoutGroup);
        errorMessage = fallback2?.message ?? null;
      }
    }
  }

  if (errorMessage) {
    redirect(
      `/moderator/schedule?error=${encodeURIComponent(errorMessage)}`,
    );
  }

  await revalidateAll();
  redirect(
    `/moderator/schedule?message=${encodeURIComponent(id ? "Событие обновлено." : "Событие добавлено.")}`,
  );
}

export async function deleteScheduleEvent(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("schedule_events").delete().eq("id", id);
  if (error) {
    redirect(
      `/moderator/schedule?error=${encodeURIComponent(error.message)}`,
    );
  }

  await revalidateAll();
  redirect(
    `/moderator/schedule?message=${encodeURIComponent("Событие удалено.")}`,
  );
}

export async function upsertTournamentGroup(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const disciplineId = String(formData.get("discipline_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const maxTeams = Number(formData.get("max_teams") ?? 4);
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!disciplineId || !name) {
    redirect(
      `/moderator/groups?error=${encodeURIComponent("Укажите дисциплину и название группы.")}`,
    );
  }

  const payload = {
    discipline_id: disciplineId,
    name,
    max_teams: Number.isFinite(maxTeams) && maxTeams > 0 ? maxTeams : 4,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  };

  const { error } = id
    ? await supabase.from("tournament_groups").update(payload).eq("id", id)
    : await supabase.from("tournament_groups").insert(payload);

  if (error) {
    redirect(`/moderator/groups?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/groups?message=${encodeURIComponent(id ? "Группа обновлена." : "Группа создана.")}`,
  );
}

export async function deleteTournamentGroup(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("tournament_groups").delete().eq("id", id);
  if (error) {
    redirect(`/moderator/groups?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/groups?message=${encodeURIComponent("Группа удалена.")}`,
  );
}

export async function addTeamToGroup(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const groupId = String(formData.get("group_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");

  if (!groupId || !teamId) {
    redirect(
      `/moderator/groups?error=${encodeURIComponent("Выберите группу и команду.")}`,
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("tournament_groups")
    .select("id, discipline_id, max_teams")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    redirect(
      `/moderator/groups?error=${encodeURIComponent(groupError?.message ?? "Группа не найдена.")}`,
    );
  }

  const { count } = await supabase
    .from("group_teams")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if ((count ?? 0) >= group.max_teams) {
    redirect(
      `/moderator/groups?error=${encodeURIComponent(`В группе уже максимум ${group.max_teams} команд.`)}`,
    );
  }

  const { error } = await supabase.from("group_teams").insert({
    group_id: groupId,
    discipline_id: group.discipline_id,
    team_id: teamId,
    sort_order: (count ?? 0) + 1,
  });

  if (error) {
    const msg = error.message.includes("duplicate")
      ? "Эта команда уже стоит в группе этой дисциплины."
      : error.message;
    redirect(`/moderator/groups?error=${encodeURIComponent(msg)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/groups?message=${encodeURIComponent("Команда добавлена в группу.")}`,
  );
}

export async function removeTeamFromGroup(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("group_teams").delete().eq("id", id);
  if (error) {
    redirect(`/moderator/groups?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(
    `/moderator/groups?message=${encodeURIComponent("Команда убрана из группы.")}`,
  );
}

export async function saveDisciplineResult(formData: FormData) {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();

  const disciplineId = String(formData.get("discipline_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const placeRaw = String(formData.get("place") ?? "").trim();
  const status = String(formData.get("status") ?? "published");
  const returnTo = String(formData.get("return_to") ?? "").trim();

  const back =
    returnTo ||
    (disciplineId ? `/judge/${disciplineId}` : "/moderator/results");

  if (!disciplineId || !teamId) {
    redirect(`${back}?error=${encodeURIComponent("Не указаны дисциплина или команда.")}`);
  }

  const score = scoreRaw === "" ? null : Number(scoreRaw);
  const place = placeRaw === "" ? null : Number(placeRaw);

  const { error } = await supabase.from("discipline_results").upsert(
    {
      discipline_id: disciplineId,
      team_id: teamId,
      score,
      place,
      status,
      entered_by: profile.id,
    },
    { onConflict: "discipline_id,team_id" },
  );

  if (error) {
    redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(`${back}?message=${encodeURIComponent("Результат сохранён.")}`);
}

export async function deleteDisciplineResult(formData: FormData) {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const back = returnTo || "/moderator/results";

  if (!id) {
    redirect(`${back}?error=${encodeURIComponent("Не указана запись.")}`);
  }

  if (profile.role === "judge") {
    const { data: result } = await supabase
      .from("discipline_results")
      .select("discipline_id")
      .eq("id", id)
      .maybeSingle();

    if (!result) {
      redirect(`${back}?error=${encodeURIComponent("Запись не найдена.")}`);
    }

    const { data: assignment } = await supabase
      .from("judge_assignments")
      .select("id")
      .eq("user_id", profile.id)
      .eq("discipline_id", result.discipline_id)
      .maybeSingle();

    if (!assignment) {
      redirect(`${back}?error=${encodeURIComponent("Нет доступа к этой дисциплине.")}`);
    }
  }

  const { error } = await supabase.from("discipline_results").delete().eq("id", id);
  if (error) {
    redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  }

  await revalidateAll();
  redirect(`${back}?message=${encodeURIComponent("Запись удалена с табло.")}`);
}

export async function updateUserRole(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "judge") as UserRole;
  const fullName = String(formData.get("full_name") ?? "").trim() || null;

  if (!userId) {
    adminRedirect("/admin", "error", "Не указан пользователь.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", userId);

  if (error) {
    adminRedirect("/admin", "error", error.message);
  }

  await revalidateAll();
  adminRedirect("/admin", "message", "Роль сохранена.");
}

export async function assignJudge(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();

  const disciplineId = String(formData.get("discipline_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");

  if (!disciplineId || !userId) {
    adminRedirect("/admin", "error", "Выберите судью и дисциплину.");
  }

  const { error } = await supabase.from("judge_assignments").upsert(
    { discipline_id: disciplineId, user_id: userId },
    { onConflict: "discipline_id,user_id" },
  );

  if (error) {
    adminRedirect("/admin", "error", error.message);
  }

  await revalidateAll();
  adminRedirect("/admin", "message", "Судья назначен.");
}

export async function removeJudgeAssignment(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    adminRedirect("/admin", "error", "Не указано назначение.");
  }

  const { error } = await supabase.from("judge_assignments").delete().eq("id", id);
  if (error) {
    adminRedirect("/admin", "error", error.message);
  }

  await revalidateAll();
  adminRedirect("/admin", "message", "Назначение снято.");
}

export async function createUser(formData: FormData) {
  await requireProfile(["admin"]);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim() || email;
  const role = String(formData.get("role") ?? "judge") as UserRole;

  if (!email || password.length < 6) {
    adminRedirect(
      "/admin",
      "error",
      "Укажите email и пароль не короче 6 символов.",
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data.user) {
      adminRedirect(
        "/admin",
        "error",
        error?.message ?? "Не удалось создать пользователя.",
      );
    }

    const newUser = data.user;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: newUser.id,
        full_name: fullName,
        role,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      adminRedirect("/admin", "error", profileError.message);
    }

    await revalidateAll();
    adminRedirect(
      "/admin",
      "message",
      `Пользователь ${email} создан. Передайте ему временный пароль.`,
    );
  } catch (err) {
    adminRedirect(
      "/admin",
      "error",
      err instanceof Error ? err.message : "Ошибка создания пользователя.",
    );
  }
}

export async function adminResetPassword(formData: FormData) {
  await requireProfile(["admin"]);

  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || password.length < 6) {
    adminRedirect(
      "/admin",
      "error",
      "Укажите пользователя и новый пароль (мин. 6 символов).",
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      adminRedirect("/admin", "error", error.message);
    }

    adminRedirect("/admin", "message", "Пароль пользователя обновлён.");
  } catch (err) {
    adminRedirect(
      "/admin",
      "error",
      err instanceof Error ? err.message : "Ошибка сброса пароля.",
    );
  }
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Введите email.")}`,
    );
  }

  const supabase = await createClient();
  const origin = await getAppOrigin();
  const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/auth/forgot-password?message=${encodeURIComponent("Ссылка для сброса отправлена на email (если аккаунт существует).")}`,
  );
}

export async function setNewPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Пароль не короче 6 символов.")}`,
    );
  }

  if (password !== confirm) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Пароли не совпадают.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent("Сессия истекла. Запросите сброс пароля снова.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/settings/password?message=${encodeURIComponent("Пароль успешно изменён.")}`,
  );
}

export async function changeOwnPassword(formData: FormData) {
  await requireProfile(["admin", "moderator", "judge"]);
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 6) {
    redirect(
      `/settings/password?error=${encodeURIComponent("Новый пароль не короче 6 символов.")}`,
    );
  }

  if (newPassword !== confirm) {
    redirect(
      `/settings/password?error=${encodeURIComponent("Пароли не совпадают.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/settings/password?error=${encodeURIComponent("Пользователь не найден.")}`);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    redirect(
      `/settings/password?error=${encodeURIComponent("Текущий пароль неверный.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    redirect(`/settings/password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/settings/password?message=${encodeURIComponent("Пароль успешно изменён.")}`,
  );
}
