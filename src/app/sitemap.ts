import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// The Manual and its machine view; case studies at /projects/[slug] join this
// list in step 5.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/ai`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
