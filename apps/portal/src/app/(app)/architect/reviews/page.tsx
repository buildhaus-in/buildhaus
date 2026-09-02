import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, StatusBadge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

// "What needs my attention" — drawings currently bounced back for revision or
// out with the client, plus a feed of the latest notes left against any
// drawing across the architect's assigned projects (reusing
// drawing_revisions.notes as the lightweight comment trail).
export default async function ArchitectReviews() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "architect");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);
  const projectIds = projects.map((p: any) => p.id);

  const { data: allDrawings } = await supabase
    .from("drawings")
    // drawing_revisions has two FKs to profiles (uploaded_by, reviewed_by) —
    // a bare embedded profiles(...) is ambiguous and real Postgres/PostgREST
    // rejects the query outright; Demo Mode's mock has no such check. This
    // page renders it as "by {name}" per revision, i.e. who uploaded it.
    .select("id,drawing_no,title,discipline,status,current_revision,updated_at,projects(id,code,name),drawing_revisions(revision_no,status,notes,created_at,profiles!uploaded_by(full_name))")
    .in("project_id", projectIds.length ? projectIds : ["__none__"])
    .order("updated_at", { ascending: false });

  const needsAttention = (allDrawings ?? []).filter((d: any) => ["client_review", "revision_requested"].includes(d.status));

  // Latest note per drawing (if any), newest first, across ALL of the
  // architect's drawings — not just the ones needing attention.
  const feed = (allDrawings ?? [])
    .map((d: any) => {
      const revs = [...(d.drawing_revisions ?? [])].sort((a: any, b: any) => a.revision_no - b.revision_no);
      const latest = revs[revs.length - 1];
      return latest ? { drawing: d, revision: latest } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.revision.created_at).getTime() - new Date(a.revision.created_at).getTime())
    .slice(0, 8) as Array<{ drawing: any; revision: any }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Reviews</h1>
        <p className="text-sm text-muted">Drawings that need your attention, and the latest notes on your work.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Needs attention</h2>
        {needsAttention.length === 0 ? (
          <EmptyState title="Nothing needs your attention right now" hint="Drawings with the client, or sent back for revision, will show up here." />
        ) : (
          <div className="space-y-2">
            {needsAttention.map((d: any) => (
              <Link
                key={d.id}
                href={`/architect/drawings/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:border-brand/50"
              >
                <div>
                  <div className="text-sm font-semibold text-sandlight">{d.drawing_no} · {d.title}</div>
                  <div className="text-xs text-muted">{d.projects?.name ?? "—"} · Rev {d.current_revision} · updated {dateLabel(d.updated_at)}</div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Recent notes</h2>
        {feed.length === 0 ? (
          <EmptyState title="No notes yet" />
        ) : (
          <div className="divide-y divide-border">
            {feed.map(({ drawing, revision }, i) => (
              <Link key={i} href={`/architect/drawings/${drawing.id}`} className="block py-3 transition hover:bg-surface">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-sandlight">{drawing.drawing_no} · Rev {revision.revision_no}</span>
                  <span className="text-xs text-muted">{dateLabel(revision.created_at)}</span>
                </div>
                <div className="mt-0.5 text-sm text-sand">{revision.notes || "—"}</div>
                <div className="mt-0.5 text-xs text-muted">by {revision.profiles?.full_name ?? "—"}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
