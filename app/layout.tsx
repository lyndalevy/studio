import type { Metadata } from "next";

import "./globals.css";
import { transcity, schoolbook } from "./fonts";
import { site } from "@/content/site";
import Nav from "./components/Nav";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.intro,
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${transcity.variable} ${schoolbook.variable}`}>
      {/* Grammarly and similar extensions inject attributes into <body> before
          React hydrates, which triggers a mismatch warning. Suppressing it here
          only affects this element's attributes, not page content. */}
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
