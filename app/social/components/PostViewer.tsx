"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { brand } from "@/content/brand";
import { social } from "@/content/social";
import type { Post } from "@/lib/socialMedia";

/**
 * Full-screen viewer that looks like the Instagram app: one column of posts,
 * opened at the one that was tapped, scrolling up and down through the rest.
 */
export default function PostViewer({
  posts,
  start,
  title,
  titleClass = "",
  onClose,
}: {
  posts: Post[];
  start: number;
  title: string;
  titleClass?: string;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.children[start]?.scrollIntoView({ block: "start" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [start, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} posts`}
      className="ig fixed inset-0 z-[100] overflow-y-auto bg-white text-[#0f1419]"
    >
      <div className="sticky top-0 z-10 flex items-center border-b border-black/10 bg-white/95 px-3 py-2.5 backdrop-blur">
        <button type="button" onClick={onClose} aria-label="Back" className="p-1.5">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className={`flex-1 text-center text-xl leading-none ${titleClass}`}>{title}</p>
        <span className="w-9" />
      </div>

      <div ref={listRef} className="mx-auto max-w-[470px] pb-16">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} location={title} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, location }: { post: Post; location: string }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <article className="scroll-mt-14 border-b border-black/5 pb-4 sm:mt-4 sm:border-b-0">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <Image src={brand.mark} alt="" className="h-8 w-8 rounded-full" />
        <div className="leading-tight">
          <p className="text-[13px] font-semibold">{social.handle}</p>
          <p className="text-[11px] opacity-70">{location}</p>
        </div>
      </header>

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
        {post.kind === "carousel" && post.slides ? (
          <Carousel slides={post.slides} onIndex={setIndex} />
        ) : post.kind === "video" && post.src ? (
          <AutoVideo src={post.src} poster={post.poster} sound={post.sound} />
        ) : (
          <Image src={post.src ?? post.poster} alt="" fill sizes="470px" className="object-cover" />
        )}
        {post.slides && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {index + 1}/{post.slides.length}
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-4 px-3 pt-3">
        <button type="button" onClick={() => setLiked((v) => !v)} aria-label="Like">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill={liked ? "#ff3040" : "none"} stroke={liked ? "#ff3040" : "currentColor"} strokeWidth="1.8">
            <path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 4 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4 20 4 22.4 7.2 21.2 10.6 19.5 15.4 12 20 12 20z" strokeLinejoin="round" />
          </svg>
        </button>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5z" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21.5 3.5L10 14M21.5 3.5l-7 17-4.5-6.5-6.5-4.5 18-6z" strokeLinejoin="round" />
        </svg>
        {post.slides && (
          <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-1">
            {post.slides.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-[#0095f6]" : "bg-black/20"}`} />
            ))}
          </div>
        )}
        <button type="button" onClick={() => setSaved((v) => !v)} aria-label="Save" className="ml-auto">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M6 3.5h12v17l-6-5-6 5z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {post.caption && <Caption text={post.caption} />}
    </article>
  );
}

/** Caption with the handle in bold, hashtags in link blue, clamped until "more" is tapped. */
function Caption({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);

  return (
    <div className="px-3 pt-2 text-[14px] leading-[1.4]">
      <p className={`whitespace-pre-line ${open ? "" : "line-clamp-2"}`}>
        <span className="mr-1.5 font-semibold">{social.handle}</span>
        {parts.map((part, i) =>
          part.startsWith("#") ? (
            <span key={i} className="text-[#00376b]">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </p>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="mt-0.5 text-[14px] text-black/50">
          more
        </button>
      )}
    </div>
  );
}

/** Swipeable slides, snapping one at a time like an Instagram carousel. */
function Carousel({ slides, onIndex }: { slides: NonNullable<Post["slides"]>; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (delta: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: (index + delta) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) {
            setIndex(i);
            onIndex(i);
          }
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <div key={s.src} className="relative h-full w-full shrink-0 snap-center">
            <Image src={s.src} alt={`Slide ${i + 1}`} fill sizes="470px" className="object-cover" />
          </div>
        ))}
      </div>
      {index > 0 && <SlideButton side="left" onClick={() => go(-1)} />}
      {index < slides.length - 1 && <SlideButton side="right" onClick={() => go(1)} />}
    </>
  );
}

function SlideButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className={`absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow sm:flex ${side === "left" ? "left-2" : "right-2"}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Plays while on screen and pauses when scrolled away. Reels with sound get a mute toggle. */
function AutoVideo({ src, poster, sound }: { src: string; poster: string; sound?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? el.play().catch(() => {}) : el.pause()),
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      {sound && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            {muted ? (
              <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
          </svg>
        </button>
      )}
    </>
  );
}
