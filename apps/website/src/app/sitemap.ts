import type { MetadataRoute } from "next";
import { createClient } from "@buildhaus/database";
import { WEBSITE_URL } from "@/lib/env";
import { SERVICES } from "./services/data";

const STATIC_ROUTES = [
  "", "/about", "/services", "/packages", "/cost-estimator", "/projects",
  "/process", "/materials", "/contact", "/enquiry", "/request-site-visit",
  "/request-callback", "/faq",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("public_projects")
    .select("slug,name")
    .eq("is_public", true);

  const { data: packages } = await supabase
    .from("estimator_packages")
    .select("key");

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${WEBSITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const projectEntries: MetadataRoute.Sitemap = (projects ?? [])
    .filter((p: any) => p.slug)
    .map((p: any) => ({
      url: `${WEBSITE_URL}/projects/${p.slug}`,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  const serviceEntries: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${WEBSITE_URL}/services/${s.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const packageEntries: MetadataRoute.Sitemap = (packages ?? [])
    .filter((p: any) => p.key)
    .map((p: any) => ({
      url: `${WEBSITE_URL}/packages/${p.key}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  return [...staticEntries, ...projectEntries, ...serviceEntries, ...packageEntries];
}
