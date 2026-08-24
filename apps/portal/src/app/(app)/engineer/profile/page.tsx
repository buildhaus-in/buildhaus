import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";

export default async function EngineerProfile() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,phone,avatar_url,organisation_id")
    .eq("id", ctx?.userId ?? "")
    .maybeSingle();

  const { data: org } = await supabase
    .from("organisations")
    .select("name,city,state")
    .eq("id", profile?.organisation_id ?? "")
    .maybeSingle();

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(label)")
    .eq("profile_id", ctx?.userId ?? "");
  const roleLabels = (roleRows ?? []).map((r: any) => r.roles?.label).filter(Boolean);

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Profile</h1>
        <p className="text-sm text-muted">Your details — read only.</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-lg font-bold text-brand">
            {profile?.full_name?.slice(0, 1) ?? "?"}
          </div>
          <div>
            <div className="text-lg font-bold text-ivory">{profile?.full_name ?? "—"}</div>
            <div className="flex flex-wrap gap-1.5">
              {roleLabels.map((r: string) => <Badge key={r} tone="brand">{r}</Badge>)}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Phone</div><div className="text-sm text-ink">{profile?.phone ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Organisation</div><div className="text-sm text-ink">{org?.name ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Location</div><div className="text-sm text-ink">{org ? `${org.city}, ${org.state}` : "—"}</div></div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Assigned projects</h2>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet" hint="The Owner will assign you to a project." />
        ) : (
          <div className="space-y-2">
            {projects.map((p: any) => (
              <Link key={p.id} href={`/engineer/projects/${p.id}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-surface">
                <span className="text-sandlight">{p.name}</span>
                <span className="text-xs text-muted">{p.code}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
