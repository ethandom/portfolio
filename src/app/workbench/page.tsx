import type { Metadata } from "next";
import { ModeSwitch } from "@/features/mode-switch";
import { Workbench } from "@/features/workbench";
import { getProfile } from "@/lib/content";
import { getPanels } from "./_panels";

export function generateMetadata(): Metadata {
  const { name } = getProfile();
  return {
    title: `Workbench · ${name}`,
    alternates: { canonical: "/workbench" },
    // A WebGL scene with nothing in its HTML; the Manual is the page to
    // index. A shared link keeps the Manual's card.
    robots: { index: false, follow: true },
  };
}

/**
 * The Workbench: the Manual's 3D view, a builder's loft at dusk where each
 * station opens a 2D panel. Full viewport, no doc chrome over the scene. The
 * panels are rendered here, from /content (`_panels`; their specimen is at
 * /lab/workbench/panels). Phones get a pointer back to the Manual instead.
 */
export default function WorkbenchPage() {
  return (
    <>
      <Workbench panels={getPanels()} />
      <ModeSwitch current="workbench" />
    </>
  );
}
