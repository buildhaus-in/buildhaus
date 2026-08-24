"use server";
import { createClient, uploadFile } from "@buildhaus/database";
import { validateFile } from "@buildhaus/utils";
import { revalidatePath } from "next/cache";

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

  await supabase.from("documents").insert({
    project_id: projectId,
    title,
    category: String(formData.get("category") || "") || null,
    file_url: url,
    client_visible: formData.get("client_visible") === "on",
    uploaded_at: new Date().toISOString(),
  });

  revalidatePath(`/owner/projects/${projectId}`);
  return null;
}

export async function createProject(formData: FormData) {
  const supabase = createClient();
  const { data: prof } = await supabase.from("profiles").select("organisation_id").maybeSingle();
  if (!prof) return;

  // Human-readable project code via the DB function.
  const { data: code } = await supabase.rpc("next_code", {
    p_org: prof.organisation_id, p_scope: "project", p_prefix: "BH",
  });

  await supabase.from("projects").insert({
    organisation_id: prof.organisation_id,
    code: code ?? `BH-${Date.now()}`,
    name: String(formData.get("name") || "Untitled project"),
    project_type: String(formData.get("project_type") || ""),
    site_address: String(formData.get("site_address") || ""),
    builtup_area_sqft: Number(formData.get("builtup") || 0) || null,
    floors: Number(formData.get("floors") || 0) || null,
    contract_value: Number(formData.get("contract_value") || 0) || null,
    status: "pre_construction",
  });
  revalidatePath("/owner/projects");
}
