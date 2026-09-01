import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, SubmitButton } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { approveApproval, rejectApproval } from "./actions";

const STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  approved: "ok", sent_to_client: "warn", rejected: "danger",
};

export default async function ClientApprovals() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase.from("projects").select("id,code,name").eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Approvals</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Drawings and selections sent for your approval will appear here."
        />
      </div>
    );
  }

  const { data: approvals } = await supabase
    .from("client_approvals")
    .select("id,type,ref_id,title,status,description,sent_at,decided_at,client_response")
    .eq("project_id", project.id)
    .order("sent_at", { ascending: false });

  const list = approvals ?? [];

  // Read-only drawing context for type === "drawing" approvals — title and
  // current revision only, no cost/supplier data lives on this table anyway.
  const drawingIds = list.filter((a: any) => a.type === "drawing" && a.ref_id).map((a: any) => a.ref_id);
  const drawingsById: Record<string, any> = {};
  for (const id of drawingIds) {
    const { data: dwg } = await supabase
      .from("drawings").select("id,drawing_no,title,status,current_revision").eq("id", id).maybeSingle();
    if (dwg) drawingsById[id] = dwg;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Approvals</h1>
        <p className="text-sm text-muted">Drawings and selections needing your review.</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you right now"
          hint="Drawings and material selections sent for your approval will show up here."
        />
      ) : (
        <div className="space-y-4">
          {list.map((a: any) => {
            const dwg = a.ref_id ? drawingsById[a.ref_id] : null;
            return (
              <Card key={a.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{a.type}</div>
                    <div className="font-semibold text-sandlight">{a.title}</div>
                  </div>
                  <Badge tone={STATUS_TONE[a.status] ?? "muted"}>{a.status.replace(/_/g, " ")}</Badge>
                </div>

                {a.description && <p className="mb-2 text-sm text-muted">{a.description}</p>}

                {dwg && (
                  <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
                    Drawing <span className="text-sand">{dwg.drawing_no}</span> — {dwg.title} · Rev {dwg.current_revision} · {dwg.status.replace(/_/g, " ")}
                  </div>
                )}

                <div className="text-xs text-muted">
                  Sent {dateLabel(a.sent_at)}
                  {a.decided_at && <> · Decided {dateLabel(a.decided_at)}</>}
                </div>

                {a.status === "rejected" && a.client_response && (
                  <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    Your feedback: {a.client_response}
                  </div>
                )}

                {a.status === "sent_to_client" && (
                  <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-border pt-4">
                    <form action={approveApproval}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton variant="primary">Approve</SubmitButton>
                    </form>
                    <form action={rejectApproval} className="flex-1 min-w-[220px] space-y-2">
                      <input type="hidden" name="id" value={a.id} />
                      <Textarea name="reason" label="Reason (required to reject)" placeholder="Tell us what needs to change…" />
                      <SubmitButton variant="danger">Reject</SubmitButton>
                    </form>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
