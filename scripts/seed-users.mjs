// ============================================================================
// Buildhaus · scripts/seed-users.mjs
// ----------------------------------------------------------------------------
// Creates the four demo logins, links profiles + roles, and migrates the
// original "Sunil Reddy villa" prototype demo into the real schema so you can
// sign in and immediately see live data.
//
//   node scripts/seed-users.mjs
//
// Requires in .env(.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Run AFTER migrations + seed.sql.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env loader (no dependency): reads .env.local then .env
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
const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ORG = "00000000-0000-0000-0000-0000000000b1";

const USERS = [
  { email: "owner@buildhaus.example",    password: "Buildhaus#Owner1",    name: "Samanth (Owner)",  role: "owner" },
  { email: "engineer@buildhaus.example", password: "Buildhaus#Engineer1", name: "Murali Krishna",   role: "site_engineer" },
  { email: "architect@buildhaus.example",password: "Buildhaus#Architect1",name: "Priya (Architect)",role: "architect" },
  { email: "client@buildhaus.example",   password: "Buildhaus#Client1",   name: "Sunil Reddy",      role: "client" },
];

async function roleId(key) {
  const { data } = await db.from("roles").select("id").eq("organisation_id", ORG).eq("key", key).maybeSingle();
  return data?.id;
}

async function ensureUser(u) {
  // Try to create; if it already exists, look it up.
  let userId;
  const { data, error } = await db.auth.admin.createUser({
    email: u.email, password: u.password, email_confirm: true,
    user_metadata: { full_name: u.name },
  });
  if (error) {
    const { data: list } = await db.auth.admin.listUsers();
    userId = list.users.find((x) => x.email === u.email)?.id;
    if (!userId) throw error;
    console.log(`  • exists: ${u.email}`);
  } else {
    userId = data.user.id;
    console.log(`  • created: ${u.email}`);
  }

  await db.from("profiles").upsert({ id: userId, organisation_id: ORG, full_name: u.name });
  const rid = await roleId(u.role);
  if (rid) {
    const { data: existing } = await db.from("user_roles")
      .select("id").eq("profile_id", userId).eq("role_id", rid).maybeSingle();
    if (!existing) await db.from("user_roles").insert({ profile_id: userId, role_id: rid });
  }
  return userId;
}

async function main() {
  console.log("Seeding demo users…");
  const ids = {};
  for (const u of USERS) ids[u.role] = await ensureUser(u);

  console.log("Migrating the Sunil Reddy villa demo project…");

  // Client record (link to the client login).
  let { data: client } = await db.from("clients")
    .select("id").eq("organisation_id", ORG).eq("full_name", "Sunil Reddy").maybeSingle();
  if (!client) {
    const { data } = await db.from("clients").insert({
      organisation_id: ORG, profile_id: ids.client, full_name: "Sunil Reddy",
      phone: "+91 98480 00000", city: "Nellore", state: "Andhra Pradesh",
    }).select("id").single();
    client = data;
  } else {
    await db.from("clients").update({ profile_id: ids.client }).eq("id", client.id);
  }

  // Project (reuse by code if present).
  let { data: project } = await db.from("projects")
    .select("id").eq("organisation_id", ORG).eq("code", "BH-2026-0001").maybeSingle();
  if (!project) {
    const { data } = await db.from("projects").insert({
      organisation_id: ORG, code: "BH-2026-0001",
      name: "Sunil Reddy G+2 Duplex Villa", client_id: client.id,
      site_address: "Kotha Kalava, Nellore", project_type: "duplex",
      builtup_area_sqft: 4396, floors: 3, package: "Premium",
      contract_value: 10500000, estimated_cost: 8900000,
      status: "under_construction", progress: 42, client_visible_progress: 40,
      current_stage: "RCC structure",
      start_date: "2025-09-01", planned_completion: "2026-08-15",
    }).select("id").single();
    project = data;
  }

  // Assign engineer + architect (project_members spine).
  for (const [role, pid] of [["site_engineer", ids.site_engineer], ["architect", ids.architect]]) {
    const { data: exists } = await db.from("project_members")
      .select("id").eq("project_id", project.id).eq("profile_id", pid).eq("role_key", role).maybeSingle();
    if (!exists) await db.from("project_members")
      .insert({ project_id: project.id, profile_id: pid, role_key: role });
  }

  // 25 standard stages if none.
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

  // A few tasks for the engineer.
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

  // Materials snapshot.
  const { count: matCount } = await db.from("project_materials")
    .select("*", { count: "exact", head: true }).eq("project_id", project.id);
  if (!matCount) {
    await db.from("project_materials").insert([
      { project_id: project.id, name: "OPC 53 Cement", unit: "bags", required_qty: 2400, received_qty: 1200, consumed_qty: 980, estimated_cost: 912000, actual_cost: 456000 },
      { project_id: project.id, name: "Fe550D Steel", unit: "MT", required_qty: 22, received_qty: 12, consumed_qty: 9.5, estimated_cost: 1496000, actual_cost: 816000 },
      { project_id: project.id, name: "M-Sand", unit: "units", required_qty: 60, received_qty: 30, consumed_qty: 24, estimated_cost: 210000, actual_cost: 105000 },
    ]);
  }

  // Payment schedule (client-visible).
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
      { organisation_id: ORG, project_id: project.id, direction: "inbound", party_type: "client", amount: 1050000, paid_on: "2025-09-01", mode: "bank" },
      { organisation_id: ORG, project_id: project.id, direction: "inbound", party_type: "client", amount: 2100000, paid_on: "2025-11-14", mode: "bank" },
      { organisation_id: ORG, project_id: project.id, direction: "outbound", party_type: "supplier", amount: 456000, paid_on: "2025-12-02", mode: "bank" },
    ]);
    // Invoices + receipts so the client Payment summary (Invoiced / Paid /
    // Outstanding) is internally consistent for the demo.
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
      { project_id: project.id, invoice_id: inv1?.id, amount: 1050000, received_on: "2025-09-01", mode: "bank" },
      { project_id: project.id, invoice_id: inv2?.id, amount: 2100000, received_on: "2025-11-14", mode: "bank" },
    ]);
  }

  console.log("\nDone. Demo logins (change these after first sign-in):");
  for (const u of USERS) console.log(`  ${u.role.padEnd(14)} ${u.email}  /  ${u.password}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
