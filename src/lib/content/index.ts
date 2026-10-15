import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { CONTENT_DIR, parseDir, parseFile } from "./load";
import {
  activitySnapshotSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  type ActivitySnapshot,
  type Experience,
  type Profile,
  type Project,
} from "./schemas";

export const getProfile = cache((): Profile => {
  const { body, ...profile } = parseFile(
    path.join(CONTENT_DIR, "profile.md"),
    profileSchema,
  );
  return { ...profile, bio: body };
});

export const getProjects = cache((): Project[] =>
  parseDir("projects", projectSchema).sort((a, b) => a.order - b.order),
);

export const getFeaturedProjects = cache((): Project[] =>
  getProjects().filter((p) => p.featured),
);

export const getProject = cache(
  (slug: string): Project | undefined =>
    getProjects().find((p) => p.slug === slug),
);

export const getExperience = cache((): Experience[] =>
  parseDir("experience", experienceSchema).sort((a, b) => a.order - b.order),
);

export const getActivitySnapshot = cache((): ActivitySnapshot =>
  activitySnapshotSchema.parse(
    JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, "activity.snapshot.json"), "utf8"),
    ),
  ),
);

export { formatPeriod, formatYearMonth } from "./format";
export type {
  ActivityDay,
  ActivitySnapshot,
  ActivitySource,
  Experience,
  ExperienceFigure,
  Metric,
  Period,
  Profile,
  Project,
  ProjectFigure,
  ProjectKind,
} from "./schemas";
