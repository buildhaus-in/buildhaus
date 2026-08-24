// Shared row shapes for the core Buildhaus entities, mirroring the columns
// in supabase/migrations/*.sql. These are hand-maintained (not generated)
// because the Demo Mode store isn't a real Postgres instance to introspect —
// once a live Supabase project is wired up, regenerate with
// `supabase gen types typescript` and reconcile against this file.

export type ProjectStatus =
  | "lead_converted" | "design_stage" | "approval_stage" | "pre_construction"
  | "mobilisation" | "under_construction" | "finishing" | "snagging"
  | "handover" | "completed" | "on_hold" | "cancelled";

export type RiskLevel = "On Track" | "Attention Required" | "At Risk" | "Delayed" | "Critical";

export interface Project {
  id: string;
  organisation_id: string;
  code: string;
  name: string;
  client_id: string | null;
  project_type: string;
  site_address: string;
  status: ProjectStatus | string;
  progress: number;
  client_visible_progress: number;
  current_stage: string | null;
  start_date: string | null;
  planned_completion: string | null;
  contract_value: number | null;
  estimated_cost: number | null;
  builtup_area_sqft: number | null;
  floors: number | null;
}

export type LeadStage =
  | "new_enquiry" | "contacted" | "requirement_collected" | "site_visit_scheduled"
  | "site_visit_completed" | "estimate_shared" | "design_discussion"
  | "quotation_prepared" | "quotation_sent" | "negotiation" | "won" | "lost" | "on_hold";

export type LeadSource =
  | "public_website" | "cost_estimator" | "instant_quotation"
  | "contact_form" | "site_visit_request" | "callback_request" | "referral" | "manual";

export interface Lead {
  id: string;
  organisation_id: string;
  customer_name: string;
  mobile: string;
  whatsapp?: string | null;
  email: string | null;
  site_location: string;
  city?: string | null;
  state?: string | null;
  building_type: string;
  plot_size: string;
  builtup_area_sqft: number | null;
  floors: number | null;
  estimated_value: number | null;
  enquiry_date: string;
  follow_up_date: string | null;
  stage: LeadStage | string;
  notes: string;
  source: LeadSource | string;
  converted_project_id?: string | null;
  quotation_id?: string | null;
}

export type TaskStatus =
  | "draft" | "assigned" | "accepted" | "in_progress" | "blocked"
  | "submitted" | "approved" | "returned" | "completed" | "cancelled";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus | string;
  priority: "low" | "medium" | "high" | string;
  progress: number;
  site_engineer_id: string;
  stage: string;
  floor: string;
  zone: string;
  drawing_ref: string;
  dimensions: string;
  start_date: string;
  due_date: string;
  checklist: { label: string; done: boolean }[];
  owner_instructions: string;
  blocker_reason?: string;
}

export type DailyReportStatus = "draft" | "submitted" | "approved" | "returned";

export interface DailyReport {
  id: string;
  project_id: string;
  engineer_id: string;
  report_date: string;
  status: DailyReportStatus | string;
  weather: string;
  stage: string;
  floor: string;
  zone: string;
  work_completed: string;
  quantity_executed: number;
  unit: string;
  client_visible: boolean;
  returned_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
}

export type DrawingStatus =
  | "draft" | "submitted_to_owner" | "owner_review" | "revision_requested"
  | "client_review" | "approved" | "approved_for_construction" | "superseded";

export interface Drawing {
  id: string;
  project_id: string;
  drawing_no: string;
  title: string;
  discipline: string;
  floor: string;
  status: DrawingStatus | string;
  current_revision: number;
  issue_date: string | null;
}

export interface DrawingRevision {
  id: string;
  drawing_id: string;
  revision_no: number;
  status: DrawingStatus | string;
  file_url: string;
  notes: string;
  uploaded_by: string;
  created_at: string;
}

export type QuotationStatus =
  | "draft" | "sent" | "viewed" | "under_negotiation"
  | "accepted" | "rejected" | "expired" | "superseded";

export interface Quotation {
  id: string;
  organisation_id: string;
  quotation_no: string;
  lead_id: string | null;
  project_id: string | null;
  kind: "public_indicative" | "detailed" | "package" | "boq" | "revised" | "variation" | string;
  status: QuotationStatus | string;
  current_version: number;
  valid_until: string;
}

export interface QuotationVersion {
  id: string;
  quotation_id: string;
  version: number;
  project_type: string;
  plot_area_sqft: number | null;
  builtup_area_sqft: number;
  floors: number;
  package: string;
  cost_per_sqft: number;
  total_cost: number;
  material_cost: number;
  labour_cost: number;
  design_cost: number;
  taxes: number;
  timeline: string;
  terms: string;
}

export interface QuotationPublicToken {
  id: string;
  quotation_id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface EstimatorPackageSpecRow {
  item: string;
  detail: string;
}

export interface EstimatorPackageSpecSection {
  section: string;
  rows: EstimatorPackageSpecRow[];
}

export interface EstimatorPackage {
  id: string;
  key: string;
  label: string;
  rate_per_sqft: number;
  description: string;
  /** Catalog series name, e.g. "Value Series" / "Signature Series". */
  series?: string;
  best_for?: string[];
  highlights?: string[];
  /** Per-package material specification, section by section. */
  specs?: EstimatorPackageSpecSection[];
  inclusions: string[];
  exclusions: string[];
}

export interface EstimatorRate {
  id: string;
  component: string;
  label: string;
  percent: number;
}

export interface ClientPaymentSchedule {
  id: string;
  project_id: string;
  milestone: string;
  percent: number;
  amount: number;
  due_date: string;
  status: "paid" | "invoiced" | "pending" | "overdue" | string;
}

export interface Testimonial {
  id: string;
  client_name: string;
  project_id: string | null;
  quote: string;
  rating: number;
  is_published: boolean;
  display_order: number;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_published: boolean;
  display_order: number;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  updated_at: string;
}

export interface WebsiteSection {
  id: string;
  page_slug: string;
  key: string;
  heading: string | null;
  body: string | null;
  display_order: number;
  is_published: boolean;
}

export type RoleKey = "owner" | "site_engineer" | "architect" | "client";
