import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isSignedIn } from "@/lib/dashboard/auth";
import { loadBudget } from "@/lib/dashboard/budget";
import { addDays, feedKey, loadCalendar, MAKE_DAYS, SCHEDULE_LEAD, type CalEvent } from "@/lib/dashboard/calendar";
import { loadClients, today } from "@/lib/dashboard/clients";
import DashboardNav from "../DashboardNav";
import ShootsLinkForm from "./ShootsLinkForm";

export const dynamic = "force-dynamic";

const KINDS: Record<CalEvent["kind"], { name: string; style: string }> = {
  shoot: { name: "Shoot", style: "bg-[#1c1714] text-cream" },
  make: { name: "Make posts", style: "border border-red bg-cream" },
  schedule: { name: "Schedule", style: "bg-red text-cream" },
  invoice: { name: "Send invoice", style: "border-2 border-red bg-cream-deep" },
  due: { name: "Check due", style: "border-2 border-dashed border-red" },
  pay: { name: "Pay yourself", style: "bg-[#c39b2a] text-[#1c1714]" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

/** A calendar of what to do when: make and schedule each cycle, send invoices, shoots, and paydays. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  if (!(await isSignedIn())) redirect("/dashboard");
  const now = today();
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : now.slice(0, 7);
  const first = `${month}-01`;
  const gridStart = addDays(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  const nextFirst = addDays(first, 32).slice(0, 7) + "-01";
  const last = addDays(nextFirst, -1);
  const gridEnd = addDays(last, 6 - new Date(`${last}T12:00:00Z`).getUTCDay());
  const prevMonth = addDays(first, -1).slice(0, 7);
  const nextMonth = nextFirst.slice(0, 7);

  const { clients } = await loadClients();
  const { budget } = await loadBudget(clients);
  const soonEnd = addDays(now, 20);
  const monthAgo = addDays(now, -31);
  const lo = gridStart < monthAgo ? gridStart : monthAgo;
  const hi = gridEnd > soonEnd ? gridEnd : soonEnd;
  const { events, missing, file, error } = await loadCalendar(clients, budget, lo, hi);

  // A window (making posts) shows once, on its first day, with its dates.
  const onDay = (d: string) => events.filter((e) => e.date === d);
  const range = (e: CalEvent) =>
    e.until && e.until !== e.date
      ? ` (${fmt(e.date, { month: "short", day: "numeric" })} – ${fmt(e.until, e.until.slice(5, 7) === e.date.slice(5, 7) ? { day: "numeric" } : { month: "short", day: "numeric" })})`
      : "";
  // Coming up: the next 3 weeks, plus anything from the last month still not done (an unsent invoice, an unscheduled cycle).
  const late = (e: CalEvent) => (e.until ?? e.date) < now && e.kind !== "make" && e.kind !== "shoot" && e.kind !== "pay";
  const soon = events.filter(
    (e) => !e.done && e.date <= soonEnd && ((e.until ?? e.date) >= now || (late(e) && e.date >= addDays(now, -31)))
  );
  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const host = (await headers()).get("host") ?? "studiolphotography.com";
  const feed = `webcal://${host}/dashboard/calendar/feed?key=${feedKey()}`;

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 sm:px-8 sm:py-14">
      <DashboardNav />

      <header className="mt-8 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl">Calendar</h1>
        <p className="mt-2 opacity-70">What to do, and when</p>
      </header>

      <section className="mt-10 border-2 border-red bg-cream">
        <div className="flex items-center justify-between gap-3 bg-red px-5 py-4 text-cream">
          <Link href={`/dashboard/calendar?m=${prevMonth}`} className="eyebrow link-draw" aria-label="Previous month">
            ← {fmt(`${prevMonth}-15`, { month: "short" })}
          </Link>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            {fmt(`${month}-15`, { month: "long", year: "numeric" })}
          </h2>
          <Link href={`/dashboard/calendar?m=${nextMonth}`} className="eyebrow link-draw" aria-label="Next month">
            {fmt(`${nextMonth}-15`, { month: "short" })} →
          </Link>
        </div>
        <div className="overflow-x-auto p-2 sm:p-4">
          <div className="grid min-w-[44rem] grid-cols-7 border-l border-t border-red-line">
            {WEEKDAYS.map((w) => (
              <div key={w} className="eyebrow border-b border-r border-red-line px-2 py-1 text-center">
                {w}
              </div>
            ))}
            {days.map((d) => (
              <div
                key={d}
                className={`min-h-28 border-b border-r border-red-line p-1.5 ${d.startsWith(month) ? "" : "opacity-40"} ${
                  d === now ? "bg-cream-deep" : ""
                }`}
              >
                <p className={`text-xs ${d === now ? "font-bold text-red" : "opacity-70"}`}>{Number(d.slice(8))}</p>
                <ul className="mt-1 space-y-1">
                  {onDay(d).map((e, i) => (
                    <li
                      key={i}
                      title={e.title}
                      className={`rounded px-1.5 py-0.5 text-[11px] leading-tight ${KINDS[e.kind].style} ${e.done ? "line-through opacity-50" : ""}`}
                    >
                      {e.title}
                      {range(e)}
                      {e.time && ` · ${e.time}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t-2 border-red p-5">
          {Object.values(KINDS).map((k) => (
            <span key={k.name} className={`eyebrow rounded-full px-2 py-0.5 ${k.style}`}>
              {k.name}
            </span>
          ))}
        </div>
      </section>

      {/* Shoots still to book: every client has 1 hour of photography a month, Gold clients a shoot every other week. */}
      <section className="mt-10 border-2 border-red bg-cream">
        <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Shoots to book</h2>
          <p className="text-lg">This month and next</p>
        </div>
        <div className="space-y-3 p-5">
          {!file.shoots_calendar ? (
            <ShootsLinkForm />
          ) : error ? (
            <>
              <p className="text-sm">{error}</p>
              <ShootsLinkForm current={file.shoots_calendar} />
            </>
          ) : missing.length === 0 ? (
            <p>Every client has their shoots booked for this month and next.</p>
          ) : (
            <ul className="space-y-1.5">
              {missing.map((x) => (
                <li key={`${x.client}-${x.month}`} className="flex flex-wrap justify-between gap-2">
                  <span>
                    <span className="font-bold">{x.client}</span> · {x.label}
                  </span>
                  <span className="text-sm">
                    {x.booked} of {x.needed} booked{x.needed > 1 ? " (Gold: every other week)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {file.shoots_calendar && (
            <p className="text-xs opacity-70">
              Book and move shoots in your Apple Calendar on your phone; they show here within a few minutes. Put the
              client&rsquo;s short name in the title (e.g. &ldquo;MCB shoot&rdquo;), and use Repeat for monthly or every-other-week shoots.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 border-2 border-red bg-cream">
        <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Coming up</h2>
          <p className="text-lg">Next 3 weeks</p>
        </div>
        <div className="p-5">
          {soon.length === 0 ? (
            <p className="opacity-70">Nothing due in the next 3 weeks.</p>
          ) : (
            <ul className="space-y-2">
              {soon.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-36 shrink-0 font-bold">
                    {fmt(e.date, { weekday: "short", month: "short", day: "numeric" })}
                    {e.until &&
                      e.until !== e.date &&
                      ` – ${fmt(e.until, e.until.slice(5, 7) === e.date.slice(5, 7) ? { day: "numeric" } : { month: "short", day: "numeric" })}`}
                  </span>
                  {late(e) && <span className="eyebrow rounded-full bg-[#1c1714] px-2 py-0.5 text-cream">Late</span>}
                  <span className={`eyebrow rounded-full px-2 py-0.5 ${KINDS[e.kind].style}`}>{KINDS[e.kind].name}</span>
                  <span>
                    {e.title}
                    {e.time && <span className="opacity-70"> · {e.time}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-6 border-2 border-red bg-cream p-5 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Put this on your phone</p>
          <a href={feed} className="btn btn-ghost">
            Add to Apple Calendar
          </a>
          <p className="mt-2 text-sm">
            Adds a &ldquo;Studio L to-dos&rdquo; calendar with everything here except shoots (those are already in your
            own calendar). It updates on its own. On your iPhone, open this page in Safari and tap the button, or go to
            Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar and paste the link.
          </p>
          <p className="mt-2 break-all text-xs opacity-70">{feed}</p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-2">How dates are set</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Schedule each cycle in Linkme {SCHEDULE_LEAD} days before it starts (the Friday before its Monday).</li>
            <li>
              Make its posts in the {MAKE_DAYS.usual} days before that, or the week before ({MAKE_DAYS.gold} days) when the
              cycle has a Gold reel.
            </li>
            <li>Send each invoice on the client&rsquo;s billing day; checks show on their due date once sent.</li>
            <li>Pay yourself every other Friday: a month&rsquo;s pay from the Budget card spread over 26 paydays a year.</li>
          </ul>
          {!file.pay_yourself_from && (
            <p className="mt-2">Paydays start once STUDIO L/calendar.json has a first payday (pay_yourself_from).</p>
          )}
        </div>
      </section>
    </main>
  );
}
