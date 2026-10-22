import Image from "next/image";
import Link from "next/link";

import { visibleAlbums } from "@/content/photos";
import { site } from "@/content/site";
import { social } from "@/content/social";
import { feedPosts, tierPosts } from "@/lib/socialMedia";
import { loadGallery } from "@/lib/sources";
import Wordmark from "./components/Wordmark";

// Pick fresh photos from Lightroom every 5 minutes.
export const revalidate = 300;

/** A peek at the social side: a few favourite posts, by feed (or tier) and id. */
const peek = [
  feedPosts["bold-and-bright"].find((p) => p.id === "01-beach"),
  feedPosts["fun-and-playful"].find((p) => p.id === "03-grandma-texts"),
  feedPosts["earthy-and-naturalistic"].find((p) => p.id === "08-coffee-headline"),
  feedPosts["earthy-and-naturalistic"].find((p) => p.id === "03-coffee-sip"),
  feedPosts["sculptural-and-sunlit"].find((p) => p.id === "06-baguette-worn"),
  tierPosts.gold.find((p) => p.id === "oyster-point-long-day"),
].filter((p) => p !== undefined);

/** A peek at the photography side: one photo from each of the first six albums. */
async function photoPeek() {
  const albums = await Promise.all(
    visibleAlbums()
      .slice(0, peek.length)
      .map((album) => loadGallery(album.source, album.name))
  );
  return albums.flatMap((a) => a.photos.slice(0, 1));
}

/** The front door: photography on one side, social on the other. */
export default async function Home() {
  const photos = await photoPeek();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex justify-center px-4 pt-8 pb-6 sm:pt-10">
        <Wordmark full={false} className="h-[clamp(3.5rem,10vw,6.5rem)]" />
      </header>

      <div className="grid flex-1 md:grid-cols-2">
        <Link
          href="/photography"
          className="group flex flex-col items-center justify-center gap-6 border-t-2 border-red px-6 py-16 text-center md:border-r-2"
        >
          <span className="font-[family-name:var(--font-display)] text-6xl transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105 sm:text-8xl">
            Photography
          </span>
          {site.intro && <span className="max-w-xs text-lg opacity-80">{site.intro}</span>}
          {photos.length > 0 && (
            <span className="grid w-56 grid-cols-2 gap-[3px] sm:w-64">
              {photos.map((p) => (
                <span key={p.id} className="relative aspect-[4/5] overflow-hidden">
                  <Image src={p.thumb} alt={p.alt} fill sizes="128px" className="object-cover" />
                </span>
              ))}
            </span>
          )}
        </Link>

        <Link
          href="/social"
          className="group flex flex-col items-center justify-center gap-6 bg-red px-6 py-16 text-center text-cream"
        >
          <span className="font-[family-name:var(--font-display)] text-6xl transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105 sm:text-8xl">
            Social
          </span>
          <span className="text-lg opacity-90">{social.bio}</span>
          <span className="grid w-56 grid-cols-2 gap-[3px] sm:w-64">
            {peek.map((p) => (
              <span key={p.poster} className="relative aspect-[4/5] overflow-hidden">
                <Image src={p.poster} alt="" fill sizes="128px" className="object-cover" />
              </span>
            ))}
          </span>
        </Link>
      </div>
    </main>
  );
}
