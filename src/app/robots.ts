import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Everyone, AI crawlers included, may read the Manual and the markdown.
// /lab is dev-only (404 in production) and /md/ is the rewrite target behind
// the public /<path>.md URLs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/lab", "/md/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
