"use server";
import { createClient } from "@buildhaus/database";
import { createAdminClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

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
  if (error) throw new Error(error.message || "Couldn't create the user.");
  if (!created.user) throw new Error("Couldn't create the user.");

  const orgId = ctx.profile!.organisation_id;
  // Ensure profile carries name + org.
  throwIfError(
    await admin.from("profiles").upsert({
      id: created.user.id, organisation_id: orgId, full_name: fullName || email.split("@")[0],
    }),
    "User was created, but the profile couldn't be saved — contact support."
  );

  const { data: role, error: roleError } = await admin.from("roles")
    .select("id").eq("organisation_id", orgId).eq("key", roleKey).maybeSingle();
  if (roleError) throw new Error(roleError.message || "Couldn't look up the role.");
  if (role) {
    throwIfError(
      await admin.from("user_roles").insert({ profile_id: created.user.id, role_id: role.id }),
      "User was created, but the role couldn't be assigned — assign it manually."
    );
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

  throwIfError(
    await supabase.from("project_members")
      .insert({ project_id: projectId, profile_id: profileId, role_key: roleKey }),
    "Couldn't assign this person to the project."
  );
  revalidatePath("/owner/users");
  // Without this, the project detail page's Team section (and the projects
  // list) can show a stale "No one assigned yet" for up to Next's Router
  // Cache TTL after a fresh assignment, if reached via client-side
  // navigation rather than a hard reload — the DB write itself was never
  // the problem.
  revalidatePath(`/owner/projects/${projectId}`);
  revalidatePath("/owner/projects");
}
