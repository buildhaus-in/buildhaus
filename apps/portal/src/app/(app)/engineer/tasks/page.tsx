import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ProgressBar } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { clsx } from "clsx";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "submitted", label: "Submitted" },
];

export default async function EngineerTasks({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();
  const activeStatus = searchParams.status ?? "";

  let query = supabase
    .from("tasks")
    .select("id,title,status,priority,progress,due_date,start_date,floor,zone,projects(name,code)")
    .eq("site_engineer_id", ctx?.userId ?? "")
    .order("due_date", { ascending: true });
  if (activeStatus) query = query.eq("status", activeStatus);

  const { data: tasks } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Tasks</h1>
        <p className="text-sm text-muted">Everything assigned to you across your projects.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key ? `/engineer/tasks?status=${tab.key}` : "/engineer/tasks"}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              activeStatus === tab.key ? "border-brand bg-brand text-white" : "border-border bg-surface text-sand hover:border-brand/50"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState title="No tasks here" hint="Tasks assigned to you by the Owner will show up here." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t: any) => (
            <Link key={t.id} href={`/engineer/tasks/${t.id}`}>
              <Card className="transition hover:border-brand/50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-ivory">{t.title}</div>
                    <div className="text-xs text-muted">{t.projects?.code} · {t.projects?.name} · {t.floor ?? "—"} {t.zone ? `· ${t.zone}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warn" : "muted"}>{t.priority}</Badge>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={t.progress} height={6} />
                </div>
                <div className="mt-1 text-xs text-muted">
                  Due {dateLabel(t.due_date)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
