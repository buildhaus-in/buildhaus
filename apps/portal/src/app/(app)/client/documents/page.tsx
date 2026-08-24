import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";

const CATEGORY_TONE: Record<string, "ok" | "warn" | "danger" | "muted" | "brand"> = {
  legal: "brand", approvals: "ok",
};

export default async function ClientDocuments() {
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
        <h1 className="text-xl font-bold text-ivory">Documents</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Agreements, approved drawings and handover documents will appear here."
        />
      </div>
    );
  }

  // Only documents the team has explicitly marked client-visible — internal
  // workbooks, cost estimates etc. never surface here even though they share
  // the same table.
  const { data: documents } = await supabase
    .from("documents")
    .select("id,title,category,file_url,uploaded_at")
    .eq("project_id", project.id).eq("client_visible", true)
    .order("uploaded_at", { ascending: false });

  const list = documents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Documents</h1>
        <p className="text-sm text-muted">Agreements, plans and other documents shared with you.</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No documents shared yet"
          hint="Your agreement, approved plans and handover documents will appear here once uploaded."
        />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {list.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{d.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    {d.category && <Badge tone={CATEGORY_TONE[d.category] ?? "muted"}>{d.category}</Badge>}
                    <span>{dateLabel(d.uploaded_at)}</span>
                  </div>
                </div>
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-brand"
                >
                  View / download →
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
