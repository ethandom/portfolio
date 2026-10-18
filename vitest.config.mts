import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/testing/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // Local tooling directories (like ESLint's ignores): .claude/worktrees
    // holds other sessions' checkouts, whose tests aren't this tree's.
    exclude: [...configDefaults.exclude, ".*/**"],
  },
});
