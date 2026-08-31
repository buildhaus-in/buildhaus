import { createClient } from "@buildhaus/database";
import { Card, StatusBadge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, sqft, dateLabel } from "@buildhaus/utils";
import { CreateProjectForm } from "./CreateProjectForm";
import Link from "next/link";

export default async function Projects() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id,code,name,project_type,status,progress,contract_value,builtup_area_sqft,planned_completion")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ivory">Projects</h1>

      <CreateProjectForm />

      {(!projects || projects.length === 0) ? (
        <EmptyState title="No projects yet" hint="Create one above, or convert a won lead in CRM." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p: any) => (
            <Link key={p.id} href={`/owner/projects/${p.id}`}>
              <Card className="h-full transition hover:border-brand/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand">{p.code}</div>
                    <div className="mt-0.5 font-bold text-ivory">{p.name}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                  <span>{sqft(p.builtup_area_sqft)}</span>
                  <span>{inr(p.contract_value)}</span>
                  <span>{p.progress}% done</span>
                  <span>due {dateLabel(p.planned_completion)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
