import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Button, Badge, StatCard } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { approveMaterialRequest, fulfillMaterialRequest, rejectMaterialRequest } from "./actions";

const PRIORITY_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  low: "muted", medium: "warn", high: "danger",
};

export default async function MaterialsPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("material_requests")
    .select("id,project_id,status,priority,needed_by,notes,owner_notes,created_at,projects(id,code,name),profiles(full_name),material_request_items(id,material_name,quantity,unit)")
    .order("created_at", { ascending: false });

  const list = requests ?? [];
  const requested = list.filter((r: any) => r.status === "requested");
  const approved = list.filter((r: any) => r.status === "approved");
  const history = list.filter((r: any) => r.status === "fulfilled" || r.status === "rejected");

  function RequestCard({ r, action }: { r: any; action: "approve" | "fulfill" }) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-sandlight">{r.projects?.name ?? "—"}</div>
            <div className="text-xs text-muted">Requested by {r.profiles?.full_name ?? "—"} · needed by {dateLabel(r.needed_by)}</div>
          </div>
          <Badge tone={PRIORITY_TONE[r.priority] ?? "muted"}>{r.priority} priority</Badge>
        </div>
        {r.material_request_items?.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-sand">
            {r.material_request_items.map((it: any) => (
              <li key={it.id}>• {it.material_name} — {it.quantity} {it.unit}</li>
            ))}
          </ul>
        )}
        {r.notes && <p className="mt-2 text-xs text-muted">{r.notes}</p>}
        <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-border pt-3">
          {action === "approve" ? (
            <form action={approveMaterialRequest}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit">Approve</Button>
            </form>
          ) : (
            <form action={fulfillMaterialRequest}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit">Mark fulfilled</Button>
            </form>
          )}
          <form action={rejectMaterialRequest} className="flex-1 min-w-[220px] space-y-2">
            <input type="hidden" name="id" value={r.id} />
            <Textarea name="owner_notes" placeholder="Reason for rejecting (optional)" className="min-h-[40px]" />
            <Button type="submit" variant="danger">Reject</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Materials &amp; Procurement</h1>
          <p className="text-sm text-muted">Review site material requests and track them through to fulfilment.</p>
        </div>
        <Link href="/owner/suppliers"><Button variant="outline">Suppliers →</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Awaiting review" value={requested.length} tone={requested.length ? "danger" : "ok"} />
        <StatCard label="Approved, not yet fulfilled" value={approved.length} tone="warn" />
        <StatCard label="Fulfilled / rejected" value={history.length} tone="sand" />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Awaiting your review</h2>
        {requested.length === 0 ? (
          <EmptyState title="No material requests waiting" hint="Requests raised by site engineers will appear here." />
        ) : (
          <div className="space-y-3">
            {requested.map((r: any) => <RequestCard key={r.id} r={r} action="approve" />)}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Approved — awaiting fulfilment</h2>
        {approved.length === 0 ? (
          <div className="text-sm text-muted">Nothing approved and pending fulfilment right now.</div>
        ) : (
          <div className="space-y-3">
            {approved.map((r: any) => <RequestCard key={r.id} r={r} action="fulfill" />)}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">History</h2>
        {history.length === 0 ? (
          <div className="text-sm text-muted">Fulfilled and rejected requests will show up here.</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{r.projects?.name ?? "—"}</div>
                  <div className="text-xs text-muted">{r.material_request_items?.map((i: any) => i.material_name).join(", ")}</div>
                </div>
                <Badge tone={r.status === "fulfilled" ? "ok" : "danger"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
