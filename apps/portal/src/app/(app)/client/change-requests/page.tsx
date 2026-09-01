import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, ActionForm, SubmitButton } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { Input, Textarea } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { raiseChangeRequest } from "./actions";

const STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  approved: "ok", pending_pricing: "warn", submitted: "warn", rejected: "danger",
};

export default async function ClientChangeRequests() {
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
        <h1 className="text-xl font-bold text-ivory">Change Requests</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="You'll be able to raise change requests once your project is active."
        />
      </div>
    );
  }

  const { data: requests } = await supabase
    .from("change_requests")
    .select("id,title,description,status,cost_impact,timeline_impact_days,created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const list = requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Change Requests</h1>
        <p className="text-sm text-muted">Anything you&apos;d like changed from the original scope — track cost and timeline impact here.</p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No change requests yet" hint="Raise one below and your team will price it out." />
      ) : (
        <div className="space-y-4">
          {list.map((cr: any) => (
            <Card key={cr.id}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="font-semibold text-sandlight">{cr.title}</div>
                <Badge tone={STATUS_TONE[cr.status] ?? "muted"}>{cr.status.replace(/_/g, " ")}</Badge>
              </div>
              {cr.description && <p className="mb-3 text-sm text-muted">{cr.description}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-muted">
                <span>Raised {dateLabel(cr.created_at)}</span>
                <span>
                  Cost impact: <span className="text-sand">{cr.cost_impact != null ? inr(cr.cost_impact) : "Pending pricing"}</span>
                </span>
                <span>
                  Timeline impact: <span className="text-sand">{cr.timeline_impact_days != null ? `${cr.timeline_impact_days} days` : "Pending pricing"}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Raise a new change request</h2>
        <ActionForm action={raiseChangeRequest} successMessage="Change request submitted.">
          <Input name="title" label="Title" placeholder="e.g. Add extra wardrobe — Bedroom 2" required />
          <Textarea name="description" label="Description" placeholder="Describe what you'd like changed…" />
          <SubmitButton variant="primary">Submit request</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
