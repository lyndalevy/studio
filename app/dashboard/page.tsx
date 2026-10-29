import type { Metadata } from "next";

import type { TierKey } from "@/content/social";
import { isConfigured, isSignedIn } from "@/lib/dashboard/auth";
import { loadBudget, type Budget } from "@/lib/dashboard/budget";
import { loadIdeas, syncBusinessLinks } from "@/lib/dashboard/ideas";
import { loadLibrary, type SavedLink } from "@/lib/dashboard/library";
import { addDays } from "@/lib/dashboard/calendar";
import { loadClients, today, type ClientStatus, type CyclePlan } from "@/lib/dashboard/clients";
import { Sparkle } from "../components/Marks";
import DashboardNav from "./DashboardNav";
import Fold from "./Fold";
import IdeasCard from "./IdeasCard";
import InvoiceButton from "./InvoiceButton";
import OneTimeCard from "./OneTimeCard";
import LibraryCard from "./LibraryCard";
import LoginForm from "./LoginForm";
import PostPill from "./PostPill";

export const metadata: Metadata = {
  title: "Dashboard — Studio L",
  robots: { index: false, follow: false },
};

// Read Dropbox fresh on every visit.
export const dynamic = "force-dynamic";

const TIERS: TierKey[] = ["bronze", "silver", "gold"];
const tierColor: Record<TierKey, string> = { bronze: "#b0744a", silver: "#8e959c", gold: "#c39b2a" };
const tierName: Record<TierKey, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };


/** Finder shows ":" in a name as "/", so show it that way here too. */
const finder = (name: string) => name.replace(/:/g, "/");

/** Pay before and after taxes by number of clients, and NYC salaries (a private Claude artifact). */
const PAY_CHART = "https://claude.ai/artifact/U5BsP5nDczF5iwgwFqgcia";

/** Studio tools, linked at the top of the dashboard. */
const TOOLS = [
  { name: "Gmail", href: "https://mail.google.com/mail/?authuser=lynda.studiolphotos@gmail.com" },
  { name: "Meta Business Suite", href: "https://business.facebook.com/latest/home?asset_id=175611065827025&business_id=29512333488363663" },
  { name: "Linkme agency", href: "https://link.me/agency/28249" },
  { name: "Dropbox API", href: "https://www.dropbox.com/developers/console/apps/nqh0vilp6wm6lys/settings" },
  { name: "Google AI billing", href: "https://aistudio.google.com/billing?billing=01F2EC-86587D-68AD0F" },
  { name: "Atlas Cloud billing", href: "https://www.atlascloud.ai/console/billing" },
  { name: "OpenAI billing", href: "https://platform.openai.com/settings/organization/billing/overview" },
  { name: "Link account", href: "https://app.link.com/activity/lbctxn_1UVB8MAOB3oAEyJYi7JPBjJp" },
];

/** Monday of the week the dashboard shows first. Weeks run Sunday to Saturday, so a Sunday belongs to the Monday after it. */
function shownMonday() {
  const d = today();
  const dow = new Date(`${d}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(d, dow === 0 ? 1 : 1 - dow);
}

/** One week of a client's posts: what its package needs that week, and what's made and scheduled for it. */
type WeekPlan = { monday: string; label: string; cycle: number | null; needed: Record<TierKey, number>; made: Record<TierKey, number>; scheduled: number };

function weekPlan(c: ClientStatus, monday: string): WeekPlan {
  const items = c.sets.flatMap((s) => s.items).filter((it) => it.week === monday);
  const made = { bronze: 0, silver: 0, gold: 0 };
  for (const it of items) made[it.tier]++;
  const cycle = c.cycles.find((p) => p.start <= monday && monday < addDays(p.start, 14));
  return {
    monday,
    label: `${fmtDay(addDays(monday, -1))} – ${fmtDay(addDays(monday, 5))}`, // Sunday to Saturday
    cycle: cycle?.number ?? null,
    needed: c.perWeek,
    made,
    scheduled: items.filter((it) => it.scheduled).length,
  };
}

const fmtDay = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function Dashboard() {
  if (!(await isSignedIn())) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl">Dashboard</h1>
        {isConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 max-w-sm text-lg">The dashboard doesn&rsquo;t have a password yet, so it&rsquo;s locked.</p>
        )}
      </main>
    );
  }

  const { clients, error } = await loadClients();
  const { budget, error: budgetError } = await loadBudget(clients);
  // Business links become ideas (links keep the names the phone saved them with).
  const syncError = await syncBusinessLinks(today());
  const { ideas, error: loadError } = await loadIdeas();
  const ideasError = loadError ?? syncError;
  const { links, error: libraryError } = await loadLibrary(clients);

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 sm:px-8 sm:py-14">
      <DashboardNav />

      <header className="mt-8 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl">Dashboard</h1>
        <p className="mt-2 opacity-70">
          {new Date(`${today()}T12:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </header>

      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow inline-block rounded-full border-2 border-red px-3 py-1 hover:bg-red hover:text-cream"
            >
              {t.name} ↗
            </a>
          </li>
        ))}
      </ul>

      {error && <p className="mx-auto mt-10 max-w-xl border-2 border-red p-5 text-center">{error}</p>}
      {!error && !clients.length && (
        <p className="mt-10 text-center">No clients yet. Add a client.json to a client&rsquo;s folder in Dropbox.</p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {clients.map((c) => (
          <ClientCard key={c.folder} c={c} links={links} />
        ))}
      </div>

      <LibraryCard
        links={links}
        clients={clients
          .filter((c) => !c.info.paused)
          .map((c) => ({ nickname: c.nickname, tiers: TIERS.filter((t) => c.perWeek[t] > 0) }))}
      />
      {libraryError && <p className="mx-auto mt-4 max-w-xl border-2 border-red p-5 text-center">{libraryError}</p>}
      <IdeasCard ideas={ideas} />
      {ideasError && <p className="mx-auto mt-4 max-w-xl border-2 border-red p-5 text-center">{ideasError}</p>}

      {budget && <BudgetCard b={budget} />}
      {budgetError && <p className="mx-auto mt-10 max-w-xl border-2 border-red p-5 text-center">{budgetError}</p>}
    </main>
  );
}

