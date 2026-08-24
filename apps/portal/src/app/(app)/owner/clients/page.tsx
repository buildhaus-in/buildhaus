import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Badge, Button, StatCard } from "@buildhaus/ui";
import { Input } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { resendApproval, priceChangeRequest, rejectChangeRequest } from "./actions";

const APPROVAL_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  approved: "ok", sent_to_client: "warn", prepared: "muted",
  owner_review: "muted", rejected: "danger", changes_requested: "danger", revised: "warn",
};
const CR_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  submitted: "warn", pending_pricing: "warn", under_review: "warn",
  cost_time_shared: "brand" as any, client_approved: "ok", completed: "ok",
  rejected: "danger", cancelled: "muted",
};

export default async function ClientsPage() {
  const supabase = createClient();

  const [{ data: clients }, { data: projects }, { data: approvals }, { data: changeRequests }] = await Promise.all([
    supabase.from("clients").select("id,full_name,mobile,email").order("full_name", { ascending: true }),
    supabase.from("projects").select("id,client_id,code,name,status"),
    supabase.from("client_approvals").select("id,project_id,type,title,status,description,sent_at,decided_at,client_response,projects(code,name)").order("sent_at", { ascending: false }),
    supabase.from("change_requests").select("id,project_id,title,description,status,cost_impact,timeline_impact_days,created_at,projects(code,name)").order("created_at", { ascending: false }),
  ]);

  const projectsByClient = new Map<string, any[]>();
  for (const p of projects ?? []) {
    if (!p.client_id) continue;
    const arr = projectsByClient.get(p.client_id) ?? [];
    arr.push(p);
    projectsByClient.set(p.client_id, arr);
  }

  const approvalList = approvals ?? [];
  const needsAttention = approvalList.filter((a: any) => a.status === "rejected" || a.status === "changes_requested");
  const withClient = approvalList.filter((a: any) => a.status === "sent_to_client");

  const crList = changeRequests ?? [];
  const crOpen = crList.filter((c: any) => !["completed", "rejected", "cancelled", "client_approved"].includes(c.status));
  const crResolved = crList.filter((c: any) => ["completed", "rejected", "cancelled", "client_approved"].includes(c.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Clients</h1>
        <p className="text-sm text-muted">Client directory, approval queue and change requests.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Clients" value={(clients ?? []).length} tone="brand" />
        <StatCard label="Needs your action" value={needsAttention.length} tone={needsAttention.length ? "danger" : "ok"} />
        <StatCard label="With client for review" value={withClient.length} tone="warn" />
        <StatCard label="Change requests open" value={crOpen.length} tone={crOpen.length ? "warn" : "ok"} />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Client directory</h2>
        {(!clients || clients.length === 0) ? (
          <EmptyState title="No clients yet" hint="Clients are created automatically when a lead is converted to a project." />
        ) : (
          <div className="divide-y divide-border">
            {clients.map((c: any) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="text-sm font-semibold text-sandlight">{c.full_name}</div>
                  <div className="text-xs text-muted">{c.mobile ?? "—"}{c.email ? ` · ${c.email}` : ""}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(projectsByClient.get(c.id) ?? []).map((p) => (
                    <Link key={p.id} href={`/owner/projects/${p.id}`}>
                      <Badge tone="brand">{p.code}</Badge>
                    </Link>
                  ))}
                  {(projectsByClient.get(c.id) ?? []).length === 0 && <span className="text-xs text-muted">No project yet</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Approvals needing your action</h2>
        {needsAttention.length === 0 ? (
          <div className="text-sm text-muted">Nothing needs rework right now.</div>
        ) : (
          <div className="space-y-3">
            {needsAttention.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{a.projects?.name ?? "—"} · {a.type}</div>
                    <div className="text-sm font-semibold text-sandlight">{a.title}</div>
                  </div>
                  <Badge tone={APPROVAL_TONE[a.status] ?? "muted"}>{a.status.replace(/_/g, " ")}</Badge>
                </div>
                {a.client_response && <p className="mt-1.5 text-sm text-danger">Client said: {a.client_response}</p>}
                <div className="mt-3 border-t border-border pt-3">
                  <form action={resendApproval}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="outline">Rework done — resend to client</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">With client for review</h2>
        {withClient.length === 0 ? (
          <div className="text-sm text-muted">Nothing currently awaiting a client decision.</div>
        ) : (
          <div className="divide-y divide-border">
            {withClient.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{a.projects?.name ?? "—"} — {a.title}</div>
                  <div className="text-xs text-muted">Sent {dateLabel(a.sent_at)}</div>
                </div>
                <Badge tone="warn">sent to client</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Change requests</h2>
        {crOpen.length === 0 ? (
          <div className="text-sm text-muted">No open change requests.</div>
        ) : (
          <div className="space-y-3">
            {crOpen.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{c.projects?.name ?? "—"}</div>
                    <div className="text-sm font-semibold text-sandlight">{c.title}</div>
                  </div>
                  <Badge tone={CR_TONE[c.status] ?? "muted"}>{c.status.replace(/_/g, " ")}</Badge>
                </div>
                {c.description && <p className="mt-1.5 text-sm text-sand">{c.description}</p>}
                {c.status === "cost_time_shared" ? (
                  <div className="mt-2 text-xs text-muted">Quoted: {inr(c.cost_impact)}{c.timeline_impact_days ? ` · +${c.timeline_impact_days} days` : ""} — awaiting client decision.</div>
                ) : (
                  <form action={priceChangeRequest} className="mt-3 grid gap-x-3 gap-y-2 border-t border-border pt-3 sm:grid-cols-3">
                    <input type="hidden" name="id" value={c.id} />
                    <Input label="Cost impact (₹)" name="cost_impact" type="number" />
                    <Input label="Timeline impact (days)" name="timeline_impact_days" type="number" />
                    <div className="flex items-end gap-2">
                      <Button type="submit">Price &amp; share</Button>
                    </div>
                  </form>
                )}
                {c.status !== "cost_time_shared" && (
                  <form action={rejectChangeRequest} className="mt-2">
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="danger">Reject request</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {crResolved.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Resolved change requests</h2>
          <div className="divide-y divide-border">
            {crResolved.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{c.projects?.name ?? "—"} — {c.title}</div>
                  <div className="text-xs text-muted">{dateLabel(c.created_at)}</div>
                </div>
                <Badge tone={CR_TONE[c.status] ?? "muted"}>{c.status.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
