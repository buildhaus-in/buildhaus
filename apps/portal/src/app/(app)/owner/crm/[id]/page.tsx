import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { Card, Button, Badge } from "@buildhaus/ui";
import { Input, Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { addNote, markContacted, scheduleSiteVisit, markLost, convertToProject } from "../actions";

const STAGE_TONE: Record<string, "ok" | "warn" | "danger" | "brand" | "muted"> = {
  new_enquiry: "brand", contacted: "warn", site_visit_scheduled: "warn",
  quoted: "warn", won: "ok", lost: "danger",
};

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id,customer_name,mobile,email,site_location,building_type,plot_size,builtup_area_sqft,floors,estimated_value,enquiry_date,follow_up_date,stage,notes,source,converted_project_id,lead_activities(id,type,note,created_at)")
    .eq("id", params.id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: visits } = await supabase
    .from("site_visits").select("id,scheduled_date,status,notes").eq("lead_id", lead.id).order("scheduled_date", { ascending: false });

  const activities = [...((lead as any).lead_activities ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const isClosed = lead.stage === "won" || lead.stage === "lost";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/crm" className="text-xs uppercase tracking-wide text-brand hover:underline">← CRM</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-ivory">{lead.customer_name}</h1>
          <Badge tone={STAGE_TONE[lead.stage] ?? "muted"}>{lead.stage.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-sm text-muted">{lead.site_location ?? "—"} · {(lead.building_type ?? "").replace(/_/g, " ")}</p>
      </div>

      {lead.stage === "won" && lead.converted_project_id && (
        <Card className="border-ok/30 bg-ok/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-sandlight">This lead was converted to a project.</span>
            <Link href={`/owner/projects/${lead.converted_project_id}`}><Button variant="outline">Open project →</Button></Link>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Lead details</h2>
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Mobile</span><span className="text-sand">{lead.mobile ?? "—"}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Email</span><span className="text-sand">{lead.email ?? "—"}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Plot size</span><span className="text-sand">{lead.plot_size ?? "—"}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Built-up area</span><span className="text-sand">{lead.builtup_area_sqft ? `${Number(lead.builtup_area_sqft).toLocaleString("en-IN")} sqft` : "—"}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Floors</span><span className="text-sand">{lead.floors ?? "—"}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Estimated value</span><span className="text-sand">{inr(lead.estimated_value)}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Enquiry date</span><span className="text-sand">{dateLabel(lead.enquiry_date)}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Follow-up date</span><span className="text-sand">{dateLabel(lead.follow_up_date)}</span></div>
          <div className="flex justify-between border-b border-border/60 py-1.5"><span className="text-muted">Source</span><span className="text-sand">{(lead.source ?? "—").replace(/_/g, " ")}</span></div>
        </div>
        {lead.notes && <p className="mt-3 text-sm text-muted">{lead.notes}</p>}
      </Card>

      {!isClosed && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {lead.stage === "new_enquiry" && (
              <form action={markContacted}>
                <input type="hidden" name="lead_id" value={lead.id} />
                <Button type="submit" variant="outline">Mark as contacted</Button>
              </form>
            )}
            <form action={convertToProject}>
              <input type="hidden" name="lead_id" value={lead.id} />
              <Button type="submit">Convert to project</Button>
            </form>
            <form action={markLost} className="flex items-center gap-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <input name="reason" placeholder="Reason (optional)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand" />
              <Button type="submit" variant="danger">Mark lost</Button>
            </form>
          </div>
        </Card>
      )}

      {!isClosed && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Schedule a site visit</h2>
          <form action={scheduleSiteVisit} className="grid gap-x-4 sm:grid-cols-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            <Input label="Visit date" name="scheduled_date" type="date" required />
            <Input label="Notes" name="notes" placeholder="Bring topo survey team" />
            <div className="sm:col-span-2"><Button type="submit">Schedule visit</Button></div>
          </form>
        </Card>
      )}

      {visits && visits.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Site visits</h2>
          <div className="divide-y divide-border">
            {visits.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="text-sandlight">{dateLabel(v.scheduled_date)}</div>
                  {v.notes && <div className="text-xs text-muted">{v.notes}</div>}
                </div>
                <Badge tone={v.status === "scheduled" ? "warn" : "ok"}>{v.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Add a note</h2>
        <form action={addNote} className="space-y-2">
          <input type="hidden" name="lead_id" value={lead.id} />
          <Textarea name="note" placeholder="Call notes, requirements, objections…" required />
          <Button type="submit">Add note</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Activity</h2>
        {activities.length === 0 ? (
          <EmptyState title="No activity yet" hint="Notes, site visits and quotations for this lead will show up here." />
        ) : (
          <div className="space-y-3">
            {activities.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge tone="muted">{a.type.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted">{dateLabel(a.created_at)}</span>
                </div>
                <p className="mt-1.5 text-sand">{a.note}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
