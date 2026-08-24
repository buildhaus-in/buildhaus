import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button, StatusBadge, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { submitToOwner } from "../actions";
import { RevisionForm } from "./RevisionForm";

export default async function DrawingDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: drawing } = await supabase
    .from("drawings")
    .select("id,project_id,drawing_no,title,discipline,floor,status,current_revision,issue_date,updated_at,projects(id,code,name),drawing_revisions(id,revision_no,status,notes,file_url,uploaded_by,created_at,profiles(full_name))")
    .eq("id", params.id)
    .maybeSingle();
  if (!drawing) notFound();

  // No RLS in Demo Mode — confirm this drawing belongs to a project the
  // signed-in architect is actually assigned to before rendering it.
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", drawing.project_id)
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "architect")
    .maybeSingle();
  if (!membership) notFound();

  const revisions = [...(drawing.drawing_revisions ?? [])].sort((a: any, b: any) => a.revision_no - b.revision_no);
  const currentRevision = revisions.find((r: any) => r.revision_no === drawing.current_revision) ?? null;
  const newestRevision = revisions[revisions.length - 1] ?? null;
  // A revision that hasn't been advanced past "draft" yet is the one waiting
  // on the architect to submit it to the Owner.
  const pendingSubmitRevision = newestRevision && newestRevision.status === "draft" ? newestRevision : null;

  const { data: clientApprovals } = await supabase
    .from("client_approvals")
    .select("*")
    .eq("ref_id", drawing.id)
    .eq("type", "drawing")
    .order("sent_at", { ascending: false });

  const canRevise = drawing.status !== "approved_for_construction";
  const isLockedForOwnerOrClient = ["owner_review", "client_review", "approved"].includes(drawing.status);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-brand">
          <Link href="/architect/drawings" className="hover:underline">Drawings</Link>
          <span>/</span>
          <span>{drawing.drawing_no}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-ivory">{drawing.drawing_no} · {drawing.title}</h1>
          <StatusBadge status={drawing.status} />
        </div>
        <p className="text-sm text-muted">
          {(drawing.projects as any)?.name ?? "—"} · {drawing.discipline?.replace(/_/g, " ")} · {drawing.floor ?? "—"} · issued {dateLabel(drawing.issue_date)}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Current revision</h2>
        {currentRevision ? (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sandlight">Rev {currentRevision.revision_no}</span>
              <StatusBadge status={currentRevision.status} />
            </div>
            <div className="text-muted">
              File: <a href={currentRevision.file_url} className="text-brand underline underline-offset-2" target="_blank" rel="noreferrer">{currentRevision.file_url}</a>
            </div>
            {currentRevision.notes && <div className="text-muted">Notes: {currentRevision.notes}</div>}
            <div className="text-xs text-muted">
              Uploaded by {(currentRevision.profiles as any)?.full_name ?? "—"} on {dateLabel(currentRevision.created_at)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">No revision published yet — still at revision 0 draft.</div>
        )}
      </Card>

      {isLockedForOwnerOrClient && (
        <Card className="border-warn/30 bg-warn/5">
          <div className="text-sm font-semibold text-sandlight">Awaiting Owner and client approval</div>
          <p className="mt-1 text-xs text-muted">
            This drawing is with the Owner/client for review. Only they can move it to approved or approved for construction —
            an architect cannot approve their own final drawing.
          </p>
        </Card>
      )}

      {pendingSubmitRevision && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-sandlight">
                Revision {pendingSubmitRevision.revision_no} is drafted but not yet sent
              </div>
              <p className="text-xs text-muted">Submitting will move this drawing to Owner Review.</p>
            </div>
            <form action={submitToOwner.bind(null, drawing.id, pendingSubmitRevision.id)}>
              <Button type="submit">Submit to Owner</Button>
            </form>
          </div>
        </Card>
      )}

      {canRevise && (
        <RevisionForm
          drawingId={drawing.id}
          drawingNo={drawing.drawing_no}
          nextRevisionNo={(drawing.current_revision ?? 0) + 1}
          isRevisionRequested={drawing.status === "revision_requested"}
          currentRevisionNo={drawing.current_revision ?? null}
        />
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Revision history</h2>
        {revisions.length === 0 ? (
          <EmptyState title="No revisions yet" />
        ) : (
          <div className="space-y-3">
            {revisions.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-sandlight">Rev {r.revision_no}</span>
                    <StatusBadge status={r.status} />
                    {r.status === "superseded" && <Badge tone="danger">Superseded — Do Not Use</Badge>}
                  </div>
                  <span className="text-xs text-muted">{dateLabel(r.created_at)}</span>
                </div>
                <div className="mt-1 text-sm text-muted">
                  File: <a href={r.file_url} className="text-brand underline underline-offset-2" target="_blank" rel="noreferrer">{r.file_url}</a>
                </div>
                {r.notes && <div className="mt-1 text-sm text-sand">{r.notes}</div>}
                <div className="mt-1 text-xs text-muted">Uploaded by {(r.profiles as any)?.full_name ?? "—"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Client feedback</h2>
        {(!clientApprovals || clientApprovals.length === 0) ? (
          <EmptyState title="No client approval requests yet for this drawing" hint="These appear once the Owner sends this drawing to the client for review." />
        ) : (
          <div className="space-y-3">
            {clientApprovals.map((ca: any) => (
              <div key={ca.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-sandlight">{ca.title}</span>
                  <StatusBadge status={ca.status} />
                </div>
                {ca.description && <div className="mt-1 text-sm text-sand">{ca.description}</div>}
                <div className="mt-1 text-xs text-muted">
                  Sent {dateLabel(ca.sent_at)}{ca.decided_at ? ` · Decided ${dateLabel(ca.decided_at)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
