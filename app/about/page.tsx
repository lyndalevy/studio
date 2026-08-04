import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { site } from "@/content/site";
import PageHeader from "../components/PageHeader";
import { Divider, Roundel } from "../components/Marks";

export const metadata: Metadata = {
  title: "About",
  description: site.about.paragraphs[0],
};

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title={site.about.heading} />

      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <div className="order-2 md:order-1">
            {site.about.portrait ? (
              <div className="frame relative aspect-[4/5] border-2 border-red">
                <Image
                  src={site.about.portrait}
                  alt="Lynda behind the camera"
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="tile-pattern flex aspect-[4/5] items-center justify-center border-2 border-red">
                <Roundel className="h-32 w-32 text-red" />
              </div>
            )}
          </div>

          <div className="order-1 space-y-6 md:order-2">
            {site.about.paragraphs.map((p) => (
              <p key={p} className="lede">
                {p}
              </p>
            ))}
          </div>
        </div>

        <Divider className="mt-20" />

        <div className="mt-16 text-center">
          <h2 className="section-title">Ready when you are</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/portfolio" className="btn btn-ghost">
              See the work
            </Link>
            <Link href="/booking" className="btn btn-solid">
              Book a shoot
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
