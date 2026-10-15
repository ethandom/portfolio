"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies the address, for mail set up outside the browser. */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={() =>
        // Blocked clipboards (permissions, embeds) leave the key as it was.
        navigator.clipboard
          .writeText(email)
          .then(() => setCopied(true))
          .catch(() => {})
      }
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy email"}</span>
    </Button>
  );
}
