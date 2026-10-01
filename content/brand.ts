// ─────────────────────────────────────────────────────────────
//  BRAND ARTWORK
//
//  These are imported rather than read from /public on purpose. Importing
//  makes them part of the compiled build, so they're served with hashed,
//  permanently-cacheable filenames — and if a file goes missing the build
//  fails loudly instead of the site quietly showing a broken image.
//
//  Each import gives you { src, width, height }, so <Image> gets the right
//  dimensions automatically.
//
//  To swap a piece of artwork, replace the file in app/assets/ keeping the
//  same name. Nothing else needs to change.
// ─────────────────────────────────────────────────────────────

import logoWide from "@/app/assets/logo-wide.png";
import logoCompact from "@/app/assets/logo-med.png";
import markCamera from "@/app/assets/mark-camera.png";
import markReel from "@/app/assets/mark-reel.png";
import markPolaroid from "@/app/assets/mark-polaroid.png";
import markCircle from "@/app/assets/mark-circle.png";
import portrait from "@/app/assets/portrait.png";

export const brand = {
  /** Full "Studio L Photography" lockup — desktop nav, hero, footer. */
  logoWide,
  /** Short "Studio L" lockup — phones, where the full one crowds the menu. */
  logoCompact,
  /** The circle-L roundel. */
  markCircle,
  /** Icons used on the homepage "whole job" band. */
  markCamera,
  markReel,
  markPolaroid,
  /** You behind the camera, on the About page. */
  portrait,
};
