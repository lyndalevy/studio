// ─────────────────────────────────────────────────────────────
//  PHOTOS
//
//  Every album listed here feeds the single grid on the page. Add or
//  remove photos in Lightroom and the site follows within about five
//  minutes — no code change, no redeploy.
//
//  To add an album: share it publicly in Lightroom, copy the link, and
//  add a line below. To drop one: delete its line, or set hidden: true.
//
//  Other sources work too, if you ever want them:
//    { kind: "portfolio", url: "https://yourname.myportfolio.com/..." }
//    { kind: "icloud",    token: "B1rGf6..." }
//    { kind: "local",     dir: "favourites" }   // public/photos/favourites/
// ─────────────────────────────────────────────────────────────

export type PhotoSource =
  | { kind: "portfolio"; url: string }
  | { kind: "lightroom"; url: string }
  | { kind: "icloud"; token: string }
  | { kind: "local"; dir: string };

export type Album = {
  /** Only used for image alt text and for your own reference. */
  name: string;
  source: PhotoSource;
  hidden?: boolean;
};

export const albums: Album[] = [
  { name: "Real estate", source: { kind: "lightroom", url: "https://adobe.ly/4yUECAO" } },
  { name: "Party and events", source: { kind: "lightroom", url: "https://adobe.ly/4w8uFx9" } },
  { name: "Portrait", source: { kind: "lightroom", url: "https://adobe.ly/3RyNJqi" } },
  { name: "Safari", source: { kind: "lightroom", url: "https://adobe.ly/4fAQnVE" } },
  { name: "Nature", source: { kind: "lightroom", url: "https://adobe.ly/4fDYp03" } },
  { name: "Europe", source: { kind: "lightroom", url: "https://adobe.ly/4fOyC3V" } },
  { name: "Local", source: { kind: "lightroom", url: "https://adobe.ly/4fUYk72" } },
  { name: "Food", source: { kind: "lightroom", url: "https://adobe.ly/4h9RYD1" } },
];

/**
 * How many photos to take from each album. Keeps the page quick and the
 * mix even, instead of the biggest album dominating.
 * Set to null to show every photo in every album.
 */
export const perAlbum: number | null = 10;

export const visibleAlbums = () => albums.filter((a) => !a.hidden);

// ── Instagram ────────────────────────────────────────────────
// Used only when INSTAGRAM_ACCESS_TOKEN is set (see lib/instagram.ts).
// How many of your most recent posts to show.
export const instagramLimit = 60;
