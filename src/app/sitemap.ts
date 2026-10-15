import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// One page for now; case studies at /projects/[slug] join this list in step 5.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteConfig.url, changeFrequency: "monthly", priority: 1 }];
}
