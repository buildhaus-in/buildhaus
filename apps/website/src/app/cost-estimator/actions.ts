"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@buildhaus/database";
import { IDS } from "@buildhaus/database";
import { buildEstimate, EstimateResult, EstimatorPackageRow, EstimatorRateRow } from "@buildhaus/utils";

export interface RawEstimateInputs {
  name: string;
  mobile: string;
  whatsapp: string;
  email: string;
  site_location: string;
  city: string;
  state: string;
  plot_width: string;
  plot_length: string;
  builtup_area_per_floor: string;
  builtup_area_sqft: string;
  floors: string;
  building_type: string;
  package_key: string;
  optional_works: string; // comma-separated keys
  preferred_start_date: string;
  additional_requirements: string;
}

export type ComputeState =
  | null
  | { error: string }
  | { result: EstimateResult; inputs: RawEstimateInputs };

function readInputs(formData: FormData): RawEstimateInputs {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    name: get("name"),
    mobile: get("mobile"),
    whatsapp: get("whatsapp") || get("mobile"),
    email: get("email"),
    site_location: get("site_location"),
    city: get("city"),
    state: get("state"),
    plot_width: get("plot_width"),
    plot_length: get("plot_length"),
    builtup_area_per_floor: get("builtup_area_per_floor"),
    builtup_area_sqft: get("builtup_area_sqft"),
    floors: get("floors"),
    building_type: get("building_type"),
    package_key: get("package_key"),
    optional_works: get("optional_works"),
    preferred_start_date: get("preferred_start_date"),
    additional_requirements: get("additional_requirements"),
  };
}

function totalBuiltupArea(inputs: RawEstimateInputs): number {
  const explicit = Number(inputs.builtup_area_sqft) || 0;
  if (explicit > 0) return explicit;
  const perFloor = Number(inputs.builtup_area_per_floor) || 0;
  const floors = Number(inputs.floors) || 1;
  return perFloor * floors;
}

async function computeFromInputs(inputs: RawEstimateInputs): Promise<{ result?: EstimateResult; error?: string }> {
  const area = totalBuiltupArea(inputs);
  const floors = Number(inputs.floors) || 1;

  if (!inputs.name) return { error: "Please enter your name." };
  if (!inputs.mobile) return { error: "Please enter a mobile number." };
  if (!inputs.site_location || !inputs.city || !inputs.state) return { error: "Please enter the site location, city and state." };
  if (area <= 0) return { error: "Please enter a built-up area (or per-floor area) greater than zero." };
  if (!inputs.building_type) return { error: "Please select a building type." };
  if (!inputs.package_key) return { error: "Please select a package." };

  // Service context: estimator_packages/estimator_rates are authenticated-only
  // under 0010_rls_policies.sql, but this runs for anonymous website visitors
  // (public reads handled server-side with the service context, per 0010's
  // own convention). Read-only here.
  const supabase = createAdminClient();
  const { data: pkg } = await supabase
    .from("estimator_packages")
    .select("id,key,label,rate_per_sqft,description,inclusions,exclusions")
    .eq("key", inputs.package_key)
    .maybeSingle();
  if (!pkg) return { error: "Selected package is unavailable. Please choose another." };

  const { data: rates } = await supabase
    .from("estimator_rates")
    .select("id,component,label,percent");

  const result = buildEstimate(
    {
      builtup_area_sqft: area,
      floors,
      package_key: inputs.package_key,
      optional_works: inputs.optional_works ? inputs.optional_works.split(",").filter(Boolean) : [],
      preferred_start_date: inputs.preferred_start_date || null,
    },
    pkg as EstimatorPackageRow,
    (rates ?? []) as EstimatorRateRow[]
  );

  return { result };
}

export async function computeEstimate(_prev: ComputeState, formData: FormData): Promise<ComputeState> {
  const inputs = readInputs(formData);
  const { result, error } = await computeFromInputs(inputs);
  if (error || !result) return { error: error ?? "Could not compute an estimate." };
  return { result, inputs };
}

