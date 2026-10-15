import "server-only";
import { siteConfig } from "@/config/site";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { indexDoc, llmsTxt, machineDocs, type Content, type MachineDoc } from "./lib/render";

const content = (): Content => ({
  profile: getProfile(),
  projects: getProjects(),
  experience: getExperience(),
});

/** Every markdown document the site serves, /index.md included. */
export function getMachineDocs(): MachineDoc[] {
  const all = content();
  return [indexDoc(all, siteConfig.url), ...machineDocs(all, siteConfig.url)];
}

/** The document at a public path without ".md", e.g. "projects/tempr". */
export function getMachineDoc(path: string): MachineDoc | undefined {
  return getMachineDocs().find((doc) => doc.path === path);
}

export function getLlmsTxt(): string {
  return llmsTxt(content(), siteConfig.url);
}

export { MachinePage } from "./components/machine-page";
export type { MachineDoc } from "./lib/render";
