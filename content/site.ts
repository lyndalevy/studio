// ─────────────────────────────────────────────────────────────
//  SITE BASICS
//  Everything on the page in words. Edit here, nowhere else.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "Studio L Photography",
  shortName: "Studio L",

  /** Shows in the browser tab and in Google results. */
  tagline: "Photography by Lynda Levy — New Jersey",

  /** The line under the logo. Set to null to show nothing. */
  intro: "Real estate, events, and whatever else is worth looking at." as string | null,

  /** Instagram, linked at the bottom of the page. */
  instagramHandle: "@studioL.photography",
  instagramUrl: "https://instagram.com/studioL.photography",

  /**
   * Shown next to the Instagram link. Set to null to leave the email off
   * the site entirely.
   */
  email: "lynda.studiolphotos@gmail.com" as string | null,
} as const;
