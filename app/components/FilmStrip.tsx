import Image from "next/image";

/**
 * The signature piece: photographs mounted in a length of film, sprocket bands
 * top and bottom, scrolling sideways forever.
 *
 * The track holds two identical copies of the frames. Sliding it exactly half
 * its width puts copy 2 where copy 1 started, so the loop never shows a seam.
 * Hovering pauses it; reduced-motion turns it into a hand-scrollable strip.
 */
export default function FilmStrip({
  photos,
  /** Seconds for one full pass. Higher = slower. */
  speed = 55,
}: {
  photos: { src: string; alt: string }[];
  speed?: number;
}) {
  if (!photos.length) return null;

  // A short list would leave a gap on wide screens, so repeat it until
  // there's comfortably more than one screen's worth in each copy.
  const reps = Math.max(1, Math.ceil(6 / photos.length));
  const group = Array.from({ length: reps }, () => photos).flat();

  const Frames = ({ hidden = false }: { hidden?: boolean }) => (
    <div className="marquee-group" aria-hidden={hidden || undefined}>
      {group.map((photo, i) => (
        <div
          key={`${photo.src}-${i}`}
          className="relative aspect-[4/5] w-[42vw] shrink-0 bg-cream sm:w-[15rem] lg:w-[17rem]"
        >
          <Image
            src={photo.src}
            alt={hidden ? "" : photo.alt}
            fill
            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 15rem, 17rem"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );

  return (
    <section aria-label="Selected work" className="bg-red">
      <div className="sprockets" />

      <div className="marquee" style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}>
        <div className="marquee-track py-3">
          <Frames />
          <Frames hidden />
        </div>
      </div>

      <div className="sprockets" />
    </section>
  );
}
