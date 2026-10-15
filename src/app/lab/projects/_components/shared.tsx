import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { StatusChip, projectStatusLed } from "@/components/manual";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/content";
import { cn } from "@/lib/cn";

/** Entry number inside chapter 02, Projects: "02.1". */
export function entryNo(index: number) {
  return `02.${index + 1}`;
}

export function ProjectStatus({ project }: { project: Project }) {
  return (
    <StatusChip state={projectStatusLed[project.status]}>
      {project.status}
    </StatusChip>
  );
}

/** Where the project lives outside the manual: the live product, else the repo. */
export function ProjectLinks({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const outside = project.links.live
    ? { href: project.links.live, label: new URL(project.links.live).host }
    : project.links.repo
      ? { href: project.links.repo, label: "Repo" }
      : null;
  if (!outside) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <Button variant="outline" asChild>
        <a href={outside.href} target="_blank" rel="noreferrer">
          {outside.label}
          <ArrowUpRightIcon weight="light" />
        </a>
      </Button>
    </div>
  );
}
