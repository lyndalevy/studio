import Image from "next/image";

import { brand } from "@/content/brand";
import { site } from "@/content/site";

/**
 * The logo lockup, using the real transparent artwork.
 *
 * The images are bundled imports, so width and height come along for free and
 * a missing file breaks the build rather than the page.
 *
 * Callers set the height (e.g. `className="h-10"`); the width follows the
 * image's own aspect ratio.
 */
export default function Wordmark({
  full = true,
  className = "",
}: {
  /** true → the full "Studio L Photography"; false → the compact "Studio L". */
  full?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={full ? brand.logoWide : brand.logoCompact}
      alt={full ? site.name : site.shortName}
      priority
      // max-w-full stops the wide lockup overflowing on narrow screens.
      className={`w-auto max-w-full ${className}`}
    />
  );
}
