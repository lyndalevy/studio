import type { ClientStatus } from "./clients";
import { source } from "./source";

/** STUDIO L/budget.json in the studio Dropbox folder. */
export type BudgetFile = {
  /** What's in the business checking account now. */
  bank_balance: number;
  /** Never go below this (the bank's no-fee minimum plus a little spare). */
  keep_in_bank: number;
  /** Share of profit put aside for income tax and self-employment tax. */
  tax_percent: number;
  /** Stripe's card fee, per paid invoice. Leave it out when clients pay by check. */
  stripe?: { percent: number; fixed: number };
  /** Monthly bills, in dollars. With per_client, the bill is whichever is more: monthly, or per_client for each client. */
  costs: { name: string; monthly: number; per_client?: number; note?: string }[];
};

export type Budget = {
  file: BudgetFile;
  income: { client: string; amount: number }[];
  revenue: number;
  stripeFees: number;
  /** Each bill for this month, with per-client bills worked out. */
  bills: { name: string; amount: number; note?: string }[];
  costs: number;
  profit: number;
  taxes: number;
  pay: number;
  spare: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** The month's money: client packages in, bills and Stripe fees out, then tax and what's left to pay yourself. */
export async function loadBudget(clients: ClientStatus[]): Promise<{ budget: Budget | null; error?: string }> {
  const src = source();
  if (!src) return { budget: null };
  const raw = await src.read("STUDIO L/budget.json");
  if (raw === null) return { budget: null, error: "Add a budget.json to the STUDIO L folder in Dropbox to see the budget." };

  let file: BudgetFile;
  try {
    file = JSON.parse(raw);
  } catch {
    return { budget: null, error: "budget.json isn't valid JSON. Check for a missing comma or quote." };
  }

  const income = clients
    .filter((c) => c.monthly !== null)
    .map((c) => ({ client: c.info.client, amount: c.monthly! }));
  const revenue = income.reduce((n, i) => n + i.amount, 0);
  // One card payment per client each month.
  const stripe = file.stripe;
  const stripeFees = stripe ? round(income.reduce((n, i) => n + (i.amount * stripe.percent) / 100 + stripe.fixed, 0)) : 0;
  const bills = file.costs.map((c) => ({
    name: c.name,
    amount: round(Math.max(c.monthly, (c.per_client ?? 0) * income.length)),
    note: c.note,
  }));
  const costs = round(bills.reduce((n, c) => n + c.amount, 0));
  const profit = round(revenue - stripeFees - costs);
  const taxes = round(Math.max(0, profit) * (file.tax_percent / 100));

  return {
    budget: {
      file,
      income,
      revenue,
      stripeFees,
      bills,
      costs,
      profit,
      taxes,
      pay: round(Math.max(0, profit - taxes)),
      spare: round(file.bank_balance - file.keep_in_bank),
    },
  };
}