export async function generateQuotation(_prev: ComputeState, formData: FormData): Promise<ComputeState> {
  const inputs = readInputs(formData);
  const { result, error } = await computeFromInputs(inputs);
  if (error || !result) return { error: error ?? "Could not compute an estimate." };

  // Service context, deliberately: this server action runs for anonymous
  // visitors, and leads/quotations/quotation_versions/lead_activities are all
  // owner-only under RLS (0010), while quotation_public_tokens has NO anon
  // INSERT policy on purpose (0014 — a permissive one would let anyone mint a
  // share-token for someone else's quotation). Every value written here is
  // built server-side in this function; nothing row-targeting comes from the
  // client, so bypassing RLS does not widen what a visitor can touch.
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .insert({
      organisation_id: IDS.org,
      customer_name: inputs.name,
      mobile: inputs.mobile,
      whatsapp: inputs.whatsapp,
      email: inputs.email || null,
      site_location: inputs.site_location,
      city: inputs.city,
      state: inputs.state,
      building_type: inputs.building_type,
      plot_size: inputs.plot_width && inputs.plot_length ? `${inputs.plot_width}x${inputs.plot_length}` : null,
      builtup_area_sqft: result.builtupAreaSqft,
      floors: Number(inputs.floors) || 1,
      preferred_package: result.packageKey,
      estimated_value: result.totalCost,
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: null,
      stage: "quoted",
      notes: inputs.additional_requirements || null,
      source: "instant_quotation",
    })
    .select()
    .single();

  // The real Postgres next_code(p_org, p_scope, p_prefix) requires the org id
  // (the demo mock defaults it, which masked this) — pass it explicitly.
  const { data: quotationNo } = await supabase.rpc("next_code", {
    p_org: IDS.org, p_scope: "quotation", p_prefix: "BH-Q",
  });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: quotation } = await supabase
    .from("quotations")
    .insert({
      organisation_id: IDS.org,
      quotation_no: quotationNo ?? `BH-Q-${Date.now()}`,
      lead_id: lead?.id ?? null,
      client_id: null,
      project_id: null,
      kind: "package",
      status: "sent",
      current_version: 1,
      valid_until: validUntil.toISOString().slice(0, 10),
    })
    .select()
    .single();

  await supabase.from("quotation_versions").insert({
    quotation_id: quotation?.id,
    version: 1,
    project_type: inputs.building_type,
    plot_area_sqft: inputs.plot_width && inputs.plot_length ? Number(inputs.plot_width) * Number(inputs.plot_length) : null,
    builtup_area_sqft: result.builtupAreaSqft,
    floors: Number(inputs.floors) || 1,
    package: result.packageKey,
    cost_per_sqft: result.costPerSqft,
    total_cost: result.totalCost,
    optional_items: result.optionalWorks,
    payment_schedule: result.paymentSchedule,
    timeline: `${result.totalMonths} months (indicative)`,
    specifications: {
      breakdown: result.breakdown,
      timeline_stages: result.timeline,
      assumptions: result.assumptions,
      customer: {
        name: inputs.name,
        mobile: inputs.mobile,
        whatsapp: inputs.whatsapp,
        email: inputs.email,
        site_location: inputs.site_location,
        city: inputs.city,
        state: inputs.state,
        plot_width: inputs.plot_width,
        plot_length: inputs.plot_length,
        preferred_start_date: inputs.preferred_start_date,
        additional_requirements: inputs.additional_requirements,
      },
    },
    inclusions: result.inclusions,
    exclusions: result.exclusions,
    terms: "Valid for 30 days from generation. Subject to site inspection and BOQ confirmation.",
    notes: inputs.additional_requirements || null,
  });

  if (lead?.id) {
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "quotation_sent",
      note: `Instant quotation ${quotationNo ?? ""} generated from the public Cost Estimator.`,
    });
  }

  // Public quotation links never expose the raw quotations.id — generate a
  // cryptographically random, unguessable token instead (24 bytes -> 32
  // base64url chars) and route through /quotation/[token].
  const token = randomBytes(24).toString("base64url");
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 30);
  await supabase.from("quotation_public_tokens").insert({
    quotation_id: quotation?.id,
    token,
    expires_at: tokenExpiry.toISOString(),
    revoked: false,
  });

  redirect(`/quotation/${token}`);
}
