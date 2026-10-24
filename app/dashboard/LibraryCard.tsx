"use client";

import { useOptimistic, useState, useTransition } from "react";

import type { TierKey } from "@/content/social";
import type { SavedLink, Shelf } from "@/lib/dashboard/library";
import { isPhoto, photoRef } from "@/lib/dashboard/photo";
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
export default function LibraryCard({
  links: saved,
  clients,
}: {
  links: SavedLink[];
  /** Each client's nickname and the tiers its package includes (a client only shows in those columns). */
  clients: { nickname: string; tiers: TierKey[] }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();
  // Show a tap right away; the server fills in the cycle (shown as "…" until then).
  const [links, show] = useOptimistic(saved, (now: SavedLink[], step: { path: string; action: Parameters<typeof changeLink>[2] }) =>
    now.flatMap((l) => {
      if (l.path !== step.path) return [l];
      const a = step.action;
      if ("delete" in a) return [];
      if ("rename" in a) return [{ ...l, name: a.rename }];
      // blank → queued → grayed out → blank
      if (l.assigned.some((x) => x.client === a.assign))
        return [{ ...l, assigned: l.assigned.filter((x) => x.client !== a.assign), declined: [...l.declined, a.assign] }];
      if (l.declined.includes(a.assign)) return [{ ...l, declined: l.declined.filter((n) => n !== a.assign) }];
      return [{ ...l, assigned: [...l.assigned, { client: a.assign, cycle: 0, at: new Date().toISOString() }] }];
    })
  );
  const act = (l: SavedLink, action: Parameters<typeof changeLink>[2]) => {
    setEditing(null);
    start(async () => {
      show({ path: l.path, action });
      setError(await changeLink(l.path, l.url, action));
    });
  };

  return (
    <section className="mt-10 border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Post ideas</h2>
        <p className="text-lg">For any client, by tier</p>
      </div>
      <div className="space-y-4 p-5">
        {error && <p className="text-sm">{error}</p>}
        <div className="grid gap-4 md:grid-cols-3">
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
                          {isPhoto(l.url) ? (
                            <a
                              href={`/dashboard/idea-image?size=large&ref=${encodeURIComponent(photoRef(l.url))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- a signed-in preview, not a site image */}
                              <img
                                src={`/dashboard/idea-image?ref=${encodeURIComponent(photoRef(l.url))}`}
                                alt=""
                                loading="lazy"
                                className="h-16 w-16 shrink-0 border border-red-line object-cover"
                              />
                              <span className="link-draw">
                                {l.name}
                                {l.needsName && <span className="ml-1 text-xs italic opacity-70">(name me ✎)</span>}
                              </span>
                            </a>
                          ) : (
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-draw">
                              {l.name} ↗
                            </a>
                          )}
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
                        {clients
                          .filter((c) => c.tiers.includes(shelf as TierKey))
                          .map(({ nickname: nick }) => {
                          const a = l.assigned.find((x) => x.client === nick);
                          const no = l.declined.includes(nick);
                          return (
                            <button
                              key={nick}
                              type="button"
                              aria-pressed={!!a}
                              onClick={() => act(l, { assign: nick })}
                              title={
                                a
                                  ? `${nick}: cycle ${a.cycle}${a.done ? ", made" : ""}. Tap to mark it not for ${nick}.`
                                  : no
                                    ? `Not for ${nick}. Tap to clear.`
                                    : `Queue for ${nick}'s next cycle with room`
                              }
                              className={`eyebrow rounded-full px-2 py-0.5 ${
                                a
                                  ? "bg-red text-cream"
                                  : no
                                    ? "border border-[#c9bfb8] bg-[#e6ddd6] text-[#9b8f87] line-through"
                                    : "border border-red hover:bg-cream-deep"
                              }`}
                            >
                              {nick}
                              {a && (a.cycle ? ` · C${a.cycle}` : " · …")}
                              {a?.done && " ✓"}
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
          Save Instagram links or photos to ideas/bronze, silver or gold in Dropbox from your phone (Share → Dropbox);
          new links are named from their captions, and photos still called IMG_… need a name (✎). Tap a client once to queue the idea into their next cycle with room (✓ once
          that cycle&rsquo;s posts are made), twice to gray it out as not for them, and again to clear it.
        </p>
      </div>
    </section>
  );
}
