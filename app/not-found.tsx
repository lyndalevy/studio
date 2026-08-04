import Link from "next/link";

import { FilmReel } from "./components/Marks";

export default function NotFound() {
  return (
    <div className="tile-pattern flex min-h-[70vh] items-center justify-center px-5 py-24 text-center">
      <div>
        <FilmReel className="mx-auto h-24 w-auto text-red" />
        <h1 className="headline mt-8">Nothing on this roll</h1>
        <p className="lede mx-auto mt-5 max-w-md">
          That page doesn&rsquo;t exist. Probably my fault, possibly a typo.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-solid">
            Back home
          </Link>
          <Link href="/portfolio" className="btn btn-ghost">
            See the work
          </Link>
        </div>
      </div>
    </div>
  );
}
