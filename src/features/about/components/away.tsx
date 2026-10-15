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
  fillRow = false,
  className,
}: {
  photo: Photo;
  sizes: string;
  /**
   * From md up, fill the grid row instead of setting its height: the photo
   * crops to the row so its edges line up with the column beside it.
   */
  fillRow?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn("min-w-0", fillRow && "md:flex md:flex-col", className)}
    >
      <div
        className={cn(
          "border border-strong bg-sunken",
          fillRow && "md:relative md:flex-1",
        )}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          className={cn(
            "block h-auto w-full",
            fillRow &&
              "md:absolute md:inset-0 md:h-full md:object-cover md:object-[50%_35%]",
          )}
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
  // An upright photo stands beside the text; landscape photos run under it.
  const portrait = entry.photos.find((p) => p.height > p.width);
  const wide = entry.photos.filter((p) => p !== portrait);
  const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const detail = entry.detail && (
    <p className="max-w-(--measure) text-lg text-ink">
      <Unbroken text={entry.detail} />
    </p>
  );

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

      {portrait ? (
        <div className="grid grid-cols-1 content-start gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-x-10">
          <div className="grid content-start gap-6">
            {detail}
            {wide.map((photo) => (
              <Print
                key={photo.src}
                photo={photo}
                sizes="(min-width: 1024px) 40vw, (min-width: 768px) 55vw, 100vw"
              />
            ))}
          </div>
          <Print
            photo={portrait}
            sizes="(min-width: 768px) 16rem, 100vw"
            fillRow
            className="max-w-xs md:max-w-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 content-start gap-6">
          {detail}
          {wide.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {wide.map((photo) => (
                <Print
                  key={photo.src}
                  photo={photo}
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
              ))}
            </div>
          )}
        </div>
      )}
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
