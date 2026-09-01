import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button, Badge, StatusBadge, FileUpload, buttonClass, SubmitButton } from "@buildhaus/ui";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { EmptyState, ErrorState } from "@buildhaus/ui";
import { dateLabel, STANDARD_STAGES } from "@buildhaus/utils";
import { saveDraftReport, submitReport } from "./actions";

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rain", "Overcast", "Windy", "Hot & humid"];
const LABOUR_SLOTS = 5;
const MATERIAL_SLOTS = 5;
const PHOTO_SLOTS = 3;

export default async function DailyReport({ searchParams }: { searchParams: { project?: string; error?: string } }) {
  const supabase = createClient();
  const ctx = await getUserContext();
  const today = new Date().toISOString().slice(0, 10);

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("projects(id,code,name)")
    .eq("profile_id", ctx?.userId ?? "")
    .eq("role_key", "site_engineer");
  const projects = (memberRows ?? []).map((r: any) => r.projects).filter(Boolean);

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ivory">Daily report</h1>
          <p className="text-sm text-muted">{dateLabel(today)}</p>
        </div>
        <EmptyState title="No assigned projects" hint="You'll be able to file a daily report once the Owner assigns you to a project." />
      </div>
    );
  }

  const projectId = searchParams.project && projects.some((p: any) => p.id === searchParams.project)
    ? searchParams.project
    : projects[0].id;
  const activeProject = projects.find((p: any) => p.id === projectId);

  const { data: report } = await supabase
    .from("daily_reports")
    .select("*, daily_report_labour(id,category,count), daily_report_materials(id,material,received,consumed,unit), daily_report_photos(id,url,caption)")
    .eq("project_id", projectId)
    .eq("engineer_id", ctx?.userId ?? "")
    .eq("report_date", today)
    .maybeSingle();

  const readOnly = report?.status === "submitted" || report?.status === "approved";
  const labourRows = report?.daily_report_labour ?? [];
  const materialRows = report?.daily_report_materials ?? [];
  const photoRows = report?.daily_report_photos ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Daily report</h1>
          <p className="text-sm text-muted">{dateLabel(today)}</p>
        </div>
        {report?.status && <StatusBadge status={report.status} />}
      </div>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Select label="Project" name="project" defaultValue={projectId} className="min-w-[220px]">
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Switch project</Button>
        </form>
      </Card>

      {searchParams.error && <ErrorState message={searchParams.error} />}

      {report?.status === "returned" && (
        <div className="rounded-xl2 border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <div className="font-semibold">Returned for correction</div>
          <div className="mt-1">{report.returned_reason}</div>
        </div>
      )}

      {readOnly ? (
        <ReadOnlyReport report={report} labourRows={labourRows} materialRows={materialRows} photoRows={photoRows} />
      ) : (
        <form action={saveDraftReport} className="space-y-6">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="report_date" value={today} />
          <input type="hidden" name="report_id" value={report?.id ?? ""} />

          <Card>
            <h2 className="mb-3 font-bold text-ivory">Site details</h2>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Select label="Weather" name="weather" defaultValue={report?.weather ?? WEATHER_OPTIONS[0]}>
                {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
              <Select label="Stage" name="stage" defaultValue={report?.stage ?? activeProject?.current_stage ?? ""}>
                <option value="">Select stage</option>
                {STANDARD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Floor" name="floor" defaultValue={report?.floor ?? ""} placeholder="e.g. 2nd floor" />
              <Input label="Zone" name="zone" defaultValue={report?.zone ?? ""} placeholder="e.g. Grid A-C" />
            </div>
            <Textarea label="Work completed" name="work_completed" defaultValue={report?.work_completed ?? ""} placeholder="Describe today's work…" />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Input label="Quantity executed" name="quantity_executed" type="number" step="any" defaultValue={report?.quantity_executed ?? ""} />
              <Input label="Unit" name="unit" defaultValue={report?.unit ?? ""} placeholder="e.g. sqm, cum, columns" />
            </div>
            <Input label="Machinery used" name="machinery_used" defaultValue={report?.machinery_used ?? ""} />
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-ivory">Labour attendance</h2>
            <div className="space-y-2">
              {Array.from({ length: LABOUR_SLOTS }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px] gap-3">
                  <Input name={`labour_category_${i}`} placeholder="Category (Mason, Helper, …)" defaultValue={labourRows[i]?.category ?? ""} />
                  <Input name={`labour_count_${i}`} type="number" min={0} placeholder="Count" defaultValue={labourRows[i]?.count ?? ""} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-ivory">Materials received / consumed</h2>
            <div className="space-y-2">
              {Array.from({ length: MATERIAL_SLOTS }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3">
                  <Input name={`material_name_${i}`} placeholder="Material" defaultValue={materialRows[i]?.material ?? ""} />
                  <Input name={`material_received_${i}`} type="number" step="any" placeholder="Received" defaultValue={materialRows[i]?.received ?? ""} />
                  <Input name={`material_consumed_${i}`} type="number" step="any" placeholder="Consumed" defaultValue={materialRows[i]?.consumed ?? ""} />
                  <Input name={`material_unit_${i}`} placeholder="Unit" defaultValue={materialRows[i]?.unit ?? ""} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-ivory">Site notes</h2>
            <Textarea label="Quality checks" name="quality_checks" defaultValue={report?.quality_checks ?? ""} />
            <Textarea label="Site issues" name="site_issues" defaultValue={report?.site_issues ?? ""} />
            <Textarea label="Delays" name="delays" defaultValue={report?.delays ?? ""} />
            <Textarea label="Safety observations" name="safety_observations" defaultValue={report?.safety_observations ?? ""} />
            <Textarea label="Client instructions" name="client_instructions" defaultValue={report?.client_instructions ?? ""} />
            <Textarea label="Tomorrow's plan" name="tomorrow_plan" defaultValue={report?.tomorrow_plan ?? ""} />
            <Textarea label="Notes" name="notes" defaultValue={report?.notes ?? ""} />
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-ivory">Photos</h2>
            <div className="space-y-3">
              {Array.from({ length: PHOTO_SLOTS }).map((_, i) => {
                const existing = photoRows[i];
                return (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FileUpload
                        name={`photo_file_${i}`}
                        label={`Photo ${i + 1}`}
                        kind="photo"
                        helperText={existing ? "Choose a new file to replace the current photo." : undefined}
                      />
                      <Input name={`photo_caption_${i}`} label="Caption" placeholder="Caption" defaultValue={existing?.caption ?? ""} />
                    </div>
                    {existing && (
                      <div className="mt-1 text-xs text-muted">
                        Current: <a href={existing.url} target="_blank" rel="noreferrer" className="text-brand underline">{existing.caption || "view photo"}</a>
                      </div>
                    )}
                    <input type="hidden" name={`photo_existing_url_${i}`} value={existing?.url ?? ""} />
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <SubmitButton formAction={saveDraftReport} variant="outline" pendingLabel="Saving…">Save draft</SubmitButton>
            <SubmitButton formAction={submitReport} pendingLabel="Submitting…">Submit to Owner</SubmitButton>
            <Link href="/engineer" className={buttonClass("ghost")}>Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}

function ReadOnlyReport({ report, labourRows, materialRows, photoRows }: { report: any; labourRows: any[]; materialRows: any[]; photoRows: any[] }) {
  if (!report) return <EmptyState title="No report yet today" hint="Nothing was submitted for this project today." />;
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-2 text-sm text-muted">
          {report.status === "approved" ? "Approved — read only." : "Submitted — awaiting Owner review."}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Weather</div><div className="text-sm text-ink">{report.weather ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Stage</div><div className="text-sm text-ink">{report.stage ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Floor / Zone</div><div className="text-sm text-ink">{report.floor ?? "—"} · {report.zone ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Quantity executed</div><div className="text-sm text-ink">{report.quantity_executed ?? "—"} {report.unit ?? ""}</div></div>
        </div>
        <div className="mt-3 text-sm text-sandlight">{report.work_completed}</div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-ivory">Labour</h2>
          {labourRows.length === 0 ? <div className="text-sm text-muted">No labour logged.</div> : (
            <div className="space-y-1 text-sm text-sandlight">
              {labourRows.map((l: any) => <div key={l.id} className="flex justify-between"><span>{l.category}</span><span>{l.count}</span></div>)}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-ivory">Materials</h2>
          {materialRows.length === 0 ? <div className="text-sm text-muted">No materials logged.</div> : (
            <div className="space-y-1 text-sm text-sandlight">
              {materialRows.map((m: any) => <div key={m.id} className="flex justify-between"><span>{m.material}</span><span>{m.received ?? "—"} / {m.consumed ?? "—"} {m.unit}</span></div>)}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-bold text-ivory">Notes</h2>
        <div className="space-y-2 text-sm text-sandlight">
          <div><span className="text-muted">Quality checks: </span>{report.quality_checks || "—"}</div>
          <div><span className="text-muted">Site issues: </span>{report.site_issues || "—"}</div>
          <div><span className="text-muted">Delays: </span>{report.delays || "—"}</div>
          <div><span className="text-muted">Safety: </span>{report.safety_observations || "—"}</div>
          <div><span className="text-muted">Client instructions: </span>{report.client_instructions || "—"}</div>
          <div><span className="text-muted">Tomorrow&apos;s plan: </span>{report.tomorrow_plan || "—"}</div>
          <div><span className="text-muted">Notes: </span>{report.notes || "—"}</div>
        </div>
      </Card>

      {photoRows.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-ivory">Photos</h2>
          <div className="space-y-1 text-sm">
            {photoRows.map((p: any) => (
              <div key={p.id}><a href={p.url} target="_blank" rel="noreferrer" className="text-brand underline">{p.caption || p.url}</a></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
