import { createClient } from "@buildhaus/database";
import { Card, Button, StatusBadge, StatCard, Badge } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { approveReport, returnReport } from "./actions";
import Link from "next/link";

export default async function SiteOperations() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: reports },
    { count: matReqPending },
    { count: qualityOpen },
    { data: attendanceToday },
  ] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id,report_date,status,weather,stage,floor,zone,work_completed,quantity_executed,unit,site_issues,delays,safety_observations,tomorrow_plan,client_instructions,notes,client_visible,returned_reason,submitted_at,approved_at,projects(id,code,name),engineer(full_name),daily_report_labour(category,count),daily_report_materials(material,received,consumed,unit),daily_report_photos(url,caption)")
      .order("report_date", { ascending: false }),
    supabase.from("material_requests").select("*", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("inspections").select("*", { count: "exact", head: true }).in("status", ["pending", "failed", "correction_pending"]),
    supabase.from("labour_attendance").select("present_count").eq("attendance_date", today),
  ]);

  const list = reports ?? [];
  const submitted = list.filter((r: any) => r.status === "submitted");
  const history = list.filter((r: any) => r.status !== "submitted").slice(0, 10);
  const todaysHeadcount = (attendanceToday ?? []).reduce((a: any, r: any) => a + Number(r.present_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Site Operations</h1>
        <p className="text-sm text-muted">Daily reports awaiting approval, plus a snapshot of today across every site.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Reports awaiting approval" value={submitted.length} tone={submitted.length ? "danger" : "ok"} />
        <StatCard label="Labour on site today" value={todaysHeadcount} tone="brand" />
        <StatCard label="Material requests pending" value={matReqPending ?? 0} tone="warn" />
        <StatCard label="Quality issues open" value={qualityOpen ?? 0} tone="danger" />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Pending approvals</h2>
          <div className="flex gap-3 text-xs">
            <Link href="/owner/materials" className="text-brand">Materials →</Link>
            <Link href="/owner/quality" className="text-brand">Quality →</Link>
          </div>
        </div>
        {submitted.length === 0 ? (
          <EmptyState title="No reports waiting" hint="Daily reports submitted by site engineers will appear here for approval." />
        ) : (
          <div className="space-y-4">
            {submitted.map((r: any) => (
              <div key={r.id} className="rounded-lg border border-warn/30 bg-warn/5 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-sandlight">{r.projects?.name ?? "—"} · {dateLabel(r.report_date)}</div>
                    <div className="text-xs text-muted">{r.engineer?.full_name ?? "—"} · {r.stage} · {r.floor}{r.zone ? ` · ${r.zone}` : ""}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-muted">Work completed: </span><span className="text-sand">{r.work_completed}</span></div>
                  <div><span className="text-muted">Quantity: </span><span className="text-sand">{r.quantity_executed} {r.unit}</span></div>
                  {r.site_issues && <div className="sm:col-span-2"><span className="text-muted">Site issues: </span><span className="text-danger">{r.site_issues}</span></div>}
                  {r.delays && <div><span className="text-muted">Delays: </span><span className="text-sand">{r.delays}</span></div>}
                  {r.safety_observations && <div><span className="text-muted">Safety: </span><span className="text-sand">{r.safety_observations}</span></div>}
                  {r.tomorrow_plan && <div className="sm:col-span-2"><span className="text-muted">Tomorrow: </span><span className="text-sand">{r.tomorrow_plan}</span></div>}
                </div>

                {(r.daily_report_labour?.length > 0 || r.daily_report_materials?.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.daily_report_labour?.map((l: any, i: number) => (
                      <Badge key={i} tone="muted">{l.category}: {l.count}</Badge>
                    ))}
                    {r.daily_report_materials?.map((m: any, i: number) => (
                      <Badge key={i} tone="muted">{m.material}: {m.consumed}/{m.received} {m.unit}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-border pt-4">
                  <form action={approveReport} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" name="client_visible" defaultChecked={r.client_visible} /> Publish to client
                    </label>
                    <Button type="submit" variant="primary">Approve</Button>
                  </form>
                  <form action={returnReport} className="flex-1 min-w-[240px] space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <Textarea name="reason" placeholder="What needs fixing before this can be approved?" />
                    <Button type="submit" variant="danger">Return</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Recent reports</h2>
        {history.length === 0 ? (
          <EmptyState title="No reports yet" />
        ) : (
          <div className="divide-y divide-border">
            {history.map((r: any) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-sandlight">{r.projects?.name ?? "—"} · {dateLabel(r.report_date)}</div>
                    <div className="text-xs text-muted">{r.engineer?.full_name ?? "—"} · {r.stage}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.status === "returned" && r.returned_reason && (
                  <div className="mt-1.5 text-xs text-danger">Returned: {r.returned_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
