import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // The Machine view: /profile.md, /projects/<slug>.md, /experience/<slug>.md
  // and /index.md come from one route handler, and so does `/` for agents
  // that ask for markdown.
  async rewrites() {
    return {
      // Before the filesystem, or the page at `/` would answer first.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
          destination: "/md/index",
        },
      ],
      afterFiles: [{ source: "/:path(.+)\\.md", destination: "/md/:path" }],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
