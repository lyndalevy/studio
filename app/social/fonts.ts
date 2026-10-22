import { Bagel_Fat_One, Bodoni_Moda, Cormorant_Garamond, Fraunces, Fredoka, Playfair_Display } from "next/font/google";

import type { FeedKey } from "@/content/social";

/** One display face per look, used for that feed's title. */
const bold = Bagel_Fat_One({ weight: "400", subsets: ["latin"], display: "swap" });
const luxury = Cormorant_Garamond({ weight: "500", subsets: ["latin"], display: "swap" });
const dark = Playfair_Display({ weight: "400", style: "italic", subsets: ["latin"], display: "swap" });
const earthy = Fraunces({ weight: "300", subsets: ["latin"], display: "swap" });
const sunlit = Bodoni_Moda({ weight: "400", subsets: ["latin"], display: "swap" });
const fun = Fredoka({ weight: "600", subsets: ["latin"], display: "swap" });

export const feedStyle: Record<FeedKey, { font: string; color: string }> = {
  "bold-and-bright": { font: bold.className, color: "#ff3d7f" },
  "luxury-and-architectural": { font: luxury.className, color: "#1f5c8b" },
  "dark-and-romantic": { font: dark.className, color: "#1c1714" },
  "earthy-and-naturalistic": { font: earthy.className, color: "#6b5a43" },
  "fun-and-playful": { font: fun.className, color: "#c6362f" },
  "sculptural-and-sunlit": { font: sunlit.className, color: "#b4532a" },
};
