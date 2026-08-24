import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ProgressBar } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { sqft, dateLabel } from "@buildhaus/utils";
import { assessDelay, riskTone } from "@buildhaus/utils";

export default async function EngineerProjects() {
  const supabase = createClient();
  const ctx = await getUserContext();

  // Financial columns (contract_value, estimated_cost) are deliberately
  // omitted — engineers don't see money on this screen.
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name,status,progress,client_visible_progress,current_stage,site_address,project_type,builtup_area_sqft,floors,start_date,planned_completion)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");

  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">My projects</h1>
        <p className="text-sm text-muted">Projects you&apos;re assigned to as Site Engineer.</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" hint="The Owner will assign you to a project — it will show up here." />
      ) : (
        <div className="space-y-4">
          {projects.map((p: any) => {
            const delay = assessDelay({
              startDate: p.start_date,
              plannedCompletion: p.planned_completion,
              actualProgress: p.progress,
            });
            const tone = riskTone(delay.risk);
            return (
              <Link key={p.id} href={`/engineer/projects/${p.id}`}>
                <Card className="transition hover:border-brand/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-brand">{p.code}</div>
                      <div className="text-sm font-bold text-ivory">{p.name}</div>
                      <div className="text-xs text-muted">{p.site_address}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>{delay.risk}</Badge>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">Progress · {p.current_stage ?? "—"}</span>
                      <span className="text-ink">{p.progress}%</span>
                    </div>
                    <ProgressBar value={p.progress} tone={tone === "danger" ? "danger" : tone === "warn" ? "warn" : "brand"} height={6} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                    <span>Built-up: <span className="text-sand">{sqft(p.builtup_area_sqft)}</span></span>
                    <span>Floors: <span className="text-sand">{p.floors ?? "—"}</span></span>
                    <span>Target: <span className="text-sand">{dateLabel(p.planned_completion)}</span></span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
