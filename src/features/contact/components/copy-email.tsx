"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies the address, for mail set up outside the browser. `size` matches
 * the key beside it: large in the footer, smaller in a Workbench panel.
 */
export function CopyEmail({
  email,
  size = "lg",
}: {
  email: string;
  size?: ComponentProps<typeof Button>["size"];
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <Button
      size={size}
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
