import { handleVoiceMemo } from "@/features/voice-memo/server";

// Voice memos from the Workbench, emailed to Ethan. 404s in production
// unless VOICE_MEMO_ENABLED=1 (see src/features/voice-memo/README.md).
export function POST(request: Request) {
  return handleVoiceMemo(request);
}
