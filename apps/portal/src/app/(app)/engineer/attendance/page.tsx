import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { logAttendance } from "./actions";

const TRADES = ["Mason", "Helper", "Carpenter", "Bar bender", "Electrician", "Plumber", "Painter", "Mixed"];

export default async function EngineerAttendance() {
  const supabase = createClient();
  const ctx = await getUserContext();
  const today = new Date().toISOString().slice(0, 10);

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  const { data: attendance } = await supabase
    .from("labour_attendance")
    .select("id,attendance_date,trade,present_count,projects(code,name)")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("attendance_date", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Labour attendance</h1>
        <p className="text-sm text-muted">Log today&apos;s present count per trade for your assigned projects.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Log attendance</h2>
        {projects.length === 0 ? (
          <div className="text-sm text-muted">You aren&apos;t assigned to any projects yet.</div>
        ) : (
          <form action={logAttendance} className="grid gap-x-4 sm:grid-cols-4">
            <Select label="Project" name="project_id" defaultValue={projects[0].id}>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </Select>
            <Select label="Trade" name="trade" defaultValue={TRADES[0]}>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Present count" name="present_count" type="number" min={1} />
            <input type="hidden" name="attendance_date" value={today} />
            <div className="flex items-end">
              <Button type="submit" className="w-full">Log for today</Button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Recent entries</h2>
        {(!attendance || attendance.length === 0) ? (
          <EmptyState title="No attendance logged yet" hint="Entries you log will show up here." />
        ) : (
          <div className="divide-y divide-border">
            {attendance.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="text-sandlight">{a.trade}</div>
                  <div className="text-xs text-muted">{a.projects?.code} · {a.projects?.name} · {dateLabel(a.attendance_date)}</div>
                </div>
                <div className="font-semibold text-ink">{a.present_count}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
