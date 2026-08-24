import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

export default async function EngineerDrawings() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  const { data: drawings } = await supabase
    .from("drawings")
    .select("id,drawing_no,title,discipline,floor,status,current_revision,updated_at,projects(code,name),drawing_revisions(revision_no,status,file_url,notes,created_at)")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Drawings</h1>
        <p className="text-sm text-muted">Always the current, latest revision for each drawing on your projects.</p>
      </div>

      {(!drawings || drawings.length === 0) ? (
        <EmptyState title="No drawings yet" hint={projectIds.length === 0 ? "You aren't assigned to any projects yet." : "No drawings have been issued for your projects yet."} />
      ) : (
        <div className="space-y-4">
          {drawings.map((d: any) => {
            const revisions: any[] = d.drawing_revisions ?? [];
            const current = revisions.find((r) => r.revision_no === d.current_revision);
            const older = revisions.filter((r) => r.revision_no !== d.current_revision).sort((a, b) => b.revision_no - a.revision_no);
            return (
              <Card key={d.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-ivory">{d.drawing_no} · {d.title}</div>
                    <div className="text-xs text-muted">{d.projects?.code} · {d.projects?.name} · {d.discipline?.replace(/_/g, " ")} · {d.floor ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">Rev {d.current_revision}</Badge>
                    <StatusBadge status={d.status} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {current?.file_url ? (
                    <a href={current.file_url} target="_blank" rel="noreferrer" className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20">
                      View current revision
                    </a>
                  ) : (
                    <span className="text-xs text-muted">No file uploaded yet for the current revision.</span>
                  )}
                  <span className="text-xs text-muted">Updated {dateLabel(d.updated_at)}</span>
                </div>

                {older.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-sand">Revision history ({older.length} older)</summary>
                    <div className="mt-2 space-y-1.5">
                      {older.map((r) => (
                        <div key={r.revision_no} className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs">
                          <span className="text-muted">Rev {r.revision_no} · {r.notes || "—"}</span>
                          <Badge tone="danger">Superseded — Do Not Use</Badge>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
