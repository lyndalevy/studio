"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { Photo } from "@/lib/sources";

/**
 * Splits photos into columns, each one going to the shortest column so far.
 * The first photos land across the top row, in order.
 */
function toColumns(photos: Photo[], count: number) {
  const columns: { photo: Photo; i: number }[][] = Array.from({ length: count }, () => []);
  const heights = new Array(count).fill(0);
  photos.forEach((photo, i) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push({ photo, i });
    heights[shortest] += (photo.height ?? 800) / (photo.width ?? 1200);
  });
  return columns;
}

/** How many columns at each screen size, and the classes that show that layout. */
const LAYOUTS = [
  { count: 2, className: "flex md:hidden" },
  { count: 3, className: "hidden md:flex lg:hidden" },
  { count: 4, className: "hidden lg:flex" },
];

/**
 * Contact-sheet grid with a lightbox. Masonry columns so portrait and
 * landscape shots sit together without cropping either one, filled left to
 * right so the first photos are the ones along the top.
 */
export default function Gallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, step]);

  if (!photos.length) return null;

  const active = openIndex === null ? null : photos[openIndex];

  return (
    <>
      {LAYOUTS.map(({ count, className }) => (
        <div key={count} className={`${className} items-start gap-2 sm:gap-3`}>
          {toColumns(photos, count).map((column, c) => (
            <div key={c} className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
              {column.map(({ photo, i }) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  aria-label={`Open photo ${i + 1} of ${photos.length}`}
                  className="frame block w-full cursor-zoom-in transition-opacity duration-300 hover:opacity-85"
                >
                  <Image
                    src={photo.thumb}
                    alt={photo.alt}
                    width={photo.width ?? 1200}
                    height={photo.height ?? 800}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="h-auto w-full"
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
          className="fixed inset-0 z-[100] flex flex-col bg-cream/98 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between border-b-2 border-red px-4 py-3">
            <span className="eyebrow text-red">
              {openIndex! + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close photo viewer"
              className="eyebrow link-draw text-red"
            >
              Close
            </button>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={active.id}
              src={active.full}
              alt={active.alt}
              width={active.width ?? 2000}
              height={active.height ?? 1400}
              sizes="100vw"
              priority
              className="rise max-h-full w-auto max-w-full object-contain"
            />
          </div>

          <div
            className="flex items-center justify-center gap-4 border-t-2 border-red px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => step(-1)} className="btn btn-ghost">
              ← Prev
            </button>
            <button type="button" onClick={() => step(1)} className="btn btn-ghost">
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
