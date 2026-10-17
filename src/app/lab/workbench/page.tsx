import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workbench } from "@/features/workbench";
import { getPanels } from "./_panels";

export const metadata: Metadata = {
  title: "Workbench",
  robots: { index: false, follow: false },
};

/**
 * Gray-box Workbench: the Blender blockout with the camera, hover, focus and
 * the first relay sequence. Layout only; lighting and looks come later.
 * Full viewport, no doc chrome over the scene. The 2D panels it opens are
 * rendered here, from /content (`_panels`; their specimen is at ./panels).
 */
export default function WorkbenchLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Workbench panels={getPanels()} />;
}
