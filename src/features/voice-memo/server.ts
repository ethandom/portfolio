import "server-only";

import { isEnabled, readEnv } from "./api/env";

/**
 * The feature's server entry, for the route handler at /api/voice-memo and
 * the pages that place the recorder. Kept apart from index.ts so client code
 * importing the recorder never reaches server-only modules.
 */
export { handleVoiceMemo } from "./api/handler";

/** Whether the endpoint takes memos here; leave the recorder out when it doesn't. */
export function voiceMemoEnabled(): boolean {
  return isEnabled(readEnv());
}
