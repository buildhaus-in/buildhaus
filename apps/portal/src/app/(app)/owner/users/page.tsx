import { createClient } from "@buildhaus/database";
import { Card, Badge, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { ROLE_LABEL } from "@/lib/rbac";
import { createUser, assignToProject } from "./actions";

export default async function UsersPage() {
  const supabase = createClient();
  const [{ data: profiles }, { data: userRoles }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("id,full_name"),
    supabase.from("user_roles").select("profile_id, roles(key)"),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
  ]);

  const rolesByProfile = new Map<string, string[]>();
  for (const ur of userRoles ?? []) {
    const key = (ur as any).roles?.key;
    if (!key) continue;
    const arr = rolesByProfile.get((ur as any).profile_id) ?? [];
    arr.push(key); rolesByProfile.set((ur as any).profile_id, arr);
  }
  const assignable = (profiles ?? []).filter((p: any) =>
    (rolesByProfile.get(p.id) ?? []).some((r) => r === "site_engineer" || r === "architect"));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ivory">Users &amp; roles</h1>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Add a user</h2>
        <ActionForm action={createUser} successMessage="User created." className="grid gap-x-4 sm:grid-cols-2">
          <Input label="Full name" name="full_name" placeholder="Murali Krishna" required />
          <Input label="Email" name="email" type="email" placeholder="murali@buildhaus.example" required />
          <Input label="Temp password" name="password" type="text" placeholder="set-a-strong-one" required />
          <Select label="Role" name="role_key" defaultValue="site_engineer">
            <option value="site_engineer">Site Engineer</option>
            <option value="architect">Architect</option>
            <option value="client">Client</option>
            <option value="owner">Owner</option>
          </Select>
          <div className="sm:col-span-2"><SubmitButton>Create user</SubmitButton></div>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">
          The user signs in at /login with this email and temp password. Ask them to change it after first sign-in.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Assign engineer / architect to a project</h2>
        {assignable.length === 0 ? (
          <div className="text-sm text-muted">Create a Site Engineer or Architect first.</div>
        ) : (
          <ActionForm action={assignToProject} successMessage="Assigned." className="grid gap-x-4 sm:grid-cols-3">
            <Select label="Person" name="profile_id">
              {assignable.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
            <Select label="Project" name="project_id">
              {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </Select>
            <Select label="As" name="role_key" defaultValue="site_engineer">
              <option value="site_engineer">Site Engineer</option>
              <option value="architect">Architect</option>
            </Select>
            <div className="sm:col-span-3"><SubmitButton>Assign</SubmitButton></div>
          </ActionForm>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Team</h2>
        {(!profiles || profiles.length === 0) ? (
          <EmptyState title="No users yet" />
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-sandlight">{p.full_name}</span>
                <div className="flex gap-1">
                  {(rolesByProfile.get(p.id) ?? []).map((r) => (
                    <Badge key={r} tone="brand">{ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
