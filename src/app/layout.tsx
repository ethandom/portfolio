import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { getProfile } from "@/lib/content";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
});

export function generateMetadata(): Metadata {
  const profile = getProfile();
  return {
    metadataBase: new URL(siteConfig.url),
    title: profile.name,
    description: profile.oneLiner,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, plexMono.variable, "h-full antialiased")}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
