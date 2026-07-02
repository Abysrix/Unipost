import type { Viewport } from "next";
import { Plus_Jakarta_Sans, Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/providers/AppProviders";
import { createMetadata, productJsonLd } from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata = createMetadata();

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${syne.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd()) }}
        />
      </head>
      <body className="min-h-screen bg-bg-primary font-sans text-white antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
