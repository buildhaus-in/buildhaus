import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ProgressBar, Button } from "@buildhaus/ui";
import { Input, Textarea } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { notFound } from "next/navigation";
import {
  acceptTask, startTask, updateTaskProgress, markTaskBlocked,
  resumeTask, submitTaskForReview, toggleChecklistItem, addTaskComment,
} from "../actions";

export default async function TaskDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: task } = await supabase
    .from("tasks")
    .select("*, projects(id,code,name,current_stage)")
    .eq("id", params.id)
    .maybeSingle();
  if (!task || task.site_engineer_id !== ctx?.userId) notFound();

  const { data: comments } = await supabase
    .from("task_comments")
    .select("id,body,created_at,profiles(full_name)")
    .eq("task_id", task.id)
    .order("created_at", { ascending: true });

  const checklist: { label: string; done: boolean }[] = Array.isArray(task.checklist) ? task.checklist : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{task.projects?.code} · {task.projects?.name}</div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-ivory">{task.title}</h1>
          <StatusBadge status={task.status} />
          <Badge tone={task.priority === "high" ? "danger" : task.priority === "medium" ? "warn" : "muted"}>{task.priority} priority</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{task.description}</p>
      </div>

      {task.status === "blocked" && task.blocker_reason && (
        <div className="rounded-xl2 border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <div className="font-semibold">Blocked</div>
          <div className="mt-1">{task.blocker_reason}</div>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Stage</div><div className="text-sm text-ink">{task.stage ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Floor</div><div className="text-sm text-ink">{task.floor ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Zone</div><div className="text-sm text-ink">{task.zone ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Drawing ref</div><div className="text-sm text-ink">{task.drawing_ref ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Dimensions</div><div className="text-sm text-ink">{task.dimensions ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Start date</div><div className="text-sm text-ink">{dateLabel(task.start_date)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Due date</div><div className="text-sm text-ink">{dateLabel(task.due_date)}</div></div>
        </div>
        {task.owner_instructions && (
          <div className="mt-4 rounded-lg border border-brand/30 bg-brand/10 p-3 text-sm text-sandlight">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-brand">Owner instructions</div>
            {task.owner_instructions}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sandlight">Progress</span>
          <span className="text-ink">{task.progress}%</span>
        </div>
        <ProgressBar value={task.progress} height={8} />
        <form action={updateTaskProgress} className="mt-4 flex items-end gap-2">
          <input type="hidden" name="task_id" value={task.id} />
          <Input label="Update progress (%)" name="progress" type="number" min={0} max={100} defaultValue={task.progress} className="max-w-[140px]" />
          <Button type="submit" variant="outline">Save progress</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Checklist</h2>
        {checklist.length === 0 ? (
          <div className="text-sm text-muted">No checklist items for this task.</div>
        ) : (
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <form key={i} action={toggleChecklistItem} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="index" value={i} />
                <button type="submit" className="flex items-center gap-3 text-left" aria-label={item.done ? "Mark incomplete" : "Mark complete"}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${item.done ? "border-ok bg-ok text-white" : "border-border text-transparent"}`}>✓</span>
                  <span className={`text-sm ${item.done ? "text-muted line-through" : "text-sandlight"}`}>{item.label}</span>
                </button>
              </form>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {task.status === "assigned" && !task.accepted_at && (
            <form action={acceptTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <Button type="submit" variant="outline">Accept task</Button>
            </form>
          )}
          {task.status === "assigned" && (
            <form action={startTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <Button type="submit">Start work</Button>
            </form>
          )}
          {task.status === "blocked" && (
            <form action={resumeTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <Button type="submit">Resume work</Button>
            </form>
          )}
          {task.status === "in_progress" && (
            <form action={submitTaskForReview}>
              <input type="hidden" name="task_id" value={task.id} />
              <Button type="submit">Submit for Owner review</Button>
            </form>
          )}
        </div>

        {(task.status === "assigned" || task.status === "in_progress") && (
          <form action={markTaskBlocked} className="mt-4 flex items-end gap-2">
            <input type="hidden" name="task_id" value={task.id} />
            <Textarea label="Mark blocked — reason" name="blocker_reason" className="min-h-[44px] flex-1" placeholder="What's blocking this task?" />
            <Button type="submit" variant="danger">Mark blocked</Button>
          </form>
        )}
        {task.status === "submitted" && (
          <div className="mt-3 text-sm text-muted">Submitted — awaiting Owner review.</div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Comments</h2>
        <div className="space-y-3">
          {(!comments || comments.length === 0) ? (
            <div className="text-sm text-muted">No comments yet.</div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-semibold text-sandlight">{c.profiles?.full_name ?? "—"}</span>
                  <span>{dateLabel(c.created_at)}</span>
                </div>
                <div className="mt-1 text-sm text-ink">{c.body}</div>
              </div>
            ))
          )}
        </div>
        <form action={addTaskComment} className="mt-4 flex items-end gap-2">
          <input type="hidden" name="task_id" value={task.id} />
          <Textarea label="Add a comment" name="body" className="min-h-[44px] flex-1" placeholder="Update the Owner on this task…" />
          <Button type="submit" variant="outline">Post</Button>
        </form>
      </Card>
    </div>
  );
}
