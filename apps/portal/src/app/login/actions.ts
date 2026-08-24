"use server";
import { createClient } from "@buildhaus/database";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/rbac";

export async function signIn(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  // Resolve roles to send the user to the right home.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(key)")
    .eq("profile_id", data.user.id);
  const roles = (roleRows ?? []).map((r: any) => r.roles?.key).filter(Boolean);

  redirect(homeFor(roles));
}
