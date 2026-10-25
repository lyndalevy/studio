"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", name: "Overview" },
  { href: "/dashboard/calendar", name: "Calendar" },
];

export default function DashboardTabs() {
  const path = usePathname();
  return (
    <div className="mt-6 flex justify-center gap-2">
      {TABS.map((t) => {
        const on = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`eyebrow rounded-full border-2 border-red px-4 py-1.5 ${on ? "bg-red text-cream" : "hover:bg-cream-deep"}`}
          >
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}
