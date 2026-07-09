import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Same public/private boundary as middleware.ts's PUBLIC_PATHS — everything
// under the authenticated app is private and already noindex'd via
// (app)/layout.tsx's metadata; this is the defense-in-depth layer that stops
// crawling in the first place, not just indexing what got crawled.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard", "/create", "/posts", "/calendar", "/ai", "/score", "/coach",
        "/integrations", "/settings", "/analytics", "/billing", "/admin", "/api",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
