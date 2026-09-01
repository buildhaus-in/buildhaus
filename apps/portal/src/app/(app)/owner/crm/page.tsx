import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Button, Badge, StatCard, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { createLead } from "./actions";

const STAGES = ["new_enquiry", "contacted", "site_visit_scheduled", "quoted", "won", "lost"] as const;
const BUILDING_TYPES = ["independent_house", "villa", "duplex", "apartment", "office", "commercial", "warehouse", "factory", "interior", "renovation"];

const STAGE_TONE: Record<string, "ok" | "warn" | "danger" | "brand" | "muted"> = {
  new_enquiry: "brand", contacted: "warn", site_visit_scheduled: "warn",
  quoted: "warn", won: "ok", lost: "danger",
};

export default async function CrmPage({
  searchParams,
}: {
  searchParams: { stage?: string; building_type?: string; city?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("leads")
    .select("id,customer_name,mobile,site_location,building_type,plot_size,builtup_area_sqft,floors,estimated_value,enquiry_date,follow_up_date,stage")
    .order("enquiry_date", { ascending: false });

  if (searchParams.stage) query = query.eq("stage", searchParams.stage);
  if (searchParams.building_type) query = query.eq("building_type", searchParams.building_type);
  if (searchParams.city) query = query.ilike("site_location", `%${searchParams.city}%`);

  const { data: leads } = await query;
  const list = leads ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const open = list.filter((l: any) => l.stage !== "won" && l.stage !== "lost");
  const overdueFollowups = open.filter((l: any) => l.follow_up_date && l.follow_up_date < today);
  const pipelineValue = open.reduce((a: any, l: any) => a + Number(l.estimated_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">CRM</h1>
        <p className="text-sm text-muted">Enquiries and the sales pipeline, from first contact to a won project.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Open leads" value={open.length} tone="brand" />
        <StatCard label="Follow-ups overdue" value={overdueFollowups.length} tone={overdueFollowups.length ? "danger" : "ok"} />
        <StatCard label="Pipeline value" value={inr(pipelineValue)} tone="sand" />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Add a lead</h2>
        <ActionForm action={createLead} successMessage="Lead added." className="grid gap-x-4 sm:grid-cols-3">
          <Input label="Customer name" name="customer_name" placeholder="Ramesh Kumar" required />
          <Input label="Mobile" name="mobile" placeholder="+91 90000 00000" />
          <Input label="Email" name="email" type="email" placeholder="optional" />
          <Input label="Site location / city" name="site_location" placeholder="Podalakur Road, Nellore" />
          <Select label="Building type" name="building_type" defaultValue="independent_house">
            {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </Select>
          <Input label="Plot size" name="plot_size" placeholder="40x60" />
          <Input label="Built-up area (sqft)" name="builtup_area_sqft" type="number" />
          <Input label="Floors" name="floors" type="number" />
          <Input label="Estimated value (₹)" name="estimated_value" type="number" />
          <Input label="Follow-up date" name="follow_up_date" type="date" />
          <div className="sm:col-span-3"><SubmitButton>Add lead</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card>
        <form className="grid gap-x-4 sm:grid-cols-4" method="get">
          <Select label="Stage" name="stage" defaultValue={searchParams.stage ?? ""}>
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
          <Select label="Building type" name="building_type" defaultValue={searchParams.building_type ?? ""}>
            <option value="">All types</option>
            {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </Select>
          <Input label="City / area" name="city" defaultValue={searchParams.city ?? ""} placeholder="Nellore" />
          <div className="flex items-end">
            <Button type="submit" variant="outline" className="w-full">Filter</Button>
          </div>
        </form>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="No leads match" hint="Try clearing the filters, or add a lead above." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location / type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Est. value</th>
                <th className="px-4 py-3">Enquiry</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((l: any) => {
                const overdue = !!(l.follow_up_date && l.follow_up_date < today && l.stage !== "won" && l.stage !== "lost");
                return (
                  <tr key={l.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link href={`/owner/crm/${l.id}`} className="font-semibold text-sandlight hover:text-brand">{l.customer_name}</Link>
                      <div className="text-xs text-muted">{l.mobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sand">{l.site_location ?? "—"}</div>
                      <div className="text-xs text-muted">{(l.building_type ?? "").replace(/_/g, " ")}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {l.plot_size ?? "—"}{l.builtup_area_sqft ? ` · ${Number(l.builtup_area_sqft).toLocaleString("en-IN")} sqft` : ""}{l.floors ? ` · ${l.floors} floor(s)` : ""}
                    </td>
                    <td className="px-4 py-3 text-sand">{inr(l.estimated_value)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{dateLabel(l.enquiry_date)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={overdue ? "font-semibold text-danger" : "text-muted"}>{dateLabel(l.follow_up_date)}</span>
                    </td>
                    <td className="px-4 py-3"><Badge tone={STAGE_TONE[l.stage] ?? "muted"}>{l.stage.replace(/_/g, " ")}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
