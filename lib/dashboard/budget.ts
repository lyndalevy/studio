import { today, type ClientStatus } from "./clients";
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
  /** Bills paid once, in the month they're due (YYYY-MM), e.g. a filing fee. */
  one_time?: OneTime[];
};

export type OneTime = { id: string; month: string; name: string; amount: number };

export type Budget = {
  file: BudgetFile;
  income: { client: string; amount: number }[];
  revenue: number;
  stripeFees: number;
  /** Each bill for this month, with per-client bills worked out. */
  bills: { name: string; amount: number; note?: string }[];
  /** One-time payments due this month (already inside costs). */
  oneTime: OneTime[];
  /** This year's one-time payments, every month, for the list on the dashboard. */
  oneTimeYear: OneTime[];
  costs: number;
  profit: number;
  taxes: number;
  pay: number;
  spare: number;
  /** The calendar year: this month's recurring money times 12, plus this year's one-time payments. */
  year: { out: number; profit: number; taxes: number; pay: number };
};

const FILE = "STUDIO L/budget.json";

const round = (n: number) => Math.round(n * 100) / 100;

/** The month's money: client packages in, bills and Stripe fees out, then tax and what's left to pay yourself. */
export async function loadBudget(clients: ClientStatus[]): Promise<{ budget: Budget | null; error?: string }> {
  const src = source();
  if (!src) return { budget: null };
  const raw = await src.read(FILE);
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
  const month = today().slice(0, 7);
  const oneTimeYear = (file.one_time ?? [])
    .filter((o) => o.month.slice(0, 4) === month.slice(0, 4))
    .sort((a, b) => a.month.localeCompare(b.month));
  const oneTime = oneTimeYear.filter((o) => o.month === month);
  const recurring = round(bills.reduce((n, c) => n + c.amount, 0));
  const costs = round(recurring + oneTime.reduce((n, o) => n + o.amount, 0));
  const profit = round(revenue - stripeFees - costs);
  const tax = (p: number) => round(Math.max(0, p) * (file.tax_percent / 100));
  const taxes = tax(profit);

  const yearOut = round((recurring + stripeFees) * 12 + oneTimeYear.reduce((n, o) => n + o.amount, 0));
  const yearProfit = round(revenue * 12 - yearOut);

  return {
    budget: {
      file,
      income,
      revenue,
      stripeFees,
      bills,
      oneTime,
      oneTimeYear,
      costs,
      profit,
      taxes,
      pay: round(Math.max(0, profit - taxes)),
      spare: round(file.bank_balance - file.keep_in_bank),
      year: { out: yearOut, profit: yearProfit, taxes: tax(yearProfit), pay: round(Math.max(0, yearProfit - tax(yearProfit))) },
    },
  };
}

/** Change budget.json's one-time payments, keeping everything else in the file as it is. */
export async function updateOneTime(change: (list: OneTime[]) => OneTime[]): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  const raw = await src.read(FILE);
  if (raw === null) throw new Error("There's no budget.json in the STUDIO L folder.");
  const file = JSON.parse(raw) as BudgetFile;
  file.one_time = change(file.one_time ?? []);
  await src.write(FILE, JSON.stringify(file, null, 2) + "\n");
}
