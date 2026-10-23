import type { Metadata } from "next";
import Link from "next/link";

import type { TierKey } from "@/content/social";
import { isConfigured, isSignedIn } from "@/lib/dashboard/auth";
import { loadBudget, type Budget } from "@/lib/dashboard/budget";
import { loadIdeas, syncBusinessLinks } from "@/lib/dashboard/ideas";
import { loadLibrary, nameNewLinks, type SavedLink } from "@/lib/dashboard/library";
import { loadClients, today, type ClientStatus, type CyclePlan, type Invoice } from "@/lib/dashboard/clients";
import { logout } from "./actions";
import { Sparkle } from "../components/Marks";
import IdeasCard from "./IdeasCard";
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

const statusStyle: Record<Invoice["status"], string> = {
  paid: "bg-red text-cream",
  overdue: "bg-[#1c1714] text-cream",
  sent: "border-2 border-red",
  "not sent": "border-2 border-dashed border-red",
  upcoming: "border border-red-line opacity-70",
};

/** Finder shows ":" in a name as "/", so show it that way here too. */
const finder = (name: string) => name.replace(/:/g, "/");

/** Studio tools, linked at the top of the dashboard. */
const TOOLS = [
  { name: "Linkme agency", href: "https://link.me/agency/28249" },
  { name: "Linkme posts", href: "https://link.me/posts/all" },
  { name: "Stripe invoices", href: "https://dashboard.stripe.com/acct_1USifd7M7uqalbo6/invoices" },
  { name: "Dropbox API", href: "https://www.dropbox.com/developers/console/apps/nqh0vilp6wm6lys/settings" },
  { name: "Google AI billing", href: "https://aistudio.google.com/billing?billing=01F2EC-86587D-68AD0F" },
];

/** A post's week is over once the Sunday after its Monday has passed. */
const weekOver = (week: string | null) =>
  week !== null && Date.parse(`${week}T00:00:00Z`) + 6 * 86_400_000 < Date.parse(`${today()}T00:00:00Z`);

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
  // New links saved from the phone get names first; business links then become ideas.
  await nameNewLinks();
  const syncError = await syncBusinessLinks(today());
  const { ideas, error: loadError } = await loadIdeas();
  const ideasError = loadError ?? syncError;
  const { links, error: libraryError } = await loadLibrary(clients);

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 sm:px-8 sm:py-14">
      <nav className="eyebrow flex items-center justify-between">
        <Link href="/" className="link-draw">
          Studio L
        </Link>
        <span className="flex items-center gap-5">
          <Link href="/social" className="link-draw">
            Social
          </Link>
          <form action={logout}>
            <button type="submit" className="eyebrow link-draw">
              Sign out
            </button>
          </form>
        </span>
      </nav>

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

      <IdeasCard ideas={ideas} />
      {ideasError && <p className="mx-auto mt-4 max-w-xl border-2 border-red p-5 text-center">{ideasError}</p>}
      <LibraryCard links={links} clients={clients.map((c) => c.nickname)} />
      {libraryError && <p className="mx-auto mt-4 max-w-xl border-2 border-red p-5 text-center">{libraryError}</p>}

      {budget && <BudgetCard b={budget} />}
      {budgetError && <p className="mx-auto mt-10 max-w-xl border-2 border-red p-5 text-center">{budgetError}</p>}
    </main>
  );
}

