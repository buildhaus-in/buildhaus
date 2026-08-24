// Demo stand-ins for the Postgres functions the app calls via `.rpc(...)`.
import { getDemoDB, nowIso } from "./db";
import { STANDARD_STAGES } from "@buildhaus/utils";

export async function demoRpc(name: string, params: Record<string, any> = {}): Promise<{ data: any; error: any }> {
  const db = getDemoDB();

  if (name === "next_code") {
    const scope = params.p_scope ?? "project";
    const prefix = params.p_prefix ?? "BH";
    const year = new Date().getFullYear();
    const seq = db.table("code_counters").filter((c) => c.scope === scope).length + 1;
    const code = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    db.insert("code_counters", { scope, code });
    return { data: code, error: null };
  }

  if (name === "convert_lead_to_project") {
    const leadId = params.p_lead_id;
    const lead = db.table("leads").find((l) => l.id === leadId);
    if (!lead) return { data: null, error: { message: "Lead not found" } };

    const client = db.insert("clients", {
      organisation_id: lead.organisation_id,
      full_name: lead.customer_name,
      mobile: lead.mobile,
      email: lead.email ?? null,
    });

    const { data: code } = await demoRpc("next_code", { p_org: lead.organisation_id, p_scope: "project", p_prefix: "BH" });

    const project = db.insert("projects", {
      organisation_id: lead.organisation_id,
      code,
      name: `${lead.customer_name} — ${lead.building_type ?? "Project"}`,
      client_id: client.id,
      project_type: lead.building_type ?? "residential",
      site_address: lead.site_location ?? "",
      builtup_area_sqft: lead.builtup_area_sqft ?? null,
      floors: lead.floors ?? null,
      contract_value: lead.estimated_value ?? null,
      estimated_cost: lead.estimated_value ? Math.round(lead.estimated_value * 0.82) : null,
      status: "pre_construction",
      progress: 0,
      client_visible_progress: 0,
      current_stage: STANDARD_STAGES[0],
      start_date: nowIso().slice(0, 10),
    });

    STANDARD_STAGES.forEach((stageName, i) => {
      db.insert("project_stages", {
        project_id: project.id,
        seq: i + 1,
        name: stageName,
        status: "not_started",
        progress: 0,
        client_visible: true,
      });
    });

    db.updateWhere("leads", (l) => l.id === leadId, { stage: "won", converted_project_id: project.id });

    return { data: { project_id: project.id, client_id: client.id }, error: null };
  }

  return { data: null, error: { message: `Demo Mode: no handler for rpc "${name}"` } };
}
