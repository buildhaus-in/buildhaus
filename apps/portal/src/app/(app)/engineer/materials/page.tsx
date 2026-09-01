import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatusBadge, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { createMaterialRequest } from "./actions";

const ITEM_SLOTS = 6;

export default async function EngineerMaterials() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  const { data: requests } = await supabase
    .from("material_requests")
    .select("id,status,priority,needed_by,notes,created_at,projects(code,name),profiles(full_name),material_request_items(id,material_name,quantity,unit)")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Material requests</h1>
        <p className="text-sm text-muted">Requests for your assigned projects.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">New material request</h2>
        {projects.length === 0 ? (
          <div className="text-sm text-muted">You aren&apos;t assigned to any projects yet.</div>
        ) : (
          <ActionForm action={createMaterialRequest} successMessage="Material request raised." className="space-y-3">
            <div className="grid gap-x-4 sm:grid-cols-3">
              <Select label="Project" name="project_id" defaultValue={projects[0].id}>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </Select>
              <Select label="Priority" name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
              <Input label="Needed by" name="needed_by" type="date" />
            </div>
            <Textarea label="Notes" name="notes" placeholder="Context for the Owner / procurement…" />

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wide text-muted">Items</div>
              <div className="space-y-2">
                {Array.from({ length: ITEM_SLOTS }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                    <Input name={`item_name_${i}`} placeholder="Material name" />
                    <Input name={`item_qty_${i}`} type="number" step="any" placeholder="Quantity" />
                    <Input name={`item_unit_${i}`} placeholder="Unit" />
                  </div>
                ))}
              </div>
            </div>

            <SubmitButton>Raise request</SubmitButton>
          </ActionForm>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-bold text-ivory">Requests</h2>
        {(!requests || requests.length === 0) ? (
          <EmptyState title="No material requests yet" hint="Requests you or your teammates raise for these projects will show up here." />
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-ivory">{r.projects?.code} · {r.projects?.name}</div>
                    <div className="text-xs text-muted">Requested by {r.profiles?.full_name ?? "—"} · {dateLabel(r.created_at)} · Needed by {dateLabel(r.needed_by)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.priority === "high" ? "danger" : r.priority === "medium" ? "warn" : "muted"}>{r.priority}</Badge>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                {r.notes && <div className="mt-2 text-sm text-sandlight">{r.notes}</div>}
                {r.material_request_items?.length > 0 && (
                  <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {r.material_request_items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <span className="text-sandlight">{it.material_name}</span>
                        <span className="text-muted">{it.quantity} {it.unit}</span>
                      </div>
                    ))}
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
