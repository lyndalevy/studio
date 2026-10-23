"use client";

import { useState, useTransition } from "react";

import type { SavedLink, Shelf } from "@/lib/dashboard/library";
import { sortLink } from "./actions";

const COLUMNS: { shelf: Shelf; title: string; color?: string }[] = [
  { shelf: "unsorted", title: "Unsorted" },
  { shelf: "bronze", title: "Bronze", color: "#b0744a" },
  { shelf: "silver", title: "Silver", color: "#8e959c" },
  { shelf: "gold", title: "Gold", color: "#c39b2a" },
];
const MOVES: { shelf: Shelf; label: string; title: string }[] = [
  { shelf: "bronze", label: "B", title: "Bronze" },
  { shelf: "silver", label: "S", title: "Silver" },
  { shelf: "gold", label: "G", title: "Gold" },
  { shelf: "business", label: "Biz", title: "Business (Ideas to film)" },
];

/** The post idea library: links saved to ideas/ in Dropbox, sorted into tiers. */
export default function LibraryCard({ links }: { links: SavedLink[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (path: string, to: Shelf | "delete") => start(async () => setError(await sortLink(path, to)));

  return (
    <section className="mt-10 border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Post ideas</h2>
        <p className="text-lg">For any client, by tier</p>
      </div>
      <div className="space-y-4 p-5">
        {error && <p className="text-sm">{error}</p>}
        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
          {COLUMNS.map(({ shelf, title, color }) => {
            const list = links.filter((l) => l.shelf === shelf);
            return (
              <div key={shelf} className="border border-red-line p-4">
                <p className="eyebrow mb-2" style={color ? { color } : undefined}>
                  {title} · {list.length}
                </p>
                {list.length === 0 && <p className="text-sm opacity-70">Nothing here yet.</p>}
                <ul className="space-y-2.5">
                  {list.map((l) => (
                    <li key={l.path} className="text-sm">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-draw">
                        {l.name} ↗
                      </a>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {MOVES.filter((m) => m.shelf !== shelf).map((m) => (
                          <button
                            key={m.shelf}
                            type="button"
                            onClick={() => act(l.path, m.shelf)}
                            title={`Move to ${m.title}`}
                            className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                          >
                            {m.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => act(l.path, "delete")}
                          title="Delete this link from Dropbox"
                          aria-label={`Delete "${l.name}"`}
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
          Save Instagram links to ideas/ in Dropbox from your phone (Share → Dropbox). B, S and G move a link into that
          tier&rsquo;s folder; Biz sends it to Ideas to film.
        </p>
      </div>
    </section>
  );
}
