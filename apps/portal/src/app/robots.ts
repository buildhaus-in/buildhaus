import type { MetadataRoute } from "next";

// Belt-and-suspenders alongside the per-page `robots: noindex` metadata —
// the private portal must never be crawled or indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
