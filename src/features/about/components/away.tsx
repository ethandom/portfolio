import { Fragment } from "react";
import Image from "next/image";
import { SectionHeader } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { cn } from "@/lib/cn";
import { formatPeriod, getProfile, type Profile } from "@/lib/content";

type Entry = Profile["away"][number];
type Photo = Entry["photos"][number];

/** A print in a 1px ink frame; the file's own size sets the aspect ratio. */
function Print({
  photo,
  sizes,
  className,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
}) {
  return (
    <figure className={cn("min-w-0", className)}>
      <div className="border border-strong bg-sunken">
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          className="block h-auto w-full"
        />
      </div>
      {photo.credit && (
        <figcaption className="mt-1.5 font-mono text-label text-ink-muted uppercase">
          Photo: {photo.credit}
        </figcaption>
      )}
    </figure>
  );
}

/** Hyphenated words ("U-20") stay whole; lines only break at spaces. */
function Unbroken({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      {word.includes("-") ? (
        <span className="whitespace-nowrap">{word}</span>
      ) : (
        word
      )}
    </Fragment>
  ));
}

function Row({ entry }: { entry: Entry }) {
  const [first] = entry.photos;
  // One upright photo sits beside the text; landscape sets run under it.
  const portrait = entry.photos.length === 1 && first.height > first.width;
  const photos = entry.photos.length > 0;
  const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <article
      aria-labelledby={`away-${slug}`}
      className="grid grid-cols-1 gap-x-12 gap-y-6 border-t border-hairline py-8 lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <header className="grid content-start gap-2">
        <p className="font-mono text-label text-ink-muted uppercase">
          {formatPeriod(entry.period)}
        </p>
        <h3 id={`away-${slug}`} className="text-lg font-medium text-balance">
          <Unbroken text={entry.title} />
        </h3>
        {entry.org && (
          <p className="font-mono text-label text-ink uppercase">{entry.org}</p>
        )}
        {entry.note && <p className="text-sm text-ink-muted">{entry.note}</p>}
      </header>

      <div
        className={cn(
          "grid grid-cols-1 content-start gap-6",
          portrait && "md:grid-cols-[minmax(0,1fr)_16rem] md:gap-x-10",
        )}
      >
        {entry.detail && (
          <p className="max-w-(--measure) text-lg text-ink">
            <Unbroken text={entry.detail} />
          </p>
        )}
        {portrait ? (
          <Print
            photo={first}
            sizes="(min-width: 768px) 16rem, 100vw"
            className="max-w-xs md:max-w-none"
          />
        ) : (
          photos && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {entry.photos.map((photo) => (
                <Print
                  key={photo.src}
                  photo={photo}
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
              ))}
            </div>
          )
        )}
      </div>
    </article>
  );
}

/** Life outside CS, from `profile.away`, in the order the content lists it. */
export function AwayFromKeyboard({ chapter }: { chapter: number }) {
  const entries = getProfile().away;
  if (entries.length === 0) return null;

  return (
    <section
      id="away"
      aria-labelledby="away-h"
      className="grid scroll-mt-8 grid-cols-1 gap-8"
    >
      <Reveal variant="rules">
        <SectionHeader
          index={chapter}
          id="away-h"
          title={<ScrambleText text="Away From the Keyboard" />}
        />
      </Reveal>
      <div className="border-b border-strong">
        {entries.map((entry) => (
          <Row key={entry.title} entry={entry} />
        ))}
      </div>
    </section>
  );
}
