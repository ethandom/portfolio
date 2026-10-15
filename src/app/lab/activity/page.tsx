import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DocLine, DocLineItem } from "@/components/manual";
import { Button } from "@/components/ui/button";
import { Consistency } from "@/features/activity";
import { getProfile } from "@/lib/content";
import { ThemeSwitch } from "../_components/theme-switch";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

/** Lab-only until the calendar fills in; not on / yet (Ethan, 2026-10-15). */
export default function ActivityLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const profile = getProfile();

  return (
    <div className="mx-auto w-full max-w-(--container) px-(--gutter) pb-24">
      <DocLine>
        <DocLineItem emphasis>{profile.name}</DocLineItem>
        <DocLineItem>Activity</DocLineItem>
        <DocLineItem>p. 00a</DocLineItem>
      </DocLine>

      <header className="grid gap-8 pt-12 pb-16 sm:pt-20">
        <div className="max-w-(--measure)">
          <h1 className="text-display font-light">Activity</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Live GitHub and LeetCode activity for the last two weeks, cached for
            an hour. Not on the Manual page yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ThemeSwitch />
          <Button variant="link" asChild>
            <Link href="/lab">
              Component lab
              <ArrowUpRightIcon weight="light" />
            </Link>
          </Button>
        </div>
      </header>

      <Consistency chapter={4} weeks={2} />
    </div>
  );
}
