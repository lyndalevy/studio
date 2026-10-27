"use client";

import { useActionState, useState, useTransition } from "react";

import type { OneTime } from "@/lib/dashboard/budget";
import { addOneTime, removeOneTime } from "./actions";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });
const monthName = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** AI bills paid as they come (no fixed monthly cost), offered first in the list. */
const AI_BILLS = ["Google AI", "Atlas Cloud", "OpenAI"];
const OTHER = "other";

/** One-time payments for the budget (saved in budget.json): a form to add one, and this year's list. */
export default function OneTime({ list, month }: { list: OneTime[]; month: string }) {
  // What the payment is for: one of the AI bills, or typed in.
  const [pick, setPick] = useState("");
  const [error, add, adding] = useActionState(async (prev: string | null, form: FormData) => {
    const err = await addOneTime(prev, form);
    if (!err) setPick("");
    return err;
  }, null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="border-t-2 border-red p-5">
      <p className="eyebrow mb-3">One-time payments</p>
      <form action={add} className="flex flex-col gap-2 sm:flex-row">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          required
          aria-label="What it's for"
          className="border-2 border-red bg-cream px-3 py-2 outline-none sm:w-44"
        >
          <option value="" disabled>
            What it&rsquo;s for…
          </option>
          {AI_BILLS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value={OTHER}>Something else…</option>
        </select>
        {pick === OTHER ? (
          <input
            name="name"
            required
            autoFocus
            maxLength={80}
            placeholder="What it's for, e.g. Trade name filing"
            className="min-w-0 flex-1 border-2 border-red bg-cream px-3 py-2 outline-none"
          />
        ) : (
          <input type="hidden" name="name" value={pick} />
        )}
        <input
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="Amount"
          className="border-2 border-red bg-cream px-3 py-2 outline-none sm:w-32"
        />
        <input
          name="month"
          type="month"
          required
          defaultValue={month}
          aria-label="Month it's due"
          className="border-2 border-red bg-cream px-3 py-2 outline-none sm:w-44"
        />
        <button type="submit" disabled={adding} className="btn btn-ghost justify-center disabled:opacity-50">
          {adding ? "Adding…" : "Add payment"}
        </button>
      </form>
      {(error || removeError) && <p className="mt-2 text-sm">{error ?? removeError}</p>}
      {list.length === 0 ? (
        <p className="mt-3 text-sm opacity-70">None this year. They count in the month they&rsquo;re due.</p>
      ) : (
        <ul className={`mt-3 space-y-1.5 ${pending ? "opacity-60" : ""}`}>
          {list.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4">
              <span>
                <span className="eyebrow mr-2 opacity-70">{monthName(o.month)}</span>
                {o.name}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-bold">{money(o.amount)}</span>
                <button
                  type="button"
                  onClick={() => start(async () => setRemoveError(await removeOneTime(o.id)))}
                  title="Remove this payment"
                  aria-label={`Remove "${o.name}"`}
                  className="eyebrow rounded-full border border-red px-2 py-0.5 hover:bg-cream-deep"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
