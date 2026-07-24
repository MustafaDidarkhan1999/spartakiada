import { redirect } from "next/navigation";
import { getProfile, roleHomePath } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  redirect(roleHomePath(profile.role));
}
