"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import type { Idea, IdeaStatus } from "@/lib/dashboard/ideas";
import { addIdea, changeIdea } from "./actions";

const NEXT: Record<IdeaStatus, IdeaStatus> = { "to film": "filmed", filmed: "posted", posted: "to film" };
const SHOW: { status: IdeaStatus; title: string }[] = [
  { status: "to film", title: "To film" },
  { status: "filmed", title: "Filmed" },
  { status: "posted", title: "Posted" },
];

/** Ideas to film for Lynda's own accounts. Saved in ideas.json in Dropbox. */
export default function IdeasCard({ ideas }: { ideas: Idea[] }) {
  const [error, add, adding] = useActionState(addIdea, null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const change = (id: string, to: IdeaStatus | "delete") =>
    start(async () => setChangeError(await changeIdea(id, to)));
  // Open or closed, remembered on this device.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read after hydration, so the server and first render match
      if (localStorage.getItem("ideas-to-film-open") === "0") setOpen(false);
    } catch {}
  }, []);
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem("ideas-to-film-open", was ? "0" : "1");
      } catch {}
      return !was;
    });

  return (
    <section className="mt-10 border-2 border-red bg-cream">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="ideas-to-film-body"
        className="flex w-full flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-left text-cream"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Ideas to film</h2>
        <span className="text-lg">
          {!open && SHOW.map(({ status, title }) => `${ideas.filter((i) => i.status === status).length} ${title.toLowerCase()}`).join(" · ")}
          <span aria-hidden className="ml-3 inline-block transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            ▾
          </span>
        </span>
      </button>

      <div id="ideas-to-film-body" hidden={!open} className="space-y-6 p-5">
        <form action={add} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="text"
            required
            maxLength={500}
            placeholder="A reel, a behind-the-scenes, a trend to try…"
            className="flex-1 border-2 border-red bg-cream px-3 py-2 outline-none"
          />
          <input
            name="link"
            type="url"
            placeholder="Link (optional)"
            className="border-2 border-red bg-cream px-3 py-2 outline-none sm:w-56"
          />
          <button type="submit" disabled={adding} className="btn btn-ghost justify-center disabled:opacity-50">
            {adding ? "Adding…" : "Add idea"}
          </button>
        </form>
        {(error || changeError) && <p className="text-sm">{error ?? changeError}</p>}

        <div className={`grid gap-4 md:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
          {SHOW.map(({ status, title }) => {
            const list = ideas.filter((i) => i.status === status);
            return (
              <div key={status} className="border border-red-line p-4">
                <p className="eyebrow mb-2">
                  {title} · {list.length}
                </p>
                {list.length === 0 && <p className="text-sm opacity-70">Nothing here yet.</p>}
                <ul className="space-y-2">
                  {list.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>
                        {i.text}
                        {i.link?.startsWith("photo:") ? (
                          <a
                            href={`/dashboard/idea-image?size=large&ref=${encodeURIComponent(i.link.slice(6))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block w-fit"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- a signed-in preview, not a site image */}
                            <img
                              src={`/dashboard/idea-image?ref=${encodeURIComponent(i.link.slice(6))}`}
                              alt=""
                              loading="lazy"
                              className="h-16 w-16 border border-red-line object-cover"
                            />
                          </a>
                        ) : (
                          i.link && (
                            <a href={i.link} target="_blank" rel="noopener noreferrer" className="link-draw ml-1.5 text-xs">
                              Open ↗
                            </a>
                          )
                        )}
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => change(i.id, NEXT[i.status])}
                          title={`Move to ${NEXT[i.status]}`}
                          className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                        >
                          {status === "posted" ? "Redo" : NEXT[i.status]} →
                        </button>
                        <button
                          type="button"
                          onClick={() => change(i.id, "delete")}
                          title="Delete this idea"
                          aria-label={`Delete "${i.text}"`}
                          className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-xs opacity-70">
          Saved in STUDIO L/ideas.json in Dropbox. Links saved to ideas/business show up here on their own. Put the
          clips you film in STUDIO L/FOOTAGE.
        </p>
      </div>
    </section>
  );
}
