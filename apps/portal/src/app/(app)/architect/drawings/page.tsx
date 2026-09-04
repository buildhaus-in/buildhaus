import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button, StatusBadge, buttonClass } from "@buildhaus/ui";
import { Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

const DISCIPLINES = ["architectural", "structural", "electrical", "plumbing", "interior", "elevation", "landscape", "shop_drawing", "as_built"];
const STATUSES = ["draft", "owner_review", "revision_requested", "client_review", "approved", "approved_for_construction"];

export default async function ArchitectDrawings({
  searchParams,
}: {
  searchParams: { status?: string; discipline?: string; project?: string };
}) {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "architect");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  let query = supabase
    .from("drawings")
    .select("id,drawing_no,title,discipline,floor,status,current_revision,updated_at,projects(id,code,name)")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("updated_at", { ascending: false });

  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.discipline) query = query.eq("discipline", searchParams.discipline);
  if (searchParams.project) query = query.eq("project_id", searchParams.project);

  const { data: drawings } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Drawings</h1>
          <p className="text-sm text-muted">All drawings across your assigned projects.</p>
        </div>
        <Link href="/architect/drawings/new" className={buttonClass()}>+ Upload drawing</Link>
      </div>

      <Card>
        <form className="grid gap-x-4 sm:grid-cols-4" method="get">
          <Select label="Project" name="project" defaultValue={searchParams.project ?? ""}>
            <option value="">All projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
            ))}
          </Select>
          <Select label="Discipline" name="discipline" defaultValue={searchParams.discipline ?? ""}>
            <option value="">All disciplines</option>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
          </Select>
          <Select label="Status" name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
          <div className="flex items-end sm:col-span-1">
            <Button type="submit" variant="outline" className="w-full">Filter</Button>
          </div>
        </form>
      </Card>

      {(!drawings || drawings.length === 0) ? (
        <EmptyState
          title="No drawings match"
          hint={projectIds.length === 0 ? "You aren't assigned to any projects yet." : "Try clearing the filters, or upload a new drawing."}
          action={<Link href="/architect/drawings/new" className={buttonClass()}>Upload drawing</Link>}
        />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {drawings.map((d: any) => (
              <Link key={d.id} href={`/architect/drawings/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-surface">
                <div>
                  <div className="text-sm font-semibold text-sandlight">{d.drawing_no} · {d.title}</div>
                  <div className="text-xs text-muted">
                    {d.projects?.name ?? "—"} · {d.discipline?.replace(/_/g, " ")} · {d.floor ?? "—"} · Rev {d.current_revision} · updated {dateLabel(d.updated_at)}
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
