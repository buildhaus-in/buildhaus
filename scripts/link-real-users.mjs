// ============================================================================
// Buildhaus · scripts/link-real-users.mjs
// ----------------------------------------------------------------------------
// This Supabase project already had four real accounts created for the four
// app roles before this script ever ran (real @buildhaus.in emails, not the
// placeholder @buildhaus.example demo logins scripts/seed-users.mjs creates)
// — confirmed by their user_metadata.full_name each ending in "— <Role>",
// and all four having genuine last_sign_in_at timestamps. This script links
// THOSE existing accounts to profiles/roles and the sample project data,
// instead of creating new placeholder ones. It never creates a user and
// never touches anyone's password — look-up only.
//
// Two other accounts already exist in this project (prasanna@buildhaus.in,
// preetham.family@buildhaus.in) with no role suffix in their name — left
// alone entirely; nothing here touches them.
//
//   node scripts/link-real-users.mjs
//
// Requires in .env(.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Run AFTER migrations + seed.sql (supabase/seed.sql — provides the ORG row
// and the roles catalogue this script looks up by key).
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
// Node 18's global fetch has no WebSocket constructor, which
// @supabase/supabase-js's realtime client requires even though this script
// never subscribes to anything — without this it throws "Node.js 18
// detected without native WebSocket support" before any seeding logic runs.
import ws from "ws";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(f, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});
const ORG = "00000000-0000-0000-0000-0000000000b1";

// Real email -> app role, matched from each account's own user_metadata.full_name.
const REAL_USERS = [
  { email: "samanthreddy.nalagatla@buildhaus.in", role: "owner",        label: "Owner" },
  { email: "murali@buildhaus.in",                 role: "site_engineer",label: "Site Engineer" },
  { email: "sahithi@buildhaus.in",                role: "architect",    label: "Architect" },
  { email: "sunilreddy@buildhaus.in",              role: "client",       label: "Client" },
];

async function roleId(key) {
  const { data } = await db.from("roles").select("id").eq("organisation_id", ORG).eq("key", key).maybeSingle();
  return data?.id;
}

async function findAuthUser(email) {
  // listUsers() has no reliable server-side email filter in this SDK
  // version (confirmed empirically — a ?email= query param is ignored), so
  // fetch the full page and match client-side. Fine at this project's scale.
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email);
}

async function linkUser(u) {
  const authUser = await findAuthUser(u.email);
  if (!authUser) {
    console.log(`  ✗ NOT FOUND: ${u.email} (${u.label}) — expected this to already exist. Skipping.`);
    return null;
  }
  const userId = authUser.id;
  const fullName = (authUser.user_metadata?.full_name || u.label).replace(/\s*—\s*.+$/, "").trim();

  await db.from("profiles").upsert({ id: userId, organisation_id: ORG, full_name: fullName });
  const rid = await roleId(u.role);
  if (rid) {
    const { data: existing } = await db.from("user_roles")
      .select("id").eq("profile_id", userId).eq("role_id", rid).maybeSingle();
    if (!existing) await db.from("user_roles").insert({ profile_id: userId, role_id: rid });
  }
  console.log(`  • linked: ${u.email} → ${u.label} (${fullName})`);
  return userId;
}

