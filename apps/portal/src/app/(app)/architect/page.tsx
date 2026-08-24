import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, StatCard, StatusBadge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

export default async function ArchitectDashboard() {
  const supabase = createClient();
  const ctx = await getUserContext();
  const [{ data: memberRows }, { data: drawings }, { count: pendingReview }] = await Promise.all([
    // Explicit project_members filter — RLS enforces this in production,
    // but Demo Mode has no RLS, and filtering here is correct either way.
    supabase.from("project_members")
      .select("projects(id,code,name,status,progress)")
      .eq("profile_id", ctx?.userId ?? "").eq("role_key", "architect"),
    supabase.from("drawings")
      .select("id,drawing_no,title,discipline,status,current_revision,updated_at")
      .order("updated_at", { ascending: false }).limit(8),
    supabase.from("drawings").select("*", { count: "exact", head: true }).eq("status", "client_review"),
  ]);

  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ivory">Architect Dashboard</h1>

      <div className="flex flex-wrap gap-3">
        <StatCard label="My Projects" value={projects?.length ?? 0} tone="brand" />
        <StatCard label="Drawings" value={drawings?.length ?? 0} tone="sand" />
        <StatCard label="Awaiting Client" value={pendingReview ?? 0} tone="warn" />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Recent drawings</h2>
        {(!drawings || drawings.length === 0) ? (
          <EmptyState title="No drawings yet" hint="Upload drawings from a project's Drawings tab." />
        ) : (
          <div className="divide-y divide-border">
            {drawings.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-sandlight">{d.drawing_no} · {d.title}</div>
                  <div className="text-xs text-muted">{d.discipline} · Rev {d.current_revision} · {dateLabel(d.updated_at)}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
