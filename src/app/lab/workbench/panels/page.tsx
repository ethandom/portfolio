import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPanels } from "@/app/workbench/_panels";
import { PanelSpecimen } from "./specimen";

export const metadata: Metadata = {
  title: "Workbench Panels",
  robots: { index: false, follow: false },
};

/**
 * Specimen for the Workbench's 2D panels: each one open over a stand-in
 * dusk scene, so the panel design can be iterated without the 3D scene.
 */
export default function WorkbenchPanelsLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PanelSpecimen panels={getPanels()} />;
}
