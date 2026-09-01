"use server";
import { createClient, uploadFile } from "@buildhaus/database";
import { validateFile } from "@buildhaus/utils";
import { revalidatePath } from "next/cache";
import { createProjectSchema, zodErrorToFieldErrors, type ActionResult } from "@buildhaus/validation";
import { assertOwner } from "@/lib/authz";
import { unwrap, logAudit } from "@/lib/mutation";

export type DocumentFormState = { error: string } | null;

// Owner-side document upload — project agreements, approvals, internal
// workbooks etc (the `documents` table). client_visible controls whether
// the file also surfaces on the Client portal's Documents page
// (src/app/(app)/client/documents/page.tsx), which only reads rows already
// marked client_visible=true.
export async function uploadDocument(
  projectId: string,
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { error: "You must be signed in as the Owner to upload a document." };
  }
  const supabase = createClient();

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Please enter a title." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Please choose a file to upload." };
  }
  const validationError = validateFile(file, "document");
  if (validationError) return { error: validationError };

  const { url } = await uploadFile({ file, filename: file.name, folder: `documents/${projectId}` });

  // Previously ignored: the insert's error was never checked, so a rejected
  // write (RLS, a NOT NULL violation, ...) looked identical to a successful
  // upload — the file was on disk, but no `documents` row ever pointed to
  // it, so it just never appeared on the page. documents.organisation_id is
  // itself NOT NULL on the real schema and was previously never set here at
  // all — exactly the class of bug that comment describes, just still
  // present until now (see supabase/migrations/0019_schema_drift_repair_2.sql).
  const { error } = await supabase.from("documents").insert({
    organisation_id: ctx.profile!.organisation_id,
    project_id: projectId,
    title,
    category: String(formData.get("category") || "") || null,
    file_url: url,
    client_visible: formData.get("client_visible") === "on",
    uploaded_at: new Date().toISOString(),
  });
  if (error) return { error: error.message || "Couldn't save the document." };

  revalidatePath(`/owner/projects/${projectId}`);
  return null;
}

export type ProjectFormState = ActionResult<{ id: string; code: string }> | null;

// Previously: no Supabase error (profile lookup, next_code RPC, or the
// final insert) was ever checked, and the action returned void — so any
// rejected write (a colliding project code hitting projects' unique
// (organisation_id, code) constraint, an RLS rejection, ...) looked
// identical to success: the form just sat there. See
// packages/database/src/demo/rpc.ts for the matching next_code fix (Demo
// Mode's mock was itself producing the collision on the very first call).
export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner to create a project." };
  }

  const emptyToUndefined = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? undefined : s;
  };
  const parsed = createProjectSchema.safeParse({
    name: String(formData.get("name") || ""),
    project_type: String(formData.get("project_type") || ""),
    site_address: String(formData.get("site_address") || ""),
    builtup_area_sqft: emptyToUndefined(formData.get("builtup")),
    floors: emptyToUndefined(formData.get("floors")),
    contract_value: emptyToUndefined(formData.get("contract_value")),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodErrorToFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const supabase = createClient();
  const orgId = ctx.profile.organisation_id;

  const codeResult = await supabase.rpc("next_code", { p_org: orgId, p_scope: "project", p_prefix: "BH" });
  if (codeResult.error) {
    return { ok: false, error: `Couldn't generate a project code: ${codeResult.error.message ?? "unknown error"}` };
  }
  const code = codeResult.data as string;

  const insertResult = await supabase
    .from("projects")
    .insert({
      organisation_id: orgId,
      code,
      name: input.name,
      project_type: input.project_type,
      site_address: input.site_address,
      builtup_area_sqft: input.builtup_area_sqft ?? null,
      floors: input.floors ?? null,
      contract_value: input.contract_value ?? null,
      status: "pre_construction",
      created_by: ctx.userId,
    })
    .select("id,code")
    .single();

  const result = unwrap<{ id: string; code: string }>(insertResult, "Couldn't create the project.");
  if (!result.ok) return result;

  await logAudit(supabase, {
    action: "create",
    entityType: "project",
    entityId: result.data.id,
    summary: `Created project ${result.data.code}: ${input.name}`,
  });

  revalidatePath("/owner/projects");
  return { ok: true, data: result.data };
}
