import Image from "next/image";

import { site } from "@/content/site";
import { Camera } from "./Marks";

/**
 * The logo lockup.
 *
 * Uses the real transparent exports from the brand kit when `logo` is set in
 * content/site.ts, and falls back to a type-only lockup (camera mark + the
 * name set in Transcity) if it isn't.
 *
 * Sizing is driven by the parent's font-size, so `className="text-2xl"` works
 * the same whether it lands on an image or on live type.
 */
export default function Wordmark({
  full = true,
  className = "",
}: {
  /** true → the full "Studio L Photography"; false → the compact "Studio L". */
  full?: boolean;
  className?: string;
}) {
  const label = full ? site.name : site.shortName;

  if (site.logo) {
    const art = full ? site.logo.wide : site.logo.compact;
    return (
      <Image
        src={art.src}
        alt={label}
        width={art.width}
        height={art.height}
        priority
        // Callers set the height (e.g. "h-10"); width follows the ratio.
        className={`w-auto ${className}`}
      />
    );
  }

  return (
    <span
      className={`font-display inline-flex items-baseline whitespace-nowrap leading-none ${className}`}
      role="img"
      aria-label={label}
    >
      <Camera className="mr-[0.18em] h-[0.95em] w-auto self-center" />
      <span>Studio</span>
      <span className="ml-[0.07em] text-[1.4em] leading-[0.75]">L</span>
      {full && <span className="ml-[0.09em]">Photography</span>}
    </span>
  );
}
