/**
 * Structured data as a script tag. `<` is escaped so no string in the
 * content can close the tag early (per the Next.js JSON-LD guide).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
