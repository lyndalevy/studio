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
  | "luxury-and-architectural"
  | "dark-and-romantic"
  | "earthy-and-naturalistic"
  | "fun-and-playful"
  | "sculptural-and-sunlit"
  | "sleek-and-electric";

/** The looks, in the order they appear, each with the package it's a sample of. */
export const feeds: { key: FeedKey; label: string; plan: string }[] = [
  { key: "bold-and-bright", label: "Bold & Bright", plan: "Showcase" },
  { key: "sculptural-and-sunlit", label: "Sculptural & Sunlit", plan: "Momentum" },
  { key: "dark-and-romantic", label: "Dark & Romantic", plan: "Momentum" },
  { key: "sleek-and-electric", label: "Sleek & Electric", plan: "Spotlight" },
];

export type TierKey = "bronze" | "silver" | "gold";

export const tiers: { key: TierKey; name: string; what: string }[] = [
  { key: "bronze", name: "Bronze", what: "Static and animated posts" },
  { key: "silver", name: "Silver", what: "Longer carousels and short reels" },
  { key: "gold", name: "Gold", what: "In-person reels, filmed on location" },
];

/** The monthly base fee, already inside every package price. */
export const baseFee = 200;

/**
 * Prices are per month and already include the $200 base fee. Each post a week adds what its add-on costs:
 * Bronze $100, Silver $150, Gold $200 (Gold comes with 1 more hour of shooting a month, split however the client likes).
 */
export const packages: { name: string; price: number; perWeek: string[]; extra?: string }[] = [
  { name: "Momentum", price: 400, perWeek: ["2 Bronze"] },
  { name: "Showcase", price: 550, perWeek: ["2 Bronze", "1 Silver"] },
  { name: "Spotlight", price: 750, perWeek: ["2 Bronze", "1 Silver", "1 Gold"], extra: "1 hour worth of shooting a month for Gold, split however you like" },
];

/** What the $200 base fee covers, in every package. */
export const included = [
  "Instagram and Facebook",
  "Page management: engagement, DM monitoring and feed aesthetic",
  "Editing and AI tools",
  "Posting and scheduling",
  "Bi-weekly deliverables of content for upcoming cycles, weeks ahead of time",
  "Photography sessions as needed, depending on client package",
];

export const addOns = [
  { name: "Linkme link", price: "$50/mo", note: "Highly recommended" },
  {
    name: "Analytics review and in-depth content strategy",
    price: "$50/mo",
    note: "Includes monthly meetings about strategy online, including goals, reach and more",
  },
  { name: "+1 Bronze a week", price: "$100/mo" },
  { name: "+1 Silver a week", price: "$150/mo" },
  { name: "+1 Gold a week", price: "$200/mo", note: "With 1 hour worth of shooting a month, split however you like" },
  { name: "Verification", price: "$50/mo" },
  { name: "Extra platform", price: "$25/mo", note: "Each, beyond Instagram and Facebook" },
  { name: "Extra 1-hour shoot", price: "$150" },
  { name: "Extra revision", price: "$10" },
];

export const terms = [
  "3-month minimum",
  "One revision round per post",
  "Billed monthly",
];
