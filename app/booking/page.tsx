import type { Metadata } from "next";
import Link from "next/link";

import { site } from "@/content/site";
import { packages } from "@/content/rates";
import PageHeader from "../components/PageHeader";
import { Sparkle } from "../components/Marks";

export const metadata: Metadata = {
  title: "Booking",
  description: `Book a shoot with ${site.name}. Email ${site.email} or DM ${site.instagramHandle}.`,
};

/** What to put in the email, so the first reply can be a real answer. */
const askFor = [
  "The date, or a few that could work",
  "Where it is",
  "What you need photographed",
  "Roughly how long you think it'll take",
];

export default function BookingPage() {
  return (
    <>
      <PageHeader eyebrow="Booking" title={site.booking.heading} lede={site.booking.blurb} />

      <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-5 sm:grid-cols-2">
          <a
            href={`mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject)}`}
            className="group flex flex-col justify-between border-2 border-red p-8 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-red hover:text-cream"
          >
            <div>
              <p className="eyebrow opacity-70">Email</p>
              <p className="font-display mt-3 text-4xl leading-none">Write to me</p>
            </div>
            <p className="mt-6 break-all">{site.email}</p>
          </a>

          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between border-2 border-red p-8 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-red hover:text-cream"
          >
            <div>
              <p className="eyebrow opacity-70">Instagram</p>
              <p className="font-display mt-3 text-4xl leading-none">Slide in</p>
            </div>
            <p className="mt-6">{site.instagramHandle}</p>
          </a>
        </div>

        <section className="mt-16 border-2 border-red p-8 sm:p-12">
          <h2 className="section-title text-center">Make it a fast yes</h2>
          <p className="lede mx-auto mt-4 max-w-lg text-center">
            Include these four things and I can usually come back with availability and a price
            in one reply.
          </p>
          <ul className="mx-auto mt-9 max-w-md space-y-4">
            {askFor.map((item) => (
              <li key={item} className="flex gap-3.5 text-lg leading-relaxed">
                <Sparkle className="mt-2 h-3.5 w-3.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 text-center">
          <p className="eyebrow mb-3 opacity-70">Rates, in short</p>
          <ul className="mx-auto flex max-w-2xl flex-wrap items-baseline justify-center gap-x-10 gap-y-4">
            {packages.map((p) => (
              <li key={p.name}>
                <span className="font-display block text-4xl leading-none">{p.price}</span>
                <span className="eyebrow mt-2 block opacity-70">{p.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9">
            <Link href="/rates" className="btn btn-ghost">
              Full breakdown
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
