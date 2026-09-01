import { createClient } from "@buildhaus/database";
import { Card, Badge, StatCard, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Select, Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { createInspection, passInspection, failInspection, closeInspection } from "./actions";

const STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  pending: "warn", passed: "ok", passed_with_observation: "ok",
  failed: "danger", correction_pending: "danger", closed: "muted",
};

export default async function QualityPage() {
  const supabase = createClient();

  const [{ data: inspections }, { data: projects }, { data: checklists }] = await Promise.all([
    supabase.from("inspections")
      .select("id,stage,status,notes,inspected_at,project_id,projects(id,code,name),profiles(full_name)")
      .order("inspected_at", { ascending: false }),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
    supabase.from("quality_checklists").select("id,name"),
  ]);

  const list = inspections ?? [];
  const open = list.filter((i: any) => ["pending", "failed", "correction_pending"].includes(i.status));
  const history = list.filter((i: any) => !["pending", "failed", "correction_pending"].includes(i.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Quality Control</h1>
        <p className="text-sm text-muted">Stage inspections across all sites — pass, fail, or close out.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Open issues" value={open.length} tone={open.length ? "danger" : "ok"} />
        <StatCard label="Total inspections" value={list.length} tone="brand" />
      </div>

      {(projects ?? []).length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Log an inspection</h2>
          <ActionForm action={createInspection} successMessage="Inspection logged." className="grid gap-x-4 sm:grid-cols-3">
            <Select label="Project" name="project_id">
              {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </Select>
            <Select label="Checklist" name="checklist_id" defaultValue="">
              <option value="">— None —</option>
              {(checklists ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Notes" name="notes" placeholder="What was inspected?" />
            <div className="sm:col-span-3"><SubmitButton>Log inspection</SubmitButton></div>
          </ActionForm>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Open issues</h2>
        {open.length === 0 ? (
          <EmptyState title="No open quality issues" hint="Inspections you log will appear here until passed or closed." />
        ) : (
          <div className="space-y-3">
            {open.map((i: any) => (
              <div key={i.id} className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-sandlight">{i.projects?.name ?? "—"}{i.stage ? ` · ${i.stage}` : ""}</div>
                    <div className="text-xs text-muted">Inspected by {i.profiles?.full_name ?? "—"} · {dateLabel(i.inspected_at)}</div>
                  </div>
                  <Badge tone={STATUS_TONE[i.status] ?? "muted"}>{i.status.replace(/_/g, " ")}</Badge>
                </div>
                {i.notes && <p className="mt-2 text-sm text-sand">{i.notes}</p>}
                <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-border pt-3">
                  <form action={passInspection}>
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton>Pass</SubmitButton>
                  </form>
                  <form action={failInspection} className="flex-1 min-w-[220px] space-y-2">
                    <input type="hidden" name="id" value={i.id} />
                    <Textarea name="notes" placeholder="What failed and what needs fixing?" className="min-h-[40px]" />
                    <SubmitButton variant="danger">Fail — needs correction</SubmitButton>
                  </form>
                  <form action={closeInspection}>
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton variant="outline">Close</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">History</h2>
        {history.length === 0 ? (
          <div className="text-sm text-muted">Passed and closed inspections will show up here.</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{i.projects?.name ?? "—"}{i.stage ? ` · ${i.stage}` : ""}</div>
                  <div className="text-xs text-muted">{dateLabel(i.inspected_at)}</div>
                </div>
                <Badge tone={STATUS_TONE[i.status] ?? "muted"}>{i.status.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
