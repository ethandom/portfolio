import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SoundBench } from "./_components/sound-bench";

export const metadata: Metadata = {
  title: "Sound Lab",
  robots: { index: false, follow: false },
};

/**
 * Specimen for the Workbench's sound: the lofi loop and every effect, each
 * on its own key, and a meter that renders them offline and prints how
 * loud they come out, for tuning levels without the 3D scene.
 */
export default function SoundLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SoundBench />;
}
