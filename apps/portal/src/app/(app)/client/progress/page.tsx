import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, ProgressBar, StatusBadge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

export default async function ClientProgress() {
  const supabase = createClient();
  const ctx = await getUserContext();

  // RLS enforces this in production; filtered explicitly here too since
  // Demo Mode has no RLS — same lookup as client/page.tsx.
  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase
        .from("projects")
        .select("id,code,name,client_visible_progress,current_stage,planned_completion")
        .eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Progress</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Stage-by-stage progress will appear here once your project is active."
        />
      </div>
    );
  }

  const { data: stages } = await supabase
    .from("project_stages")
    .select("seq,name,status,progress,planned_start,planned_finish")
    .eq("project_id", project.id).eq("client_visible", true)
    .order("seq", { ascending: true });

  const list = stages ?? [];
  const completed = list.filter((s: any) => s.status === "completed");
  const current = list.find((s: any) => s.status === "in_progress");
  const publishedProgress = project.client_visible_progress ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Progress</h1>
        <p className="text-sm text-muted">{project.name}</p>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sandlight">Overall progress</span>
          <span className="text-sm font-bold text-brand">{publishedProgress}%</span>
        </div>
        <ProgressBar value={publishedProgress} height={10} />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
          <span>Current stage: <span className="text-sand">{project.current_stage ?? "—"}</span></span>
          <span>Target handover: <span className="text-sand">{dateLabel(project.planned_completion)}</span></span>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Stage-by-stage breakdown</h2>
        {list.length === 0 ? (
          <div className="text-sm text-muted">Stage-by-stage progress will appear here as work advances.</div>
        ) : (
          <div className="space-y-4">
            {list.map((s: any) => (
              <div key={s.seq}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-sandlight">
                    <span className="mr-2 text-xs text-muted">{s.seq}.</span>
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {s.status === "in_progress" && <span className="text-xs text-muted">{s.progress}%</span>}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
                <ProgressBar value={s.progress} tone={s.status === "completed" ? "ok" : "brand"} />
                {(s.planned_start || s.planned_finish) && (
                  <div className="mt-1 text-xs text-muted">
                    Planned: {dateLabel(s.planned_start)} – {dateLabel(s.planned_finish)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 font-bold text-ivory">Timeline</h2>
        <p className="mb-3 text-sm text-muted">
          {completed.length} of {list.length} stages completed
          {current ? <> — currently on <span className="text-sand">{current.name}</span> ({current.progress}%)</> : null}.
        </p>
        {completed.length === 0 ? (
          <div className="text-sm text-muted">Completed stages will be listed here as they wrap up.</div>
        ) : (
          <ol className="space-y-2 border-l border-border pl-4">
            {[...completed].reverse().map((s) => (
              <li key={s.seq} className="relative text-sm text-sandlight">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ok" />
                {s.name} <span className="text-xs text-muted">— completed</span>
              </li>
            ))}
            {current && (
              <li className="relative text-sm text-sandlight">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand" />
                {current.name} <span className="text-xs text-muted">— in progress ({current.progress}%)</span>
              </li>
            )}
          </ol>
        )}
      </Card>
    </div>
  );
}
