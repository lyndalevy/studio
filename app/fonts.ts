import localFont from "next/font/local";

/**
 * Transcity — the display face from the brand guide.
 *
 * Heads up: this file only contains A–Z and a–z. It has no digits and no
 * punctuation at all (no period, comma, apostrophe, hyphen, or dollar sign).
 * That is why globals.css always lists Schoolbook immediately after it in
 * the font stack — the browser falls back per-character, so "Rates" renders
 * in Transcity while "$150/hr" quietly renders in Schoolbook instead of
 * showing empty boxes.
 */
export const transcity = localFont({
  src: "./fonts/Transcity.otf",
  variable: "--font-transcity",
  display: "swap",
  adjustFontFallback: false,
});

/**
 * Schoolbook — the text face. Regular weight only; the brand guide calls for
 * bold, so headings lean on the browser's synthesised bold.
 */
export const schoolbook = localFont({
  src: "./fonts/Schoolbook-Regular.ttf",
  variable: "--font-schoolbook",
  display: "swap",
  adjustFontFallback: false,
});
