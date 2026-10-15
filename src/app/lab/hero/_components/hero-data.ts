import { getProfile, type Profile } from "@/lib/content";

/** Lab-only: the few facts a hero needs, straight from profile.md. */
export type HeroData = {
  name: string;
  oneLiner: string;
  status: Profile["status"];
  links: Profile["links"];
  /** Placeholder until a public-safe PDF lands in /public. */
  resume: string;
};

export function getHeroData(): HeroData {
  const profile = getProfile();
  return {
    name: profile.name,
    oneLiner: profile.oneLiner,
    status: profile.status,
    links: profile.links,
    resume: profile.links.resume ?? "/resume.pdf",
  };
}