async function main() {
  console.log("Linking real accounts to profiles/roles…");
  const ids = {};
  for (const u of REAL_USERS) {
    const id = await linkUser(u);
    if (!id) {
      console.error(`\nAborting: ${u.email} wasn't found. Nothing after this point ran.`);
      process.exit(1);
    }
    ids[u.role] = id;
  }

  console.log("Migrating the Sunil Reddy villa demo project…");

  let { data: client } = await db.from("clients")
    .select("id").eq("organisation_id", ORG).eq("profile_id", ids.client).maybeSingle();
  if (!client) {
    const { data, error } = await db.from("clients").insert({
      organisation_id: ORG, profile_id: ids.client, full_name: "Sunil Reddy",
      mobile: "+91 98480 00000", city: "Nellore", state: "Andhra Pradesh",
    }).select("id").single();
    if (error) throw error;
    client = data;
  }

  let { data: project } = await db.from("projects")
    .select("id").eq("organisation_id", ORG).eq("code", "BH-2026-0001").maybeSingle();
  if (!project) {
    const { data, error } = await db.from("projects").insert({
      organisation_id: ORG, code: "BH-2026-0001",
      name: "Sunil Reddy G+2 Duplex Villa", client_id: client.id,
      site_address: "Kotha Kalava, Nellore", project_type: "duplex",
      builtup_area_sqft: 4396, floors: 3, package: "Premium",
      contract_value: 10500000, estimated_cost: 8900000,
      status: "under_construction", progress: 42, client_visible_progress: 40,
      current_stage: "RCC structure",
      start_date: "2025-09-01", planned_completion: "2026-08-15",
    }).select("id").single();
    if (error) throw error;
    project = data;
  }

  for (const [role, pid] of [["site_engineer", ids.site_engineer], ["architect", ids.architect]]) {
    const { data: exists } = await db.from("project_members")
      .select("id").eq("project_id", project.id).eq("profile_id", pid).eq("role_key", role).maybeSingle();
    if (!exists) await db.from("project_members")
      .insert({ project_id: project.id, profile_id: pid, role_key: role });
  }

  const { count: stageCount } = await db.from("project_stages")
    .select("*", { count: "exact", head: true }).eq("project_id", project.id);
  if (!stageCount) {
    const names = ["Requirement collection","Survey","Soil testing","Architectural design","Structural design",
      "Approvals","Site mobilisation","Excavation","Foundation","Plinth","RCC structure","Masonry",
      "Internal plastering","External plastering","Waterproofing","Plumbing","Electrical","Flooring",
      "Doors and windows","Painting","Fixtures","Elevation","External works","Snagging","Handover"];
    const rows = names.map((name, i) => {
      const seq = i + 1;
      const status = seq < 11 ? "completed" : seq === 11 ? "in_progress" : "not_started";
      const progress = seq < 11 ? 100 : seq === 11 ? 55 : 0;
      return { project_id: project.id, seq, name, status, progress, client_visible: true };
    });
    await db.from("project_stages").insert(rows);
  }

  const { count: taskCount } = await db.from("tasks")
    .select("*", { count: "exact", head: true }).eq("project_id", project.id);
  if (!taskCount) {
    await db.from("tasks").insert([
      { project_id: project.id, title: "2nd floor slab shuttering", floor: "2nd", status: "in_progress",
        progress: 60, priority: "high", site_engineer_id: ids.site_engineer, due_date: "2026-07-18" },
      { project_id: project.id, title: "Column steel — grid C", floor: "2nd", status: "assigned",
        progress: 0, priority: "medium", site_engineer_id: ids.site_engineer, due_date: "2026-07-20" },
      { project_id: project.id, title: "Ground floor brickwork QC", floor: "GF", status: "completed",
        progress: 100, priority: "medium", site_engineer_id: ids.site_engineer },
    ]);
  }

  const { count: matCount } = await db.from("project_materials")
    .select("*", { count: "exact", head: true }).eq("project_id", project.id);
  if (!matCount) {
    await db.from("project_materials").insert([
      { project_id: project.id, name: "OPC 53 Cement", unit: "bags", required_qty: 2400, received_qty: 1200, consumed_qty: 980, estimated_cost: 912000, actual_cost: 456000 },
      { project_id: project.id, name: "Fe550D Steel", unit: "MT", required_qty: 22, received_qty: 12, consumed_qty: 9.5, estimated_cost: 1496000, actual_cost: 816000 },
      { project_id: project.id, name: "M-Sand", unit: "units", required_qty: 60, received_qty: 30, consumed_qty: 24, estimated_cost: 210000, actual_cost: 105000 },
    ]);
  }

  const { count: payCount } = await db.from("client_payment_schedules")
    .select("*", { count: "exact", head: true }).eq("project_id", project.id);
  if (!payCount) {
    await db.from("client_payment_schedules").insert([
      { project_id: project.id, milestone: "Booking advance", percent: 10, amount: 1050000, due_date: "2025-09-01", status: "paid" },
      { project_id: project.id, milestone: "Foundation complete", percent: 20, amount: 2100000, due_date: "2025-11-15", status: "paid" },
      { project_id: project.id, milestone: "RCC structure complete", percent: 30, amount: 3150000, due_date: "2026-03-01", status: "invoiced" },
      { project_id: project.id, milestone: "Finishing", percent: 30, amount: 3150000, due_date: "2026-06-15", status: "pending" },
      { project_id: project.id, milestone: "Handover", percent: 10, amount: 1050000, due_date: "2026-08-15", status: "pending" },
    ]);
    await db.from("payments").insert([
      { organisation_id: ORG, project_id: project.id, direction: "inbound", party_type: "client", amount: 1050000, payment_date: "2025-09-01", mode: "bank" },
      { organisation_id: ORG, project_id: project.id, direction: "inbound", party_type: "client", amount: 2100000, payment_date: "2025-11-14", mode: "bank" },
      { organisation_id: ORG, project_id: project.id, direction: "outbound", party_type: "supplier", amount: 456000, payment_date: "2025-12-02", mode: "bank" },
    ]);
    const { data: inv1 } = await db.from("client_invoices").insert(
      { project_id: project.id, invoice_no: "INV-0001", amount: 1050000, invoice_date: "2025-09-01", status: "paid" }
    ).select("id").single();
    const { data: inv2 } = await db.from("client_invoices").insert(
      { project_id: project.id, invoice_no: "INV-0002", amount: 2100000, invoice_date: "2025-11-10", status: "paid" }
    ).select("id").single();
    await db.from("client_invoices").insert(
      { project_id: project.id, invoice_no: "INV-0003", amount: 3150000, invoice_date: "2026-03-01", status: "unpaid" }
    );
    await db.from("client_receipts").insert([
      { project_id: project.id, invoice_id: inv1?.id, amount: 1050000, receipt_date: "2025-09-01", mode: "bank" },
      { project_id: project.id, invoice_id: inv2?.id, amount: 2100000, receipt_date: "2025-11-14", mode: "bank" },
    ]);
  }

  console.log("\nDone. Sign in at /login with each person's existing real email + their own password:");
  for (const u of REAL_USERS) console.log(`  ${u.role.padEnd(14)} ${u.email}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
