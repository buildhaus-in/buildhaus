import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ProgressBar, StatCard } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { sqft, dateLabel } from "@buildhaus/utils";
import { assessDelay, riskTone } from "@buildhaus/utils";
import { notFound } from "next/navigation";

export default async function EngineerProjectDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();

  // No RLS in Demo Mode — confirm this engineer is actually assigned before
  // showing anything (mirrors what a real RLS policy would enforce).
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", params.id)
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer")
    .maybeSingle();
  if (!membership) notFound();

  // Financial columns (contract_value, estimated_cost) deliberately omitted.
  const { data: project } = await supabase
    .from("projects")
    .select("id,code,name,site_address,project_type,status,progress,client_visible_progress,builtup_area_sqft,floors,current_stage,planned_completion,start_date")
    .eq("id", params.id).maybeSingle();
  if (!project) notFound();

  const delay = assessDelay({
    startDate: project.start_date,
    plannedCompletion: project.planned_completion,
    actualProgress: project.progress,
  });
  const tone = riskTone(delay.risk);

  const [{ data: stages }, { data: members }, { data: myTasks }] = await Promise.all([
    supabase.from("project_stages").select("seq,name,status,progress").eq("project_id", project.id).order("seq"),
    // project_members has two FKs to profiles (profile_id, assigned_by) —
    // see the same fix's comment in owner/projects/[id]/page.tsx for the
    // full explanation.
    supabase.from("project_members").select("role_key, profiles!profile_id(full_name)").eq("project_id", project.id),
    supabase.from("tasks").select("id,title,status,due_date").eq("project_id", project.id).eq("site_engineer_id", ctx?.userId ?? "").limit(8),
  ]);

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
        <StatCard label="Built-up" value={sqft(project.builtup_area_sqft)} tone="sand" sub={`${project.floors ?? "—"} floors`} />
        <StatCard label="Current stage" value={project.current_stage ?? "—"} tone="brand" />
        <StatCard label="Delay risk" value={delay.risk} tone={tone === "danger" || tone === "warn" ? tone : "ok"} />
        <StatCard label="Days remaining" value={delay.daysRemaining ?? "—"} tone="sand" />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sandlight">Progress &amp; schedule</span>
          <Badge tone={tone}>{delay.risk}</Badge>
        </div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">Actual progress</span>
          <span className="text-ink">{delay.actualProgress}%</span>
        </div>
        <ProgressBar value={delay.actualProgress} height={8} tone={tone === "danger" ? "danger" : tone === "warn" ? "warn" : "brand"} />
        <div className="mb-1 mt-3 flex items-center justify-between text-xs">
          <span className="text-muted">Published to client</span>
          <span className="text-ink">{project.client_visible_progress ?? 0}%</span>
        </div>
        <ProgressBar value={project.client_visible_progress ?? 0} height={8} tone="ok" />
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
          <span>Start: <span className="text-sand">{dateLabel(project.start_date)}</span></span>
          <span>Target: <span className="text-sand">{dateLabel(project.planned_completion)}</span></span>
          <span>Expected: <span className="text-sand">{dateLabel(delay.expectedCompletion)}</span></span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Team</h2>
          {(!members || members.length === 0) ? (
            <div className="text-sm text-muted">No one assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {members.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-sandlight">{(m as any).profiles?.full_name ?? "—"}</span>
                  <Badge tone="brand">{m.role_key.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-ivory">My tasks here</h2>
          {(!myTasks || myTasks.length === 0) ? (
            <div className="text-sm text-muted">No tasks assigned to you on this project yet.</div>
          ) : (
            <div className="space-y-2">
              {myTasks.map((t: any) => (
                <Link key={t.id} href={`/engineer/tasks/${t.id}`} className="flex items-center justify-between rounded-lg px-1 py-1 hover:bg-surface">
                  <span className="text-sm text-sandlight">{t.title}</span>
                  <StatusBadge status={t.status} />
                </Link>
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
    </div>
  );
}
