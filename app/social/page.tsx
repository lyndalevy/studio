import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { brand } from "@/content/brand";
import { site } from "@/content/site";
import { addOns, baseFee, feeds, included, packages, social, terms, tiers } from "@/content/social";
import { loadCaptions } from "@/lib/captions";
import { feedPosts } from "@/lib/socialMedia";
import { Sparkle } from "../components/Marks";
import PostGrid from "./components/PostGrid";
import { feedStyle } from "./fonts";

export const metadata: Metadata = {
  title: `${social.name} — Social media management`,
  description: social.bio,
};

const tierColor = { bronze: "#b0744a", silver: "#8e959c", gold: "#c39b2a" };

export default async function Social() {
  const looks = await Promise.all(
    feeds.map(async (feed) => {
      const captions = await loadCaptions(feed.key);
      return {
        ...feed,
        posts: feedPosts[feed.key].map((p) => ({ ...p, caption: captions[p.id] })),
      };
    })
  );
  const postCount = looks.reduce((n, l) => n + l.posts.length, 0);

  return (
    <main className="mx-auto max-w-[80rem] px-4 py-10 sm:px-8 sm:py-16">
      <nav className="eyebrow flex justify-between">
        <Link href="/" className="link-draw">
          Studio L
        </Link>
        <span className="flex gap-6">
          <Link href="/photography" className="link-draw">
            Photography
          </Link>
          <Link href="/dashboard" className="link-draw">
            Dashboard
          </Link>
        </span>
      </nav>

      {/* Profile header, Instagram style. */}
      <header className="mt-10 flex flex-col items-center gap-6 text-center sm:mt-14 sm:flex-row sm:justify-center sm:gap-12 sm:text-left">
        <Image src={brand.mark} alt="" priority className="h-28 w-28 rounded-full sm:h-36 sm:w-36" />
        <div>
          <h1>
            <Image src={brand.logoSocial} alt={social.name} priority className="mx-auto h-auto w-[min(26rem,100%)] sm:mx-0" />
          </h1>
          <p className="mt-1 text-lg opacity-80">{social.byline}</p>
          <dl className="mt-4 flex justify-center gap-8 sm:justify-start">
            {[
              [feeds.length, "looks"],
              [postCount, "posts"],
              [tiers.length, "tiers"],
            ].map(([n, label]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-bold">{n}</dd>
                <span className="opacity-80">{label}</span>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-lg">{social.bio}</p>
        </div>
      </header>

      <div className="eyebrow mt-10 flex justify-center gap-8 border-y-2 border-red py-3 sm:mt-14">
        <a href="#posts" className="link-draw">Post types</a>
        <a href="#packages" className="link-draw">Packages</a>
        <a href="#samples" className="link-draw">Samples</a>
      </div>

      {/* Bronze, silver, gold: what each tier is. */}
      <section id="posts" className="scroll-mt-6 pt-14 sm:pt-20">
        <h2 className="text-center font-[family-name:var(--font-display)] text-5xl sm:text-6xl">Post types</h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-6">
          {tiers.map((tier) => (
            <div key={tier.key}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="flex items-center gap-2.5 text-3xl font-bold" style={{ color: tierColor[tier.key] }}>
                  <Sparkle className="h-5 w-5" />
                  {tier.name}
                </h3>
                <p className="text-lg">{tier.what}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What each package gets you, and the price. */}
      <section id="packages" className="scroll-mt-6 pt-20 sm:pt-28">
        <h2 className="text-center font-[family-name:var(--font-display)] text-5xl sm:text-6xl">Packages</h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div key={pkg.name} className="flex flex-col border-2 border-red p-6">
              <h3 className="font-[family-name:var(--font-display)] text-4xl">{pkg.name}</h3>
              <p className="mt-3">
                <span className="text-4xl font-bold">${pkg.price}</span>
                <span className="opacity-80"> /month</span>
              </p>
              <p className="mt-2 text-sm leading-snug opacity-80">Includes ${baseFee} base</p>
              <p className="eyebrow mt-6 opacity-70">Every week</p>
              <ul className="mt-2 space-y-1.5 text-lg">
                {pkg.perWeek.map((item) => {
                  const tier = tiers.find((t) => item.endsWith(t.name))!;
                  return (
                    <li key={item} className="flex items-center gap-2.5">
                      <Sparkle className="h-4 w-4 shrink-0" style={{ color: tierColor[tier.key] }} />
                      {item} {Number(item[0]) > 1 ? "posts" : "post"}
                    </li>
                  );
                })}
              </ul>
              {pkg.extra && <p className="mt-4 text-sm leading-snug opacity-80">{pkg.extra}</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="bg-red p-6 text-cream">
            <p className="eyebrow">Every package includes · ${baseFee}/month base</p>
            <ul className="mt-3 space-y-1.5 text-lg">
              {included.map((item) => (
                <li key={item} className="flex items-baseline gap-2.5">
                  <Sparkle className="h-4 w-4 shrink-0 translate-y-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-red p-6">
            <p className="eyebrow">Add-ons</p>
            <ul className="mt-3 space-y-1.5 text-lg">
              {addOns.map((a) => (
                <li key={a.name} className="flex justify-between gap-4">
                  <span className="flex items-baseline gap-2.5">
                    <Sparkle className="h-4 w-4 shrink-0 translate-y-0.5" />
                    <span>
                    {a.name}
                    {a.note && <span className="ml-2 text-sm italic opacity-70">{a.note}</span>}
                    </span>
                  </span>
                  <span className="font-bold">{a.price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-sm tracking-wide opacity-70">{terms.join("  ·  ")}</p>
      </section>

      {/* The sample feeds. */}
      <section id="samples" className="scroll-mt-6 pt-20 sm:pt-28">
        <h2 className="text-center font-[family-name:var(--font-display)] text-5xl sm:text-6xl">Samples</h2>
        <div className="mt-10 grid gap-14 md:grid-cols-2 md:gap-x-10 md:gap-y-16">
          {looks.map((look, i) => {
            const style = feedStyle[look.key];
            // An odd one out at the end gets its own row, centred.
            const alone = i === looks.length - 1 && looks.length % 2 === 1;
            return (
              <div
                key={look.key}
                className={`bg-white p-4 sm:p-6 ${alone ? "md:col-span-2 md:mx-auto md:w-[calc(50%-1.25rem)]" : ""}`}
              >
                <h2 className={`text-center text-4xl sm:text-5xl ${style.font}`} style={{ color: style.color }}>
                  {look.label}
                </h2>
                <p className="mt-2 mb-5 text-center text-lg font-bold" style={{ color: style.planColor }}>
                  {look.plan} package
                </p>
                <PostGrid posts={look.posts} title={look.label} titleClass={style.font} />
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-20 flex flex-col items-center gap-4 border-t border-red-line pt-12 text-center sm:mt-28">
        {site.email && (
          <a href={`mailto:${site.email}`} className="link-draw text-lg">
            {site.email}
          </a>
        )}
        <p className="mt-2 text-xs tracking-[0.2em] uppercase opacity-50">
          {new Date().getFullYear()} {social.name}
        </p>
      </footer>
    </main>
  );
}
