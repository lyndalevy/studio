import Image from "next/image";
import Link from "next/link";

import { brand } from "@/content/brand";
import { site } from "@/content/site";
import { featuredPerGallery, visibleGalleries } from "@/content/galleries";
import { packages } from "@/content/rates";
import { loadGallery } from "@/lib/sources";
import FilmStrip from "./components/FilmStrip";
import SparkleField from "./components/SparkleField";
import Wordmark from "./components/Wordmark";
import { Divider, Instagram } from "./components/Marks";

// Re-check the albums every 5 minutes so new uploads show up on their own.
export const revalidate = 300;

/**
 * A couple of photos from every gallery, interleaved so the strip cycles
 * through the different kinds of work rather than showing them in blocks.
 */
async function loadFeatured() {
  const perGallery = await Promise.all(
    visibleGalleries().map(async (gallery) => {
      const { photos } = await loadGallery(gallery.source, gallery.name);
      return photos.slice(0, featuredPerGallery).map((p) => ({ src: p.thumb, alt: p.alt }));
    })
  );

  // Round-robin: one from each gallery, then the next from each, and so on.
  const strip: { src: string; alt: string }[] = [];
  for (let i = 0; i < featuredPerGallery; i++) {
    for (const photos of perGallery) {
      if (photos[i]) strip.push(photos[i]);
    }
  }
  return strip;
}

export default async function Home() {
  const galleries = visibleGalleries();
  const featured = await loadFeatured();
  const cheapest = packages.reduce((min, p) => {
    const n = Number(p.price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n < min ? n : min;
  }, Infinity);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-red">
        <SparkleField />
        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <Wordmark className="rise mx-auto h-[clamp(5.5rem,24vw,17rem)]" />

          <p className="lede rise mx-auto mt-8 max-w-2xl" style={{ animationDelay: "0.1s" }}>
            {site.intro}
          </p>

          <div
            className="rise mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.2s" }}
          >
            <Link href="/portfolio" className="btn btn-solid">
              See the work
            </Link>
            <Link href="/booking" className="btn btn-ghost">
              Book a shoot
            </Link>
          </div>

          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-draw rise mt-8 text-lg"
            style={{ animationDelay: "0.3s" }}
          >
            {/* The flex lives on an inner span: .link-draw sets its own
                display, so flex on the anchor itself gets overridden. */}
            <span className="flex items-center gap-2.5">
              <Instagram className="h-5 w-5 shrink-0" />
              {site.instagramHandle}
            </span>
          </a>
        </div>
      </section>

      {/* ── Featured film strip ──────────────────────────── */}
      <FilmStrip photos={featured} />

      {/* ── What I shoot ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-12 text-center">
          <h2 className="section-title">Pick your poison</h2>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/portfolio/${g.slug}`}
                className="group flex h-full flex-col justify-between border-2 border-red p-7 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-red hover:text-cream"
              >
                <h3 className="font-display text-3xl leading-none">{g.name}</h3>
                <p className="mt-3 leading-relaxed">{g.blurb}</p>
                <span className="eyebrow mt-6 inline-flex items-center gap-2">
                  View gallery
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The serious undertone: how the job actually runs ── */}
      <section className="border-y-2 border-red bg-red text-cream">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="mb-14 text-center">
            <h2 className="section-title">You hire one person. That&rsquo;s the point.</h2>
          </div>

          <ul className="grid gap-12 sm:grid-cols-3">
            {[
              {
                icon: brand.markCamera,
                title: "Lighting and shooting",
                body: "I show up with the gear, read the room, and get the shots the space or the day actually needs.",
              },
              {
                icon: brand.markReel,
                title: "Editing and retouching",
                body: "Grass, sky, lighting, blemishes. The corrections happen before you ever see a file.",
              },
              {
                icon: brand.markPolaroid,
                title: "Delivery on schedule",
                body: "Turnaround is quoted up front and met. Need it faster? That is a listed add-on, not a favour.",
              },
            ].map(({ icon, title, body }) => (
              <li key={title} className="text-center">
                {/* The marks are red artwork, so they sit on a cream disc to
                    stay legible against the red band. */}
                <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-cream">
                  <Image src={icon} alt="" className="h-12 w-12 object-contain" />
                </span>
                <h3 className="font-display mt-5 text-2xl">{title}</h3>
                <p className="mt-3 leading-relaxed opacity-90">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Rates teaser ─────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <h2 className="section-title">
          Starting at{" "}
          <strong className="font-bold">
            ${Number.isFinite(cheapest) ? cheapest : ""}
          </strong>
        </h2>
        <p className="lede mx-auto mt-5 max-w-xl">
          Everything is priced on the site. No &ldquo;contact for pricing,&rdquo; no surprise line
          items at the end.
        </p>
        <div className="mt-9">
          <Link href="/rates" className="btn btn-solid">
            See full rates
          </Link>
        </div>

        <Divider className="mt-20" />
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-8 text-center sm:px-8">
        <h2 className="section-title">Let&rsquo;s get it on the calendar</h2>
        <p className="lede mx-auto mt-5 max-w-xl">{site.booking.blurb}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            href={`mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject)}`}
            className="btn btn-solid"
          >
            Email me
          </a>
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            <Instagram className="h-4 w-4" />
            {site.instagramHandle}
          </a>
        </div>
      </section>
    </>
  );
}
