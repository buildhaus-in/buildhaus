import { z } from "zod";

// Zod schemas for the highest-traffic and most security-sensitive inputs —
// the anonymous-facing public forms, and the auth/creation flows where a bad
// value has the widest blast radius. Server Actions parse with these and
// return { ok: false, fieldErrors } rather than throwing, so the UI always
// gets a structured result (never a silent no-op or an unhandled exception).
//
// Not every server action in the app is Zod-validated yet — see the "Known
// limitations" section of the delivery report for the honest list of what
// still leans on HTML5 required/type attributes only. Add a schema here
// first when hardening the next one, so validation stays centralized.

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .regex(/^[+0-9() -]{10,17}$/, "Enter a valid phone number");

export const emailOptionalSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const buildingTypeSchema = z.enum([
  "independent_house", "villa", "duplex", "apartment", "office",
  "commercial", "warehouse", "godown", "factory", "interior", "renovation",
]);

export const packageKeySchema = z.enum(["basic", "standard", "premium", "luxury"]);

export const costEstimatorSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  mobile: phoneSchema,
  whatsapp: phoneSchema.optional().or(z.literal("")),
  email: emailOptionalSchema,
  site_location: z.string().trim().min(3, "Enter the site location"),
  city: z.string().trim().min(2, "Enter a city"),
  state: z.string().trim().min(2, "Enter a state"),
  plot_width_ft: z.coerce.number().positive().optional(),
  plot_length_ft: z.coerce.number().positive().optional(),
  builtup_area_sqft: z.coerce.number().positive("Enter the built-up area"),
  floors: z.coerce.number().int().min(1).max(20),
  building_type: buildingTypeSchema,
  package_key: packageKeySchema,
  optional_works: z.array(z.string()).default([]),
  preferred_start_date: z.string().optional().or(z.literal("")),
  additional_requirements: z.string().max(2000).optional().or(z.literal("")),
});
export type CostEstimatorInput = z.infer<typeof costEstimatorSchema>;

export const enquirySchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  mobile: phoneSchema,
  email: emailOptionalSchema,
  site_location: z.string().trim().min(3, "Enter the site location"),
  building_type: buildingTypeSchema.optional(),
  message: z.string().trim().min(5, "Tell us a little about your project").max(2000),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const siteVisitRequestSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  mobile: phoneSchema,
  email: emailOptionalSchema,
  site_location: z.string().trim().min(3, "Enter the site location"),
  preferred_date: z.string().min(1, "Choose a preferred date"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type SiteVisitRequestInput = z.infer<typeof siteVisitRequestSchema>;

export const callbackRequestSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  mobile: phoneSchema,
  preferred_time: z.string().max(100).optional().or(z.literal("")),
});
export type CallbackRequestInput = z.infer<typeof callbackRequestSchema>;

export const createUserSchema = z.object({
  full_name: z.string().trim().min(2, "Enter a full name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role_key: z.enum(["owner", "site_engineer", "architect", "client"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Enter a project name"),
  project_type: buildingTypeSchema,
  site_address: z.string().trim().min(3, "Enter the site address"),
  builtup_area_sqft: z.coerce.number().positive().optional(),
  floors: z.coerce.number().int().min(1).max(20).optional(),
  contract_value: z.coerce.number().nonnegative().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const dailyReportSchema = z.object({
  project_id: z.string().min(1, "Select a project"),
  report_date: z.string().min(1, "Select a date"),
  weather: z.string().max(100).optional().or(z.literal("")),
  stage: z.string().max(100).optional().or(z.literal("")),
  floor: z.string().max(100).optional().or(z.literal("")),
  zone: z.string().max(100).optional().or(z.literal("")),
  work_completed: z.string().trim().min(3, "Describe the work completed"),
  quantity_executed: z.coerce.number().nonnegative().optional(),
  unit: z.string().max(30).optional().or(z.literal("")),
  site_issues: z.string().max(1000).optional().or(z.literal("")),
  tomorrow_plan: z.string().max(1000).optional().or(z.literal("")),
});
export type DailyReportInput = z.infer<typeof dailyReportSchema>;

export const taskProgressSchema = z.object({
  task_id: z.string().min(1),
  progress: z.coerce.number().int().min(0).max(100),
});
export type TaskProgressInput = z.infer<typeof taskProgressSchema>;

export const materialRequestSchema = z.object({
  project_id: z.string().min(1, "Select a project"),
  priority: z.enum(["low", "medium", "high"]),
  needed_by: z.string().min(1, "Select a date"),
  notes: z.string().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        material_name: z.string().trim().min(1, "Enter a material"),
        quantity: z.coerce.number().positive("Enter a quantity"),
        unit: z.string().trim().min(1, "Enter a unit"),
      })
    )
    .min(1, "Add at least one material"),
});
export type MaterialRequestInput = z.infer<typeof materialRequestSchema>;

export const changeRequestSchema = z.object({
  title: z.string().trim().min(3, "Enter a title"),
  description: z.string().trim().min(10, "Describe the change you'd like"),
});
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;

// Structured result shape every hardened Server Action should return instead
// of a bare `{ error }` or a silent `undefined`.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function zodErrorToFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
