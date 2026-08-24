import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, StatusBadge, ProgressBar } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { sqft, dateLabel } from "@buildhaus/utils";

// Read-only — the Architect can see which projects they're assigned to, but
// never contract_value / estimated_cost (that's Owner-only financial data).
export default async function ArchitectProjects() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name,project_type,site_address,status,progress,current_stage,builtup_area_sqft,floors,planned_completion,start_date)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "architect");

  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">My Projects</h1>
        <p className="text-sm text-muted">Projects you&apos;re assigned to as architect.</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects assigned yet" hint="Ask the Owner to add you as architect on a project." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p: any) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-brand">{p.code}</div>
                  <div className="mt-0.5 font-bold text-ivory">{p.name}</div>
                  <div className="text-xs text-muted">{p.site_address}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                <span>{p.project_type?.replace(/_/g, " ")}</span>
                <span>{sqft(p.builtup_area_sqft)}</span>
                <span>{p.floors ?? "—"} floors</span>
                <span>due {dateLabel(p.planned_completion)}</span>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">Stage: {p.current_stage ?? "—"}</span>
                  <span className="text-ink">{p.progress ?? 0}%</span>
                </div>
                <ProgressBar value={p.progress ?? 0} height={6} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
