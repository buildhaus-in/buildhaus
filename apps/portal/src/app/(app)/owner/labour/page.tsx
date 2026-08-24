import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Button, Badge, StatCard } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { createContractor, recordAttendance } from "./actions";

export default async function LabourPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: contractors }, { data: attendance }, { data: bills }, { data: projects }] = await Promise.all([
    supabase.from("labour_contractors").select("id,name,mobile").order("name", { ascending: true }),
    supabase.from("labour_attendance").select("id,attendance_date,present_count,trade,projects(name),labour_contractors(name)").order("attendance_date", { ascending: false }).limit(20),
    supabase.from("contractor_bills").select("id,contractor_name,outstanding,bill_date,projects(name)").order("bill_date", { ascending: false }),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
  ]);

  const attendanceList = attendance ?? [];
  const billList = bills ?? [];
  const todaysHeadcount = attendanceList.filter((a: any) => a.attendance_date === today).reduce((s: any, a: any) => s + Number(a.present_count ?? 0), 0);
  const totalOutstanding = billList.reduce((s: any, b: any) => s + Number(b.outstanding ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Labour &amp; Subcontractors</h1>
          <p className="text-sm text-muted">Daily attendance across sites and contractor bills.</p>
        </div>
        <Link href="/owner/finance"><Button variant="outline">Pay bills in Finance →</Button></Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="On site today" value={todaysHeadcount} tone="brand" />
        <StatCard label="Contractors" value={(contractors ?? []).length} tone="sand" />
        <StatCard label="Outstanding bills" value={inr(totalOutstanding)} tone={totalOutstanding ? "danger" : "ok"} />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Add a contractor</h2>
        <form action={createContractor} className="grid gap-x-4 sm:grid-cols-3">
          <Input label="Name" name="name" placeholder="Ravindra Labour Co." required />
          <Input label="Mobile" name="mobile" placeholder="+91 90000 00000" />
          <div className="flex items-end"><Button type="submit">Add contractor</Button></div>
        </form>
      </Card>

      {(contractors ?? []).length > 0 && (projects ?? []).length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Record today&apos;s attendance</h2>
          <form action={recordAttendance} className="grid gap-x-4 sm:grid-cols-4">
            <Select label="Project" name="project_id">
              {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </Select>
            <Select label="Contractor" name="contractor_id">
              {(contractors ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Trade" name="trade" placeholder="Mason / Mixed" defaultValue="Mixed" />
            <Input label="Present count" name="present_count" type="number" required />
            <div className="sm:col-span-4"><Button type="submit">Record attendance</Button></div>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Recent attendance</h2>
        {attendanceList.length === 0 ? (
          <EmptyState title="No attendance recorded yet" />
        ) : (
          <div className="divide-y divide-border">
            {attendanceList.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{a.projects?.name ?? "—"} · {a.labour_contractors?.name ?? "—"}</div>
                  <div className="text-xs text-muted">{a.trade} · {dateLabel(a.attendance_date)}</div>
                </div>
                <span className="font-semibold text-brand">{a.present_count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Contractor bills</h2>
        {billList.length === 0 ? (
          <EmptyState title="No contractor bills yet" />
        ) : (
          <div className="divide-y divide-border">
            {billList.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{b.contractor_name}</div>
                  <div className="text-xs text-muted">{b.projects?.name ?? "—"} · billed {dateLabel(b.bill_date)}</div>
                </div>
                <Badge tone={Number(b.outstanding) > 0 ? "danger" : "ok"}>{inr(b.outstanding)}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
