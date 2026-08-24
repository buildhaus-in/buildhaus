import { createClient } from "@buildhaus/database";
import { Card, Button, Badge } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { createSupplier, raisePurchase } from "./actions";

const CATEGORIES = ["steel", "cement", "sand", "joinery", "electrical", "plumbing", "tiles", "paint", "hardware", "other"];

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: projects }, { data: purchases }] = await Promise.all([
    supabase.from("suppliers").select("id,name,category,contact_person,mobile").order("name", { ascending: true }),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
    supabase.from("purchases").select("id,material_name,quantity,unit,status,notes,ordered_at,suppliers(name),projects(name)").order("ordered_at", { ascending: false }),
  ]);

  const supplierList = suppliers ?? [];
  const purchaseList = purchases ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Suppliers</h1>
        <p className="text-sm text-muted">Owner-only supplier directory and simple purchase requests. No supplier login in Demo Mode.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Add a supplier</h2>
        <form action={createSupplier} className="grid gap-x-4 sm:grid-cols-4">
          <Input label="Business name" name="name" placeholder="Sri Lakshmi Steel Traders" required />
          <Select label="Category" name="category" defaultValue="steel">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Contact person" name="contact_person" placeholder="Rajesh" />
          <Input label="Mobile" name="mobile" placeholder="+91 90000 00000" />
          <div className="sm:col-span-4"><Button type="submit">Add supplier</Button></div>
        </form>
      </Card>

      {supplierList.length === 0 ? (
        <EmptyState title="No suppliers yet" hint="Add your first supplier above." />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {supplierList.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-sandlight">{s.name}</div>
                  <div className="text-xs text-muted">{s.contact_person ?? "—"} · {s.mobile ?? "—"}</div>
                </div>
                <Badge tone="brand">{s.category ?? "—"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Raise a purchase</h2>
        {supplierList.length === 0 ? (
          <div className="text-sm text-muted">Add a supplier first.</div>
        ) : (
          <form action={raisePurchase} className="grid gap-x-4 sm:grid-cols-3">
            <Select label="Supplier" name="supplier_id">
              {supplierList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label="Project (optional)" name="project_id" defaultValue="">
              <option value="">— General / stock —</option>
              {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </Select>
            <Input label="Material" name="material_name" placeholder="TMT steel 12mm" required />
            <Input label="Quantity" name="quantity" type="number" />
            <Input label="Unit" name="unit" placeholder="kg / bag / no" />
            <Input label="Notes" name="notes" placeholder="Optional" />
            <div className="sm:col-span-3"><Button type="submit">Raise purchase</Button></div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Purchases raised</h2>
        {purchaseList.length === 0 ? (
          <EmptyState title="No purchases raised yet" />
        ) : (
          <div className="divide-y divide-border">
            {purchaseList.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{p.material_name} — {p.quantity ?? "—"} {p.unit ?? ""}</div>
                  <div className="text-xs text-muted">{p.suppliers?.name ?? "—"} · {p.projects?.name ?? "General stock"} · {dateLabel(p.ordered_at)}</div>
                </div>
                <Badge tone="warn">{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
