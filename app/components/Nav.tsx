"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { site } from "@/content/site";
import Wordmark from "./Wordmark";

const links = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/rates", label: "Rates" },
  { href: "/about", label: "About" },
  { href: "/booking", label: "Booking" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes, so tapping a link
  // doesn't leave the panel hanging open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Don't let the page scroll behind the open mobile menu.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-red bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 text-red">
          {/* Short lockup on phones so it never crowds the menu button.
              The wrappers do the showing/hiding — Wordmark sets its own
              display, so a `hidden` class on it would be overridden. */}
          <span className="block sm:hidden">
            <Wordmark full={false} className="h-9 text-xl" />
          </span>
          <span className="hidden sm:block">
            <Wordmark className="h-11 text-2xl" />
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive(l.href)}
              className="link-draw eyebrow text-red"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`block h-0.5 w-6 bg-red transition-transform duration-300 ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-red transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-red transition-transform duration-300 ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t-2 border-red bg-cream md:hidden"
      >
        <nav className="flex flex-col px-5 py-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-display border-b border-red-line py-4 text-3xl last:border-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
