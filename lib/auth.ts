import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function requireProfile(roles?: UserRole[]) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (roles && !roles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}

export function roleHomePath(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "moderator":
      return "/moderator";
    case "judge":
      return "/judge";
    default:
      return "/dashboard";
  }
}
