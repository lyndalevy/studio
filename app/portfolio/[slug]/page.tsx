import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { galleries, galleryBySlug } from "@/content/galleries";
import { site } from "@/content/site";
import { loadGallery } from "@/lib/sources";
import Gallery from "../../components/Gallery";
import PageHeader from "../../components/PageHeader";
import { Camera } from "../../components/Marks";

export const revalidate = 300;

export function generateStaticParams() {
  return galleries.filter((g) => !g.hidden).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = galleryBySlug(slug);
  if (!gallery) return { title: "Not found" };
  return { title: gallery.name, description: gallery.blurb };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = galleryBySlug(slug);
  if (!gallery) notFound();

  const { photos, error } = await loadGallery(gallery.source, gallery.name, {
    randomize: gallery.randomize,
  });

  return (
    <>
      <PageHeader eyebrow="Portfolio" title={gallery.name} lede={gallery.blurb} />

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <Link href="/portfolio" className="link-draw eyebrow mb-10 inline-block">
          ← All categories
        </Link>

        {photos.length > 0 ? (
          <Gallery photos={photos} />
        ) : (
          <div className="border-2 border-red px-6 py-20 text-center">
            <Camera className="mx-auto h-20 w-auto text-red opacity-30" />
            <p className="font-display mt-6 text-3xl">Nothing here yet</p>
            <p className="lede mx-auto mt-3 max-w-md">
              {error ?? "This gallery is empty for now — check back soon."}
            </p>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-3xl px-5 pb-4 text-center sm:px-8">
        <h2 className="section-title">Want something like this?</h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/rates" className="btn btn-ghost">
            See rates
          </Link>
          <a
            href={`mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject)}`}
            className="btn btn-solid"
          >
            Email me
          </a>
        </div>
      </section>
    </>
  );
}
