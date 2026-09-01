"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError, unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

// NOTE: apps/website reads website_pages/website_sections/testimonials/faqs
// live on every request in Demo Mode (no ISR, no fetch caching) — a plain
// page refresh over there picks up whatever we write here. revalidatePath
// only needs to cover the portal's own routes.
function revalidateWebsiteAdmin() {
  revalidatePath("/owner/website");
}

async function requireOwner(): Promise<ActionResult<null> | null> {
  try {
    await assertOwner();
    return null;
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
}

/* Testimonials -------------------------------------------------------------- */

export async function createTestimonial(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const clientName = String(formData.get("client_name") || "").trim();
  const quote = String(formData.get("quote") || "").trim();
  if (!clientName || !quote) return { ok: false, error: "Enter a client name and quote." };

  const rating = Math.min(5, Math.max(1, Number(formData.get("rating") || 5)));
  const projectId = String(formData.get("project_id") || "").trim() || null;

  const result = unwrap(
    await supabase.from("testimonials").insert({
      client_name: clientName,
      project_id: projectId,
      quote,
      rating,
      is_published: false,
      display_order: Number(formData.get("display_order") || 0) || 0,
    }),
    "Couldn't create the testimonial."
  );
  if (!result.ok) return result;

  revalidateWebsiteAdmin();
  return { ok: true, data: null };
}

export async function updateTestimonial(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing testimonial id." };

  const rating = Math.min(5, Math.max(1, Number(formData.get("rating") || 5)));

  const result = unwrap(
    await supabase.from("testimonials").update({
      client_name: String(formData.get("client_name") || "").trim(),
      quote: String(formData.get("quote") || "").trim(),
      rating,
      display_order: Number(formData.get("display_order") || 0) || 0,
    }).eq("id", id),
    "Couldn't save the testimonial."
  );
  if (!result.ok) return result;

  revalidateWebsiteAdmin();
  return { ok: true, data: null };
}

export async function toggleTestimonialPublish(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const isPublished = String(formData.get("is_published") || "false") === "true";
  if (!id) return;

  throwIfError(
    await supabase.from("testimonials").update({ is_published: isPublished }).eq("id", id),
    "Couldn't update the testimonial's publish status."
  );
  revalidateWebsiteAdmin();
}

/* FAQs ------------------------------------------------------------------------ */

export async function createFaq(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const question = String(formData.get("question") || "").trim();
  const answer = String(formData.get("answer") || "").trim();
  if (!question || !answer) return { ok: false, error: "Enter a question and answer." };

  const result = unwrap(
    await supabase.from("faqs").insert({
      category: String(formData.get("category") || "General").trim() || "General",
      question,
      answer,
      is_published: false,
      display_order: Number(formData.get("display_order") || 0) || 0,
    }),
    "Couldn't create the FAQ."
  );
  if (!result.ok) return result;

  revalidateWebsiteAdmin();
  return { ok: true, data: null };
}

export async function updateFaq(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing FAQ id." };

  const result = unwrap(
    await supabase.from("faqs").update({
      category: String(formData.get("category") || "General").trim() || "General",
      question: String(formData.get("question") || "").trim(),
      answer: String(formData.get("answer") || "").trim(),
      display_order: Number(formData.get("display_order") || 0) || 0,
    }).eq("id", id),
    "Couldn't save the FAQ."
  );
  if (!result.ok) return result;

  revalidateWebsiteAdmin();
  return { ok: true, data: null };
}

export async function toggleFaqPublish(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const isPublished = String(formData.get("is_published") || "false") === "true";
  if (!id) return;

  throwIfError(
    await supabase.from("faqs").update({ is_published: isPublished }).eq("id", id),
    "Couldn't update the FAQ's publish status."
  );
  revalidateWebsiteAdmin();
}

/* Pages & sections -------------------------------------------------------- */

export async function updatePageMeta(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const slug = String(formData.get("slug") || "");
  if (!slug) return { ok: false, error: "Missing page slug." };

  const result = unwrap(
    await supabase.from("website_pages").update({
      title: String(formData.get("title") || "").trim(),
      seo_title: String(formData.get("seo_title") || "").trim() || null,
      meta_description: String(formData.get("meta_description") || "").trim() || null,
    }).eq("slug", slug),
    "Couldn't save the page details."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/website");
  revalidatePath(`/owner/website/pages/${slug}`);
  return { ok: true, data: null };
}

export async function togglePagePublish(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const slug = String(formData.get("slug") || "");
  const isPublished = String(formData.get("is_published") || "false") === "true";
  if (!slug) return;

  throwIfError(
    await supabase.from("website_pages").update({ is_published: isPublished }).eq("slug", slug),
    "Couldn't update the page's publish status."
  );
  revalidatePath("/owner/website");
  revalidatePath(`/owner/website/pages/${slug}`);
}

export async function updateSection(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const authError = await requireOwner();
  if (authError) return authError;
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const pageSlug = String(formData.get("page_slug") || "");
  if (!id) return { ok: false, error: "Missing section id." };

  const result = unwrap(
    await supabase.from("website_sections").update({
      heading: String(formData.get("heading") || "").trim() || null,
      body: String(formData.get("body") || "").trim() || null,
    }).eq("id", id),
    "Couldn't save the section."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/website");
  if (pageSlug) revalidatePath(`/owner/website/pages/${pageSlug}`);
  return { ok: true, data: null };
}

export async function toggleSectionPublish(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const pageSlug = String(formData.get("page_slug") || "");
  const isPublished = String(formData.get("is_published") || "false") === "true";
  if (!id) return;

  throwIfError(
    await supabase.from("website_sections").update({ is_published: isPublished }).eq("id", id),
    "Couldn't update the section's publish status."
  );
  revalidatePath("/owner/website");
  if (pageSlug) revalidatePath(`/owner/website/pages/${pageSlug}`);
}
