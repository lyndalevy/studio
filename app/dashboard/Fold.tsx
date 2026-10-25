"use client";

import { useEffect, useState, type ReactNode } from "react";

/** A dashboard card that folds up when its red header is tapped. Open or closed is remembered on this device. */
export default function Fold({
  id,
  head,
  extra,
  className = "",
  headClassName = "flex flex-wrap items-baseline justify-between gap-3",
  bodyClassName = "",
  children,
}: {
  /** Saved as "<id>-open" in this browser. */
  id: string;
  /** The header's contents; tapping it opens and closes the card. */
  head: ReactNode;
  /** Shown under the header (links and the like), outside the tap area. */
  extra?: ReactNode;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const key = `${id}-open`;
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read after hydration, so the server and first render match
      if (localStorage.getItem(key) === "0") setOpen(false);
    } catch {}
  }, [key]);
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(key, was ? "0" : "1");
      } catch {}
      return !was;
    });

  return (
    <section className={`border-2 border-red bg-cream ${className}`}>
      <div className="bg-red px-5 py-4 text-cream">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className={`flex w-full items-start justify-between gap-3 text-left`}
        >
          <span className={`min-w-0 flex-1 ${headClassName}`}>{head}</span>
          <span aria-hidden className="mt-2 inline-block text-lg transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            ▾
          </span>
        </button>
        {extra}
      </div>
      <div id={`${id}-body`} hidden={!open} className={bodyClassName}>
        {children}
      </div>
    </section>
  );
}
