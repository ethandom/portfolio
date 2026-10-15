import type { Experience, Profile, Project } from "@/lib/content";

/**
 * schema.org Person for `/`, built from the same content as the page. The
 * current role is the experience entry with no end date; its organization
 * links to the project's live site when there is one.
 */
export function personJsonLd(
  { profile, experience, projects }: {
    profile: Profile;
    experience: Experience[];
    projects: Project[];
  },
  site: string,
) {
  const current = experience.find((e) => !e.period.end);
  const live = projects.find((p) => p.slug === current?.project)?.links.live;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${site}/#person`,
    name: profile.name,
    url: site,
    description: profile.oneLiner,
    email: `mailto:${profile.links.email}`,
    homeLocation: { "@type": "Place", name: profile.location },
    // Still enrolled, so an affiliation rather than alumniOf.
    affiliation: { "@type": "CollegeOrUniversity", name: profile.education.school },
    ...(current && {
      jobTitle: current.role,
      worksFor: {
        "@type": "Organization",
        name: current.org,
        ...(live && { url: live }),
      },
    }),
    knowsAbout: [
      ...profile.skills.languages,
      ...profile.skills.frameworks,
      ...profile.skills.tools,
      ...profile.skills.libraries,
    ],
    sameAs: [profile.links.github, profile.links.linkedin],
  };
}
