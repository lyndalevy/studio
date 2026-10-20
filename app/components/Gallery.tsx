"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { Photo } from "@/lib/sources";

/**
 * Contact-sheet grid with a lightbox. Lays out in CSS columns so portrait and
 * landscape shots sit together without cropping either one.
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
      {/* Masonry columns, so portrait and landscape shots sit together
          without either being cropped. */}
      <div className="columns-2 gap-2 sm:gap-3 md:columns-3 lg:columns-4 [&>*]:mb-2 sm:[&>*]:mb-3">
        {photos.map((photo, i) => (
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
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="h-auto w-full"
            />
          </button>
        ))}
      </div>

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
