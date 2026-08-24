import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Badge, Button } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";

const STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  draft: "muted", sent: "warn", under_negotiation: "warn",
  accepted: "ok", rejected: "danger", expired: "danger",
};

export default async function QuotationsPage() {
  const supabase = createClient();

  const { data: quotations } = await supabase
    .from("quotations")
    .select("id,quotation_no,status,kind,current_version,valid_until,created_at,leads(customer_name,mobile),projects(code,name),quotation_versions(version,builtup_area_sqft,package,total_cost,cost_per_sqft)")
    .order("created_at", { ascending: false });

  const list = quotations ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Estimates &amp; Quotations</h1>
        <p className="text-sm text-muted">Quotations generated from the public estimator or CRM leads.</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          hint="Quotations generated from the public cost estimator or from a CRM lead will appear here."
        />
      ) : (
        <div className="space-y-4">
          {list.map((q: any) => {
            const latest = [...(q.quotation_versions ?? [])].sort((a: any, b: any) => b.version - a.version)[0];
            return (
              <Card key={q.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand">{q.quotation_no}</div>
                    <div className="font-bold text-ivory">{q.leads?.customer_name ?? q.projects?.name ?? "—"}</div>
                    <div className="text-xs text-muted">{q.leads?.mobile ?? ""}{q.projects?.code ? ` · ${q.projects.code}` : ""}</div>
                  </div>
                  <Badge tone={STATUS_TONE[q.status] ?? "muted"}>{q.status.replace(/_/g, " ")}</Badge>
                </div>

                {latest && (
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-sand">
                    <span>{(latest.package ?? "").replace(/_/g, " ")}</span>
                    <span>{latest.builtup_area_sqft ? `${Number(latest.builtup_area_sqft).toLocaleString("en-IN")} sqft` : ""}</span>
                    <span>{inr(latest.total_cost)}</span>
                    <span>{latest.cost_per_sqft ? `₹${latest.cost_per_sqft}/sqft` : ""}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
                  <span>Created {dateLabel(q.created_at)}{q.valid_until ? ` · valid until ${dateLabel(q.valid_until)}` : ""} · v{q.current_version}</span>
                  <Link href={`/owner/quotations/${q.id}/download`}>
                    <Button variant="outline">Download</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
