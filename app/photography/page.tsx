import Link from "next/link";

import { instagramLimit, perAlbum, visibleAlbums } from "@/content/photos";
import { site } from "@/content/site";
import { fetchInstagramPhotos, hasInstagramToken } from "@/lib/instagram";
import { loadGallery, type Photo } from "@/lib/sources";

import Gallery from "../components/Gallery";
import { Instagram } from "../components/Marks";
import Wordmark from "../components/Wordmark";

// Re-check the source every 5 minutes so new posts appear on their own.
export const revalidate = 300;

/** Instagram posts, newest first. */
async function loadFromInstagram(): Promise<Photo[]> {
  const posts = await fetchInstagramPhotos(instagramLimit);
  return posts.map((p) => ({
    id: p.id,
    src: p.url,
    thumb: p.thumbUrl,
    full: p.url,
    // Instagram doesn't report dimensions, so the grid uses the image's
    // own intrinsic ratio once it loads.
    alt: p.caption?.split("\n")[0]?.slice(0, 120) || `Photograph by ${site.shortName}`,
  }));
}

/**
 * Every Lightroom album merged into one set, interleaved so the grid moves
 * between kinds of work instead of showing them in blocks.
 */
async function loadFromLightroom(): Promise<Photo[]> {
  const perAlbumPhotos = await Promise.all(
    visibleAlbums().map(async (album) => {
      const { photos } = await loadGallery(album.source, album.name);
      return perAlbum === null ? photos : photos.slice(0, perAlbum);
    })
  );

  const merged: Photo[] = [];
  const longest = Math.max(0, ...perAlbumPhotos.map((p) => p.length));
  for (let i = 0; i < longest; i++) {
    for (const photos of perAlbumPhotos) {
      if (photos[i]) merged.push(photos[i]);
    }
  }
  return merged;
}

/**
 * Instagram when a token is configured, Lightroom otherwise.
 *
 * Instagram tokens expire every 60 days, so if one lapses the page quietly
 * falls back to the Lightroom albums rather than going blank.
 */
async function loadPhotos(): Promise<Photo[]> {
  if (hasInstagramToken()) {
    try {
      const photos = await loadFromInstagram();
      if (photos.length) return photos;
      console.warn("[instagram] token works but returned no photos; using Lightroom");
    } catch (err) {
      console.warn("[instagram]", (err as Error).message, "— using Lightroom instead");
    }
  }
  return loadFromLightroom();
}

export default async function Photography() {
  const photos = await loadPhotos();

  return (
    <main className="mx-auto max-w-[110rem] px-4 py-12 sm:px-8 sm:py-20">
      <header className="text-center">
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
