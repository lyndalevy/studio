"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

import type { Post } from "@/lib/socialMedia";
import PostViewer from "./PostViewer";

/**
 * A feed as Instagram shows it on a profile: a 3x3 grid, or one scrolling row
 * for the post-type examples. Tapping a post opens the scrolling viewer.
 */
export default function PostGrid({
  posts,
  title,
  titleClass,
  layout = "grid",
}: {
  posts: Post[];
  title: string;
  titleClass?: string;
  layout?: "grid" | "row";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-3 gap-[3px]"
            : "-mx-4 flex snap-x gap-[3px] overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8"
        }
      >
        {posts.map((post, i) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open ${title} post ${i + 1}`}
            className={`frame relative aspect-[4/5] cursor-pointer transition-opacity duration-300 hover:opacity-85 ${
              layout === "row" ? "w-[42vw] max-w-[220px] shrink-0 snap-start" : ""
            }`}
          >
            <Image
              src={post.poster}
              alt=""
              fill
              sizes={layout === "grid" ? "(max-width: 1024px) 33vw, 240px" : "220px"}
              className="object-cover"
            />
            <KindIcon kind={post.kind} />
          </button>
        ))}
      </div>

      {open !== null && (
        <PostViewer posts={posts} start={open} title={title} titleClass={titleClass} onClose={close} />
      )}
    </>
  );
}

/** The small white mark Instagram puts on carousels and reels. */
function KindIcon({ kind }: { kind: Post["kind"] }) {
  if (kind === "image") return null;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="absolute right-2 top-2 h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
      fill="currentColor"
    >
      {kind === "carousel" ? (
        <path d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 8v11a2 2 0 0 0 2 2h11v-2H5V8z" />
      ) : (
        <path d="M8 5.5v13l10.5-6.5z" />
      )}
    </svg>
  );
}
