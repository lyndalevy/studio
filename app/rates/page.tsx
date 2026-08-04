import type { Metadata } from "next";
import Link from "next/link";

import { packages, ratesFootnote } from "@/content/rates";
import { site } from "@/content/site";
import PageHeader from "../components/PageHeader";
import { Sparkle } from "../components/Marks";

export const metadata: Metadata = {
  title: "Rates",
  description: "Photography rates for real estate, private sessions, and events.",
};

export default function RatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Rates"
        title="Prices"
        lede="Everything is listed. What you see is what you pay, plus whatever add-ons you pick."
      />

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          {packages.map((pkg) => {
            const solid = pkg.featured;
            return (
              <section
                key={pkg.name}
                className={`flex h-full flex-col border-2 border-red p-7 sm:p-8 ${
                  solid ? "bg-red text-cream" : ""
                }`}
              >
                <header className="text-center">
                  {solid && <p className="eyebrow mb-3 opacity-80">Most booked</p>}
                  <h2 className="font-display text-4xl leading-none">{pkg.name}</h2>
                  {pkg.blurb && <p className="mt-2 leading-snug opacity-90">{pkg.blurb}</p>}

                  <p className="font-display mt-6 text-5xl leading-none">{pkg.price}</p>
                  {pkg.minimum && <p className="eyebrow mt-3 opacity-70">{pkg.minimum}</p>}
                </header>

                <div
                  className={`my-7 h-0.5 ${solid ? "bg-cream/40" : "bg-red-line"}`}
                  aria-hidden="true"
                />

                <ul className="flex-1 space-y-3">
                  {pkg.includes.map((line) => (
                    <li key={line} className="flex gap-3 leading-relaxed">
                      <Sparkle className="mt-1.5 h-3 w-3 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {pkg.addOns.length > 0 && (
                  <div className="mt-8">
                    <p className="eyebrow mb-3 opacity-70">Add-ons</p>
                    <ul className="space-y-2.5">
                      {pkg.addOns.map((add) => (
                        <li
                          key={add.label}
                          className="flex items-baseline justify-between gap-4 leading-snug"
                        >
                          <span>
                            {add.label}
                            {add.note && (
                              <span className="block text-sm opacity-70">{add.note}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-bold">{add.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-9">
                  <a
                    href={`mailto:${site.email}?subject=${encodeURIComponent(
                      `${site.emailSubject} — ${pkg.name}`
                    )}`}
                    className={`btn w-full justify-center ${
                      solid
                        ? "border-cream bg-cream text-red hover:-translate-y-0.5"
                        : "btn-ghost"
                    }`}
                  >
                    Book {pkg.name}
                  </a>
                </div>
              </section>
            );
          })}
        </div>

        {ratesFootnote && (
          <p className="mx-auto mt-12 max-w-2xl text-center leading-relaxed opacity-70">
            {ratesFootnote}
          </p>
        )}

        <div className="mt-16 border-2 border-red p-8 text-center sm:p-12">
          <h2 className="section-title">Something not on this list?</h2>
          <p className="lede mx-auto mt-4 max-w-xl">
            Odd hours, multiple properties, a shoot that doesn&rsquo;t fit a box — tell me what
            you need and I&rsquo;ll quote it.
          </p>
          <div className="mt-8">
            <Link href="/booking" className="btn btn-solid">
              Get in touch
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
