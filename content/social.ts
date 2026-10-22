// ─────────────────────────────────────────────────────────────
//  STUDIO L SOCIAL
//  Every word on the /social page. Edit here, nowhere else.
//
//  Captions live in content/captions/<feed>.txt, one file per look.
//  The photos and videos are in public/social/ and are listed in
//  content/social-media.json (written by the export script).
// ─────────────────────────────────────────────────────────────

export const social = {
  name: "Studio L Social",
  /** The profile handle shown on the page and on every post. */
  handle: "studiol.social",
  /** The small line right under the name. */
  byline: "a Studio L project",
  /** The line under the name, like an Instagram bio. */
  bio: "Social media, handled.",
};

export type FeedKey =
  | "bold-and-bright"
  | "light-and-airy"
  | "dark-and-romantic"
  | "earthy-and-naturalistic"
  | "fun-and-playful"
  | "sculptural-and-sunlit";

/** The looks, in the order they appear. */
export const feeds: { key: FeedKey; label: string }[] = [
  { key: "bold-and-bright", label: "Bold & Bright" },
  { key: "fun-and-playful", label: "Playful & People-Centered" },
  { key: "light-and-airy", label: "Light & Airy" },
  { key: "dark-and-romantic", label: "Dark & Romantic" },
  { key: "earthy-and-naturalistic", label: "Earthy & Naturalistic" },
  { key: "sculptural-and-sunlit", label: "Sculptural & Sunlit" },
];

export type TierKey = "bronze" | "silver" | "gold";

export const tiers: { key: TierKey; name: string; what: string }[] = [
  { key: "bronze", name: "Bronze", what: "Static posts" },
  { key: "silver", name: "Silver", what: "Longer carousels, short reels and animated posts" },
  { key: "gold", name: "Gold", what: "In-person reels, filmed on location" },
];

/** The monthly base fee, already inside every package price. */
export const baseFee = 150;

/** Prices are per month and already include the $150 base fee. */
export const packages = [
  { name: "Steady", price: 250, perWeek: ["1 Bronze"] },
  { name: "Momentum", price: 375, perWeek: ["1 Bronze", "1 Silver"] },
  { name: "Showcase", price: 500, perWeek: ["1 Bronze", "2 Silver"] },
  { name: "Spotlight", price: 625, perWeek: ["2 Bronze", "1 Silver", "1 Gold"] },
];

/** What the $150 base fee covers, in every package. */
export const included = [
  "Instagram and Facebook",
  "Social media management tool",
  "Editing and AI tools",
  "Posting and scheduling",
  "1 30-minute shoot a month",
];

export const addOns = [
  { name: "Linkme link", price: "$50/mo", note: "Highly recommended" },
  { name: "+1 Bronze a week", price: "$100/mo" },
  { name: "+1 Silver a week", price: "$125/mo" },
  { name: "+1 Gold a week", price: "$150/mo" },
  { name: "Extra platform", price: "$25/mo", note: "Each, beyond Instagram and Facebook" },
  { name: "Extend a shoot by 30 minutes", price: "$100" },
  { name: "Extra 30-minute shoot", price: "$100" },
  { name: "Extra revision", price: "$10" },
];

export const terms = [
  "3-month minimum",
  "One revision round per post",
  "Billed monthly",
];
