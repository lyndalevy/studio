// ─────────────────────────────────────────────────────────────
//  SITE BASICS — name, contact, and the words on the About page.
//  Edit anything here and the whole site updates.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "Studio L Photography",
  shortName: "Studio L",

  // Shows in the browser tab and in Google results.
  tagline: "Real estate and event photography across New Jersey",

  // ── Logo ─────────────────────────────────────────────────
  // Your real transparent exports. `wide` is the full lockup used on desktop
  // and the homepage; `compact` is the shorter "Studio L" used on phones,
  // where the full one would crowd the menu button.
  // Set logo to null to fall back to the type-only lockup.
  logo: {
    wide: { src: "/brand/logo-wide.png", width: 1750, height: 500 },
    compact: { src: "/brand/logo-med.png", width: 1000, height: 500 },
  } as {
    wide: { src: string; width: number; height: number };
    compact: { src: string; width: number; height: number };
  } | null,

  // The paragraph under the logo on the homepage.
  intro:
    "My photography business, covering real estate and events across New Jersey. " +
    "I handle the whole job: lighting, shooting, editing and retouching, and " +
    "everything the client sees in between.",

  // ── Contact ──────────────────────────────────────────────
  email: "lynda.studiolphotos@gmail.com",
  instagramHandle: "@studioL.photography",
  instagramUrl: "https://instagram.com/studioL.photography",

  // Pre-fills the subject line when someone clicks your email address.
  emailSubject: "Booking inquiry",

  // ── About page ───────────────────────────────────────────
  about: {
    heading: "Hi there.",
    paragraphs: [
      "My name is Lynda and I am a student at Monmouth University Honors College with a passion for photography.",
      "From real estate to portraits to wildlife — I want to share stories through photos. I showcase properties, capture memories, and make products shine.",
      "When I'm not behind the camera, you can find me studying, painting, at a concert, or planning my next photography journey.",
    ],
    // Optional portrait of you. Set to null to hide it.
    portrait: "/brand/portrait.png" as string | null,
  },

  // ── Booking page ─────────────────────────────────────────
  booking: {
    heading: "Booking",
    blurb: "Tell me the date, the place, and what you need photographed. I'll come back with availability and a quote.",
  },
} as const;
