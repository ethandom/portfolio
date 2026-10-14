import { getProfile } from "@/lib/content";

export default function ManualPage() {
  const profile = getProfile();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8">
      <p className="font-mono text-label uppercase text-ink-muted">Operator&apos;s Manual · p. 01</p>
      <h1 className="mt-4 text-display font-light">{profile.name}</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-muted">{profile.oneLiner}</p>
    </main>
  );
}
