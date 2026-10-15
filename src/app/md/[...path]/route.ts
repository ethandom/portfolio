import { getMachineDoc, getMachineDocs } from "@/features/machine";

// Served at /<path>.md through the rewrite in next.config.ts, and at / for
// requests that ask for text/markdown.
export function generateStaticParams() {
  return getMachineDocs().map((doc) => ({ path: doc.path.split("/") }));
}

export async function GET(_: Request, ctx: RouteContext<"/md/[...path]">) {
  const { path } = await ctx.params;
  const doc = getMachineDoc(path.join("/"));
  if (!doc) return new Response("Not found\n", { status: 404 });

  return new Response(doc.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
    },
  });
}
