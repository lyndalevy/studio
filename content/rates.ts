// ─────────────────────────────────────────────────────────────
//  RATES
//
//  This is the only file you edit to change pricing. Change a
//  number, add a bullet, add a whole new package — the Rates page
//  rebuilds itself from whatever is in this list.
//
//  To ADD a package:    copy a block, change the fields.
//  To REMOVE one:       delete its block.
//  To REORDER:          drag the blocks around. Top of the list
//                       shows first on the page.
//  To FEATURE one:      set featured: true (only one at a time).
// ─────────────────────────────────────────────────────────────

export type AddOn = {
  label: string;
  price: string;
  note?: string;
};

export type Package = {
  /** Big name on the card, e.g. "Real Estate" */
  name: string;
  /** One line under the name. Optional — set to null to hide. */
  blurb: string | null;
  /** The headline number, e.g. "$150" or "$150/hr" */
  price: string;
  /** Small text under the price, e.g. "Minimum 2 hours". Optional. */
  minimum: string | null;
  /** What's included. Add or remove lines freely. */
  includes: string[];
  /** Optional extras with their own prices. Empty list = section hidden. */
  addOns: AddOn[];
  /** true = highlighted card with a filled background. Use on one only. */
  featured: boolean;
};

export const packages: Package[] = [
  {
    name: "Real Estate",
    blurb: "Listing-ready photos of the whole property",
    price: "$150",
    minimum: "2,000–5,000 sq ft",
    includes: [
      "15–20 edited photos",
      "Front elevation (2), back elevation, backyard",
      "Foyer, family room (2), kitchen (2), dining room",
      "Primary bedroom, primary bathroom, additional bathrooms, basement",
      "Touch ups: grass, sky, lighting, and more",
      "48 hour turnaround included",
    ],
    addOns: [
      { label: "24 hour turnaround", price: "+$20", note: "subject to availability" },
      { label: "Same day turnaround", price: "+$50", note: "subject to availability" },
    ],
    featured: false,
  },

  {
    name: "Private",
    blurb: "Portraits, seniors, families, products",
    price: "$150/hr",
    minimum: "Minimum 1 hour",
    includes: [
      "Around 50 edited photos per hour",
      "Touch ups: grass, sky, lighting, blemishes and more",
      "1 week turnaround",
    ],
    addOns: [
      { label: "Around 75 photos per hour", price: "+$30" },
      { label: "72 hour turnaround", price: "+$20", note: "subject to availability" },
      { label: "24 hour turnaround", price: "+$50", note: "subject to availability" },
    ],
    featured: true,
  },

  {
    name: "Party / Event",
    blurb: "Birthdays, showers, celebrations, corporate",
    price: "$100/hr",
    minimum: "Minimum 2 hours",
    includes: [
      "Around 50 edited photos per hour",
      "Touch ups: grass, sky, lighting, blemishes and more",
      "1 week turnaround",
    ],
    addOns: [
      { label: "Around 75 photos per hour", price: "+$30" },
      { label: "72 hour turnaround", price: "+$20", note: "subject to availability" },
      { label: "24 hour turnaround", price: "+$50", note: "subject to availability" },
    ],
    featured: false,
  },
];

/** Small print under the pricing cards. Set to null to hide. */
export const ratesFootnote: string | null =
  "Travel beyond 30 minutes of Monmouth County may add a fee. Ask me and I'll tell you up front.";
