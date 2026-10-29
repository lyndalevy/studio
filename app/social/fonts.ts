import { Bodoni_Moda, GFS_Didot, Montserrat, Nunito, Nunito_Sans } from "next/font/google";

import type { FeedKey } from "@/content/social";

/**
 * Each feed's title uses the same face as the type on its posts. The posts are
 * set in Mac fonts, so the title asks for that font first and falls back to the
 * closest Google font on phones and PCs that don't have it (see the feed-*
 * classes in globals.css).
 */
const round = Nunito({ weight: "800", subsets: ["latin"], display: "swap", variable: "--font-round" });
const didot = GFS_Didot({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-didot" });
const avenir = Nunito_Sans({ weight: "300", subsets: ["latin"], display: "swap", variable: "--font-avenir" });
const sunlit = Bodoni_Moda({ weight: "400", subsets: ["latin"], display: "swap" });
const electric = Montserrat({ weight: "600", subsets: ["latin"], display: "swap" });

export const feedStyle: Record<FeedKey, { font: string; color: string }> = {
  "bold-and-bright": { font: "feed-arial", color: "#ff3d7f" },
  "luxury-and-architectural": { font: `${didot.variable} feed-didot`, color: "#1f5c8b" },
  "dark-and-romantic": { font: `${didot.variable} feed-didot`, color: "#1c1714" },
  "earthy-and-naturalistic": { font: `${avenir.variable} feed-avenir`, color: "#6b5a43" },
  "fun-and-playful": { font: `${round.variable} feed-round`, color: "#c6362f" },
  "sculptural-and-sunlit": { font: sunlit.className, color: "#f2661b" },
  "sleek-and-electric": { font: electric.className, color: "#1f47d6" },
};
