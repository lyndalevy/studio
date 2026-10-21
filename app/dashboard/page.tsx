import type { Metadata } from "next";
import Link from "next/link";

import type { TierKey } from "@/content/social";
import { isConfigured, isSignedIn } from "@/lib/dashboard/auth";
import { loadClients, today, type ClientStatus, type Invoice, type MonthPlan } from "@/lib/dashboard/clients";
import { logout } from "./actions";
import LoginForm from "./LoginForm";

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
  due: "border-2 border-red",
  upcoming: "border border-red-line opacity-70",
};

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

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-10 sm:px-8 sm:py-14">
      <nav className="eyebrow flex items-center justify-between">
        <Link href="/" className="link-draw">
          Studio L
        </Link>
        <form action={logout}>
          <button type="submit" className="eyebrow link-draw">
            Sign out
          </button>
        </form>
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

      {error && <p className="mx-auto mt-10 max-w-xl border-2 border-red p-5 text-center">{error}</p>}
      {!error && !clients.length && (
        <p className="mt-10 text-center">No clients yet. Add a client.json to a client&rsquo;s folder in Dropbox.</p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {clients.map((c) => (
          <ClientCard key={c.folder} c={c} />
        ))}
      </div>
    </main>
  );
}

function ClientCard({ c }: { c: ClientStatus }) {
  const posted = c.sets.flatMap((s) => s.items).filter((i) => i.posted).length;
  const made = c.sets.flatMap((s) => s.items).length;

  return (
    <section className="flex flex-col border-2 border-red bg-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-red px-5 py-4 text-cream">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{c.info.client}</h2>
        <p className="text-lg">
          {c.info.package ?? "No package"}
          {c.monthly !== null && <span className="font-bold"> · ${c.monthly}/mo</span>}
        </p>
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
          {` · ${made} made, ${posted} posted`}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Month plan={c.thisMonth} title="This month" />
          <Month plan={c.nextMonth} title="Next month" todo />
        </div>

        <div>
          <p className="eyebrow mb-2">Deliverables</p>
          {c.sets.length === 0 && <p className="text-sm opacity-70">No sets yet.</p>}
          <div className="space-y-3">
            {c.sets.map((s) => (
              <div key={s.name}>
                <p className="text-sm font-bold">
                  {s.name}
                  {s.date && <span className="font-normal opacity-70"> · {fmtDay(s.date)}</span>}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {s.items.map((it) => (
                    <li
                      key={it.name}
                      title={`${tierName[it.tier]} ${it.kind}${it.posted ? ", posted" : ", made, not posted"}`}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                        it.posted ? "bg-red text-cream" : "border border-red"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tierColor[it.tier] }} />
                      {it.name.replace(/\.[^.]+$/, "")}
                      {it.posted && " ✓"}
                    </li>
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
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: tierColor[t] }} />
                {tierName[t]}
              </span>
            ))}
            <span>filled = posted</span>
          </p>
        </div>

        <div>
          <p className="eyebrow mb-2">Payments</p>
          {c.invoices.length === 0 ? (
            <p className="text-sm opacity-70">Set a package and start month to see the schedule.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.invoices.map((inv) => (
                <li key={inv.month} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-bold">{inv.label}</span>
                    <span className="opacity-70">
                      {" "}
                      · sent {fmtDay(inv.sent)}, due {fmtDay(inv.due)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold">${inv.amount}</span>
                    <span className={`eyebrow rounded-full px-2.5 py-0.5 ${statusStyle[inv.status]}`}>{inv.status}</span>
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

function Month({ plan, title, todo = false }: { plan: MonthPlan; title: string; todo?: boolean }) {
  const left = TIERS.filter((t) => plan.needed[t] > plan.made[t]);
  return (
    <div className="border border-red-line p-4">
      <p className="eyebrow">{title}</p>
      <p className="font-bold">
        {plan.label} <span className="font-normal opacity-70">· {plan.weeks} weeks</span>
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
      {!todo && <p className="mt-3 text-sm opacity-70">{plan.posted} posted</p>}
    </div>
  );
}
