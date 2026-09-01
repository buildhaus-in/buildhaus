"use server";
import { createClient } from "@buildhaus/database";
import { createAdminClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

// Create a user + profile + role. Uses the admin client, but only after the
// caller is confirmed to be the Owner.
export async function createUser(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const roleKey = String(formData.get("role_key") || "");
  if (!email || !password || !roleKey) return { ok: false, error: "Fill in name, email, password and role." };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (error) return { ok: false, error: error.message || "Couldn't create the user." };
  if (!created.user) return { ok: false, error: "Couldn't create the user." };

  const orgId = ctx.profile!.organisation_id;
  // Ensure profile carries name + org.
  let result = unwrap(
    await admin.from("profiles").upsert({
      id: created.user.id, organisation_id: orgId, full_name: fullName || email.split("@")[0],
    }),
    "User was created, but the profile couldn't be saved — contact support."
  );
  if (!result.ok) return result;

  const { data: role, error: roleError } = await admin.from("roles")
    .select("id").eq("organisation_id", orgId).eq("key", roleKey).maybeSingle();
  if (roleError) return { ok: false, error: roleError.message || "Couldn't look up the role." };
  if (role) {
    result = unwrap(
      await admin.from("user_roles").insert({ profile_id: created.user.id, role_id: role.id }),
      "User was created, but the role couldn't be assigned — assign it manually."
    );
    if (!result.ok) return result;
  }
  revalidatePath("/owner/users");
  return { ok: true, data: null };
}

// Assign an existing engineer/architect to a project (project_members spine).
export async function assignToProject(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const profileId = String(formData.get("profile_id") || "");
  const roleKey = String(formData.get("role_key") || "site_engineer");
  if (!projectId || !profileId) return { ok: false, error: "Select a person and a project." };

  const result = unwrap(
    await supabase.from("project_members")
      .insert({ project_id: projectId, profile_id: profileId, role_key: roleKey }),
    "Couldn't assign this person to the project."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/users");
  // Without this, the project detail page's Team section (and the projects
  // list) can show a stale "No one assigned yet" for up to Next's Router
  // Cache TTL after a fresh assignment, if reached via client-side
  // navigation rather than a hard reload — the DB write itself was never
  // the problem.
  revalidatePath(`/owner/projects/${projectId}`);
  revalidatePath("/owner/projects");
  return { ok: true, data: null };
}
