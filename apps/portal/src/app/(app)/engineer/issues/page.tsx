import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { createSiteIssue } from "./actions";

const CATEGORIES = ["quality", "safety", "material", "labour", "other"];
const SEVERITIES = ["low", "medium", "high"];

export default async function EngineerIssues() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  const { data: issues } = await supabase
    .from("site_issues")
    .select("id,title,description,category,severity,status,resolution_notes,created_at,resolved_at,projects(code,name)")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Site issues</h1>
        <p className="text-sm text-muted">Raise and track quality, safety or material issues on your projects.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Raise an issue</h2>
        {projects.length === 0 ? (
          <div className="text-sm text-muted">You aren&apos;t assigned to any projects yet.</div>
        ) : (
          <ActionForm action={createSiteIssue} successMessage="Issue raised." className="space-y-3">
            <div className="grid gap-x-4 sm:grid-cols-3">
              <Select label="Project" name="project_id" defaultValue={projects[0].id}>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </Select>
              <Select label="Category" name="category" defaultValue="quality">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select label="Severity" name="severity" defaultValue="medium">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <Input label="Title" name="title" placeholder="Short summary of the issue" />
            <Textarea label="Description" name="description" placeholder="What happened, where, and any immediate action taken…" />
            <SubmitButton>Raise issue</SubmitButton>
          </ActionForm>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-bold text-ivory">Issue log</h2>
        {(!issues || issues.length === 0) ? (
          <EmptyState title="No issues raised" hint="Issues you raise for these projects will show up here." />
        ) : (
          <div className="space-y-3">
            {issues.map((i: any) => (
              <Card key={i.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-ivory">{i.title}</div>
                    <div className="text-xs text-muted">{i.projects?.code} · {i.projects?.name} · {dateLabel(i.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={i.severity === "high" ? "danger" : i.severity === "medium" ? "warn" : "muted"}>{i.severity}</Badge>
                    <Badge tone="muted">{i.category}</Badge>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
                {i.description && <div className="mt-2 text-sm text-sandlight">{i.description}</div>}
                {i.status === "resolved" && i.resolution_notes && (
                  <div className="mt-2 rounded-lg border border-ok/30 bg-ok/10 p-2 text-xs text-ok">
                    Resolved {dateLabel(i.resolved_at)} — {i.resolution_notes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
