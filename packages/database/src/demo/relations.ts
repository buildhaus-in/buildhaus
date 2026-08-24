// Registry describing the embedded-resource joins (`.select("roles(key)")`
// style) the mock query builder needs to resolve. Keyed by source table,
// then by the embed name used in the select string. Add an entry here
// whenever a new page selects a nested relation that isn't listed yet.
export interface Relation {
  table: string;
  type: "belongsTo" | "hasMany";
  localKey?: string; // belongsTo: column on the source table pointing at the related row's id
  foreignKey?: string; // hasMany: column on the related table pointing back at the source row's id
}

export const RELATIONS: Record<string, Record<string, Relation>> = {
  user_roles: {
    roles: { table: "roles", type: "belongsTo", localKey: "role_id" },
  },
  roles: {
    role_permissions: { table: "role_permissions", type: "hasMany", foreignKey: "role_id" },
  },
  role_permissions: {
    permissions: { table: "permissions", type: "belongsTo", localKey: "permission_id" },
    roles: { table: "roles", type: "belongsTo", localKey: "role_id" },
  },
  project_members: {
    profiles: { table: "profiles", type: "belongsTo", localKey: "profile_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  projects: {
    clients: { table: "clients", type: "belongsTo", localKey: "client_id" },
    project_members: { table: "project_members", type: "hasMany", foreignKey: "project_id" },
    project_stages: { table: "project_stages", type: "hasMany", foreignKey: "project_id" },
  },
  tasks: {
    site_engineer: { table: "profiles", type: "belongsTo", localKey: "site_engineer_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  task_comments: {
    profiles: { table: "profiles", type: "belongsTo", localKey: "author_id" },
  },
  drawings: {
    drawing_revisions: { table: "drawing_revisions", type: "hasMany", foreignKey: "drawing_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  drawing_revisions: {
    profiles: { table: "profiles", type: "belongsTo", localKey: "uploaded_by" },
  },
  leads: {
    lead_activities: { table: "lead_activities", type: "hasMany", foreignKey: "lead_id" },
  },
  material_requests: {
    material_request_items: { table: "material_request_items", type: "hasMany", foreignKey: "material_request_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    profiles: { table: "profiles", type: "belongsTo", localKey: "requested_by" },
  },
  labour_attendance: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    labour_contractors: { table: "labour_contractors", type: "belongsTo", localKey: "contractor_id" },
  },
  site_issues: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    profiles: { table: "profiles", type: "belongsTo", localKey: "reported_by" },
  },
  daily_reports: {
    daily_report_work: { table: "daily_report_work", type: "hasMany", foreignKey: "daily_report_id" },
    daily_report_labour: { table: "daily_report_labour", type: "hasMany", foreignKey: "daily_report_id" },
    daily_report_materials: { table: "daily_report_materials", type: "hasMany", foreignKey: "daily_report_id" },
    daily_report_photos: { table: "daily_report_photos", type: "hasMany", foreignKey: "daily_report_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    engineer: { table: "profiles", type: "belongsTo", localKey: "engineer_id" },
  },
  clients: {
    profiles: { table: "profiles", type: "belongsTo", localKey: "profile_id" },
  },
  client_approvals: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  change_requests: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  documents: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  comments: {
    profiles: { table: "profiles", type: "belongsTo", localKey: "created_by" },
  },
  quotations: {
    quotation_versions: { table: "quotation_versions", type: "hasMany", foreignKey: "quotation_id" },
    leads: { table: "leads", type: "belongsTo", localKey: "lead_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  quotation_public_tokens: {
    quotations: { table: "quotations", type: "belongsTo", localKey: "quotation_id" },
  },
  client_payment_schedules: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  client_invoices: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  client_receipts: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  supplier_bills: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    suppliers: { table: "suppliers", type: "belongsTo", localKey: "supplier_id" },
  },
  contractor_bills: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    labour_contractors: { table: "labour_contractors", type: "belongsTo", localKey: "contractor_id" },
  },
  expenses: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  inspections: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
    inspection_items: { table: "inspection_items", type: "hasMany", foreignKey: "inspection_id" },
    profiles: { table: "profiles", type: "belongsTo", localKey: "inspected_by" },
  },
  purchases: {
    suppliers: { table: "suppliers", type: "belongsTo", localKey: "supplier_id" },
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  testimonials: {
    projects: { table: "projects", type: "belongsTo", localKey: "project_id" },
  },
  // website_sections are keyed by website_pages.slug, not .id, so they don't
  // fit the belongsTo/hasMany-by-id relation engine above — fetched with a
  // plain `.eq("page_slug", slug)` query in apps/portal/.../owner/website
  // instead of an embedded select.
};
