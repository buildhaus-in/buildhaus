import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { Card, Badge, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Textarea } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { updatePageMeta, togglePagePublish, updateSection, toggleSectionPublish } from "../../actions";

export default async function WebsitePageDetail({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: page } = await supabase
    .from("website_pages")
    .select("id,slug,title,seo_title,meta_description,is_published,updated_at")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!page) notFound();

  const { data: sections } = await supabase
    .from("website_sections")
    .select("id,page_slug,key,heading,body,display_order,is_published")
    .eq("page_slug", params.slug)
    .order("display_order", { ascending: true });

  const sectionList = sections ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/owner/website" className="text-xs uppercase tracking-wide text-brand hover:underline">← Public Website Content</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-ivory">{page.title}</h1>
          <Badge tone={page.is_published ? "ok" : "muted"}>{page.is_published ? "Published" : "Draft"}</Badge>
        </div>
        <p className="text-sm text-muted">/{page.slug === "home" ? "" : page.slug} · last updated {dateLabel(page.updated_at)}</p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Page visibility</h2>
          <form action={togglePagePublish}>
            <input type="hidden" name="slug" value={page.slug} />
            <input type="hidden" name="is_published" value={String(!page.is_published)} />
            <SubmitButton variant={page.is_published ? "outline" : "primary"}>
              {page.is_published ? "Unpublish page" : "Publish page"}
            </SubmitButton>
          </form>
        </div>
        <p className="text-xs text-muted">
          {page.is_published
            ? "This page is live on the public website."
            : "This page is a draft — it will not be served on the public website until published."}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">SEO</h2>
        <ActionForm action={updatePageMeta} successMessage="SEO details saved." resetOnSuccess={false} className="grid gap-x-4 sm:grid-cols-2">
          <input type="hidden" name="slug" value={page.slug} />
          <Input label="Page title" name="title" defaultValue={page.title} />
          <Input label="SEO title" name="seo_title" defaultValue={page.seo_title ?? ""} />
          <div className="sm:col-span-2"><Textarea label="Meta description" name="meta_description" defaultValue={page.meta_description ?? ""} /></div>
          <div className="sm:col-span-2"><SubmitButton>Save SEO details</SubmitButton></div>
        </ActionForm>
      </Card>

      <div>
        <h2 className="mb-3 font-bold text-ivory">Editable sections</h2>
        {sectionList.length === 0 ? (
          <EmptyState title="No editable sections on this page yet" hint="Sections are added by whoever wires up this page's content blocks in code." />
        ) : (
          <div className="space-y-3">
            {sectionList.map((s: any) => (
              <Card key={s.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-muted">{s.key}</div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.is_published ? "ok" : "muted"}>{s.is_published ? "Published" : "Draft"}</Badge>
                    <form action={toggleSectionPublish}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="page_slug" value={page.slug} />
                      <input type="hidden" name="is_published" value={String(!s.is_published)} />
                      <SubmitButton variant="outline">{s.is_published ? "Unpublish" : "Publish"}</SubmitButton>
                    </form>
                  </div>
                </div>
                <ActionForm action={updateSection} successMessage="Section saved." resetOnSuccess={false} className="space-y-3">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="page_slug" value={page.slug} />
                  <Input label="Heading" name="heading" defaultValue={s.heading ?? ""} />
                  <Textarea label="Body text" name="body" defaultValue={s.body ?? ""} />
                  <SubmitButton variant="outline">Save section</SubmitButton>
                </ActionForm>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
