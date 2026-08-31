import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, Button, Badge, buttonClass } from "@buildhaus/ui";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import {
  createTestimonial, updateTestimonial, toggleTestimonialPublish,
  createFaq, updateFaq, toggleFaqPublish,
} from "./actions";

const TABS = [
  { key: "pages", label: "Pages" },
  { key: "testimonials", label: "Testimonials" },
  { key: "faqs", label: "FAQs" },
] as const;

export default async function WebsiteContentPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "pages";

  const [{ data: pages }, { data: testimonials }, { data: faqs }, { data: projects }] = await Promise.all([
    supabase.from("website_pages").select("id,slug,title,seo_title,meta_description,is_published,updated_at").order("slug", { ascending: true }),
    supabase.from("testimonials").select("id,client_name,project_id,quote,rating,is_published,display_order,projects(code,name)").order("display_order", { ascending: true }),
    supabase.from("faqs").select("id,category,question,answer,is_published,display_order").order("category", { ascending: true }).order("display_order", { ascending: true }),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
  ]);

  const pageList = pages ?? [];
  const testimonialList = testimonials ?? [];
  const faqList = faqs ?? [];
  const projectList = projects ?? [];

  const faqsByCategory = new Map<string, any[]>();
  for (const f of faqList) {
    const cat = f.category || "General";
    if (!faqsByCategory.has(cat)) faqsByCategory.set(cat, []);
    faqsByCategory.get(cat)!.push(f);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Public Website Content</h1>
        <p className="text-sm text-muted">
          Manage the copy, testimonials and FAQs shown on the public marketing site. Only published
          rows appear on buildhaus — drafts stay here until you publish them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/owner/website?tab=${t.key}`}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
              (tab === t.key ? "bg-brand text-white" : "border border-border text-sand hover:bg-surface")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "pages" && (
        <Card className="p-0">
          {pageList.length === 0 ? (
            <div className="p-5"><EmptyState title="No pages yet" /></div>
          ) : (
            <div className="divide-y divide-border">
              {pageList.map((p: any) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/owner/website/pages/${p.slug}`} className="font-semibold text-sandlight hover:text-brand">
                        {p.title}
                      </Link>
                      <Badge tone={p.is_published ? "ok" : "muted"}>{p.is_published ? "Published" : "Draft"}</Badge>
                    </div>
                    <div className="text-xs text-muted">/{p.slug === "home" ? "" : p.slug} · updated {dateLabel(p.updated_at)}</div>
                  </div>
                  {/* A <Button> (renders <button>) nested inside this <Link>
                      (renders <a>) is invalid content model — interactive
                      content inside interactive content. buttonClass()
                      applies the same visual style directly to the anchor. */}
                  <Link href={`/owner/website/pages/${p.slug}`} className={buttonClass("outline")}>
                    Edit →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "testimonials" && (
        <>
          <Card>
            <h2 className="mb-3 font-bold text-ivory">Add a testimonial</h2>
            <form action={createTestimonial} className="grid gap-x-4 sm:grid-cols-2">
              <Input label="Client name" name="client_name" placeholder="Sunil Reddy" required />
              <Select label="Project (optional)" name="project_id" defaultValue="">
                <option value="">No project linked</option>
                {projectList.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </Select>
              <div className="sm:col-span-2"><Textarea label="Quote" name="quote" placeholder="What the client said..." required /></div>
              <Input label="Rating (1-5)" name="rating" type="number" min={1} max={5} defaultValue={5} />
              <Input label="Display order" name="display_order" type="number" defaultValue={testimonialList.length + 1} />
              <div className="sm:col-span-2"><Button type="submit">Add testimonial</Button></div>
            </form>
          </Card>

          {testimonialList.length === 0 ? (
            <EmptyState title="No testimonials yet" hint="Add one above — publish it to show it on the website." />
          ) : (
            <div className="space-y-3">
              {testimonialList.map((t: any) => (
                <Card key={t.id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sandlight">{t.client_name}</span>
                      {t.projects && <span className="text-xs text-muted">{t.projects.code} · {t.projects.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={t.is_published ? "ok" : "muted"}>{t.is_published ? "Published" : "Draft"}</Badge>
                      <form action={toggleTestimonialPublish}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="is_published" value={String(!t.is_published)} />
                        <Button type="submit" variant="outline">{t.is_published ? "Unpublish" : "Publish"}</Button>
                      </form>
                    </div>
                  </div>
                  <form action={updateTestimonial} className="grid gap-x-4 sm:grid-cols-4">
                    <input type="hidden" name="id" value={t.id} />
                    <Input label="Client name" name="client_name" defaultValue={t.client_name} className="sm:col-span-2" />
                    <Input label="Rating (1-5)" name="rating" type="number" min={1} max={5} defaultValue={t.rating} />
                    <Input label="Display order" name="display_order" type="number" defaultValue={t.display_order} />
                    <div className="sm:col-span-4"><Textarea label="Quote" name="quote" defaultValue={t.quote} /></div>
                    <div className="sm:col-span-4"><Button type="submit" variant="outline">Save</Button></div>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "faqs" && (
        <>
          <Card>
            <h2 className="mb-3 font-bold text-ivory">Add an FAQ</h2>
            <form action={createFaq} className="grid gap-x-4 sm:grid-cols-2">
              <Input label="Category" name="category" placeholder="Cost & Payments" required />
              <Input label="Display order" name="display_order" type="number" defaultValue={1} />
              <div className="sm:col-span-2"><Input label="Question" name="question" placeholder="How is the cost per sqft calculated?" required /></div>
              <div className="sm:col-span-2"><Textarea label="Answer" name="answer" placeholder="Answer shown to visitors..." required /></div>
              <div className="sm:col-span-2"><Button type="submit">Add FAQ</Button></div>
            </form>
          </Card>

          {faqList.length === 0 ? (
            <EmptyState title="No FAQs yet" hint="Add one above — publish it to show it on the website." />
          ) : (
            [...faqsByCategory.entries()].map(([category, items]) => (
              <Card key={category}>
                <h2 className="mb-3 font-bold text-ivory">{category}</h2>
                <div className="space-y-3">
                  {items.map((f: any) => (
                    <div key={f.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={f.is_published ? "ok" : "muted"}>{f.is_published ? "Published" : "Draft"}</Badge>
                        <form action={toggleFaqPublish}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="is_published" value={String(!f.is_published)} />
                          <Button type="submit" variant="outline">{f.is_published ? "Unpublish" : "Publish"}</Button>
                        </form>
                      </div>
                      <form action={updateFaq} className="grid gap-x-4 sm:grid-cols-4">
                        <input type="hidden" name="id" value={f.id} />
                        <div className="sm:col-span-3"><Input label="Question" name="question" defaultValue={f.question} /></div>
                        <Input label="Display order" name="display_order" type="number" defaultValue={f.display_order} />
                        <div className="sm:col-span-4"><Textarea label="Answer" name="answer" defaultValue={f.answer} /></div>
                        <Input label="Category" name="category" defaultValue={f.category} className="sm:col-span-2" />
                        <div className="sm:col-span-2 flex items-end"><Button type="submit" variant="outline">Save</Button></div>
                      </form>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}
