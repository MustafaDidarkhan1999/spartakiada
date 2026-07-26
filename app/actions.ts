"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { ScheduleStatus, UserRole } from "@/types";

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

  if (!name) return;

  if (id) {
    await supabase
      .from("teams")
      .update({ name, short_name: shortName, sort_order: sortOrder })
      .eq("id", id);
  } else {
    await supabase.from("teams").insert({
      name,
      short_name: shortName,
      sort_order: sortOrder,
    });
  }

  await revalidateAll();
}

export async function deleteTeam(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("teams").update({ is_active: false }).eq("id", id);
  await revalidateAll();
}

export async function upsertScheduleEvent(formData: FormData) {
  await requireProfile(["admin", "moderator"]);
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const disciplineId = String(formData.get("discipline_id") ?? "") || null;
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

  const basePayload = {
    discipline_id: disciplineId,
    team_a_id: teamAId,
    team_b_id: teamBId,
    title,
    starts_at: new Date(startsAt).toISOString(),
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

    // Fallback if score columns were not migrated yet
    if (errorMessage && /score_a|score_b|result_text|column/i.test(errorMessage)) {
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

    if (errorMessage && /score_a|score_b|result_text|column/i.test(errorMessage)) {
      const { error: fallbackError } = await supabase
        .from("schedule_events")
        .insert(basePayload);
      errorMessage = fallbackError?.message ?? null;
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

export async function saveDisciplineResult(formData: FormData) {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();

  const disciplineId = String(formData.get("discipline_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const placeRaw = String(formData.get("place") ?? "").trim();
  const status = String(formData.get("status") ?? "published");

  if (!disciplineId || !teamId) return;

  const score = scoreRaw === "" ? null : Number(scoreRaw);
  const place = placeRaw === "" ? null : Number(placeRaw);

  await supabase.from("discipline_results").upsert(
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

  await revalidateAll();
}

export async function deleteDisciplineResult(formData: FormData) {
  const profile = await requireProfile(["admin", "moderator", "judge"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (profile.role === "judge") {
    const { data: result } = await supabase
      .from("discipline_results")
      .select("discipline_id")
      .eq("id", id)
      .maybeSingle();

    if (!result) return;

    const { data: assignment } = await supabase
      .from("judge_assignments")
      .select("id")
      .eq("user_id", profile.id)
      .eq("discipline_id", result.discipline_id)
      .maybeSingle();

    if (!assignment) return;
  }

  await supabase.from("discipline_results").delete().eq("id", id);
  await revalidateAll();
}

export async function updateUserRole(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "judge") as UserRole;
  const fullName = String(formData.get("full_name") ?? "").trim() || null;

  if (!userId) return;

  await supabase
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", userId);

  await revalidateAll();
}

export async function assignJudge(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();

  const disciplineId = String(formData.get("discipline_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");

  if (!disciplineId || !userId) return;

  await supabase.from("judge_assignments").upsert(
    { discipline_id: disciplineId, user_id: userId },
    { onConflict: "discipline_id,user_id" },
  );

  await revalidateAll();
}

export async function removeJudgeAssignment(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("judge_assignments").delete().eq("id", id);
  await revalidateAll();
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
