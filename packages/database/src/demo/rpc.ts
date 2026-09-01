// Demo stand-ins for the Postgres functions the app calls via `.rpc(...)`.
import { cookies } from "next/headers";
import { getDemoDB, nowIso } from "./db";
import { STANDARD_STAGES } from "@buildhaus/utils";
import { findById } from "./users";

const SESSION_COOKIE = "bh_demo_session";

// Where each next_code() scope's already-issued codes live, so a fresh
// scan can tell what's actually in use — see the next_code handler below.
const CODE_SOURCE: Record<string, { table: string; column: string }> = {
  project: { table: "projects", column: "code" },
  quotation: { table: "quotations", column: "quotation_no" },
  lead: { table: "leads", column: "lead_no" },
};

export async function demoRpc(name: string, params: Record<string, any> = {}): Promise<{ data: any; error: any }> {
  const db = getDemoDB();

  if (name === "next_code") {
    const scope = params.p_scope ?? "project";
    const prefix = params.p_prefix ?? "BH";
    const year = new Date().getFullYear();

    // Real Postgres (0011_triggers_functions.sql's next_code()) can safely
    // count purely off `code_counters` because every row is created through
    // this same function. Demo Mode's seed data instead inserts sample
    // projects/leads/quotations with hardcoded codes (demo/seed.ts) without
    // ever touching code_counters, so the counter started at 0 while the
    // table already had codes 0001..000N. The first real call then handed
    // out "BH-2026-0001" again — a duplicate of the seeded project, which
    // silently collides with the real schema's `unique(organisation_id,
    // code)` constraint.
    //
    // Fix: take the max of (a) the highest "PREFIX-YEAR-####" sequence
    // already present on the live table this scope names, and (b) the
    // highest sequence this function has itself handed out before (stored
    // as `seq` on each code_counters row, mirroring real Postgres's
    // `last_no`) — every call, not just the first. (a) alone reconciles
    // with pre-existing/seeded rows; (b) alone is what keeps calls 2, 3, …
    // correct once next_code starts running ahead of the table (a new code
    // is only written back into its target table by a later, separate
    // insert — never by next_code itself).
    const source = CODE_SOURCE[scope];
    let maxSeq = 0;
    if (source) {
      const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      for (const row of db.table(source.table)) {
        const m = re.exec(String(row[source.column] ?? ""));
        if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
      }
    }
    for (const c of db.table("code_counters")) {
      if (c.scope === scope && typeof c.seq === "number") maxSeq = Math.max(maxSeq, c.seq);
    }
    const seq = maxSeq + 1;
    const code = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    db.insert("code_counters", { scope, seq, code });
    return { data: code, error: null };
  }

  // Demo stand-in for public.log_audit(p_action, p_entity_type, p_entity_id,
  // p_summary, p_diff). Real Postgres derives organisation_id/actor_id from
  // the authenticated session (current_org_id()/auth.uid()); Demo Mode has
  // no Postgres session, so this resolves the same thing from the demo
  // session cookie, keeping the call signature identical for callers either
  // way.
  if (name === "log_audit") {
    const uid = cookies().get(SESSION_COOKIE)?.value;
    const actor = uid ? findById(uid) : undefined;
    const profile = actor ? db.table("profiles").find((p) => p.id === actor.id) : undefined;
    db.insert("audit_logs", {
      organisation_id: profile?.organisation_id ?? null,
      actor_id: actor?.id ?? null,
      action: params.p_action ?? null,
      entity_type: params.p_entity_type ?? null,
      entity_id: params.p_entity_id ?? null,
      summary: params.p_summary ?? null,
      diff: params.p_diff ?? null,
    });
    return { data: null, error: null };
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
