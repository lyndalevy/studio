"use client";

import { useState, useTransition } from "react";

import type { SavedLink, Shelf } from "@/lib/dashboard/library";
import { changeLink } from "./actions";

const COLUMNS: { shelf: Shelf; title: string; color: string }[] = [
  { shelf: "bronze", title: "Bronze", color: "#b0744a" },
  { shelf: "silver", title: "Silver", color: "#8e959c" },
  { shelf: "gold", title: "Gold", color: "#c39b2a" },
];

/**
 * The post idea library: links saved to ideas/bronze, silver and gold in Dropbox. Tap a client's nickname
 * to queue the idea into that client's next cycle with room; tap again to take it off.
 */
export default function LibraryCard({ links, clients }: { links: SavedLink[]; clients: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const act = (l: SavedLink, action: Parameters<typeof changeLink>[2]) =>
    start(async () => {
      setError(await changeLink(l.path, l.url, action));
      setEditing(null);
    });

  return (
    <section className="mt-10 border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Post ideas</h2>
        <p className="text-lg">For any client, by tier</p>
      </div>
      <div className="space-y-4 p-5">
        {error && <p className="text-sm">{error}</p>}
        <div className={`grid gap-4 md:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
          {COLUMNS.map(({ shelf, title, color }) => {
            const list = links.filter((l) => l.shelf === shelf);
            return (
              <div key={shelf} className="border border-red-line p-4">
                <p className="eyebrow mb-2" style={{ color }}>
                  {title} · {list.length}
                </p>
                {list.length === 0 && <p className="text-sm opacity-70">Nothing here yet.</p>}
                <ul className="space-y-3">
                  {list.map((l) => (
                    <li key={l.path} className="text-sm">
                      {editing === l.path ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            act(l, { rename: draft });
                          }}
                          className="flex gap-1.5"
                        >
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={60}
                            className="min-w-0 flex-1 border border-red bg-cream px-2 py-0.5 outline-none"
                          />
                          <button type="submit" className="eyebrow rounded-full border border-red px-2 py-0.5">
                            Save
                          </button>
                        </form>
                      ) : (
                        <span className="flex items-start justify-between gap-2">
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-draw">
                            {l.name} ↗
                          </a>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(l.path);
                                setDraft(l.name);
                              }}
                              title="Rename"
                              aria-label={`Rename "${l.name}"`}
                              className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => act(l, { delete: true })}
                              title="Delete this link from Dropbox"
                              aria-label={`Delete "${l.name}"`}
                              className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                            >
                              ✕
                            </button>
                          </span>
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {clients.map((nick) => {
                          const a = l.assigned.find((x) => x.client === nick);
                          return (
                            <button
                              key={nick}
                              type="button"
                              aria-pressed={!!a}
                              onClick={() => act(l, { assign: nick })}
                              title={a ? `${nick}: cycle ${a.cycle}. Tap to take it off.` : `Queue for ${nick}'s next cycle with room`}
                              className={`eyebrow rounded-full px-2 py-0.5 ${
                                a ? "bg-red text-cream" : "border border-red hover:bg-cream-deep"
                              }`}
                            >
                              {nick}
                              {a && ` · C${a.cycle}`}
                            </button>
                          );
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-xs opacity-70">
          Save Instagram links to ideas/bronze, silver or gold in Dropbox from your phone (Share → Dropbox); new ones
          are named from their captions. Tap a client to queue the idea into their next cycle with room for that tier.
          Once every client&rsquo;s cycle has all its posts of that tier made, the idea deletes itself.
        </p>
      </div>
    </section>
  );
}
