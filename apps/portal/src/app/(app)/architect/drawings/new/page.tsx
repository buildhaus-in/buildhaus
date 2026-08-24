import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { EmptyState } from "@buildhaus/ui";
import { UploadDrawingForm } from "./UploadDrawingForm";

export default async function UploadDrawing() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "architect");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Upload Drawing</h1>
        <p className="text-sm text-muted">Creates a new drawing at revision 0, status draft.</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects assigned yet" hint="You need to be assigned as architect on a project before you can upload drawings." />
      ) : (
        <UploadDrawingForm projects={projects} />
      )}
    </div>
  );
}
