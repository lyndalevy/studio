"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A <details> dropdown that reopens (or stays shut) the way it was left, on this device. */
export default function SavedDetails({
  id,
  defaultOpen = false,
  className = "",
  children,
}: {
  /** Saved as "<id>-open" in this browser. */
  id: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const key = `${id}-open`;
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null && ref.current) ref.current.open = saved === "1";
    } catch {}
  }, [key]);
  const save = () => {
    try {
      if (ref.current) localStorage.setItem(key, ref.current.open ? "1" : "0");
    } catch {}
  };

  return (
    <details ref={ref} open={defaultOpen} onToggle={save} className={className}>
      {children}
    </details>
  );
}
