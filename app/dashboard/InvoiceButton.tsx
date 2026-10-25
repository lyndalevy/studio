"use client";

import { useState, useTransition } from "react";

import type { Invoice } from "@/lib/dashboard/clients";
import { stepInvoice } from "./actions";

const style: Record<Invoice["status"], string> = {
  paid: "bg-red text-cream",
  overdue: "bg-[#1c1714] text-cream",
  sent: "border-2 border-red",
  upcoming: "border border-red",
};
const next: Record<Invoice["status"], string> = {
  upcoming: "Tap once it's sent",
  sent: "Tap once it's paid",
  overdue: "Tap once it's paid",
  paid: "",
};

/** Days from today (New York) to a YYYY-MM-DD date; negative once it has passed. */
const daysTo = (day: string, today: string) =>
  Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/** An invoice's step as a button (upcoming → sent → paid), with a countdown to sending it or to its due date. */
export default function InvoiceButton({ folder, inv, today }: { folder: string; inv: Invoice; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(inv.status);

  const days = daysTo(status === "upcoming" ? inv.sent : inv.due, today);
  const countdown =
    status === "upcoming"
      ? days > 0
        ? `Send in ${plural(days)}`
        : days === 0
          ? "Send today"
          : `${plural(-days)} late to send`
      : days > 0
        ? `Due in ${plural(days)}`
        : days === 0
          ? "Due today"
          : `${plural(-days)} overdue`;

  return (
    <span className="flex items-center gap-2">
      <span className={`text-xs ${days < 0 ? "font-bold" : "opacity-70"}`}>{countdown}</span>
      {status === "upcoming" && <span className="text-xs italic opacity-70">Attach the invoice as a PDF</span>}
      <button
        type="button"
        disabled={pending}
        title={next[status]}
        onClick={() =>
          start(async () => {
            setStatus(status === "upcoming" ? "sent" : "paid");
            const err = await stepInvoice(folder, inv.month);
            if (err) setStatus(inv.status);
            setError(err);
          })
        }
        className={`eyebrow rounded-full px-2.5 py-0.5 hover:opacity-80 disabled:opacity-50 ${style[status]}`}
      >
        {status}
      </button>
      {error && <span className="text-xs">{error}</span>}
    </span>
  );
}
