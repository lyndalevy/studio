import Image from "next/image";
import Link from "next/link";

import { site } from "@/content/site";
import { social } from "@/content/social";
import { feedPosts, tierPosts } from "@/lib/socialMedia";
import { loadPhotos } from "@/lib/photos";
import Wordmark from "./components/Wordmark";

// Follow the Photography page's photos, which refresh every 5 minutes.
export const revalidate = 300;

/** A peek at the social side: a few favourite posts, by feed (or tier) and id. */
const peek = [
  feedPosts["sleek-and-electric"].find((p) => p.id === "04-content-warning"),
  feedPosts["bold-and-bright"].find((p) => p.id === "09-charger"),
  feedPosts["bold-and-bright"].find((p) => p.id === "03-love-more"),
  feedPosts["dark-and-romantic"].find((p) => p.id === "04-aperitivo"),
  feedPosts["sculptural-and-sunlit"].find((p) => p.id === "09-yellow-diamond-bracelet"),
  feedPosts["sleek-and-electric"].find((p) => p.id === "05-acura-edit"),
].filter((p) => p !== undefined);

/** The front door: photography on one side, social on the other. */
export default async function Home() {
  // The first six photos on the Photography page.
  const photos = (await loadPhotos()).slice(0, 6);

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
