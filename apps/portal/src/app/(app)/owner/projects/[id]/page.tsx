import { createClient } from "@buildhaus/database";
import { Card, StatCard, ProgressBar, StatusBadge, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, sqft, dateLabel } from "@buildhaus/utils";
import { assessDelay, riskTone } from "@buildhaus/utils";
import { notFound } from "next/navigation";
import { DocumentUploadForm } from "./DocumentUploadForm";

const CATEGORY_TONE: Record<string, "ok" | "warn" | "danger" | "muted" | "brand"> = {
  legal: "brand", approvals: "ok",
};

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id,code,name,site_address,project_type,status,progress,client_visible_progress,contract_value,estimated_cost,builtup_area_sqft,floors,current_stage,planned_completion,start_date")
    .eq("id", params.id).maybeSingle();
  if (!project) notFound();

  const delay = assessDelay({
    startDate: project.start_date,
    plannedCompletion: project.planned_completion,
    actualProgress: project.progress,
  });

  const [{ data: stages }, { data: members }, { data: tasks }, { data: documents }] = await Promise.all([
    supabase.from("project_stages").select("seq,name,status,progress").eq("project_id", project.id).order("seq"),
    supabase.from("project_members").select("role_key, profiles(full_name)").eq("project_id", project.id),
    supabase.from("tasks").select("id,title,status").eq("project_id", project.id).limit(6),
    supabase.from("documents").select("id,title,category,file_url,client_visible,uploaded_at").eq("project_id", project.id).order("uploaded_at", { ascending: false }),
  ]);

  const margin = (project.contract_value ?? 0) - (project.estimated_cost ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ivory">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-muted">{project.site_address}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Contract value" value={inr(project.contract_value)} tone="brand" />
        <StatCard label="Estimated cost" value={inr(project.estimated_cost)} tone="sand" />
        <StatCard label="Projected margin" value={inr(margin)} tone={margin >= 0 ? "ok" : "danger"} />
        <StatCard label="Built-up" value={sqft(project.builtup_area_sqft)} tone="sand" sub={`${project.floors ?? "—"} floors`} />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sandlight">Progress &amp; schedule</span>
          <Badge tone={riskTone(delay.risk)}>{delay.risk}</Badge>
        </div>

        {/* Internal actual vs published-to-client — labelled to avoid confusion */}
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">Internal actual</span>
          <span className="text-ink">{delay.actualProgress}%</span>
        </div>
        <ProgressBar value={delay.actualProgress} height={8} tone={riskTone(delay.risk) === "danger" ? "danger" : riskTone(delay.risk) === "warn" ? "warn" : "brand"} />
        <div className="mb-1 mt-3 flex items-center justify-between text-xs">
          <span className="text-muted">Published to client</span>
          <span className="text-ink">{project.client_visible_progress ?? 0}%</span>
        </div>
        <ProgressBar value={project.client_visible_progress ?? 0} height={8} tone="ok" />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Planned</div><div className="text-sm font-semibold text-ink">{delay.plannedProgress}%</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Variance</div><div className={`text-sm font-semibold ${delay.variance < 0 ? "text-danger" : "text-ok"}`}>{delay.variance > 0 ? "+" : ""}{delay.variance}%</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Days remaining</div><div className="text-sm font-semibold text-ink">{delay.daysRemaining ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Projected delay</div><div className={`text-sm font-semibold ${delay.delayDays > 0 ? "text-danger" : "text-ok"}`}>{delay.delayDays > 0 ? `${delay.delayDays}d` : "On time"}</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
          <span>Stage: <span className="text-sand">{project.current_stage ?? "—"}</span></span>
          <span>Start: <span className="text-sand">{dateLabel(project.start_date)}</span></span>
          <span>Target: <span className="text-sand">{dateLabel(project.planned_completion)}</span></span>
          <span>Expected: <span className="text-sand">{dateLabel(delay.expectedCompletion)}</span></span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Team</h2>
          {(!members || members.length === 0) ? (
            <div className="text-sm text-muted">No one assigned yet. Assign from Users.</div>
          ) : (
            <div className="space-y-2">
              {members.map((m: any, i: any) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-sandlight">{(m as any).profiles?.full_name ?? "—"}</span>
                  <Badge tone="brand">{m.role_key.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-ivory">Recent tasks</h2>
          {(!tasks || tasks.length === 0) ? (
            <div className="text-sm text-muted">No tasks created yet.</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-sm text-sandlight">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Construction stages</h2>
        {(!stages || stages.length === 0) ? (
          <EmptyState title="No stages yet" hint="Stages are created automatically when a lead is converted to a project." />
        ) : (
          <div className="space-y-2.5">
            {stages.map((s: any) => (
              <div key={s.seq}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-sandlight">{s.seq}. {s.name}</span>
                  <StatusBadge status={s.status} />
                </div>
                <ProgressBar value={s.progress} tone={s.status === "completed" ? "ok" : "brand"} height={6} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Documents</h2>
        {(!documents || documents.length === 0) ? (
          <EmptyState title="No documents uploaded yet" hint="Agreements, approvals and other project documents will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {documents.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{d.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    {d.category && <Badge tone={CATEGORY_TONE[d.category] ?? "muted"}>{d.category}</Badge>}
                    {d.client_visible && <Badge tone="ok">Client visible</Badge>}
                    <span>{dateLabel(d.uploaded_at)}</span>
                  </div>
                </div>
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-brand">
                  View / download →
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DocumentUploadForm projectId={project.id} />
    </div>
  );
}
