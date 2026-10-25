import { createHmac } from "node:crypto";

import ICAL from "ical.js";

import type { Budget } from "./budget";
import { today, type ClientStatus } from "./clients";
import { source } from "./source";

/**
 * The dashboard calendar: when to make each cycle's posts, schedule them, send invoices and pay
 * yourself, worked out from the client folders and budget.json, plus the shoots booked in Lynda's
 * Apple calendar (read from its public link, so she books and moves shoots on her phone).
 */

/** STUDIO L/calendar.json in the studio Dropbox folder. */
export type CalendarFile = {
  /** The public link of the Apple (iCloud) calendar that holds the shoots, webcal:// or https://. */
  shoots_calendar?: string;
  /** A Friday to pay yourself on; it repeats every 14 days from there. YYYY-MM-DD. */
  pay_yourself_from?: string;
};

export type CalEvent = {
  /** YYYY-MM-DD; for making posts, the day to start. */
  date: string;
  kind: "make" | "schedule" | "invoice" | "due" | "pickup" | "shoot" | "pay";
  title: string;
  /** "10:00 AM" for a shoot with a time. */
  time?: string;
  client?: string;
  done?: boolean;
};

export type MissingShoot = { client: string; month: string; label: string; booked: number; needed: number };

const FILE = "STUDIO L/calendar.json";
const DAY = 86_400_000;
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const nextMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
};

/** Days before a cycle starts that its posts should be in Linkme: the Friday before the Monday two weeks earlier, so Linkme is always two weeks ahead. */
export const SCHEDULE_LEAD = 17;
/** Days to make a cycle's posts before scheduling them; a cycle with Gold (filmed) posts gets a week. */
export const MAKE_DAYS = { usual: 3, gold: 7 };

export async function loadCalendarFile(): Promise<CalendarFile> {
  const src = source();
  const raw = src ? await src.read(FILE) : null;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CalendarFile;
  } catch {
    return {};
  }
}

export async function saveShootsCalendar(link: string): Promise<void> {
  const src = source();
  if (!src) throw new Error("Dropbox isn't connected yet.");
  const file = await loadCalendarFile();
  await src.write(FILE, JSON.stringify({ ...file, shoots_calendar: link }, null, 2) + "\n");
}

/** The key in the calendar feed's link: tied to the dashboard password, so changing it retires old links. */
export const feedKey = () =>
  createHmac("sha256", process.env.DASHBOARD_PASSWORD ?? "").update("studio-l-calendar-v1").digest("hex").slice(0, 32);

const nyDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const nyTime = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(d);

/** Shoots from the Apple calendar between two days, repeating ones included. Each is matched to a client by its title. */
async function loadShoots(
  link: string,
  from: string,
  to: string,
  clients: ClientStatus[]
): Promise<{ shoots: CalEvent[]; error?: string }> {
  const url = link.trim().replace(/^webcals?:\/\//i, "https://");
  if (!/^https:\/\/[^/]*icloud\.com\//i.test(url)) return { shoots: [], error: "The shoots calendar link should be an iCloud calendar link." };
  let text: string;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    return { shoots: [], error: "Couldn't read the shoots calendar. Check that it's still shared as a public calendar." };
  }

  const shoots: CalEvent[] = [];
  try {
    const root = new ICAL.Component(ICAL.parse(text));
    for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);
    const events = root.getAllSubcomponents("vevent").map((v) => new ICAL.Event(v));
    // Moved or changed single dates of a repeating shoot are their own events; tie them to the series.
    const masters = new Map(events.filter((e) => !e.isRecurrenceException()).map((e) => [e.uid, e]));
    for (const e of events) if (e.isRecurrenceException()) masters.get(e.uid)?.relateException(e);

    const start = ICAL.Time.fromDateString(addDays(from, -1));
    const end = ICAL.Time.fromDateString(addDays(to, 2));
    const push = (summary: string, when: ICAL.Time) => {
      const d = when.toJSDate();
      const date = when.isDate ? when.toString().slice(0, 10) : nyDate(d);
      if (date < from || date > to) return;
      const s = summary.toLowerCase();
      const c = clients.find((x) => s.includes(x.nickname.toLowerCase()) || s.includes(x.info.client.toLowerCase()));
      shoots.push({ date, kind: "shoot", title: summary || "Shoot", time: when.isDate ? undefined : nyTime(d), client: c?.nickname });
    };
    for (const e of masters.values()) {
      if (e.isRecurring()) {
        const it = e.iterator();
        for (let next = it.next(), n = 0; next && next.compare(end) < 0 && n < 500; next = it.next(), n++) {
          if (next.compare(start) < 0) continue;
          const o = e.getOccurrenceDetails(next);
          push(o.item.summary, o.startDate);
        }
      } else push(e.summary, e.startDate);
    }
  } catch {
    return { shoots: [], error: "The shoots calendar link didn't return a calendar." };
  }
  return { shoots };
}

