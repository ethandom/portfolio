import "server-only";

/**
 * The feature's server entry, for the route handler at /api/voice-memo.
 * Kept apart from index.ts so client code importing the recorder never
 * reaches server-only modules.
 */
export { handleVoiceMemo } from "./api/handler";
