// ─────────────────────────────────────────────────────────────
//  BRAND ARTWORK
//
//  Imported rather than read from /public on purpose: importing makes
//  these part of the compiled build, served with hashed, permanently
//  cacheable filenames — and if a file goes missing the build fails
//  loudly instead of the page quietly showing a broken image.
//
//  To swap artwork, replace the file in app/assets/ keeping the same
//  name. Nothing else needs to change.
// ─────────────────────────────────────────────────────────────

import logoWide from "@/app/assets/logo-wide.png";
import logoCompact from "@/app/assets/logo-med.png";
import mark from "@/app/assets/mark-circle.png";

export const brand = {
  /** Full "Studio L Photography" lockup. */
  logoWide,
  /** Short "Studio L" lockup, for narrow screens. */
  logoCompact,
  /** Round "L" mark, used as the profile picture on the social page. */
  mark,
};
