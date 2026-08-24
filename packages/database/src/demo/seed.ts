import { IDS } from "./ids";
import { STANDARD_STAGES } from "@buildhaus/utils";
import type { Row } from "./db";

// Realistic Demo Mode dataset for Buildhaus. Column names mirror the real
// Supabase schema (supabase/migrations/*.sql) so switching to a live project
// later is a data-source swap, not a rewrite. Extend this file (and
// relations.ts, if you add an embedded select) whenever a new screen needs an
// entity or field that isn't here yet — don't invent a parallel data source.

function isoDaysFromNow(days: number): string {
  // Anchored to a fixed "today" (not Date.now()) so every server render and
  // every reader of this file sees identical, reproducible seed dates.
  const base = new Date("2026-07-14T00:00:00Z").getTime();
  return new Date(base + days * 86400000).toISOString();
}
function dateOnly(days: number): string {
  return isoDaysFromNow(days).slice(0, 10);
}

function buildStages(projectId: string, doneCount: number, inProgressPct: number): Row[] {
  return STANDARD_STAGES.map((name, i) => {
    const seq = i + 1;
    if (i < doneCount) return { id: `${projectId}-stage-${seq}`, project_id: projectId, seq, name, status: "completed", progress: 100, client_visible: true };
    if (i === doneCount) return { id: `${projectId}-stage-${seq}`, project_id: projectId, seq, name, status: "in_progress", progress: inProgressPct, client_visible: true };
    return { id: `${projectId}-stage-${seq}`, project_id: projectId, seq, name, status: "not_started", progress: 0, client_visible: true };
  });
}

// General inclusions/exclusions common to every construction package, from
// the official Buildhaus Pricing Catalog v2. Every package also ships with an
// open itemised BOQ before agreement and a single point of contact.
const GENERAL_INCLUSIONS: string[] = [
  "Structural construction",
  "Standard masonry & plastering",
  "Flooring & wall tiles as per package",
  "Kitchen platform & basic finish scope",
  "Bathroom fixtures as per package",
  "Doors & windows as per package",
  "Internal & external painting as per package",
  "Electrical wiring & switches as per package",
  "Standard plumbing points",
  "Underground sump, septic tank, compound wall & entrance gate (standard MS finish)",
  "Open itemised BOQ before agreement",
  "Single point of contact throughout the project",
];

const GENERAL_EXCLUSIONS: string[] = [
  "Land cost",
  "Government approvals, statutory fees, registration & legal charges",
  "Soil test charges",
  "Architectural & structural consultancy fees (unless separately included)",
  "Borewell",
  "Lift & lift-related works",
  "Transformer / special electrical infrastructure",
  "External development beyond standard scope",
  "Interior furniture, wardrobes, modular kitchen & loose furniture",
  "Special elevation cladding & decorative facades",
  "Premium lighting fixtures, chandeliers, appliances & smart-home systems",
  "Rock cutting, abnormal excavation, difficult soil or water-logging conditions",
  "Additional foundation cost from site-specific engineering",
  "Transport escalation for remote locations",
];