/** Everything due between two days (inclusive), sorted by day, and the shoots still to book this month and next. */
export async function loadCalendar(
  clients: ClientStatus[],
  budget: Budget | null,
  from: string,
  to: string
): Promise<{ events: CalEvent[]; missing: MissingShoot[]; file: CalendarFile; error?: string }> {
  const file = await loadCalendarFile();
  const events: CalEvent[] = [];
  // Spread clients out: each one's make and schedule days fall a day earlier than the client before,
  // in the order they started (client.json "offset_days" overrides). Clients left off still keep their place.
  const byStart = [...clients].sort(
    (a, b) => (a.info.cycle_start ?? "9999").localeCompare(b.info.cycle_start ?? "9999") || a.info.client.localeCompare(b.info.client)
  );
  const offset = (c: ClientStatus) => c.info.offset_days ?? byStart.indexOf(c) % 5;
  const everyone = clients;
  clients = clients.filter((c) => c.info.calendar !== false && !c.info.paused);
  const shown = new Set(clients.map((c) => c.nickname));

  for (const c of clients) {
    for (const p of c.cycles) {
      const schedule = addDays(p.start, -SCHEDULE_LEAD - offset(c));
      const make = addDays(schedule, -(p.needed.gold ? MAKE_DAYS.gold : MAKE_DAYS.usual));
      if (schedule < from || make > to) continue;
      const need = p.needed.bronze + p.needed.silver + p.needed.gold;
      if (!need) continue;
      const made = (["bronze", "silver", "gold"] as const).every((t) => p.made[t] >= p.needed[t]);
      events.push({
        date: make,
        kind: "make",
        title: `Start making ${c.nickname} Cycle ${p.number}${p.needed.gold ? " (with Gold)" : ""}, posting from ${short(p.start)}`,
        client: c.nickname,
        done: made,
      });
      events.push({
        date: schedule,
        kind: "schedule",
        title: `Schedule ${c.nickname} Cycle ${p.number} in Linkme, posting from ${short(p.start)}`,
        client: c.nickname,
        done: p.scheduled >= need,
      });
    }
    for (const inv of c.invoices) {
      if (inv.status === "paid") continue;
      // Checks picked up in person: every Monday after the invoice goes out until it's paid (just the first one while it's not sent yet).
      if (c.info.pickup_checks) {
        let d = addDays(inv.sent, 1);
        while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, 1);
        const last = inv.status === "upcoming" ? d : to;
        for (; d <= last && d <= to; d = addDays(d, 7))
          if (d >= from) events.push({ date: d, kind: "pickup", title: `Pick up ${c.nickname} check ($${inv.amount})`, client: c.nickname });
      }
      if (inv.status === "upcoming") {
        if (inv.sent >= from && inv.sent <= to)
          events.push({ date: inv.sent, kind: "invoice", title: `Send ${c.nickname} ${inv.label.split(" ")[0]} invoice ($${inv.amount})`, client: c.nickname });
      } else if (inv.due >= from && inv.due <= to) {
        events.push({ date: inv.due, kind: "due", title: `${c.nickname} check due ($${inv.amount})`, client: c.nickname });
      }
    }
  }

  // Pay yourself every other Friday: a month's pay over 26 paydays a year.
  if (budget && file.pay_yourself_from && /^\d{4}-\d{2}-\d{2}$/.test(file.pay_yourself_from)) {
    const each = Math.floor(((budget.pay * 12) / 26) * 100) / 100;
    let d = file.pay_yourself_from;
    while (d < from) d = addDays(d, 14);
    for (; d <= to; d = addDays(d, 14))
      events.push({ date: d, kind: "pay", title: `Pay yourself $${each.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` });
  }

  // Shoots: every client has 1 hour of photography a month; a client with Gold shoots every other week.
  const month = today().slice(0, 7);
  const months = [month, nextMonth(month)];
  let error: string | undefined;
  const missing: MissingShoot[] = [];
  if (file.shoots_calendar) {
    const first = `${months[0]}-01`;
    const last = addDays(`${nextMonth(months[1])}-01`, -1);
    const lo = from < first ? from : first;
    const hi = to > last ? to : last;
    // Shoots for a client who's off the calendar (or paused) are left out too.
    const got = await loadShoots(file.shoots_calendar, lo, hi, everyone);
    got.shoots = got.shoots.filter((s) => !s.client || shown.has(s.client));
    error = got.error;
    events.push(...got.shoots.filter((s) => s.date >= from && s.date <= to));
    if (!got.error) {
      for (const m of months)
        for (const c of clients) {
          if (!c.monthly) continue;
          const needed = c.perWeek.gold > 0 ? 2 : 1;
          const booked = got.shoots.filter((s) => s.client === c.nickname && s.date.startsWith(m)).length;
          if (booked < needed) missing.push({ client: c.nickname, month: m, label: monthLabel(m), booked, needed });
        }
    }
  }

  const order: CalEvent["kind"][] = ["shoot", "invoice", "due", "pickup", "pay", "schedule", "make"];
  events.sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.kind) - order.indexOf(b.kind));
  return { events, missing, file, error };
}

/** The deadlines as an .ics feed for Apple Calendar (shoots stay in her own calendar, so they're left out). */
export function toIcs(events: CalEvent[]): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const ymd = (d: string) => d.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studio L//Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Studio L to-dos",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of events) {
    if (e.kind === "shoot") continue;
    const end = addDays(e.date, 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ymd(e.date)}-${e.kind}-${esc(e.title).replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}@studiolphotography.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc(e.done ? `✓ ${e.title}` : e.title)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