function ClientCard({ c, links }: { c: ClientStatus; links: SavedLink[] }) {
  // Post ideas queued for this client, soonest cycle first.
  const queued = links
    .flatMap((l) => l.assigned.filter((a) => a.client === c.nickname && !a.done).map((a) => ({ ...a, link: l })))
    .sort((a, b) => a.cycle - b.cycle || a.at.localeCompare(b.at));
  // Paid invoices drop off the list.
  const unpaid = c.invoices.filter((i) => i.status !== "paid");
  const scheduled = c.sets.flatMap((s) => s.items).filter((i) => i.scheduled).length;
  const made = c.sets.flatMap((s) => s.items).length;
  // The cards move on every Sunday: this cycle and the next. Deliverables lists every post still to go up: a
  // post drops off once its day has passed (the page reads the date fresh on every visit).
  const thisWeek = weekPlan(c, shownMonday());
  // The cycle the shown week belongs to (from its last Sunday on, the coming one).
  const thisCycle = c.cycles.find((p) => p.start <= thisWeek.monday && thisWeek.monday < addDays(p.start, 14)) ?? null;
  const nextCycle = thisCycle ? (c.cycles.find((p) => p.number === thisCycle.number + 1) ?? null) : null;
  const showing = c.sets
    .map((s) => ({ ...s, items: s.items.filter((it) => (it.day ? it.day >= today() : it.week === null || it.week >= thisWeek.monday)) }))
    .filter((s) => s.items.length);

  return (
    <Fold
      id={`client-${c.nickname.toLowerCase()}`}
      className="self-start"
      headClassName="flex flex-col gap-1"
      bodyClassName="space-y-6 p-5"
      head={
        <>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{c.info.client}</h2>
          <span className="text-lg">
            {c.info.package ?? "No package"}
            {c.monthly !== null && <span className="font-bold"> · ${c.monthly}/mo</span>}
            {c.info.paused && (
              <span className="eyebrow ml-3 rounded-full border-2 border-cream px-2 py-0.5 align-middle">Paused</span>
            )}
          </span>
        </>
      }
      extra={
        c.info.socials &&
        Object.keys(c.info.socials).length > 0 && (
          <p className="mt-1 flex w-full flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(c.info.socials).map(([name, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="link-draw">
                {name} ↗
              </a>
            ))}
          </p>
        )
      }
    >
        {c.problems.length > 0 && (
          <ul className="space-y-1 border-l-4 border-red pl-3 text-sm">
            {c.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <p className="text-sm opacity-80">
          {TIERS.filter((t) => c.perWeek[t]).map((t) => `${c.perWeek[t]} ${tierName[t]}`).join(" + ") || "No posts"} a week
          {c.info.add_ons?.length ? ` · add-ons: ${c.info.add_ons.join(", ")}` : ""}
          {` · ${made} made, ${scheduled} scheduled`}
        </p>

        {c.info.paused ? (
          <p className="border border-red-line p-4 text-sm">
            On pause: no cycles, invoices, or calendar dates, and they&rsquo;re left out of the budget. Remove
            &ldquo;paused&rdquo; from their client.json (or ask Claude) to start again.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Cycle plan={thisCycle} title="This cycle" />
            <Cycle plan={nextCycle} title="Next cycle" todo />
          </div>
        )}

        {queued.length > 0 && (
          <details className="group">
            <summary className="eyebrow flex cursor-pointer list-none items-center gap-2">
              Post ideas queued · {queued.length}
              <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {queued.map((q) => (
                <li key={q.link.path} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-bold">Cycle {q.cycle}</span>
                  <Sparkle className="h-3 w-3 shrink-0" style={{ color: tierColor[q.link.shelf as TierKey] }} />
                  <a href={q.link.url} target="_blank" rel="noopener noreferrer" className="link-draw">
                    {q.link.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        <details open className="group">
          <summary className="eyebrow flex cursor-pointer list-none items-center gap-2">
            Deliverables
            <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2" />
          {c.sets.length === 0 && <p className="text-sm opacity-70">No sets yet.</p>}
          {c.sets.length > 0 && showing.length === 0 && (
            <p className="text-sm opacity-70">No posts from this week on yet. Add the next cycle.</p>
          )}
          <div className="space-y-3">
            {showing.map((s) => (
              <div key={s.name}>
                <p className="text-sm font-bold">
                  {finder(s.name)}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {s.items.map((it) => (
                    <PostPill
                      key={it.name}
                      folder={c.folder}
                      set={s.name}
                      name={it.name}
                      label={finder(it.name.replace(/\.[^.]+$/, ""))}
                      title={`${tierName[it.tier]} ${it.kind}${it.scheduled ? ", scheduled" : ", made"}`}
                      color={tierColor[it.tier]}
                      scheduled={it.scheduled}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {c.loose.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-bold">Not in a set yet:</span> {c.loose.map((n) => n.replace(/\.[^.]+$/, "")).join(", ")}
            </p>
          )}
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
            {TIERS.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Sparkle className="h-3 w-3" style={{ color: tierColor[t] }} />
                {tierName[t]}
              </span>
            ))}
            <span>filled = scheduled · click a post to mark it · posts drop off the day after they go up</span>
          </p>
        </details>

        <details open className="group">
          <summary className="eyebrow flex cursor-pointer list-none items-center gap-2">
            Payments
            <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2" />
          {c.invoices.length === 0 ? (
            <p className="text-sm opacity-70">The schedule starts once the first invoice is sent.</p>
          ) : unpaid.length === 0 ? (
            <p className="text-sm opacity-70">Everything&rsquo;s paid.</p>
          ) : (
            <ul className="space-y-1.5">
              {unpaid.map((inv) => (
                <li key={inv.month} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-bold">{inv.label}</span>
                    <span className="opacity-70">
                      {" "}
                      · {inv.status === "upcoming" ? "send" : "sent"} {fmtDay(inv.sent)}, due {fmtDay(inv.due)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold">${inv.amount}</span>
                    <InvoiceButton folder={c.folder} inv={inv} today={today()} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs opacity-70">
            {c.minimumEnds && `3-month minimum runs through ${c.minimumEnds}.`}
          </p>
        </details>

    </Fold>
  );
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

/** A month of money in and out, and what's left to pay yourself. Numbers come from STUDIO L/budget.json in Dropbox. */
function BudgetCard({ b }: { b: Budget }) {
  const row = (label: string, amount: number, note?: string, strong = false) => (
    <li key={label} className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
      <span>
        {label}
        {note && <span className="ml-2 text-sm italic opacity-70">{note}</span>}
      </span>
      <span className="shrink-0">{money(amount)}</span>
    </li>
  );

  return (
    <Fold
      id="budget"
      className="mt-10"
      head={
        <>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Budget</h2>
          <span className="text-lg">
            Pay yourself <span className="font-bold">{money(b.payday)}</span> every other week
          </span>
        </>
      }
    >
      <div className="grid gap-6 p-5 md:grid-cols-3">
        <div>
          <p className="eyebrow mb-2">Coming in each month</p>
          <ul className="space-y-1.5">
            {b.income.map((i) => row(i.client, i.amount))}
            {row("Total", b.revenue, undefined, true)}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-2">Going out each month</p>
          <ul className="space-y-1.5">
            {b.bills.map((c) => row(c.name, c.amount, c.note))}
            {b.file.stripe &&
              row("Stripe fees", b.stripeFees, `${b.file.stripe.percent}% + ${money(b.file.stripe.fixed)} per payment`)}
            {b.oneTime.map((o) => row(o.name, o.amount, "one time"))}
            {row("Total", b.costs + b.stripeFees, undefined, true)}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-2">What&rsquo;s left</p>
          <ul className="space-y-1.5">
            {row("Profit", b.profit)}
            {row(`Set aside for taxes`, b.taxes, `${b.file.tax_percent}% of profit`)}
            {row("Pay yourself every other week", b.payday, "from the pay chart", true)}
          </ul>
          {b.chartStale && (
            <p className="mt-2 text-sm font-bold">The pay chart doesn&rsquo;t match this budget yet. Ask Claude to update it.</p>
          )}
          <p className="mt-4 text-sm">
            Bank: <span className="font-bold">{money(b.file.bank_balance)}</span>, keeping at least{" "}
            {money(b.file.keep_in_bank)}.{" "}
            {b.spare >= 0
              ? `${money(b.spare)} above that now.`
              : `${money(-b.spare)} short of that now, so top it up before paying yourself.`}
          </p>
          <p className="mt-2 text-xs opacity-70">
            Pay yourself after the month&rsquo;s invoices are paid, so the bills never dip the account below the minimum.
          </p>
        </div>
      </div>

      <div className="border-t-2 border-red p-5">
        <p className="eyebrow mb-3 text-center">Each year</p>
        <dl className="grid grid-cols-2 gap-4 text-center sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Coming in", b.revenue * 12],
            ["Going out", b.year.out],
            ["Salary before taxes", b.year.profit],
            ["Estimated taxes", b.year.taxes],
            ["Salary after taxes", b.year.pay],
          ].map(([label, amount]) => (
            <div key={label}>
              <dt className="text-sm opacity-80">{label}</dt>
              <dd className="text-xl font-bold">{money(amount as number)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-center text-sm">
          One-time payments count in this year&rsquo;s totals.{" "}
          <a href={PAY_CHART} target="_blank" rel="noopener noreferrer" className="link-draw">
            Pay chart: pay by number of clients ↗
          </a>
        </p>
      </div>

      <OneTimeCard list={b.oneTimeYear} month={today().slice(0, 7)} />
    </Fold>
  );
}

/** How far through its two weeks a cycle is today, 0 to 100. */
function cycleProgress(plan: CyclePlan) {
  // A cycle runs from the Sunday before its Monday.
  const days = (Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${plan.start}T00:00:00Z`)) / 86_400_000 + 1;
  return Math.round(Math.min(14, Math.max(0, days)) / 14 * 100);
}

function Cycle({ plan, title, todo = false }: { plan: CyclePlan | null; title: string; todo?: boolean }) {
  if (!plan) {
    return (
      <div className="border border-red-line p-4">
        <p className="eyebrow">{title}</p>
        <p className="mt-2 text-sm opacity-70">Add a dated CYCLE folder to start the cycles.</p>
      </div>
    );
  }
  const through = cycleProgress(plan);
  const left = TIERS.filter((t) => plan.needed[t] > plan.made[t]);
  return (
    <div className="relative border border-red-line p-4 pb-5" aria-label={title}>
      <p className="font-bold">
        Cycle {plan.number} <span className="font-normal opacity-70">· {plan.label}</span>
      </p>
      <ul className="mt-3 space-y-2">
        {TIERS.filter((t) => plan.needed[t] || plan.made[t]).map((t) => {
          const pct = plan.needed[t] ? Math.min(100, (plan.made[t] / plan.needed[t]) * 100) : 100;
          return (
            <li key={t} className="text-sm">
              <div className="flex justify-between">
                <span>{tierName[t]}</span>
                <span>
                  {plan.made[t]} / {plan.needed[t]}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-red-line">
                <div className="h-full" style={{ width: `${pct}%`, background: tierColor[t] }} />
              </div>
            </li>
          );
        })}
      </ul>
      {todo ? (
        <p className="mt-3 text-sm font-bold">
          {!TIERS.some((t) => plan.needed[t])
            ? "Set a package to see what's needed"
            : left.length
            ? `To make: ${left.map((t) => `${plan.needed[t] - plan.made[t]} ${tierName[t]}`).join(", ")}`
            : "All made ✓"}
        </p>
      ) : (
        <p className="mt-3 text-sm opacity-70">{plan.scheduled} scheduled</p>
      )}
      {/* This cycle's bottom edge fills in as the cycle goes by. */}
      {!todo && <div
        className="absolute -inset-x-px -bottom-px h-1.5 bg-cream"
        role="progressbar"
        aria-valuenow={through}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="How far through the cycle"
      >
        <div className="h-full bg-red" style={{ width: `${through}%` }} />
      </div>}
    </div>
  );
}

