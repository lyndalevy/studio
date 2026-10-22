import Link from "next/link";

import { site } from "@/content/site";
import { loadPhotos } from "@/lib/photos";

import Gallery from "../components/Gallery";
import { Instagram } from "../components/Marks";
import Wordmark from "../components/Wordmark";

// Re-check the source every 5 minutes so new posts appear on their own.
export const revalidate = 300;

export default async function Photography() {
  const photos = await loadPhotos();

  return (
    <main className="mx-auto max-w-[110rem] px-4 py-10 sm:px-8 sm:py-16">
      <nav className="eyebrow flex justify-between">
        <Link href="/" className="link-draw">
          Studio L
        </Link>
        <Link href="/social" className="link-draw">
          Social
        </Link>
      </nav>

      <header className="mt-10 text-center sm:mt-14">
        <Link href="/" aria-label="Studio L home" className="inline-block">
          <Wordmark className="mx-auto h-[clamp(3.5rem,13vw,9rem)]" />
        </Link>
        {site.intro && (
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            {site.intro}
          </p>
        )}
      </header>

      <div className="mt-12 sm:mt-20">
        {photos.length > 0 ? (
          <Gallery photos={photos} />
        ) : (
          <p className="py-24 text-center text-lg opacity-70">
            Photos are loading from Lightroom. If this stays empty, the albums may
            have stopped being shared.
          </p>
        )}
      </div>

      <footer className="mt-20 flex flex-col items-center gap-4 border-t border-red-line pt-12 text-center sm:mt-28">
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-draw text-lg"
        >
          <span className="flex items-center gap-2.5">
            <Instagram className="h-5 w-5 shrink-0" />
            {site.instagramHandle}
          </span>
        </a>

        {site.email && (
          <a href={`mailto:${site.email}`} className="link-draw text-base opacity-80">
            {site.email}
          </a>
        )}

        <Link href="/social" className="link-draw text-base opacity-80">
          Studio L Social
        </Link>

        <p className="mt-2 text-xs tracking-[0.2em] uppercase opacity-50">
          {new Date().getFullYear()} {site.name}
        </p>
      </footer>
    </main>
  );
}
