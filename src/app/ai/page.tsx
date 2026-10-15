import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { MachinePage } from "@/features/machine";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { JsonLd, personJsonLd } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const { name } = getProfile();
  const description = `${name}, as plain text for AI agents and crawlers.`;
  return {
    title: `Machine view · ${name}`,
    description,
    alternates: { canonical: "/ai" },
    openGraph: { url: "/ai", title: `Machine view · ${name}`, description },
  };
}

export default function AiPage() {
  const person = personJsonLd(
    { profile: getProfile(), experience: getExperience(), projects: getProjects() },
    siteConfig.url,
  );

  return (
    <>
      <JsonLd data={person} />
      <MachinePage />
    </>
  );
}
