"use client";

import { useOptimistic, useState, useTransition } from "react";

import { toggleScheduled } from "./actions";

/** One post on the dashboard. Click to mark it scheduled; click again to clear it. */
export default function PostPill({
  folder,
  set,
  name,
  label,
  title,
  color,
  scheduled,
}: {
  folder: string;
  set: string;
  name: string;
  label: string;
  title: string;
  color: string;
  scheduled: boolean;
}) {
  const [on, setOn] = useOptimistic(scheduled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        disabled={pending}
        title={`${title}. Click to ${on ? "clear" : "mark scheduled"}.`}
        onClick={() =>
          start(async () => {
            setOn(!on);
            setError(await toggleScheduled(folder, set, name, !on));
          })
        }
        className={`flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
          on ? "bg-red text-cream" : "border border-red hover:bg-cream-deep"
        } ${pending ? "opacity-60" : ""}`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        {label}
        {on && " ✓"}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs">{error}</p>}
    </li>
  );
}
