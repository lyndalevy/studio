// ─────────────────────────────────────────────────────────────
//  SITE BASICS — name, contact, and the words on the About page.
//  Edit anything here and the whole site updates.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "Studio L Photography",
  shortName: "Studio L",

  // Shows in the browser tab and in Google results.
  tagline: "Real estate and event photography across New Jersey",

  // The logo artwork itself lives in content/brand.ts — swap the files in
  // app/assets/ to change it.

  // The paragraph under the logo on the homepage.
  intro:
    "I photograph houses, parties, people, and the occasional lion. Based in " +
    "New Jersey — and I do every part myself: lighting, shooting, editing, retouching.",

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
    // Show the portrait from content/brand.ts on the About page.
    showPortrait: true,
  },

  // ── Booking page ─────────────────────────────────────────
  booking: {
    heading: "Booking",
    blurb: "Tell me the date, the place, and what you need photographed. I'll come back with availability and a quote.",
  },
} as const;
