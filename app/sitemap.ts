import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Only the public marketing/auth-entry surface — authenticated app pages are
// disallowed in robots.ts and shouldn't be listed here either.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteConfig.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
