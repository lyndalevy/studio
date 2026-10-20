import type { Metadata } from "next";

import "./globals.css";
import { transcity, schoolbook } from "./fonts";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.intro ?? site.tagline,
  openGraph: {
    title: site.name,
    description: site.intro ?? site.tagline,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${transcity.variable} ${schoolbook.variable}`}>
      {/* Browser extensions inject attributes into <body> before React
          hydrates; suppressing stops that logging a false mismatch. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
