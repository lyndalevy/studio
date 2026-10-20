import { Bagel_Fat_One, Cormorant_Garamond, Fraunces, Playfair_Display } from "next/font/google";

import type { FeedKey } from "@/content/social";

/** One display face per look, used for that feed's title. */
const bold = Bagel_Fat_One({ weight: "400", subsets: ["latin"], display: "swap" });
const airy = Cormorant_Garamond({ weight: "300", style: "italic", subsets: ["latin"], display: "swap" });
const dark = Playfair_Display({ weight: "400", style: "italic", subsets: ["latin"], display: "swap" });
const earthy = Fraunces({ weight: "300", subsets: ["latin"], display: "swap" });

export const feedStyle: Record<FeedKey, { font: string; color: string }> = {
  "bold-and-bright": { font: bold.className, color: "#ff3d7f" },
  "light-and-airy": { font: airy.className, color: "#8a7a66" },
  "dark-and-romantic": { font: dark.className, color: "#1c1714" },
  "earthy-and-naturalistic": { font: earthy.className, color: "#6b5a43" },
};
