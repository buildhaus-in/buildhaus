import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, StatCard, StatusBadge, ProgressBar } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import Link from "next/link";

export default async function EngineerToday() {
  const supabase = createClient();
  const ctx = await getUserContext();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: myProjectRows }, { data: todaysTasks }, { count: openTasks }, { count: draftReports }] =
    await Promise.all([
      // Explicit project_members filter — RLS enforces this in production,
      // but Demo Mode has no RLS, and filtering here is correct either way.
      supabase.from("project_members")
        .select("projects(id,code,name,status,progress,current_stage)")
        .eq("profile_id", ctx?.userId ?? "").eq("role_key", "site_engineer"),
      supabase.from("tasks")
        .select("id,title,project_id,status,priority,due_date,progress")
        .eq("site_engineer_id", ctx?.userId ?? "")
        .in("status", ["assigned", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(8),
      supabase.from("tasks").select("*", { count: "exact", head: true })
        .eq("site_engineer_id", ctx?.userId ?? "").in("status", ["assigned", "in_progress"]),
      supabase.from("daily_reports").select("*", { count: "exact", head: true })
        .eq("engineer_id", ctx?.userId ?? "").eq("report_date", today).eq("status", "draft"),
    ]);

  const myProjects = (myProjectRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Today</h1>
        <p className="text-sm text-muted">{dateLabel(today)} · your assigned work</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="My Projects" value={myProjects?.length ?? 0} tone="brand" />
        <StatCard label="Open Tasks" value={openTasks ?? 0} tone="warn" />
        <StatCard label="Today's Report" value={(draftReports ?? 0) > 0 ? "Draft" : "—"} tone={(draftReports ?? 0) > 0 ? "warn" : "sand"} sub="Submit before leaving site" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-ivory">My tasks</h2>
          <Link href="/engineer/report" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">+ Daily report</Link>
        </div>
        {(!todaysTasks || todaysTasks.length === 0) ? (
          <EmptyState title="No open tasks" hint="Assigned tasks from the Owner will show up here." />
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((t: any) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-sandlight">{t.title}</div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-2"><ProgressBar value={t.progress} /></div>
                <div className="mt-1 text-xs text-muted">Due {dateLabel(t.due_date)} · {t.priority} priority</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">My projects</h2>
        {(!myProjects || myProjects.length === 0) ? (
          <div className="text-sm text-muted">You haven&apos;t been assigned to a project yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {myProjects.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-sandlight">{p.name}</div>
                  <div className="text-xs text-muted">{p.code} · {p.current_stage ?? "—"}</div>
                </div>
                <span className="text-xs text-sand">{p.progress}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
