import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { visibleGalleries } from "@/content/galleries";
import { loadGallery } from "@/lib/sources";
import PageHeader from "../components/PageHeader";
import { Polaroids } from "../components/Marks";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Real estate, events, portraits, wildlife, and product photography.",
};

// Re-check the photo sources every 5 minutes so new uploads appear without
// a redeploy.
export const revalidate = 300;

export default async function PortfolioPage() {
  const galleries = visibleGalleries();

  // Resolve each category's cover: either the one pinned in the config, or
  // the first photo in that gallery.
  const cards = await Promise.all(
    galleries.map(async (g) => {
      if (g.cover) return { gallery: g, cover: g.cover, count: null as number | null };
      const { photos } = await loadGallery(g.source, g.name, { randomize: g.randomize });
      return {
        gallery: g,
        cover: photos[0]?.thumb ?? null,
        count: photos.length,
      };
    })
  );

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="The work"
        lede="Five things I shoot. Click into whichever one brought you here."
      />

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ gallery, cover, count }) => (
            <li key={gallery.slug}>
              <Link
                href={`/portfolio/${gallery.slug}`}
                className="group block border-2 border-red transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
              >
                <div className="frame relative aspect-[4/5] overflow-hidden">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={gallery.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Polaroids className="h-20 w-auto text-red opacity-30" />
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-red p-5 transition-colors duration-300 group-hover:bg-red group-hover:text-cream">
                  <h2 className="font-display text-3xl leading-none">{gallery.name}</h2>
                  <p className="mt-2 leading-relaxed">{gallery.blurb}</p>
                  {count !== null && count > 0 && (
                    <p className="eyebrow mt-4 opacity-70">
                      {count} {count === 1 ? "photo" : "photos"}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
