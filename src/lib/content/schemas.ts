import { z } from "zod";

/** "YYYY-MM" — month precision is all the site ever shows. */
export const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

/** `end` omitted means ongoing ("Present"). */
export const period = z
  .object({ start: yearMonth, end: yearMonth.optional() })
  .refine((p) => !p.end || p.end >= p.start, "end is before start");

/** A single spec-table row: "EVALS/SEC — 650k". */
export const metric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  note: z.string().optional(),
});

const httpsUrl = z.url({ protocol: /^https$/ });

export const activitySource = z.enum(["both", "github", "leetcode"]);

export const profileSchema = z.object({
  name: z.string().min(1),
  oneLiner: z.string().min(1),
  status: z.object({
    label: z.string().min(1),
    available: z.boolean(),
  }),
  location: z.string().min(1),
  education: z.object({
    school: z.string().min(1),
    degree: z.string().min(1),
    minor: z.string().optional(),
    graduation: yearMonth,
    coursework: z.array(z.string()).default([]),
  }),
  links: z.object({
    email: z.email(),
    github: httpsUrl,
    linkedin: httpsUrl,
    /** Site-relative path to a PDF in /public. */
    resume: z.string().regex(/^\/[\w./-]+\.pdf$/).optional(),
  }),
  metrics: z.array(metric).default([]),
  skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    tools: z.array(z.string()),
    libraries: z.array(z.string()),
  }),
  recognition: z
    .array(
      z.object({
        title: z.string().min(1),
        org: z.string().min(1),
        date: yearMonth,
        note: z.string().optional(),
      }),
    )
    .default([]),
  activity: z.object({
    github: z.string().min(1),
    leetcode: z.string().optional(),
    /** Which calendar the heatmap shows first; the viewer can switch. */
    defaultSource: activitySource.default("both"),
  }),
});

export const projectKind = z.enum(["systems", "web", "ai", "data"]);

export const projectSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1).max(160, "keep summaries to one line"),
  kind: z.array(projectKind).min(1),
  period,
  role: z.string().optional(),
  stack: z.array(z.string()).default([]),
  status: z.enum(["shipped", "active", "archived"]),
  featured: z.boolean().default(false),
  order: z.number().int(),
  highlights: z.array(z.string()).min(1),
  metrics: z.array(metric).default([]),
  links: z
    .object({
      repo: httpsUrl.optional(),
      live: httpsUrl.optional(),
    })
    .default({}),
  /** Set when an experience entry covers the same work (e.g. Conturo). */
  experience: z.string().optional(),
});

export const experienceSchema = z.object({
  org: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  period,
  order: z.number().int(),
  highlights: z.array(z.string()).min(1),
  stack: z.array(z.string()).default([]),
  /** Slug of a project with the long-form case study. */
  project: z.string().optional(),
  /**
   * Apprenticeships, where Ethan wasn't on the org's payroll. Printed as one
   * heading line, "Apprentice to Google VP": `relation` then `mentor`. The
   * mentor is a role that starts with the company name, never a person's name.
   */
  relation: z.string().optional(),
  mentor: z.string().optional(),
});

/** Normalized contribution day, shared by GitHub and LeetCode sources. */
export const activityDay = z.object({
  date: z.iso.date(),
  count: z.number().int().nonnegative(),
});

/** content/activity.snapshot.json — fallback when the live APIs fail. */
export const activitySnapshotSchema = z.object({
  updatedAt: z.iso.datetime().nullable(),
  github: z.array(activityDay),
  leetcode: z.array(activityDay),
});

export type ActivitySource = z.infer<typeof activitySource>;
export type ActivityDay = z.infer<typeof activityDay>;
export type ActivitySnapshot = z.infer<typeof activitySnapshotSchema>;
export type Metric = z.infer<typeof metric>;
export type Period = z.infer<typeof period>;
export type ProjectKind = z.infer<typeof projectKind>;

type WithBody<T> = T & { slug: string; body: string };
export type Profile = z.infer<typeof profileSchema> & { bio: string };
export type Project = WithBody<z.infer<typeof projectSchema>>;
export type Experience = WithBody<z.infer<typeof experienceSchema>>;
