import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl">
        Nothing here
      </h1>
      <p className="mt-5 max-w-sm text-lg leading-relaxed">
        That page doesn&rsquo;t exist. Probably a typo, possibly my fault.
      </p>
      <Link href="/" className="link-draw mt-8 text-lg">
        Back to the photos
      </Link>
    </main>
  );
}