function ClientCard({ c, links }: { c: ClientStatus; links: SavedLink[] }) {
  // Post ideas queued for this client, soonest cycle first.
  const queued = links
    .flatMap((l) => l.assigned.filter((a) => a.client === c.nickname).map((a) => ({ ...a, link: l })))
    .sort((a, b) => a.cycle - b.cycle || a.at.localeCompare(b.at));
  const scheduled = c.sets.flatMap((s) => s.items).filter((i) => i.scheduled).length;
  const made = c.sets.flatMap((s) => s.items).length;
  // Deliverables only shows posts whose week hasn't ended yet.
  const showing = c.sets
    .map((s) => ({ ...s, items: s.items.filter((it) => !weekOver(it.week)) }))
    .filter((s) => s.items.length);

  return (
    <section className="flex flex-col border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{c.info.client}</h2>
        <p className="text-lg">
          {c.info.package ?? "No package"}
          {c.monthly !== null && <span className="font-bold"> · ${c.monthly}/mo</span>}
        </p>
        {c.info.socials && Object.keys(c.info.socials).length > 0 && (
          <p className="flex w-full flex-wrap gap-x-4 gap-y-1 text-sm">
            {Object.entries(c.info.socials).map(([name, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="link-draw">
                {name} ↗
              </a>
            ))}
          </p>
        )}
      </div>

      <div className="space-y-6 p-5">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Cycle plan={c.thisCycle} title="This cycle" />
          <Cycle plan={c.nextCycle} title="Next cycle" todo />
        </div>

        {queued.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Post ideas queued</p>
            <ul className="space-y-1 text-sm">
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
          </div>
        )}

        <div>
          <p className="eyebrow mb-2">Deliverables</p>
          {c.sets.length === 0 && <p className="text-sm opacity-70">No sets yet.</p>}
          {c.sets.length > 0 && showing.length === 0 && (
            <p className="text-sm opacity-70">Every post&rsquo;s week is over. Add the next cycle.</p>
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
            <span>filled = scheduled · click a post to mark it · past weeks are hidden</span>
          </p>
        </div>

        <div>
          <p className="eyebrow mb-2">Payments</p>
          {c.invoices.length === 0 ? (
            <p className="text-sm opacity-70">The schedule starts once the first invoice is sent.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.invoices.map((inv) => (
                <li key={inv.month} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-bold">{inv.label}</span>
                    {inv.number &&
                      (inv.url ? (
                        <a href={inv.url} target="_blank" rel="noopener noreferrer" className="link-draw ml-1.5">
                          {inv.number}
                        </a>
                      ) : (
                        <span className="ml-1.5">{inv.number}</span>
                      ))}
                    <span className="opacity-70">
                      {" "}
                      · {inv.status === "upcoming" || inv.status === "not sent" ? "sends" : "sent"} {fmtDay(inv.sent)}, due {fmtDay(inv.due)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold">${inv.amount}</span>
                    <InvoiceStatus inv={inv} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs opacity-70">
            {c.minimumEnds && `3-month minimum runs through ${c.minimumEnds}. `}
            {c.info.stripe_customer && (
              <a
                href={`https://dashboard.stripe.com/customers/${c.info.stripe_customer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-draw"
              >
                Open in Stripe
              </a>
            )}
          </p>
        </div>

        {c.info.notes && <p className="border-t border-red-line pt-4 text-sm italic">{c.info.notes}</p>}
      </div>
    </section>
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
    <section className="mt-10 border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Budget</h2>
        <p className="text-lg">
          Pay yourself <span className="font-bold">{money(b.pay)}/mo</span>
        </p>
      </div>

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
            {b.file.costs.map((c) => row(c.name, c.monthly, c.note))}
            {row(
              "Stripe fees",
              b.stripeFees,
              `${b.file.stripe.percent}% + ${money(b.file.stripe.fixed)} per payment`
            )}
            {row("Total", b.costs + b.stripeFees, undefined, true)}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-2">What&rsquo;s left</p>
          <ul className="space-y-1.5">
            {row("Profit", b.profit)}
            {row(`Set aside for taxes`, b.taxes, `${b.file.tax_percent}% of profit`)}
            {row("Pay yourself", b.pay, undefined, true)}
          </ul>
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
            ["Going out", (b.costs + b.stripeFees) * 12],
            ["Salary before taxes", b.profit * 12],
            ["Estimated taxes", b.taxes * 12],
            ["Salary after taxes", b.pay * 12],
          ].map(([label, amount]) => (
            <div key={label}>
              <dt className="text-sm opacity-80">{label}</dt>
              <dd className="text-xl font-bold">{money(amount as number)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** The invoice's status pill. In the week before it's due to go out, it counts down as a reminder. */
function InvoiceStatus({ inv }: { inv: Invoice }) {
  const days = Math.round((Date.parse(`${inv.sent}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);
  if (inv.status === "upcoming" && days >= 0 && days <= 7) {
    return (
      <span className="eyebrow rounded-full border-2 border-red bg-cream-deep px-2.5 py-0.5">
        {days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}
      </span>
    );
  }
  return <span className={`eyebrow rounded-full px-2.5 py-0.5 ${statusStyle[inv.status]}`}>{inv.status}</span>;
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
  const left = TIERS.filter((t) => plan.needed[t] > plan.made[t]);
  return (
    <div className="border border-red-line p-4">
      <p className="eyebrow">{title}</p>
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
      {todo && (
        <p className="mt-3 text-sm font-bold">
          {!TIERS.some((t) => plan.needed[t])
            ? "Set a package to see what's needed"
            : left.length
            ? `To make: ${left.map((t) => `${plan.needed[t] - plan.made[t]} ${tierName[t]}`).join(", ")}`
            : "All made ✓"}
        </p>
      )}
      {!todo && <p className="mt-3 text-sm opacity-70">{plan.scheduled} scheduled</p>}
    </div>
  );
}
