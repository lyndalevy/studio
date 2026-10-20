import Image from "next/image";
import Link from "next/link";

import { site } from "@/content/site";
import { social } from "@/content/social";
import { feedPosts } from "@/lib/socialMedia";
import Wordmark from "./components/Wordmark";

/** A peek at the social side: the first post of each look. */
const peek = Object.values(feedPosts).flatMap((posts) => posts.slice(0, 1));

/** The front door: photography on one side, social on the other. */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex justify-center px-4 pt-8 pb-6 sm:pt-10">
        <Wordmark full={false} className="h-[clamp(3.5rem,10vw,6.5rem)]" />
      </header>

      <div className="grid flex-1 md:grid-cols-2">
        <Link
          href="/photography"
          className="group flex flex-col items-center justify-center gap-4 border-t-2 border-red px-6 py-16 text-center md:border-r-2"
        >
          <span className="font-[family-name:var(--font-display)] text-6xl transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105 sm:text-8xl">
            Photography
          </span>
          {site.intro && <span className="max-w-xs text-lg opacity-80">{site.intro}</span>}
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
