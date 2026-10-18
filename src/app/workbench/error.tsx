"use client";

import { WorkbenchNote } from "@/features/workbench";

/**
 * The scene threw (most often its file didn't load): a note in the
 * Workbench's own look with a way back to the Manual, not Next's bare error
 * page. Retrying is the note's full reload, not `retry`: the loader keeps
 * the failed file cached, so a re-render would only fail again.
 */
export default function WorkbenchError() {
  return <WorkbenchNote reason="failed" />;
}
