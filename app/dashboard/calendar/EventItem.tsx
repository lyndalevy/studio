"use client";

import { useOptimistic, useState, useTransition } from "react";

import { toggleEventDone } from "../actions";

/** One item on the calendar. Click to mark it done; click again to undo. */
export default function EventItem({
  id,
  done,
  style,
  title,
  time,
  note,
}: {
  id: string;
  done: boolean;
  style: string;
  title: string;
  time?: string;
  note?: string;
}) {
  const [on, setOn] = useOptimistic(done);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        disabled={pending}
        title={`${title}. Click to ${on ? "undo" : "mark done"}.`}
        onClick={() =>
          start(async () => {
            setOn(!on);
            setError(await toggleEventDone(id, !on));
          })
        }
        className={`w-full cursor-pointer rounded px-1.5 py-0.5 text-left text-[11px] leading-tight ${style} ${
          on ? "line-through opacity-50" : ""
        } ${pending ? "opacity-60" : ""}`}
      >
        {on && "✓ "}
        {title}
        {time && ` · ${time}`}
        {note && <span className="block italic opacity-80">{note}</span>}
      </button>
      {error && <p className="mt-1 text-[11px]">{error}</p>}
    </li>
  );
}
