import { unstable_cache } from "next/cache";

import { instagramLimit, perAlbum, visibleAlbums } from "@/content/photos";
import { site } from "@/content/site";
import { fetchInstagramPhotos, hasInstagramToken } from "@/lib/instagram";
import { loadGallery, type Photo } from "@/lib/sources";

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
async function freshPhotos(): Promise<Photo[]> {
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

/**
 * The photos, shuffled once and shared for 5 minutes, so the home page peek
 * shows the same first photos as the Photography page.
 */
export const loadPhotos = unstable_cache(freshPhotos, ["photos"], { revalidate: 300 });
