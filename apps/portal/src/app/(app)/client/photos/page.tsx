import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

export default async function ClientPhotos() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase.from("projects").select("id,code,name").eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Photos</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Site photos shared by your project team will appear here."
        />
      </div>
    );
  }

  // Only reports the site team has explicitly published to the client, and
  // only the photos attached to those — never draft/submitted-but-unapproved
  // reports.
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id,report_date,stage,floor,daily_report_photos(id,url,caption)")
    .eq("project_id", project.id).eq("client_visible", true)
    .order("report_date", { ascending: false });

  type Photo = { id: string; url: string; caption: string | null; report_date: string; stage: string | null; floor: string | null };
  const photos: Photo[] = (reports ?? []).flatMap((r: any) =>
    (r.daily_report_photos ?? []).map((p: any) => ({
      id: p.id, url: p.url, caption: p.caption, report_date: r.report_date, stage: r.stage, floor: r.floor,
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Photos</h1>
        <p className="text-sm text-muted">Site photos shared by your Buildhaus team.</p>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          title="No photos shared yet"
          hint="Once your site team publishes photos from a daily report, they'll show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-hidden p-0">
              <div className="flex h-40 items-center justify-center border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
                Site photo
              </div>
              <div className="p-3">
                <div className="text-sm text-sandlight">{p.caption || "Untitled"}</div>
                <div className="mt-1 text-xs text-muted">
                  {[p.stage, p.floor].filter(Boolean).join(" · ") || "—"} · {dateLabel(p.report_date)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
