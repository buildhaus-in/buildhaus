"use server";
import { createClient } from "@buildhaus/database";
import { createAdminClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

// Create a user + profile + role. Uses the admin client, but only after the
// caller is confirmed to be the Owner.
export async function createUser(formData: FormData) {
  const ctx = await assertOwner();
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const roleKey = String(formData.get("role_key") || "");
  if (!email || !password || !roleKey) return;

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (error || !created.user) return;

  const orgId = ctx.profile!.organisation_id;
  // Ensure profile carries name + org.
  await admin.from("profiles").upsert({
    id: created.user.id, organisation_id: orgId, full_name: fullName || email.split("@")[0],
  });

  const { data: role } = await admin.from("roles")
    .select("id").eq("organisation_id", orgId).eq("key", roleKey).maybeSingle();
  if (role) {
    await admin.from("user_roles").insert({ profile_id: created.user.id, role_id: role.id });
  }
  revalidatePath("/owner/users");
}

// Assign an existing engineer/architect to a project (project_members spine).
export async function assignToProject(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const profileId = String(formData.get("profile_id") || "");
  const roleKey = String(formData.get("role_key") || "site_engineer");
  if (!projectId || !profileId) return;

  await supabase.from("project_members")
    .insert({ project_id: projectId, profile_id: profileId, role_key: roleKey });
  revalidatePath("/owner/users");
}
