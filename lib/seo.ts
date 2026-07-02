import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * Metadata factory — one place to build page metadata + Open Graph + Twitter.
 * Ported from Bharvix, retargeted to UniPost.
 */
export function createMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  keywords = [],
}: {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
} = {}): Metadata {
  const fullTitle = title ? `${title} — ${siteConfig.name}` : siteConfig.titleDefault;
  const url = `${siteConfig.url}${path}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: fullTitle,
    description,
    keywords: [...siteConfig.keywords, ...keywords],
    applicationName: siteConfig.name,
    authors: [{ name: "Bharvix" }],
    creator: "Bharvix",
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: siteConfig.locale,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [siteConfig.ogImage],
      creator: siteConfig.twitterHandle,
    },
    robots: { index: true, follow: true },
  };
}

/** JSON-LD SoftwareApplication schema for the product. */
export function productJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    description: siteConfig.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    publisher: { "@type": "Organization", name: "Bharvix", url: "https://bharvix.com" },
    offers: { "@type": "Offer", availability: "https://schema.org/PreOrder" },
  };
}
