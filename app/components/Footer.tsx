import Link from "next/link";

import { site } from "@/content/site";
import { Sparkles } from "./Marks";
import Wordmark from "./Wordmark";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t-2 border-red text-red">
      <div className="sprockets opacity-90" />

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col items-center gap-8 text-center">
          <Wordmark className="h-14 text-3xl sm:h-16 sm:text-4xl" />

          <Sparkles className="h-10 w-14" />

          <div className="flex flex-col items-center gap-3">
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject)}`}
              className="link-draw text-lg break-all"
            >
              {site.email}
            </a>
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-draw text-lg"
            >
              {site.instagramHandle}
            </a>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2">
            {[
              { href: "/portfolio", label: "Portfolio" },
              { href: "/rates", label: "Rates" },
              { href: "/about", label: "About" },
              { href: "/booking", label: "Booking" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="link-draw eyebrow">
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="eyebrow pt-2 opacity-60">
            {year} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
