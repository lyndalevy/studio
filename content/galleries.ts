// ─────────────────────────────────────────────────────────────
//  GALLERIES
//
//  Each entry becomes a category on the Portfolio page plus its own
//  gallery page at /portfolio/<slug>.
//
//  These are wired to your public Lightroom shares. Add or remove photos
//  in Lightroom and the site follows within about five minutes — no code
//  change, no redeploy.
//
//  The `source` decides where the photos come from:
//
//    { kind: "lightroom", url: "https://adobe.ly/..." }
//        A public Lightroom share. Short adobe.ly links work fine.
//        The share must stay public — if it's deleted or unshared, the
//        gallery says so on the page instead of breaking.
//
//    { kind: "portfolio", url: "https://yourname.myportfolio.com/..." }
//        A published Adobe Portfolio page.
//
//    { kind: "icloud", token: "B1rGf6..." }
//        An iCloud Shared Album; the token is the tail of the share link.
//
//    { kind: "local", dir: "real-estate" }
//        Reads public/photos/<dir>/. No internet needed, loads fastest.
//
//  Photo order is randomised on every refresh. To show a gallery in the
//  order you arranged it in Lightroom, set randomize: false on it.
//
//  To hide a category without deleting it, set hidden: true.
// ─────────────────────────────────────────────────────────────

export type GallerySource =
  | { kind: "portfolio"; url: string }
  | { kind: "lightroom"; url: string }
  | { kind: "icloud"; token: string }
  | { kind: "local"; dir: string };

export type Gallery = {
  /** Shown as the category title. */
  name: string;
  /** The URL: /portfolio/<slug>. Lowercase, dashes, no spaces. */
  slug: string;
  /** One line shown under the name on the portfolio index. */
  blurb: string;
  /** Where the photos come from. */
  source: GallerySource;
  /** Pin a specific cover image, or null to use a photo from the gallery. */
  cover: string | null;
  /** false = keep the order you set in Lightroom. Defaults to random. */
  randomize?: boolean;
  /** Set true to take it off the site without deleting this block. */
  hidden: boolean;
};

export const galleries: Gallery[] = [
  {
    name: "Real Estate",
    slug: "real-estate",
    blurb: "Giving your spaces their time to shine",
    source: { kind: "lightroom", url: "https://adobe.ly/4yUECAO" },
    cover: null,
    hidden: false,
  },
  {
    name: "Party & Events",
    slug: "events",
    blurb: "Your celebrations captured with emotion and care",
    source: { kind: "lightroom", url: "https://adobe.ly/4w8uFx9" },
    cover: null,
    hidden: false,
  },
  {
    name: "Private",
    slug: "private",
    blurb: "Portraits, senior photos, families, and more",
    source: { kind: "lightroom", url: "https://adobe.ly/3RyNJqi" },
    cover: null,
    hidden: false,
  },
  {
    name: "Safari",
    slug: "safari",
    blurb: "Animals in their habitat — that's the most authentic it can get",
    source: { kind: "lightroom", url: "https://adobe.ly/4fAQnVE" },
    cover: null,
    hidden: false,
  },
  {
    name: "Nature",
    slug: "nature",
    blurb: "Earth's beauty is always right in front of you",
    source: { kind: "lightroom", url: "https://adobe.ly/4fDYp03" },
    cover: null,
    hidden: false,
  },
  {
    name: "Europe",
    slug: "europe",
    blurb: "Views, architecture, and streets to get lost in",
    source: { kind: "lightroom", url: "https://adobe.ly/4fOyC3V" },
    cover: null,
    hidden: false,
  },
  {
    name: "Local",
    slug: "local",
    blurb: "New Jersey and New York. Close to home",
    source: { kind: "lightroom", url: "https://adobe.ly/4fUYk72" },
    cover: null,
    hidden: false,
  },
  {
    name: "Food",
    slug: "food",
    blurb: "Plates and drinks that definitely look worth ordering",
    source: { kind: "lightroom", url: "https://adobe.ly/4h9RYD1" },
    cover: null,
    hidden: false,
  },
];

export const visibleGalleries = () => galleries.filter((g) => !g.hidden);

export const galleryBySlug = (slug: string) =>
  galleries.find((g) => g.slug === slug && !g.hidden) ?? null;

// ── Homepage film strip ──────────────────────────────────────
// The strip pulls from every visible gallery, so the front page shows the
// full range of work rather than a chosen few. This is how many photos come
// from each one — keep it small so the homepage stays quick to load.
export const featuredPerGallery = 2;
