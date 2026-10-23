"use client";

import { useActionState, useState, useTransition } from "react";

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

  return (
    <section className="mt-10 border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Ideas to film</h2>
        <p className="text-lg">For Studio L Social and Studio L Photography</p>
      </div>

      <div className="space-y-6 p-5">
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
          <select name="for" className="border-2 border-red bg-cream px-3 py-2">
            <option>Social</option>
            <option>Photography</option>
          </select>
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
                        {i.link && (
                          <a href={i.link} target="_blank" rel="noopener noreferrer" className="link-draw ml-1.5 text-xs">
                            Open ↗
                          </a>
                        )}
                        <span className="ml-1.5 text-xs opacity-60">{i.for}</span>
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
