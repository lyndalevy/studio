import { timingSafeEqual } from "node:crypto";

import { loadBudget } from "@/lib/dashboard/budget";
import { addDays, feedKey, loadCalendar, toIcs } from "@/lib/dashboard/calendar";
import { loadClients, today } from "@/lib/dashboard/clients";

export const dynamic = "force-dynamic";

/** The calendar's deadlines as an .ics feed that Apple Calendar subscribes to. The link's key stands in for signing in. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const want = feedKey();
  if (!process.env.DASHBOARD_PASSWORD || key.length !== want.length || !timingSafeEqual(Buffer.from(key), Buffer.from(want)))
    return new Response("Not found", { status: 404 });

  const { clients } = await loadClients();
  const { budget } = await loadBudget(clients);
  const now = today();
  const { events } = await loadCalendar(clients, budget, addDays(now, -30), addDays(now, 120));
  return new Response(toIcs(events), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
