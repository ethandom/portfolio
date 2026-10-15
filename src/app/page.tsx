import { WorkHistory } from "@/features/experience";
import { Projects } from "@/features/projects";
import { getProfile } from "@/lib/content";

export default function ManualPage() {
  const profile = getProfile();

  return (
    <main className="mx-auto w-full max-w-(--container) px-(--gutter) pb-(--section-gap)">
      {/* Placeholder title page until features/hero lands. */}
      <header className="max-w-(--measure) pt-12 pb-(--section-gap) sm:pt-20">
        <p className="font-mono text-label uppercase text-ink-muted">Operator&apos;s Manual · p. 01</p>
        <h1 className="mt-4 text-display font-light">{profile.name}</h1>
        <p className="mt-4 text-lg text-ink-muted">{profile.oneLiner}</p>
      </header>

      <div className="grid grid-cols-1 gap-(--section-gap)">
        <WorkHistory chapter={2} />
        <Projects chapter={3} />
      </div>
    </main>
  );
}
