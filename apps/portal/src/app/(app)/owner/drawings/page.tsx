import { createClient } from "@buildhaus/database";
import { Card, StatusBadge, SubmitButton } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { requestRevision, sendToClient, approveDrawing, approveForConstruction } from "./actions";

export default async function OwnerDrawings() {
  const supabase = createClient();

  const { data: drawings } = await supabase
    .from("drawings")
    // drawing_revisions has two FKs to profiles (uploaded_by, reviewed_by),
    // so a bare embedded profiles(...) is ambiguous and PostgREST rejects
    // the whole query on a real Supabase project ("more than one
    // relationship was found") — Demo Mode's mock has no such check, so
    // this never surfaced. The profile name was never actually rendered
    // anywhere on this page (dead select), so dropped rather than guessing
    // which FK it should have disambiguated to.
    .select("id,drawing_no,title,discipline,floor,status,current_revision,updated_at,projects(id,code,name),drawing_revisions(revision_no,status,notes,file_url,created_at)")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Drawings</h1>
        <p className="text-sm text-muted">Review architect submissions, send to client, and approve for construction.</p>
      </div>

      {(!drawings || drawings.length === 0) ? (
        <EmptyState title="No drawings yet" hint="Drawings appear here once an architect uploads one." />
      ) : (
        <div className="space-y-4">
          {drawings.map((d: any) => {
            const revisions = [...(d.drawing_revisions ?? [])].sort((a: any, b: any) => a.revision_no - b.revision_no);
            const current = revisions.find((r: any) => r.revision_no === d.current_revision) ?? revisions[revisions.length - 1];

            return (
              <Card key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ivory">{d.drawing_no} · {d.title}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="text-xs text-muted">
                      {d.projects?.name ?? "—"} · {d.discipline?.replace(/_/g, " ")} · {d.floor ?? "—"} · Rev {d.current_revision} · updated {dateLabel(d.updated_at)}
                    </div>
                  </div>
                </div>

                {current && (
                  <div className="mt-2 text-sm text-muted">
                    File: <a href={current.file_url} className="text-brand underline underline-offset-2" target="_blank" rel="noreferrer">{current.file_url}</a>
                    {current.notes && <div className="mt-0.5 text-sand">{current.notes}</div>}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {d.status === "owner_review" && (
                    <form action={sendToClient.bind(null, d.id)}>
                      <SubmitButton variant="outline">Send to client</SubmitButton>
                    </form>
                  )}
                  {d.status === "client_review" && (
                    <form action={approveDrawing.bind(null, d.id)}>
                      <SubmitButton>Approve</SubmitButton>
                    </form>
                  )}
                  {d.status === "approved" && (
                    <form action={approveForConstruction.bind(null, d.id)}>
                      <SubmitButton pendingLabel="Approving…">Approve for construction</SubmitButton>
                    </form>
                  )}
                  {d.status === "approved_for_construction" && (
                    <span className="text-xs text-ok">Locked — approved for construction. Older revisions marked superseded.</span>
                  )}
                  {(d.status === "draft" || d.status === "revision_requested") && (
                    <span className="text-xs text-muted">Waiting on the architect.</span>
                  )}

                  {["owner_review", "client_review"].includes(d.status) && (
                    <form action={requestRevision.bind(null, d.id)} className="flex flex-1 items-end gap-2">
                      <div className="flex-1">
                        <Textarea name="notes" placeholder="What needs to change?" className="min-h-[40px]" />
                      </div>
                      <SubmitButton variant="danger">Request revision</SubmitButton>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
