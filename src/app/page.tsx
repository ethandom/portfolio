import { AwayFromKeyboard } from "@/features/about";
import { WorkHistory } from "@/features/experience";
import { Hero } from "@/features/hero";
import { Projects } from "@/features/projects";
import { Specifications } from "@/features/specs";

export default function ManualPage() {
  return (
    <main className="mx-auto w-full max-w-(--container) px-(--gutter) pb-(--section-gap)">
      <Hero />
      <div className="grid grid-cols-1 gap-(--section-gap) pt-(--section-gap)">
        <Specifications chapter={1} />
        <WorkHistory chapter={2} />
        <Projects chapter={3} />
        <AwayFromKeyboard chapter={4} />
      </div>
    </main>
  );
}
