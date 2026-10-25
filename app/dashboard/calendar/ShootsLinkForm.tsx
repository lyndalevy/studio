"use client";

import { useActionState } from "react";

import { saveShootsLink } from "../actions";

/** Connect the Apple (iCloud) calendar that holds the shoots by pasting its public link. */
export default function ShootsLinkForm({ current }: { current?: string }) {
  const [error, save, saving] = useActionState(saveShootsLink, null);
  return (
    <div className="space-y-2">
      {!current && (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>On your iPhone, open Calendar, tap Calendars, then Add Calendar, and call it &ldquo;Studio L Shoots&rdquo;.</li>
          <li>Tap the ⓘ next to it, turn on Public Calendar, then Share Link → Copy.</li>
          <li>Paste the link here. Add each shoot to that calendar with the client&rsquo;s short name in the title, e.g. &ldquo;MCB shoot&rdquo;.</li>
        </ol>
      )}
      <form action={save} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="link"
          required
          defaultValue={current}
          placeholder="webcal://p…-caldav.icloud.com/published/2/…"
          className="min-w-0 flex-1 border-2 border-red bg-cream px-3 py-2 outline-none"
        />
        <button type="submit" disabled={saving} className="btn btn-ghost justify-center disabled:opacity-50">
          {saving ? "Saving…" : "Save link"}
        </button>
      </form>
      {error && <p className="text-sm">{error}</p>}
    </div>
  );
}
