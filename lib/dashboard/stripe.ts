/**
 * The client's real invoices from Stripe, read with a restricted key that can
 * only read invoices (STRIPE_RESTRICTED_KEY, kept in Cloud Secret Manager).
 * Without the key the dashboard falls back to client.json.
 */

export type StripeInvoice = {
  number: string | null;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  amount: number; // dollars
  sent: string | null; // YYYY-MM-DD it was finalized and sent
  due: string | null;
  url: string | null;
};

const day = (t: number | null | undefined) =>
  t ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(t * 1000)) : null;

export const hasStripe = () => !!process.env.STRIPE_RESTRICTED_KEY;

export async function stripeInvoices(customer: string): Promise<StripeInvoice[] | null> {
  const key = process.env.STRIPE_RESTRICTED_KEY;
  if (!key || !customer) return null;
  const res = await fetch(`https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(customer)}&limit=50`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Couldn't read invoices from Stripe (${res.status}): ${j.error?.message ?? ""}`);
  }
  const { data } = (await res.json()) as {
    data: {
      number: string | null;
      status: StripeInvoice["status"];
      amount_due: number;
      due_date: number | null;
      hosted_invoice_url: string | null;
      status_transitions: { finalized_at: number | null };
    }[];
  };
  return data.map((i) => ({
    number: i.number,
    status: i.status,
    amount: i.amount_due / 100,
    sent: day(i.status_transitions.finalized_at),
    due: day(i.due_date),
    url: i.hosted_invoice_url,
  }));
}