export const SEED: Record<string, Row[]> = {
  organisations: [
    { id: IDS.org, name: "Buildhaus Constructions", city: "Nellore", state: "Andhra Pradesh" },
  ],

  organisation_settings: [
    { id: "org-settings-1", organisation_id: IDS.org, currency: "INR", timezone: "Asia/Kolkata" },
  ],

  roles: [
    { id: IDS.roleOwner, organisation_id: IDS.org, key: "owner", label: "Owner" },
    { id: IDS.roleEngineer, organisation_id: IDS.org, key: "site_engineer", label: "Site Engineer" },
    { id: IDS.roleArchitect, organisation_id: IDS.org, key: "architect", label: "Architect" },
    { id: IDS.roleClient, organisation_id: IDS.org, key: "client", label: "Client" },
  ],

  permissions: [
    { id: "perm-finance-view", key: "finance.view" },
    { id: "perm-finance-edit", key: "finance.edit" },
    { id: "perm-projects-manage", key: "projects.manage" },
    { id: "perm-users-manage", key: "users.manage" },
    { id: "perm-suppliers-view", key: "suppliers.view" },
    { id: "perm-reports-approve", key: "reports.approve" },
    { id: "perm-drawings-approve", key: "drawings.approve" },
  ],

  role_permissions: [
    { id: "rp-1", role_id: IDS.roleOwner, permission_id: "perm-finance-view" },
    { id: "rp-2", role_id: IDS.roleOwner, permission_id: "perm-finance-edit" },
    { id: "rp-3", role_id: IDS.roleOwner, permission_id: "perm-projects-manage" },
    { id: "rp-4", role_id: IDS.roleOwner, permission_id: "perm-users-manage" },
    { id: "rp-5", role_id: IDS.roleOwner, permission_id: "perm-suppliers-view" },
    { id: "rp-6", role_id: IDS.roleOwner, permission_id: "perm-reports-approve" },
    { id: "rp-7", role_id: IDS.roleOwner, permission_id: "perm-drawings-approve" },
  ],

  profiles: [
    { id: IDS.profileOwner, organisation_id: IDS.org, full_name: "Samanth", avatar_url: null, phone: "+91 90000 10001" },
    { id: IDS.profileEngineer, organisation_id: IDS.org, full_name: "Murali Krishna", avatar_url: null, phone: "+91 90000 10002" },
    { id: IDS.profileArchitect, organisation_id: IDS.org, full_name: "Priya", avatar_url: null, phone: "+91 90000 10003" },
    { id: IDS.profileClient, organisation_id: IDS.org, full_name: "Sunil Reddy", avatar_url: null, phone: "+91 90000 10004" },
  ],

  user_roles: [
    { id: "ur-1", profile_id: IDS.profileOwner, role_id: IDS.roleOwner },
    { id: "ur-2", profile_id: IDS.profileEngineer, role_id: IDS.roleEngineer },
    { id: "ur-3", profile_id: IDS.profileArchitect, role_id: IDS.roleArchitect },
    { id: "ur-4", profile_id: IDS.profileClient, role_id: IDS.roleClient },
  ],

  clients: [
    { id: IDS.clientSunil, organisation_id: IDS.org, profile_id: IDS.profileClient, full_name: "Sunil Reddy", mobile: "+91 90000 20001", email: "sunil.reddy@example.com" },
    { id: "client-anitha", organisation_id: IDS.org, profile_id: null, full_name: "Anitha", mobile: "+91 90000 20002", email: "anitha@example.com" },
    { id: "client-venkat", organisation_id: IDS.org, profile_id: null, full_name: "Venkat Rao", mobile: "+91 90000 20003", email: "venkat.rao@example.com" },
  ],

  projects: [
    {
      id: IDS.projectVilla, organisation_id: IDS.org, code: "BH-2026-0001",
      name: "Sunil Reddy G+2 Duplex Villa", client_id: IDS.clientSunil,
      project_type: "duplex", site_address: "Kotha Kalava, Nellore",
      status: "under_construction", progress: 42, client_visible_progress: 40,
      current_stage: "RCC structure", start_date: "2025-09-01", planned_completion: "2026-08-15",
      contract_value: 10500000, estimated_cost: 8900000, builtup_area_sqft: 4396, floors: 3,
    },
    {
      id: IDS.projectDuplex, organisation_id: IDS.org, code: "BH-2026-0002",
      name: "Anitha Residence — Duplex", client_id: "client-anitha",
      project_type: "duplex", site_address: "Dargamitta, Nellore",
      status: "under_construction", progress: 48, client_visible_progress: 45,
      current_stage: "Masonry", start_date: "2026-02-01", planned_completion: "2026-11-30",
      contract_value: 7200000, estimated_cost: 6100000, builtup_area_sqft: 3200, floors: 2,
    },
    {
      id: IDS.projectCommercial, organisation_id: IDS.org, code: "BH-2026-0003",
      name: "Venkat Commercial Complex", client_id: "client-venkat",
      project_type: "commercial", site_address: "Trunk Road, Nellore",
      status: "under_construction", progress: 24, client_visible_progress: 20,
      current_stage: "Foundation", start_date: "2026-05-01", planned_completion: "2027-02-20",
      contract_value: 18500000, estimated_cost: 15200000, builtup_area_sqft: 8000, floors: 4,
    },
  ],

  project_members: [
    { id: "pm-1", project_id: IDS.projectVilla, profile_id: IDS.profileEngineer, role_key: "site_engineer" },
    { id: "pm-2", project_id: IDS.projectVilla, profile_id: IDS.profileArchitect, role_key: "architect" },
    { id: "pm-3", project_id: IDS.projectDuplex, profile_id: IDS.profileEngineer, role_key: "site_engineer" },
    { id: "pm-4", project_id: IDS.projectCommercial, profile_id: IDS.profileArchitect, role_key: "architect" },
  ],

  project_stages: [
    ...buildStages(IDS.projectVilla, 10, 55),
    ...buildStages(IDS.projectDuplex, 11, 40),
    ...buildStages(IDS.projectCommercial, 8, 30),
  ],

  tasks: [
    {
      id: "task-1", project_id: IDS.projectVilla, title: "2nd floor slab shuttering",
      description: "Shutter and prop the 2nd floor slab per structural drawing S-101 rev 1 before steel fixing.",
      status: "in_progress", priority: "high", progress: 60,
      site_engineer_id: IDS.profileEngineer, stage: "RCC structure", floor: "2nd floor", zone: "Grid A-C",
      drawing_ref: "S-101 Rev 1", dimensions: "42ft x 28ft slab, 5in thickness",
      start_date: dateOnly(-4), due_date: dateOnly(4),
      checklist: [
        { label: "Props and staging erected", done: true },
        { label: "Shuttering plywood laid", done: true },
        { label: "Level and camber checked", done: false },
        { label: "Owner sign-off on shuttering", done: false },
      ],
      owner_instructions: "Double-check camber at mid-span before steel — last slab had minor sag.",
    },
    {
      id: "task-2", project_id: IDS.projectVilla, title: "Column steel — grid C",
      description: "Fix reinforcement cage for columns on grid line C, ground to 1st floor.",
      status: "assigned", priority: "medium", progress: 0,
      site_engineer_id: IDS.profileEngineer, stage: "RCC structure", floor: "Ground floor", zone: "Grid C",
      drawing_ref: "S-100 Rev 2", dimensions: "9in x 12in columns, 8 nos",
      start_date: dateOnly(2), due_date: dateOnly(7),
      checklist: [
        { label: "Steel delivered to site", done: true },
        { label: "Cage fabricated", done: false },
        { label: "Cover blocks placed", done: false },
      ],
      owner_instructions: "",
    },
    {
      id: "task-3", project_id: IDS.projectVilla, title: "Terrace waterproofing",
      description: "Brick-bat coba waterproofing on terrace slab before parapet work.",
      status: "submitted", priority: "medium", progress: 100,
      site_engineer_id: IDS.profileEngineer, stage: "Waterproofing", floor: "Terrace", zone: "Full terrace",
      drawing_ref: "—", dimensions: "1,450 sqft",
      start_date: dateOnly(-10), due_date: dateOnly(-2),
      checklist: [
        { label: "Surface cleaned & primed", done: true },
        { label: "Brick-bat coba laid to slope", done: true },
        { label: "Ponding test done", done: true },
      ],
      owner_instructions: "Submitted for review — awaiting Owner sign-off.",
    },
    {
      id: "task-4", project_id: IDS.projectDuplex, title: "Brick masonry — ground floor",
      description: "9in external walls, 4.5in internal partitions per architectural plan.",
      status: "in_progress", priority: "high", progress: 40,
      site_engineer_id: IDS.profileEngineer, stage: "Masonry", floor: "Ground floor", zone: "Full floor",
      drawing_ref: "A-101 Rev 1", dimensions: "—",
      start_date: dateOnly(-6), due_date: dateOnly(6),
      checklist: [
        { label: "External walls up to lintel", done: true },
        { label: "Internal partitions started", done: false },
      ],
      owner_instructions: "",
    },
    {
      id: "task-5", project_id: IDS.projectDuplex, title: "Door frame fixing",
      description: "Fix main door and bedroom door frames per joinery schedule.",
      status: "blocked", priority: "low", progress: 10,
      site_engineer_id: IDS.profileEngineer, stage: "Doors and windows", floor: "Ground floor", zone: "—",
      drawing_ref: "—", dimensions: "—",
      start_date: dateOnly(-2), due_date: dateOnly(10),
      checklist: [{ label: "Frames delivered", done: false }],
      owner_instructions: "",
      blocker_reason: "Waiting on frame delivery from supplier — material request MR-2 raised.",
    },
  ],

  task_comments: [
    { id: "tc-1", task_id: "task-1", author_id: IDS.profileOwner, body: "Looks good — watch the mid-span camber like I flagged.", created_at: isoDaysFromNow(-1) },
    { id: "tc-2", task_id: "task-3", author_id: IDS.profileEngineer, body: "Ponding test held 24 hrs with no leaks. Ready for review.", created_at: isoDaysFromNow(-2) },
  ],

  leads: [
    {
      id: "lead-1", organisation_id: IDS.org, customer_name: "Ramesh Kumar", mobile: "+91 90000 30001", email: "ramesh.kumar@example.com",
      site_location: "Podalakur Road, Nellore", building_type: "independent_house", plot_size: "40x60", builtup_area_sqft: 2800, floors: 2,
      estimated_value: 5600000, enquiry_date: dateOnly(-3), follow_up_date: dateOnly(1), stage: "new_enquiry",
      notes: "Wants to start after Dasara. Budget-sensitive.", source: "website",
    },
    {
      id: "lead-2", organisation_id: IDS.org, customer_name: "Lakshmi Devi", mobile: "+91 90000 30002", email: null,
      site_location: "Vedayapalem, Nellore", building_type: "apartment", plot_size: "50x80", builtup_area_sqft: 12000, floors: 4,
      estimated_value: 21000000, enquiry_date: dateOnly(-1), follow_up_date: dateOnly(3), stage: "new_enquiry",
      notes: "G+3 apartment, referred by Sunil Reddy.", source: "referral",
    },
    {
      id: "lead-3", organisation_id: IDS.org, customer_name: "Farooq Traders", mobile: "+91 90000 30003", email: "farooq@example.com",
      site_location: "Industrial Estate, Nellore", building_type: "warehouse", plot_size: "100x150", builtup_area_sqft: 18000, floors: 1,
      estimated_value: 26000000, enquiry_date: dateOnly(-9), follow_up_date: dateOnly(-2), stage: "site_visit_scheduled",
      notes: "Site visit fixed for next week.", source: "instant_quotation",
    },
    {
      id: "lead-4", organisation_id: IDS.org, customer_name: "Divya Sree", mobile: "+91 90000 30004", email: "divya.sree@example.com",
      site_location: "Stonehousepet, Nellore", building_type: "villa", plot_size: "35x55", builtup_area_sqft: 3400, floors: 2,
      estimated_value: 8160000, enquiry_date: dateOnly(-20), follow_up_date: dateOnly(-14), stage: "quoted",
      notes: "Quotation sent, awaiting decision.", source: "instant_quotation",
    },
    {
      id: "lead-5", organisation_id: IDS.org, customer_name: "Old Client Co.", mobile: "+91 90000 30005", email: null,
      site_location: "Nellore", building_type: "commercial", plot_size: "—", builtup_area_sqft: 5000, floors: 2,
      estimated_value: 9000000, enquiry_date: dateOnly(-60), follow_up_date: null, stage: "lost",
      notes: "Went with another contractor over timeline.", source: "manual",
    },
  ],

  lead_activities: [
    { id: "la-1", lead_id: "lead-1", type: "note", note: "First call — interested, wants a callback next week.", created_at: isoDaysFromNow(-3) },
    { id: "la-2", lead_id: "lead-3", type: "site_visit", note: "Site visit scheduled with Owner.", created_at: isoDaysFromNow(-2) },
    { id: "la-3", lead_id: "lead-4", type: "quotation_sent", note: "Instant quotation BH-Q-1004 sent by email.", created_at: isoDaysFromNow(-14) },
  ],

  site_visits: [
    { id: "sv-1", lead_id: "lead-3", scheduled_date: dateOnly(5), status: "scheduled", notes: "Bring topo survey team." },
  ],

  daily_reports: [
    {
      id: "dr-1", project_id: IDS.projectVilla, engineer_id: IDS.profileEngineer, report_date: dateOnly(0),
      status: "draft", weather: "Sunny", stage: "RCC structure", floor: "2nd floor", zone: "Grid A-C",
      work_completed: "Shuttering for 2nd floor slab, 70% complete.", quantity_executed: 30, unit: "sqm",
      machinery_used: "Concrete mixer, vibrator", quality_checks: "Level checked with dumpy.",
      site_issues: "", delays: "", safety_observations: "All workers wore helmets.",
      client_instructions: "", tomorrow_plan: "Finish shuttering, start steel binding.", notes: "",
      client_visible: false, returned_reason: null, submitted_at: null, approved_at: null,
    },
    {
      id: "dr-2", project_id: IDS.projectVilla, engineer_id: IDS.profileEngineer, report_date: dateOnly(-1),
      status: "submitted", weather: "Cloudy", stage: "RCC structure", floor: "2nd floor", zone: "Grid A-C",
      work_completed: "Column steel binding for grid A, B completed.", quantity_executed: 12, unit: "columns",
      machinery_used: "—", quality_checks: "Cover blocks placed per spec.",
      site_issues: "Minor rebar delivery delay in the afternoon.", delays: "2 hours",
      safety_observations: "Safety briefing conducted.", client_instructions: "",
      tomorrow_plan: "Start grid C steel.", notes: "",
      client_visible: false, returned_reason: null, submitted_at: isoDaysFromNow(-1), approved_at: null,
    },
    {
      id: "dr-3", project_id: IDS.projectVilla, engineer_id: IDS.profileEngineer, report_date: dateOnly(-2),
      status: "approved", weather: "Sunny", stage: "Waterproofing", floor: "Terrace", zone: "Full terrace",
      work_completed: "Terrace waterproofing ponding test completed successfully.", quantity_executed: 1450, unit: "sqft",
      machinery_used: "—", quality_checks: "24-hour ponding test held, no leaks.",
      site_issues: "", delays: "", safety_observations: "No incidents.",
      client_instructions: "Client asked for photos — shared over WhatsApp.", tomorrow_plan: "Begin parapet wall.",
      notes: "Great result, no seepage.", client_visible: true, returned_reason: null,
      submitted_at: isoDaysFromNow(-2), approved_at: isoDaysFromNow(-2),
    },
    {
      id: "dr-4", project_id: IDS.projectDuplex, engineer_id: IDS.profileEngineer, report_date: dateOnly(-3),
      status: "returned", weather: "Rain", stage: "Masonry", floor: "Ground floor", zone: "Full floor",
      work_completed: "Brick masonry external walls — updated to lintel level.", quantity_executed: 8, unit: "cum",
      machinery_used: "—", quality_checks: "Mortar mix 1:6 confirmed.",
      site_issues: "Rain in the afternoon halted work for 3 hours.", delays: "3 hours",
      safety_observations: "Covered fresh masonry with tarpaulin.", client_instructions: "",
      tomorrow_plan: "Resume masonry once walls have cured.", notes: "",
      client_visible: false, returned_reason: "Please attach today's site photos before resubmitting — none were attached.",
      submitted_at: isoDaysFromNow(-3), approved_at: null,
    },
  ],

  daily_report_work: [
    { id: "drw-1", daily_report_id: "dr-2", activity: "Column steel binding", stage: "RCC structure", quantity: 12, unit: "columns" },
    { id: "drw-2", daily_report_id: "dr-3", activity: "Waterproofing ponding test", stage: "Waterproofing", quantity: 1450, unit: "sqft" },
  ],
  daily_report_labour: [
    { id: "drl-1", daily_report_id: "dr-2", category: "Mason", count: 6 },
    { id: "drl-2", daily_report_id: "dr-2", category: "Helper", count: 10 },
    { id: "drl-3", daily_report_id: "dr-3", category: "Waterproofing specialist", count: 3 },
  ],
  daily_report_materials: [
    { id: "drm-1", daily_report_id: "dr-2", material: "TMT steel 12mm", received: 500, consumed: 480, unit: "kg" },
    { id: "drm-2", daily_report_id: "dr-3", material: "Waterproofing compound", received: 40, consumed: 38, unit: "bags" },
  ],
  daily_report_photos: [
    { id: "drp-1", daily_report_id: "dr-3", url: "/demo/photos/terrace-waterproofing.jpg", caption: "Ponding test — terrace" },
  ],

  drawings: [
    { id: "dwg-1", project_id: IDS.projectVilla, drawing_no: "A-101", title: "Ground floor plan", discipline: "architectural", floor: "Ground floor", status: "approved_for_construction", current_revision: 3, issue_date: dateOnly(-90), updated_at: isoDaysFromNow(-30) },
    { id: "dwg-2", project_id: IDS.projectVilla, drawing_no: "A-201", title: "Front elevation", discipline: "architectural", floor: "—", status: "client_review", current_revision: 2, issue_date: dateOnly(-60), updated_at: isoDaysFromNow(-5) },
    { id: "dwg-3", project_id: IDS.projectVilla, drawing_no: "A-301", title: "Staircase detail", discipline: "architectural", floor: "1st-2nd floor", status: "draft", current_revision: 0, issue_date: null, updated_at: isoDaysFromNow(-1) },
    { id: "dwg-4", project_id: IDS.projectVilla, drawing_no: "S-101", title: "Column & slab layout", discipline: "structural", floor: "2nd floor", status: "owner_review", current_revision: 1, issue_date: dateOnly(-20), updated_at: isoDaysFromNow(-2) },
  ],
  drawing_revisions: [
    { id: "rev-1a", drawing_id: "dwg-1", revision_no: 0, status: "superseded", file_url: "/demo/drawings/a-101-r0.pdf", notes: "First issue.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-95) },
    { id: "rev-1b", drawing_id: "dwg-1", revision_no: 1, status: "superseded", file_url: "/demo/drawings/a-101-r1.pdf", notes: "Owner requested toilet resize.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-80) },
    { id: "rev-1c", drawing_id: "dwg-1", revision_no: 2, status: "superseded", file_url: "/demo/drawings/a-101-r2.pdf", notes: "Client requested extra store room.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-60) },
    { id: "rev-1d", drawing_id: "dwg-1", revision_no: 3, status: "approved_for_construction", file_url: "/demo/drawings/a-101-r3.pdf", notes: "Final — approved for construction.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-30) },
    { id: "rev-2a", drawing_id: "dwg-2", revision_no: 1, status: "superseded", file_url: "/demo/drawings/a-201-r1.pdf", notes: "First elevation concept.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-40) },
    { id: "rev-2b", drawing_id: "dwg-2", revision_no: 2, status: "client_review", file_url: "/demo/drawings/a-201-r2.pdf", notes: "Revised per Owner comments — sent to client.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-5) },
    { id: "rev-3a", drawing_id: "dwg-3", revision_no: 0, status: "draft", file_url: "/demo/drawings/a-301-r0.pdf", notes: "Draft staircase detail.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-1) },
    { id: "rev-4a", drawing_id: "dwg-4", revision_no: 1, status: "owner_review", file_url: "/demo/drawings/s-101-r1.pdf", notes: "Submitted for Owner review before client sign-off.", uploaded_by: IDS.profileArchitect, created_at: isoDaysFromNow(-2) },
  ],

  client_approvals: [
    { id: "ca-1", project_id: IDS.projectVilla, type: "drawing", ref_id: "dwg-2", title: "Front elevation — Rev 2", status: "sent_to_client", description: "Please review the revised front elevation.", sent_at: isoDaysFromNow(-5), decided_at: null },
    { id: "ca-2", project_id: IDS.projectVilla, type: "selection", ref_id: null, title: "Bathroom tile selection", status: "approved", description: "Vitrified tile — Ivory matte, 2x2 ft.", sent_at: isoDaysFromNow(-25), decided_at: isoDaysFromNow(-22) },
  ],

  change_requests: [
    { id: "cr-1", project_id: IDS.projectVilla, title: "Add extra wardrobe — Bedroom 2", status: "pending_pricing", description: "Client requested a built-in wardrobe not in the original scope.", cost_impact: null, timeline_impact_days: null, created_at: isoDaysFromNow(-3) },
  ],

  documents: [
    { id: "doc-1", project_id: IDS.projectVilla, title: "Construction agreement", category: "legal", file_url: "/demo/docs/agreement.pdf", client_visible: true, uploaded_at: isoDaysFromNow(-300) },
    { id: "doc-2", project_id: IDS.projectVilla, title: "Approved building plan", category: "approvals", file_url: "/demo/docs/building-plan.pdf", client_visible: true, uploaded_at: isoDaysFromNow(-280) },
    { id: "doc-3", project_id: IDS.projectVilla, title: "Internal cost estimate workbook", category: "internal", file_url: "/demo/docs/internal-cost-estimate.xlsx", client_visible: false, uploaded_at: isoDaysFromNow(-270) },
  ],

  material_catalogue: [
    { id: "mat-1", name: "TMT steel 12mm", unit: "kg", category: "Structure", spec: "Fe 500D, ISI-certified mills only" },
    { id: "mat-2", name: "OPC 53 grade cement", unit: "bag", category: "Structure", spec: "53 grade OPC for RCC; PPC for plastering" },
    { id: "mat-3", name: "River sand", unit: "cft", category: "Structure", spec: "Sieved, silt content tested before use" },
    { id: "mat-4", name: "Door frame — teak", unit: "no", category: "Doors & Windows", spec: "Seasoned teak, termite-treated" },
    { id: "mat-5", name: "UPVC/Aluminium windows", unit: "sqft", category: "Doors & Windows", spec: "Powder-coated, mosquito-mesh ready" },
    { id: "mat-6", name: "Vitrified floor tiles", unit: "sqft", category: "Flooring", spec: "2x2 ft, double-charge / full-body per package" },
    { id: "mat-7", name: "CP fittings", unit: "set", category: "Plumbing", spec: "Branded chrome-plated fittings, package-graded" },
    { id: "mat-8", name: "PVC/CPVC plumbing pipes", unit: "no", category: "Plumbing", spec: "ISI-marked, pressure-tested" },
    { id: "mat-9", name: "Modular electrical switches", unit: "no", category: "Electrical", spec: "Fire-retardant, ISI-marked, branded" },
    { id: "mat-10", name: "FRLS electrical wiring", unit: "meter", category: "Electrical", spec: "Fire-retardant low-smoke copper wiring" },
    { id: "mat-11", name: "Exterior emulsion paint", unit: "litre", category: "Painting", spec: "Weatherproof, UV-resistant exterior coat" },
    { id: "mat-12", name: "Waterproofing compound", unit: "bag", category: "Waterproofing", spec: "Brick-bat coba / crystalline waterproofing system" },
  ],

  suppliers: [
    { id: "sup-1", organisation_id: IDS.org, name: "Sri Lakshmi Steel Traders", category: "steel", contact_person: "Rajesh", mobile: "+91 90000 40001" },
    { id: "sup-2", organisation_id: IDS.org, name: "Nellore Cement Depot", category: "cement", contact_person: "Bhaskar", mobile: "+91 90000 40002" },
    { id: "sup-3", organisation_id: IDS.org, name: "Sai Timber Mart", category: "joinery", contact_person: "Suresh", mobile: "+91 90000 40003" },
  ],

  material_requests: [
    { id: "mr-1", project_id: IDS.projectVilla, requested_by: IDS.profileEngineer, status: "requested", priority: "high", needed_by: dateOnly(3), notes: "Needed before grid C steel work starts.", created_at: isoDaysFromNow(-1) },
    { id: "mr-2", project_id: IDS.projectDuplex, requested_by: IDS.profileEngineer, status: "requested", priority: "medium", needed_by: dateOnly(6), notes: "Door frames blocking task-5.", created_at: isoDaysFromNow(-2) },
    { id: "mr-3", project_id: IDS.projectVilla, requested_by: IDS.profileEngineer, status: "fulfilled", priority: "medium", needed_by: dateOnly(-10), notes: "Cement for terrace waterproofing.", created_at: isoDaysFromNow(-15) },
  ],
  material_request_items: [
    { id: "mri-1", material_request_id: "mr-1", material_name: "TMT steel 12mm", quantity: 800, unit: "kg" },
    { id: "mri-2", material_request_id: "mr-2", material_name: "Door frame — teak", quantity: 6, unit: "no" },
    { id: "mri-3", material_request_id: "mr-3", material_name: "OPC 53 grade cement", quantity: 60, unit: "bag" },
  ],

  // Owner-raised purchases against a supplier — a simple, single-line MVP
  // ("raise a purchase") distinct from the full multi-item `purchases` table
  // in the real schema; extend with items/status workflow when needed.
  purchases: [],

  labour_contractors: [
    { id: "lc-1", organisation_id: IDS.org, name: "Ravindra Labour Co.", mobile: "+91 90000 50001" },
  ],
  workers: [
    { id: "wrk-1", contractor_id: "lc-1", full_name: "Worker Team A", trade: "Mason", daily_wage: 900 },
  ],
  labour_attendance: [
    { id: "att-1", project_id: IDS.projectVilla, contractor_id: "lc-1", attendance_date: dateOnly(0), present_count: 14, trade: "Mixed" },
    { id: "att-2", project_id: IDS.projectVilla, contractor_id: "lc-1", attendance_date: dateOnly(-1), present_count: 16, trade: "Mixed" },
  ],
  work_orders: [],
  measurements: [],

  // The Villa follows the official Buildhaus milestone schedule (10% advance,
  // then six 15% stage payments — Pricing Catalog v2). The other two projects
  // deliberately keep negotiated, non-standard schedules.
  client_payment_schedules: [
    { id: "cps-1", project_id: IDS.projectVilla, milestone: "Advance / Agreement", percent: 10, amount: 1050000, due_date: "2025-09-01", status: "paid" },
    { id: "cps-2", project_id: IDS.projectVilla, milestone: "Foundation Stage", percent: 15, amount: 1575000, due_date: "2025-11-15", status: "paid" },
    { id: "cps-3", project_id: IDS.projectVilla, milestone: "Plinth Level", percent: 15, amount: 1575000, due_date: "2026-02-10", status: "paid" },
    { id: "cps-4", project_id: IDS.projectVilla, milestone: "Slab / Structural Stage", percent: 15, amount: 1575000, due_date: dateOnly(-10), status: "invoiced" },
    { id: "cps-5", project_id: IDS.projectVilla, milestone: "Blockwork & MEP Rough-ins", percent: 15, amount: 1575000, due_date: "2026-06-01", status: "pending" },
    { id: "cps-5b", project_id: IDS.projectVilla, milestone: "Finishing Stage", percent: 15, amount: 1575000, due_date: "2026-07-15", status: "pending" },
    { id: "cps-5c", project_id: IDS.projectVilla, milestone: "Final Handover Balance", percent: 15, amount: 1575000, due_date: "2026-08-15", status: "pending" },
    { id: "cps-6", project_id: IDS.projectDuplex, milestone: "Booking advance", percent: 20, amount: 1440000, due_date: "2026-02-01", status: "paid" },
    { id: "cps-7", project_id: IDS.projectDuplex, milestone: "Structure complete", percent: 50, amount: 3600000, due_date: dateOnly(15), status: "pending" },
    { id: "cps-8", project_id: IDS.projectDuplex, milestone: "Handover", percent: 30, amount: 2160000, due_date: "2026-11-30", status: "pending" },
    { id: "cps-9", project_id: IDS.projectCommercial, milestone: "Booking advance", percent: 15, amount: 2775000, due_date: "2026-05-01", status: "paid" },
    { id: "cps-10", project_id: IDS.projectCommercial, milestone: "Foundation complete", percent: 20, amount: 3700000, due_date: dateOnly(-5), status: "overdue" },
  ],

  client_invoices: [
    { id: "inv-1", project_id: IDS.projectVilla, invoice_no: "BH-INV-1001", amount: 1050000, status: "paid", invoice_date: "2025-09-01" },
    { id: "inv-2", project_id: IDS.projectVilla, invoice_no: "BH-INV-1002", amount: 1575000, status: "paid", invoice_date: "2025-11-15" },
    { id: "inv-3", project_id: IDS.projectVilla, invoice_no: "BH-INV-1003", amount: 1575000, status: "paid", invoice_date: "2026-02-10" },
    { id: "inv-4", project_id: IDS.projectVilla, invoice_no: "BH-INV-1004", amount: 1575000, status: "issued", invoice_date: dateOnly(-10) },
  ],
  client_receipts: [
    { id: "rcpt-1", project_id: IDS.projectVilla, amount: 1050000, receipt_date: "2025-09-03", mode: "bank_transfer", receipt_no: "BH-RCPT-1001" },
    { id: "rcpt-2", project_id: IDS.projectVilla, amount: 1575000, receipt_date: "2025-11-17", mode: "bank_transfer", receipt_no: "BH-RCPT-1002" },
    { id: "rcpt-3", project_id: IDS.projectDuplex, amount: 1440000, receipt_date: "2026-02-03", mode: "cheque", receipt_no: "BH-RCPT-1003" },
    { id: "rcpt-4", project_id: IDS.projectCommercial, amount: 2775000, receipt_date: "2026-05-03", mode: "bank_transfer", receipt_no: "BH-RCPT-1004" },
    { id: "rcpt-5", project_id: IDS.projectVilla, amount: 1575000, receipt_date: "2026-02-12", mode: "bank_transfer", receipt_no: "BH-RCPT-1005" },
  ],

  supplier_bills: [
    { id: "sb-1", project_id: IDS.projectVilla, supplier_id: "sup-1", supplier_name: "Sri Lakshmi Steel Traders", amount: 480000, outstanding: 210000, bill_date: dateOnly(-8) },
    { id: "sb-2", project_id: IDS.projectDuplex, supplier_id: "sup-3", supplier_name: "Sai Timber Mart", amount: 246000, outstanding: 246000, bill_date: dateOnly(-3) },
  ],
  contractor_bills: [
    { id: "cb-1", project_id: IDS.projectVilla, contractor_id: "lc-1", contractor_name: "Ravindra Labour Co.", outstanding: 120000, bill_date: dateOnly(-4) },
    { id: "cb-2", project_id: IDS.projectDuplex, contractor_id: "lc-1", contractor_name: "Ravindra Labour Co.", outstanding: 60000, bill_date: dateOnly(-2) },
  ],

  payments: [
    { id: "pay-1", project_id: IDS.projectVilla, direction: "inbound", amount: 1050000, category: "client_receipt", payment_date: "2025-09-03" },
    { id: "pay-2", project_id: IDS.projectVilla, direction: "inbound", amount: 1575000, category: "client_receipt", payment_date: "2025-11-17" },
    { id: "pay-6", project_id: IDS.projectVilla, direction: "inbound", amount: 1575000, category: "client_receipt", payment_date: "2026-02-12" },
    { id: "pay-3", project_id: IDS.projectCommercial, direction: "inbound", amount: 44000, category: "misc_receipt", payment_date: dateOnly(-6) },
    { id: "pay-4", project_id: IDS.projectVilla, direction: "outbound", amount: 300000, category: "supplier_payment", payment_date: dateOnly(-9) },
    { id: "pay-5", project_id: IDS.projectDuplex, direction: "outbound", amount: 200000, category: "labour_payment", payment_date: dateOnly(-5) },
  ],

  expenses: [
    { id: "exp-1", project_id: IDS.projectVilla, category: "site_transport", amount: 8500, expense_date: dateOnly(-1), notes: "Material transport." },
  ],

  quality_checklists: [
    { id: "qc-1", name: "RCC pour checklist" },
  ],
  inspections: [
    { id: "insp-1", project_id: IDS.projectVilla, checklist_id: "qc-1", status: "failed", inspected_by: IDS.profileOwner, inspected_at: isoDaysFromNow(-3), notes: "Cover block spacing inconsistent on grid B — redo before pour." },
  ],
  inspection_items: [
    { id: "ii-1", inspection_id: "insp-1", item: "Cover block spacing", result: "fail", notes: "Exceeds 600mm spec in 2 locations." },
  ],

  // Site Issues — a lightweight engineer-raised issue log, kept separate from
  // `inspections` (the Owner's pass/fail quality-checklist workflow) since the
  // status vocabularies differ (open/in_progress/resolved vs pass/fail).
  site_issues: [
    {
      id: "si-1", project_id: IDS.projectDuplex, reported_by: IDS.profileEngineer,
      category: "material", severity: "medium", title: "Door frame delivery delayed",
      description: "Supplier has not delivered teak door frames — blocking task-5 (door frame fixing).",
      status: "open", resolution_notes: null,
      created_at: isoDaysFromNow(-2), resolved_at: null,
    },
    {
      id: "si-2", project_id: IDS.projectVilla, reported_by: IDS.profileEngineer,
      category: "safety", severity: "low", title: "Loose scaffolding plank on 2nd floor",
      description: "One shuttering plank near grid B was loose — re-secured same day, flagging for record.",
      status: "resolved", resolution_notes: "Re-secured by site team same day. No incident.",
      created_at: isoDaysFromNow(-5), resolved_at: isoDaysFromNow(-5),
    },
  ],

  notifications: [
    { id: "notif-1", profile_id: IDS.profileOwner, title: "Daily report submitted", body: "Murali Krishna submitted today's report for Sunil Reddy Villa.", read: false, link: "/owner/site-operations", created_at: isoDaysFromNow(-1) },
    { id: "notif-2", profile_id: IDS.profileOwner, title: "New enquiry received", body: "Lakshmi Devi enquired about a G+3 apartment.", read: false, link: "/owner/crm", created_at: isoDaysFromNow(-1) },
    { id: "notif-3", profile_id: IDS.profileEngineer, title: "Report returned for correction", body: "Your Jul report for Anitha Residence was returned — attach site photos.", read: false, link: "/engineer/report", created_at: isoDaysFromNow(-3) },
    { id: "notif-4", profile_id: IDS.profileArchitect, title: "Drawing sent to client", body: "A-201 Front elevation Rev 2 is now with the client for review.", read: true, link: "/architect/drawings", created_at: isoDaysFromNow(-5) },
    { id: "notif-5", profile_id: IDS.profileClient, title: "Drawing awaiting your approval", body: "Front elevation Rev 2 is ready for your review.", read: false, link: "/client/approvals", created_at: isoDaysFromNow(-5) },
  ],

  comments: [
    {
      id: "cmt-1", organisation_id: IDS.org, entity_type: "project", entity_id: IDS.projectVilla,
      body: "Hi Sunil — sharing that the terrace waterproofing passed its 24-hour ponding test with no leaks. Photos are up in your Photos tab.",
      client_visible: true, created_by: IDS.profileOwner, created_at: isoDaysFromNow(-2),
    },
    {
      id: "cmt-2", organisation_id: IDS.org, entity_type: "project", entity_id: IDS.projectVilla,
      body: "Thank you for the update! Could you also let me know when the front elevation drawing will be ready for my review?",
      client_visible: true, created_by: IDS.profileClient, created_at: isoDaysFromNow(-2),
    },
    {
      id: "cmt-3", organisation_id: IDS.org, entity_type: "project", entity_id: IDS.projectVilla,
      body: "It's already sent to you under Approvals as \"Front elevation — Rev 2\" — take a look whenever convenient.",
      client_visible: true, created_by: IDS.profileArchitect, created_at: isoDaysFromNow(-1),
    },
  ],
  attachments: [],
  audit_logs: [],
  ai_requests: [],
  ai_responses: [],

  public_projects: [
    {
      id: "pub-1", slug: "ramesh-villa", name: "Ramesh Villa", city: "Nellore", project_type: "villa",
      builtup_area_sqft: 3100, approx_cost: 5800000, cost_per_sqft: 1871, completion_year: 2024, package: "premium",
      is_public: true, is_featured: true, duration_months: 11, floors: 2, plot_area_sqft: 2400,
      location: "Ramalingapuram, Nellore",
      description: "A G+1 family villa with a courtyard layout and rain-water harvesting, completed in 11 months.",
      testimonial: "Buildhaus kept us updated at every stage — the site photos and reports made us feel involved even though we were working out of town.",
    },
    {
      id: "pub-2", slug: "krishna-apartments", name: "Krishna Apartments", city: "Nellore", project_type: "apartment",
      builtup_area_sqft: 22000, approx_cost: 39000000, cost_per_sqft: 1773, completion_year: 2025, package: "standard",
      is_public: true, is_featured: true, duration_months: 20, floors: 4, plot_area_sqft: 8000,
      location: "Vedayapalem, Nellore",
      description: "A 16-unit G+4 apartment block delivered on a value-engineered budget without cutting structural specs.",
      testimonial: null,
    },
    {
      id: "pub-3", slug: "sunil-reddy-duplex-villa", name: "Sunil Reddy G+2 Duplex Villa", city: "Nellore", project_type: "duplex",
      builtup_area_sqft: 4396, approx_cost: 10500000, cost_per_sqft: 2389, completion_year: 2026, package: "luxury",
      is_public: true, is_featured: false, duration_months: 12, floors: 3, plot_area_sqft: 2800,
      location: "Kotha Kalava, Nellore",
      description: "An ongoing G+2 duplex villa — full transparent build log available to the client on our portal.",
      testimonial: null,
    },
  ],
  project_gallery: [
    { id: "gal-1", public_project_id: "pub-1", caption: "Front elevation", stage: "handover", sort_order: 1 },
    { id: "gal-2", public_project_id: "pub-1", caption: "Courtyard & landscaping", stage: "handover", sort_order: 2 },
    { id: "gal-3", public_project_id: "pub-2", caption: "Under construction — 3rd floor slab", stage: "rcc_structure", sort_order: 1 },
    { id: "gal-4", public_project_id: "pub-2", caption: "Completed facade", stage: "handover", sort_order: 2 },
    { id: "gal-5", public_project_id: "pub-3", caption: "RCC structure in progress", stage: "rcc_structure", sort_order: 1 },
  ],

  // Official Buildhaus construction packages (Pricing Catalog v2). Rates are
  // a starting reference, never a final price; every tier ships with an open
  // itemised BOQ before agreement. `inclusions`/`exclusions` are the
  // catalog's general lists (common to all packages); `specs` carries the
  // per-package material specification, section by section.
  estimator_packages: [
    {
      id: "pkg-basic", key: "basic", label: "Basic", rate_per_sqft: 2000,
      series: "Value Series",
      description: "Cost-effective specification with dependable structural quality — ideal for rental income and practical investment builds.",
      best_for: [
        "Budget-friendly construction",
        "Rental properties",
        "Investor builds",
        "Resale-focused projects",
      ],
      highlights: [
        "Cost-effective specification with dependable structural quality",
        "Ideal for rental income and practical investment projects",
        "Balanced material selection",
      ],
      specs: [
        { section: "Structure", rows: [
          { item: "Steel", detail: "Kamachi / Tirumala / Sugna or approved equivalent" },
          { item: "Cement", detail: "Chettinad / Deccan" },
          { item: "RCC", detail: "M20 grade; RCC aggregate 20mm, PCC 40mm" },
          { item: "Masonry", detail: "Good-quality red brick" },
        ] },
        { section: "Flooring", rows: [
          { item: "Tiles", detail: "Up to ₹50/sqft" },
          { item: "Skirting", detail: "Standard skirting" },
        ] },
        { section: "Kitchen", rows: [
          { item: "Counter", detail: "Granite counter up to ₹80/sqft" },
          { item: "Sink", detail: "Basic stainless-steel sink" },
          { item: "Dado", detail: "Up to ₹50/sqft" },
        ] },
        { section: "Bathroom", rows: [
          { item: "Tiles", detail: "Up to ₹50/sqft" },
          { item: "CP fittings", detail: "Economy CP fittings" },
          { item: "Sanitaryware", detail: "Parryware — ₹15,000–20,000 per bathroom" },
        ] },
        { section: "Doors & windows", rows: [
          { item: "Main door", detail: "Teak frame, ₹14,000–18,000" },
          { item: "Internal doors", detail: "Flush doors, ₹4,000" },
          { item: "Bathroom doors", detail: "WPC doors" },
          { item: "Windows", detail: "UPVC — Fenstech" },
        ] },
        { section: "Painting", rows: [
          { item: "Paint", detail: "Tractor Emulsion — putty 2 coats, primer 1 coat, finish 2 coats" },
        ] },
        { section: "Electrical", rows: [
          { item: "Wires", detail: "Finolex / Polycab" },
          { item: "Switches", detail: "GM basic" },
        ] },
      ],
      inclusions: GENERAL_INCLUSIONS,
      exclusions: GENERAL_EXCLUSIONS,
    },
    {
      id: "pkg-standard", key: "standard", label: "Standard", rate_per_sqft: 2200,
      series: "Comfort Series",
      description: "The most balanced package for quality and affordability, with a better finish selection than entry level.",
      best_for: [
        "Mid-segment buyers",
        "Primary residences",
        "Young families",
        "Quality-conscious homeowners",
      ],
      highlights: [
        "Most balanced package for quality and affordability",
        "Better finish selection than entry-level",
        "Suitable for end-use homes",
      ],
      specs: [
        { section: "Structure", rows: [
          { item: "Steel", detail: "SAIL / Vizag" },
          { item: "Cement", detail: "Dalmia / JSW" },
          { item: "RCC", detail: "M20 grade; RCC aggregate 20mm, PCC 40mm" },
          { item: "Masonry", detail: "Premium red brick" },
        ] },
        { section: "Flooring", rows: [
          { item: "Tiles", detail: "Up to ₹60/sqft" },
          { item: "Skirting", detail: "Standard skirting" },
        ] },
        { section: "Kitchen", rows: [
          { item: "Counter", detail: "Granite counter up to ₹100/sqft" },
          { item: "Sink", detail: "Nirali sink" },
          { item: "Dado", detail: "Up to ₹60/sqft" },
        ] },
        { section: "Bathroom", rows: [
          { item: "Tiles", detail: "Up to ₹60/sqft" },
          { item: "CP fittings", detail: "Hindware" },
          { item: "Sanitaryware", detail: "Parryware / Hindware — ₹25,000–35,000 per bathroom" },
        ] },
        { section: "Doors & windows", rows: [
          { item: "Main door", detail: "₹15,000–25,000" },
          { item: "Internal doors", detail: "Improved flush doors, ₹4,000–6,000" },
          { item: "Bathroom doors", detail: "WPC doors" },
          { item: "Windows", detail: "UPVC — Grentech" },
        ] },
        { section: "Painting", rows: [
          { item: "Paint", detail: "Asian Paints emulsion — putty 2 coats, primer 1 coat, finish 2 coats" },
        ] },
        { section: "Electrical", rows: [
          { item: "Wires", detail: "Polycab / Finolex" },
          { item: "Switches", detail: "GM / Anchor" },
        ] },
      ],
      inclusions: GENERAL_INCLUSIONS,
      exclusions: GENERAL_EXCLUSIONS,
    },
    {
      id: "pkg-premium", key: "premium", label: "Premium", rate_per_sqft: 2400,
      series: "Signature Series",
      description: "Move-in ready specification for end-use buyers — our recommended package for most residential clients.",
      best_for: [
        "Move-in ready homes",
        "Premium independent houses",
        "End-use buyers",
        "Projects where resale value matters",
      ],
      highlights: [
        "Recommended specification for most end-use residential clients",
        "Upgraded brands across structure, finishes and fittings",
        "Move-in ready finish quality",
      ],
      specs: [
        { section: "Structure", rows: [
          { item: "Steel", detail: "Vizag / JSW" },
          { item: "Cement", detail: "UltraTech / Zuari" },
          { item: "RCC", detail: "M20 grade; RCC aggregate 20mm, PCC 40mm" },
          { item: "Masonry", detail: "Premium red brick" },
        ] },
        { section: "Flooring", rows: [
          { item: "Tiles", detail: "Up to ₹100/sqft" },
          { item: "Skirting", detail: "Premium skirting" },
        ] },
        { section: "Kitchen", rows: [
          { item: "Counter", detail: "Granite counter up to ₹120/sqft" },
          { item: "Sink", detail: "Carysil / Nirali sink" },
          { item: "Dado", detail: "Up to ₹80/sqft" },
        ] },
        { section: "Bathroom", rows: [
          { item: "Tiles", detail: "Up to ₹80/sqft" },
          { item: "CP fittings", detail: "Jaquar" },
          { item: "Sanitaryware", detail: "Hindware / Jaquar — ₹30,000–40,000 per bathroom" },
        ] },
        { section: "Doors & windows", rows: [
          { item: "Main door", detail: "Premium teak, ₹25,000–35,000" },
          { item: "Internal doors", detail: "₹6,000–8,000" },
          { item: "Bathroom doors", detail: "WPC doors" },
          { item: "Windows", detail: "UPVC — Sudhakar" },
        ] },
        { section: "Painting", rows: [
          { item: "Paint", detail: "Apcolite with JK-Birla putty 2 coats, primer 1 coat, finish 2 coats" },
        ] },
        { section: "Electrical", rows: [
          { item: "Wires", detail: "Polycab / Havells" },
          { item: "Switches", detail: "GM / Legrand" },
        ] },
      ],
      inclusions: GENERAL_INCLUSIONS,
      exclusions: GENERAL_EXCLUSIONS,
    },
    {
      id: "pkg-luxury", key: "luxury", label: "Luxury", rate_per_sqft: 2600,
      series: "Elite Series",
      description: "High-end specification for premium villas, executive residences and design-led homes.",
      best_for: [
        "High-end villas",
        "Executive residences",
        "Premium resale homes",
        "Design-led projects",
      ],
      highlights: [
        "Top-tier brands — Tata / JSW steel, Kohler / Grohe sanitaryware",
        "Large-format vitrified / marble-finish flooring",
        "Designer doors and premium finishes throughout",
      ],
      specs: [
        { section: "Structure", rows: [
          { item: "Steel", detail: "Tata / JSW" },
          { item: "Cement", detail: "UltraTech / Bharathi" },
          { item: "RCC", detail: "M20 grade; RCC aggregate 20mm, PCC 40mm" },
          { item: "Masonry", detail: "Premium red brick" },
        ] },
        { section: "Flooring", rows: [
          { item: "Tiles", detail: "Large-format vitrified / marble-finish, up to ₹150/sqft" },
          { item: "Skirting", detail: "Enhanced skirting" },
        ] },
        { section: "Kitchen", rows: [
          { item: "Counter", detail: "Quartz / premium granite counter" },
          { item: "Sink", detail: "Premium branded sink" },
          { item: "Dado", detail: "₹120–150/sqft" },
        ] },
        { section: "Bathroom", rows: [
          { item: "Tiles", detail: "Up to ₹100/sqft" },
          { item: "CP fittings", detail: "Jaquar / premium" },
          { item: "Sanitaryware", detail: "Kohler / Grohe — ₹45,000–55,000 per bathroom" },
        ] },
        { section: "Doors & windows", rows: [
          { item: "Main door", detail: "Premium designer door, ₹35,000–50,000" },
          { item: "Internal doors", detail: "Premium flush / designer doors, ₹8,000–10,000" },
          { item: "Bathroom doors", detail: "Premium UPVC / glass doors" },
          { item: "Windows", detail: "UPVC — Prominace" },
        ] },
        { section: "Painting", rows: [
          { item: "Paint", detail: "Royale premium paint" },
        ] },
        { section: "Electrical", rows: [
          { item: "Wires", detail: "Polycab / Havells" },
          { item: "Switches", detail: "Havells / Legrand premium" },
        ] },
      ],
      inclusions: GENERAL_INCLUSIONS,
      exclusions: GENERAL_EXCLUSIONS,
    },
  ],
  estimator_rates: [
    { id: "rate-1", component: "design_structural", label: "Design & structural engineering", percent: 5 },
    { id: "rate-2", component: "preliminary", label: "Preliminary & site mobilisation", percent: 4 },
    { id: "rate-3", component: "rcc_structure", label: "RCC structure", percent: 26 },
    { id: "rate-4", component: "masonry_plastering", label: "Masonry & plastering", percent: 14 },
    { id: "rate-5", component: "waterproofing", label: "Waterproofing", percent: 3 },
    { id: "rate-6", component: "flooring", label: "Flooring", percent: 10 },
    { id: "rate-7", component: "plumbing", label: "Plumbing", percent: 6 },
    { id: "rate-8", component: "electrical", label: "Electrical", percent: 7 },
    { id: "rate-9", component: "doors_windows", label: "Doors & windows", percent: 8 },
    { id: "rate-10", component: "painting", label: "Painting", percent: 5 },
    { id: "rate-11", component: "external_works", label: "External works & compound", percent: 6 },
    { id: "rate-12", component: "contingency", label: "Contingency", percent: 6 },
  ],
  estimator_rate_history: [],

  estimates: [],
  quotations: [
    {
      id: "quo-1", organisation_id: IDS.org, quotation_no: "BH-Q-1004", lead_id: "lead-4", project_id: null,
      kind: "detailed", status: "sent", current_version: 1, valid_until: dateOnly(10),
      created_at: isoDaysFromNow(-14), updated_at: isoDaysFromNow(-14),
    },
  ],
  quotation_versions: [
    {
      id: "qv-1", quotation_id: "quo-1", version: 1, project_type: "villa",
      plot_area_sqft: 1925, builtup_area_sqft: 3400, floors: 2, package: "premium",
      cost_per_sqft: 2400, total_cost: 8160000, material_cost: 4700000, labour_cost: 2350000,
      design_cost: 400000, taxes: 710000, timeline: "12 months",
      terms: "10% advance on agreement, balance per milestone schedule. Rates valid for 30 days.",
      created_at: isoDaysFromNow(-14),
    },
  ],
  // Unguessable public tokens for /quotation/[token] on apps/website — the
  // raw `quotations.id` is never exposed in a public URL. Generated
  // alongside a quotation in apps/website/src/app/cost-estimator/actions.ts
  // via crypto.randomBytes(24).toString("base64url"). expires_at is checked
  // on every lookup; revoked lets the Owner kill a link early if needed.
  quotation_public_tokens: [
    {
      id: "qpt-1", quotation_id: "quo-1", token: "kQ9x2ZmP7vT1nD4rW8eF3jH6qB0sYcAeXn5uL2iO",
      expires_at: dateOnly(16), revoked: false, created_at: isoDaysFromNow(-14),
    },
  ],

  code_counters: [],

  // Public website content, managed by the Owner under
  // /owner/website ("Public Website Content"). `testimonials` and `faqs`
  // feed public-facing sections on apps/website; only `is_published: true`
  // rows should ever be rendered there. `website_pages`/`website_sections`
  // let the Owner edit copy that's otherwise hardcoded in the website's page
  // components (see apps/website/src/app/**/page.tsx) without a redeploy.
  testimonials: [
    {
      id: "test-1", client_name: "Sunil Reddy", project_id: IDS.projectVilla,
      quote: "Buildhaus kept us updated at every stage — the daily reports and photos made us feel involved even though we were working out of town.",
      rating: 5, is_published: true, display_order: 1,
    },
    {
      id: "test-2", client_name: "Anitha", project_id: IDS.projectDuplex,
      quote: "What stood out was the transparency — every drawing revision and payment milestone was visible to us on the portal, no chasing anyone for updates.",
      rating: 5, is_published: true, display_order: 2,
    },
    {
      id: "test-3", client_name: "Ramesh Kumar", project_id: null,
      quote: "We compared three contractors before choosing Buildhaus. Their instant quotation was the most detailed, and the final cost matched it closely.",
      rating: 4, is_published: true, display_order: 3,
    },
    {
      id: "test-4", client_name: "Venkat Rao", project_id: IDS.projectCommercial,
      quote: "Still early days on our commercial complex, but the foundation stage was handled carefully and the site engineer explains every delay honestly.",
      rating: 4, is_published: false, display_order: 4,
    },
  ],

  faqs: [
    { id: "faq-1", category: "Cost & Payments", question: "How is the cost per sqft calculated?", answer: "We quote a package rate (Basic, Standard, Premium or Luxury) per sqft of built-up area, which already bundles structure, masonry, finishes, plumbing and electrical for that tier. It's a starting reference — the final cost depends on plot size, floor count, design complexity and site conditions. Use the Cost Estimator for an instant indicative figure for your plot.", is_published: true, display_order: 1 },
    { id: "faq-2", category: "Cost & Payments", question: "What payment schedule do you follow?", answer: "Payments are linked to site progress and milestone completion — 10% on advance/agreement, then 15% each at foundation, plinth, slab/structural stage, blockwork & MEP rough-ins, finishing and final handover — laid out in your signed agreement, not a fixed monthly schedule.", is_published: true, display_order: 2 },
    { id: "faq-3", category: "Cost & Payments", question: "Are there hidden costs beyond the quoted rate?", answer: "The quoted rate covers everything listed under your package's inclusions. Items explicitly marked as exclusions (e.g. landscaping, home automation) are quoted separately only if you want them.", is_published: true, display_order: 3 },
    { id: "faq-4", category: "Timeline", question: "How long does a typical villa take to build?", answer: "A G+1/G+2 independent house or villa typically takes 10-14 months from mobilisation to handover, depending on built-up area and site conditions. Your quotation includes a project-specific timeline.", is_published: true, display_order: 1 },
    { id: "faq-5", category: "Timeline", question: "What happens if construction is delayed?", answer: "Any delay and its cause is logged against the relevant stage and shared with you through a daily report or site issue note — we don't let delays go unexplained until the next milestone.", is_published: true, display_order: 2 },
    { id: "faq-6", category: "Timeline", question: "Can I speed up construction by paying more?", answer: "In most cases no — RCC curing and statutory approval timelines are fixed regardless of budget. We can discuss additional shifts or manpower on a case-by-case basis for larger projects.", is_published: false, display_order: 3 },
    { id: "faq-7", category: "Process", question: "What is included in the Cost Estimator's indicative price?", answer: "It's a package-rate estimate based on built-up area and floors only — a true figure needs your plot survey and finalised drawings, which come after the site visit.", is_published: true, display_order: 1 },
    { id: "faq-8", category: "Process", question: "Can I make changes to the design after construction starts?", answer: "Yes, through a formal Change Request — we price and timeline-impact any mid-construction change before work begins, so there are no surprise costs later.", is_published: true, display_order: 2 },
    { id: "faq-9", category: "Process", question: "Do I get to see daily progress?", answer: "Yes — your client portal shows daily site reports, photos, drawing status and payment schedule as soon as your site engineer submits them and they're approved.", is_published: true, display_order: 3 },
    { id: "faq-10", category: "Materials & Quality", question: "What brands of materials do you use?", answer: "We standardise on ISI-certified, branded materials in every category (steel, cement, electricals, CP fittings) — the exact brand tier depends on your chosen package.", is_published: true, display_order: 1 },
    { id: "faq-11", category: "Materials & Quality", question: "How do you ensure structural quality?", answer: "Every stage is built to a signed-off structural drawing and checked against a quality checklist before the next stage begins — failed inspections (e.g. cover block spacing) are corrected before pour.", is_published: true, display_order: 2 },
  ],

  website_pages: [
    { id: "wp-home", slug: "home", title: "Home", seo_title: "Buildhaus Constructions — Nellore's Transparent Home Builder", meta_description: "Independent houses, villas, duplexes, apartments and commercial buildings across Andhra Pradesh — with daily site reports and full cost transparency.", is_published: true, updated_at: isoDaysFromNow(-6) },
    { id: "wp-about", slug: "about", title: "About", seo_title: "About Buildhaus Constructions | Nellore, Andhra Pradesh", meta_description: "Buildhaus Constructions is a Nellore-based construction company built around one idea: show the client every brick.", is_published: true, updated_at: isoDaysFromNow(-12) },
    { id: "wp-services", slug: "services", title: "Services", seo_title: "Construction Services — Houses, Villas, Apartments & Commercial", meta_description: "Residential and commercial construction managed end to end: design, procurement, site execution and quality control under one roof.", is_published: true, updated_at: isoDaysFromNow(-20) },
    { id: "wp-packages", slug: "packages", title: "Packages", seo_title: "Construction Packages & Rates — Basic, Standard, Premium, Luxury", meta_description: "Four specification tiers, one transparent starting rate per sqft. Compare inclusions across Basic, Standard, Premium and Luxury packages.", is_published: true, updated_at: isoDaysFromNow(-3) },
    { id: "wp-process", slug: "process", title: "Process", seo_title: "Our Construction Process — 25 Tracked Stages", meta_description: "From requirement collection to handover, every project is tracked against the same 25 standard construction stages.", is_published: true, updated_at: isoDaysFromNow(-25) },
    { id: "wp-materials", slug: "materials", title: "Materials", seo_title: "Material Specifications — What Goes Into Your Build", meta_description: "ISI-certified, branded materials across every category — steel, cement, electricals, plumbing and finishes.", is_published: true, updated_at: isoDaysFromNow(-25) },
    { id: "wp-contact", slug: "contact", title: "Contact", seo_title: "Contact Buildhaus Constructions | Nellore", meta_description: "Talk to us about your build — office address, phone, WhatsApp and email for Buildhaus Constructions, Nellore.", is_published: true, updated_at: isoDaysFromNow(-40) },
  ],
  website_sections: [
    { id: "sec-home-1", page_slug: "home", key: "hero_heading", heading: "Hero heading", body: "We build houses, villas and commercial spaces — and we show you every brick.", display_order: 1, is_published: true },
    { id: "sec-home-2", page_slug: "home", key: "hero_subheading", heading: "Hero subheading", body: "From enquiry to handover, Buildhaus manages design, estimation, procurement, site execution and quality on one transparent platform.", display_order: 2, is_published: true },
    { id: "sec-about-1", page_slug: "about", key: "intro_heading", heading: "Intro heading", body: "A Nellore-based construction company built around one idea: show the client every brick.", display_order: 1, is_published: true },
    { id: "sec-about-2", page_slug: "about", key: "intro_body", heading: "Intro body", body: "Buildhaus Constructions delivers independent houses, villas, duplexes, apartments and commercial buildings across Andhra Pradesh — handling design, estimation, procurement, site execution and quality control on one accountable platform.", display_order: 2, is_published: true },
    { id: "sec-about-3", page_slug: "about", key: "mission_statement", heading: "Mission statement (draft)", body: "Our mission: become the most trusted name in Andhra Pradesh construction by 2028, one transparent build at a time.", display_order: 3, is_published: false },
    { id: "sec-services-1", page_slug: "services", key: "intro_heading", heading: "Intro heading", body: "Residential and commercial construction, managed end to end.", display_order: 1, is_published: true },
    { id: "sec-contact-1", page_slug: "contact", key: "intro_heading", heading: "Intro heading", body: "Talk to us about your build.", display_order: 1, is_published: true },
  ],

  // Auth is seeded lazily by src/lib/demo/users.ts; listed here only so the
  // table shows up if something iterates SEED's keys.
  __auth_users: [],
};
