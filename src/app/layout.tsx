import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  // 600 is only for the hero's resume keys (Ethan, 2026-10-15).
  weight: ["400", "500", "600"],
  variable: "--font-mono-loaded",
});

export function generateMetadata(): Metadata {
  const profile = getProfile();
  const [firstName, ...rest] = profile.name.split(" ");
  // The image comes from app/opengraph-image.tsx; Next adds og:image itself.
  return {
    metadataBase: new URL(siteConfig.url),
    title: profile.name,
    description: profile.oneLiner,
    alternates: { canonical: "/" },
    openGraph: {
      type: "profile",
      url: "/",
      siteName: profile.name,
      title: profile.name,
      description: profile.oneLiner,
      firstName,
      lastName: rest.join(" "),
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: profile.name,
      description: profile.oneLiner,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, plexMono.variable, "h-full antialiased")}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
